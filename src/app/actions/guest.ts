'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function processGuestRegistration(
  bookingId: string, 
  propertyId: string, 
  guestName: string, 
  guestEmail: string, 
  fileName: string, 
  signatureData: string
) {
  // 1. Insert the Guest PII using the Service Role Key (Bypasses RLS because the guest is not logged in)
  const { error: guestError } = await supabaseAdmin
    .from('guests')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      full_name: guestName,
      email: guestEmail,
      id_photo_url: fileName,
      signature_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guest-ids/${signatureData}`
    }]);

  if (guestError) {
    console.error("Server Action: Guest Insert Error:", guestError);
    return { error: `Database Error: ${guestError.message}` };
  }

  // 2. Update the Booking
  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ 
      id_verified: true,
      id_photo_url: fileName,
      signature_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guest-ids/${signatureData}`,
      status: 'Confirmed'
    })
    .eq('id', bookingId)
    .eq('property_id', propertyId);

  if (updateError) {
    console.error("Server Action: Booking Update Error:", updateError);
    return { error: `Update Error: ${updateError.message}` };
  }
  
  revalidatePath('/dashboard/front-office');
  return { success: true };
}