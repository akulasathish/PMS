import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testClientFetch() {
  const { error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email: 'owner@hotel1-2.com',
    password: 'password123'
  });

  if (loginErr) return console.error("Login failed:", loginErr.message);
  
  const { data: { user } } = await supabaseClient.auth.getUser();
  console.log("Logged in user:", user.id);

  const { data: accessibleProperties, error } = await supabaseClient
    .from('property_access')
    .select(`
      property_id,
      properties ( id, name )
    `)
    .eq('user_id', user.id);

  if (error) console.error("Fetch error:", error.message);
  else console.log("Accessible Properties from Client:", JSON.stringify(accessibleProperties, null, 2));
}

testClientFetch();
