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

  const insertPromises = bookingsToCharge.map(async (bk) => {
    const description = `Daily Room Charge - ${businessDate}`;
    
    // Check if charge already exists for this booking and date
    const { data: existing } = await supabaseAdmin
      .from('incidental_charges')
      .select('id')
      .eq('booking_id', bk.id)
      .eq('description', description)
      .limit(1);

    if (existing && existing.length > 0) {
      return { skipped: true, guestName: bk.guestName };
    }

    const { error } = await supabaseAdmin
      .from('incidental_charges')
      .insert({
        booking_id: bk.id,
        property_id: propertyId,
        amount: bk.amount,
        description,
        created_by: user.id,
        is_automated: true
      });

    if (error) {
      console.error(`Error posting charge for booking ${bk.id}:`, error);
      throw new Error(`Failed to post charge for ${bk.guestName}: ${error.message}`);
    }

    return { posted: true, guestName: bk.guestName };
  });

  try {
    const results = await Promise.all(insertPromises);
    
    // Log action
    await logAction({
      propertyId,
      action: 'CHARGES_POSTED',
      details: { 
        businessDate, 
        totalChargesPosted: results.filter(r => r.posted).length,
        results
      },
      userId: user.id
    });

    return { success: true, results };
  } catch (err: any) {
    return { error: err.message || 'Failed to post charges.' };
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

  // 3. Mark all occupied rooms as 'Dirty' so housekeeping can clean them
  const { data: occupiedRooms, error: roomsFetchError } = await supabaseAdmin
    .from('rooms')
    .select('id, room_number')
    .eq('property_id', propertyId)
    .eq('status', 'Occupied');

  if (roomsFetchError) {
    return { error: `Failed to fetch occupied rooms: ${roomsFetchError.message}` };
  }

  let updatedRoomsCount = 0;
  if (occupiedRooms && occupiedRooms.length > 0) {
    const roomIds = occupiedRooms.map(r => r.id);
    const { error: roomsUpdateError } = await supabaseAdmin
      .from('rooms')
      .update({ status: 'Dirty' })
      .in('id', roomIds);

    if (roomsUpdateError) {
      return { error: `Failed to update room statuses to Dirty: ${roomsUpdateError.message}` };
    }
    updatedRoomsCount = occupiedRooms.length;
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
