'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Start cleaning a room (Timer begins)
 */
export async function startCleaning(roomId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ 
      status: 'Cleaning', 
      assigned_staff_id: user.id,
      cleaning_started_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/housekeeping');
  revalidatePath('/dashboard/front-office');
  return { success: true };
}

/**
 * Finish cleaning a room (Move to Clean but not yet Inspected)
 */
export async function finishCleaning(roomId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ 
      status: 'Clean', 
      last_cleaned_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/housekeeping');
  return { success: true };
}

/**
 * Supervisor approval (Move to Available/Inspected)
 */
export async function inspectRoom(roomId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ 
      status: 'Available', // In our system, Available means clean + inspected
      assigned_staff_id: null,
      cleaning_started_at: null
    })
    .eq('id', roomId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/housekeeping');
  revalidatePath('/dashboard/front-office');
  return { success: true };
}
