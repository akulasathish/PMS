'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Provision a new Owner and assign them to properties
 */
export async function provisionOwner(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'admin') {
    return { error: 'Unauthorized. Only admins can provision owners.' };
  }

  const email = formData.get('email') as string;
  const fullName = formData.get('fullName') as string;
  const propertyIds = formData.getAll('propertyIds') as string[];

  if (!email || !fullName || propertyIds.length === 0) {
    return { error: 'Email, Full Name, and at least one Property are required.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Generate a temporary password
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  // 2. Create the Auth User
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { 
      role: 'owner',
      requires_password_change: true 
    }
  });

  if (authError || !authData.user) {
    console.error("Auth creation failed:", authError);
    return { error: `Failed to create auth user: ${authError?.message}` };
  }

  const newUserId = authData.user.id;

  // 3. Create the Profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: newUserId,
      email: email,
      full_name: fullName,
      role: 'owner'
    }]);

  if (profileError) {
    console.error("Profile creation failed:", profileError);
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return { error: 'Failed to create user profile.' };
  }

  // 4. Link to Properties via property_access
  const accessLinks = propertyIds.map(propId => ({
    user_id: newUserId,
    property_id: propId
  }));

  const { error: accessError } = await supabaseAdmin
    .from('property_access')
    .insert(accessLinks);

  if (accessError) {
    console.error("Property access links failed:", accessError);
    // Cleanup is tricky here since the user is created, but let's at least try
    await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return { error: 'Failed to assign properties to owner.' };
  }

  revalidatePath('/admin/owners');
  
  return { 
    success: true, 
    tempPassword,
    userId: newUserId
  };
}

/**
 * Fetch all owners and their assigned properties
 */
export async function getOwnersList() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      property_id,
      property_access (
        property_id,
        properties ( name )
      )
    `)
    .eq('role', 'owner');

  if (error) {
    console.error("Failed to fetch owners:", error);
    return [];
  }

  return (data || []).map(owner => {
    const assignedProps = (owner.property_access as unknown as { property_id: string; properties: { name: string } | null }[]) || [];
    return {
      ...owner,
      property_access: assignedProps
    };
  });
}

/**
 * Fetch all properties for the Admin dropdown
 */
export async function getAdminProperties() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .order('name');

  if (error) {
    console.error("Failed to fetch properties for dropdown:", error);
    throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
  }

  return data;
}
