import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // From local status
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testCreateStaff() {
  console.log("--- SIMULATING STAFF CREATION ---");
  
  // 1. Get a property to assign the staff to
  const { data: propData } = await supabaseAdmin.from('properties').select('id').limit(1).single();
  if (!propData) return console.error("No property found to assign staff to.");
  
  // 2. Create the Auth User
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_staff_loading@test.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { role: 'staff' }
  });
  if (authErr) return console.error("Auth creation failed:", authErr.message);

  // 3. Create the Profile
  const profileData = {
    id: authData.user.id,
    email: 'test_staff_loading@test.com',
    role: 'staff',
    property_id: propData.id,
    permissions: {"front_office": "full", "housekeeping": "read", "analytics": "none", "inventory": "none", "staff_management": "none"}
  };
  const { error: profileError } = await supabaseAdmin.from('profiles').insert([profileData]);
  if (profileError) return console.error("Profile creation failed:", profileError.message);

  console.log(`✅ Staff Account Created: ${authData.user.id}`);
  
  // 4. Test the Frontend Login Flow
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
  const { error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email: 'test_staff_loading@test.com',
    password: 'password123'
  });
  
  if (loginErr) return console.error("❌ Login Failed:", loginErr.message);
  console.log("✅ Login successful. Simulating Dashboard Load...");

  const { data: accProps, error: accErr } = await supabaseClient
    .from('property_access')
    .select('property_id, properties(id, name)')
    .eq('user_id', authData.user.id);
  
  console.log("Property Access Fetch Result:", accProps, accErr ? accErr.message : "Success");
  
  const { data: profileFetch, error: profFetchErr } = await supabaseClient
    .from('profiles')
    .select('property_id')
    .eq('id', authData.user.id)
    .single();
    
  console.log("Profile Property ID Fetch Result:", profileFetch, profFetchErr ? profFetchErr.message : "Success");

  await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
}
testCreateStaff();
