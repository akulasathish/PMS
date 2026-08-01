'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';

/**
 * Add a new room to a property
 */
export async function addRoom(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized. No session found.' };
  
  const supabaseAdmin = getSupabaseAdmin();

  // Authenticated users can add rooms


  const propertyId = formData.get('propertyId') as string;
  const rawRoomNumber = formData.get('number') as string || '';
  const roomNumber = rawRoomNumber.trim();
  const roomType = (formData.get('type') as string || 'Standard').trim();
  const status = 'Available';
  const sharingCapacity = parseInt(formData.get('sharingCapacity') as string || '2', 10);

  if (!propertyId || propertyId === 'undefined') {
    return { error: 'Property ID is required.' };
  }

  if (!roomNumber) {
    return { error: 'Room number is required.' };
  }

  // 1. Strict Duplicate Check (Case-Insensitive & Trimmed)
  const { data: existingRooms } = await supabase
    .from('rooms')
    .select('id, room_number')
    .eq('property_id', propertyId);

  const isDuplicate = (existingRooms || []).some(
    r => r.room_number?.trim().toLowerCase() === roomNumber.toLowerCase()
  );

  if (isDuplicate) {
    return { error: `Duplicate Room Error: Room "${roomNumber}" already exists in this property!` };
  }

  // 2. Insert New Room
  const { error: insertError } = await supabase
    .from('rooms')
    .insert([{
      property_id: propertyId,
      room_number: roomNumber,
      type: roomType,
      status: status,
      sharing_capacity: sharingCapacity
    }]);

  if (insertError) {
    console.error("Failed to insert room:", insertError);
    return { error: `Database Error: ${insertError.message}` };
  }

  // Audit Log
  await logAction({
    propertyId,
    action: 'ROOM_CREATED',
    details: { roomNumber, roomType }
  });

  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/housekeeping');
  
  return { success: true };
}


/**
 * Delete a room from a property
 */
export async function deleteRoom(roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized. No session found.' };

  // Safety check: Don't delete a room if it has active bookings!
  const { data: activeBookings } = await supabase
    .from('bookings')
    .select('id, property_id')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In']);
    
  if (activeBookings && activeBookings.length > 0) {
     return { error: 'Cannot delete this room because there are active resident bookings (Confirmed or Checked In) assigned to it. Please check out or reassign the resident first.' };
  }

  // Fetch property_id and room_number for the audit log before deleting
  const { data: roomData } = await supabase
    .from('rooms')
    .select('property_id, room_number')
    .eq('id', roomId)
    .maybeSingle();

  const supabaseAdmin = getSupabaseAdmin();

  // Unlink past/inactive bookings so Foreign Key constraints don't block room deletion
  await supabaseAdmin
    .from('bookings')
    .update({ room_id: null })
    .eq('room_id', roomId);

  // Delete room from database (using admin client to bypass RLS restrictions)
  let { error } = await supabaseAdmin
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (error) {
    console.warn("Supabase Admin delete failed, trying SSR client fallback...", error.message);
    const { error: fallbackError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);
    if (fallbackError) return { error: `Database Error: ${fallbackError.message}` };
  }

  // Audit Log
  if (roomData) {
    await logAction({
      propertyId: roomData.property_id,
      action: 'ROOM_DELETED',
      details: { roomNumber: roomData.room_number }
    });
  }

  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/front-office');
  
  return { success: true };
}

/**
 * Create a new Room Block (OOO/OOS) with conflict detection
 */
