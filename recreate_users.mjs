import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // From your local status
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recreateUsers() {
  console.log("Recreating Default Users...");

  const usersToCreate = [
    { email: 'admin@pms.com', role: 'admin' },
    { email: 'owner@demo.com', role: 'owner' },
    { email: 'staff@demo.com', role: 'staff' },
  ];

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    return;
  }

  for (const userDef of usersToCreate) {
    const existingUser = listData.users.find(u => u.email === userDef.email);
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log(`Deleted old user: ${userDef.email}`);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: userDef.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: userDef.role }
    });

    if (error) {
      console.error(`Error creating ${userDef.email}:`, error.message);
    } else {
      console.log(`Successfully created: ${userDef.email} (ID: ${data.user.id})`);
      
      // Update their profile to link to the property if needed
      if (userDef.role === 'owner' || userDef.role === 'staff') {
        const propId = '11111111-1111-1111-1111-111111111111'; // ID from seed.sql
        await supabase.from('profiles').update({ property_id: propId }).eq('id', data.user.id);
      }
    }
  }
}

recreateUsers();
