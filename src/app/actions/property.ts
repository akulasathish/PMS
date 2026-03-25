'use server';

import { createClient } from '@supabase/supabase-js';
import { createClient as createSSRClient } from '@/lib/supabase/server';

// Revalidate path is needed to refresh the admin dashboard
import { revalidatePath } from 'next/cache';

// Initialize the Supabase admin client using the service role key to bypass RLS and use Auth Admin API
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
 * Register a new property and owner
 */
export async function registerProperty(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log("SERVER ACTION `registerProperty` CALLED");
  console.log("1. Authenticated User:", user?.id, "Role:", user?.user_metadata?.role);

  if (!user || user.user_metadata?.role !== 'admin') {
    console.log("-> FAILED: Unauthorized.");
    return { error: 'Unauthorized. Only admins can register properties.' };
  }

  const propertyName = formData.get('propertyName') as string;
  const ownerEmail = formData.get('ownerEmail') as string;
  // Let the user pick a tier or default to "Starter"
  const tier = (formData.get('tier') as string) || 'Starter';

  console.log("2. Form Data:", { propertyName, ownerEmail, tier });

  if (!propertyName || !ownerEmail) {
    console.log("-> FAILED: Missing fields.");
    return { error: 'Property Name and Owner Email are required.' };
  }

  // 1. Generate a dummy password (e.g. 8 random characters)
  const dummyPassword = Math.random().toString(36).slice(-8);

  // 2. Insert the Property
  console.log("3. Inserting Property...");
  const { data: propertyData, error: propertyError } = await supabaseAdmin
    .from('properties')
    .insert([{ name: propertyName, tier: tier }])
    .select()
    .single();

  if (propertyError || !propertyData) {
    console.error("-> FAILED to create property:", propertyError);
    return { error: 'Failed to create property in the database.' };
  }
  console.log("-> Property Inserted:", propertyData.id);

  // 3. Create the User via Supabase Admin Auth
  console.log("4. Creating Auth User...");
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: ownerEmail,
    password: dummyPassword,
    email_confirm: true,
    user_metadata: { 
      role: 'owner',
      requires_password_change: true 
    }
  });

  if (authError || !authData.user) {
    console.error("-> FAILED to create owner user:", authError);
    // Rollback property creation if user creation fails
    await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
    return { error: `Failed to create owner user: ${authError?.message}` };
  }
  console.log("-> Auth User Created:", authData.user.id);

  // 4. Create the Profile linking the Owner to the Property
  console.log("5. Creating Profile...");
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: authData.user.id,
      email: ownerEmail,
      role: 'owner',
      property_id: propertyData.id,
      full_name: 'Property Owner'
    }]);

  if (profileError) {
    console.error("-> FAILED to create owner profile:", profileError);
    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    await supabaseAdmin.from('properties').delete().eq('id', propertyData.id);
    return { error: 'Failed to link owner to property.' };
  }
  console.log("-> Profile Created!");

  // Revalidate the admin page so the new property shows up in the "Fleet Manager"
  revalidatePath('/admin');
  revalidatePath('/(tier1)/admin', 'page');
  
  console.log("-> SUCCESS: Property Registration Complete");
  
  return { 
    success: true, 
    dummyPassword,
    propertyId: propertyData.id
  };
}

/**
 * Toggle property status between Active and Suspended
 */
export async function togglePropertyStatus(propertyId: string, currentStatus: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.user_metadata?.role !== 'admin') {
    return { error: 'Unauthorized. Only admins can toggle property status.' };
  }

  const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';

  const { error } = await supabaseAdmin
    .from('properties')
    .update({ status: newStatus })
    .eq('id', propertyId);

  if (error) {
    console.error("Failed to toggle property status:", error);
    return { error: 'Failed to toggle property status.' };
  }

  revalidatePath('/admin');
  revalidatePath('/(tier1)/admin', 'page');
  
  return { success: true, newStatus };
}
