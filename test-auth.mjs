import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; // From supabase status output

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTier1Login() {
  console.log('Testing Tier 1 Admin Login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@pms.com',
    password: 'password123',
  });

  if (error) {
    console.error('Login Failed:', error.message);
    return;
  }

  console.log('Login Successful!');
  console.log('User ID:', data.user.id);
  console.log('User Role:', data.user.user_metadata.role);
  
  if (data.user.user_metadata.role === 'admin') {
    console.log('SUCCESS: Account has correct Tier 1 (Admin) privileges.');
  } else {
    console.log('WARNING: Account does not have admin privileges.');
  }
}

testTier1Login();
