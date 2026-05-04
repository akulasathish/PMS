import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = fs.readFileSync('.env.local', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=([^\s]+)/)[1];

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const propertyId = '1ae37320-d72b-4600-9ec3-cf69f28e8c89';
  
  // Find a booking for Mango Hotels
  const { data: b } = await supabaseAdmin.from('bookings').select('id, guest_name, guest_email').eq('property_id', propertyId).limit(1).single();
  if (!b) { console.log("No bookings found for Mango Hotels."); return; }
  const bookingId = b.id;

  console.log("Simulating Server Action...");

  const { error: guestError } = await supabaseAdmin
    .from('guests')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      full_name: b.guest_name,
      email: b.guest_email,
      id_photo_url: "server_action_test.jpg",
      signature_url: "server_action_test_sig"
    }]);

  if (guestError) {
    console.error("❌ Server Action: Guest Insert Error:", guestError);
  } else {
    console.log("✅ Server Action: Guest Insert Success");
  }

  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({ 
      id_verified: true,
      status: 'Confirmed'
    })
    .eq('id', bookingId)
    .eq('property_id', propertyId);

  if (updateError) {
    console.error("❌ Server Action: Booking Update Error:", updateError);
  } else {
    console.log("✅ Server Action: Booking Update Success");
  }
}
run();
