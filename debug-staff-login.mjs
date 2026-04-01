import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testStaffLogin() {
  console.log("Testing Staff Login Flow...");
  
  // 1. Try to login with a known staff account (you need to provide the email/password or I can create a temp one)
  // Let's assume we have 'staff@hotel1.com' with 'password123'
  // If this fails, the error is in the Auth layer.
  const { data: authData, error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email: 'staff@hotel1.com', // Replace with a real staff email if you have one
    password: 'password123'
  });

  if (loginErr) {
    console.error("Login Failed:", loginErr.message);
    return;
  }
  
  console.log("✅ Login successful. User ID:", authData.user.id);
  
  // 2. Simulate the Dashboard fetchData()
  console.log("Simulating Dashboard Data Fetch...");
  
  const { data: profile, error: profErr } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();
    
  if (profErr) {
    console.error("❌ Profile Fetch Failed:", profErr.message);
  } else {
    console.log("✅ Profile Fetched:", profile.role);
  }
  
  const { data: accessibleProperties, error: accErr } = await supabaseClient
    .from('property_access')
    .select('property_id, properties(id, name)')
    .eq('user_id', authData.user.id);
    
  if (accErr) {
    console.error("❌ Property Access Fetch Failed:", accErr.message);
  } else {
    console.log(`✅ Accessible Properties Fetched: ${accessibleProperties.length} found.`);
  }

}
testStaffLogin();
