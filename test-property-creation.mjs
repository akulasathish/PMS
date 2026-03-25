import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // From your local environment
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testPropertyCreation() {
  console.log("Testing Property Creation via Service Role...");
  
  // 1. Generate a dummy password (e.g. 8 random characters)
  const dummyPassword = Math.random().toString(36).slice(-8);

  // 2. Insert the Property
  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from('properties')
    .insert([{ name: 'Test Property Script', tier: 'Pro' }])
    .select()
    .single();

  if (propertyError) {
    console.error("Property Error:", propertyError.message);
    return;
  }
  console.log("Property created:", propertyData.id);

  // 3. Create the User via Supabase Admin Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'testowner@pms.com',
    password: dummyPassword,
    email_confirm: true,
    user_metadata: { 
      role: 'owner',
      requires_password_change: true 
    }
  });

  if (authError) {
    console.error("Auth Error:", authError.message);
    await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
    return;
  }
  console.log("Auth user created:", authData.user.id);

  // 4. Create the Profile linking the Owner to the Property
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: authData.user.id,
      email: 'testowner@pms.com',
      role: 'owner',
      property_id: propertyData.id,
      full_name: 'Property Owner'
    }]);

  if (profileError) {
    console.error("Profile Error:", profileError.message);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
    return;
  }
  
  console.log("Profile created successfully! Test complete.");
  
  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
  await supabaseAdmin.from('profiles').delete().eq('id', authData.user.id);
  await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
  console.log("Cleanup done.");
}

testPropertyCreation();
