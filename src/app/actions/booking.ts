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
  const guestName = formData.get('guestName') as string;
  const guestEmail = formData.get('guestEmail') as string;
  const guestPhone = formData.get('guestPhone') as string;
  const checkIn = formData.get('checkIn') as string;
  const checkOut = formData.get('checkOut') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const status = 'Confirmed';

  // Support both group booking (roomIds) and single room (roomId)
  const roomIds = formData.getAll('roomIds').filter(Boolean) as string[];
  if (roomIds.length === 0) {
    const singleRoomId = formData.get('roomId') as string;
    if (singleRoomId) {
      roomIds.push(singleRoomId);
    }
  }

  if (!propertyId || roomIds.length === 0 || !guestName || !guestPhone || !checkIn || !checkOut || isNaN(amount)) {
    return { error: 'All fields (Property, Rooms, Guest Name, Guest Phone, Check In/Out, Amount) are required.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Loop through and perform overlap check for each room
  for (const rid of roomIds) {
    // OVERLAP CHECK: Prevent booking if the room is scheduled for maintenance/blocked
    const { data: blocks } = await supabaseAdmin
      .from('room_blocks')
      .select('reason')
      .eq('room_id', rid)
      .eq('status', 'Active')
      .lte('start_date', checkOut)
      .gte('end_date', checkIn);

    if (blocks && blocks.length > 0) {
      const { data: rm } = await supabaseAdmin.from('rooms').select('room_number').eq('id', rid).single();
      return { error: `Cannot book Room ${rm?.room_number || 'Unknown'}. It is scheduled for maintenance (${blocks[0].reason}) during these dates.` };
    }

    // OVERLAP CHECK: Prevent double-booking a room that already has a guest
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('guest_name')
      .eq('room_id', rid)
      .in('status', ['Confirmed', 'Checked In'])
      .lte('check_in', checkOut)
      .gte('check_out', checkIn);

    if (existingBookings && existingBookings.length > 0) {
      const { data: rm } = await supabaseAdmin.from('rooms').select('room_number').eq('id', rid).single();
      return { error: `Cannot book Room ${rm?.room_number || 'Unknown'}. It is already booked by ${existingBookings[0].guest_name} during these dates.` };
    }
  }

  // Split amount equally across rooms
  const amountPerRoom = amount / roomIds.length;
  const groupId = roomIds.length > 1 ? crypto.randomUUID() : null;

  const bookingsToInsert = roomIds.map(rid => ({
    property_id: propertyId,
    room_id: rid,
    guest_name: guestName,
    guest_email: guestEmail || null,
    guest_phone: guestPhone,
    check_in: checkIn,
    check_out: checkOut,
    amount: amountPerRoom,
    status: status,
    group_id: groupId
  }));

  const { data: bookingData, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert(bookingsToInsert)
    .select();

  if (bookingError) {
    console.error("Failed to create booking:", bookingError);
    return { error: `Failed to create booking: ${bookingError.message}` };
  }

  // Audit Log
  await logAction({
    propertyId,
    action: 'BOOKING_CREATED',
    details: { 
      guestName, 
      amount, 
      checkIn, 
      checkOut, 
      roomCount: roomIds.length,
      groupId: groupId,
      bookingIds: bookingData.map(b => b.id) 
    },
    userId: user.id
  });

  // Revalidate the front-desk dashboard path
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'layout');
  
  return { success: true, bookingId: bookingData[0].id };
}

/**
 * Check-In a Guest (Updates status and triggers n8n Smart Check-In)
 */
export async function checkInGuest(
  bookingId: string,
  paymentDetails?: {
    amount: number;
    method: string;
    transactionId?: string;
  }
) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate session
  if (!user) {
    return { error: 'Unauthorized. Only authorized personnel can check-in guests.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch the booking to get the roomId, propertyId, and group_id
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('room_id, property_id, guest_name, group_id')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("Failed to fetch booking for check-in:", fetchError);
    return { error: "Booking not found." };
  }

  // Get all bookings to process in the group (or fallback to this single booking)
  let bookingsToProcess = [{ id: bookingId, room_id: booking.room_id }];
  if (booking.group_id) {
    const { data: groupBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, room_id')
      .eq('group_id', booking.group_id)
      .in('status', ['Confirmed', 'Pending']); // Only process those not already checked in/out/cancelled
    
    if (groupBookings && groupBookings.length > 0) {
      bookingsToProcess = groupBookings;
    }
  }

  // Insert split payments if details are provided
  if (paymentDetails && paymentDetails.amount > 0) {
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'business_date')
      .single();
    const businessDate = settings?.value || new Date().toISOString().substring(0, 10);

    const splitAmount = paymentDetails.amount / bookingsToProcess.length;
    const paymentRecords = bookingsToProcess.map(b => ({
      booking_id: b.id,
      property_id: booking.property_id,
      amount: splitAmount,
      method: paymentDetails.method,
      transaction_id: paymentDetails.transactionId || null,
      created_by: user.id,
      business_date: businessDate
    }));

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentRecords);

    if (paymentError) {
      console.error("Check-in Payment Error:", paymentError);
      return { error: `Failed to record check-in payment: ${paymentError.message}` };
    }
  }

  const bookingIds = bookingsToProcess.map(b => b.id);
  const roomIds = bookingsToProcess.map(b => b.room_id);

  // Update the booking status to 'Checked In' AND mark the room as 'Occupied'
  const [bookingRes, roomRes] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'Checked In',
        check_in_time: new Date().toISOString()
      })
      .in('id', bookingIds),
    supabaseAdmin
      .from('rooms')
      .update({ status: 'Occupied' })
      .in('id', roomIds)
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
    details: { 
      guestName: booking.guest_name, 
      bookingId,
      groupId: booking.group_id,
      processedCount: bookingsToProcess.length,
      paymentRecorded: !!paymentDetails,
      paymentAmount: paymentDetails?.amount,
      paymentMethod: paymentDetails?.method
    },
    userId: user.id
  });

  // Revalidate paths
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
    .select('amount, description')
    .eq('booking_id', bookingId);
    
  const dailyRoomChargesSum = incidentals
    ?.filter(item => item.description?.startsWith('Daily Room Charge'))
    ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  const roomAmount = Math.max(0, Number(booking.amount) - dailyRoomChargesSum);
  const totalIncidentals = incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('booking_id', bookingId);

  const totalPayments = payments?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  // Calculate the Balance Due
  const totalCharges = roomAmount + totalIncidentals;
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
    .update({ 
      status: 'Checked Out',
      check_out_time: new Date().toISOString()
    })
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

