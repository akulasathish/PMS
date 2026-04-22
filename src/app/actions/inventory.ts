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

  let role = user.user_metadata?.role;
  if (!role) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    role = profile?.role;
  }

  if (!['owner', 'admin'].includes(role)) {
    return { error: 'Unauthorized. Role: ' + role };
  }

  const propertyId = formData.get('propertyId') as string;
  const roomNumber = formData.get('number') as string;
  const roomType = formData.get('type') as string;
  const status = 'Available';

  if (!propertyId || propertyId === 'undefined') {
    return { error: 'Property ID is required.' };
  }

  // 1. Check for Duplicate or Deleted Room
  const { data: existingRoom } = await supabaseAdmin
    .from('rooms')
    .select('id, is_deleted')
    .eq('property_id', propertyId)
    .eq('room_number', roomNumber)
    .maybeSingle();

  if (existingRoom) {
    // 2. Restore Soft-Deleted Room
    if (existingRoom.is_deleted === true) {
      const { error: updateError } = await supabaseAdmin
        .from('rooms')
        .update({ is_deleted: false, type: roomType, status: status })
        .eq('id', existingRoom.id);
        
      if (updateError) return { error: `Restore Error: ${updateError.message}` };
    } else {
      // Room already exists and is active!
      return { error: `Duplicate Room Error: Room ${roomNumber} already exists in this property!` };
    }
  } else {
    // 3. Create Brand New Room
    const { error: insertError } = await supabaseAdmin
      .from('rooms')
      .insert([{
        property_id: propertyId,
        room_number: roomNumber,
        type: roomType,
        status: status
      }]);
      
    if (insertError) return { error: `Database Error: ${insertError.message}` };
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
  
  const supabaseAdmin = getSupabaseAdmin();

  // Only owners or admins can delete rooms
  let role = user.user_metadata?.role;
  if (!role) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    role = profile?.role;
  }

  if (!['owner', 'admin'].includes(role)) {
    return { error: 'Unauthorized. Role: ' + role };
  }

  // Safety check: Don't delete a room if it has active bookings!
  const { data: activeBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, property_id')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In']);
    
  if (activeBookings && activeBookings.length > 0) {
     return { error: 'Cannot delete this room because there are active reservations (Confirmed or Checked In) assigned to it. Please reassign the guests to another room first.' };
  }

  // Fetch property_id and room_number for the audit log before deleting
  const { data: roomData } = await supabaseAdmin
    .from('rooms')
    .select('property_id, room_number')
    .eq('id', roomId)
    .single();

  // 3. SOFT DELETE: Never hard delete a room to protect historical folios
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ is_deleted: true })
    .eq('id', roomId);

  if (error) {
    console.error("Supabase Error deleting room:", error);
    return { error: `Database Error: ${error.message}` };
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
  revalidatePath('/dashboard/housekeeping');
  
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

  // 1. Role Validation
  let role = user.app_metadata?.role || user.user_metadata?.role;
  if (!role) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    role = profile?.role;
  }

  if (!['owner', 'admin'].includes(role)) {
    return { error: 'Unauthorized. Only management can block inventory.' };
  }

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

  // 2. CONFLICT CHECK: Is the room currently occupied?
  const { data: room, error: roomErr } = await supabaseAdmin
    .from('rooms')
    .select('status, room_number')
    .eq('id', roomId)
    .single();

  if (room?.status === 'Occupied') {
    return { error: `Cannot block Room ${room.room_number} because it is currently Occupied. Please check out or move the guest first.` };
  }

  // 3. CONFLICT CHECK: Are there future reservations on these dates?
  const { data: conflicts, error: conflictErr } = await supabaseAdmin
    .from('bookings')
    .select('id, guest_name')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In'])
    .or(`check_in.lte.${endDate},check_out.gte.${startDate}`);

  // Refined overlap logic: (StartA <= EndB) and (EndA >= StartB)
  const realConflicts = conflicts?.filter(b => true); // The query already filters for overlaps

  if (conflicts && conflicts.length > 0) {
    return { error: `Cannot block room. An existing booking (${conflicts[0].guest_name}) overlaps with these dates.` };
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
