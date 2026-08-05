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
  property_category?: 'PG' | 'Hotel/PG';
  total_capital_investment?: number;
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

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Insert the Property
    console.log("2. Inserting Property...");
    let newProperty: any = null;
    let propertyError: any = null;

    const res = await supabaseAdmin
      .from('properties')
      .insert([
        { 
          name: propertyData.name, 
          address: propertyData.address,
          city: propertyData.city,
          country: propertyData.country,
          property_category: propertyData.property_category || 'Hotel/PG',
          total_capital_investment: propertyData.total_capital_investment || 0,
        }
      ])
      .select()
      .single();

    newProperty = res.data;
    propertyError = res.error;

    // Fallback if RLS or column error occurred
    if (propertyError && (propertyError.message?.includes('row-level security') || propertyError.code === '42501')) {
      console.warn("SupabaseAdmin RLS warning, attempting authenticated SSR client fallback...");
      const userRes = await supabase
        .from('properties')
        .insert([
          { 
            name: propertyData.name, 
            address: propertyData.address,
            city: propertyData.city,
            country: propertyData.country,
            property_category: propertyData.property_category || 'Hotel/PG',
            total_capital_investment: propertyData.total_capital_investment || 0,
          }
        ])
        .select()
        .single();

      if (userRes.data) {
        newProperty = userRes.data;
        propertyError = null;
      } else {
        propertyError = userRes.error;
      }
    }

    if (propertyError || !newProperty) {
      console.error("-> FAILED to create property:", propertyError);
      return { success: false, error: propertyError?.message || 'Failed to create property in the database.' };
    }
    console.log("-> Property Inserted:", newProperty.id);

    const { error: accessError } = await supabaseAdmin
      .from('property_access')
      .insert({ user_id: user.id, property_id: newProperty.id });

    if (accessError) {
      console.error("-> FAILED to create property_access row:", accessError);
      return { success: false, error: 'Failed to link property access.' };
    }

    // Update or upsert the user's profile to link to this property as their current/default
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: user.id, 
        email: user.email || '',
        property_id: newProperty.id 
      }, { onConflict: 'id' });

    if (profileUpdateError) {
      console.error("-> FAILED to update user profile with property_id:", profileUpdateError);
      return { success: false, error: 'Failed to link property to user profile.' };
    }
    console.log("-> User profile updated with new property_id:", newProperty.id);

    revalidatePath('/dashboard');
    
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

  const supabaseAdmin = getSupabaseAdmin();
  const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';

  const { error } = await supabaseAdmin
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
 */
export async function deleteProperty(propertyId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log("SERVER ACTION `deleteProperty` CALLED for Property:", propertyId);

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { error: deletePropError } = await supabaseAdmin
    .from('properties')
    .delete()
    .eq('id', propertyId);

  if (deletePropError) {
    console.error("Failed to delete property:", deletePropError);
    return { success: false, error: 'Failed to delete property from the database.' };
  }

  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({ property_id: null })
    .eq('id', user.id)
    .eq('property_id', propertyId);

  if (profileUpdateError) {
    console.error("Failed to clear property_id from user profile:", profileUpdateError);
  }

  revalidatePath('/dashboard');
  
  console.log("-> SUCCESS: Property Deleted");
  return { success: true };
}

export async function updatePropertyGST(propertyId: string, gstNumber: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  let { error } = await supabaseAdmin
    .from('properties')
    .update({ gstin: gstNumber })
    .eq('id', propertyId);

  if (error && (error.message.includes("gstin") || error.message.includes("schema cache"))) {
    const fallbackRes = await supabaseAdmin
      .from('properties')
      .update({ gst_number: gstNumber })
      .eq('id', propertyId);
    error = fallbackRes.error;
  }

  if (error) {
    console.error("Failed to update property GST:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateProperty(propertyId: string, propertyData: {
  name: string;
  address: string;
  city: string;
  country: string;
  gst_number?: string;
  gstin?: string;
  state_code?: string;
  property_category?: 'PG' | 'Hotel/PG';
}) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const gstVal = propertyData.gst_number || propertyData.gstin || null;

  let { error } = await supabaseAdmin
    .from('properties')
    .update({
      name: propertyData.name,
      address: propertyData.address,
      city: propertyData.city,
      country: propertyData.country,
      gstin: gstVal,
      property_category: propertyData.property_category || 'Hotel/PG',
    })
    .eq('id', propertyId);

  if (error && (error.message.includes("gstin") || error.message.includes("schema cache"))) {
    const fallbackRes = await supabaseAdmin
      .from('properties')
      .update({
        name: propertyData.name,
        address: propertyData.address,
        city: propertyData.city,
        country: propertyData.country,
        gst_number: gstVal,
        property_category: propertyData.property_category || 'Hotel/PG',
      })
      .eq('id', propertyId);
    error = fallbackRes.error;
  }

  if (error) {
    console.error("Failed to update property:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Save or update custom partner capital investments and recalculate percentage shares
 */
export async function savePartnerInvestments(
  propertyId: string, 
  totalCapital: number, 
  partners: { partner_name: string; investment_amount: number; partner_phone?: string }[]
) {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Update Property Total Capital Investment
    const { error: propErr } = await supabaseAdmin
      .from('properties')
      .update({ total_capital_investment: totalCapital })
      .eq('id', propertyId);

    if (propErr) {
      console.error('Failed to update total property capital:', propErr);
      return { success: false, error: propErr.message };
    }

    // 2. Clear existing partner shares if custom partners are supplied
    if (partners && partners.length > 0) {
      await supabaseAdmin
        .from('partner_investments')
        .delete()
        .eq('property_id', propertyId);

      // Insert new partners with dynamic percentage calculation
      const payload = partners.map(p => {
        const amt = Number(p.investment_amount) || 0;
        const sharePct = totalCapital > 0 && amt > 0 ? Math.round((amt / totalCapital) * 10000) / 100 : 0;
        return {
          property_id: propertyId,
          partner_name: p.partner_name,
          investment_amount: amt,
          share_percentage: sharePct,
          partner_phone: p.partner_phone || null
        };
      });

      const { error: insertErr } = await supabaseAdmin
        .from('partner_investments')
        .insert(payload);

      if (insertErr) {
        console.error('Failed to insert partner investments:', insertErr);
        return { success: false, error: insertErr.message };
      }
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving partner investments:', err);
    return { success: false, error: err.message };
  }
}


