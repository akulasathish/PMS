"use server";

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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
      return { success: false, error: `Failed to initialize user profile: ${profileError.message} (Details: ${profileError.details || 'none'})` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Registration crash:', err);
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}

/**
 * Register a user WITH email verification using the standard signUp flow.
 * Sends a confirmation email to the user's email address.
 */
export async function registerUserWithVerification(email: string, password: string, redirectToUrl?: string) {
  try {
    const supabase = await createClient();

    // 1. Sign up the user using regular Supabase client
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectToUrl || undefined,
        data: {
          role: 'user',
        }
      }
    });

    if (authError || !authData.user) {
      console.error('Error in signUp flow:', authError);
      return { success: false, error: authError?.message || 'Failed to register account.' };
    }

    const userId = authData.user.id;

    // 2. Initialize the standard user profile using the Admin Client
    // We use the Admin Client because the user is not yet logged in or fully authenticated,
    // so standard client lacks permissions to insert directly.
    const supabaseAdmin = getSupabaseAdmin();
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: 'Property User',
        property_id: null,
      });

    if (profileError) {
      console.error('Error inserting profile under verification:', profileError);
      // Delete the unconfirmed user to allow retrying signup with same email
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, error: `Failed to initialize user profile: ${profileError.message} (Details: ${profileError.details || 'none'})` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Registration with verification crash:', err);
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}
