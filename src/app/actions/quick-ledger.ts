"use server";

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseQuickLedgerText, QuickLedgerItem } from '@/lib/quick-ledger-parser';

export interface QuickLedgerResult {
  success: boolean;
  type?: 'revenue' | 'expense';
  message: string;
  error?: string;
  
  // Revenue specific
  tenantName?: string;
  roomNumber?: string;
  feePaid?: number;
  advPaid?: number;
  totalPaid?: number;
  newBalanceDue?: number;
  paymentIds?: string[];
  bookingId?: string;
  advAmountAdded?: number;

  // Expense specific
  items?: QuickLedgerItem[];
  totalExpense?: number;
  expenseIds?: string[];
}

export async function processQuickLedger(input: string, propertyId?: string): Promise<QuickLedgerResult> {
  try {
    const admin = getSupabaseAdmin();

    // 1. Resolve property ID if not provided
    let activePropertyId = propertyId;
    if (!activePropertyId) {
      const { data: props } = await admin.from('properties').select('id').limit(1);
      if (props && props.length > 0) {
        activePropertyId = props[0].id;
      }
    }

    if (!activePropertyId) {
      return { success: false, message: 'Property ID not found. Please select an active property.' };
    }

    // 2. Fetch business date
    const { data: bDateSetting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'business_date')
      .maybeSingle();

    const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const businessDate = bDateSetting?.value || todayDate;

    // 3. Parse input
    const parsed = parseQuickLedgerText(input);

    // ==========================================
    // EXECUTE EXPENSE
    // ==========================================
    if (parsed.type === 'expense') {
      if (!parsed.items || parsed.items.length === 0) {
        return {
          success: false,
          message: 'Could not extract amounts from expense input. Example: "expences 700 vegitbales 200 oil"'
        };
      }

      const rowsToInsert = parsed.items.map(item => ({
        property_id: activePropertyId,
        description: item.description,
        category: item.category,
        amount: item.amount,
        payment_method: 'Cash',
        method: 'Cash',
        date: businessDate,
        business_date: businessDate
      }));

      const { data: inserted, error: insertError } = await admin
        .from('expenses')
        .insert(rowsToInsert)
        .select('id, amount, description, category');

      if (insertError) {
        return { success: false, message: `Failed to save expenses: ${insertError.message}` };
      }

      const totalExpense = parsed.items.reduce((sum, item) => sum + item.amount, 0);
      const expenseIds = (inserted || []).map(r => r.id);

      return {
        success: true,
        type: 'expense',
        items: inserted || parsed.items,
        totalExpense,
        expenseIds,
        message: `Recorded ${parsed.items.length} expense(s) totaling ₹${totalExpense.toLocaleString('en-IN')}`
      };
    }

    // ==========================================
    // EXECUTE REVENUE
    // ==========================================
    if (parsed.type === 'revenue') {
      const { roomNumber, tenantName, feeAmount, advAmount, totalAmount } = parsed;

      if (totalAmount <= 0) {
        return {
          success: false,
          message: 'Could not detect payment amount. Example: "sathish 101 5000 rom fee and 2000 adv paid"'
        };
      }

      // Fetch active bookings in this property
      const { data: bookings, error: bookingsError } = await admin
        .from('bookings')
        .select(`
          id,
          guest_name,
          room_id,
          status,
          is_monthly,
          monthly_rent,
          monthly_rate,
          security_deposit,
          total_amount,
          rooms ( id, room_number )
        `)
        .eq('property_id', activePropertyId)
        .in('status', ['Checked In', 'Confirmed', 'in_house']);

      if (bookingsError) {
        return { success: false, message: `Database error querying bookings: ${bookingsError.message}` };
      }

      if (!bookings || bookings.length === 0) {
        return { success: false, message: 'No active bookings found in this property.' };
      }

      // Match booking by Room and/or Tenant Name
      let matchedBooking = null;

      if (roomNumber && tenantName) {
        matchedBooking = bookings.find(b => {
          const rNum = (b.rooms as any)?.room_number?.toString()?.toLowerCase();
          const gName = (b.guest_name || '').toLowerCase();
          return rNum === roomNumber.toLowerCase() && gName.includes(tenantName.toLowerCase());
        });
      }

      if (!matchedBooking && roomNumber) {
        matchedBooking = bookings.find(b => {
          const rNum = (b.rooms as any)?.room_number?.toString()?.toLowerCase();
          return rNum === roomNumber.toLowerCase();
        });
      }

      if (!matchedBooking && tenantName) {
        matchedBooking = bookings.find(b => {
          const gName = (b.guest_name || '').toLowerCase();
          return gName.includes(tenantName.toLowerCase());
        });
      }

      if (!matchedBooking) {
        return {
          success: false,
          message: `Could not find active tenant matching "${tenantName || ''}"${roomNumber ? ' in Room ' + roomNumber : ''}. Please check the room number or name.`
        };
      }

      const paymentRows: any[] = [];
      const paymentIds: string[] = [];

      // 1. Room Fee payment
      if (feeAmount > 0) {
        paymentRows.push({
          booking_id: matchedBooking.id,
          property_id: activePropertyId,
          amount: feeAmount,
          method: 'UPI',
          payment_method: 'UPI',
          allocation: 'Rent',
          business_date: businessDate,
          transaction_id: 'QUICK-LEDGER-FEE'
        });
      }

      // 2. Advance / Deposit payment
      if (advAmount > 0) {
        paymentRows.push({
          booking_id: matchedBooking.id,
          property_id: activePropertyId,
          amount: advAmount,
          method: 'UPI',
          payment_method: 'UPI',
          allocation: 'Security Deposit',
          business_date: businessDate,
          transaction_id: 'QUICK-LEDGER-ADV'
        });
      }

      if (paymentRows.length > 0) {
        const { data: insertedPayments, error: payError } = await admin
          .from('payments')
          .insert(paymentRows)
          .select('id');

        if (payError) {
          return { success: false, message: `Failed to record payment: ${payError.message}` };
        }

        if (insertedPayments) {
          paymentIds.push(...insertedPayments.map(p => p.id));
        }
      }

      // If advance amount was paid, update the booking's security_deposit
      if (advAmount > 0) {
        const currentDeposit = Number(matchedBooking.security_deposit || 0);
        await admin
          .from('bookings')
          .update({ security_deposit: currentDeposit + advAmount })
          .eq('id', matchedBooking.id);
      }

      // Recalculate remaining due
      const { data: allPayments } = await admin
        .from('payments')
        .select('amount, allocation')
        .eq('booking_id', matchedBooking.id);

      const rentPaid = (allPayments || [])
        .filter(p => p.allocation !== 'Security Deposit')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const roomCharge = matchedBooking.is_monthly
        ? Number(matchedBooking.monthly_rent || matchedBooking.monthly_rate || 0)
        : Number(matchedBooking.total_amount || 0);

      const newBalanceDue = Math.max(0, roomCharge - rentPaid);
      const roomDisp = (matchedBooking.rooms as any)?.room_number || roomNumber || 'Unknown';

      return {
        success: true,
        type: 'revenue',
        tenantName: matchedBooking.guest_name,
        roomNumber: roomDisp,
        feePaid: feeAmount,
        advPaid: advAmount,
        totalPaid: totalAmount,
        newBalanceDue,
        paymentIds,
        bookingId: matchedBooking.id,
        advAmountAdded: advAmount,
        message: `Recorded payment for ${matchedBooking.guest_name} (Room ${roomDisp}): ₹${feeAmount.toLocaleString('en-IN')} Room Fee${advAmount > 0 ? ' + ₹' + advAmount.toLocaleString('en-IN') + ' Advance' : ''}. Updated Pending Due: ₹${newBalanceDue.toLocaleString('en-IN')}`
      };
    }

    return {
      success: false,
      message: 'Could not process message. Please specify either an expense (e.g., "expences 700 vegitbales") or revenue (e.g., "sathish 101 5000 rom fee").'
    };
  } catch (err: any) {
    console.error('Quick ledger error:', err);
    return { success: false, message: err.message || 'Internal server error processing quick ledger.' };
  }
}

export async function undoQuickLedgerAction(payload: {
  type: 'revenue' | 'expense';
  ids: string[];
  bookingId?: string;
  advAmountAdded?: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const admin = getSupabaseAdmin();

    if (payload.type === 'expense' && payload.ids && payload.ids.length > 0) {
      const { error } = await admin.from('expenses').delete().in('id', payload.ids);
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Expense entry undone successfully.' };
    }

    if (payload.type === 'revenue' && payload.ids && payload.ids.length > 0) {
      const { error } = await admin.from('payments').delete().in('id', payload.ids);
      if (error) return { success: false, message: error.message };

      if (payload.bookingId && payload.advAmountAdded && payload.advAmountAdded > 0) {
        const { data: b } = await admin.from('bookings').select('security_deposit').eq('id', payload.bookingId).single();
        if (b) {
          const restoredDeposit = Math.max(0, Number(b.security_deposit || 0) - payload.advAmountAdded);
          await admin.from('bookings').update({ security_deposit: restoredDeposit }).eq('id', payload.bookingId);
        }
      }

      return { success: true, message: 'Payment entry undone successfully.' };
    }

    return { success: false, message: 'Nothing to undo.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to undo action.' };
  }
}
