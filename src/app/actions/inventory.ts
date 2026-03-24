'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Initialize Supabase admin client to bypass RLS if needed, or normal client.
// Since server actions run on the server, we use the service role key to insert.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Add a new room to a property
 */
export async function addRoom(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'owner') {
    return { error: 'Unauthorized. Only owners can add rooms.' };
  }

  const propertyId = formData.get('propertyId') as string;
  const roomNumber = formData.get('number') as string;
  const roomType = formData.get('type') as string;
  const status = 'Available'; // Standard PMS terminology for a clean, empty room

  console.log("SERVER ACTION `addRoom` CALLED:", { propertyId, roomNumber, roomType });

  if (!propertyId || !roomNumber || !roomType) {
    return { error: 'Property ID, Room Number, and Room Type are required.' };
  }

  // Insert the room
  const { error } = await supabaseAdmin
    .from('rooms')
    .insert([{
      property_id: propertyId,
      room_number: roomNumber,
      type: roomType,
      status: status
    }]);

  if (error) {
    console.error("Failed to add room:", error);
    return { error: `Failed to add room: ${error.message}` };
  }

  // Revalidate the inventory path to reflect the new room
  revalidatePath('/(tier2)/dashboard/inventory', 'page');
  
  return { success: true };
}
