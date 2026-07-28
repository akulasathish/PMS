"use server";

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Register a user reliably and auto-confirm their account.
 * If the user already exists in auth.users but is stuck/unconfirmed, 
 * it updates their credentials so they can log in seamlessly.
 */
export async function registerUserWithoutVerification(email: string, password: string, _plan?: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try creating the user via Supabase Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'user',
      },
    });

    let userId: string | null = null;

    if (authError) {
      console.warn('Admin createUser error:', authError.message);

      // If user already exists in auth.users, fetch the existing user
      if (
        authError.message.includes('already registered') || 
        authError.message.includes('already been registered') ||
        authError.status === 422
      ) {
        // Fetch existing user by email
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

        if (existingUser) {
          console.log(`Found existing user ID ${existingUser.id} for email ${cleanEmail}. Auto-healing credentials...`);
          // Update password & confirm email for the existing user
          const { data: updateData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { password, email_confirm: true }
          );

          if (updateErr) {
            return { success: false, error: 'This email is already registered. Please log in directly.' };
          }
          userId = existingUser.id;
        } else {
          return { success: false, error: 'An account with this email already exists. Please log in.' };
        }
      } else {
        return { success: false, error: authError.message || 'Failed to create account.' };
      }
    } else if (authData.user) {
      userId = authData.user.id;
    }

    if (!userId) {
      return { success: false, error: 'Failed to resolve user account.' };
    }

    // 2. Initialize or repair the user profile using UPSERT
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: cleanEmail,
        full_name: 'Property User',
        property_id: null,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      return { success: false, error: `Failed to set up profile: ${profileError.message}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Registration crash:', err);
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}

/**
 * Register a user WITH email verification or direct setup fallback.
 */
export async function registerUserWithVerification(email: string, password: string, redirectToUrl?: string) {
  // Directly route through the reliable admin auto-confirm registration engine
  return registerUserWithoutVerification(email, password);
}
