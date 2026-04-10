'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Initialize Supabase admin client to bypass RLS if needed, or normal client.
// Since server actions run on the server, we use the service role key to insert.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Add a new room to a property
 */
export async function addRoom(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'owner') {
    return { error: 'Unauthorized. Only owners can add rooms.' };
  }

  const propertyId = formData.get('propertyId') as string;
  const roomNumber = formData.get('number') as string;
  const roomType = formData.get('type') as string;
  const status = 'Available'; // Standard PMS terminology for a clean, empty room

  console.log("SERVER ACTION `addRoom` CALLED:", { propertyId, roomNumber, roomType });

  if (!propertyId || !roomNumber || !roomType) {
    return { error: 'Property ID, Room Number, and Room Type are required.' };
  }

  // Insert the room
  const { error } = await supabaseAdmin
    .from('rooms')
    .insert([{
      property_id: propertyId,
      room_number: roomNumber,
      type: roomType,
      status: status
    }]);

  if (error) {
    console.error("Failed to add room:", error);
    return { error: `Failed to add room: ${error.message}` };
  }

  // Revalidate the inventory path to reflect the new room
  revalidatePath('/(tier2)/dashboard/inventory', 'page');
  
  return { success: true };
}


/**
 * Delete a room from a property
 */
export async function deleteRoom(roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized. No session found.' };
  
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
