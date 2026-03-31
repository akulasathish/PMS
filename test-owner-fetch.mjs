import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // From your local environment
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fetchOwners() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      property_access (
        property_id,
        properties ( name )
      )
    `)
    .eq('role', 'owner');

  if (error) {
    console.error("❌ Fetch Error:", error.message);
  } else {
    console.log("✅ Success! Data:", JSON.stringify(data, null, 2));
  }
}

fetchOwners();
