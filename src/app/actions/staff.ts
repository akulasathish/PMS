"use server";

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Provisions a new staff member under the selected property.
 * Creates their auth account and inserts their profile with roles and permissions.
 */
export async function addStaff(staffData: {
  email: string;
  fullName: string;
  role: string;
  permissions: any;
  propertyId: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Create a secure random password for the staff member
    const tempPassword = 'StaffPass' + Math.random().toString(36).slice(-8) + '!';

    // 2. Create the Auth user using the admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: staffData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'staff' }
    });

    if (authError || !authData.user) {
      console.error('Error creating staff auth user:', authError);
      return { success: false, error: authError?.message || 'Failed to create auth user.' };
    }

    const newUserId = authData.user.id;

    // 3. Create the user profile row
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        email: staffData.email,
        full_name: staffData.fullName,
        role: staffData.role,
        permissions: staffData.permissions,
        property_id: staffData.propertyId
      });

    if (profileError) {
      console.error('Error creating staff profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return { success: false, error: `Profile creation failed: ${profileError.message}` };
    }

    // 4. Grant property access
    const { error: accessError } = await supabaseAdmin
      .from('property_access')
      .insert({
        user_id: newUserId,
        property_id: staffData.propertyId
      });

    if (accessError) {
      console.error('Error creating staff property access:', accessError);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return { success: false, error: `Property access link failed: ${accessError.message}` };
    }

    revalidatePath('/dashboard');
    return { success: true, tempPassword };
  } catch (err: any) {
    console.error('addStaff crash:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Retrieves the list of staff members assigned to the active property.
 */
export async function getStaff(propertyId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('property_id', propertyId)
      .neq('role', 'owner')
      .neq('role', 'admin');

    if (error) {
      console.error('Error fetching staff list:', error);
      return { success: false, error: error.message };
    }

    return { success: true, staff: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a staff account and revokes all access permissions.
 */
export async function revokeStaffAccess(staffUserId: string, propertyId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify property access exists
    const { data: access, error: accessCheckError } = await supabaseAdmin
      .from('property_access')
      .select('*')
      .eq('user_id', staffUserId)
      .eq('property_id', propertyId)
      .single();

    if (accessCheckError || !access) {
      return { success: false, error: 'Access permissions not found or unauthorized.' };
    }

    // Delete the Auth user (this will cascade delete profiles and property_access)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(staffUserId);

    if (deleteError) {
      console.error('Error deleting staff auth user:', deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('revokeStaffAccess crash:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
