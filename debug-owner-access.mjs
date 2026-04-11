import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = fs.readFileSync('.env.local', 'utf8').match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\s]+)/)[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: 'owner2@example.com', password: 'password123' });
  if (authErr) { console.error("Login failed:", authErr); return; }
  
  console.log("Logged in as Owner.");
  
  // Test the RLS query exactly as the Front Desk runs it
  const activeId = '63dad7aa-c5f9-4f0e-b21e-b0175397a42c';
  
  const res = await supabase.from('rooms').select('*').eq('property_id', activeId);
  console.log("Found Rooms:", res.data?.length, "Error:", res.error);
}
run();
