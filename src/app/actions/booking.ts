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
  revalidatePath('/front-desk');
  revalidatePath('/(tier3)/front-desk', 'page');
  
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
  revalidatePath('/front-desk');
  revalidatePath('/(tier3)/front-desk', 'page');

  return { success: true };
}
