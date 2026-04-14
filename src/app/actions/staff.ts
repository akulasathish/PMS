'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
  const supabaseAdmin = getSupabaseAdmin();
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

export async function saveRoleTemplate(propertyId: string, name: string, permissions: Record<string, Record<string, string>>) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'owner' && user.user_metadata?.role !== 'admin') {
    return { error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from('role_templates').insert([{
    property_id: propertyId,
    name,
    permissions
  }]);

  if (error) {
    console.error("Failed to save role template:", error);
    return { error: "Failed to save template to the database." };
  }
  
  return { success: true };
}

/**
 * Permanently revoke a staff member's access (Delete Account)
 */
export async function revokeStaffAccess(staffId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Only Owners or Admins can perform lifecycle deletions
  if (!user || (user.user_metadata?.role !== 'owner' && user.user_metadata?.role !== 'admin')) {
    return { error: 'Unauthorized. Only executives can revoke staff access.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Verify the target is actually a staff member (prevent deleting other owners/admins)
  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', staffId)
    .single();

  const operationalRoles = ['staff', 'front-desk', 'Guest Journey', 'Night Auditor', 'Room Attendant', 'Supervisor'];
  
  if (!targetProfile || !operationalRoles.includes(targetProfile.role)) {
    return { error: 'Invalid operation. Can only revoke operational staff accounts.' };
  }

  // 2. Delete the user from Supabase Auth (Cascades to profiles and property_access)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(staffId);

  if (error) {
    console.error("Failed to revoke staff access:", error);
    return { error: "Database rejected the deletion request." };
  }
  
  return { success: true };
}

/**
 * Update granular permissions for a staff member
 */
export async function updateStaffPermissions(staffId: string, permissions: Record<string, Record<string, string>>) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (user.user_metadata?.role !== 'owner' && user.user_metadata?.role !== 'admin')) {
    return { error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ permissions })
    .eq('id', staffId);

  if (error) {
    console.error("Failed to update staff permissions:", error);
    return { error: "Failed to update permissions in the database." };
  }

  revalidatePath('/dashboard/staff');
  return { success: true };
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
  const rawRole = formData.get('role') as string;
  const propertyId = formData.get('propertyId') as string;
  const permissionsStr = formData.get('permissions') as string;

  // We enforce 'staff' as the base role for the database constraint. 
  // Their actual power is derived from the permissions JSON, not this string.
  const safeDatabaseRole = 'staff';

  console.log("2. Form Data:", { email, rawRole, propertyId, permissionsStr });

  if (!email || !propertyId) {
    return { error: 'Email and Property ID are required.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

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

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: dummyPassword,
    email_confirm: true,
    user_metadata: {
      role: safeDatabaseRole,
      title: rawRole, // We save their "Template Name" (e.g. Night Auditor) as a display title
      requires_password_change: true
    }
  });

  if (authError || !authData.user) {
    console.error("-> FAILED to create auth user:", authError);
    return { error: `Auth Error: ${authError?.message || 'Unknown error'}` };
  }
  console.log("-> Staff User Created:", authData.user.id);

  console.log("4. Linking staff profile to property...");
  
  const profileData: {
    id: string;
    email: string;
    role: string;
    property_id: string;
    permissions?: Record<string, Record<string, string>>;
  } = {
    id: authData.user.id,
    email: email,
    role: safeDatabaseRole,
    property_id: propertyId
  };
  
  if (permissions) {
    profileData.permissions = permissions;
  }

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
