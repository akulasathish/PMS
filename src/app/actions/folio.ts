'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';
import { calculateEarlyCheckinFee, calculateLateCheckoutFee } from '@/lib/billing-rules';
import { getTodayLocalYYYYMMDD } from '@/lib/types';

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
  const businessDate = settings?.value || getTodayLocalYYYYMMDD();
  
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
  const allocation = (formData.get('allocation') as string) || 'Rent';
  const billingPeriod = formData.get('billingPeriod') as string | null;

  if (!bookingId || !propertyId || !amountStr || !method) {
    return { error: 'Missing required fields.' };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount === 0) {
    return { error: 'Invalid amount. Must be non-zero.' };
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
    businessDate = settings?.value || getTodayLocalYYYYMMDD();
  }
  
  // Insert the payment securely
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount,
      payment_method: method,
      transaction_id: allocation === 'Security Deposit' ? (transactionId ? `DEPOSIT-${transactionId}` : 'DEPOSIT') : transactionId,
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
    .select('id, total_amount, status, property_id, check_in, check_out, guest_name, guest_email, guest_phone, room_id, is_monthly, monthly_rent, security_deposit, rent_due_day, created_at')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    console.error("getFolioSummary booking fetch error:", bookingErr);
    return { error: 'Booking not found.' };
  }

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

  const allIncidentals = rawIncidentals ? [...rawIncidentals] : [];

  // Split manual Security Deposit charges from Rent/Incidental charges for monthly bookings
  const securityDepositCharges = booking.is_monthly
    ? allIncidentals.filter(item => item.description.startsWith('Security Deposit'))
    : [];

  const incidentals = booking.is_monthly
    ? allIncidentals.filter(item => !item.description.startsWith('Security Deposit'))
    : allIncidentals;

  // 4. Fetch payments
  const { data: rawPayments, error: payErr } = await supabaseAdmin
    .from('payments')
    .select('id, amount, payment_method, created_at, business_date, transaction_id')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  const payments = (rawPayments || []).map(p => ({
    ...p,
    method: p.payment_method || 'Cash',
    allocation: p.transaction_id?.toUpperCase().includes('DEPOSIT') ? 'Security Deposit' : 'Rent'
  }));

  // Sum of any daily room charges posted by the night audit
  const dailyRoomChargesSum = incidentals
    ?.filter(item => item.description.startsWith('Daily Room Charge'))
    ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

  const discountAmount = Number((booking as any).discount_amount || 0);
  const discountReason = (booking as any).discount_reason || null;

  // The base room amount shown on the folio is the booking total minus discount minus already-posted daily charges
  const roomAmount = booking.is_monthly
    ? Math.max(0, Number((booking as any).monthly_rent || (booking as any).monthly_rate || 0) - discountAmount)
    : Math.max(0, Number((booking as any).total_amount || (booking as any).amount || 0) - discountAmount - dailyRoomChargesSum);

  const totalCharges = roomAmount + (incidentals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0);
  const totalPayments = booking.is_monthly
    ? payments?.filter(item => item.allocation === 'Rent' || !item.allocation)?.reduce((sum, item) => sum + Number(item.amount), 0) || 0
    : payments?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const balanceDue = totalCharges - totalPayments;

  // Compute separate ledgers for monthly/co-living bookings
  let securityDepositRequired = 0;
  let securityDepositPaid = 0;
  let rentChargesSum = 0;
  let rentPaid = 0;

  if (booking.is_monthly) {
    const baseDepositRequired = Number((booking as any).security_deposit || (booking as any).amount || 0);
    const postedDepositCharges = securityDepositCharges
      ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    securityDepositRequired = baseDepositRequired + postedDepositCharges;
    securityDepositPaid = payments
      ?.filter(item => item.allocation === 'Security Deposit')
      ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    // Rent & Incidentals = Total charges
    rentChargesSum = totalCharges;
    rentPaid = totalPayments;
  } else {
    // For standard daily bookings, security deposit is not applicable
    rentChargesSum = totalCharges;
    rentPaid = totalPayments;
  }


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
          Number((booking as any).total_amount || (booking as any).amount || 0),
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
          Number((booking as any).total_amount || (booking as any).amount || 0),
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
  const activeBusinessDate = settings?.value || getTodayLocalYYYYMMDD();

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
      checkInTime: (booking as any).check_in_time || null,
      checkOutTime: (booking as any).check_out_time || null,
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
      securityDepositRequired,
      securityDepositPaid,
      securityDepositCharges: securityDepositCharges || [],
      rentChargesSum,
      rentPaid,
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
  const businessDate = settings?.value || getTodayLocalYYYYMMDD();

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
  const businessDate = settings?.value || getTodayLocalYYYYMMDD();

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

