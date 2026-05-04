import { createClient } from '@supabase/supabase-js';

const url = "https://xjsuwjivetlmzzbngeuy.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqc3V3aml2ZXRsbXp6Ym5nZXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk5NTMyMCwiZXhwIjoyMDkxNTcxMzIwfQ.5OmiTjguX1CfwqgDNdeXFgPSWdFhH-hQ9VMoyIEJQUs";
const supabase = createClient(url, key);

async function checkN8nSetting() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'n8n_webhook_url')
    .single();

  if (error) {
    console.log("Error or Setting not found:", error.message);
  } else {
    console.log("Current n8n_webhook_url:", data.value);
  }
}

checkN8nSetting();
