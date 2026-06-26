'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { logAction } from './audit';

/**
 * Resolve a pending arrival by marking it Cancelled (No-Show)
 */
export async function markArrivalNoShow(bookingId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch the booking details
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('property_id, guest_name, room_id')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: 'Booking not found.' };
  }

  // Update status to 'Cancelled'
  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'Cancelled' })
    .eq('id', bookingId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Update room status to 'Available' (since guest didn't arrive)
  await supabaseAdmin
    .from('rooms')
    .update({ status: 'Available' })
    .eq('id', booking.room_id);

  // Log action
  await logAction({
    propertyId: booking.property_id,
    action: 'GUEST_NO_SHOW',
    details: { guestName: booking.guest_name, bookingId },
    userId: user.id
  });

  return { success: true };
}

/**
 * Extend the stay of a departing booking by 1 or more nights
 */
export async function extendBookingStay(bookingId: string, newCheckOutDate: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch the booking details
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('property_id, guest_name, check_in, check_out, amount')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: 'Booking not found.' };
  }

  // Calculate daily rate to scale booking total amount
  const currentCheckIn = new Date(booking.check_in);
  const currentCheckOut = new Date(booking.check_out);
  const nights = Math.max(1, Math.round((currentCheckOut.getTime() - currentCheckIn.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyRate = Number(booking.amount) / nights;

  // New total amount
  const nextCheckOut = new Date(newCheckOutDate);
  const newNights = Math.max(1, Math.round((nextCheckOut.getTime() - currentCheckIn.getTime()) / (1000 * 60 * 60 * 24)));
  const newAmount = dailyRate * newNights;

  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ 
      check_out: newCheckOutDate,
      amount: parseFloat(newAmount.toFixed(2))
    })
    .eq('id', bookingId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Log action
  await logAction({
    propertyId: booking.property_id,
    action: 'BOOKING_EXTENDED',
    details: { 
      guestName: booking.guest_name, 
      bookingId, 
      oldCheckOut: booking.check_out, 
      newCheckOut: newCheckOutDate,
      newAmount
    },
    userId: user.id
  });

  return { success: true };
}

/**
 * Post daily room rates as incidental charges to active checked-in folios
 */
export async function postDailyRoomCharges(
  propertyId: string, 
  businessDate: string, 
  bookingsToCharge: { id: string; amount: number; guestName: string }[]
) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  const insertRows: any[] = [];
  
  try {
    for (const bk of bookingsToCharge) {
      const description = `Daily Room Charge - ${businessDate}`;
      
      // Check if charge already exists for this booking and date
      const { data: existing } = await supabaseAdmin
        .from('incidental_charges')
        .select('id')
        .eq('booking_id', bk.id)
        .eq('description', description)
        .limit(1);

      if (existing && existing.length > 0) {
        continue; // Skip duplicates safely
      }

      insertRows.push({
        booking_id: bk.id,
        property_id: propertyId,
        amount: bk.amount,
        description,
        created_by: user.id,
        is_automated: true,
        business_date: businessDate
      });
    }

    if (insertRows.length === 0) {
      return { success: true, count: 0, message: "All charges are already posted." };
    }

    // Single batch insert (guaranteed atomic "all-or-nothing" execution in PostgreSQL)
    const { error: insertError } = await supabaseAdmin
      .from('incidental_charges')
      .insert(insertRows);

    if (insertError) {
      throw insertError;
    }
    
    // Log action
    await logAction({
      propertyId,
      action: 'CHARGES_POSTED',
      details: { 
        businessDate, 
        totalChargesPosted: insertRows.length,
        results: insertRows.map(r => ({ guestName: bookingsToCharge.find(b => b.id === r.booking_id)?.guestName, amount: r.amount, posted: true }))
      },
      userId: user.id
    });

    return { success: true, count: insertRows.length };
  } catch (err: any) {
    console.error("Batch Room Charges Posting Error:", err);
    return { error: err.message || 'Failed to post charges atomically.' };
  }
}

/**
 * Execute central business date rollover + housekeeping status synchronization
 */
export async function executeDateRollover(propertyId: string, currentBusinessDate: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Calculate next business date
  const currentDate = new Date(currentBusinessDate);
  currentDate.setDate(currentDate.getDate() + 1);
  const nextBusinessDate = currentDate.toISOString().substring(0, 10);

  // 2. Update key 'business_date' in app_settings
  const { error: settingsError } = await supabaseAdmin
    .from('app_settings')
    .update({ value: nextBusinessDate, updated_at: new Date().toISOString() })
    .eq('key', 'business_date');

  if (settingsError) {
    return { error: `Failed to update business date: ${settingsError.message}` };
  }

  // 3. Reset all currently occupied stayover rooms (with booking status 'Checked In') back to 'Occupied' in the database.
  // This ensures that any rooms that were cleaned and inspected yesterday (which are currently 'Available', 'Clean', or 'Cleaning')
  // are put back into the Housekeeping "Stayovers" (Service Required) bucket for the new business date,
  // while preserving their occupied status and avoiding marking them as vacant 'Dirty' rooms.
  const { data: activeBookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select('room_id')
    .eq('property_id', propertyId)
    .eq('status', 'Checked In');

  if (bookingsError) {
    return { error: `Failed to fetch active bookings during rollover: ${bookingsError.message}` };
  }

  let updatedRoomsCount = 0;
  if (activeBookings && activeBookings.length > 0) {
    const roomIds = activeBookings.map(b => b.room_id);
    const { error: roomsUpdateError } = await supabaseAdmin
      .from('rooms')
      .update({ status: 'Occupied' })
      .in('id', roomIds);

    if (roomsUpdateError) {
      return { error: `Failed to reset stayover room statuses to Occupied: ${roomsUpdateError.message}` };
    }
    updatedRoomsCount = activeBookings.length;
  }

  // 4. Log action
  await logAction({
    propertyId,
    action: 'NIGHT_AUDIT_ROLLOVER',
    details: { 
      oldBusinessDate: currentBusinessDate, 
      newBusinessDate: nextBusinessDate,
      roomsMarkedDirty: updatedRoomsCount
    },
    userId: user.id
  });

  return { 
    success: true, 
    nextBusinessDate, 
    roomsMarkedDirty: updatedRoomsCount 
  };
}