/**
 * Force settle the folio to exactly ₹0.00 balance by posting an adjustment payment (if positive)
 * or an adjustment charge (if negative).
 */
export async function forceSettleFolio(bookingId: string, propertyId: string) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch the folio summary first
  const summaryRes = await getFolioSummary(bookingId);
  if ('error' in summaryRes || !summaryRes.success) {
    return { error: summaryRes.error || 'Failed to fetch folio summary.' };
  }

  const { balanceDue } = summaryRes.data;

  if (Math.abs(balanceDue) <= 0.01) {
    return { success: true, message: 'Folio is already settled.' };
  }

  // Fetch current business_date from app_settings
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();
  const businessDate = settings?.value || getTodayLocalYYYYMMDD();

  if (balanceDue > 0) {
    // Guest owes money. Post an adjustment payment to bring the balance to 0.
    const { error: payError } = await supabaseAdmin
      .from('payments')
      .insert([{
        booking_id: bookingId,
        property_id: propertyId,
        amount: balanceDue,
        method: 'Adjustment / Write-off',
        transaction_id: 'SYSTEM-FORCE-SETTLE',
        created_by: user.id,
        business_date: businessDate
      }]);

    if (payError) {
      console.error("Force Settle Payment Error:", payError.message);
      return { error: `Failed to post adjustment payment: ${payError.message}` };
    }

    // Log in Audit Trail
    await logAction({
      propertyId,
      action: 'PAYMENT_RECEIVED',
      details: { bookingId, amount: balanceDue, method: 'Adjustment / Write-off', transactionId: 'SYSTEM-FORCE-SETTLE', businessDate },
      userId: user.id
    });

  } else {
    // Guest overpaid / refund settled offline. Post an incidental charge to bring the balance to 0.
    const adjustmentAmount = Math.abs(balanceDue);
    const { error: chargeError } = await supabaseAdmin
      .from('incidental_charges')
      .insert([{
        booking_id: bookingId,
        property_id: propertyId,
        amount: adjustmentAmount,
        description: 'Folio Settlement Adjustment (Refunded/Settled Offline)',
        created_by: user.id,
        is_automated: true,
        business_date: businessDate
      }]);

    if (chargeError) {
      console.error("Force Settle Incidental Error:", chargeError.message);
      return { error: `Failed to post adjustment charge: ${chargeError.message}` };
    }

    // Log in Audit Trail
    await logAction({
      propertyId,
      action: 'INCIDENTAL_CHARGE_POSTED',
      details: { bookingId, amount: adjustmentAmount, description: 'Folio Settlement Adjustment (Refunded/Settled Offline)' },
      userId: user.id
    });
  }

  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/front-office', 'page');
  
  return { success: true };
}

/**
 * Server action to update a monthly co-living guest's room rent rate.
 */
export async function updateMonthlyRate(bookingId: string, propertyId: string, newRate: number) {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Update the monthly rate in the bookings table
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ monthly_rate: newRate })
    .eq('id', bookingId);

  if (error) {
    console.error("Update Monthly Rate Error:", error.message);
    return { error: `Failed to update rent rate: ${error.message}` };
  }

  // Log audit action
  await logAction({
    propertyId,
    action: 'MONTHLY_RATE_UPDATED',
    details: { bookingId, newRate },
    userId: user.id
  });

  revalidatePath('/dashboard/front-office');
  return { success: true };
}

/**
 * Server action to automatically sync operational business date setting to actual current calendar date
 * if the operational date is in the past. Runs with admin service-role privileges.
 */
export async function syncBusinessDateToToday() {
  const supabase = createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch current business_date setting
  const { data: setting, error: fetchError } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Fetch business date error:", fetchError.message);
    return { error: `Failed to fetch business date setting: ${fetchError.message}` };
  }

  const getTodayLocal = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    } catch (e) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  };

  const todayLocal = getTodayLocal();
  const currentVal = setting?.value || '';

  if (!currentVal || currentVal < todayLocal) {
    console.log(`[Auto-Sync] Syncing stale business date (${currentVal}) to today (${todayLocal})`);
    
    const { error: updateError } = await supabaseAdmin
      .from('app_settings')
      .upsert({ 
        key: 'business_date', 
        value: todayLocal,
        description: 'The active operational business date of the property management system'
      });

    if (updateError) {
      console.error("Upsert business date error:", updateError.message);
      return { error: `Failed to update business date setting: ${updateError.message}` };
    }

    revalidatePath('/dashboard/front-office');
    return { success: true, syncedDate: todayLocal };
  }

  return { success: false, syncedDate: currentVal };
}