/**
 * Automatically record the check-in time when a guest opens their profile/registration card
 */
export async function recordCheckInTime(bookingId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  
  // First, fetch the booking to see if check_in_time is already set
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('check_in_time, property_id, guest_name')
    .eq('id', bookingId)
    .single();
    
  if (fetchError || !booking) {
    console.error("Failed to fetch booking for auto check-in time:", fetchError);
    return { error: "Booking not found." };
  }
  
  // If check_in_time is already set, do nothing
  if (booking.check_in_time) {
    return { success: true, alreadySet: true, checkInTime: booking.check_in_time };
  }
  
  const now = new Date().toISOString();
  
  // Update check_in_time
  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ check_in_time: now })
    .eq('id', bookingId);
    
  if (updateError) {
    console.error("Failed to record check-in time:", updateError);
    return { error: `Failed to record check-in time: ${updateError.message}` };
  }
  
  // Audit Log
  await logAction({
    propertyId: booking.property_id,
    action: 'AUTO_CHECK_IN_TIME_RECORDED',
    details: { guestName: booking.guest_name, bookingId, checkInTime: now }
  });
  
  revalidatePath('/dashboard/front-office');
  return { success: true, checkInTime: now };
}

/**
 * Reverts a mistaken guest checkout, setting the booking back to 'Checked In' and room back to 'Occupied'
 */
export async function undoCheckOutGuest(bookingId: string, roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Only authorized personnel can perform this action.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Fetch booking to verify existence and check status
  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('status, property_id, guest_name')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) return { error: 'Booking not found.' };

  if (booking.status !== 'Checked Out') {
    return { error: 'Only checked-out bookings can have their checkout undone.' };
  }

  // 2. Revert booking status back to 'Checked In' and clear check_out_time
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({ 
      status: 'Checked In',
      check_out_time: null
    })
    .eq('id', bookingId);

  if (bookingError) {
    console.error("Failed to undo check-out:", bookingError);
    return { error: `Booking Update Error: ${bookingError.message}` };
  }

  // 3. Mark the room back as 'Occupied'
  const { error: roomError } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'Occupied' })
    .eq('id', roomId);

  if (roomError) {
    console.error("Failed to update room status during undo check-out:", roomError);
    return { error: `Room Update Error: ${roomError.message}` };
  }

  // 4. Audit Log
  await logAction({
    propertyId: booking.property_id,
    action: 'UNDO_CHECK_OUT',
    details: { guestName: booking.guest_name, bookingId },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');
  revalidatePath('/dashboard/housekeeping');

  return { success: true };
}

/**
 * Update actual check-in time of a guest manually
 */
export async function updateCheckInTime(bookingId: string, checkInTime: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Only authorized personnel can modify check-in times.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch the booking first for audit logging
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('property_id, guest_name, check_in_time')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("Failed to fetch booking for time change:", fetchError);
    return { error: "Booking not found." };
  }

  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ check_in_time: checkInTime })
    .eq('id', bookingId);

  if (updateError) {
    console.error("Failed to update check-in time:", updateError);
    return { error: `Update Failed: ${updateError.message}` };
  }

  // Record audit log
  await logAction({
    propertyId: booking.property_id,
    action: 'CHECK_IN_TIME_MODIFIED',
    details: {
      guestName: booking.guest_name,
      bookingId,
      oldCheckInTime: booking.check_in_time,
      newCheckInTime: checkInTime
    },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');

  return { success: true };
}

