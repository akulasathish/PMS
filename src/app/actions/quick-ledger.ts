"use server";

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseQuickLedgerText, QuickLedgerItem } from '@/lib/quick-ledger-parser';

export interface QuickLedgerDueItem {
  bookingId: string;
  guestName: string;
  roomNumber: string;
  monthlyRent: number;
  paid: number;
  due: number;
  dueDay: number;
}

export interface QuickLedgerResult {
  success: boolean;
  type?: 'revenue' | 'expense' | 'assign' | 'dues_report' | 'today_summary';
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

  // Assign specific
  monthlyRent?: number;
  dueDay?: number;
  sharing?: number;

  // Dues report specific
  totalDues?: number;
  duesCount?: number;
  duesList?: QuickLedgerDueItem[];

  // Today summary specific
  todayRevenue?: number;
  todayExpense?: number;
  todayNet?: number;
  todayRevenueCount?: number;
  todayExpenseCount?: number;
  todayDateStr?: string;
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
    // EXECUTE PENDING DUES REPORT
    // ==========================================
    if (parsed.type === 'dues_report') {
      const [bookingsRes, roomsRes, paymentsRes, incidentalsRes] = await Promise.all([
        admin
          .from('bookings')
          .select('id, guest_name, room_id, status, is_monthly, monthly_rent, monthly_rate, total_amount, rent_due_day, check_in')
          .eq('property_id', activePropertyId)
          .in('status', ['Checked In', 'Confirmed', 'in_house']),
        admin
          .from('rooms')
          .select('id, room_number')
          .eq('property_id', activePropertyId),
        admin
          .from('payments')
          .select('booking_id, amount, allocation, is_void')
          .eq('property_id', activePropertyId),
        admin
          .from('incidental_charges')
          .select('booking_id, amount, description')
          .eq('property_id', activePropertyId)
      ]);

      if (bookingsRes.error) {
        return { success: false, message: `Database error querying bookings: ${bookingsRes.error.message}` };
      }

      const bookings = bookingsRes.data || [];
      const rooms = roomsRes.data || [];
      const payments = paymentsRes.data || [];
      const incidentals = incidentalsRes.data || [];

      const roomMap = new Map(rooms.map(r => [r.id, r.room_number?.toString() || '']));

      // Group payments by booking_id (excluding deposits)
      const rentPaymentsByBooking = new Map<string, number>();
      for (const p of payments) {
        if (!p.is_void && (p.allocation === 'Rent' || !p.allocation)) {
          rentPaymentsByBooking.set(
            p.booking_id,
            (rentPaymentsByBooking.get(p.booking_id) || 0) + Number(p.amount || 0)
          );
        }
      }

      // Group incidentals by booking_id (excluding deposit charges)
      const incidentalsByBooking = new Map<string, number>();
      for (const inc of incidentals) {
        if (!inc.description?.startsWith('Security Deposit')) {
          incidentalsByBooking.set(
            inc.booking_id,
            (incidentalsByBooking.get(inc.booking_id) || 0) + Number(inc.amount || 0)
          );
        }
      }

      const duesList: QuickLedgerDueItem[] = [];

      for (const b of bookings) {
        const roomDisp = roomMap.get(b.room_id) || 'Unknown';
        const monthlyRent = Number(b.monthly_rent || b.monthly_rate || (b.is_monthly ? 0 : b.total_amount) || 0);
        const incAmt = incidentalsByBooking.get(b.id) || 0;
        const totalCharged = monthlyRent + incAmt;
        const rentPaid = rentPaymentsByBooking.get(b.id) || 0;
        const due = Math.max(0, totalCharged - rentPaid);
        const checkInDay = b.check_in ? parseInt(b.check_in.split('-')[2], 10) : 1;
        const dueDay = (b as any).rent_due_day || (b as any).billing_cycle_date || checkInDay;

        if (due > 0.01) {
          duesList.push({
            bookingId: b.id,
            guestName: b.guest_name || 'Guest',
            roomNumber: roomDisp,
            monthlyRent,
            paid: rentPaid,
            due,
            dueDay
          });
        }
      }

      // Sort by due amount descending
      duesList.sort((a, b) => b.due - a.due);

      const totalDues = duesList.reduce((sum, item) => sum + item.due, 0);

      return {
        success: true,
        type: 'dues_report',
        totalDues,
        duesCount: duesList.length,
        duesList,
        message: duesList.length === 0
          ? '🎉 All active tenants are cleared till date! No pending dues.'
          : `Found ${duesList.length} tenant(s) with pending dues totaling ₹${totalDues.toLocaleString('en-IN')}.`
      };
    }

