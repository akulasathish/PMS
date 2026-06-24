const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const userId = 'adc50cf6-d22a-4cbe-8ddd-306b2d1cfe46'; // UID of adminuser@pms.com
const newPassword = '8686113435';

async function resetPassword() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (error) {
    console.error('Error resetting password:', error.message);
  } else {
    console.log('Password reset successfully for user:', data.user.email);
  }
}

resetPassword();
