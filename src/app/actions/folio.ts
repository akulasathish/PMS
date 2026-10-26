'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';
import { calculateEarlyCheckinFee, calculateLateCheckoutFee } from '@/lib/billing-rules';
import { getTodayLocalYYYYMMDD } from '@/lib/types';
import { normalizeMonthName } from '@/lib/quick-ledger-parser';

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
  
  const isRefund = amount < 0 || allocation?.toLowerCase().includes('refund');
  const posAmount = Math.abs(amount);

  let finalTxnId = transactionId || '';
  if (isRefund) {
    finalTxnId = transactionId ? `REFUND-${transactionId}` : 'REFUND-AT-FOLIO';
  } else if (allocation === 'Security Deposit') {
    finalTxnId = transactionId ? `DEPOSIT-${transactionId}` : 'DEPOSIT';
  }

  // Insert the payment securely (always positive posAmount to satisfy payments_amount_check constraint)
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert([{
      booking_id: bookingId,
      property_id: propertyId,
      amount: posAmount,
      method: method,
      payment_method: method,
      allocation: allocation,
      billing_period: billingPeriod || null,
      transaction_id: finalTxnId,
      business_date: businessDate
    }])
    .select('id')
    .single();

  if (error) {
    console.error("Folio Payment Error:", error.message);
    return { error: `Failed to post payment: ${error.message}` };
  }

  // If it's a refund, also record in expenses table for cash flow accounting
  if (isRefund) {
    await supabaseAdmin
      .from('expenses')
      .insert([{
        property_id: propertyId,
        description: `Guest Refund (${method})`,
        category: 'Security Deposit Refund',
        amount: posAmount,
        payment_method: method,
        date: businessDate,
        business_date: businessDate
      }]);
  }

  // Audit the action
  await logAction({
    propertyId,
    action: isRefund ? 'REFUND_ISSUED' : 'PAYMENT_RECEIVED',
    details: { bookingId, amount: posAmount, method, transactionId: finalTxnId, paymentId: data.id, businessDate },
    userId: user.id
  });

  // Force UI updates across dashboards
  revalidatePath('/dashboard/front-office');
  revalidatePath('/dashboard/partner-report');
  
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
    .select('id, total_amount, status, property_id, check_in, check_out, guest_name, guest_email, guest_phone, room_id, is_monthly, monthly_rent, security_deposit, rent_due_day, created_at, notes')
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
    .select('id, amount, payment_method, method, created_at, business_date, transaction_id, allocation, billing_period, is_void, void_reason')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  const payments = (rawPayments || []).map(p => {
    const rawAlloc = (p.allocation || '').toLowerCase();
    const txn = (p.transaction_id || '').toLowerCase();
    let allocation: 'Rent' | 'Maintenance' | 'Security Deposit' = 'Rent';
    if (rawAlloc.includes('deposit') || rawAlloc.includes('refundable') || txn.includes('deposit')) {
      allocation = 'Security Deposit';
    } else if (rawAlloc.includes('maint') || txn.includes('maint')) {
      allocation = 'Maintenance';
    }
    return {
      ...p,
      method: p.payment_method || p.method || 'Cash',
      allocation
    };
  });

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

  // Fetch current business_date from app_settings
  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'business_date')
    .single();
  const activeBusinessDate = settings?.value || getTodayLocalYYYYMMDD();

  // Compute separate ledgers for monthly/co-living bookings (3 distinct ledgers: Room Rent, Maintenance Fee, Refundable Fee)
  let securityDepositRequired = 0;
  let securityDepositPaid = 0;
  let securityDepositDue = 0;
  let rentChargesSum = 0;
  let rentPaid = 0;
  let roomRentRate = roomAmount;
  let roomRentPaid = 0;
  let roomRentDue = 0;
  let expectedMaintenance = 0;
  let maintenancePaid = 0;
  let maintenanceDue = 0;
  let totalOutstanding = balanceDue;

  let monthlyRentRate = roomAmount;
  let currentMonthRentPaid = 0;
  let currentMonthRentDue = 0;
  let previousOverdueRent = 0;
  let lifetimeRentPaid = 0;
  let totalPaidTillDate = 0;
  const monthBreakdown: Array<{
    month: string;
    rentCharged: number;
    rentPaid: number;
    due: number;
    status: string;
  }> = [];

  if (booking.is_monthly) {
    // 1. Room Rent Ledger
    const monthlyRate = Number((booking as any).monthly_rent || (booking as any).monthly_rate || roomAmount);
    monthlyRentRate = monthlyRate;

    const validRentPayments = payments
      .filter(item => !item.is_void && (item.allocation === 'Rent' || (!item.allocation && !item.transaction_id?.toLowerCase().includes('maint') && !item.transaction_id?.toLowerCase().includes('deposit'))));

    const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const getPaymentMonth = (p: any): string => {
      if (p.billing_period) {
        const m = p.billing_period.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\b.*?\b(20\d{2})\b/i);
        if (m) {
          return `${normalizeMonthName(m[1])} ${m[2]}`;
        }
        const parts = p.billing_period.trim().split(/\s+/);
        if (parts.length === 2) {
          return `${normalizeMonthName(parts[0])} ${parts[1]}`;
        }
        return p.billing_period;
      }
      const d = p.business_date || p.created_at?.slice(0, 10);
      if (d) {
        const parts = d.split('-');
        if (parts.length >= 2) {
          const idx = parseInt(parts[1], 10) - 1;
          if (idx >= 0 && idx < 12) return `${mNames[idx]} ${parts[0]}`;
        }
      }
      return 'Current Period';
    };

    const rentByMonth = new Map<string, number>();
    for (const p of validRentPayments) {
      const mKey = getPaymentMonth(p);
      rentByMonth.set(mKey, (rentByMonth.get(mKey) || 0) + Number(p.amount || 0));
    }

    const [actYr, actMo] = activeBusinessDate.split('-');
    const currentMonthKey = `${mNames[parseInt(actMo, 10) - 1]} ${actYr}`;

    lifetimeRentPaid = validRentPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    currentMonthRentPaid = rentByMonth.get(currentMonthKey) || 0;
    currentMonthRentDue = Math.max(0, monthlyRate - currentMonthRentPaid);

    for (const [mName, mPaid] of rentByMonth.entries()) {
      const mDue = Math.max(0, monthlyRate - mPaid);
      if (mName !== currentMonthKey) {
        previousOverdueRent += mDue;
      }
      monthBreakdown.push({
        month: mName,
        rentCharged: monthlyRate,
        rentPaid: mPaid,
        due: mDue,
        status: mDue > 0 ? `₹${mDue.toLocaleString('en-IN')} Due` : 'Cleared'
      });
    }

    if (!rentByMonth.has(currentMonthKey)) {
      const [bYr, bMo, bDay] = (booking.check_in || activeBusinessDate).split('-').map(Number);
      const dueDay = (booking as any).rent_due_day || bDay || 1;
      const todayDay = parseInt(activeBusinessDate.split('-')[2], 10);
      if (todayDay >= dueDay) {
        currentMonthRentDue = monthlyRate;
      } else {
        currentMonthRentDue = 0;
      }
      monthBreakdown.push({
        month: currentMonthKey,
        rentCharged: monthlyRate,
        rentPaid: 0,
        due: currentMonthRentDue,
        status: currentMonthRentDue > 0 ? `₹${currentMonthRentDue.toLocaleString('en-IN')} Due` : 'Cleared'
      });
    }

    // In the Room Rent Card:
    // Display monthly rate (e.g. ₹7,000) and current month payment (e.g. ₹7,000)
    const isCheckedInThisMonth = (booking.check_in || '').startsWith(activeBusinessDate.slice(0, 7));
    roomRentRate = monthlyRate;
    roomRentPaid = currentMonthRentPaid > 0 
      ? currentMonthRentPaid 
      : (isCheckedInThisMonth && previousOverdueRent === 0 ? lifetimeRentPaid : 0);
    roomRentDue = currentMonthRentDue + previousOverdueRent;

    // 2. Maintenance Fee Ledger
    const maintChargesList = incidentals.filter(
      item => item.description?.toLowerCase().includes('maint') || (item as any).category?.toLowerCase().includes('maint')
    );
    const maintChargesSum = maintChargesList.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const notesMaintMatch = ((booking as any)?.notes || '').match(/Maintenance:\s*₹?([\d,]+(?:\.\d+)?)/i);
    const notesMaintAmt = notesMaintMatch ? parseFloat(notesMaintMatch[1].replace(/,/g, '')) : 0;
    expectedMaintenance = Math.max(maintChargesSum, notesMaintAmt);
    maintenancePaid = payments
      .filter(item => !item.is_void && ((item.allocation as any) === 'Maintenance' || (item.allocation as any) === 'Maintenance Fee' || (item.transaction_id && item.transaction_id.toLowerCase().includes('maint'))))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // 3. Refundable Fee Ledger
    const notesRefMatch = ((booking as any)?.notes || '').match(/Refundable:\s*₹?([\d,]+(?:\.\d+)?)/i);
    const notesRefAmt = notesRefMatch ? parseFloat(notesRefMatch[1].replace(/,/g, '')) : 0;
    const baseDepositRequired = Number((booking as any).security_deposit || (booking as any).amount || 0);
    const postedDepositCharges = securityDepositCharges
      ?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    securityDepositRequired = Math.max(baseDepositRequired + postedDepositCharges, notesRefAmt);
    securityDepositPaid = payments
      .filter(item => !item.is_void && item.allocation === 'Security Deposit')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Smart Ledger Rebalancing for lump payments:
    // (e.g. When Srikanth paid ₹10,500 total, but ₹2,000 was saved with Rent allocation instead of Maintenance/Deposit)
    let surplusRent = Math.max(0, roomRentPaid - roomRentRate);
    if (surplusRent > 0) {
      const neededMaint = Math.max(0, expectedMaintenance - maintenancePaid);
      if (neededMaint > 0) {
        const coverMaint = Math.min(surplusRent, neededMaint);
        maintenancePaid += coverMaint;
        surplusRent -= coverMaint;
      }
      const neededDeposit = Math.max(0, securityDepositRequired - securityDepositPaid);
      if (neededDeposit > 0) {
        const coverDep = Math.min(surplusRent, neededDeposit);
        securityDepositPaid += coverDep;
        surplusRent -= coverDep;
      }
      roomRentPaid = roomRentRate + surplusRent;
    }

    currentMonthRentDue = Math.max(0, roomRentRate - roomRentPaid);
    roomRentDue = currentMonthRentDue + previousOverdueRent;
    maintenanceDue = Math.max(0, expectedMaintenance - maintenancePaid);
    securityDepositDue = Math.max(0, securityDepositRequired - securityDepositPaid);
    totalOutstanding = roomRentDue + maintenanceDue + securityDepositDue;

    rentChargesSum = roomRentRate;
    rentPaid = roomRentPaid;
  } else {
    // For standard daily bookings
    rentChargesSum = totalCharges;
    rentPaid = totalPayments;
    roomRentDue = Math.max(0, totalCharges - totalPayments);
    totalOutstanding = roomRentDue;
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
      securityDepositDue,
      securityDepositCharges: securityDepositCharges || [],
      rentChargesSum,
      rentPaid,
      roomRentRate,
      roomRentPaid,
      roomRentDue,
      monthlyRentRate,
      currentMonthRentPaid,
      currentMonthRentDue,
      previousOverdueRent,
      lifetimeRentPaid,
      totalPaidTillDate: booking.is_monthly ? payments?.filter(p => !p.is_void)?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0 : totalPayments,
      monthBreakdown,
      expectedMaintenance,
      maintenancePaid,
      maintenanceDue,
      totalOutstanding,
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
    .update({ 
      monthly_rate: newRate,
      monthly_rent: newRate,
      total_amount: newRate
    })
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

/**
 * Issue a Security Deposit Refund to a vacating tenant
 */
export async function refundSecurityDeposit(data: {
  bookingId: string;
  propertyId: string;
  refundAmount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer';
  notes?: string;
}) {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized.' };

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch active business date
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'business_date')
      .single();

    const businessDate = settings?.value || new Date().toISOString().substring(0, 10);

    // Fetch booking details
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('guest_name, room_id')
      .eq('id', data.bookingId)
      .single();

    const guestName = booking?.guest_name || 'Resident';

    // 1. Post entry into expenses table under category 'Security Deposit Refund'
    const { error: expError } = await supabaseAdmin
      .from('expenses')
      .insert([{
        property_id: data.propertyId,
        description: `Security Deposit Refund to ${guestName} ${data.notes ? `(${data.notes})` : ''}`.trim(),
        category: 'Security Deposit Refund',
        amount: data.refundAmount,
        payment_method: data.paymentMethod,
        date: businessDate,
        business_date: businessDate
      }]);

    if (expError) {
      console.error("Deposit Refund Expense Error:", expError.message);
      return { error: `Failed to record deposit refund expense: ${expError.message}` };
    }

    // 2. Post entry in payments table for booking audit (using positive amount to satisfy payments_amount_check constraint)
    const { error: payErr } = await supabaseAdmin
      .from('payments')
      .insert([{
        booking_id: data.bookingId,
        property_id: data.propertyId,
        amount: data.refundAmount,
        method: data.paymentMethod,
        payment_method: data.paymentMethod,
        transaction_id: 'DEPOSIT-REFUND-AT-CHECKOUT',
        allocation: 'Security Deposit Refund',
        business_date: businessDate
      }]);

    if (payErr) {
      console.warn("Notice: Payments refund record warning:", payErr.message);
    }

    // Log action
    await logAction({
      propertyId: data.propertyId,
      action: 'PAYMENT_RECEIVED',
      details: {
        bookingId: data.bookingId,
        amount: -data.refundAmount,
        description: `Security Deposit Refund to ${guestName}`
      },
      userId: user.id
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/front-office');
    revalidatePath('/dashboard/partner-report');

    return { success: true };
  } catch (err: any) {
    console.error("Error refunding security deposit:", err);
    return { error: err.message || 'Failed to refund security deposit.' };
  }
}



