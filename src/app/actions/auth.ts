"use server";

import { createClient as createSupabaseDirect } from '@supabase/supabase-js';

function getAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key').trim();

  return createSupabaseDirect(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Register a user reliably via Supabase Admin API to bypass public IP rate limits
 * and auto-confirm the account instantly.
 */
export async function registerUserWithoutVerification(email: string, password: string, _plan?: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    console.log('LOG: Server action SUPABASE_SERVICE_ROLE_KEY length:', serviceKey.length, 'preview:', serviceKey.substring(0, 15) + '...' + serviceKey.substring(serviceKey.length - 10));

    const admin = getAdminClient();

    // 1. Create user via Admin API (bypasses rate limits & email verification)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'user' },
    });

    let userId: string | null = null;

    if (!authError && authData?.user) {
      userId = authData.user.id;
    } else if (authError) {
      console.warn('Admin createUser message:', authError.message);

      // If user already registered or exists, auto-heal credentials & confirm
      if (
        authError.message.includes('already registered') || 
        authError.message.includes('already been registered') ||
        authError.status === 422
      ) {
        const { data: usersData } = await admin.auth.admin.listUsers();
        const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (existingUser) {
          userId = existingUser.id;
          await admin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
        } else {
          return { success: false, error: 'An account with this email already exists. Please log in.' };
        }
      } else {
        return { success: false, error: authError.message || 'Failed to create account.' };
      }
    }

    if (!userId) {
      return { success: false, error: 'Could not resolve user account creation.' };
    }

    // 2. Upsert user profile
    try {
      await admin.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        full_name: 'Property User',
        property_id: null,
      }, { onConflict: 'id' });
    } catch (profileErr) {
      console.warn('Profile upsert warning:', profileErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Registration error:', err);
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}

export async function sendSignupOTP(email: string, password: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const admin = getAdminClient();

    // 1. Create user in unconfirmed state so OTP verification is required
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: false,
      user_metadata: { role: 'user' },
    });

    let userId: string | null = authData?.user?.id || null;

    if (authError) {
      console.warn('Admin createUser OTP message:', authError.message);

      if (
        authError.message.includes('already registered') || 
        authError.message.includes('already been registered') ||
        authError.status === 422
      ) {
        return { success: false, error: 'An account with this email already exists. Please log in.' };
      } else {
        return { success: false, error: authError.message || 'Failed to create account.' };
      }
    }

    // 2. Ensure profile exists
    if (userId) {
      try {
        await admin.from('profiles').upsert({
          id: userId,
          email: cleanEmail,
          full_name: 'Property User',
          property_id: null,
        }, { onConflict: 'id' });
      } catch (pErr) {
        console.warn('Profile upsert warning:', pErr);
      }
    }

    // 3. Dispatch 6-digit OTP code to user's email via Supabase Auth API
    const { error: resendErr } = await admin.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });

    if (resendErr) {
      console.warn("Resend OTP warning:", resendErr.message);
    }

    return { success: true, userId };
  } catch (err: any) {
    console.error('sendSignupOTP error:', err);
    return { success: false, error: err.message || 'An unexpected server error occurred.' };
  }
}

export async function registerUserWithVerification(email: string, password: string, _redirectToUrl?: string) {
  return sendSignupOTP(email, password);
}
