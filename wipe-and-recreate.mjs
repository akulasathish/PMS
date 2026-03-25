import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipeAndRecreate() {
  console.log("1. Wiping old corrupted users via raw SQL...");
  try {
    // Delete profiles first to clear foreign keys
    execSync(`npx supabase db query "DELETE FROM public.profiles;"`);
    // Delete auth users
    execSync(`npx supabase db query "DELETE FROM auth.users WHERE email IN ('admin@pms.com', 'owner@demo.com', 'staff@demo.com');"`);
    console.log("Database wiped successfully.");
  } catch (e) {
    console.error("Failed to wipe database:", e.message);
  }

  console.log("\n2. Recreating users via GoTrue Admin API...");
  const usersToCreate = [
    { email: 'admin@pms.com', role: 'admin', name: 'System Admin' },
    { email: 'owner@demo.com', role: 'owner', name: 'Demo Owner', prop: '11111111-1111-1111-1111-111111111111' },
    { email: 'staff@demo.com', role: 'staff', name: 'Demo Staff', prop: '11111111-1111-1111-1111-111111111111' },
  ];

  for (const def of usersToCreate) {
    const { data: userResp, error: userErr } = await supabase.auth.admin.createUser({
      email: def.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: def.role }
    });

    if (userErr) {
      console.error(`Failed to create ${def.email}:`, userErr.message);
      continue;
    }

    const newId = userResp.user.id;
    console.log(`Created ${def.email} with new ID: ${newId}`);

    // Re-link the profiles
    await supabase.from('profiles').insert({
      id: newId,
      email: def.email,
      full_name: def.name,
      role: def.role,
      property_id: def.prop || null
    });
  }
  
  console.log("\n3. Testing Login...");
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'admin@pms.com',
    password: 'password123'
  });
  
  if (loginErr) {
    console.log("Login Test Failed:", loginErr.message);
  } else {
    console.log("Login Test SUCCESS! Password hashing is fixed.");
  }
}

wipeAndRecreate();
