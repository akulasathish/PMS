"use server";

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseQuickLedgerText, QuickLedgerItem, isResidentNameMatch } from '@/lib/quick-ledger-parser';

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
  type?: 'revenue' | 'expense' | 'assign' | 'dues_report' | 'today_summary' | 'update_tenant' | 'checkout';
  message: string;
  error?: string;
  
  // Checkout specific
  hasPendingDues?: boolean;
  pendingDues?: number;
  isForce?: boolean;
  
  // Revenue specific
  tenantName?: string;
  roomNumber?: string;
  feePaid?: number;
  advPaid?: number;
  maintenancePaid?: number;
  totalPaid?: number;
  newBalanceDue?: number;
  paymentIds?: string[];
  bookingId?: string;
  advAmountAdded?: number;
  paymentDate?: string;

  // Expense specific
  items?: QuickLedgerItem[];
  totalExpense?: number;
  expenseIds?: string[];

  // Assign / Update specific
  monthlyRent?: number;
  dueDay?: number;
  sharing?: number;
  checkInDate?: string;
  checkOutDate?: string;
  maintenanceFee?: number;
  refundableDeposit?: number;
  isDaily?: boolean;
  stayDays?: number;
  perDayRate?: number;
  totalTariff?: number;
  paidAmount?: number;
  prevValues?: {
    checkIn?: string;
    dueDay?: number;
    monthlyRent?: number;
  };

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
      const {
        tenantName,
        roomNumber,
        monthlyRent,
        rentPaid: parsedRentPaid,
        advAmount,
        refundableDeposit: parsedRefundable,
        maintenanceFee: parsedMaintenance,
        sharing,
        checkInDate: parsedCheckIn,
        dueDay
      } = parsed as any;

      if (!tenantName) {
        return {
          success: false,
          message: 'Please specify tenant name. Example: "201 srikanth 9000 joined on 1st october 1000 maintainance and 1500 refundable ammount"'
        };
      }

      // 0. Check if this is a payment log for an ALREADY ACTIVE resident
      const isPaymentIntent = /\b(?:paid|sent)\b/i.test(input) || (parsedRentPaid && parsedRentPaid > 0);
      let existingBooking: any = null;

      if (tenantName) {
        const [bookingsRes, roomsRes] = await Promise.all([
          admin
            .from('bookings')
            .select('id, guest_name, room_id, security_deposit, notes, check_in, rent_due_day, monthly_rent, monthly_rate')
            .eq('property_id', activePropertyId)
            .in('status', ['Checked In', 'Confirmed', 'in_house']),
          admin
            .from('rooms')
            .select('id, room_number')
            .eq('property_id', activePropertyId)
        ]);

        const rooms = roomsRes.data || [];
        const roomMap = new Map(rooms.map(r => [r.id, r.room_number?.toString() || '']));
        const enriched = (bookingsRes.data || []).map(b => ({
          ...b,
          room_number: roomMap.get(b.room_id) || ''
        }));

        existingBooking = enriched.find(b => {
          const roomMatch = !roomNumber ||
            b.room_number.toLowerCase() === roomNumber.toLowerCase() ||
            b.room_number.toLowerCase().includes(roomNumber.toLowerCase());
          return roomMatch && isResidentNameMatch(b.guest_name, tenantName);
        });
      }

      if (existingBooking && isPaymentIntent) {
        // Log payments directly for existing resident
        const effectivePaymentDate = parsedCheckIn || businessDate;
        const paymentRows: any[] = [];
        const paymentIds: string[] = [];
        const feeAmount = Number(parsedRentPaid || monthlyRent || 0);
        const maintenanceFee = Number(parsedMaintenance || 0);
        const refundableDeposit = Number(parsedRefundable || advAmount || 0);

        if (feeAmount > 0) {
          paymentRows.push({
            booking_id: existingBooking.id,
            property_id: activePropertyId,
            amount: feeAmount,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Rent',
            business_date: effectivePaymentDate,
            transaction_id: 'QUICK-LEDGER-RENT'
          });
        }

        if (maintenanceFee > 0) {
          await admin
            .from('incidental_charges')
            .insert([{
              booking_id: existingBooking.id,
              property_id: activePropertyId,
              description: 'Non-Refundable Maintenance Fee',
              amount: maintenanceFee,
              category: 'Maintenance',
              business_date: effectivePaymentDate
            }]);

          paymentRows.push({
            booking_id: existingBooking.id,
            property_id: activePropertyId,
            amount: maintenanceFee,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Maintenance Fee (Revenue)',
            business_date: effectivePaymentDate,
            transaction_id: 'QUICK-LEDGER-MAINTENANCE'
          });
        }

        if (refundableDeposit > 0) {
          paymentRows.push({
            booking_id: existingBooking.id,
            property_id: activePropertyId,
            amount: refundableDeposit,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Security Deposit',
            business_date: effectivePaymentDate,
            transaction_id: 'QUICK-LEDGER-DEPOSIT'
          });

          await admin
            .from('bookings')
            .update({
              security_deposit: Number(existingBooking.security_deposit || 0) + refundableDeposit
            })
            .eq('id', existingBooking.id);
        }

        if (paymentRows.length > 0) {
          const { data: inserted } = await admin
            .from('payments')
            .insert(paymentRows)
            .select('id');

          if (inserted) {
            paymentIds.push(...inserted.map(p => p.id));
          }
        }

        const totalLogged = feeAmount + maintenanceFee + refundableDeposit;
        const roomDisp = (existingBooking.rooms as any)?.room_number || roomNumber || 'Unknown';
        return {
          success: true,
          type: 'revenue',
          tenantName: existingBooking.guest_name,
          roomNumber: roomDisp,
          feePaid: feeAmount,
          advPaid: refundableDeposit,
          totalPaid: totalLogged,
          paymentIds,
          message: `Recorded payment for ${existingBooking.guest_name} (Room ${roomDisp}): Room Rent: ₹${feeAmount.toLocaleString('en-IN')} • Maintenance: ₹${maintenanceFee.toLocaleString('en-IN')} • Refundable Deposit: ₹${refundableDeposit.toLocaleString('en-IN')}. Total paid: ₹${totalLogged.toLocaleString('en-IN')} on ${effectivePaymentDate}.`
        };
      }

      if (!roomNumber) {
        return {
          success: false,
          message: `Please specify which room to assign ${tenantName} to. Example: "201 ${tenantName} 9000 joined on 1st october 1000 maintainance and 1500 refundable ammount"`
        };
      }

      // 1. Fetch room from inventory
      const { data: allRooms } = await admin
        .from('rooms')
        .select('id, room_number, sharing_capacity')
        .eq('property_id', activePropertyId);

      const targetRoom = (allRooms || []).find(r => {
        const rNum = (r.room_number || '').toString().toLowerCase().trim();
        const searchNum = roomNumber.toLowerCase().trim();
        return rNum === searchNum ||
               rNum.includes(searchNum) ||
               rNum.replace(/[^a-z0-9]/g, '') === searchNum.replace(/[^a-z0-9]/g, '');
      });

      if (!targetRoom) {
        return {
          success: false,
          message: `Could not find Room "${roomNumber}" in this property inventory.`
        };
      }

      // 2. Check room occupants and prevent duplicate tenant creation
      const { data: activeInRoom } = await admin
        .from('bookings')
        .select('id, guest_name, monthly_rent, monthly_rate, security_deposit, notes, check_in, rent_due_day')
        .eq('room_id', targetRoom.id)
        .in('status', ['Checked In', 'Confirmed', 'in_house']);

      const matchingResidents = (activeInRoom || []).filter(b => isResidentNameMatch(b.guest_name, tenantName));
      const existingResident = matchingResidents[0];

      if (existingResident) {
        // Resident already exists in this room! Update their profile instead of creating a duplicate booking!
        const effectiveCheckIn = parsedCheckIn || existingResident.check_in || businessDate;
        const [inYear, inMonth, inDay] = effectiveCheckIn.split('-').map(Number);
        const checkOut = `${inYear + 1}-${String(inMonth).padStart(2, '0')}-${String(inDay).padStart(2, '0')}`;
        const finalDueDay = dueDay || existingResident.rent_due_day || inDay;
        const effectiveMonthlyRent = monthlyRent || Number(existingResident.monthly_rent || existingResident.monthly_rate || 8000);
        const maintenanceFee = parsedMaintenance || 0;
        const refundableDeposit = parsedRefundable || advAmount || Number(existingResident.security_deposit || 0);
        const formattedName = tenantName.charAt(0).toUpperCase() + tenantName.slice(1);

        // If older duplicate bookings exist for this same person in this room, cancel the extra duplicates
        if (matchingResidents.length > 1) {
          const duplicateIds = matchingResidents.slice(1).map(b => b.id);
          await admin
            .from('bookings')
            .update({ status: 'Cancelled', notes: 'Auto-merged duplicate resident record' })
            .in('id', duplicateIds);
        }

        const noteParts: string[] = [];
        if (sharing) noteParts.push(`${sharing}-Share Bed`);
        if (maintenanceFee > 0) noteParts.push(`Maintenance: ₹${maintenanceFee.toLocaleString('en-IN')}`);
        if (refundableDeposit > 0) noteParts.push(`Refundable: ₹${refundableDeposit.toLocaleString('en-IN')}`);
        const bookingNotes = noteParts.join(' • ') || existingResident.notes;

        await admin
          .from('bookings')
          .update({
            guest_name: formattedName,
            check_in: parsedCheckIn ? effectiveCheckIn : undefined,
            check_out: parsedCheckIn ? checkOut : undefined,
            rent_due_day: finalDueDay,
            billing_cycle_date: finalDueDay,
            monthly_rent: effectiveMonthlyRent,
            monthly_rate: effectiveMonthlyRent,
            security_deposit: refundableDeposit,
            notes: bookingNotes
          })
          .eq('id', existingResident.id);

        const paymentIds: string[] = [];
        const rentPaid = Number(parsedRentPaid || 0);

        // Check existing payments to prevent duplicate payments on repeated updates
        const { data: existingPayments } = await admin
          .from('payments')
          .select('id, allocation, amount')
          .eq('booking_id', existingResident.id);

        const existingRentPaid = (existingPayments || [])
          .filter(p => p.allocation === 'Rent')
          .reduce((s, p) => s + Number(p.amount || 0), 0);

        const hasMaintPayment = (existingPayments || []).some(p => p.allocation === 'Maintenance Fee (Revenue)');
        const hasDepPayment = (existingPayments || []).some(p => p.allocation === 'Security Deposit');

        // Only insert rent difference if user provided rentPaid and it exceeds already recorded rent
        const rentDifference = rentPaid > existingRentPaid ? rentPaid - existingRentPaid : (existingRentPaid === 0 ? rentPaid : 0);

        if (rentDifference > 0) {
          const { data: rentPay } = await admin.from('payments').insert([{
            booking_id: existingResident.id,
            property_id: activePropertyId,
            amount: rentDifference,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Rent',
            transaction_id: 'RENT-PAID-AT-UPDATE',
            business_date: effectiveCheckIn
          }]).select('id').single();
          if (rentPay) paymentIds.push(rentPay.id);
        }

        if (maintenanceFee > 0 && !hasMaintPayment) {
          await admin.from('incidental_charges').insert([{
            booking_id: existingResident.id,
            property_id: activePropertyId,
            description: 'Non-Refundable Maintenance Fee',
            amount: maintenanceFee,
            category: 'Maintenance',
            business_date: effectiveCheckIn
          }]);
          const { data: maintPay } = await admin.from('payments').insert([{
            booking_id: existingResident.id,
            property_id: activePropertyId,
            amount: maintenanceFee,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Maintenance Fee (Revenue)',
            transaction_id: 'MAINTENANCE-FEE-AT-UPDATE',
            business_date: effectiveCheckIn
          }]).select('id').single();
          if (maintPay) paymentIds.push(maintPay.id);
        }

        if (refundableDeposit > 0 && (!hasDepPayment || refundableDeposit !== Number(existingResident.security_deposit || 0))) {
          const { data: depPay } = await admin.from('payments').insert([{
            booking_id: existingResident.id,
            property_id: activePropertyId,
            amount: refundableDeposit,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Security Deposit',
            transaction_id: 'REFUNDABLE-DEPOSIT-AT-UPDATE',
            business_date: effectiveCheckIn
          }]).select('id').single();
          if (depPay) paymentIds.push(depPay.id);
        }

        const totalRentPaid = Math.max(rentPaid, existingRentPaid);
        const totalAdvance = refundableDeposit + maintenanceFee;
        const rentStatusText = totalRentPaid > 0 
          ? `Rent: ₹${effectiveMonthlyRent.toLocaleString('en-IN')}/mo (Paid: ₹${totalRentPaid.toLocaleString('en-IN')})` 
          : `Rent: ₹${effectiveMonthlyRent.toLocaleString('en-IN')}/mo (Due: ₹${effectiveMonthlyRent.toLocaleString('en-IN')})`;

        return {
          success: true,
          type: 'assign',
          tenantName: formattedName,
          roomNumber: targetRoom.room_number,
          monthlyRent: effectiveMonthlyRent,
          advPaid: totalAdvance,
          refundableDeposit,
          maintenanceFee,
          feePaid: totalRentPaid,
          dueDay: finalDueDay,
          sharing: sharing || undefined,
          checkInDate: effectiveCheckIn,
          bookingId: existingResident.id,
          paymentIds,
          message: `Updated existing resident ${formattedName} in Room ${targetRoom.room_number}! Joined: ${effectiveCheckIn} • ${rentStatusText} • Maintenance: ₹${maintenanceFee.toLocaleString('en-IN')} (Paid) • Refundable: ₹${refundableDeposit.toLocaleString('en-IN')}.`
        };
      }

      const cap = Number(targetRoom.sharing_capacity || 4);
      if (activeInRoom && activeInRoom.length >= cap) {
        return {
          success: false,
          message: `Room ${roomNumber} is at maximum capacity (${activeInRoom.length}/${cap} beds occupied: ${activeInRoom.map(b => b.guest_name).join(', ')}).`
        };
      }

      // ==========================================
      // 2b. IF DAILY BASIS GUEST (SHORT STAY)
      // ==========================================
      const isDaily = Boolean((parsed as any).isDaily);
      if (isDaily) {
        const stayDays = (parsed as any).stayDays || 1;
        const perDayRate = (parsed as any).perDayRate || 0;
        const totalAmount = (parsed as any).totalAmount || (stayDays * perDayRate);
        const paidAmount = (parsed as any).paidAmount || 0;
        const pendingDue = Math.max(0, totalAmount - paidAmount);

        const effectiveCheckIn = parsedCheckIn || businessDate;
        const inDate = new Date(effectiveCheckIn);
        inDate.setDate(inDate.getDate() + stayDays);
        const checkOut = inDate.toISOString().split('T')[0];

        const formattedName = tenantName.charAt(0).toUpperCase() + tenantName.slice(1);
        const bookingNotes = `Daily Basis: ${stayDays} Day${stayDays > 1 ? 's' : ''} @ ₹${perDayRate.toLocaleString('en-IN')}/day • Total: ₹${totalAmount.toLocaleString('en-IN')}`;

        const { data: newBooking, error: bookErr } = await admin
          .from('bookings')
          .insert([{
            property_id: activePropertyId,
            room_id: targetRoom.id,
            guest_name: formattedName,
            check_in: effectiveCheckIn,
            check_out: checkOut,
            amount: totalAmount,
            total_amount: totalAmount,
            status: 'Checked In',
            is_monthly: false,
            rent_due_day: null,
            billing_cycle_date: null,
            monthly_rent: 0,
            monthly_rate: 0,
            security_deposit: 0,
            notes: bookingNotes
          }])
          .select()
          .single();

        if (bookErr || !newBooking) {
          return {
            success: false,
            message: `Failed to check in daily guest: ${bookErr?.message || 'Database error'}`
          };
        }

        const paymentIds: string[] = [];
        if (paidAmount > 0) {
          const { data: payData } = await admin
            .from('payments')
            .insert([{
              booking_id: newBooking.id,
              property_id: activePropertyId,
              amount: paidAmount,
              method: 'Cash',
              payment_method: 'Cash',
              allocation: 'Daily Room Tariff',
              transaction_id: 'DAILY-TARIFF-PAYMENT',
              business_date: effectiveCheckIn
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
          isDaily: true,
          stayDays,
          perDayRate,
          totalTariff: totalAmount,
          paidAmount,
          newBalanceDue: pendingDue,
          checkInDate: effectiveCheckIn,
          checkOutDate: checkOut,
          bookingId: newBooking.id,
          paymentIds,
          message: `Checked in Daily Guest ${formattedName} to Room ${targetRoom.room_number}! Stay: ${stayDays} Days (${effectiveCheckIn} to ${checkOut}) @ ₹${perDayRate.toLocaleString('en-IN')}/day • Total: ₹${totalAmount.toLocaleString('en-IN')} • Paid: ₹${paidAmount.toLocaleString('en-IN')} • Pending Due: ₹${pendingDue.toLocaleString('en-IN')}`
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

      // 4. Calculate dates and fees
      const effectiveCheckIn = parsedCheckIn || businessDate;
      const [inYear, inMonth, inDay] = effectiveCheckIn.split('-').map(Number);
      const checkOut = `${inYear + 1}-${String(inMonth).padStart(2, '0')}-${String(inDay).padStart(2, '0')}`;
      const finalDueDay = dueDay || inDay;

      const maintenanceFee = parsedMaintenance || 0;
      const refundableDeposit = parsedRefundable || advAmount || 0;
      const formattedName = tenantName.charAt(0).toUpperCase() + tenantName.slice(1);

      // Build notes string for clear display in profile
      const noteParts: string[] = [];
      if (sharing) noteParts.push(`${sharing}-Share Bed`);
      if (maintenanceFee > 0) noteParts.push(`Maintenance: ₹${maintenanceFee.toLocaleString('en-IN')}`);
      if (refundableDeposit > 0) noteParts.push(`Refundable: ₹${refundableDeposit.toLocaleString('en-IN')}`);
      const bookingNotes = noteParts.join(' • ') || undefined;

      // 4b. Guardrail: Verify no active booking in targetRoom already matches tenantName
      const { data: finalDuplicateCheck } = await admin
        .from('bookings')
        .select('id, guest_name')
        .eq('room_id', targetRoom.id)
        .in('status', ['Checked In', 'Confirmed', 'in_house']);

      const existingInRoom = (finalDuplicateCheck || []).find(b => isResidentNameMatch(b.guest_name, tenantName));
      if (existingInRoom) {
        return {
          success: false,
          message: `Resident "${existingInRoom.guest_name}" is already active in Room ${targetRoom.room_number}. Duplicate tenant creation prevented! Use "modify existing tenant room ${targetRoom.room_number} ${tenantName}" to adjust details.`
        };
      }

      // 5. Create booking with custom rent, refundable deposit and notes
      const { data: newBooking, error: bookErr } = await admin
        .from('bookings')
        .insert([{
          property_id: activePropertyId,
          room_id: targetRoom.id,
          guest_name: formattedName,
          check_in: effectiveCheckIn,
          check_out: checkOut,
          amount: refundableDeposit,
          total_amount: refundableDeposit,
          status: 'Checked In',
          is_monthly: true,
          rent_due_day: finalDueDay,
          billing_cycle_date: finalDueDay,
          monthly_rent: effectiveMonthlyRent,
          monthly_rate: effectiveMonthlyRent,
          security_deposit: refundableDeposit,
          notes: bookingNotes
        }])
        .select()
        .single();

      if (bookErr || !newBooking) {
        return {
          success: false,
          message: `Failed to assign tenant: ${bookErr?.message || 'Database error'}`
        };
      }

      const paymentIds: string[] = [];

      // 6a. If maintenance fee paid, record incidental charge & payment
      if (maintenanceFee > 0) {
        await admin
          .from('incidental_charges')
          .insert([{
            booking_id: newBooking.id,
            property_id: activePropertyId,
            description: 'Non-Refundable Maintenance Fee',
            amount: maintenanceFee,
            category: 'Maintenance',
            business_date: effectiveCheckIn
          }]);

        const { data: maintPay } = await admin
          .from('payments')
          .insert([{
            booking_id: newBooking.id,
            property_id: activePropertyId,
            amount: maintenanceFee,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Maintenance Fee (Revenue)',
            transaction_id: 'MAINTENANCE-FEE-AT-CREATION',
            business_date: effectiveCheckIn
          }])
          .select('id')
          .single();

        if (maintPay) {
          paymentIds.push(maintPay.id);
        }
      }

      // 6b. If refundable deposit paid, record payment
      if (refundableDeposit > 0) {
        const { data: depPay } = await admin
          .from('payments')
          .insert([{
            booking_id: newBooking.id,
            property_id: activePropertyId,
            amount: refundableDeposit,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Security Deposit',
            transaction_id: 'REFUNDABLE-DEPOSIT-AT-CREATION',
            business_date: effectiveCheckIn
          }])
          .select('id')
          .single();

        if (depPay) {
          paymentIds.push(depPay.id);
        }
      }

      // 6c. If monthly rent was paid at admission, record rent payment
      const rentPaid = Number(parsedRentPaid || 0);
      if (rentPaid > 0) {
        const { data: rentPay } = await admin
          .from('payments')
          .insert([{
            booking_id: newBooking.id,
            property_id: activePropertyId,
            amount: rentPaid,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Rent',
            transaction_id: 'RENT-PAID-AT-ADMISSION',
            business_date: effectiveCheckIn
          }])
          .select('id')
          .single();

        if (rentPay) {
          paymentIds.push(rentPay.id);
        }
      }

      const totalAdvance = refundableDeposit + maintenanceFee;
      const rentStatusText = rentPaid > 0 
        ? `Rent: ₹${effectiveMonthlyRent.toLocaleString('en-IN')}/mo (Paid: ₹${rentPaid.toLocaleString('en-IN')})` 
        : `Rent: ₹${effectiveMonthlyRent.toLocaleString('en-IN')}/mo (Due: ₹${effectiveMonthlyRent.toLocaleString('en-IN')})`;

      return {
        success: true,
        type: 'assign',
        tenantName: formattedName,
        roomNumber: targetRoom.room_number,
        monthlyRent: effectiveMonthlyRent,
        advPaid: totalAdvance,
        refundableDeposit,
        maintenanceFee,
        feePaid: rentPaid,
        dueDay: finalDueDay,
        sharing: sharing || undefined,
        checkInDate: effectiveCheckIn,
        bookingId: newBooking.id,
        paymentIds,
        message: `Assigned ${formattedName} to Room ${targetRoom.room_number}! Joined: ${effectiveCheckIn} • ${rentStatusText} • Maintenance: ₹${maintenanceFee.toLocaleString('en-IN')} (Paid) • Refundable: ₹${refundableDeposit.toLocaleString('en-IN')}.`
      };
    }

    // ==========================================
    // EXECUTE UPDATE TENANT (CHANGE DATES / RENT)
    // ==========================================
    if (parsed.type === 'update_tenant') {
      const { tenantName, roomNumber, newCheckInDate, newDueDay, newMonthlyRent, newMaintenanceFee, newRefundableDeposit, isPaid } = parsed as any;

      if (!roomNumber && !tenantName) {
        return {
          success: false,
          message: 'Please specify the room number or tenant name. Example: "please modify existing tenant room 201 srikanth joining date 1st may 2026 fee 8500 paid maintainance 1000 and refundabale 1000"'
        };
      }

      if (!newCheckInDate && !newDueDay && !newMonthlyRent && newMaintenanceFee === undefined && newRefundableDeposit === undefined) {
        return {
          success: false,
          message: 'Please specify what to change (joining date, due date, rent, maintenance, or deposit). Example: "modify room 201 srikanth fee 8500"'
        };
      }

      // Query active bookings in active property
      const [bookingsRes, roomsRes] = await Promise.all([
        admin
          .from('bookings')
          .select('id, guest_name, room_id, status, is_monthly, monthly_rent, monthly_rate, rent_due_day, check_in, check_out, security_deposit, notes')
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

      const roomMap = new Map(rooms.map(r => [r.id, r.room_number?.toString() || '']));
      const enrichedBookings = bookings.map(b => ({
        ...b,
        room_number: roomMap.get(b.room_id) || ''
      }));

      let matchedBooking = null;
      if (roomNumber && tenantName) {
        matchedBooking = enrichedBookings.find(b => {
          const rNum = b.room_number.toLowerCase();
          return (rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase())) &&
                 isResidentNameMatch(b.guest_name, tenantName);
        });
      }
      if (!matchedBooking && tenantName) {
        matchedBooking = enrichedBookings.find(b => isResidentNameMatch(b.guest_name, tenantName));
      }
      // Only fall back to room occupant if NO tenantName was specified
      if (!matchedBooking && roomNumber && !tenantName) {
        const inRoom = enrichedBookings.filter(b => {
          const rNum = b.room_number.toLowerCase();
          return rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase());
        });
        if (inRoom.length === 1) {
          matchedBooking = inRoom[0];
        } else if (inRoom.length > 1) {
          return {
            success: false,
            message: `Room ${roomNumber} has ${inRoom.length} active residents (${inRoom.map(b => b.guest_name).join(', ')}). Please specify the tenant name.`
          };
        }
      }

      if (!matchedBooking) {
        if (roomNumber && tenantName) {
          const inRoom = enrichedBookings.filter(b => {
            const rNum = b.room_number.toLowerCase();
            return rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase());
          });
          if (inRoom.length > 0) {
            return {
              success: false,
              message: `Could not find resident matching "${tenantName}" in Room ${roomNumber}. Active resident(s) in Room ${roomNumber}: ${inRoom.map(b => b.guest_name).join(', ')}.`
            };
          }
        }
        return {
          success: false,
          message: `Could not find active tenant matching "${tenantName || ''}"${roomNumber ? ' in Room ' + roomNumber : ''}.`
        };
      }

      const roomDisp = matchedBooking.room_number || roomNumber || 'Unknown';
      const updates: any = {};
      const changesList: string[] = [];

      if (newCheckInDate) {
        updates.check_in = newCheckInDate;
        const [y, m, d] = newCheckInDate.split('-').map(Number);
        updates.check_out = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        changesList.push(`Joining Date: ${newCheckInDate}`);
      }

      if (newDueDay) {
        updates.rent_due_day = newDueDay;
        updates.billing_cycle_date = newDueDay;
        changesList.push(`Rent Due Date: ${newDueDay}th`);
      }

      if (newMonthlyRent) {
        updates.monthly_rent = newMonthlyRent;
        updates.monthly_rate = newMonthlyRent;
        changesList.push(`Monthly Rent: ₹${newMonthlyRent.toLocaleString('en-IN')}`);
      }

      if (newRefundableDeposit !== undefined) {
        updates.security_deposit = newRefundableDeposit;
        changesList.push(`Refundable Deposit: ₹${newRefundableDeposit.toLocaleString('en-IN')}`);
      }

      if (newMaintenanceFee !== undefined || newRefundableDeposit !== undefined) {
        const noteParts: string[] = [];
        if (matchedBooking.notes?.includes('-Share Bed')) {
          noteParts.push(matchedBooking.notes.split('•')[0].trim());
        }
        const effectiveMaint = newMaintenanceFee !== undefined ? newMaintenanceFee : 0;
        const effectiveRef = newRefundableDeposit !== undefined ? newRefundableDeposit : Number(matchedBooking.security_deposit || 0);
        if (effectiveMaint > 0) {
          noteParts.push(`Maintenance: ₹${effectiveMaint.toLocaleString('en-IN')}`);
        }
        if (effectiveRef > 0) {
          noteParts.push(`Refundable: ₹${effectiveRef.toLocaleString('en-IN')}`);
        }
        if (noteParts.length > 0) {
          updates.notes = noteParts.join(' • ');
          if (newMaintenanceFee !== undefined) {
            changesList.push(`Maintenance: ₹${newMaintenanceFee.toLocaleString('en-IN')}`);
          }
        }
      }

      const { error: updErr } = await admin
        .from('bookings')
        .update(updates)
        .eq('id', matchedBooking.id);

      if (updErr) {
        return { success: false, message: `Failed to update tenant: ${updErr.message}` };
      }

      const paymentIds: string[] = [];
      if (isPaid) {
        const payDate = newCheckInDate || matchedBooking.check_in || businessDate;
        if (newMonthlyRent && newMonthlyRent > 0) {
          const { data: rentP } = await admin.from('payments').insert([{
            booking_id: matchedBooking.id,
            property_id: activePropertyId,
            amount: newMonthlyRent,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Rent',
            business_date: payDate,
            transaction_id: 'MODIFIED-RENT-PAYMENT'
          }]).select('id').single();
          if (rentP) paymentIds.push(rentP.id);
        }

        if (newMaintenanceFee && newMaintenanceFee > 0) {
          await admin.from('incidental_charges').insert([{
            booking_id: matchedBooking.id,
            property_id: activePropertyId,
            description: 'Non-Refundable Maintenance Fee',
            amount: newMaintenanceFee,
            category: 'Maintenance',
            business_date: payDate
          }]);
          const { data: maintP } = await admin.from('payments').insert([{
            booking_id: matchedBooking.id,
            property_id: activePropertyId,
            amount: newMaintenanceFee,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Maintenance Fee (Revenue)',
            business_date: payDate,
            transaction_id: 'MODIFIED-MAINTENANCE-PAYMENT'
          }]).select('id').single();
          if (maintP) paymentIds.push(maintP.id);
        }

        if (newRefundableDeposit && newRefundableDeposit > 0) {
          const { data: depP } = await admin.from('payments').insert([{
            booking_id: matchedBooking.id,
            property_id: activePropertyId,
            amount: newRefundableDeposit,
            method: 'UPI',
            payment_method: 'UPI',
            allocation: 'Security Deposit',
            business_date: payDate,
            transaction_id: 'MODIFIED-DEPOSIT-PAYMENT'
          }]).select('id').single();
          if (depP) paymentIds.push(depP.id);
        }

        const totalPaid = (newMonthlyRent || 0) + (newMaintenanceFee || 0) + (newRefundableDeposit || 0);
        if (totalPaid > 0) {
          changesList.push(`Payments Logged: ₹${totalPaid.toLocaleString('en-IN')} paid`);
        }
      }

      return {
        success: true,
        type: 'update_tenant',
        tenantName: matchedBooking.guest_name,
        roomNumber: roomDisp,
        checkInDate: newCheckInDate || matchedBooking.check_in,
        dueDay: newDueDay || matchedBooking.rent_due_day,
        monthlyRent: newMonthlyRent || matchedBooking.monthly_rent,
        maintenanceFee: newMaintenanceFee,
        refundableDeposit: newRefundableDeposit,
        bookingId: matchedBooking.id,
        paymentIds,
        prevValues: {
          checkIn: matchedBooking.check_in,
          dueDay: matchedBooking.rent_due_day,
          monthlyRent: matchedBooking.monthly_rent
        },
        message: `Updated ${matchedBooking.guest_name} (Room ${roomDisp}): ${changesList.join(' • ')}`
      };
    }

    // ==========================================
    // EXECUTE CHECKOUT / VACATE TENANT
    // ==========================================
    if (parsed.type === 'checkout') {
      const { tenantName, roomNumber, isForce } = parsed as any;

      if (!roomNumber && !tenantName) {
        return {
          success: false,
          message: 'Please specify the room number or tenant to checkout. Example: "please checkout guest srikanth from room 201"'
        };
      }

      // Query active bookings in active property
      const [bookingsRes, roomsRes] = await Promise.all([
        admin
          .from('bookings')
          .select('id, guest_name, room_id, status, is_monthly, monthly_rent, monthly_rate, total_amount, security_deposit, notes, check_in, rent_due_day')
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
        return { success: false, message: 'No active residents found in this property.' };
      }

      const roomMap = new Map(rooms.map(r => [r.id, r.room_number?.toString() || '']));
      const enrichedBookings = bookings.map(b => ({
        ...b,
        room_number: roomMap.get(b.room_id) || ''
      }));

      let matchedBooking: any = null;
      let matchingBookings: any[] = [];

      if (roomNumber && tenantName) {
        matchingBookings = enrichedBookings.filter(b => {
          const rNum = b.room_number.toLowerCase();
          return (rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase())) &&
                 isResidentNameMatch(b.guest_name, tenantName);
        });
      }

      if (matchingBookings.length === 0 && tenantName) {
        matchingBookings = enrichedBookings.filter(b => isResidentNameMatch(b.guest_name, tenantName));
      }

      if (matchingBookings.length > 0) {
        matchedBooking = matchingBookings[0];
      }

      // CRITICAL: Room fallback ONLY when NO tenantName was specified by user (e.g. "checkout room 201" or "vacate room 201")
      if (!matchedBooking && roomNumber && !tenantName) {
        const inRoom = enrichedBookings.filter(b => {
          const rNum = b.room_number.toLowerCase();
          return rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase());
        });
        if (inRoom.length === 1) {
          matchedBooking = inRoom[0];
          matchingBookings = [matchedBooking];
        } else if (inRoom.length > 1) {
          return {
            success: false,
            message: `Room ${roomNumber} has ${inRoom.length} active residents (${inRoom.map(b => b.guest_name).join(', ')}). Please specify the resident name, e.g.: "checkout ${inRoom[0].guest_name} from room ${roomNumber}"`
          };
        }
      }

      if (!matchedBooking) {
        if (roomNumber && tenantName) {
          const inRoom = enrichedBookings.filter(b => {
            const rNum = b.room_number.toLowerCase();
            return rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase());
          });
          if (inRoom.length > 0) {
            return {
              success: false,
              message: `Could not find resident matching "${tenantName}" in Room ${roomNumber}. Active resident(s) in Room ${roomNumber}: ${inRoom.map(b => b.guest_name).join(', ')}.`
            };
          }
        }
        return {
          success: false,
          message: `Could not find active resident matching "${tenantName || ''}"${roomNumber ? ' in Room ' + roomNumber : ''}.`
        };
      }

      const roomDisp = matchedBooking.room_number || roomNumber || 'Unknown';

      // Calculate Folio balance due
      const [incidentalsRes, paymentsRes] = await Promise.all([
        admin.from('incidental_charges').select('amount, description').eq('booking_id', matchedBooking.id),
        admin.from('payments').select('amount, allocation, is_void').eq('booking_id', matchedBooking.id)
      ]);

      const validPayments = (paymentsRes.data || []).filter(p => !p.is_void);
      const totalPayments = validPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const totalIncidentals = (incidentalsRes.data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const isMonthly = matchedBooking.is_monthly;
      const monthlyRate = Number(matchedBooking.monthly_rent || matchedBooking.monthly_rate || matchedBooking.total_amount || 0);
      const roomAmount = isMonthly ? monthlyRate : Number(matchedBooking.total_amount || 0);

      const totalCharges = roomAmount + totalIncidentals;
      const balanceDue = Math.max(0, totalCharges - totalPayments);

      // Check for pending dues
      if (balanceDue > 0.01 && !isForce) {
        return {
          success: false,
          type: 'checkout',
          hasPendingDues: true,
          pendingDues: balanceDue,
          tenantName: matchedBooking.guest_name,
          roomNumber: roomDisp,
          bookingId: matchedBooking.id,
          message: `⚠️ ${matchedBooking.guest_name} (Room ${roomDisp}) has pending dues of ₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}! Choose an option below:`
        };
      }

      // Execute checkout
      const checkOutUpdates: any = {
        status: 'Checked Out'
      };

      if (isForce && balanceDue > 0.01) {
        const existingNotes = matchedBooking.notes || '';
        checkOutUpdates.notes = `${existingNotes} • [Force Checked Out with Pending Balance: ₹${balanceDue.toFixed(2)}]`.trim();
      }

      const idsToCheckout = matchingBookings.length > 0 ? matchingBookings.map(b => b.id) : [matchedBooking.id];
      const { error: chkErr } = await admin
        .from('bookings')
        .update(checkOutUpdates)
        .in('id', idsToCheckout);

      if (chkErr) {
        return { success: false, message: `Failed to checkout: ${chkErr.message}` };
      }

      // Check if any other active residents remain in this room
      const { data: othersInRoom } = await admin
        .from('bookings')
        .select('id')
        .eq('room_id', matchedBooking.room_id)
        .in('status', ['Checked In', 'Confirmed', 'in_house']);

      const remainingOthers = (othersInRoom || []).filter(b => !idsToCheckout.includes(b.id));

      if (remainingOthers.length === 0) {
        await admin.from('rooms').update({ status: 'Dirty' }).eq('id', matchedBooking.room_id);
      }

      return {
        success: true,
        type: 'checkout',
        tenantName: matchedBooking.guest_name,
        roomNumber: roomDisp,
        bookingId: matchedBooking.id,
        newBalanceDue: isForce ? balanceDue : 0,
        isForce: Boolean(isForce),
        message: isForce
          ? `⚠️ Force checked out ${matchedBooking.guest_name} from Room ${roomDisp}! (Pending dues of ₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded in notes).`
          : `Checked out ${matchedBooking.guest_name} from Room ${roomDisp} successfully! Folio settled (₹0 balance).`
      };
    }

    // ==========================================
    // EXECUTE REVENUE
    // ==========================================
    if (parsed.type === 'revenue') {
      const { roomNumber, tenantName, feeAmount, advAmount, totalAmount } = parsed;
      const effectivePaymentDate = (parsed as any).paymentDate || businessDate;
      const isBackdated = Boolean((parsed as any).paymentDate);

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
          return (rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase())) &&
                 isResidentNameMatch(b.guest_name, tenantName);
        });
      }

      if (!matchedBooking && tenantName) {
        matchedBooking = enrichedBookings.find(b => isResidentNameMatch(b.guest_name, tenantName));
      }

      // Only fall back to room occupant if NO tenantName was specified
      if (!matchedBooking && roomNumber && !tenantName) {
        const inRoom = enrichedBookings.filter(b => {
          const rNum = b.room_number.toLowerCase();
          return rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase());
        });
        if (inRoom.length === 1) {
          matchedBooking = inRoom[0];
        } else if (inRoom.length > 1) {
          return {
            success: false,
            message: `Room ${roomNumber} has ${inRoom.length} active residents (${inRoom.map(b => b.guest_name).join(', ')}). Please specify the tenant name, e.g.: "${inRoom[0].guest_name} room ${roomNumber} paid ${feeAmount}"`
          };
        }
      }

      if (!matchedBooking) {
        if (roomNumber && tenantName) {
          const inRoom = enrichedBookings.filter(b => {
            const rNum = b.room_number.toLowerCase();
            return rNum === roomNumber.toLowerCase() || rNum.includes(roomNumber.toLowerCase());
          });
          if (inRoom.length > 0) {
            return {
              success: false,
              message: `Could not find active tenant matching "${tenantName}" in Room ${roomNumber}. Active resident(s) in Room ${roomNumber}: ${inRoom.map(b => b.guest_name).join(', ')}.`
            };
          }
        }
        return {
          success: false,
          message: `Could not find active tenant matching "${tenantName || ''}"${roomNumber ? ' in Room ' + roomNumber : ''}. Please check the room number or name.`
        };
      }

      const roomDisp = matchedBooking.room_number || roomNumber || 'Unknown';

      // ============================================================
      // GUARDRAIL / BACKDATE CHECK
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

      // Only warn if tenant has ₹0 pending rent due, today is before dueDay, payment is NOT backdated, and input didn't explicitly specify 'paid' or 'fee'
      if (!isBackdated && feeAmount > 0 && currentBalanceDue <= 0.01 && todayDay < dueDay && !input.toLowerCase().includes('paid')) {
        return {
          success: false,
          message: `⚠️ ${matchedBooking.guest_name} (Room ${roomDisp}) has ₹0 pending rent due! Rent is already cleared till date (Next rent due date: ${dueDay}th). If this payment was made earlier (e.g. on 1st), type "paid on 1st". If for security deposit or advance, specify 'adv' (e.g. "${matchedBooking.guest_name} ${roomDisp} ${feeAmount} adv").`
        };
      }

      const paymentRows: any[] = [];
      const paymentIds: string[] = [];
      const paymentBreakdownDesc: string[] = [];
      const parsedMaintenance = Number((parsed as any).maintenanceFee || 0);
      const parsedMonthPayments = (parsed as any).monthPayments as Array<{ month: string; amount: number; isOverdue?: boolean; isFullPayment?: boolean }> | undefined;

      // 0. Month-Specific & Multi-Month Overdue Payments (e.g. September overdue 2000, October full rent 9000)
      if (parsedMonthPayments && parsedMonthPayments.length > 0) {
        const yearStr = (effectivePaymentDate || businessDate).split('-')[0];
        for (const item of parsedMonthPayments) {
          const amt = item.isFullPayment && item.amount === 0
            ? Number(matchedBooking.monthly_rent || matchedBooking.monthly_rate || 8000)
            : item.amount;
          if (amt > 0) {
            paymentRows.push({
              booking_id: matchedBooking.id,
              property_id: activePropertyId,
              amount: amt,
              method: 'UPI',
              payment_method: 'UPI',
              allocation: 'Rent',
              billing_period: `${item.month} ${yearStr}`,
              business_date: effectivePaymentDate,
              transaction_id: item.isOverdue ? `OVERDUE-${item.month.toUpperCase()}-RENT` : `${item.month.toUpperCase()}-RENT`
            });
            paymentBreakdownDesc.push(`₹${amt.toLocaleString('en-IN')} for ${item.month}${item.isOverdue ? ' (Overdue Cleared)' : ' (Rent)'}`);
          }
        }
      }

      // 1. Standard Room Fee payment (if no multi-month breakdown)
      if (feeAmount > 0 && (!parsedMonthPayments || parsedMonthPayments.length === 0)) {
        paymentRows.push({
          booking_id: matchedBooking.id,
          property_id: activePropertyId,
          amount: feeAmount,
          method: 'UPI',
          payment_method: 'UPI',
          allocation: 'Rent',
          business_date: effectivePaymentDate,
          transaction_id: 'QUICK-LEDGER-FEE'
        });
        paymentBreakdownDesc.push(`₹${feeAmount.toLocaleString('en-IN')} Room Fee`);
      }

      // 2. Advance / Refundable Deposit payment
      if (advAmount > 0) {
        paymentRows.push({
          booking_id: matchedBooking.id,
          property_id: activePropertyId,
          amount: advAmount,
          method: 'UPI',
          payment_method: 'UPI',
          allocation: 'Security Deposit',
          business_date: effectivePaymentDate,
          transaction_id: 'QUICK-LEDGER-ADV'
        });
        paymentBreakdownDesc.push(`₹${advAmount.toLocaleString('en-IN')} Refundable Deposit`);
      }

      // 3. Maintenance Fee payment (Backdated or regular)
      if (parsedMaintenance > 0) {
        await admin.from('incidental_charges').insert([{
          booking_id: matchedBooking.id,
          property_id: activePropertyId,
          description: 'Non-Refundable Maintenance Fee',
          amount: parsedMaintenance,
          category: 'Maintenance',
          business_date: effectivePaymentDate
        }]);

        paymentRows.push({
          booking_id: matchedBooking.id,
          property_id: activePropertyId,
          amount: parsedMaintenance,
          method: 'UPI',
          payment_method: 'UPI',
          allocation: 'Maintenance Fee (Revenue)',
          business_date: effectivePaymentDate,
          transaction_id: 'QUICK-LEDGER-MAINTENANCE'
        });
        paymentBreakdownDesc.push(`₹${parsedMaintenance.toLocaleString('en-IN')} Maintenance Fee`);
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

      const totalRecordedPaid = paymentRows.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalRentRecorded = paymentRows
        .filter(p => p.allocation === 'Rent')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Recalculate remaining due
      const newRentPaid = rentPaidBeforeThis + totalRentRecorded;
      const newBalanceDue = Math.max(0, (baseRoomCharge + incidentalsSum) - newRentPaid);

      return {
        success: true,
        type: 'revenue',
        tenantName: matchedBooking.guest_name,
        roomNumber: roomDisp,
        feePaid: totalRentRecorded,
        advPaid: advAmount,
        maintenancePaid: parsedMaintenance,
        totalPaid: totalRecordedPaid,
        paymentDate: effectivePaymentDate,
        newBalanceDue,
        paymentIds,
        bookingId: matchedBooking.id,
        advAmountAdded: advAmount,
        message: `Recorded payment for ${matchedBooking.guest_name} (Room ${roomDisp}) on ${effectivePaymentDate}: ${paymentBreakdownDesc.join(' • ')}. Updated Pending Due: ₹${newBalanceDue.toLocaleString('en-IN')}`
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
  type: 'revenue' | 'expense' | 'assign' | 'update_tenant' | 'checkout';
  ids?: string[];
  bookingId?: string;
  advAmountAdded?: number;
  prevValues?: {
    checkIn?: string;
    dueDay?: number;
    monthlyRent?: number;
  };
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
        await admin.from('incidental_charges').delete().eq('booking_id', payload.bookingId);
        const { error: delErr } = await admin.from('bookings').delete().eq('id', payload.bookingId);
        if (delErr) return { success: false, message: delErr.message };
      }
      return { success: true, message: 'Tenant assignment undone successfully.' };
    }

    if (payload.type === 'update_tenant' && payload.bookingId && payload.prevValues) {
      const updates: any = {};
      if (payload.prevValues.checkIn) updates.check_in = payload.prevValues.checkIn;
      if (payload.prevValues.dueDay) {
        updates.rent_due_day = payload.prevValues.dueDay;
        updates.billing_cycle_date = payload.prevValues.dueDay;
      }
      if (payload.prevValues.monthlyRent) {
        updates.monthly_rent = payload.prevValues.monthlyRent;
        updates.monthly_rate = payload.prevValues.monthlyRent;
      }
      const { error: undoErr } = await admin.from('bookings').update(updates).eq('id', payload.bookingId);
      if (undoErr) return { success: false, message: undoErr.message };
      return { success: true, message: 'Tenant changes reverted successfully.' };
    }

    if (payload.type === 'checkout' && payload.bookingId) {
      const { error: undoErr } = await admin
        .from('bookings')
        .update({ status: 'Checked In' })
        .eq('id', payload.bookingId);
      if (undoErr) return { success: false, message: undoErr.message };
      return { success: true, message: 'Checkout undone. Resident status restored to Checked In.' };
    }

    return { success: false, message: 'Nothing to undo.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to undo action.' };
  }
}
