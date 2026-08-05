'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';
import { getTodayLocalYYYYMMDD } from '@/lib/types';

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
  
  const rawAmount = formData.get('amount') as string;
  const amount = rawAmount ? (parseFloat(rawAmount) || 0) : 0;
  const status = (formData.get('status') as string) || 'Confirmed';

  const isMonthly = formData.get('isMonthly') === 'true';
  const billingCycleDate = formData.get('billingCycleDate') ? parseInt(formData.get('billingCycleDate') as string, 10) : 1;
  
  const rawMonthlyRate = formData.get('monthlyRate') as string;
  const monthlyRate = rawMonthlyRate ? (parseFloat(rawMonthlyRate) || 0) : 0;

  const rawPrepaidAmount = formData.get('prepaidAmount') as string;
  const prepaidAmount = rawPrepaidAmount ? (parseFloat(rawPrepaidAmount) || 0) : 0;

  const rawPrepaidDepositAmount = formData.get('prepaidDepositAmount') as string;
  const prepaidDepositAmount = rawPrepaidDepositAmount ? (parseFloat(rawPrepaidDepositAmount) || 0) : 0;

  const rawNonRefundableFee = formData.get('nonRefundableFee') as string;
  const nonRefundableFee = rawNonRefundableFee ? (parseFloat(rawNonRefundableFee) || 0) : 0;
  
  const prepaidMethod = formData.get('prepaidMethod') as string | null;
  const prepaidDate = formData.get('prepaidDate') as string | null;

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
    // Fetch room details first
    const { data: rm, error: rmError } = await supabaseAdmin
      .from('rooms')
      .select('room_number, sharing_capacity')
      .eq('id', rid)
      .single();

    if (rmError || !rm) {
      return { error: `Failed to retrieve details for room ID: ${rid}` };
    }

    // OVERLAP CHECK: Prevent booking if the room is scheduled for maintenance/blocked
    const { data: blocks } = await supabaseAdmin
      .from('room_blocks')
      .select('reason')
      .eq('room_id', rid)
      .eq('status', 'Active')
      .lte('start_date', checkOut)
      .gte('end_date', checkIn);

    if (blocks && blocks.length > 0) {
      return { error: `Cannot book Room ${rm.room_number}. It is scheduled for maintenance (${blocks[0].reason}) during these dates.` };
    }

    // OVERLAP & DUPLICATE RESIDENT CHECK: Prevent double-booking or assigning multiple beds to same resident
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('guest_name, guest_phone')
      .eq('room_id', rid)
      .in('status', ['Confirmed', 'Checked In'])
      .lte('check_in', checkOut)
      .gte('check_out', checkIn);

    if (existingBookings && existingBookings.length > 0) {
      // Prevent enrolling the same resident twice into the same room
      const isDuplicateGuest = existingBookings.some(b => 
        b.guest_name && b.guest_name.toLowerCase().trim() === guestName.toLowerCase().trim()
      );

      if (isDuplicateGuest) {
        return { error: `Resident '${guestName}' is already checked in to Room ${rm.room_number}. Cannot allocate multiple beds to the same guest.` };
      }

      const isCoLiving = isMonthly || (rm.sharing_capacity && rm.sharing_capacity > 1);
      const capacity = rm.sharing_capacity || 1;

      if (isCoLiving) {
        if (existingBookings.length >= capacity) {
          const guestNames = existingBookings.map(b => b.guest_name).join(', ');
          return { error: `Cannot book Room ${rm.room_number}. It is already fully booked by ${guestNames} during these dates.` };
        }
      } else {
        // Standard transient bookings (daily) block the entire room regardless of sharing capacity
        return { error: `Cannot book Room ${rm.room_number}. It is already booked by ${existingBookings[0].guest_name} during these dates.` };
      }
    }
  }

  const groupId = roomIds.length > 1 ? crypto.randomUUID() : null;

  const bookingsToInsert = roomIds.map(rid => {
    const customRate = formData.get(`roomRate_${rid}`);
    const roomAmount = customRate ? parseFloat(customRate as string) : (amount || 0 / roomIds.length);
    const calculatedMonthlyRent = isMonthly ? (monthlyRate ? (monthlyRate / roomIds.length) : 0) : 0;
    const calculatedDueDay = isMonthly ? (billingCycleDate || 1) : null;
    
    return {
      property_id: propertyId,
      room_id: rid,
      guest_name: guestName,
      guest_email: guestEmail || null,
      guest_phone: guestPhone,
      check_in: checkIn,
      check_out: checkOut,
      amount: isNaN(roomAmount) ? 0 : roomAmount,
      total_amount: isNaN(roomAmount) ? 0 : roomAmount,
      status: status,
      is_monthly: isMonthly,
      rent_due_day: calculatedDueDay,
      billing_cycle_date: calculatedDueDay,
      monthly_rent: calculatedMonthlyRent,
      monthly_rate: calculatedMonthlyRent,
      security_deposit: isMonthly ? (amount ? (amount / roomIds.length) : 0) : 0
    };
  });

  const { data: bookingData, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert(bookingsToInsert)
    .select();

  if (bookingError) {
    console.error("Failed to create booking:", bookingError);
    return { error: `Failed to create booking: ${bookingError.message}` };
  }

  // 1b. If prepaid payments were provided, record them in the payments table
  const paymentsToInsert: any[] = [];

  if (bookingData && bookingData.length > 0) {
    if (!isNaN(prepaidAmount) && prepaidAmount > 0) {
      const prepaidPerRoom = prepaidAmount / bookingData.length;
      bookingData.forEach(b => {
        paymentsToInsert.push({
          booking_id: b.id,
          property_id: propertyId,
          amount: prepaidPerRoom,
          method: prepaidMethod || 'Cash',
          payment_method: prepaidMethod || 'Cash',
          transaction_id: 'PREPAID-RENT-AT-CREATION',
          business_date: prepaidDate || checkIn
        });
      });
    }

    if (isMonthly && !isNaN(prepaidDepositAmount) && prepaidDepositAmount > 0) {
      const prepaidDepositPerRoom = prepaidDepositAmount / bookingData.length;
      bookingData.forEach(b => {
        paymentsToInsert.push({
          booking_id: b.id,
          property_id: propertyId,
          amount: prepaidDepositPerRoom,
          method: prepaidMethod || 'Cash',
          payment_method: prepaidMethod || 'Cash',
          transaction_id: 'PREPAID-DEPOSIT-AT-CREATION',
          allocation: 'Security Deposit',
          business_date: prepaidDate || checkIn
        });
      });
    }

    if (isMonthly && !isNaN(nonRefundableFee) && nonRefundableFee > 0) {
      const feePerRoom = nonRefundableFee / bookingData.length;
      for (const b of bookingData) {
        // Insert incidental charge for non-refundable fee
        await supabaseAdmin.from('incidental_charges').insert({
          booking_id: b.id,
          property_id: propertyId,
          description: 'Non-Refundable Admission / Maintenance Fee',
          amount: feePerRoom,
          category: 'Maintenance',
          created_at: new Date().toISOString()
        });

        paymentsToInsert.push({
          booking_id: b.id,
          property_id: propertyId,
          amount: feePerRoom,
          method: prepaidMethod || 'Cash',
          payment_method: prepaidMethod || 'Cash',
          transaction_id: 'NON-REFUNDABLE-FEE-AT-CREATION',
          allocation: 'Maintenance Fee (Revenue)',
          business_date: prepaidDate || checkIn
        });
      }
    }
  }

  if (paymentsToInsert.length > 0) {
    const { error: paymentInsertError } = await supabaseAdmin
      .from('payments')
      .insert(paymentsToInsert);

    if (paymentInsertError) {
      console.error("Failed to insert prepaid payment at booking creation:", paymentInsertError.message);
    } else {
      // Log the payments in Audit Trail
      for (const pay of paymentsToInsert) {
        await logAction({
          propertyId,
          action: 'PAYMENT_RECEIVED',
          details: { 
            bookingId: pay.booking_id, 
            amount: pay.amount, 
            method: pay.method, 
            transactionId: pay.transaction_id, 
            businessDate: pay.business_date,
            allocation: pay.allocation 
          },
          userId: user.id
        });
      }
    }
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
  },
  addonCharges?: { description: string; amount: number }[]
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
    .select('room_id, property_id, guest_name, group_id, id_verified, id_photo_url, signature_url, amount')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("Failed to fetch booking for check-in:", fetchError);
    return { error: "Booking not found." };
  }

  // Get all bookings to process in the group (or fallback to this single booking)
  let bookingsToProcess = [{ id: bookingId, room_id: booking.room_id, amount: booking.amount }];
  if (booking.group_id) {
    const { data: groupBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, room_id, amount')
      .eq('group_id', booking.group_id)
      .in('status', ['Confirmed', 'Pending']); // Only process those not already checked in/out/cancelled
    
    if (groupBookings && groupBookings.length > 0) {
      bookingsToProcess = groupBookings.map(b => ({ id: b.id, room_id: b.room_id, amount: b.amount }));
    }
  }

  // Get active business date from settings
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();
  const businessDate = settings?.value || getTodayLocalYYYYMMDD();

  // Insert split payments based on outstanding dues if details are provided
  if (paymentDetails && paymentDetails.amount > 0) {
    const bookingIds = bookingsToProcess.map(b => b.id);
    const { data: existingPayments } = await supabaseAdmin
      .from('payments')
      .select('booking_id, amount')
      .in('booking_id', bookingIds)
      .eq('is_void', false);

    // Map of booking_id -> prepaid sum
    const prepaidMap: { [id: string]: number } = {};
    bookingIds.forEach(id => { prepaidMap[id] = 0; });
    existingPayments?.forEach(p => {
      prepaidMap[p.booking_id] = (prepaidMap[p.booking_id] || 0) + Number(p.amount);
    });

    // Calculate dues for each booking
    const bookingsWithDues = bookingsToProcess.map(b => {
      const prepaid = prepaidMap[b.id] || 0;
      const dues = Math.max(0, Number(b.amount) - prepaid);
      return { ...b, dues };
    });

    // Distribute paymentDetails.amount across bookings based on their dues
    let remainingPayment = paymentDetails.amount;
    const paymentRecords: any[] = [];

    // First round: Allocate to settle outstanding dues
    for (const b of bookingsWithDues) {
      if (remainingPayment <= 0) break;
      const paymentForThisRoom = Math.min(remainingPayment, b.dues);
      if (paymentForThisRoom > 0) {
        paymentRecords.push({
          booking_id: b.id,
          property_id: booking.property_id,
          amount: parseFloat(paymentForThisRoom.toFixed(2)),
          method: paymentDetails.method,
          transaction_id: paymentDetails.transactionId || null,
          created_by: user.id,
          business_date: businessDate
        });
        remainingPayment -= paymentForThisRoom;
      }
    }

    // Second round: If there is still payment left (overpayment), split it equally among bookings
    if (remainingPayment > 0.01) {
      const extraPerRoom = remainingPayment / bookingsToProcess.length;
      bookingsToProcess.forEach(b => {
        const existingRecord = paymentRecords.find(r => r.booking_id === b.id);
        if (existingRecord) {
          existingRecord.amount = parseFloat((existingRecord.amount + extraPerRoom).toFixed(2));
        } else {
          paymentRecords.push({
            booking_id: b.id,
            property_id: booking.property_id,
            amount: parseFloat(extraPerRoom.toFixed(2)),
            method: paymentDetails.method,
            transaction_id: paymentDetails.transactionId || null,
            created_by: user.id,
            business_date: businessDate
          });
        }
      });
    }

    // Insert the calculated payment records
    if (paymentRecords.length > 0) {
      const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert(paymentRecords);

      if (paymentError) {
        console.error("Check-in Payment Error:", paymentError);
        return { error: `Failed to record check-in payment: ${paymentError.message}` };
      }
    }
  }

  // Insert incidental charges if provided
  if (addonCharges && addonCharges.length > 0) {
    const incidentalRecords = addonCharges.map(charge => ({
      booking_id: bookingId,
      property_id: booking.property_id,
      amount: charge.amount,
      description: charge.description,
      created_by: user.id,
      business_date: businessDate
    }));

    const { error: incidentalError } = await supabaseAdmin
      .from('incidental_charges')
      .insert(incidentalRecords);

    if (incidentalError) {
      console.error("Check-in Addon Charges Error:", incidentalError);
      return { error: `Failed to record check-in addon charges: ${incidentalError.message}` };
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
        check_in_time: new Date().toISOString(),
        id_verified: booking.id_verified || false,
        id_photo_url: booking.id_photo_url || null,
        signature_url: booking.signature_url || null
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
      paymentMethod: paymentDetails?.method,
      addonCharges
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
    .select('total_amount, property_id, guest_name, is_monthly, monthly_rent, security_deposit')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    console.error("checkOutGuest error:", bookingErr);
    return { error: 'Booking not found.' };
  }

  const { data: incidentals } = await supabaseAdmin
    .from('incidental_charges')
    .select('amount, description')
    .eq('booking_id', bookingId);
    
  const dailyRoomChargesSum = incidentals
    ?.filter(item => item.description?.startsWith('Daily Room Charge'))
    ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  const discountAmount = Number((booking as any).discount_amount || 0);
  const isMonthly = (booking as any).is_monthly;
  const monthlyRate = Number((booking as any).monthly_rent || (booking as any).total_amount || 0);

  const roomAmount = isMonthly
    ? Math.max(0, monthlyRate - discountAmount)
    : Math.max(0, Number(booking.total_amount || 0) - discountAmount - dailyRoomChargesSum);

  let totalIncidentals = incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('booking_id', bookingId);

  const totalPayments = payments
    ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  // Calculate the Balance Due
  const totalCharges = roomAmount + totalIncidentals;
  const balanceDue = totalCharges - totalPayments;

  // 2. ENFORCE ZERO BALANCE (Allow checkout if balance due is zero or negative/overpaid)
  if (balanceDue > 0.01) {
    return { 
      error: `Folio has a non-zero balance. Settle the ₹${balanceDue.toFixed(2)} balance before departure.` 
    };
  }

  // 3. EXECUTE CHECKOUT
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({ 
      status: 'Checked Out'
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
      status: 'Checked In'
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

/**
 * Applies a discount to the room tariff on a booking prior to checkout
 */
export async function applyBookingDiscount(bookingId: string, discountAmount: number, reason: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Only logged-in agents can authorize discounts.' };
  }

  if (discountAmount < 0) {
    return { error: 'Discount amount cannot be negative.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch current booking amount
  const { data: booking, error: fetchErr } = await supabaseAdmin
    .from('bookings')
    .select('amount, property_id, guest_name')
    .eq('id', bookingId)
    .single();

  if (fetchErr || !booking) {
    return { error: 'Booking not found.' };
  }

  if (discountAmount > Number(booking.amount)) {
    return { error: `Discount cannot exceed the total room tariff of ₹${booking.amount}` };
  }

  // Update booking record
  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({
      discount_amount: discountAmount,
      discount_reason: reason.trim() || null
    })
    .eq('id', bookingId);

  if (updateErr) {
    console.error("Discount Application Error:", updateErr);
    return { error: `Failed to apply discount: ${updateErr.message}` };
  }

  // Record an audit log
  await logAction({
    propertyId: booking.property_id,
    action: 'BOOKING_DISCOUNT_APPLIED',
    details: {
      bookingId,
      guestName: booking.guest_name,
      originalTariff: booking.amount,
      discountAmount,
      netTariff: Number(booking.amount) - discountAmount,
      reason
    },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');
  return { success: true, netAmount: Number(booking.amount) - discountAmount };
}


