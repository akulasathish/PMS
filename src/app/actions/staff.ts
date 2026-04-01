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
export async function getRoleTemplates(propertyId: string | null) {
  let query = supabaseAdmin.from('role_templates').select('*');
  
  if (propertyId) {
    query = query.or(`property_id.is.null,property_id.eq.${propertyId}`);
  } else {
    query = query.is('property_id', null);
  }
  
  const { data, error } = await query.order('name');
  if (error) {
    console.error("Failed to fetch role templates:", error);
    return [];
  }
  return data;
}

export async function addStaff(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("SERVER ACTION `addStaff` CALLED");
  console.log("1. Authenticated User:", user?.id, "Role:", user?.user_metadata?.role);

  if (!user || user.user_metadata?.role !== 'owner') {
    return { error: 'Unauthorized. Only owners can add staff.' };
  }

  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const propertyId = formData.get('propertyId') as string;
  const permissionsStr = formData.get('permissions') as string;

  console.log("2. Form Data:", { email, role, propertyId, permissionsStr });

  if (!email || !role || !propertyId) {
    return { error: 'Email, Role, and Property ID are required.' };
  }

  // Parse custom permissions if provided, else rely on defaults
  let permissions = null;
  if (permissionsStr) {
    try {
      permissions = JSON.parse(permissionsStr);
    } catch (e) {
      console.warn("Invalid permissions JSON provided, ignoring.", e);
    }
  }

  const dummyPassword = generateDummyPassword();
  console.log("3. Creating staff user via Admin API...");

  // 1. Create the user in Supabase Auth via Admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: dummyPassword,
    email_confirm: true,
    user_metadata: {
      role: role,
      requires_password_change: true
    }
  });

  if (authError || !authData.user) {
    console.error("-> FAILED to create auth user:", authError);
    return { error: `Auth Error: ${authError?.message || 'Unknown error'}` };
  }
  console.log("-> Staff User Created:", authData.user.id);

  console.log("4. Linking staff profile to property...");
  
  // 2. Prepare Profile Data
  const profileData: any = {
    id: authData.user.id,
    email: email,
    role: role,
    property_id: propertyId
  };
  
  if (permissions) {
    profileData.permissions = permissions;
  }

  // 3. Insert into public.profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([profileData]);

  if (profileError) {
    // Rollback auth user creation if profile fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.error("-> FAILED to insert profile:", profileError);
    return { error: `Profile Error: ${profileError.message}` };
  }
  
  console.log("-> SUCCESS: Staff Provisioning Complete");

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
