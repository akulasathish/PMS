"use server";

import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Register a user and automatically confirm their email, returning success.
 * Bypasses email confirmation in local/demo environment.
 */
export async function registerUserWithoutVerification(email: string, password: string, _plan?: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'user',
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating user via admin API:', authError);
      return { success: false, error: authError?.message || 'Failed to create account.' };
    }

    const userId = authData.user.id;

    // 2. Initialize the standard user profile without any roles/permissions
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: 'Property User',
        property_id: null,
      });

    if (profileError) {
      console.error('Error inserting profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, error: 'Failed to initialize user profile.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Registration crash:', err);
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}
