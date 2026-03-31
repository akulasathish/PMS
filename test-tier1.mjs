import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log("=== STARTING TIER 1 ADMIN TEST ===\n");

  // 1. Create a Test Property
  console.log("1. Admin: Creating 'Test Luxury Resort'...");
  const { data: prop, error: propErr } = await supabaseAdmin
    .from('properties')
    .insert([{ name: 'Test Luxury Resort', tier: 'Pro' }])
    .select().single();
  
  if (propErr) return console.error("Failed to create property:", propErr);
  const propId = prop.id;

  // 2. Provision Owner
  console.log("2. Admin: Provisioning Owner 'tier1_owner@test.com'...");
  const { data: auth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'tier1_owner@test.com',
    password: 'password123',
    email_confirm: true
  });
  if (authErr) return console.error("Failed to create auth user:", authErr);
  const ownerId = auth.user.id;

  // 3. Create Profile & Assign Access
  console.log("3. Admin: Assigning Access Rights...");
  await supabaseAdmin.from('profiles').insert([{
    id: ownerId, email: 'tier1_owner@test.com', full_name: 'Tier 1 Test Owner', role: 'owner'
  }]);
  await supabaseAdmin.from('property_access').insert([{
    user_id: ownerId, property_id: propId
  }]);

  // 4. Test RLS Security (Login as Owner)
  console.log("\n4. Security Check: Logging in as 'tier1_owner@test.com'...");
  const { error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email: 'tier1_owner@test.com',
    password: 'password123'
  });
  if (loginErr) return console.error("Login failed:", loginErr);

  // 5. Verify Isolation
  console.log("5. Security Check: Fetching accessible properties...");
  const { data: ownerProps, error: ownerPropsErr } = await supabaseClient
    .from('properties').select('name');
  
  console.log(`   -> Found ${ownerProps.length} properties.`);
  if (ownerProps.length === 1 && ownerProps[0].name === 'Test Luxury Resort') {
    console.log("   ✅ RLS SUCCESS: Owner is strictly isolated to 'Test Luxury Resort'.");
  } else {
    console.log("   ❌ RLS FAILED: Owner can see other properties!", ownerProps);
  }

  // Logout client
  await supabaseClient.auth.signOut();

  // 6. Test Admin Deletion (Cascade Wipe)
  console.log("\n6. Admin: Executing 'Delete Property' (Hard Wipe)...");
  
  // Find users associated with the property (simulating Server Action)
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('property_id', propId);
  const { data: accessLinks } = await supabaseAdmin.from('property_access').select('user_id').eq('property_id', propId);
  
  const usersToDelete = [...(profiles || []), ...(accessLinks || [])].map(p => p.id || p.user_id);
  const uniqueUsers = [...new Set(usersToDelete)];

  for (const uid of uniqueUsers) {
    await supabaseAdmin.auth.admin.deleteUser(uid);
    console.log(`   -> Deleted Auth User: ${uid}`);
  }

  await supabaseAdmin.from('properties').delete().eq('id', propId);
  console.log(`   -> Deleted Property: ${propId}`);

  // 7. Final Verification
  const { data: checkProp } = await supabaseAdmin.from('properties').select('id').eq('id', propId);
  const { data: checkAuth } = await supabaseAdmin.auth.admin.getUserById(ownerId);
  
  if (checkProp.length === 0 && checkAuth.error) {
    console.log("\n✅ DELETION SUCCESS: Property and Owner were completely wiped from the system.");
  } else {
    console.log("\n❌ DELETION FAILED: Orphaned data detected.");
  }
  
  console.log("\n=== TEST COMPLETE ===");
}

runTest();
