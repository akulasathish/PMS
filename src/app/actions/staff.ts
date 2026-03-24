'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Initialize Supabase admin client to bypass RLS
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
 * Generate a random 8-character dummy password
 */
function generateDummyPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

/**
 * Provision a new staff account
 */
export async function addStaff(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'owner') {
    return { error: 'Unauthorized. Only owners can add staff.' };
  }

  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const propertyId = formData.get('propertyId') as string;

  if (!email || !role || !propertyId) {
    return { error: 'Email, Role, and Property ID are required.' };
  }

  const dummyPassword = generateDummyPassword();

  // 1. Create the user in Supabase Auth via Admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: dummyPassword,
    email_confirm: true,
    user_metadata: {
      role: 'staff',
      requires_password_change: true
    }
  });

  if (authError || !authData.user) {
    console.error("Failed to create auth user:", authError);
    return { error: `Auth Error: ${authError?.message || 'Unknown error'}` };
  }

  // 2. Insert into public.profiles to link them to the property and set their role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: authData.user.id,
      email: email,
      role: 'staff',
      property_id: propertyId
    }]);

  if (profileError) {
    // Rollback auth user creation if profile fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.error("Failed to insert profile:", profileError);
    return { error: `Profile Error: ${profileError.message}` };
  }

  // Revalidate the tier 2 dashboard so new staff might appear natively
  revalidatePath('/(tier2)/dashboard', 'page');

  return { 
    success: true, 
    credentials: {
      email,
      password: dummyPassword
    }
  };
}
