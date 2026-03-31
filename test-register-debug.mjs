import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testRegistration() {
  console.log("Testing Property Creation (Simulating registerProperty)...");

  // 1. Insert Property
  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from('properties')
    .insert([{ name: 'Debug Hotel', tier: 'Starter' }])
    .select()
    .single();

  if (propertyError) {
    console.error("❌ FAILED to create property:", propertyError.message);
    return;
  }
  console.log("✅ Property Inserted:", propertyData.id);

  // 2. Create Auth User
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'debug_owner@test.com',
    password: 'password123',
    email_confirm: true,
  });

  if (authError) {
    console.error("❌ FAILED to create owner user:", authError.message);
    await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
    return;
  }
  console.log("✅ Auth User Created:", authData.user.id);

  // 3. Create Profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: authData.user.id,
      email: 'debug_owner@test.com',
      role: 'owner',
      property_id: propertyData.id,
      full_name: 'Property Owner'
    }]);

  if (profileError) {
    console.error("❌ FAILED to create owner profile:", profileError.message);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
    return;
  }
  console.log("✅ Profile Created!");

  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
  await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
  console.log("Test clean up complete.");
}

testRegistration();
