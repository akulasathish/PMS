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

      if (isDeposit) {
        securityDepositsHeld += amt;
      } else {
        if (p.payment_method?.toLowerCase().includes('cash')) {
          cashIncome += amt;
        } else {
          upiIncome += amt;
        }
      }
    });

    // Also include completed bookings if payments table is empty
    if ((payments || []).length === 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('monthly_rent, security_deposit, status')
        .eq('property_id', propertyId);

      (bookings || []).forEach(b => {
        if (b.status === 'Checked In' || b.status === 'Checked Out' || b.status === 'Confirmed') {
          upiIncome += Number(b.monthly_rent) || 0;
          securityDepositsHeld += Number(b.security_deposit) || 0;
        }
      });
    }

    const totalIncome = cashIncome + upiIncome;

    // 3. Fetch Operational Timestamped Expenses
    const { data: expenses } = await supabase
      .from('timestamped_expenses')
      .select('amount, payment_method')
      .eq('property_id', propertyId)
      .gte('business_date', startDate)
      .lte('business_date', endDate);

    let operationalExpenses = 0;
    (expenses || []).forEach(e => {
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
        dailySnapshots: snapshots || []
      }
    };
  } catch (err: any) {
    console.error('Error fetching partner report:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch detailed date-specific drilldown (e.g. 5th of the month)
 */
export async function getDateSpecificDrilldown(propertyId: string, selectedDate: string): Promise<{ success: boolean; data?: DateDrilldownData; error?: string }> {
  try {
    const supabase = createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    // 1. Payments received on selectedDate
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_method, created_at, booking_id, bookings(guest_name, room_id, rooms(room_number))')
      .eq('property_id', propertyId)
      .eq('payment_date', selectedDate);

    // Fallback to bookings checked in on selectedDate if payments table has no records for that date
    let formattedPayments: DateDrilldownData['payments'] = [];
    let totalCashReceived = 0;
    let totalUpiReceived = 0;

    if (payments && payments.length > 0) {
      formattedPayments = payments.map((p: any) => {
        const amt = Number(p.amount) || 0;
        const isCash = p.payment_method?.toLowerCase().includes('cash');
        if (isCash) totalCashReceived += amt;
        else totalUpiReceived += amt;

        return {
          id: p.id,
          guest_name: p.bookings?.guest_name || 'Guest Payment',
          room_number: p.bookings?.rooms?.room_number || 'PG Room',
          amount: amt,
          payment_method: p.payment_method || 'UPI',
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

    // 2. Expenses incurred on selectedDate
    const { data: expenses } = await supabase
      .from('timestamped_expenses')
      .select('*')
      .eq('property_id', propertyId)
      .eq('business_date', selectedDate)
      .order('expense_timestamp', { ascending: true });

    let totalCashExpenses = 0;
    let totalUpiExpenses = 0;

    const formattedExpenses = (expenses || []).map(e => {
      const amt = Number(e.amount) || 0;
      if (e.payment_method === 'Cash') totalCashExpenses += amt;
      else totalUpiExpenses += amt;

      return {
        id: e.id,
        title: e.title,
        category: e.category,
        amount: amt,
        payment_method: e.payment_method,
        timestamp: e.expense_timestamp ? new Date(e.expense_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : selectedDate
      };
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
