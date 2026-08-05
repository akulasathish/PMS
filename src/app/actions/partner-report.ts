'use server';

import { createClient as createSSRClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PartnerInvestment, TimestampedExpense, StaffPayroll, DailyClosingSnapshot } from '@/lib/types';

export interface DateDrilldownData {
  date: string;
  payments: {
    id: string;
    guest_name: string;
    room_number?: string;
    amount: number;
    payment_method: string;
    time?: string;
  }[];
  expenses: {
    id: string;
    title: string;
    category: string;
    amount: number;
    payment_method: string;
    timestamp: string;
  }[];
  totalCashReceived: number;
  totalUpiReceived: number;
  totalCashExpenses: number;
  totalUpiExpenses: number;
  netCashInHand: number;
  dailyNetProfit: number;
}

export interface PartnerReportSummary {
  month: string;
  totalIncome: number;
  cashIncome: number;
  upiIncome: number;
  securityDepositsHeld: number;
  totalExpenses: number;
  payrollExpenses: number;
  operationalExpenses: number;
  netProfit: number;
  partnerPayouts: {
    id: string;
    partner_name: string;
    share_percentage: number;
    payout_amount: number;
  }[];
  dailySnapshots: DailyClosingSnapshot[];
}

/**
 * Fetch monthly partner financial report and profit distributions
 */
