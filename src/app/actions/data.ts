"use server";

import { createClient } from '@/lib/supabase/server';

/**
 * Exports user data for a specific property.
 * This function should ensure RLS is properly enforced by Supabase.
 * In a real application, you might want more granular control over what data is exported
 * and in what format (e.g., CSV, JSON for specific tables).
 */
export async function exportUserData(userId: string, propertyId: string) {
  const supabase = createClient();

  // Verify the user is authenticated and authorized to access this property's data
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { success: false, error: 'Unauthorized access.' };
  }

  try {
    // Fetch property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('owner_user_id', userId) // Ensure user owns the property
      .single();

    if (propertyError || !property) {
      console.error(`Error fetching property ${propertyId} for user ${userId}:`, propertyError);
      return { success: false, error: 'Property not found or unauthorized.' };
    }

    // Fetch rooms for the property
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', propertyId);

    if (roomsError) {
      console.error(`Error fetching rooms for property ${propertyId}:`, roomsError);
      return { success: false, error: 'Failed to fetch rooms.' };
    }

    // Fetch bookings for the property
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId);

    if (bookingsError) {
      console.error(`Error fetching bookings for property ${propertyId}:`, bookingsError);
      return { success: false, error: 'Failed to fetch bookings.' };
    }

    // You can fetch other related data (e.g., staff, guests, invoices) here as needed.

    const exportedData = {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        // Add other relevant user profile data if necessary
      },
      property: property,
      rooms: rooms,
      bookings: bookings,
      // Add other fetched data here
    };

    return { success: true, data: exportedData };

  } catch (error: any) {
    console.error('An unexpected error occurred during data export:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}
