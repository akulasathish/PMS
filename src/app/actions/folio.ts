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
  
  // Fetch current business_date from app_settings
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();
  const businessDate = settings?.value || new Date().toISOString().substring(0, 10);
  
  // Insert the charge securely
  const { data, error } = await supabaseAdmin
    .from('incidental_charges')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount,
      description,
      created_by: user.id,
      business_date: businessDate
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
  const customBusinessDate = formData.get('businessDate') as string | null;

  if (!bookingId || !propertyId || !amountStr || !method) {
    return { error: 'Missing required fields.' };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Invalid amount. Must be greater than 0.' };
  }

  const supabaseAdmin = getSupabaseAdmin();
  
  let businessDate = customBusinessDate;
  if (!businessDate) {
    // Fetch current business_date from app_settings
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'business_date')
      .single();
    businessDate = settings?.value || new Date().toISOString().substring(0, 10);
  }
  
  // Insert the payment securely
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount,
      method,
      transaction_id: transactionId,
      created_by: user.id,
      business_date: businessDate
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
    details: { bookingId, amount, method, transactionId, paymentId: data.id, businessDate },
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
    .select('id, amount, discount_amount, discount_reason, status, property_id, check_in, check_out, check_in_time, check_out_time, guest_name, guest_email, guest_phone, room_id, is_monthly, monthly_rate, created_at')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) return { error: 'Booking not found.' };

  const propertyId = booking.property_id;

  // 1b. Fetch room number safely
  let roomNumber = '';
  if (booking.room_id) {
    const { data: roomData } = await supabaseAdmin
      .from('rooms')
      .select('room_number')
      .eq('id', booking.room_id)
      .single();
    if (roomData) {
      roomNumber = roomData.room_number;
    }
  }

  // 2. Fetch property standard hours, custom rules, & branding details
  const { data: property, error: propErr } = await supabaseAdmin
    .from('properties')
    .select('name, address, city, country, gst_number, state_code, standard_checkin_time, standard_checkout_time, early_checkin_rules, late_checkout_rules')
    .eq('id', propertyId)
    .single();

  // 3. Fetch incidental charges (including is_automated and waiver fields)
  const { data: rawIncidentals, error: incErr } = await supabaseAdmin
    .from('incidental_charges')
    .select('id, amount, description, created_at, business_date, is_automated, waiver_reason')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  const incidentals = rawIncidentals ? [...rawIncidentals] : [];

  // Append security deposit as a virtual incidental charge for monthly bookings
  if (booking.is_monthly && Number(booking.amount) > 0) {
    incidentals.unshift({
      id: 'security-deposit-charge',
      amount: Number(booking.amount),
      description: 'Security Deposit / Advance',
      created_at: booking.check_in_time || booking.created_at || new Date().toISOString(),
      business_date: booking.check_in,
      is_automated: true,
      waiver_reason: null
    });
  }

  // 4. Fetch payments
  const { data: payments, error: payErr } = await supabaseAdmin
    .from('payments')
    .select('id, amount, method, created_at, business_date, transaction_id, is_void, void_reason, voided_at, voided_by')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  // Sum of any daily room charges posted by the night audit
  const dailyRoomChargesSum = incidentals
    ?.filter(item => item.description.startsWith('Daily Room Charge'))
    ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  const discountAmount = Number((booking as any).discount_amount || 0);
  const discountReason = (booking as any).discount_reason || null;

  // The base room amount shown on the folio is the booking total minus discount minus already-posted daily charges
  const roomAmount = booking.is_monthly
    ? Math.max(0, Number(booking.monthly_rate || 0) - discountAmount)
    : Math.max(0, Number(booking.amount) - discountAmount - dailyRoomChargesSum);

  const totalCharges = roomAmount + (incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0);
  const totalPayments = payments
    ?.filter(item => !item.is_void)
    ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
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

  // Fetch current business_date from app_settings to default the payment logging date
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();
  const activeBusinessDate = settings?.value || new Date().toISOString().substring(0, 10);

  return {
    success: true,
    data: {
      bookingId: booking.id,
      businessDate: activeBusinessDate,
      isMonthly: !!booking.is_monthly,
      roomAmount,
      bookingStatus: booking.status,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      checkInTime: booking.check_in_time,
      checkOutTime: booking.check_out_time,
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      guestPhone: booking.guest_phone,
      roomNumber,
      propertyName: property?.name || 'StaySync Property',
      propertyAddress: property?.address || '',
      propertyCity: property?.city || '',
      propertyCountry: property?.country || '',
      propertyGst: property?.gst_number || '',
      propertyStateCode: property?.state_code || '',
      incidentals: incidentals || [],
      payments: payments || [],
      totalCharges,
      totalPayments,
      balanceDue,
      proposedLateCheckoutFee,
      proposedEarlyCheckinFee,
      discountAmount,
      discountReason,
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

  // Fetch current business_date from app_settings
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();
  const businessDate = settings?.value || new Date().toISOString().substring(0, 10);

  const { data, error } = await supabaseAdmin
    .from('incidental_charges')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount,
      description,
      is_automated: true,
      created_by: user.id,
      business_date: businessDate
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

  // Fetch current business_date from app_settings
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();
  const businessDate = settings?.value || new Date().toISOString().substring(0, 10);

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
      created_by: user.id,
      business_date: businessDate
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

/**
 * Server action to void an existing payment
 */
export async function voidPayment(paymentId: string, propertyId: string, reason: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };
  if (!reason.trim()) return { error: 'A void reason is required.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Mark the payment as voided
  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      is_void: true,
      void_reason: reason.trim(),
      voided_at: new Date().toISOString(),
      voided_by: user.id
    })
    .eq('id', paymentId);

  if (error) {
    console.error("Void Payment Error:", error.message);
    return { error: `Failed to void payment: ${error.message}` };
  }

  // Log in Audit Trail
  await logAction({
    propertyId,
    action: 'PAYMENT_VOIDED',
    details: { paymentId, reason },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  return { success: true };
}

/**
 * Server action to delete an existing incidental charge
 */
export async function deleteIncidentalCharge(chargeId: string, propertyId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch the charge description/details first to audit
  const { data: chargeData, error: fetchError } = await supabaseAdmin
    .from('incidental_charges')
    .select('booking_id, amount, description')
    .eq('id', chargeId)
    .single();

  if (fetchError || !chargeData) {
    return { error: 'Incidental charge not found.' };
  }

  // Delete the charge
  const { error } = await supabaseAdmin
    .from('incidental_charges')
    .delete()
    .eq('id', chargeId);

  if (error) {
    console.error("Delete Incidental Error:", error.message);
    return { error: `Failed to delete charge: ${error.message}` };
  }

  // Audit the deletion
  await logAction({
    propertyId,
    action: 'INCIDENTAL_CHARGE_DELETED',
    details: { chargeId, bookingId: chargeData.booking_id, amount: chargeData.amount, description: chargeData.description },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  return { success: true };
}

/**
 * Server action to delete/clear the security deposit (advance payment amount) on the booking
 */
export async function deleteSecurityDeposit(bookingId: string, propertyId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Set booking amount to 0 (Security Deposit / Advance is stored in bookings.amount for monthly bookings)
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ amount: 0 })
    .eq('id', bookingId);

  if (error) {
    console.error("Delete Security Deposit Error:", error.message);
    return { error: `Failed to delete security deposit: ${error.message}` };
  }

  // Audit the deletion
  await logAction({
    propertyId,
    action: 'SECURITY_DEPOSIT_DELETED',
    details: { bookingId },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  return { success: true };
}


