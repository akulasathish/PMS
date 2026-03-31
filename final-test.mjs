import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("=== STARTING TIER 1 OWNER PROVISIONING TEST ===");

  // Cleanup potential previous runs
  const { data: oldUser } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = oldUser.users.find(u => u.email === 'tier1_owner@test.com');
  if (targetUser) {
    await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
  }

  // 1. Create a Test Property
  const { data: prop } = await supabaseAdmin
    .from('properties')
    .insert([{ name: 'Luxury Resort 2026', tier: 'Pro' }])
    .select().single();
  const propId = prop.id;
  console.log(`✅ Property Created: Luxury Resort 2026 (${propId})`);

  // 2. Provision Owner
  const { data: auth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'tier1_owner@test.com',
    password: 'password123',
    email_confirm: true
  });
  if (authErr) return console.error("❌ Failed to create auth user:", authErr.message);
  
  const ownerId = auth.user.id;
  console.log(`✅ Executive Auth Account Created: tier1_owner@test.com`);

  // 3. Create Profile & Assign Access
  await supabaseAdmin.from('profiles').insert([{ id: ownerId, email: 'tier1_owner@test.com', full_name: 'Test Owner', role: 'owner' }]);
  await supabaseAdmin.from('property_access').insert([{ user_id: ownerId, property_id: propId }]);
  console.log(`✅ Assigned 'Test Owner' to 'Luxury Resort 2026' via property_access table.`);

  // 4. Test RLS Security (Login as Owner)
  const { error: loginErr } = await supabaseClient.auth.signInWithPassword({ email: 'tier1_owner@test.com', password: 'password123' });
  if (loginErr) return console.error("❌ Login failed:", loginErr.message);

  // 5. Verify Isolation
  const { data: ownerProps, error: ownerPropsErr } = await supabaseClient.from('properties').select('name');
  
  if (ownerPropsErr) {
    console.error("❌ RLS Blocked Fetch entirely:", ownerPropsErr.message);
  } else {
    console.log(`\n🔍 RLS SECURITY CHECK (Owner View):`);
    console.log(`   Total Properties Visible to this Owner: ${ownerProps.length}`);
    if (ownerProps.length === 1 && ownerProps[0].name === 'Luxury Resort 2026') {
      console.log("   ✅ RLS IS SUCCESSFUL: Owner is strictly isolated to their assigned property. They cannot see the Demo Hotel.");
    } else {
      console.log("   ❌ RLS FAILED: Owner can see unassigned properties:", ownerProps);
    }
  }

  await supabaseClient.auth.signOut();

  // 6. Test Admin Deletion (Cascade Wipe)
  console.log("\n🗑️  Admin Executing Hard Delete...");
  await supabaseAdmin.auth.admin.deleteUser(ownerId);
  await supabaseAdmin.from('properties').delete().eq('id', propId);

  const { data: checkProp } = await supabaseAdmin.from('properties').select('id').eq('id', propId);
  const { data: checkAuth } = await supabaseAdmin.auth.admin.getUserById(ownerId);
  
  if (checkProp.length === 0 && checkAuth.error) {
    console.log("✅ DELETION SUCCESS: Property, Access Links, and Executive Auth Account were wiped clean.");
  } else {
    console.log("❌ DELETION FAILED: Data was left behind.");
  }
}

test();
