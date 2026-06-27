'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function processGuestRegistration(formData: FormData) {
  try {
    // Initialize client inside the function to ensure env vars are available
    const supabaseAdmin = getSupabaseAdmin();

    const bookingId = formData.get('bookingId') as string;
    const propertyId = formData.get('propertyId') as string;
    const guestName = formData.get('guestName') as string;
    const guestEmail = formData.get('guestEmail') as string;
    const idPhoto = formData.get('idPhoto') as File;
    const signature = formData.get('signature') as File;

    if (!bookingId || !propertyId || !idPhoto || !signature) {
      return { error: 'Missing required fields for registration' };
    }

    const idExt = idPhoto.type === 'image/jpeg' ? 'jpg' : (idPhoto.name.split('.').pop()?.toLowerCase() || 'jpg');
    const idFileName = `${bookingId}_id.${idExt}`;
    const sigFileName = `${bookingId}_sig.png`;

    // 1. Upload ID Photo (explicitly passing content type ensures browser displays it rather than downloading)
    const { error: idUploadError } = await supabaseAdmin.storage
      .from('guest-ids')
      .upload(idFileName, idPhoto, { upsert: true, contentType: 'image/jpeg' });

    if (idUploadError) {
      console.error("Server Action: ID Upload Error:", idUploadError);
      return { error: `Failed to upload ID photo: ${idUploadError.message}` };
    }

    // 2. Upload Signature
    const { error: sigUploadError } = await supabaseAdmin.storage
      .from('guest-ids')
      .upload(sigFileName, signature, { upsert: true, contentType: 'image/png' });

    if (sigUploadError) {
      console.error("Server Action: Signature Upload Error:", sigUploadError);
      return { error: `Failed to upload signature: ${sigUploadError.message}` };
    }

    // 3. Insert the Guest PII using the Service Role Key (Bypasses RLS)
    const { error: guestError } = await supabaseAdmin
      .from('guests')
      .insert([{
        booking_id: bookingId,
        property_id: propertyId,
        full_name: guestName,
        email: guestEmail,
        id_photo_url: idFileName,
        signature_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guest-ids/${sigFileName}`
      }]);

    if (guestError) {
      console.error("Server Action: Guest Insert Error:", guestError);
      return { error: `Database Error: ${guestError.message}` };
    }

    // 4. Update the Booking
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        id_verified: true,
        id_photo_url: idFileName,
        signature_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guest-ids/${sigFileName}`,
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
  } catch (err: any) {
    console.error("Unhandled Exception in processGuestRegistration:", err);
    return { error: `Server Crash: ${err.message}` };
  }
}
