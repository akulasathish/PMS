'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  checkOutGuest 
} from '@/app/actions/booking';
import { 
  extendBookingStay, 
  postDailyRoomCharges, 
  executeDateRollover 
} from '@/app/actions/night-audit';
import {
  Moon,
  Sun,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Clock,
  ArrowRight,
  Loader2,
  Building2,
  LayoutDashboard,
  DoorOpen,
  Activity,
  Brush,
  Calendar,
  Check,
  Award,
  ChevronLeft,
  RefreshCw,
  LogOut,
  Plus,
  Trash2,
  Download,
  Receipt,
  PiggyBank,
  Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: false, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Moon, label: "Night Audit", href: "/dashboard/night-audit", active: true, module: 'night_audit' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

interface Booking {
  id: string;
  property_id: string;
  room_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  amount: number;
}

interface Room {
  id: string;
  room_number: string;
  type: string;
  status: string;
}

interface Property {
  id: string;
  name: string;
}

interface PaymentLog {
  id: string;
  booking_id: string;
  property_id: string;
  amount: number;
  method: string;
  created_at: string;
  is_void?: boolean;
}

interface IncidentalCharge {
  id: string;
  booking_id: string;
  property_id: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Expense {
  id: string;
  property_id: string;
  description: string;
  category: string;
  amount: number;
  payment_method: string;
  date: string;
}

interface CashBalance {
  id: string;
  property_id: string;
  date: string;
  opening_cash: number;
  closing_cash: number | null;
  handed_over_cash?: number | null;
}

// Synchronized room-related charge checker to align with front-office
const isRoomRelatedCharge = (desc: string): boolean => {
  const d = (desc || '').toLowerCase();
  return (
    d.startsWith('daily room charge') ||
    d.includes('early check-in') ||
    d.includes('early checkin') ||
    d.includes('late checkout') ||
    d.includes('late check-out') ||
    d.includes('past due') ||
    d.includes('past dues') ||
    d.includes('tariff') ||
    d.includes('room charge') ||
    d.includes('dues') ||
    d.includes('due amount') ||
    d.includes('balance transfer') ||
    d.includes('extra guest') ||
    d.includes('extra person') ||
    d.includes('extra occupant') ||
    d.includes('extra bed') ||
    d.includes('upgrade')
  );
};

export default function NightAuditPage() {
  const [property, setProperty] = useState<Property | null>(null);
  const [businessDate, setBusinessDate] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [incidentals, setIncidentals] = useState<IncidentalCharge[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyCashBalances, setDailyCashBalances] = useState<CashBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Wizard state
  const [activeStep, setActiveStep] = useState<number>(1); // 1: Operational Check, 2: Post Charges, 3: Reconciliation & Rollover
  const [isChargesPosted, setIsChargesPosted] = useState<boolean>(false);
  const [isRolloverComplete, setIsRolloverComplete] = useState<boolean>(false);
  const [rolloverSummary, setRolloverSummary] = useState<any>(null);

  // Custom daily rates overrides (Step 2)
  const [customRates, setCustomRates] = useState<{ [bookingId: string]: string }>({});

  // Inline Expense inputs (Step 3)
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpMethod, setNewExpMethod] = useState('Cash');
  const [newExpCat, setNewExpCategory] = useState('General');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Opening Cash Override Input (Step 3)
  const [openingCashOverride, setOpeningCashOverride] = useState('');
  const [isEditingOpening, setIsOpeningEditable] = useState(false);

  // Selected booking for extension modal
  const [extendingBooking, setExtendingBooking] = useState<Booking | null>(null);
  const [extensionDate, setExtensionDate] = useState<string>('');

  const supabase = createClient();
  const router = useRouter();

  const loadNightAuditData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setIsLoading(false);
        return;
      }

      let activeId = localStorage.getItem('pms_active_property');
      if (!activeId || activeId === 'undefined') {
        const { data: prof } = await supabase.from('profiles').select('property_id').eq('id', auth.user.id).single();
        if (prof?.property_id) {
          activeId = prof.property_id;
          localStorage.setItem('pms_active_property', activeId || '');
        }
      }

      if (activeId && activeId !== 'undefined') {
        const [
          propRes, 
          settingsRes, 
          bookingsRes, 
          roomsRes, 
          expensesRes, 
          balancesRes
        ] = await Promise.all([
          supabase.from('properties').select('id, name').eq('id', activeId).single(),
          supabase.from('app_settings').select('value').eq('key', 'business_date').single(),
          supabase.from('bookings').select('*').eq('property_id', activeId),
          supabase.from('rooms').select('*').eq('property_id', activeId),
          supabase.from('expenses').select('*').eq('property_id', activeId),
          supabase.from('daily_cash_balances').select('*').eq('property_id', activeId)
        ]);

        const loadedBookings = bookingsRes.data || [];
        const bookingIds = loadedBookings.map((b: any) => b.id);

        let incidentalsQuery = supabase.from('incidental_charges').select('*').eq('property_id', activeId);
        let paymentsQuery = supabase.from('payments').select('*').eq('property_id', activeId);

        if (bookingIds.length > 0) {
          incidentalsQuery = supabase.from('incidental_charges').select('*').or(`property_id.eq.${activeId},booking_id.in.(${bookingIds.join(',')})`);
          paymentsQuery = supabase.from('payments').select('*').or(`property_id.eq.${activeId},booking_id.in.(${bookingIds.join(',')})`);
        }

        const [incidentalsRes, paymentsRes] = await Promise.all([
          incidentalsQuery,
          paymentsQuery
        ]);

        if (propRes.data) setProperty(propRes.data);

        const activeDate = settingsRes.data?.value || '2026-06-24';
        setBusinessDate(activeDate);

        if (bookingsRes.data) setBookings(bookingsRes.data);
        if (roomsRes.data) setRooms(roomsRes.data);
        if (paymentsRes.data) setPayments(paymentsRes.data);
        if (incidentalsRes.data) setIncidentals(incidentalsRes.data);
        if (expensesRes.data) setExpenses(expensesRes.data);
        if (balancesRes.data) setDailyCashBalances(balancesRes.data);

        // Pre-populate custom rates state with average daily rates
        const ratesMap: { [id: string]: string } = {};
        if (bookingsRes.data) {
          bookingsRes.data.forEach((bk: any) => {
            if (bk.status === 'Checked In') {
              const start = new Date(bk.check_in);
              const end = new Date(bk.check_out);
              const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
              const dailyRate = Number(bk.amount) / nights;
              ratesMap[bk.id] = dailyRate.toFixed(2);
            }
          });
        }
        setCustomRates(ratesMap);
      }
    } catch (err) {
      console.error("Night Audit Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadNightAuditData();
  }, [loadNightAuditData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const getPaymentDateStr = (p: any) => {
    if (p.business_date) {
      const s = String(p.business_date);
      if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
        return s.substring(0, 10);
      }
    }
    if (!p.created_at) return '';
    return p.created_at.substring(0, 10);
  };

  const getLocalDateStr = () => {
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    return `${localYear}-${localMonth}-${localDay}`;
  };
  const isAlreadyRolledOver = businessDate ? businessDate >= getLocalDateStr() : false;

  // Filter lists based on business date (Only Departures are critical operational items for Step 1)
  const pendingDepartures = bookings.filter(b => 
    b.check_out === businessDate && b.status === 'Checked In'
  );

  // Helper to get next business date safely
  const getNextBusinessDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const nextDate = new Date(y, m, d + 1);
    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const nextBusinessDate = getNextBusinessDateStr(businessDate);

  // All guests currently checked in
  const checkedInBookings = bookings.filter(b => b.status === 'Checked In');

  // Step 1 Actions (Departures resolution)
  const handleCheckOut = async (bookingId: string, roomId: string) => {
    setActionLoading(bookingId);
    const res = await checkOutGuest(bookingId, roomId);
    if (res.success) {
      await loadNightAuditData();
    } else {
      alert(res.error || "Check-out failed. Balance might need to be settled first.");
    }
    setActionLoading(null);
  };

  const openExtensionModal = (booking: Booking) => {
    setExtendingBooking(booking);
    const nextDay = new Date(booking.check_out);
    nextDay.setDate(nextDay.getDate() + 1);
    setExtensionDate(nextDay.toISOString().substring(0, 10));
  };

  const handleExtendStay = async () => {
    if (!extendingBooking) return;
    setActionLoading(extendingBooking.id);
    const res = await extendBookingStay(extendingBooking.id, extensionDate);
    if (res.success) {
      setExtendingBooking(null);
      await loadNightAuditData();
    } else {
      alert(res.error || "Failed to extend stay");
    }
    setActionLoading(null);
  };

  // Step 2 Action: Atomic Batch Posting
  const handlePostCharges = async () => {
    if (!property) return;
    setActionLoading('post-charges');
    
    // Prepare list of bookings to charge with user's precise customized rate
    const chargesList = checkedInBookings
      .filter(b => b.check_out !== businessDate && (b.check_out ? b.check_out.substring(0, 10) : '') !== nextBusinessDate)
      .map(b => {
        const amtStr = customRates[b.id] || "0.00";
        return {
          id: b.id,
          amount: parseFloat(parseFloat(amtStr).toFixed(2)),
          guestName: b.guest_name
        };
      });

    const res = await postDailyRoomCharges(property.id, businessDate, chargesList);
    if (res.success) {
      setIsChargesPosted(true);
      setActiveStep(3); // Advance to final reconciliation review board
    } else {
      alert(res.error || "Charges posting failed");
    }
    setActionLoading(null);
  };

  // Inline Expense Handling
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property?.id) return;
    const amountVal = parseFloat(newExpAmount);
    if (isNaN(amountVal) || amountVal <= 0 || !newExpDesc.trim()) {
      alert("Please enter a valid description and amount.");
      return;
    }
    setIsSavingExpense(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          property_id: property.id,
          description: newExpDesc.trim(),
          category: newExpCat,
          amount: amountVal,
          payment_method: newExpMethod,
          date: businessDate
        });
      if (error) {
        alert("Error saving expense: " + error.message);
      } else {
        setNewExpDesc('');
        setNewExpAmount('');
        await loadNightAuditData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) {
        alert("Error deleting expense: " + error.message);
      } else {
        await loadNightAuditData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Opening Cash Balances (Yesterday Cash)
  const getYesterdayCash = () => {
    if (openingCashOverride) return parseFloat(openingCashOverride) || 0;

    const savedCurrent = dailyCashBalances.find(b => b.date === businessDate);
    if (savedCurrent && savedCurrent.opening_cash !== undefined) {
      return Number(savedCurrent.opening_cash);
    }

    const pastBalances = dailyCashBalances
      .filter(b => b.date < businessDate && b.closing_cash !== null && b.closing_cash !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (pastBalances.length > 0) {
      return Number(pastBalances[0].closing_cash);
    }

    return 500; // Default fallback to match sample mockup
  };

  const handleSaveOpeningCash = async () => {
    if (!property?.id) return;
    const amountVal = parseFloat(openingCashOverride);
    if (isNaN(amountVal) || amountVal < 0) {
      alert("Please enter a valid cash balance.");
      return;
    }
    setIsSavingExpense(true);
    try {
      const record = dailyCashBalances.find(b => b.date === businessDate);
      let error;
      if (record) {
        const res = await supabase
          .from('daily_cash_balances')
          .update({ opening_cash: amountVal })
          .eq('id', record.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('daily_cash_balances')
          .insert({
            property_id: property.id,
            date: businessDate,
            opening_cash: amountVal
          });
        error = res.error;
      }
      if (error) {
        alert("Error saving opening cash: " + error.message);
      } else {
        setIsOpeningEditable(false);
        await loadNightAuditData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Step 3: Reconciliation calculation matrix
  const getReconciliationData = () => {
    const dayPayments = payments.filter(p => !p.is_void && getPaymentDateStr(p) === businessDate);

    let roomCash = 0, roomUPI = 0, roomSwipe = 0, roomOthers = 0;
    let foodCash = 0, foodUPI = 0, foodSwipe = 0, foodOthers = 0;

    dayPayments.forEach(p => {
      const amt = Number(p.amount);
      const method = p.method;
      const bkId = p.booking_id;
      
      // Find all incidentals and payments for this booking
      const bookingIncidentals = incidentals.filter(inc => inc.booking_id === bkId);
      const bookingPayments = payments.filter(pm => !pm.is_void && pm.booking_id === bkId);

      // Sum food & water charges
      const foodChargesTotal = bookingIncidentals
        .filter(inc => !isRoomRelatedCharge(inc.description || ''))
        .reduce((sum, inc) => sum + Number(inc.amount), 0);

      // Sort booking payments chronologically
      const sortedBkPayments = [...bookingPayments].sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tA - tB;
      });

      const pIndex = sortedBkPayments.findIndex(pm => pm.id === p.id);
      const prevPaid = sortedBkPayments.slice(0, pIndex).reduce((sum, pm) => sum + Number(pm.amount), 0);
      const totalPaidToDate = prevPaid + amt;

      const foodCoveredPrev = Math.min(foodChargesTotal, prevPaid);
      const foodCoveredToDate = Math.min(foodChargesTotal, totalPaidToDate);

      const foodAlloc = Math.max(0, foodCoveredToDate - foodCoveredPrev);
      const roomAlloc = Math.max(0, amt - foodAlloc);

      if (method === 'Cash') {
        foodCash += foodAlloc;
        roomCash += roomAlloc;
      } else if (method === 'UPI') {
        foodUPI += foodAlloc;
        roomUPI += roomAlloc;
      } else if (method === 'SWIPE') {
        foodSwipe += foodAlloc;
        roomSwipe += roomAlloc;
      } else {
        foodOthers += foodAlloc;
        roomOthers += roomAlloc;
      }
    });

    return {
      room: { Cash: roomCash, UPI: roomUPI, SWIPE: roomSwipe, Others: roomOthers },
      food: { Cash: foodCash, UPI: foodUPI, SWIPE: foodSwipe, Others: foodOthers },
      total: {
        Cash: roomCash + foodCash,
        UPI: roomUPI + foodUPI,
        SWIPE: roomSwipe + foodSwipe,
        Others: roomOthers + foodOthers
      }
    };
  };

  const reconData = getReconciliationData();
  const dayExpenses = expenses.filter(e => e.date === businessDate);
  const totalExpenses = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const cashExpenses = dayExpenses.filter(e => e.payment_method === 'Cash').reduce((sum, e) => sum + Number(e.amount), 0);

  const openingCash = getYesterdayCash();
  const todayCashCollected = reconData.total.Cash;
  const cashInCounter = openingCash + todayCashCollected - cashExpenses;
  const totalSaleAmount = reconData.total.Cash + reconData.total.UPI + reconData.total.SWIPE + reconData.total.Others;

  const currentCashRecord = dailyCashBalances.find(b => b.date === businessDate);
  const handedOverCash = currentCashRecord?.handed_over_cash ? Number(currentCashRecord.handed_over_cash) : 0;
  const actualClosingCash = currentCashRecord?.closing_cash !== null && currentCashRecord?.closing_cash !== undefined ? Number(currentCashRecord.closing_cash) : null;
  const isClosed = actualClosingCash !== null;

  // Step 3: PDF download action
  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Luxury dark header block
      doc.setFillColor(10, 10, 12); // #0a0a0c
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("STAYSYNC PMS - DAILY NIGHT AUDIT RECONCILIATION", 15, 14);
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(`PROPERTY: ${property?.name || 'StaySync Boutique Property'}`, 15, 22);
      doc.text(`BUSINESS DATE: ${businessDate}`, 15, 28);
      doc.text(`GENERATED ON: ${new Date().toLocaleString()}`, 135, 28);

      // Section 1: Categories breakdown table
      let currentY = 46;
      doc.setTextColor(10, 10, 12);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("1. SALES REVENUE BREAKDOWN CATEGORIES", 15, currentY);

      const salesHeaders = ["Category", "Cash", "PhonePe UPI", "Swipe Card", "Others (Custom)", "Total"];
      const salesRows = [
        [
          "Room Tariff", 
          `Rs. ${reconData.room.Cash.toFixed(2)}`, 
          `Rs. ${reconData.room.UPI.toFixed(2)}`, 
          `Rs. ${reconData.room.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.room.Others.toFixed(2)}`,
          `Rs. ${(reconData.room.Cash + reconData.room.UPI + reconData.room.SWIPE + reconData.room.Others).toFixed(2)}`
        ],
        [
          "Food & Water", 
          `Rs. ${reconData.food.Cash.toFixed(2)}`, 
          `Rs. ${reconData.food.UPI.toFixed(2)}`, 
          `Rs. ${reconData.food.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.food.Others.toFixed(2)}`,
          `Rs. ${(reconData.food.Cash + reconData.food.UPI + reconData.food.SWIPE + reconData.food.Others).toFixed(2)}`
        ],
        [
          "TOTAL", 
          `Rs. ${reconData.total.Cash.toFixed(2)}`, 
          `Rs. ${reconData.total.UPI.toFixed(2)}`, 
          `Rs. ${reconData.total.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.total.Others.toFixed(2)}`,
          `Rs. ${totalSaleAmount.toFixed(2)}`
        ]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        head: [salesHeaders],
        body: salesRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Section 2: Expenses
      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("2. TOTAL EXPENSES REGISTER", 15, currentY);

      const expRows = dayExpenses.map((ex, i) => [
        i + 1,
        ex.description,
        ex.category,
        ex.payment_method,
        `Rs. ${ex.amount.toFixed(2)}`
      ]);

      if (expRows.length === 0) {
        expRows.push(["-", "No localized expenses logged today.", "-", "-", "Rs. 0.00"]);
      } else {
        expRows.push(["", "TOTAL", "", "", `Rs. ${totalExpenses.toFixed(2)}`]);
      }

      autoTable(doc, {
        startY: currentY + 3,
        head: [["S.No", "Description / Vendor", "Category", "Payment Mode", "Amount"]],
        body: expRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [115, 115, 115], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 70, fontStyle: 'bold' },
          4: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Section 3 & 4: Dual columnar summary
      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("3. CASH COUNTER RECONCILIATION", 15, currentY);
      doc.text("4. TRUE DAILY SALES TOTAL", 110, currentY);

      const reconciliationFormula = [
        ["Yesterday Cash Balance (Opening)", `+ Rs. ${openingCash.toFixed(2)}`],
        ["Today Cash Received (Tariff + Food)", `+ Rs. ${todayCashCollected.toFixed(2)}`],
        ["Today Cash Expenses (Subtracted)", `- Rs. ${cashExpenses.toFixed(2)}`],
        ["Expected Cash In Counter Drawer", `Rs. ${cashInCounter.toFixed(2)}`],
        ["Handed Over to Finance", `- Rs. ${handedOverCash.toFixed(2)}`],
        ["Remaining Counter Float (Closing)", `Rs. ${(isClosed ? actualClosingCash : (cashInCounter - handedOverCash))?.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        body: reconciliationFormula,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
        },
        margin: { left: 15 }
      });

      const netSaleVsExpenses = totalSaleAmount - totalExpenses;
      const paymentSalesSummary = [
        ["Cash Collections", `Rs. ${reconData.total.Cash.toFixed(2)}`],
        ["PhonePe UPI Collections", `Rs. ${reconData.total.UPI.toFixed(2)}`],
        ["Swipe Card Collections", `Rs. ${reconData.total.SWIPE.toFixed(2)}`],
        ["Others (Custom Payment Modes)", `Rs. ${reconData.total.Others.toFixed(2)}`],
        ["TOTAL SALE FOR THE DAY", `Rs. ${totalSaleAmount.toFixed(2)}`],
        ["Total Logged Expenses", `- Rs. ${totalExpenses.toFixed(2)}`],
        ["TOTAL SALE VS EXPENSES (NET)", `Rs. ${netSaleVsExpenses.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        body: paymentSalesSummary,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
        },
        margin: { left: 110 }
      });

      // Verification Footers
      const lastY = (doc as any).lastAutoTable.finalY + 15;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, lastY, 195, lastY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("* Reconciled automatically under database-level atomicity. Signature marks required for cashier shifts.", 15, lastY + 4);

      doc.save(`Night_Audit_Report_${businessDate}.pdf`);
    } catch (err) {
      console.error("PDF Generate error:", err);
      alert("Failed to build PDF. Please check console.");
    }
  };

  // Step 3 Action: Finalize Rollover
  const handleExecuteRollover = async () => {
    if (!property) return;
    
    // Safety check to prevent running multiple rollovers on the same day
    const localDateStr = getLocalDateStr();
    if (businessDate >= localDateStr) {
      alert(`Safety Block: The Night Audit has already been executed for today. The operational business date (${businessDate}) is already up-to-date with your actual calendar date (${localDateStr}). Running another rollover is blocked to prevent skipping dates.`);
      return;
    }

    setActionLoading('rollover');
    
    // First save daily cash snapshot inside daily_cash_balances
    try {
      const record = dailyCashBalances.find(b => b.date === businessDate);
      const isAlreadyClosed = record && record.closing_cash !== null && record.closing_cash !== undefined;
      
      if (!isAlreadyClosed) {
        if (record) {
          await supabase
            .from('daily_cash_balances')
            .update({ 
              closing_cash: cashInCounter,
              handed_over_cash: 0.00
            })
            .eq('id', record.id);
        } else {
          await supabase
            .from('daily_cash_balances')
            .insert({
              property_id: property.id,
              date: businessDate,
              opening_cash: openingCash,
              closing_cash: cashInCounter,
              handed_over_cash: 0.00
            });
        }
      }
    } catch (e) {
      console.error("Failed to save closing balance snapshot:", e);
    }

    // Advance business date
    const res = await executeDateRollover(property.id, businessDate);
    if (res.success) {
      setRolloverSummary({
        closedDate: businessDate,
        openedDate: res.nextBusinessDate,
        roomsMarkedDirty: res.roomsMarkedDirty,
        bookingsChargedCount: checkedInBookings.length,
        propertyName: property.name
      });
      setIsRolloverComplete(true);
    } else {
      alert(res.error || "Rollover failed");
    }
    setActionLoading(null);
  };

  const isStep1Clear = pendingDepartures.length === 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#08080a] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#08080a] font-sans text-zinc-300">
      
      {/* ===== SIDEBAR ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 p-2 -ml-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-[13px] font-bold text-white tracking-tight truncate max-w-[130px]">{property?.name || 'Loading...'}</h1>
              <p className="text-[10px] text-zinc-600 font-medium">Owner Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 mb-3">Navigation</p>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                item.active
                  ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
              }`}
            >
              <item.icon size={17} className={item.active ? 'text-indigo-400' : ''} />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer - User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
              IS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-300 truncate">Sathish A.</p>
              <p className="text-[10px] text-zinc-600 truncate">Property Owner</p>
            </div>
            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 text-zinc-600 hover:text-rose-400 transition-all px-2 py-1.5 rounded-lg hover:bg-rose-500/5"
              title="Terminate Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#08080a]/80 border-b border-white/[0.04] px-4 py-3 md:px-8 md:py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="flex items-center gap-2">
                  <Moon size={18} className="text-violet-400 shrink-0" />
                  <h2 className="text-base md:text-xl font-bold text-white tracking-tight">Night Audit Wizard</h2>
                </div>
                <span className="text-[9px] md:text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                  EOD Reconciliation
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-zinc-600 mt-1">
                Current Operational business Date: <strong className="text-zinc-400 font-semibold">{businessDate}</strong>
              </p>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 pt-2 md:pt-0 border-t border-white/[0.02] md:border-none">
              <div className="flex items-center gap-2">
                <button 
                  onClick={loadNightAuditData}
                  className="p-2 rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all"
                  title="Refresh Data"
                >
                  <RefreshCw size={12} className={actionLoading === 'refresh' ? 'animate-spin' : ''} />
                </button>
                <span className="text-[10px] text-zinc-500 md:hidden font-medium">Refresh Data</span>
              </div>
              <div className="text-right text-xs">
                <span className="text-zinc-600 text-[10px] md:text-[11px] block">Active Property:</span>
                <p className="text-white font-bold text-[11px] md:text-sm truncate max-w-[150px] md:max-w-none">{property?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="p-4 md:p-8 flex-1 max-w-6xl w-full mx-auto space-y-6 md:space-y-8">
          
          {/* STEP PROGRESS BAR */}
          {!isRolloverComplete && (
            <div className="grid grid-cols-3 gap-2 md:gap-4 bg-zinc-950/40 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-white/[0.04]">
              {[
                { step: 1, label: "Operational Check", desc: "Verify Departures" },
                { step: 2, label: "Posting Charges", desc: "Post room rates to folios" },
                { step: 3, label: "Rollover & Reconciliation", desc: "Financial summary & Roll" },
              ].map((s) => {
                const isActive = activeStep === s.step;
                const isCompleted = activeStep > s.step;
                return (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(s.step)}
                    className={`flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3.5 p-2 md:p-3 rounded-lg md:rounded-xl text-center md:text-left transition-all relative overflow-hidden ${
                      isActive 
                        ? 'bg-zinc-900/80 border border-white/[0.08] text-white shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded md:rounded-lg flex items-center justify-center font-bold text-[10px] md:text-xs border transition-colors shrink-0 ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                        : isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-zinc-950/40 text-zinc-700 border-white/[0.04]'
                    }`}>
                      {isCompleted ? <Check size={12} /> : s.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-[12px] font-bold leading-tight truncate">{s.label}</p>
                      <p className="text-[9px] text-zinc-500 font-medium mt-0.5 hidden md:block">{s.desc}</p>
                    </div>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* MAIN ACTIONS & SECTIONS */}
          <AnimatePresence mode="wait">
            {isRolloverComplete ? (
              
              /* ROLLED OVER STATIC FLASH REPORT */
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-[#0c0c10] to-[#121217] border border-emerald-500/10 rounded-[2.5rem] p-10 text-center relative overflow-hidden max-w-xl mx-auto shadow-2xl shadow-emerald-950/10"
              >
                {/* Glow decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <Award size={32} />
                </div>

                <h3 className="text-2xl font-bold text-white tracking-tight">Night Audit Succeeded</h3>
                <p className="text-zinc-500 text-xs mt-1.5">Date Rollover Completed for {rolloverSummary?.propertyName}</p>

                {/* Micro divider */}
                <div className="w-12 h-[1px] bg-zinc-800 mx-auto my-6" />

                {/* FLASH REPORT DETAILS */}
                <div className="bg-zinc-950/40 border border-white/[0.04] rounded-2xl p-5 text-left space-y-4 max-w-sm mx-auto">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Rollover Report</span>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Business Date Closed:</span>
                    <strong className="text-zinc-300 font-mono">{rolloverSummary?.closedDate}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Business Date Opened:</span>
                    <strong className="text-emerald-400 font-mono flex items-center gap-1">
                      <Sun size={12} />
                      {rolloverSummary?.openedDate}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/[0.04]">
                    <span className="text-zinc-500">Daily Folio Charges Posted:</span>
                    <span className="text-white font-bold">{rolloverSummary?.bookingsChargedCount} Active Guests</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Rooms Marked Dirty (HK Sync):</span>
                    <span className="text-white font-bold">{rolloverSummary?.roomsMarkedDirty} Rooms</span>
                  </div>
                </div>

                {/* Return CTA */}
                <button
                  onClick={() => {
                    router.push('/dashboard');
                    window.location.reload();
                  }}
                  className="mt-8 bg-white text-black px-8 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-zinc-200 transition-all mx-auto shadow-xl"
                >
                  Return to Overview
                  <ArrowRight size={14} />
                </button>
              </motion.div>

            ) : activeStep === 1 ? (
              
              /* STEP 1: OPERATIONAL CHECK */
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                
                {/* CHECKLIST SUCCESS STATUS */}
                {isStep1Clear ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-6 flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[14px] font-bold text-white">Operational Checklist Clean</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">All scheduled guest departures for today ({businessDate}) are fully checked out or extended. No pending blocks.</p>
                    </div>
                    <button
                      onClick={() => setActiveStep(2)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98]"
                    >
                      Proceed to Post Charges
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-6 flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[14px] font-bold text-white">Pending Departures Must Be Resolved</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">You have active guests scheduled to depart today who haven't checked out. Please check them out or extend their stay below.</p>
                    </div>
                  </div>
                )}

                {/* PENDING DEPARTURES REGISTER */}
                <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2.5xl p-6 backdrop-blur-sm space-y-4 max-w-2xl mx-auto">
                  <div className="flex justify-between items-center pb-3 border-b border-white/[0.04]">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <DoorOpen size={16} className="text-amber-400" />
                        Pending Departures
                      </h4>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Check-out scheduled for {businessDate}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
                      {pendingDepartures.length} Left
                    </span>
                  </div>

                  {pendingDepartures.length === 0 ? (
                    <div className="py-14 text-center text-zinc-600 text-xs italic flex flex-col items-center gap-2">
                      <CheckCircle2 size={24} className="text-emerald-500/40" />
                      All departures cleared.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {pendingDepartures.map((bk) => (
                        <div 
                          key={bk.id}
                          className="p-4 bg-zinc-950/40 border border-white/[0.04] rounded-xl hover:border-white/[0.08] transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-[13px] font-bold text-zinc-200">{bk.guest_name}</h5>
                              <p className="text-[10px] text-zinc-600 mt-0.5">Room: {rooms.find(r => r.id === bk.room_id)?.room_number || 'N/A'}</p>
                            </div>
                            <span className="text-[11px] font-bold text-white">Rs. {bk.amount}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleCheckOut(bk.id, bk.room_id)}
                              className="flex-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 rounded-lg py-2 text-[11px] font-bold transition-all disabled:opacity-50"
                            >
                              {actionLoading === bk.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Check Out Guest'}
                            </button>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => openExtensionModal(bk)}
                              className="flex-1 bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-400 border border-white/5 rounded-lg py-2 text-[11px] font-bold transition-all disabled:opacity-50"
                            >
                              Extend Stay
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>

            ) : activeStep === 2 ? (
              
              /* STEP 2: POST CHARGES */
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2.5xl p-7 backdrop-blur-sm space-y-6">
                  
                  <div>
                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-400" />
                      Auto-Posting Daily Folio Room Charges (Adjustable Dynamic Rates)
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Below are the active stayovers currently checked in. The system pre-calculates their average rate, but you can **manually edit any rate input field** below to post the precise room tariff agreed for this specific date (<strong className="text-indigo-400 font-semibold">{businessDate}</strong>).
                    </p>
                  </div>

                  {/* CHARGES TABLE WITH EDITABLE INPUTS */}
                  <div className="border border-white/[0.04] rounded-xl overflow-hidden bg-black/20">
                    {/* Header (hidden on mobile) */}
                    <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold p-4 bg-zinc-950/40 border-b border-white/[0.04]">
                      <div className="col-span-4">Guest</div>
                      <div className="col-span-3">Room</div>
                      <div className="col-span-3">Reservation Total</div>
                      <div className="col-span-2 text-right">Daily Post Rate (Editable)</div>
                    </div>

                    {checkedInBookings.filter(b => b.check_out !== businessDate && (b.check_out ? b.check_out.substring(0, 10) : '') !== nextBusinessDate).length === 0 ? (
                      <div className="py-14 text-center text-zinc-600 text-xs italic">
                        No active stayovers remaining today. You can proceed directly to rollover.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.03]">
                        {checkedInBookings
                          .filter(b => b.check_out !== businessDate && (b.check_out ? b.check_out.substring(0, 10) : '') !== nextBusinessDate)
                          .map((bk) => {
                            return (
                               <div key={bk.id} className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 p-4 text-xs">
                                {/* Guest details */}
                                <div className="md:col-span-4 font-semibold text-zinc-200 flex justify-between items-center md:block">
                                  <span>{bk.guest_name}</span>
                                  <span className="md:hidden text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-wider">Guest</span>
                                </div>
                                
                                {/* Room details */}
                                <div className="md:col-span-3 text-zinc-400 flex md:block justify-between items-center">
                                  <span className="md:hidden text-zinc-600 text-[10px] uppercase font-bold tracking-wider">Room</span>
                                  <span>Room {rooms.find(r => r.id === bk.room_id)?.room_number || 'N/A'} ({rooms.find(r => r.id === bk.room_id)?.type || 'N/A'})</span>
                                </div>
                                
                                {/* Total details */}
                                <div className="md:col-span-3 text-zinc-500 flex md:block justify-between items-center">
                                  <span className="md:hidden text-zinc-600 text-[10px] uppercase font-bold tracking-wider">Reservation Total</span>
                                  <span>Rs. {bk.amount} ({bk.check_in} to {bk.check_out})</span>
                                </div>
                                
                                {/* Edit rate input */}
                                <div className="md:col-span-2 text-right flex md:block justify-between items-center mt-2 md:mt-0 pt-2 md:pt-0 border-t border-white/[0.02] md:border-none">
                                  <span className="md:hidden text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Daily Post Rate</span>
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-zinc-600 text-[10px]">Rs.</span>
                                    <input
                                      type="number"
                                      value={customRates[bk.id] || ''}
                                      onChange={(e) => {
                                        setCustomRates({
                                          ...customRates,
                                          [bk.id]: e.target.value
                                        });
                                      }}
                                      className="w-24 bg-zinc-950 border border-white/[0.08] rounded-lg px-2 py-1 text-right text-emerald-400 font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ACTION CTA */}
                  <div className="flex justify-between items-center pt-4 border-t border-white/[0.04]">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="flex items-center gap-2 text-zinc-500 hover:text-white font-bold text-xs transition-colors"
                    >
                      <ChevronLeft size={14} />
                      Back to Departures Check
                    </button>

                    <button
                      disabled={actionLoading === 'post-charges'}
                      onClick={handlePostCharges}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/40 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-950/20"
                    >
                      {actionLoading === 'post-charges' ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                      Post Charges & Advance to Reconciliation
                    </button>
                  </div>

                </div>
              </motion.div>

            ) : (
              
              /* STEP 3: RECONCILIATION & ROLLOVER (THE CALCULATIONS BOARD) */
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Visual spec layout header */}
                <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2.5xl p-7 backdrop-blur-sm space-y-6">
                  <div className="flex justify-between items-start pb-4 border-b border-white/[0.04]">
                    <div>
                      <h3 className="text-[15px] font-bold text-white flex items-center gap-2">
                        <Receipt size={18} className="text-violet-400" />
                        Daily Financial Audit & Counter Reconciliation
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        Verify the calculated sales and expenses balance below against your cashier drawer before executing the rollover.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadPDF}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/[0.08] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                    >
                      <Download size={14} />
                      Download PDF Report
                    </button>
                  </div>

                  {/* 1. ROOM TARIFF & F&B BREAKDOWN (REAL TABLE WITH GRIDLINES) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">1. Sales breakdown category matrix</h4>
                    <div className="overflow-x-auto rounded-xl border border-zinc-800">
                      <table className="w-full border-collapse border border-zinc-800 text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-950/80 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                            <th className="border border-zinc-800 p-3.5">Category</th>
                            <th className="border border-zinc-800 p-3.5 text-right">Cash</th>
                            <th className="border border-zinc-800 p-3.5 text-right">PhonePe UPI</th>
                            <th className="border border-zinc-800 p-3.5 text-right">Swipe</th>
                            <th className="border border-zinc-800 p-3.5 text-right">Others (Custom)</th>
                            <th className="border border-zinc-800 p-3.5 text-right bg-zinc-950">Row Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          <tr className="hover:bg-white/[0.01]">
                            <td className="border border-zinc-800 p-3.5 font-semibold text-zinc-200">Room Tariff</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.room.Cash.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.room.UPI.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.room.SWIPE.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.room.Others.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono font-semibold bg-zinc-950/20">
                              Rs. {(reconData.room.Cash + reconData.room.UPI + reconData.room.SWIPE + reconData.room.Others).toFixed(2)}
                            </td>
                          </tr>
                          <tr className="hover:bg-white/[0.01]">
                            <td className="border border-zinc-800 p-3.5 font-semibold text-zinc-200">Food & Water Bill</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.food.Cash.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.food.UPI.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.food.SWIPE.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono">Rs. {reconData.food.Others.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-3.5 text-right text-zinc-300 font-mono font-semibold bg-zinc-950/20">
                              Rs. {(reconData.food.Cash + reconData.food.UPI + reconData.food.SWIPE + reconData.food.Others).toFixed(2)}
                            </td>
                          </tr>
                          <tr className="bg-zinc-900/40 text-emerald-400 font-bold">
                            <td className="border border-zinc-800 p-4 text-zinc-200">TOTAL :</td>
                            <td className="border border-zinc-800 p-4 text-right font-mono">Rs. {reconData.total.Cash.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-4 text-right font-mono">Rs. {reconData.total.UPI.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-4 text-right font-mono">Rs. {reconData.total.SWIPE.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-4 text-right font-mono">Rs. {reconData.total.Others.toFixed(2)}</td>
                            <td className="border border-zinc-800 p-4 text-right font-mono text-emerald-300 bg-emerald-950/10">
                              Rs. {totalSaleAmount.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. EXPENSES LEDGER BOARD */}
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center pl-1">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">2. Daily expenses ledger</h4>
                      <span className="text-xs font-bold text-zinc-500 font-mono bg-zinc-950 px-3 py-1 rounded-md border border-zinc-800">
                        Total Expenses: <span className="text-rose-400">Rs. {totalExpenses.toFixed(2)}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Expenses List Table with Gridlines */}
                      <div className="md:col-span-2 border border-zinc-800 rounded-xl bg-black/25 overflow-hidden max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs border border-zinc-800">
                          <thead>
                            <tr className="bg-zinc-950/80 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                              <th className="border border-zinc-800 p-3 pl-4">Description / Vendor</th>
                              <th className="border border-zinc-800 p-3">Category</th>
                              <th className="border border-zinc-800 p-3">Method</th>
                              <th className="border border-zinc-800 p-3 text-right">Amount</th>
                              <th className="border border-zinc-800 p-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                            {dayExpenses.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-zinc-600 italic">No localized expenses logged today.</td>
                              </tr>
                            ) : (
                              dayExpenses.map((ex) => (
                                <tr key={ex.id} className="hover:bg-white/[0.01]">
                                  <td className="border border-zinc-800 p-3 pl-4 font-semibold text-zinc-300">{ex.description}</td>
                                  <td className="border border-zinc-800 p-3 text-zinc-500">{ex.category}</td>
                                  <td className="border border-zinc-800 p-3 text-zinc-500">{ex.payment_method}</td>
                                  <td className="border border-zinc-800 p-3 text-right font-mono font-bold text-zinc-300">Rs. {Number(ex.amount).toFixed(2)}</td>
                                  <td className="border border-zinc-800 p-3 text-center">
                                    <button 
                                      onClick={() => handleDeleteExpense(ex.id)}
                                      className="text-zinc-600 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Expense Form */}
                      <form onSubmit={handleAddExpense} className="bg-zinc-950/40 border border-white/[0.04] p-4 rounded-xl space-y-3 text-xs flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block pl-1 mb-2">Add Localized Expense</span>
                          <input
                            type="text"
                            required
                            placeholder="Expense Description (e.g. Petrol)"
                            value={newExpDesc}
                            onChange={(e) => setNewExpDesc(e.target.value)}
                            className="w-full bg-black/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                          />
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input
                              type="number"
                              required
                              placeholder="Amount (Rs.)"
                              value={newExpAmount}
                              onChange={(e) => setNewExpAmount(e.target.value)}
                              className="w-full bg-black/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            />
                            <select
                              value={newExpMethod}
                              onChange={(e) => setNewExpMethod(e.target.value)}
                              className="w-full bg-black/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500/50"
                            >
                              <option value="Cash">Cash</option>
                              <option value="UPI">UPI</option>
                            </select>
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingExpense}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1 mt-3"
                        >
                          <Plus size={14} />
                          Log Expense
                        </button>
                      </form>

                    </div>
                  </div>

                  {/* 3 & 4. COUNTER CASH & SALES SUMMARY TABLES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/[0.04]">
                    
                    {/* Column 3: Cash Counter Reconciliation Table with Gridlines */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pl-1">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                          <PiggyBank size={15} className="text-amber-400" />
                          3. Cash Counter Reconciliation
                        </h4>
                        {!isEditingOpening ? (
                          <button 
                            onClick={() => {
                              setOpeningCashOverride(openingCash.toString());
                              setIsOpeningEditable(true);
                            }}
                            className="text-[10px] text-indigo-400 font-bold hover:underline"
                          >
                            Set Opening
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={handleSaveOpeningCash} className="text-[10px] text-emerald-400 font-bold">Save</button>
                            <button onClick={() => setIsOpeningEditable(false)} className="text-[10px] text-zinc-500 font-bold">Cancel</button>
                          </div>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black/25">
                        <table className="w-full border-collapse border border-zinc-800 text-left text-xs">
                          <thead>
                            <tr className="bg-zinc-950/80 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                              <th className="border border-zinc-800 p-3">Reconciliation Step</th>
                              <th className="border border-zinc-800 p-3 text-center w-12">Sign</th>
                              <th className="border border-zinc-800 p-3 text-right w-36">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Yesterday Cash Balance (Opening Drawer)</td>
                              <td className="border border-zinc-800 p-3 text-center text-zinc-500 font-bold">+</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-zinc-200">
                                {isEditingOpening ? (
                                  <input
                                    type="number"
                                    value={openingCashOverride}
                                    onChange={(e) => setOpeningCashOverride(e.target.value)}
                                    className="w-24 bg-black border border-indigo-500/40 rounded px-1.5 py-0.5 text-right font-mono focus:outline-none"
                                  />
                                ) : (
                                  `Rs. ${openingCash.toFixed(2)}`
                                )}
                              </td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Today Cash Received (Tariff + Food)</td>
                              <td className="border border-zinc-800 p-3 text-center text-emerald-500 font-bold">+</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-emerald-400">Rs. {todayCashCollected.toFixed(2)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Expenses Paid in Cash</td>
                              <td className="border border-zinc-800 p-3 text-center text-rose-500 font-bold">-</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-rose-400">Rs. {cashExpenses.toFixed(2)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Expected Drawer Cash</td>
                              <td className="border border-zinc-800 p-3 text-center text-amber-500 font-bold">=</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-zinc-200">Rs. {cashInCounter.toFixed(2)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Handover to Finance Department</td>
                              <td className="border border-zinc-800 p-3 text-center text-rose-500 font-bold">-</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-rose-400">Rs. {handedOverCash.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-emerald-500/5 text-emerald-400 font-bold">
                              <td className="border border-zinc-800 p-3.5 text-zinc-200">Remaining Counter Float (Closing Balance)</td>
                              <td className="border border-zinc-800 p-3.5 text-center text-emerald-400 font-bold">=</td>
                              <td className="border border-zinc-800 p-3.5 text-right font-mono text-emerald-400 text-sm">
                                Rs. {(isClosed ? actualClosingCash : (cashInCounter - handedOverCash))?.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Column 4: Total Sale For the Day Table with Gridlines */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pl-1">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          4. True Daily Sales Total
                        </h4>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black/25">
                        <table className="w-full border-collapse border border-zinc-800 text-left text-xs">
                          <thead>
                            <tr className="bg-zinc-950/80 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                              <th className="border border-zinc-800 p-3">Payment Method Stream</th>
                              <th className="border border-zinc-800 p-3 text-right w-36">Collection Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Cash Collections</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-zinc-200">Rs. {reconData.total.Cash.toFixed(2)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">PhonePe UPI Collections</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-zinc-200">Rs. {reconData.total.UPI.toFixed(2)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Swipe Card Collections</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-zinc-200">Rs. {reconData.total.SWIPE.toFixed(2)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-zinc-400">Others (Custom Payment Modes)</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-zinc-200">Rs. {reconData.total.Others.toFixed(2)}</td>
                            </tr>
                            <tr className="bg-indigo-500/5 text-indigo-400 font-bold">
                              <td className="border border-zinc-800 p-3.5 text-zinc-200">TOTAL SALE FOR THE DAY</td>
                              <td className="border border-zinc-800 p-3.5 text-right font-mono text-indigo-400 text-sm">Rs. {totalSaleAmount.toFixed(2)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.01]">
                              <td className="border border-zinc-800 p-3 text-rose-400">Total Logged Expenses</td>
                              <td className="border border-zinc-800 p-3 text-right font-mono text-rose-400">- Rs. {totalExpenses.toFixed(2)}</td>
                            </tr>
                            <tr className={`${(totalSaleAmount - totalExpenses) >= 0 ? "bg-emerald-500/5 text-emerald-400" : "bg-rose-500/5 text-rose-400"} font-bold`}>
                              <td className="border border-zinc-800 p-3.5 text-zinc-200">TOTAL SALE VS EXPENSES (NET)</td>
                              <td className={`border border-zinc-800 p-3.5 text-right font-mono text-sm ${(totalSaleAmount - totalExpenses) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                Rs. {(totalSaleAmount - totalExpenses).toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {isAlreadyRolledOver && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium flex items-start gap-2.5 mb-2 shadow-lg">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>Safety Warning:</strong> The system business date ({businessDate}) is already equal to or ahead of your local calendar date ({getLocalDateStr()}). Running another Night Audit rollover is blocked to prevent skipping dates or double-charging.
                      </div>
                    </div>
                  )}

                  {/* BOTTOM ACTION CTA */}
                  <div className="flex justify-between items-center pt-6 border-t border-white/[0.04]">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="flex items-center gap-2 text-zinc-500 hover:text-white font-bold text-xs transition-colors"
                    >
                      <ChevronLeft size={14} />
                      Back to Post Charges
                    </button>

                    <button
                      disabled={actionLoading === 'rollover' || isAlreadyRolledOver}
                      onClick={handleExecuteRollover}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none text-white px-7 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10"
                    >
                      {actionLoading === 'rollover' ? <Loader2 size={14} className="animate-spin" /> : <Sun size={14} />}
                      Run Day Rollover Now
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </main>

      {/* ===== EXTEND STAY MODAL ===== */}
      <AnimatePresence>
        {extendingBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-sm bg-zinc-900 border border-white/[0.1] rounded-2xl p-6 shadow-2xl relative"
            >
              <h4 className="text-[14px] font-bold text-white flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-indigo-400" />
                Extend Guest Stay
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed mb-5">
                Adjust departure checkout date for <strong className="text-zinc-300 font-semibold">{extendingBooking.guest_name}</strong>.
              </p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block pl-1">New Check-Out Date</label>
                  <input
                    type="date"
                    min={extendingBooking.check_out}
                    value={extensionDate}
                    onChange={(e) => setExtensionDate(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setExtendingBooking(null)}
                    className="flex-1 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 rounded-lg py-2.5 text-[11px] font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={handleExtendStay}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-[11px] font-bold transition-all shadow-lg"
                  >
                    {actionLoading === extendingBooking.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Confirm Extension'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
