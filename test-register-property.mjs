import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'provider@pms.com',
    password: '8686113435'
  });

  if (authErr) {
    console.error("Login failed:", authErr.message);
    return;
  }

  console.log("Logged in. Testing fetch...");
  const { data, error } = await supabase.from('properties').select('*');
  console.log("Properties:", data?.length, error?.message || 'Success');
}
test();
