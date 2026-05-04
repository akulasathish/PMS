import { createClient } from '@supabase/supabase-js';

const url = 'http://127.0.0.1:54321';
const key = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // From .env.local

const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createSuperAdmin() {
  const email = 'staysync@pms.com';
  const password = '8686113435';

  console.log(`Creating Tier 1 Admin: ${email}...`);

  // 1. Delete if exists
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const existing = users.users.find(u => u.email === email);
  if (existing) {
    console.log(`Deleting existing user ${existing.id}...`);
    await supabaseAdmin.auth.admin.deleteUser(existing.id);
  }

  // 2. Create User
  const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { role: 'admin' }
  });

  if (authError) {
    console.error("Failed to create auth user:", authError.message);
    return;
  }

  const userId = newAuthUser.user.id;
  console.log(`Created Auth User: ${userId}`);

  // 3. Delete existing profile if any
  await supabaseAdmin.from('profiles').delete().eq('email', email);

  // 4. Create Profile
  const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
    id: userId,
    email: email,
    full_name: 'StaySync Super Admin',
    role: 'admin',
    property_id: null // Admins don't belong to a single property
  }]);

  if (profileError) {
    console.error("Failed to create profile:", profileError.message);
    return;
  }

  console.log("✅ Successfully created Tier 1 Admin: staysync@pms.com");
}

createSuperAdmin();
