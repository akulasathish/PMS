'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';

interface LogActionParams {
  propertyId: string;
  action: string;
  details?: any;
  severity?: 'info' | 'warning' | 'critical';
  userId?: string; // Add optional userId
}

/**
 * Global helper to record operational audit logs
 */
export async function logAction({ propertyId, action, details = {}, severity = 'info', userId }: LogActionParams) {
  try {
    let finalUserId = userId;
    
    // Only perform auth check if userId was not provided
    if (!finalUserId) {
      const supabase = createSSRClient();
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id;
    }

    // We use the Admin client to ensure logs are written even if user permissions are tight
    const supabaseAdmin = getSupabaseAdmin();
    
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{
        property_id: propertyId,
        user_id: finalUserId || null,
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

/**
 * Fetch the recent audit/activity logs for a given property
 */
export async function getAuditLogs(propertyId: string, limit = 50) {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized.' };
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        created_at,
        action,
        details,
        severity,
        user_id,
        profiles (
          full_name,
          email
        )
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch audit logs:', error.message);
      return { error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('getAuditLogs Exception:', err);
    return { error: 'Failed to fetch audit logs.' };
  }
}