export async function createRoomBlock(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };
  
  const supabaseAdmin = getSupabaseAdmin();

  // Authenticated users can block rooms


  const roomId = formData.get('roomId') as string;
  const propertyId = formData.get('propertyId') as string;
  const blockType = formData.get('type') as string; // OOO or OOS
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const reason = formData.get('reason') as string;
  const notes = formData.get('notes') as string;

  if (!roomId || !startDate || !endDate || !reason) {
    return { error: 'Missing required fields.' };
  }

  // 2. We ONLY rely on mathematical overlap. We do not block based on current 'Occupied' status,
  // because an Occupied room today can be legitimately blocked for tomorrow.
  const { data: room, error: roomErr } = await supabaseAdmin
    .from('rooms')
    .select('room_number')
    .eq('id', roomId)
    .single();

  // 3. CONFLICT CHECK: Are there active reservations (Confirmed/Checked In) that overlap with these dates?
  // Overlap Math: (BookingCheckIn <= BlockEndDate) AND (BookingCheckOut > BlockStartDate)
  // We use > for check_out because checking out on the 24th means the room is free ON the 24th afternoon.
  const { data: conflicts, error: conflictErr } = await supabaseAdmin
    .from('bookings')
    .select('id, guest_name')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In'])
    .lte('check_in', endDate)
    .gt('check_out', startDate);

  if (conflicts && conflicts.length > 0) {
    return { error: `Cannot block room. An existing booking (${conflicts[0].guest_name}) overlaps with these dates. Please move the guest first.` };
  }

  // 4. Insert the block record
  const { data: block, error: blockErr } = await supabaseAdmin
    .from('room_blocks')
    .insert([{
      property_id: propertyId,
      room_id: roomId,
      block_type: blockType,
      start_date: startDate,
      end_date: endDate,
      reason: reason,
      notes: notes,
      created_by: user.id
    }])
    .select()
    .single();

  if (blockErr) {
    return { error: `Database Error: ${blockErr.message}` };
  }

  // 5. If today is within the block range, update room status to Blocked
  const today = new Date().toISOString().split('T')[0];
  if (today >= startDate && today <= endDate) {
    await supabaseAdmin
      .from('rooms')
      .update({ status: 'Blocked' })
      .eq('id', roomId);
  }

  // Audit Log
  await logAction({
    propertyId,
    action: 'ROOM_BLOCKED',
    details: { roomNumber: room?.room_number, blockType, startDate, endDate, reason },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/inventory');

  return { success: true, blockId: block.id };
}

/**
 * Resolve an active room block and return room to service (status: Dirty)
 */
export async function resolveRoomBlock(blockId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Fetch block data to get roomId and propertyId
  const { data: block, error: fetchErr } = await supabaseAdmin
    .from('room_blocks')
    .select('room_id, property_id')
    .eq('id', blockId)
    .single();

  if (fetchErr || !block) return { error: 'Block not found.' };

  // 2. Resolve the block
  const { error: blockErr } = await supabaseAdmin
    .from('room_blocks')
    .update({ status: 'Resolved' })
    .eq('id', blockId);

  if (blockErr) return { error: blockErr.message };

  // 3. Flip room to Dirty (requires cleaning after maintenance)
  await supabaseAdmin
    .from('rooms')
    .update({ status: 'Dirty' })
    .eq('id', block.room_id);

  // Audit Log
  await logAction({
    propertyId: block.property_id,
    action: 'ROOM_BLOCK_RESOLVED',
    details: { blockId, roomId: block.room_id },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/housekeeping');

  return { success: true };
}

/**
 * Find the active block for a room and resolve it
 */
export async function resolveRoomBlockByRoom(roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Find the active block for this room
  const { data: block, error: fetchErr } = await supabaseAdmin
    .from('room_blocks')
    .select('id, property_id')
    .eq('room_id', roomId)
    .eq('status', 'Active')
    .single();

  if (fetchErr || !block) {
    // If no active block found, just reset the room anyway to be safe
    await supabaseAdmin.from('rooms').update({ status: 'Dirty' }).eq('id', roomId);
    revalidatePath('/dashboard/front-office');
    revalidatePath('/dashboard/inventory');
    return { success: true };
  }

  return resolveRoomBlock(block.id);
}

/**
 * Convert a room category between daily and monthly with booking validation checks
 */
export async function convertRoomCategory(roomId: string, targetType: 'daily' | 'monthly', sharingCapacity?: number) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized. No session found.' };
  
  const supabaseAdmin = getSupabaseAdmin();

  // Safety check: Are there any active or future bookings?
  const { data: activeBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, guest_name')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In']);

  if (activeBookings && activeBookings.length > 0) {
    const names = activeBookings.map(b => b.guest_name).join(', ');
    return { error: `Cannot convert room category because there are active or future bookings assigned to this room (Guests: ${names}).` };
  }

  const updatePayload: any = {};

  if (targetType === 'monthly') {
    updatePayload.sharing_capacity = sharingCapacity || 2;
  } else {
    updatePayload.sharing_capacity = 1;
  }

  const { error } = await supabaseAdmin
    .from('rooms')
    .update(updatePayload)
    .eq('id', roomId);

  if (error) {
    console.error("Database Error converting room:", error);
    return { error: `Database Error: ${error.message}` };
  }

  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/housekeeping');

  return { success: true };
}

/**
 * Update a room's sharing type / capacity (e.g., 3-Sharing to 4-Sharing, 4-Sharing to 5-Sharing, etc.)
 */
export async function updateRoomType(roomId: string, newType: string, newCapacity: number) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized. No session found.' };
  const supabaseAdmin = getSupabaseAdmin();

  // Validate active capacity vs occupied beds
  const { data: activeBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, guest_name')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In']);

  const currentOccupantsCount = activeBookings?.length || 0;
  if (newCapacity < currentOccupantsCount) {
    const activeNames = activeBookings?.map(b => b.guest_name).join(', ');
    return { 
      error: `Cannot reduce room capacity to ${newCapacity} beds because there are currently ${currentOccupantsCount} active residents in this room (${activeNames}). Please vacate or reassign a resident first.` 
    };
  }

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ 
      type: newType,
      sharing_capacity: newCapacity
    })
    .eq('id', roomId);

  if (error) {
    console.error("Failed to update room type:", error);
    return { error: `Database Error: ${error.message}` };
  }

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/housekeeping');

  return { success: true };
}

