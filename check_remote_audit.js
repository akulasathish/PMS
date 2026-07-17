const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://njblemtrkqdnijwrnvjp.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYmxlbXRya3Fkbmlqd3JudmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUyNTM4OCwiZXhwIjoyMDk1MTAxMzg4fQ.xSZmJdnzFvTjpCIwjuRHV_ABBYGvwGKe0cWutgPupSg";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRemote() {
  try {
    console.log("Fetching active business date...");
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'business_date')
      .single();
    
    if (settingsError) {
      console.error("Error fetching business_date:", settingsError);
    } else {
      console.log("Current Remote Business Date:", settings.value);
    }

    console.log("\nFetching last 15 audit logs...");
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (logsError) {
      console.error("Error fetching audit logs:", logsError);
    } else {
      logs.forEach(l => {
        console.log(`[${l.created_at}] Action: ${l.action} | Details:`, JSON.stringify(l.details));
      });
    }

    console.log("\nChecking for future or recent incidental room charges...");
    const { data: charges, error: chargesError } = await supabase
      .from('incidental_charges')
      .select('id, booking_id, amount, description, business_date, created_at')
      .filter('description', 'ilike', 'Daily Room Charge%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (chargesError) {
      console.error("Error fetching incidental_charges:", chargesError);
    } else {
      charges.forEach(c => {
        console.log(`[${c.created_at}] Date: ${c.business_date} | Amt: ${c.amount} | Desc: ${c.description}`);
      });
    }

  } catch (e) {
    console.error("Execution error:", e);
  }
}

checkRemote();
