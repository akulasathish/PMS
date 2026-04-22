import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'provider@pms.com',
    password: '8686113435'
  });
  if (authErr) {
    console.error("Local Login failed:", authErr);
    return;
  }
  console.log("Logged into Local as:", authData.user.id);
  
  const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
  console.log("Profile Role:", profile?.role, profErr?.message || '');
}
testAuth();
