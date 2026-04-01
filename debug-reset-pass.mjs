import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient('http://127.0.0.1:54321', 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz');

async function fix() {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const owner = users.users.find(u => u.email === 'owner@hotel1-2.com');
  if (owner) {
    await supabaseAdmin.auth.admin.updateUserById(owner.id, { password: 'password123' });
    console.log("Password forcibly reset to password123 for:", owner.email);
  }
}
fix();
