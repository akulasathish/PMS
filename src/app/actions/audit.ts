'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';

interface LogActionParams {
  propertyId: string;
  action: string;
  details?: any;
  severity?: 'info' | 'warning' | 'critical';
}

/**
 * Global helper to record operational audit logs
 */
export async function logAction({ propertyId, action, details = {}, severity = 'info' }: LogActionParams) {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    // We use the Admin client to ensure logs are written even if user permissions are tight,
    // but we still record the user_id of the person who performed the action.
    const supabaseAdmin = getSupabaseAdmin();
    
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{
        property_id: propertyId,
        user_id: user?.id || null,
        action,
        details,
        severity
      }]);

    if (error) {
      console.error('Audit Log Error:', error.message);
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Audit Log Exception:', err);
    return { error: 'Failed to record audit log' };
  }
}
