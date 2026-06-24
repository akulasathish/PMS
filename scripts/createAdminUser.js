const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const adminEmail = 'adminuser@pms.com';
const adminPassword = '8686113435';

async function createAdminUser() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // First, check if the user already exists (from a previous failed attempt)
  const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();

  if (fetchError) {
    console.error('Error listing users:', fetchError.message);
    return;
  }

  const existingUser = existingUsers.users.find(user => user.email === adminEmail);

  if (existingUser) {
    console.log(`User ${adminEmail} already exists. Updating password and metadata...`);
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        password: adminPassword,
        user_metadata: { role: 'admin', email_verified: true },
        email_confirm: true
      }
    );
    if (error) {
      console.error('Error updating user:', error.message);
    } else {
      console.log('User updated successfully:', data.user.email, 'ID:', data.user.id);
    }
  } else {
    console.log(`Creating new user ${adminEmail}...`);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'admin', email_verified: true },
    });

    if (error) {
      console.error('Error creating user:', error.message);
    } else {
      console.log('User created successfully:', data.user.email, 'ID:', data.user.id);
    }
  }
}

createAdminUser();
