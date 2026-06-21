'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';
import { calculateEarlyCheckinFee, calculateLateCheckoutFee } from '@/lib/billing-rules';

export async function postIncidentalCharge(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  // Parse required fields
  const bookingId = formData.get('bookingId') as string;
  const propertyId = formData.get('propertyId') as string;
  const amountStr = formData.get('amount') as string;
  const description = formData.get('description') as string;

  if (!bookingId || !propertyId || !amountStr || !description) {
    return { error: 'Missing required fields.' };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Invalid amount. Must be greater than 0.' };
  }

  const supabaseAdmin = getSupabaseAdmin();
  
  // Insert the charge securely
  const { data, error } = await supabaseAdmin
    .from('incidental_charges')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount,
      description,
      created_by: user.id
    }])
    .select('id')
    .single();

  if (error) {
    console.error("Folio Error:", error.message);
    return { error: `Failed to post charge: ${error.message}` };
  }

  // Audit the action
  await logAction({
    propertyId,
    action: 'INCIDENTAL_CHARGE_POSTED',
    details: { bookingId, amount, description, chargeId: data.id },
    userId: user.id
  });

  // Force UI updates across dashboards
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/housekeeping');
  
  return { success: true, chargeId: data.id };
}

export async function postPayment(formData: FormData) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  // Parse required fields
  const bookingId = formData.get('bookingId') as string;
  const propertyId = formData.get('propertyId') as string;
  const amountStr = formData.get('amount') as string;
  const method = formData.get('method') as string;
  const transactionId = formData.get('transactionId') as string | null;

  if (!bookingId || !propertyId || !amountStr || !method) {
    return { error: 'Missing required fields.' };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Invalid amount. Must be greater than 0.' };
  }

  const supabaseAdmin = getSupabaseAdmin();
  
  // Insert the payment securely
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount,
      method,
      transaction_id: transactionId,
      created_by: user.id
    }])
    .select('id')
    .single();

  if (error) {
    console.error("Folio Payment Error:", error.message);
    return { error: `Failed to post payment: ${error.message}` };
  }

  // Audit the action
  await logAction({
    propertyId,
    action: 'PAYMENT_RECEIVED',
    details: { bookingId, amount, method, transactionId, paymentId: data.id },
    userId: user.id
  });

  // Force UI updates across dashboards
  revalidatePath('/dashboard/front-office');
  
  return { success: true, paymentId: data.id };
}

/**
 * Fetch the complete folio summary for a booking, including automated check-in/checkout rules
 */
export async function getFolioSummary(bookingId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Fetch base booking details
  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('amount, status, property_id, check_in, check_out')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) return { error: 'Booking not found.' };

  const propertyId = booking.property_id;

  // 2. Fetch property standard hours & custom rules
  const { data: property, error: propErr } = await supabaseAdmin
    .from('properties')
    .select('standard_checkin_time, standard_checkout_time, early_checkin_rules, late_checkout_rules')
    .eq('id', propertyId)
    .single();

  // 3. Fetch incidental charges (including is_automated and waiver fields)
  const { data: incidentals, error: incErr } = await supabaseAdmin
    .from('incidental_charges')
    .select('id, amount, description, created_at, is_automated, waiver_reason')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  // 4. Fetch payments
  const { data: payments, error: payErr } = await supabaseAdmin
    .from('payments')
    .select('id, amount, method, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  const totalCharges = Number(booking.amount) + (incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0);
  const totalPayments = payments?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const balanceDue = totalCharges - totalPayments;

  // 5. Evaluate proposed fees
  let proposedLateCheckoutFee = 0;
  let proposedEarlyCheckinFee = 0;

  const hasLateCheckoutPosted = incidentals?.some(item => 
    item.description.includes('Late Checkout')
  ) || false;

  const hasEarlyCheckinPosted = incidentals?.some(item => 
    item.description.includes('Early Check-In')
  ) || false;

  if (property) {
    const standardCheckoutTime = property.standard_checkout_time || '11:00:00';
    const standardCheckinTime = property.standard_checkin_time || '14:00:00';
    const lateCheckoutRules = property.late_checkout_rules || [];
    const earlyCheckinRules = property.early_checkin_rules || [];

    const now = new Date();

    // Check Late Checkout
    if (booking.status === 'Checked In' && !hasLateCheckoutPosted) {
      const checkoutDate = new Date(booking.check_out);
      const today = new Date();
      checkoutDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      // Propose charge if we are on or after the scheduled checkout date
      if (today >= checkoutDate) {
        const { fee } = calculateLateCheckoutFee(
          now,
          standardCheckoutTime,
          Number(booking.amount),
          lateCheckoutRules
        );
        proposedLateCheckoutFee = fee;
      }
    }

    // Check Early Check-In
    if (booking.status === 'Confirmed' && !hasEarlyCheckinPosted) {
      const checkinDate = new Date(booking.check_in);
      const today = new Date();
      checkinDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      // Propose charge if we are on or before the scheduled check-in date
      if (today <= checkinDate) {
        const { fee } = calculateEarlyCheckinFee(
          now,
          standardCheckinTime,
          Number(booking.amount),
          earlyCheckinRules
        );
        proposedEarlyCheckinFee = fee;
      }
    }
  }

  return {
    success: true,
    data: {
      roomAmount: Number(booking.amount),
      incidentals: incidentals || [],
      payments: payments || [],
      totalCharges,
      totalPayments,
      balanceDue,
      proposedLateCheckoutFee,
      proposedEarlyCheckinFee,
      standardHours: property ? {
        checkIn: property.standard_checkin_time,
        checkOut: property.standard_checkout_time
      } : null
    }
  };
}

/**
 * Server action to post a proposed automated time charge (early check-in or late checkout)
 */
export async function postProposedTimeCharge(bookingId: string, propertyId: string, description: string, amount: number) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('incidental_charges')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount,
      description,
      is_automated: true,
      created_by: user.id
    }])
    .select('id')
    .single();

  if (error) {
    console.error("Proposed Charge Error:", error.message);
    return { error: `Failed to post proposed charge: ${error.message}` };
  }

  // Audit the action
  await logAction({
    propertyId,
    action: 'INCIDENTAL_CHARGE_POSTED',
    details: { bookingId, amount, description, chargeId: data.id, is_automated: true },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  return { success: true };
}

/**
 * Server action to waive an automated charge and record it on the folio ledger as an audit log
 */
export async function waiveProposedTimeCharge(bookingId: string, propertyId: string, description: string, reason: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Insert a minimal ₹0.01 charge to represent the waiver in the ledger history (satisfies CHECK amount > 0)
  const waiverDescription = `${description} - Waived (Reason: ${reason})`;
  const { data, error } = await supabaseAdmin
    .from('incidental_charges')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount: 0.01,
      description: waiverDescription,
      is_automated: true,
      waiver_reason: reason,
      waived_by: user.id,
      created_by: user.id
    }])
    .select('id')
    .single();

  if (error) {
    console.error("Waiver Error:", error.message);
    return { error: `Failed to record waiver: ${error.message}` };
  }

  // Audit the waiver
  await logAction({
    propertyId,
    action: 'CHARGE_WAIVED',
    details: { bookingId, description, reason, chargeId: data.id, waivedBy: user.id },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  return { success: true };
}
