'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { logAction } from './audit';

/**
 * Start cleaning a room (Timer begins)
 */
export async function startCleaning(roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch room property_id for audit logging
  const { data: roomData } = await supabaseAdmin
    .from('rooms')
    .select('property_id, room_number')
    .eq('id', roomId)
    .single();

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ 
      status: 'Cleaning', 
      assigned_staff_id: user.id,
      cleaning_started_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) return { error: error.message };

  // Audit Log (Optimized with userId)
  if (roomData) {
    await logAction({
      propertyId: roomData.property_id,
      action: 'HOUSEKEEPING_STARTED',
      details: { roomNumber: roomData.room_number, roomId },
      userId: user.id
    });
  }

  // Note: revalidatePath removed. We rely on Supabase Realtime in the UI for instant updates.
  return { success: true };
}

/**
 * Finish cleaning a room (Move to Clean but not yet Inspected)
 */
export async function finishCleaning(roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch room info for audit
  const { data: roomData } = await supabaseAdmin
    .from('rooms')
    .select('property_id, room_number')
    .eq('id', roomId)
    .single();

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ 
      status: 'Clean', 
      last_cleaned_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) return { error: error.message };

  // Audit Log
  if (roomData) {
    await logAction({
      propertyId: roomData.property_id,
      action: 'HOUSEKEEPING_FINISHED',
      details: { roomNumber: roomData.room_number, roomId },
      userId: user.id
    });
  }

  return { success: true };
}

/**
 * Supervisor approval (Move to Available/Inspected)
 */
export async function inspectRoom(roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch room info for audit
  const { data: roomData } = await supabaseAdmin
    .from('rooms')
    .select('property_id, room_number')
    .eq('id', roomId)
    .single();

  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ 
      status: 'Available', 
      assigned_staff_id: null,
      cleaning_started_at: null
    })
    .eq('id', roomId);

  if (error) return { error: error.message };

  // Audit Log
  if (roomData) {
    await logAction({
      propertyId: roomData.property_id,
      action: 'HOUSEKEEPING_INSPECTED',
      details: { roomNumber: roomData.room_number, roomId },
      userId: user.id
    });
  }

  return { success: true };
}
