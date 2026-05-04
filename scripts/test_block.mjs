import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  await supabase.auth.signInWithPassword({ email: 'provider@pms.com', password: '8686113435' });
  
  // Get Room 101 ID
  const { data: room } = await supabase.from('rooms').select('id, property_id').eq('room_number', '101').limit(1).single();
  console.log("Room 101:", room);

  if (!room) return;

  // Try to insert a block
  const { data, error } = await supabase.from('room_blocks').insert([{
    property_id: room.property_id,
    room_id: room.id,
    block_type: 'OOO',
    start_date: '2026-04-24',
    end_date: '2026-04-26',
    reason: 'Testing Script'
  }]).select();

  console.log("Insert Result:", data, "Error:", error);
}
test();
