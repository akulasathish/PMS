const { createClient } = require('@supabase/supabase-js');

const PROD_URL = "https://njblemtrkqdnijwrnvjp.supabase.co";
const PROD_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYmxlbXRya3Fkbmlqd3JudmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUyNTM4OCwiZXhwIjoyMDk1MTAxMzg4fQ.xSZmJdnzFvTjpCIwjuRHV_ABBYGvwGKe0cWutgPupSg";

const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const USERS_TO_DELETE = [
  { id: "d95b34c1-b3b3-4bd3-924b-a422a5ce4ec5", email: "provider@pms.com" },
  { id: "b4531308-a270-4a3b-8ba7-0975031a99a3", email: "test@gmail.com" }
];

async function deleteFromInstance(url, key, isLocal) {
  console.log(`\n=== Processing deletion for: ${isLocal ? "LOCAL" : "PRODUCTION"} ===`);
  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  for (const user of USERS_TO_DELETE) {
    console.log(`\nRemoving user: ${user.email} (ID: ${user.id})...`);

    // 1. Delete from property_access
    console.log(`- Deleting from property_access...`);
    const { error: accessErr } = await supabase
      .from('property_access')
      .delete()
      .eq('profile_id', user.id);
    if (accessErr) console.error(`⚠️ Failed to delete property_access:`, accessErr.message);

    // 2. Delete from audit_logs
    console.log(`- Deleting from audit_logs...`);
    const { error: auditErr } = await supabase
      .from('audit_logs')
      .delete()
      .eq('user_id', user.id);
    if (auditErr) console.error(`⚠️ Failed to delete audit_logs:`, auditErr.message);

    // 3. Delete from profiles
    console.log(`- Deleting from profiles...`);
    const { error: profileErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    if (profileErr) console.error(`⚠️ Failed to delete profile:`, profileErr.message);

    // 4. Delete from Auth.Users
    console.log(`- Deleting from auth.users...`);
    const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
    if (authErr) {
      console.error(`⚠️ Failed to delete auth user:`, authErr.message);
    } else {
      console.log(`✓ Successfully deleted auth user ${user.email}`);
    }
  }
}

async function run() {
  // Delete from LOCAL
  await deleteFromInstance(LOCAL_URL, LOCAL_SERVICE_KEY, true);

  // Delete from PRODUCTION
  await deleteFromInstance(PROD_URL, PROD_SERVICE_KEY, false);

  console.log("\n=== DELETION COMPLETED SUCCESSFULLY! ===");
}

run().catch(console.error);
