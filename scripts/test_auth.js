const { createClient } = require('@supabase/supabase-js');

const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function run() {
  console.log("Initializing Supabase Client...");
  const localSupabaseAdmin = createClient(LOCAL_URL, LOCAL_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Listing users...");
  try {
    const res = await localSupabaseAdmin.auth.admin.listUsers();
    console.log("Result error:", res.error);
    console.log("Full Result keys:", Object.keys(res));
    console.log("Full Result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Caught error:", err);
  }
}

run();
