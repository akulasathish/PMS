'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
    .select('id')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In']);
    
  if (activeBookings && activeBookings.length > 0) {
     return { error: 'Cannot delete this room because there are active reservations (Confirmed or Checked In) assigned to it. Please reassign the guests to another room first.' };
  }

  // 3. SOFT DELETE: Never hard delete a room to protect historical folios
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ is_deleted: true })
    .eq('id', roomId);

  if (error) {
    console.error("Supabase Error deleting room:", error);
    return { error: `Database Error: ${error.message}` };
  }

  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/housekeeping');
  
  return { success: true };
}
