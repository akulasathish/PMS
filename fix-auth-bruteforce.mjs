import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  console.log("Re-creating users via Admin API...");
  
  const users = [
    { email: 'admin@pms.com', password: 'password123', role: 'admin', name: 'System Admin' },
    { email: 'owner@demo.com', password: 'password123', role: 'owner', name: 'Demo Owner', prop: '11111111-1111-1111-1111-111111111111' },
    { email: 'staff@demo.com', password: 'password123', role: 'staff', name: 'Demo Staff', prop: '11111111-1111-1111-1111-111111111111' },
    { email: 'provider@pms.com', password: '8686113435', role: 'admin', name: 'Master Provider', prop: '11111111-1111-1111-1111-111111111111' }
  ];

  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role }
    });
    
    if (error) {
      console.error("Error creating", u.email, error.message);
      continue;
    }
    
    const newId = data.user.id;
    console.log("Created", u.email, "with safe ID:", newId);
    
    await supabase.from('profiles').upsert({
      id: newId,
      email: u.email,
      full_name: u.name,
      role: u.role,
      property_id: u.prop || null
    });
    
    if (u.prop) {
       await supabase.from('property_access').upsert({ user_id: newId, property_id: u.prop });
    }
  }
}
fix();
