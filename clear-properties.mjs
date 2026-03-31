import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // From your local environment
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function clearProperties() {
  console.log("--- INITIATING FULL PROPERTY WIPE ---");

  // 1. Fetch all properties
  const { data: properties, error: fetchErr } = await supabaseAdmin
    .from('properties')
    .select('id, name');

  if (fetchErr) {
    console.error("Failed to fetch properties:", fetchErr.message);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log("Database is already empty. No properties found.");
    return;
  }

  console.log(`Found ${properties.length} properties to delete.`);

  // 2. Loop through each property and perform a hard wipe
  for (const prop of properties) {
    console.log(`\nDeleting Property: ${prop.name} (${prop.id})`);

    // A. Find and delete all associated users (Owners/Staff)
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('property_id', prop.id);
    const { data: accessLinks } = await supabaseAdmin.from('property_access').select('user_id').eq('property_id', prop.id);
    
    const usersToDelete = [...(profiles || []), ...(accessLinks || [])].map(p => p.id || p.user_id);
    const uniqueUsers = [...new Set(usersToDelete)];

    for (const uid of uniqueUsers) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      console.log(`   -> Deleted Auth User ID: ${uid}`);
    }

    // B. Delete the property record (cascades to rooms and bookings)
    const { error: delPropErr } = await supabaseAdmin.from('properties').delete().eq('id', prop.id);
    if (delPropErr) {
      console.error(`   ❌ Failed to delete property record:`, delPropErr.message);
    } else {
      console.log(`   ✅ Property record deleted.`);
    }
  }

  console.log("\n--- WIPE COMPLETE ---");
}

clearProperties();
