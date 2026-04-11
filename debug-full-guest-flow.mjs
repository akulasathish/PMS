import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = fs.readFileSync('.env.local', 'utf8').match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\s]+)/)[1];
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'owner2@example.com',
    password: 'password123'
  });
  if (authErr) { console.error("Login failed:", authErr); return; }
  console.log("Logged in as Owner.");

  const propertyId = '63dad7aa-c5f9-4f0e-b21e-b0175397a42c';
  
  // Get any valid booking ID
  const { data: b } = await supabase.from('bookings').select('id, guest_name, guest_email').eq('property_id', propertyId).limit(1).single();
  const bookingId = b.id;
  
  console.log("Found valid booking:", bookingId);

  console.log("--- 1. Test Storage Upload ---");
  const fileContent = "dummy_file_content_test_123";
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('guest-ids')
    .upload(`test_${Date.now()}.txt`, fileContent, { upsert: true });
  console.log("Upload Error:", uploadError);

  console.log("--- 2. Test Guest Insert ---");
  const { error: guestError } = await supabase.from('guests').insert([{
    booking_id: bookingId,
    property_id: propertyId,
    full_name: b.guest_name || "Test User",
    email: b.guest_email || "test@example.com",
    id_photo_url: "test.jpg",
    signature_url: "test_sig"
  }]);
  console.log("Guest Insert Error:", guestError);

  console.log("--- 3. Test Booking Update ---");
  const { error: updateError } = await supabase.from('bookings').update({ 
    id_verified: true,
    status: 'Confirmed'
  }).eq('id', bookingId).eq('property_id', propertyId);
  console.log("Booking Update Error:", updateError);
}
run();
