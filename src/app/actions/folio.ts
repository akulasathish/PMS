'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';

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
    details: { bookingId, amount, description, chargeId: data.id }
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
    details: { bookingId, amount, method, transactionId, paymentId: data.id }
  });

  // Force UI updates across dashboards
  revalidatePath('/dashboard/front-office');
  
  return { success: true, paymentId: data.id };
}

/**
 * Fetch the complete folio summary for a booking
 */
export async function getFolioSummary(bookingId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Fetch base booking amount
  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select('amount')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) return { error: 'Booking not found.' };

  // 2. Fetch incidental charges
  const { data: incidentals, error: incErr } = await supabaseAdmin
    .from('incidental_charges')
    .select('id, amount, description, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  // 3. Fetch payments
  const { data: payments, error: payErr } = await supabaseAdmin
    .from('payments')
    .select('id, amount, method, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  const totalCharges = Number(booking.amount) + (incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0);
  const totalPayments = payments?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const balanceDue = totalCharges - totalPayments;

  return {
    success: true,
    data: {
      roomAmount: Number(booking.amount),
      incidentals: incidentals || [],
      payments: payments || [],
      totalCharges,
      totalPayments,
      balanceDue
    }
  };
}
