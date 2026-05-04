import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    { password: '8686113435' }
  );

  if (error) {
    console.error("Failed to update password:", error);
  } else {
    console.log("Password successfully updated and securely hashed for provider@pms.com!");
  }
}
fixPassword();
