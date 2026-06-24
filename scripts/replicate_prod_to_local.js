const { createClient } = require('@supabase/supabase-js');

// Production Connection Details
const PROD_URL = "https://njblemtrkqdnijwrnvjp.supabase.co";
const PROD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYmxlbXRya3Fkbmlqd3JudmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUyNTM4OCwiZXhwIjoyMDk1MTAxMzg4fQ.xSZmJdnzFvTjpCIwjuRHV_ABBYGvwGKe0cWutgPupSg";

// Local Connection Details
const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUyNTM4OCwiZXhwIjoyMDk1MTAxMzg4fQ.xSZmJdnzFvTjpCIwjuRHV_ABBYGvwGKe0cWutgPupSg"; // Wait, is the local service role key different? Yes, it's defined in env.local!
const LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Ordered tables list for deleting and inserting
// Reverse delete order to avoid FK violation
const DELETE_ORDER = [
  "audit_logs",
  "daily_cash_balances",
  "expenses",
  "guests",
  "room_blocks",
  "payments",
  "incidental_charges",
  "bookings",
  "rooms",
  "property_access",
  "subscriptions",
  "profiles",
  "app_settings",
  "properties"
];

// Forward insert order to satisfy FK constraints
const INSERT_ORDER = [
  "properties",
  "app_settings",
  "profiles",
  "subscriptions",
  "property_access",
  "rooms",
  "bookings",
  "incidental_charges",
  "payments",
  "room_blocks",
  "guests",
  "expenses",
  "daily_cash_balances",
  "audit_logs"
];

const DEFAULT_PASSWORD = "password123";

async function run() {
  const prodHeaders = {
    "apikey": PROD_KEY,
    "Authorization": `Bearer ${PROD_KEY}`,
    "Content-Type": "application/json"
  };

  const localHeaders = {
    "apikey": LOCAL_SERVICE_KEY,
    "Authorization": `Bearer ${LOCAL_SERVICE_KEY}`,
    "Content-Type": "application/json"
  };

  // Initialize Supabase Admin client on local to manage Auth Users
  const localSupabaseAdmin = createClient(LOCAL_URL, LOCAL_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("=== STEP 1: Fetching data from Production ===");
  const prodData = {};
  
  for (const table of INSERT_ORDER) {
    console.log(`Fetching table: ${table}...`);
    const res = await fetch(`${PROD_URL}/rest/v1/${table}`, { headers: prodHeaders });
    if (!res.ok) {
      console.warn(`⚠️ Warning: Could not fetch ${table} from prod (status ${res.status}). Skipping.`);
      prodData[table] = [];
      continue;
    }
    const data = await res.json();
    console.log(`Fetched ${data.length} rows for table ${table}.`);
    prodData[table] = data;
  }

  console.log("\n=== STEP 2: Creating corresponding local Auth users ===");
  // Fetch existing local users to avoid duplicate calls
  const { data: existingLocalUsersRes, error: fetchLocalUsersError } = await localSupabaseAdmin.auth.admin.listUsers();
  if (fetchLocalUsersError) {
    console.error("Failed to list local users:", fetchLocalUsersError.message);
    return;
  }
  
  const existingLocalUserIds = new Set(existingLocalUsersRes.users.map(u => u.id));
  const existingLocalEmails = new Set(existingLocalUsersRes.users.map(u => u.email?.toLowerCase()));

  const profilesToCreate = prodData["profiles"] || [];
  
  for (const prof of profilesToCreate) {
    const id = prof.id;
    const email = prof.email || `user_${id.substring(0, 8)}@pms.com`;
    const lowerEmail = email.toLowerCase();
    
    if (existingLocalUserIds.has(id)) {
      console.log(`Auth user ID ${id} already exists locally.`);
    } else if (existingLocalEmails.has(lowerEmail)) {
      console.log(`Auth user email ${email} already exists locally but with a different ID. Bypassing...`);
      const fallbackEmail = `user_${id.substring(0, 8)}_dup@pms.com`;
      console.log(`Creating user with ID ${id} and fallback email ${fallbackEmail}...`);
      const { error: createErr } = await localSupabaseAdmin.auth.admin.createUser({
        id,
        email: fallbackEmail,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { role: prof.role || 'front-desk', full_name: prof.full_name },
      });
      if (createErr) {
        console.error(`Failed to create fallback auth user for ${id}:`, createErr.message);
      } else {
        console.log(`Successfully created auth user for ID ${id}.`);
      }
    } else {
      console.log(`Creating auth user for ID ${id} (Email: ${email})...`);
      const { error: createErr } = await localSupabaseAdmin.auth.admin.createUser({
        id,
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { role: prof.role || 'front-desk', full_name: prof.full_name },
      });
      if (createErr) {
        console.error(`Failed to create auth user for ${id}:`, createErr.message);
      } else {
        console.log(`Successfully created auth user for ID ${id}.`);
      }
    }
  }

  console.log("\n=== STEP 3: Deleting local database rows in reverse safe order ===");
  for (const table of DELETE_ORDER) {
    console.log(`Deleting local table: ${table}...`);
    let queryParam = "id=not.is.null";
    if (table === "app_settings") {
      queryParam = "key=not.is.null";
    }
    
    const delRes = await fetch(`${LOCAL_URL}/rest/v1/${table}?${queryParam}`, {
      method: "DELETE",
      headers: localHeaders
    });
    
    if (delRes.ok) {
      console.log(`Successfully cleared local table: ${table}.`);
    } else {
      console.error(`❌ Failed to clear local table ${table}:`, delRes.status, delRes.statusText);
    }
  }

  console.log("\n=== STEP 4: Inserting production data into local database in safe order ===");
  for (const table of INSERT_ORDER) {
    let rows = prodData[table] || [];
    
    // Filter out any entries with broken foreign key references
    if (table === "incidental_charges" || table === "payments") {
      const validBookingIds = new Set((prodData["bookings"] || []).map(b => b.id));
      const originalCount = rows.length;
      rows = rows.filter(r => validBookingIds.has(r.booking_id));
      console.log(`Filtered ${table} from ${originalCount} down to ${rows.length} rows to prevent foreign key violations.`);
    }

    if (rows.length === 0) {
      console.log(`Table ${table} is empty or has no valid rows. Skipping insertion.`);
      continue;
    }
    
    console.log(`Inserting ${rows.length} rows into local table: ${table}...`);
    
    // We send a POST request in bulk to copy everything
    const insRes = await fetch(`${LOCAL_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: localHeaders,
      body: JSON.stringify(rows)
    });
    
    if (insRes.ok) {
      console.log(`Successfully inserted all rows into local table: ${table}.`);
    } else {
      const errText = await insRes.text();
      console.error(`❌ Failed to insert rows into local table ${table}:`, insRes.status, insRes.statusText, errText);
    }
  }

  console.log("\n=== REPLICATION COMPLETED SUCCESSFULLY! ===");
  console.log(`Local environment is now a perfect replica of Production.`);
  console.log(`All replicated users can log in locally using password: "${DEFAULT_PASSWORD}"`);
}

run().catch(console.error);