export async function getPartnerMonthlyReport(propertyId: string, yearMonth?: string): Promise<{ success: boolean; data?: PartnerReportSummary; error?: string }> {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const targetMonth = yearMonth || new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-31`;

    // 1. Fetch Partner Shares
    const { data: partnerShares, error: sharesError } = await supabase
      .from('partner_investments')
      .select('*')
      .eq('property_id', propertyId);

    // Fallback default shares if none exist yet
    const shares: PartnerInvestment[] = partnerShares && partnerShares.length > 0 ? partnerShares : [
      { id: '1', property_id: propertyId, partner_name: 'Person 1', investment_amount: 0, share_percentage: 28.30 },
      { id: '2', property_id: propertyId, partner_name: 'Person 2', investment_amount: 0, share_percentage: 22.64 },
      { id: '3', property_id: propertyId, partner_name: 'Person 3', investment_amount: 0, share_percentage: 18.87 },
      { id: '4', property_id: propertyId, partner_name: 'Person 4', investment_amount: 0, share_percentage: 18.87 },
      { id: '5', property_id: propertyId, partner_name: 'Person 5', investment_amount: 0, share_percentage: 11.32 },
    ];

    // 2. Fetch Payments / Bookings collections for the month
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_method, transaction_id')
      .eq('property_id', propertyId);

    let cashIncome = 0;
    let upiIncome = 0;
    let securityDepositsHeld = 0;

    (payments || []).forEach(p => {
      const amt = Number(p.amount) || 0;
      const isDeposit = Boolean(p.transaction_id && p.transaction_id.toUpperCase().includes('DEPOSIT'));

      if (!isDeposit) {
        if (p.payment_method?.toLowerCase().includes('cash')) {
          cashIncome += amt;
        } else {
          upiIncome += amt;
        }
      }
    });

    // Calculate active Blocked Refundable Deposit Fund from currently checked-in residents
    const { data: activeCheckedInBookings } = await supabase
      .from('bookings')
      .select('monthly_rent, security_deposit, status')
      .eq('property_id', propertyId)
      .eq('status', 'Checked In');

    (activeCheckedInBookings || []).forEach(b => {
      securityDepositsHeld += Number(b.security_deposit) || 0;
    });

    // Fallback if payments table is empty
    if ((payments || []).length === 0) {
      (activeCheckedInBookings || []).forEach(b => {
        upiIncome += Number(b.monthly_rent) || 0;
      });
    }

    const totalIncome = cashIncome + upiIncome;

    // 3. Fetch Operational Expenses (from both expenses and timestamped_expenses)
    const { data: stdExpenses } = await supabase
      .from('expenses')
      .select('amount, payment_method, method')
      .eq('property_id', propertyId)
      .gte('business_date', startDate)
      .lte('business_date', endDate);

    const { data: tsExpenses } = await supabase
      .from('timestamped_expenses')
      .select('amount, payment_method')
      .eq('property_id', propertyId)
      .gte('business_date', startDate)
      .lte('business_date', endDate);

    let operationalExpenses = 0;
    (stdExpenses || []).forEach(e => {
      operationalExpenses += Number(e.amount) || 0;
    });
    (tsExpenses || []).forEach(e => {
      operationalExpenses += Number(e.amount) || 0;
    });

    // 4. Fetch Staff Payroll Expenses
    const { data: payroll } = await supabase
      .from('staff_payroll')
      .select('paid_amount')
      .eq('property_id', propertyId)
      .gte('business_month', startDate)
      .lte('business_month', endDate);

    let payrollExpenses = 0;
    (payroll || []).forEach(pr => {
      payrollExpenses += Number(pr.paid_amount) || 0;
    });

    const totalExpenses = operationalExpenses + payrollExpenses;
    const netProfit = Math.max(0, totalIncome - totalExpenses);

    // 5. Calculate Partner Dynamic Payouts
    const partnerPayouts = shares.map(partner => ({
      id: partner.id,
      partner_name: partner.partner_name,
      share_percentage: partner.share_percentage,
      payout_amount: Math.round((netProfit * (partner.share_percentage / 100)) * 100) / 100
    }));

    // 6. Fetch Daily Closing Snapshots
    const { data: snapshots } = await supabase
      .from('daily_closing_snapshots')
      .select('*')
      .eq('property_id', propertyId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: false });

    return {
      success: true,
      data: {
        month: targetMonth,
        totalIncome,
        cashIncome,
        upiIncome,
        securityDepositsHeld,
        totalExpenses,
        payrollExpenses,
        operationalExpenses,
        netProfit,
        partnerPayouts,
        dailySnapshots: []
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch detailed daily drilldown (Payments & Expenses for specific date)
 */
export async function getDateSpecificDrilldown(propertyId: string, selectedDate: string): Promise<{ success: boolean; data?: DateDrilldownData; error?: string }> {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    // 1. Payments received on selectedDate (using business_date)
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_method, method, created_at, booking_id, bookings(guest_name, room_id, rooms(room_number))')
      .eq('property_id', propertyId)
      .eq('business_date', selectedDate);

    // Fallback to bookings checked in on selectedDate if payments table has no records for that date
    let formattedPayments: DateDrilldownData['payments'] = [];
    let totalCashReceived = 0;
    let totalUpiReceived = 0;

    if (payments && payments.length > 0) {
      formattedPayments = payments.map((p: any) => {
        const amt = Number(p.amount) || 0;
        const payMethod = p.payment_method || p.method || 'UPI';
        const isCash = payMethod.toLowerCase().includes('cash');
        if (isCash) totalCashReceived += amt;
        else totalUpiReceived += amt;

        return {
          id: p.id,
          guest_name: p.bookings?.guest_name || 'Guest Payment',
          room_number: p.bookings?.rooms?.room_number || 'PG Room',
          amount: amt,
          payment_method: payMethod,
          time: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
        };
      });
    } else {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, guest_name, amount, check_in, rooms(room_number)')
        .eq('property_id', propertyId)
        .eq('check_in', selectedDate);

      formattedPayments = (bookings || []).map((b: any) => {
        const amt = Number(b.amount) || 0;
        totalUpiReceived += amt;
        return {
          id: b.id,
          guest_name: b.guest_name,
          room_number: b.rooms?.room_number || 'PG Bed',
          amount: amt,
          payment_method: 'UPI',
          time: '09:00 AM'
        };
      });
    }

    // 2. Expenses incurred on selectedDate from expenses & timestamped_expenses
    const { data: stdExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('property_id', propertyId)
      .eq('business_date', selectedDate);

    const { data: tsExpenses } = await supabase
      .from('timestamped_expenses')
      .select('*')
      .eq('property_id', propertyId)
      .eq('business_date', selectedDate);

    let totalCashExpenses = 0;
    let totalUpiExpenses = 0;

    const formattedExpenses = [
      ...(stdExpenses || []).map(e => ({
        id: e.id,
        title: e.description || 'Expense',
        category: e.category || 'Operations',
        amount: Number(e.amount) || 0,
        payment_method: e.payment_method || e.method || 'UPI',
        timestamp: e.created_at ? new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : selectedDate
      })),
      ...(tsExpenses || []).map(e => ({
        id: e.id,
        title: e.title || 'Expense',
        category: e.category || 'Operations',
        amount: Number(e.amount) || 0,
        payment_method: e.payment_method || 'UPI',
        timestamp: e.expense_timestamp ? new Date(e.expense_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : selectedDate
      }))
    ];

    formattedExpenses.forEach(e => {
      if (e.payment_method?.toLowerCase().includes('cash')) totalCashExpenses += e.amount;
      else totalUpiExpenses += e.amount;
    });
    const netCashInHand = totalCashReceived - totalCashExpenses;
    const dailyNetProfit = (totalCashReceived + totalUpiReceived) - (totalCashExpenses + totalUpiExpenses);

    return {
      success: true,
      data: {
        date: selectedDate,
        payments: formattedPayments,
        expenses: formattedExpenses,
        totalCashReceived,
        totalUpiReceived,
        totalCashExpenses,
        totalUpiExpenses,
        netCashInHand,
        dailyNetProfit
      }
    };
  } catch (err: any) {
    console.error('Error fetching date drilldown:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Log ancillary / additional PG income (e.g. Custom Food/Cooking, Laundry, Guest Stay, Late Fee)
 */
export async function logAdditionalIncome(data: {
  propertyId: string;
  category: string;
  title: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI';
  tenantName?: string;
}) {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    const today = new Date().toISOString().split('T')[0];
    const notesStr = `${data.category}: ${data.title} ${data.tenantName ? `(${data.tenantName})` : ''}`.trim();

    const { error } = await supabase
      .from('payments')
      .insert([{
        property_id: data.propertyId,
        amount: data.amount,
        payment_method: data.paymentMethod,
        payment_date: today,
        notes: notesStr,
        payment_type: 'Ancillary Income'
      }]);

    if (error) {
      console.error('Failed to log additional income:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/partner-report');
    revalidatePath('/dashboard/front-office');

    return { success: true };
  } catch (err: any) {
    console.error('Unhandled error logging additional income:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch custom date range financial report (from startDate to endDate)
 */
export async function getPartnerCustomDateReport(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: PartnerReportSummary & { customStartDate: string; customEndDate: string }; error?: string }> {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    // 1. Fetch Partner Shares
    const { data: partnerShares } = await supabase
      .from('partner_investments')
      .select('*')
      .eq('property_id', propertyId);

    const shares: PartnerInvestment[] = partnerShares && partnerShares.length > 0 ? partnerShares : [
      { id: '1', property_id: propertyId, partner_name: 'AKULA KIRAN', investment_amount: 2000000, share_percentage: 37.04 },
      { id: '2', property_id: propertyId, partner_name: 'RANGA RAO', investment_amount: 1000000, share_percentage: 18.52 },
      { id: '3', property_id: propertyId, partner_name: 'charan', investment_amount: 1000000, share_percentage: 18.52 },
      { id: '4', property_id: propertyId, partner_name: 'Sandeep', investment_amount: 700000, share_percentage: 12.96 },
      { id: '5', property_id: propertyId, partner_name: 'Aravind Pallela', investment_amount: 700000, share_percentage: 12.96 },
    ];

    // 2. Fetch Payments within custom date range
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_method, method, transaction_id, business_date, created_at')
      .eq('property_id', propertyId)
      .gte('business_date', startDate)
      .lte('business_date', endDate);

    let cashIncome = 0;
    let upiIncome = 0;
    let securityDepositsHeld = 0;

    (payments || []).forEach(p => {
      const amt = Number(p.amount) || 0;
      const payMethod = p.payment_method || p.method || 'UPI';
      const isDeposit = Boolean(p.transaction_id && p.transaction_id.toUpperCase().includes('DEPOSIT'));

      if (!isDeposit) {
        if (payMethod.toLowerCase().includes('cash')) cashIncome += amt;
        else upiIncome += amt;
      }
    });

    // 3. Fetch Active Blocked Security Deposit Fund
    const { data: activeCheckedInBookings } = await supabase
      .from('bookings')
      .select('security_deposit, status')
      .eq('property_id', propertyId)
      .eq('status', 'Checked In');

    (activeCheckedInBookings || []).forEach(b => {
      securityDepositsHeld += Number(b.security_deposit) || 0;
    });

    // 4. Fetch Operational Expenses within custom date range
    const { data: stdExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('property_id', propertyId)
      .gte('business_date', startDate)
      .lte('business_date', endDate);

    const { data: tsExpenses } = await supabase
      .from('timestamped_expenses')
      .select('amount')
      .eq('property_id', propertyId)
      .gte('business_date', startDate)
      .lte('business_date', endDate);

    let operationalExpenses = 0;
    (stdExpenses || []).forEach(e => { operationalExpenses += Number(e.amount) || 0; });
    (tsExpenses || []).forEach(e => { operationalExpenses += Number(e.amount) || 0; });

    // 5. Staff Payroll within custom date range
    const { data: payroll } = await supabase
      .from('staff_payroll')
      .select('paid_amount')
      .eq('property_id', propertyId)
      .gte('business_month', startDate)
      .lte('business_month', endDate);

    let payrollExpenses = 0;
    (payroll || []).forEach(pr => { payrollExpenses += Number(pr.paid_amount) || 0; });

    const totalIncome = cashIncome + upiIncome;
    const totalExpenses = operationalExpenses + payrollExpenses;
    const netProfit = Math.max(0, totalIncome - totalExpenses);

    const partnerPayouts = shares.map(partner => ({
      id: partner.id,
      partner_name: partner.partner_name,
      share_percentage: partner.share_percentage,
      payout_amount: Math.round((netProfit * (partner.share_percentage / 100)) * 100) / 100
    }));

    return {
      success: true,
      data: {
        month: `${startDate} to ${endDate}`,
        customStartDate: startDate,
        customEndDate: endDate,
        totalIncome,
        cashIncome,
        upiIncome,
        securityDepositsHeld,
        totalExpenses,
        payrollExpenses,
        operationalExpenses,
        netProfit,
        partnerPayouts,
        dailySnapshots: []
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Execute Close Month Financial Audit: locks the month, archives P&L snapshot, and rolls over to next month
 */
export async function closeMonthFinancialAudit(
  propertyId: string,
  targetMonth: string
): Promise<{ success: boolean; nextMonth?: string; error?: string }> {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    // Fetch report data for the target month
    const reportRes = await getPartnerMonthlyReport(propertyId, targetMonth);
    if (!reportRes.success || !reportRes.data) {
      return { success: false, error: reportRes.error || 'Failed to compute month report for closure.' };
    }

    const report = reportRes.data;

    // Log the month-end closure in audit_logs
    const { error: logErr } = await supabase
      .from('audit_logs')
      .insert([{
        property_id: propertyId,
        user_id: user.id,
        action: 'MONTH_END_AUDIT_CLOSED',
        details: {
          month: targetMonth,
          totalIncome: report.totalIncome,
          cashIncome: report.cashIncome,
          upiIncome: report.upiIncome,
          totalExpenses: report.totalExpenses,
          netProfit: report.netProfit,
          securityDepositsHeld: report.securityDepositsHeld,
          partnerPayouts: report.partnerPayouts,
          closedAt: new Date().toISOString()
        },
        severity: 'info'
      }]);

    if (logErr) {
      console.warn("Failed to insert audit log for month closure:", logErr);
    }

    // Calculate next month (e.g., 2026-08 -> 2026-09)
    const [y, m] = targetMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextMonth = nextDate.toISOString().slice(0, 7);
    const nextBusinessDate = `${nextMonth}-01`;

    // Update system business date to next month's 1st day
    await supabase
      .from('app_settings')
      .update({ value: nextBusinessDate, updated_at: new Date().toISOString() })
      .eq('key', 'business_date');

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/partner-report');
    revalidatePath('/dashboard/front-office');

    return { success: true, nextMonth };
  } catch (err: any) {
    console.error('Error executing month closure:', err);
    return { success: false, error: err.message };
  }
}
