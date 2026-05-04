'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Self-service onboarding for new property owners
 */
export async function selfServiceOnboarding(formData: FormData) {
  const propertyName = formData.get('propertyName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const plan = formData.get('plan') as string || 'Starter';

  if (!propertyName || !email || !password) {
    return { error: 'All fields are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Create the Property
    let dbTier = 'Starter';
    if (plan === 'professional') dbTier = 'Pro';
    if (plan === 'enterprise') dbTier = 'Enterprise';

    const { data: property, error: propError } = await supabaseAdmin
      .from('properties')
      .insert({
        name: propertyName,
        status: 'Active',
        tier: dbTier
      })
      .select('id')
      .single();

    if (propError || !property) {
      console.error("Onboarding Error (Property):", propError);
      return { error: 'Failed to provision property instance.' };
    }

    // 2. Create the User via Admin API (to set role immediately and bypass email confirmation for demo)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'owner' }
    });

    if (authError || !authData.user) {
      console.error("Onboarding Error (Auth):", authError);
      // Rollback property
      await supabaseAdmin.from('properties').delete().eq('id', property.id);
      return { error: authError?.message || 'Failed to create owner account.' };
    }

    // 3. Link Owner to Property
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: 'Property Owner',
        role: 'owner',
        property_id: property.id
      });

    if (profileError) {
      console.error("Onboarding Error (Profile):", profileError);
      // Rollback everything
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('properties').delete().eq('id', property.id);
      return { error: 'Failed to finalize account setup.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Onboarding Crash:", err);
    return { error: `System Error: ${err.message}` };
  }
}
