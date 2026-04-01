import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkAccess() {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const ownerUser = users.users.find(u => u.email === 'owner@hotel1-2.com'); // Or the latest one
  
  if (!ownerUser) {
     console.log("Could not find owner user in auth list.");
     
     // Let's just dump the property_access table to see what's there
     const { data: allAccess } = await supabaseAdmin.from('property_access').select('*, properties(name), profiles(email)');
     console.log("All property access rows:", JSON.stringify(allAccess, null, 2));
     return;
  }

  console.log("Owner found:", ownerUser.email, ownerUser.id);

  const { data: access } = await supabaseAdmin
    .from('property_access')
    .select('*, properties(name)')
    .eq('user_id', ownerUser.id);
    
  console.log("Access records:", JSON.stringify(access, null, 2));
}

checkAccess();
