import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: prop } = await supabaseAdmin.from('properties').insert([{ name: 'Test Luxury Resort', tier: 'Pro' }]).select().single();
  const propId = prop.id;
  const { data: auth } = await supabaseAdmin.auth.admin.createUser({ email: 'tier1_owner@test.com', password: 'password123', email_confirm: true });
  const ownerId = auth.user.id;
  await supabaseAdmin.from('profiles').insert([{ id: ownerId, email: 'tier1_owner@test.com', full_name: 'Tier 1 Test Owner', role: 'owner' }]);
  await supabaseAdmin.from('property_access').insert([{ user_id: ownerId, property_id: propId }]);

  await supabaseClient.auth.signInWithPassword({ email: 'tier1_owner@test.com', password: 'password123' });
  const { data, error } = await supabaseClient.from('properties').select('name');
  
  if (error) console.error("RLS Error:", error.message);
  else console.log("Accessible Properties:", data);

  await supabaseAdmin.auth.admin.deleteUser(ownerId);
  await supabaseAdmin.from('properties').delete().eq('id', propId);
}

run();