    // ==========================================
    // EXECUTE TODAY SUMMARY / HISTORY
    // ==========================================
    if (parsed.type === 'today_summary') {
      const [paymentsRes, expensesRes] = await Promise.all([
        admin
          .from('payments')
          .select('amount, allocation, method, is_void')
          .eq('property_id', activePropertyId)
          .eq('business_date', businessDate),
        admin
          .from('expenses')
          .select('amount, description, category')
          .eq('property_id', activePropertyId)
          .eq('business_date', businessDate)
      ]);

      const validPayments = (paymentsRes.data || []).filter(p => !p.is_void);
      const todayRevenue = validPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const expenses = expensesRes.data || [];
      const todayExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const todayNet = todayRevenue - todayExpense;

      return {
        success: true,
        type: 'today_summary',
        todayRevenue,
        todayExpense,
        todayNet,
        todayRevenueCount: validPayments.length,
        todayExpenseCount: expenses.length,
        todayDateStr: businessDate,
        message: `Today's Summary (${businessDate}): Collected ₹${todayRevenue.toLocaleString('en-IN')}, Spent ₹${todayExpense.toLocaleString('en-IN')}. Net: ₹${todayNet.toLocaleString('en-IN')}.`
      };
    }

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
    // EXECUTE ASSIGN (NEW TENANT ADMISSION)
    // ==========================================
    if (parsed.type === 'assign') {
      const { tenantName, roomNumber, monthlyRent, advAmount, sharing, dueDay } = parsed;

      if (!tenantName) {
        return {
          success: false,
          message: 'Please specify tenant name. Example: "assign ravi room 201 rent 8000 adv 2000"'
        };
      }

      if (!roomNumber) {
        return {
          success: false,
          message: `Please specify which room to assign ${tenantName} to. Example: "add ${tenantName} to room 201 3 share 9000 room fee and 2k advance"`
        };
      }

      // 1. Fetch room from inventory
      const { data: targetRoom, error: roomErr } = await admin
        .from('rooms')
        .select('id, room_number, sharing_capacity')
        .eq('property_id', activePropertyId)
        .ilike('room_number', roomNumber)
        .maybeSingle();

      if (roomErr || !targetRoom) {
        return {
          success: false,
          message: `Could not find Room "${roomNumber}" in this property inventory.`
        };
      }

      // 2. Check room capacity
      const { data: activeInRoom } = await admin
        .from('bookings')
        .select('id, guest_name, monthly_rent, monthly_rate')
        .eq('room_id', targetRoom.id)
        .in('status', ['Checked In', 'Confirmed', 'in_house']);

      const cap = Number(targetRoom.sharing_capacity || 4);
      if (activeInRoom && activeInRoom.length >= cap) {
        return {
          success: false,
          message: `Room ${roomNumber} is at maximum capacity (${activeInRoom.length}/${cap} beds occupied: ${activeInRoom.map(b => b.guest_name).join(', ')}).`
        };
      }

      // 3. Resolve monthly rent (if not specified, inherit from roommate or default to 8,000)
      let effectiveMonthlyRent = monthlyRent;
      if (!effectiveMonthlyRent || effectiveMonthlyRent <= 0) {
        const roommateWithRent = (activeInRoom || []).find(b => Number(b.monthly_rent || b.monthly_rate || 0) > 0);
        if (roommateWithRent) {
          effectiveMonthlyRent = Number(roommateWithRent.monthly_rent || roommateWithRent.monthly_rate);
        } else {
          effectiveMonthlyRent = 8000;
        }
      }

      // 4. Calculate dates
      const [inYear, inMonth, inDay] = businessDate.split('-').map(Number);
      const checkOut = `${inYear + 1}-${String(inMonth).padStart(2, '0')}-${String(inDay).padStart(2, '0')}`;
      const finalDueDay = dueDay || inDay;
      const deposit = advAmount || 0;
      const formattedName = tenantName.charAt(0).toUpperCase() + tenantName.slice(1);

      // 5. Create booking with custom rent and sharing notes
      const { data: newBooking, error: bookErr } = await admin
        .from('bookings')
        .insert([{
          property_id: activePropertyId,
          room_id: targetRoom.id,
          guest_name: formattedName,
          check_in: businessDate,
          check_out: checkOut,
          amount: deposit,
          total_amount: deposit,
          status: 'Checked In',
          is_monthly: true,
          rent_due_day: finalDueDay,
          billing_cycle_date: finalDueDay,
          monthly_rent: effectiveMonthlyRent,
          monthly_rate: effectiveMonthlyRent,
          security_deposit: deposit,
          notes: sharing ? `${sharing}-share bed` : undefined
        }])
        .select()
        .single();

      if (bookErr || !newBooking) {
        return {
          success: false,
          message: `Failed to assign tenant: ${bookErr?.message || 'Database error'}`
        };
      }

      // 6. If advance / deposit paid, record payment
      const paymentIds: string[] = [];
      if (deposit > 0) {
        const { data: payData } = await admin
          .from('payments')
          .insert([{
            booking_id: newBooking.id,
            property_id: activePropertyId,
            amount: deposit,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Security Deposit',
            transaction_id: 'PREPAID-DEPOSIT-AT-CREATION',
            business_date: businessDate
          }])
          .select('id')
          .single();

        if (payData) {
          paymentIds.push(payData.id);
        }
      }

      return {
        success: true,
        type: 'assign',
        tenantName: formattedName,
        roomNumber: targetRoom.room_number,
        monthlyRent: effectiveMonthlyRent,
        advPaid: deposit,
        dueDay: finalDueDay,
        sharing: sharing || undefined,
        bookingId: newBooking.id,
        paymentIds,
        message: `Assigned ${formattedName} to Room ${targetRoom.room_number}! ${sharing ? sharing + '-Share Bed • ' : ''}Rent: ₹${effectiveMonthlyRent.toLocaleString('en-IN')}/mo, Deposit: ₹${deposit.toLocaleString('en-IN')}, Rent due: ${finalDueDay}th of every month.`
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

      // Fetch active bookings in this property (query bookings and rooms separately to prevent relationship ambiguity)
      const [bookingsRes, roomsRes] = await Promise.all([
        admin
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
            rent_due_day,
            check_in
          `)
          .eq('property_id', activePropertyId)
          .in('status', ['Checked In', 'Confirmed', 'in_house']),
        admin
          .from('rooms')
          .select('id, room_number')
          .eq('property_id', activePropertyId)
      ]);

      if (bookingsRes.error) {
        return { success: false, message: `Database error querying bookings: ${bookingsRes.error.message}` };
      }

      const bookings = bookingsRes.data || [];
      const rooms = roomsRes.data || [];

      if (bookings.length === 0) {
        return { success: false, message: 'No active bookings found in this property.' };
      }

      // Map room numbers to bookings
      const roomMap = new Map(rooms.map(r => [r.id, r.room_number?.toString() || '']));
      const enrichedBookings = bookings.map(b => ({
        ...b,
        room_number: roomMap.get(b.room_id) || ''
      }));

      // Match booking by Room and/or Tenant Name
      let matchedBooking = null;

      if (roomNumber && tenantName) {
        matchedBooking = enrichedBookings.find(b => {
          const rNum = b.room_number.toLowerCase();
          const gName = (b.guest_name || '').toLowerCase();
          return rNum === roomNumber.toLowerCase() && gName.includes(tenantName.toLowerCase());
        });
      }

      if (!matchedBooking && roomNumber) {
        matchedBooking = enrichedBookings.find(b => {
          const rNum = b.room_number.toLowerCase();
          return rNum === roomNumber.toLowerCase();
        });
      }

      if (!matchedBooking && tenantName) {
        matchedBooking = enrichedBookings.find(b => {
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

      const roomDisp = matchedBooking.room_number || roomNumber || 'Unknown';

      // ============================================================
      // GUARDRAIL: Prevent false rent collections if cleared till date
      // ============================================================
      const [allPaymentsRes, allIncidentalsRes] = await Promise.all([
        admin.from('payments').select('amount, allocation, is_void').eq('booking_id', matchedBooking.id),
        admin.from('incidental_charges').select('amount, description').eq('booking_id', matchedBooking.id)
      ]);

      const validPayments = (allPaymentsRes.data || []).filter(p => !p.is_void);
      const rentPaidBeforeThis = validPayments
        .filter(p => p.allocation === 'Rent' || !p.allocation)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const incidentalsSum = (allIncidentalsRes.data || [])
        .filter(inc => !inc.description?.startsWith('Security Deposit'))
        .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

      const baseRoomCharge = matchedBooking.is_monthly
        ? Number(matchedBooking.monthly_rent || matchedBooking.monthly_rate || 0)
        : Number(matchedBooking.total_amount || 0);

      const currentBalanceDue = Math.max(0, (baseRoomCharge + incidentalsSum) - rentPaidBeforeThis);

      // Extract day-of-month for due date check
      const checkInDay = matchedBooking.check_in ? parseInt(matchedBooking.check_in.split('-')[2], 10) : 1;
      const dueDay = (matchedBooking as any).rent_due_day || (matchedBooking as any).billing_cycle_date || checkInDay;
      const todayDay = parseInt(businessDate.split('-')[2], 10);

      // If tenant has ₹0 pending rent due, today is before their rent due day, and user entered room rent (feeAmount > 0)
      if (feeAmount > 0 && currentBalanceDue <= 0.01 && todayDay < dueDay) {
        return {
          success: false,
          message: `⚠️ ${matchedBooking.guest_name} (Room ${roomDisp}) has ₹0 pending rent due! Rent is already cleared till date (Next rent due date: ${dueDay}th). If this payment is for security deposit or advance, please specify 'adv' (e.g. "${matchedBooking.guest_name} ${roomDisp} ${feeAmount} adv").`
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
      const newRentPaid = rentPaidBeforeThis + feeAmount;
      const newBalanceDue = Math.max(0, (baseRoomCharge + incidentalsSum) - newRentPaid);

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
  type: 'revenue' | 'expense' | 'assign';
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

    if (payload.type === 'assign') {
      if (payload.ids && payload.ids.length > 0) {
        await admin.from('payments').delete().in('id', payload.ids);
      }
      if (payload.bookingId) {
        const { error: delErr } = await admin.from('bookings').delete().eq('id', payload.bookingId);
        if (delErr) return { success: false, message: delErr.message };
      }
      return { success: true, message: 'Tenant assignment undone successfully.' };
    }

    return { success: false, message: 'Nothing to undo.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to undo action.' };
  }
}
