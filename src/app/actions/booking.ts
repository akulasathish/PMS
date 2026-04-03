'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Initialize Supabase admin client to bypass RLS if needed, or normal client.
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
 * Create a new booking for a room
 */
export async function createBooking(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate session and role (Staff, Front-Desk, or Owner can create bookings)
  if (!user || !['staff', 'front-desk', 'owner'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized. Only staff or owners can create bookings.' };
  }

  const propertyId = formData.get('propertyId') as string;
  const roomId = formData.get('roomId') as string;
  const guestName = formData.get('guestName') as string;
  const guestEmail = formData.get('guestEmail') as string;
  const checkIn = formData.get('checkIn') as string;
  const checkOut = formData.get('checkOut') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const status = 'Confirmed';

  if (!propertyId || !roomId || !guestName || !guestEmail || !checkIn || !checkOut || isNaN(amount)) {
    return { error: 'All fields (Property, Room, Guest Name, Email, Check In/Out, Amount) are required.' };
  }

  // Insert the booking
  const { data: bookingData, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert([{
      property_id: propertyId,
      room_id: roomId,
      guest_name: guestName,
      guest_email: guestEmail,
      check_in: checkIn,
      check_out: checkOut,
      amount: amount,
      status: status
    }])
    .select()
    .single();

  if (bookingError) {
    console.error("Failed to create booking:", bookingError);
    return { error: `Failed to create booking: ${bookingError.message}` };
  }

  // Revalidate the front-desk dashboard path
  revalidatePath('/dashboard/front-office');
  revalidatePath('/(tier3)/dashboard/front-office', 'page');
  
  return { success: true, bookingId: bookingData.id };
}

/**
 * Check-In a Guest (Updates status and triggers n8n Smart Check-In)
 */
export async function checkInGuest(bookingId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate session and role
  if (!user || !['staff', 'front-desk', 'owner'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized. Only authorized personnel can check-in guests.' };
  }

  // Update the booking status to 'Checked In'
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'Checked In' })
    .eq('id', bookingId);

  if (error) {
    console.error("Failed to check-in guest:", error);
    return { error: `Database Error: ${error.message}` };
  }

  // Revalidate the tape chart so the status changes instantly
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');

  return { success: true };
  }

  /**
  * Cancel a reservation and release the room inventory
  */
  export async function cancelBooking(bookingId: string, roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !['staff', 'front-desk', 'owner', 'admin'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized.' };
  }

  // 1. Update booking status to Cancelled
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'Cancelled' })
    .eq('id', bookingId);

  if (bookingError) {
    console.error("Failed to cancel booking:", bookingError);
    return { error: `Cancellation Error: ${bookingError.message}` };
  }

  // 2. Release the room back to Available
  const { error: roomError } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'Available' })
    .eq('id', roomId);

  if (roomError) {
    console.error("Failed to release room during cancellation:", roomError);
  }

  revalidatePath('/dashboard/front-office');
  return { success: true };
  }

/**
 * Update internal guest notes for a booking
 */
export async function updateGuestNotes(bookingId: string, notes: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !['staff', 'front-desk', 'owner', 'admin'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized.' };
  }

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ notes })
    .eq('id', bookingId);

  if (error) {
    console.error("Failed to update notes:", error);
    return { error: `Update Error: ${error.message}` };
  }

  revalidatePath('/dashboard/front-office');
  return { success: true };
}

/**
 * Block or Unblock a room (e.g., Maintenance, Events)
 */
export async function toggleRoomBlock(roomId: string, currentStatus: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !['owner', 'admin'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized. Only management can block physical inventory.' };
  }

  const newStatus = currentStatus === 'Blocked' ? 'Available' : 'Blocked';

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ status: newStatus })
    .eq('id', roomId);

  if (error) {
    console.error("Failed to block/unblock room:", error);
    return { error: `Inventory Error: ${error.message}` };
  }

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/inventory');
  return { success: true, newStatus };
}

/**
 * Upgrade / Move a guest to a different room
 */
export async function upgradeRoom(bookingId: string, oldRoomId: string, newRoomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !['staff', 'front-desk', 'owner', 'admin'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized.' };
  }

  // 1. Mark the OLD room as Dirty (since they were likely in it)
  await supabaseAdmin.from('rooms').update({ status: 'Dirty' }).eq('id', oldRoomId);

  // 2. Mark the NEW room as Occupied
  await supabaseAdmin.from('rooms').update({ status: 'Occupied' }).eq('id', newRoomId);

  // 3. Move the booking to the new room, and log the original room
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ room_id: newRoomId, original_room_id: oldRoomId })
    .eq('id', bookingId);

  if (error) {
    console.error("Failed to upgrade room:", error);
    return { error: `Upgrade Error: ${error.message}` };
  }

  revalidatePath('/dashboard/front-office');
  return { success: true };
}
/**
 * Process a partial or full refund on a booking
 */
export async function issueRefund(bookingId: string, currentAmount: number, refundAmount: number) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !['staff', 'front-desk', 'owner', 'admin'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized.' };
  }

  if (refundAmount > currentAmount || refundAmount <= 0) {
    return { error: 'Invalid refund amount.' };
  }

  const newAmount = currentAmount - refundAmount;

  // Ideally, this would write to a transaction ledger. For MVP, we update the total.
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ amount: newAmount })
    .eq('id', bookingId);

  if (error) {
    console.error("Failed to process refund:", error);
    return { error: `Refund Error: ${error.message}` };
  }

  revalidatePath('/dashboard/front-office');
  return { success: true, newAmount };
}

export async function checkOutGuest(bookingId: string, roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !['staff', 'front-desk', 'owner'].includes(user.user_metadata?.role)) {
    return { error: 'Unauthorized. Only authorized personnel can check-out guests.' };
  }

  // 1. Update the booking status
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'Checked Out' })
    .eq('id', bookingId);

  if (bookingError) {
    console.error("Failed to check-out booking:", bookingError);
    return { error: `Booking Update Error: ${bookingError.message}` };
  }

  // 2. Mark the room as Dirty for housekeeping
  const { error: roomError } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'Dirty' })
    .eq('id', roomId);

  if (roomError) {
    console.error("Failed to update room status during check-out:", roomError);
    // Note: The booking is already checked out, but room remains occupied. 
    // This is an inconsistency we'd ideally handle in a transaction.
    return { error: `Room Update Error: ${roomError.message}` };
  }

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');

  return { success: true };
  }
