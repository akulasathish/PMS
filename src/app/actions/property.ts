'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// New type definition for Property
export interface Property {
  id: string;
  name: string;
  owner_user_id: string; // Link to auth.users.id
  status: string;
  created_at: string;
  updated_at: string;
  gst_number?: string;
  state_code?: string;
  address?: string; // Add address field
  city?: string;    // Add city field
  country?: string; // Add country field
}

/**
 * An authenticated user creates a new property.
 */
export async function createProperty(propertyData: {
  user_id: string;
  name: string;
  address: string;
  city: string;
  country: string;
}) {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log("SERVER ACTION `createProperty` CALLED");
    console.log("1. Authenticated User:", user?.id);

    if (!user || user.id !== propertyData.user_id) {
      console.log("-> FAILED: Unauthorized user ID mismatch.");
      return { success: false, error: 'Unauthorized. User ID mismatch.' };
    }

    if (!propertyData.name || !propertyData.address || !propertyData.city || !propertyData.country) {
      console.log("-> FAILED: Missing fields.");
      return { success: false, error: 'All property details are required.' };
    }

    // 1. Insert the Property
    console.log("2. Inserting Property...");
    const { data: newProperty, error: propertyError } = await supabase
      .from('properties')
      .insert([
        { 
          name: propertyData.name, 
          owner_user_id: user.id,
          status: 'Active',
          address: propertyData.address,
          city: propertyData.city,
          country: propertyData.country,
        }
      ])
      .select()
      .single();

    if (propertyError || !newProperty) {
      console.error("-> FAILED to create property:", propertyError);
      return { success: false, error: 'Failed to create property in the database.' };
    }
    console.log("-> Property Inserted:", newProperty.id);

    const { error: accessError } = await supabase
      .from('property_access')
      .insert({ user_id: user.id, property_id: newProperty.id });

    if (accessError) {
      console.error("-> FAILED to create property_access row:", accessError);
      return { success: false, error: 'Failed to link property access.' };
    }

    // Update the user's profile to link to this property as their current/default
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ property_id: newProperty.id })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error("-> FAILED to update user profile with property_id:", profileUpdateError);
      // Decide if you want to rollback property creation here. For now, we'll just log.
      return { success: false, error: 'Failed to link property to user profile.' };
    }
    console.log("-> User profile updated with new property_id.");

    revalidatePath('/dashboard'); // Revalidate the dashboard to show the new property
    
    console.log("-> SUCCESS: Property Creation Complete");
    
    return { 
      success: true, 
      data: newProperty
    };
  } catch (err: any) {
    console.error("Unhandled Server Crash in createProperty:", err);
    return { success: false, error: `Server Crash: ${err.message}` };
  }
}

/**
 * Toggle property status between Active and Suspended by its owner.
 */
export async function togglePropertyStatus(propertyId: string, currentStatus: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  // Verify the user is the owner of this property
  const { data: property, error: propertyCheckError } = await supabase
    .from('properties')
    .select('owner_user_id')
    .eq('id', propertyId)
    .single();

  if (propertyCheckError || !property || property.owner_user_id !== user.id) {
    return { success: false, error: 'Unauthorized or Property not found.' };
  }

  const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';

  const { error } = await supabase
    .from('properties')
    .update({ status: newStatus })
    .eq('id', propertyId);

  if (error) {
    console.error("Failed to toggle property status:", error);
    return { success: false, error: 'Failed to toggle property status.' };
  }

  revalidatePath('/dashboard');
  
  return { success: true, newStatus };
}

/**
 * Delete a property by its owner.
 * This should only delete the property and its dependent data (rooms, bookings etc.)
 * but NOT the user account itself.
 */
export async function deleteProperty(propertyId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log("SERVER ACTION `deleteProperty` CALLED for Property:", propertyId);

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  // Verify the user is the owner of this property
  const { data: property, error: propertyCheckError } = await supabase
    .from('properties')
    .select('owner_user_id')
    .eq('id', propertyId)
    .single();

  if (propertyCheckError || !property || property.owner_user_id !== user.id) {
    return { success: false, error: 'Unauthorized or Property not found.' };
  }

  // Delete the Property. Assuming RLS and CASCADE DELETE are configured in the DB
  // for dependent tables like rooms, bookings, etc.
  const { error: deletePropError } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId);

  if (deletePropError) {
    console.error("Failed to delete property:", deletePropError);
    return { success: false, error: 'Failed to delete property from the database.' };
  }

  // If the deleted property was the user's current property, reset their profile.property_id
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ property_id: null })
    .eq('id', user.id)
    .eq('property_id', propertyId); // Only update if it was the currently active one

  if (profileUpdateError) {
    console.error("Failed to clear property_id from user profile:", profileUpdateError);
  }

  revalidatePath('/dashboard');
  
  console.log("-> SUCCESS: Property Deleted");
  return { success: true };
}

export async function updatePropertyGST(propertyId: string, gstNumber: string, stateCode: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  // Verify the user is the owner of this property
  const { data: property, error: propertyCheckError } = await supabase
    .from('properties')
    .select('owner_user_id')
    .eq('id', propertyId)
    .single();

  if (propertyCheckError || !property || property.owner_user_id !== user.id) {
    return { success: false, error: 'Unauthorized or Property not found.' };
  }

  const { error } = await supabase
    .from('properties')
    .update({ gst_number: gstNumber, state_code: stateCode })
    .eq('id', propertyId);

  if (error) {
    console.error("Failed to update property GST:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
