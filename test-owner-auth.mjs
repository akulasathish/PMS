import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOwnerLogin() {
  console.log('Testing Tier 2 Owner Login (owner@swetha.com)...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'owner@swetha.com',
    password: '8686113435',
  });

  if (error) {
    console.error('Login Failed:', error.message);
    return;
  }

  console.log('Login Successful!');
  console.log('User ID:', data.user.id);
  const role = data.user.user_metadata?.role;
  console.log('User Role:', role);
  
  if (role === 'owner') {
    console.log('SUCCESS: Account has correct Tier 2 (Owner) privileges.');
  } else {
    console.log(`WARNING: Account has role "${role}", but Tier 2 requires "owner".`);
  }
}

testOwnerLogin();
