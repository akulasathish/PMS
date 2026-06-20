'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';

/**
 * Create a new booking for a room
 */
export async function createBooking(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate session
  if (!user) {
    return { error: 'Unauthorized.' };
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

  const supabaseAdmin = getSupabaseAdmin();

  // OVERLAP CHECK: Prevent booking if the room is scheduled for maintenance/blocked
  // Overlap Math: (BlockStart <= BookingEnd) AND (BlockEnd >= BookingStart)
  const { data: blocks } = await supabaseAdmin
    .from('room_blocks')
    .select('reason')
    .eq('room_id', roomId)
    .eq('status', 'Active')
    .lte('start_date', checkOut)
    .gte('end_date', checkIn);

  if (blocks && blocks.length > 0) {
    return { error: `Cannot book this room. It is scheduled for maintenance (${blocks[0].reason}) during these dates.` };
  }

  // OVERLAP CHECK: Prevent double-booking a room that already has a guest
  const { data: existingBookings } = await supabaseAdmin
    .from('bookings')
    .select('guest_name')
    .eq('room_id', roomId)
    .in('status', ['Confirmed', 'Checked In'])
    .lte('check_in', checkOut)
    .gte('check_out', checkIn);

  if (existingBookings && existingBookings.length > 0) {
    return { error: `Cannot book this room. It is already booked by ${existingBookings[0].guest_name} during these dates.` };
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

  // Audit Log
  await logAction({
    propertyId,
    action: 'BOOKING_CREATED',
    details: { guestName, amount, checkIn, checkOut, bookingId: bookingData.id },
    userId: user.id
  });

  // Revalidate the front-desk dashboard path
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'layout');
  
  return { success: true, bookingId: bookingData.id };
}

/**
 * Check-In a Guest (Updates status and triggers n8n Smart Check-In)
 */
export async function checkInGuest(bookingId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate session
  if (!user) {
    return { error: 'Unauthorized. Only authorized personnel can check-in guests.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch the booking to get the roomId and propertyId
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('room_id, property_id, guest_name')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("Failed to fetch booking for check-in:", fetchError);
    return { error: "Booking not found." };
  }

  // Update the booking status to 'Checked In' AND mark the room as 'Occupied'
  const [bookingRes, roomRes] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .update({ status: 'Checked In' })
      .eq('id', bookingId),
    supabaseAdmin
      .from('rooms')
      .update({ status: 'Occupied' })
      .eq('id', booking.room_id)
      .eq('property_id', booking.property_id)
  ]);

  if (bookingRes.error || roomRes.error) {
    console.error("Check-in Error:", bookingRes.error || roomRes.error);
    return { error: `Check-in Failed: ${bookingRes.error?.message || roomRes.error?.message}` };
  }

  // Audit Log
  await logAction({
    propertyId: booking.property_id,
    action: 'GUEST_CHECK_IN',
    details: { guestName: booking.guest_name, bookingId },
    userId: user.id
  });

  // Revalidate the tape chart so the status changes instantly
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');
  revalidatePath('/dashboard/housekeeping');

  return { success: true };
}

  /**
  * Reset guest identity (Void the ID capture) to allow retaking.
  */
  export async function resetGuestIdentity(bookingId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ 
      id_verified: false, 
      id_photo_url: null,
      signature_url: null
    })
    .eq('id', bookingId);

  if (error) {
    console.error("Failed to reset identity:", error);
    return { error: `Reset Error: \${error.message}` };
  }

  revalidatePath('/dashboard/front-office');
  return { success: true };
  }
  /**
  * Cancel a reservation and release the room inventory
  */
  export async function cancelBooking(bookingId: string, roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

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

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

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

  if (!user) {
    return { error: 'Unauthorized. Only logged in users can block physical inventory.' };
  }

  const supabaseAdmin = getSupabaseAdmin();
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

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

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

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  if (refundAmount > currentAmount || refundAmount <= 0) {
    return { error: 'Invalid refund amount.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

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

  if (!user) {
    return { error: 'Unauthorized. Only authorized personnel can check-out guests.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1. FOLIO AUDIT (The Financial Blockade)
  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('amount, property_id, guest_name')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) return { error: 'Booking not found.' };

  const { data: incidentals } = await supabaseAdmin
    .from('incidental_charges')
    .select('amount')
    .eq('booking_id', bookingId);
    
  const totalIncidentals = incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('booking_id', bookingId);

  const totalPayments = payments?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  // Calculate the Balance Due
  const totalCharges = Number(booking.amount) + totalIncidentals;
  const balanceDue = totalCharges - totalPayments;

  // 2. ENFORCE ZERO BALANCE
  if (Math.abs(balanceDue) > 0.01) {
    return { 
      error: `Folio has a non-zero balance. Settle the ₹${balanceDue.toFixed(2)} balance before departure.` 
    };
  }

  // 3. EXECUTE CHECKOUT
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'Checked Out' })
    .eq('id', bookingId);

  if (bookingError) {
    console.error("Failed to check-out booking:", bookingError);
    return { error: `Booking Update Error: ${bookingError.message}` };
  }

  const { error: roomError } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'Dirty' })
    .eq('id', roomId);

  if (roomError) {
    console.error("Failed to update room status during check-out:", roomError);
    return { error: `Room Update Error: ${roomError.message}` };
  }

  // Audit Log
  await logAction({
    propertyId: booking.property_id,
    action: 'GUEST_CHECK_OUT',
    details: { guestName: booking.guest_name, bookingId, totalCharges, totalPayments },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');
  revalidatePath('/dashboard/housekeeping');

  return { success: true };
  }
