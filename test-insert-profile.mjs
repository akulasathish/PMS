import { createClient } from '@supabase/supabase-js';
const supabase = createClient('http://127.0.0.1:54321', 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz');
async function test() {
  const { error } = await supabase.from('profiles').upsert({
    id: 'cd0086c9-27e8-4f91-b388-701c74a58681',
    email: 'provider@pms.com',
    full_name: 'Master Provider',
    role: 'admin',
    property_id: '11111111-1111-1111-1111-111111111111'
  });
  console.log("Upsert error:", error);
}
test();
