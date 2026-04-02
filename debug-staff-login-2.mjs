import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabaseAdmin = createClient(supabaseUrl, 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz');
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
  console.log("1. Finding a test staff user...");
  const { data: profiles } = await supabaseAdmin.from('profiles').select('*').in('role', ['staff', 'Guest Journey', 'Room Attendant', 'Night Auditor']);
  
  if (!profiles || profiles.length === 0) {
    console.log("No staff found. Please create one on the dashboard, then run this.");
    return;
  }
  const testStaff = profiles[0];
  console.log(`2. Testing with staff user: ${testStaff.email}`);

  // Force reset password to test login
  await supabaseAdmin.auth.admin.updateUserById(testStaff.id, { password: 'password123' });

  const { data: authData, error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email: testStaff.email,
    password: 'password123'
  });

  if (loginErr) return console.log("Login failed:", loginErr);
  const user = authData.user;
  console.log("3. Login successful. Executing Dashboard fetch sequence...");

  console.log("-> Fetching profile...");
  const { data: profile, error: profErr } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  console.log("Profile Result:", profile ? "Success" : profErr?.message);

  console.log("-> Fetching property_access...");
  const { data: accessibleProperties, error: accErr } = await supabaseClient
    .from('property_access')
    .select(`
      property_id,
      properties ( id, name )
    `)
    .eq('user_id', user.id);
  console.log("Accessible Properties Result:", accessibleProperties ? accessibleProperties.length : accErr?.message);

  let activePropertyId = null;
  if (accessibleProperties && accessibleProperties.length > 0) {
    activePropertyId = accessibleProperties[0].property_id;
  } else if (profile?.property_id) {
    activePropertyId = profile.property_id;
    console.log("-> Falling back to profile property ID:", activePropertyId);
    
    console.log("-> Fetching fallback property name...");
    const { data: fallbackProp, error: fallbackErr } = await supabaseClient.from('properties').select('id, name').eq('id', activePropertyId).single();
    console.log("Fallback Prop Result:", fallbackProp ? "Success" : fallbackErr?.message);
  }

  if (activePropertyId) {
    console.log("-> Fetching property details...");
    const { data: propData, error: propDataErr } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('id', activePropertyId)
      .single();
    console.log("Property Details Result:", propData ? "Success" : propDataErr?.message);

    if (propData) {
      console.log("-> Fetching rooms...");
      const { data: roomsData, error: roomsErr } = await supabaseClient
        .from('rooms')
        .select('*')
        .eq('property_id', propData.id);
      console.log("Rooms Result:", roomsData ? "Success" : roomsErr?.message);

      console.log("-> Fetching bookings...");
      const { data: bookingsData, error: bookingsErr } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('property_id', propData.id)
        .order('check_in', { ascending: false });
      console.log("Bookings Result:", bookingsData ? "Success" : bookingsErr?.message);
    }
  }
  
  console.log("FETCH SEQUENCE COMPLETE.");
}

debug();
