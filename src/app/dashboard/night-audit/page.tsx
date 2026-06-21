'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  checkInGuest, 
  checkOutGuest 
} from '@/app/actions/booking';
import { 
  markArrivalNoShow, 
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
  Users,
  Settings,
  Lock,
  Brush,
  ChevronRight,
  Calendar,
  Check,
  Award,
  ChevronLeft,
  RefreshCw,
  LogOut,
  Building
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

export default function NightAuditPage() {
  const [property, setProperty] = useState<Property | null>(null);
  const [businessDate, setBusinessDate] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Wizard state
  const [activeStep, setActiveStep] = useState<number>(1); // 1: Operational Check, 2: Post Charges, 3: Rollover
  const [isChargesPosted, setIsChargesPosted] = useState<boolean>(false);
  const [isRolloverComplete, setIsRolloverComplete] = useState<boolean>(false);
  const [rolloverSummary, setRolloverSummary] = useState<any>(null);

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
        // Fetch property
        const { data: prop } = await supabase.from('properties').select('id, name').eq('id', activeId).single();
        if (prop) setProperty(prop);

        // Fetch business date from app_settings
        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'business_date')
          .single();

        const activeDate = settingsData?.value || '2026-06-21';
        setBusinessDate(activeDate);

        // Fetch bookings and rooms
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .eq('property_id', activeId);

        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .eq('property_id', activeId);

        if (bookingsData) setBookings(bookingsData);
        if (roomsData) setRooms(roomsData);
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

  // Filter lists based on business date
  const pendingArrivals = bookings.filter(b => 
    b.check_in === businessDate && b.status === 'Confirmed'
  );

  const pendingDepartures = bookings.filter(b => 
    b.check_out === businessDate && b.status === 'Checked In'
  );

  const activeStayovers = bookings.filter(b => 
    b.status === 'Checked In' && b.check_out !== businessDate
  );

  // All guests currently checked in
  const checkedInBookings = bookings.filter(b => b.status === 'Checked In');

  // Step 1 Actions
  const handleCheckIn = async (bookingId: string) => {
    setActionLoading(bookingId);
    const res = await checkInGuest(bookingId);
    if (res.success) {
      await loadNightAuditData();
    } else {
      alert(res.error || "Check-in failed");
    }
    setActionLoading(null);
  };

  const handleNoShow = async (bookingId: string) => {
    if (!confirm("Are you sure you want to mark this booking as No-Show/Cancelled?")) return;
    setActionLoading(bookingId);
    const res = await markArrivalNoShow(bookingId);
    if (res.success) {
      await loadNightAuditData();
    } else {
      alert(res.error || "Failed to process No-Show");
    }
    setActionLoading(null);
  };

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
    // Default next day
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

  // Step 2 Actions
  const handlePostCharges = async () => {
    if (!property) return;
    setActionLoading('post-charges');
    
    // Prepare list of bookings to charge with calculated daily rate
    const chargesList = checkedInBookings.map(b => {
      const start = new Date(b.check_in);
      const end = new Date(b.check_out);
      const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const dailyRate = Number(b.amount) / nights;
      
      return {
        id: b.id,
        amount: parseFloat(dailyRate.toFixed(2)),
        guestName: b.guest_name
      };
    });

    const res = await postDailyRoomCharges(property.id, businessDate, chargesList);
    if (res.success) {
      setIsChargesPosted(true);
      setActiveStep(3); // Advance to rollover
    } else {
      alert(res.error || "Charges posting failed");
    }
    setActionLoading(null);
  };

  // Step 3 Actions
  const handleExecuteRollover = async () => {
    if (!property) return;
    setActionLoading('rollover');
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

  const isStep1Clear = pendingArrivals.length === 0 && pendingDepartures.length === 0;

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
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#08080a]/80 border-b border-white/[0.04] px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <Moon size={20} className="text-violet-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Night Audit Wizard</h2>
                <span className="text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                  EOD Reconciliation
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Current Operational business Date: <strong className="text-zinc-400 font-semibold">{businessDate}</strong>
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={loadNightAuditData}
                className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all"
                title="Refresh Data"
              >
                <RefreshCw size={14} className={actionLoading === 'refresh' ? 'animate-spin' : ''} />
              </button>
              <div className="text-right text-xs">
                <span className="text-zinc-600">Active Property:</span>
                <p className="text-white font-bold">{property?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="p-8 flex-1 max-w-6xl w-full mx-auto space-y-8">
          
          {/* STEP PROGRESS BAR */}
          {!isRolloverComplete && (
            <div className="grid grid-cols-3 gap-4 bg-zinc-950/40 p-1.5 rounded-2xl border border-white/[0.04]">
              {[
                { step: 1, label: "Operational Check", desc: "Resolve Arrivals/Departures" },
                { step: 2, label: "Posting Charges", desc: "Post room rates to folios" },
                { step: 3, label: "Close & Rollover", desc: "Advance Date & housekeeping" },
              ].map((s) => {
                const isActive = activeStep === s.step;
                const isCompleted = activeStep > s.step;
                return (
                  <button
                    key={s.step}
                    disabled={s.step > activeStep && !isCompleted}
                    onClick={() => setActiveStep(s.step)}
                    className={`flex items-center gap-3.5 p-3 rounded-xl text-left transition-all relative overflow-hidden ${
                      isActive 
                        ? 'bg-zinc-900/80 border border-white/[0.08] text-white shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                        : isCompleted
                          ? 'text-emerald-400 hover:bg-white/[0.02]'
                          : 'text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-colors ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                        : isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'bg-zinc-950/40 text-zinc-700 border-white/[0.04]'
                    }`}>
                      {isCompleted ? <Check size={14} /> : s.step}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold leading-tight">{s.label}</p>
                      <p className="text-[9px] text-zinc-500 font-medium mt-0.5">{s.desc}</p>
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

                {/* FINISH CTA */}
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
                      <p className="text-xs text-zinc-500 mt-0.5">All departures and arrivals for today ({businessDate}) are resolved. No actions needed.</p>
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
                      <h4 className="text-[14px] font-bold text-white">Unresolved Day Actions Present</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">You have departures that must check out, or arrivals that must check in or be marked as no-shows before you can run rollover.</p>
                    </div>
                  </div>
                )}

                {/* LISTS SECTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* PENDING ARRIVALS LIST */}
                  <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2.5xl p-6 backdrop-blur-sm space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-white/[0.04]">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Users size={16} className="text-indigo-400" />
                          Pending Arrivals
                        </h4>
                        <p className="text-[10px] text-zinc-600 mt-0.5">Check-in scheduled for {businessDate}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
                        {pendingArrivals.length} Left
                      </span>
                    </div>

                    {pendingArrivals.length === 0 ? (
                      <div className="py-10 text-center text-zinc-600 text-xs italic flex flex-col items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500/40" />
                        No pending arrivals left.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {pendingArrivals.map((bk) => (
                          <div 
                            key={bk.id}
                            className="p-4 bg-zinc-950/40 border border-white/[0.04] rounded-xl hover:border-white/[0.08] transition-all space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-[13px] font-bold text-zinc-200">{bk.guest_name}</h5>
                                <p className="text-[10px] text-zinc-600 mt-0.5">Room: {rooms.find(r => r.id === bk.room_id)?.room_number || 'N/A'}</p>
                              </div>
                              <span className="text-[11px] font-bold text-white">${bk.amount}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleCheckIn(bk.id)}
                                className="flex-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg py-2 text-[11px] font-bold transition-all disabled:opacity-50"
                              >
                                {actionLoading === bk.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Check In'}
                              </button>
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleNoShow(bk.id)}
                                className="flex-1 bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-400 border border-white/5 rounded-lg py-2 text-[11px] font-bold transition-all disabled:opacity-50"
                              >
                                Mark No-Show
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PENDING DEPARTURES LIST */}
                  <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2.5xl p-6 backdrop-blur-sm space-y-4">
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
                      <div className="py-10 text-center text-zinc-600 text-xs italic flex flex-col items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500/40" />
                        No pending departures left.
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
                              <span className="text-[11px] font-bold text-white">${bk.amount}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleCheckOut(bk.id, bk.room_id)}
                                className="flex-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 rounded-lg py-2 text-[11px] font-bold transition-all disabled:opacity-50"
                              >
                                {actionLoading === bk.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Check Out'}
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
                      Auto-Posting Daily Folio Room Charges
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Below are the guests currently in <strong className="text-zinc-400 font-semibold">Checked In</strong> status who will have their room rate posted to their folios for the date <strong className="text-indigo-400 font-semibold">{businessDate}</strong>.
                    </p>
                  </div>

                  {/* CHARGES TABLE */}
                  <div className="border border-white/[0.04] rounded-xl overflow-hidden bg-black/20">
                    <div className="grid grid-cols-12 gap-4 text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold p-4 bg-zinc-950/40 border-b border-white/[0.04]">
                      <div className="col-span-4">Guest</div>
                      <div className="col-span-2">Room</div>
                      <div className="col-span-2">Duration</div>
                      <div className="col-span-2">Total Reservation</div>
                      <div className="col-span-2 text-right">Daily Post Charge</div>
                    </div>

                    {checkedInBookings.length === 0 ? (
                      <div className="py-14 text-center text-zinc-600 text-xs italic">
                        No checked in guests currently at the property.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.03]">
                        {checkedInBookings.map((bk) => {
                          const start = new Date(bk.check_in);
                          const end = new Date(bk.check_out);
                          const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                          const dailyRate = Number(bk.amount) / nights;
                          return (
                            <div key={bk.id} className="grid grid-cols-12 gap-4 items-center p-4 text-xs">
                              <div className="col-span-4 font-semibold text-zinc-200">{bk.guest_name}</div>
                              <div className="col-span-2 text-zinc-400">Room {rooms.find(r => r.id === bk.room_id)?.room_number || 'N/A'}</div>
                              <div className="col-span-2 text-zinc-500">{nights} Nights ({bk.check_in} - {bk.check_out})</div>
                              <div className="col-span-2 text-zinc-500">${bk.amount}</div>
                              <div className="col-span-2 text-right font-bold text-emerald-400">${dailyRate.toFixed(2)}</div>
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
                      Back to Operational Check
                    </button>

                    <button
                      disabled={checkedInBookings.length === 0 || actionLoading === 'post-charges'}
                      onClick={handlePostCharges}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/40 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-950/20"
                    >
                      {actionLoading === 'post-charges' ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                      Post Charges & Advance to Rollover
                    </button>
                  </div>

                </div>
              </motion.div>

            ) : (
              
              /* STEP 3: CLOSE & ROLLOVER */
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2.5xl p-8 backdrop-blur-sm space-y-6">
                  
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                      <Sun size={24} className="animate-pulse" />
                    </div>
                    <h3 className="text-[16px] font-bold text-white">Execute Day Rollover & Sync</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                      You are about to close operational date <strong className="text-zinc-400 font-semibold">{businessDate}</strong> and officially rollover the property's PMS.
                    </p>
                  </div>

                  {/* ACTION LIST HIGHLIGHTS */}
                  <div className="bg-zinc-950/50 border border-white/[0.04] rounded-2xl p-5 space-y-4 text-xs">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">What Rollover Executing</span>
                    
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                      <div>
                        <strong className="text-zinc-300">Increment business Date:</strong>
                        <p className="text-zinc-500 mt-0.5">The central PMS date advances by +1 day (to {new Date(new Date(businessDate).setDate(new Date(businessDate).getDate() + 1)).toISOString().substring(0, 10)})</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                      <div>
                        <strong className="text-zinc-300">Synchronize Housekeeping Room Status:</strong>
                        <p className="text-zinc-500 mt-0.5">All rooms currently registered as "Occupied" will be instantly marked as "Dirty" on the Housekeeping Board.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                      <div>
                        <strong className="text-zinc-300">Seal Operational Audit Trail:</strong>
                        <p className="text-zinc-500 mt-0.5">Reconciles final active lists and stores a snapshot for property analytics.</p>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTION CTA */}
                  <div className="flex justify-between items-center pt-4 border-t border-white/[0.04]">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="flex items-center gap-2 text-zinc-500 hover:text-white font-bold text-xs transition-colors"
                    >
                      <ChevronLeft size={14} />
                      Back to Post Charges
                    </button>

                    <button
                      disabled={actionLoading === 'rollover'}
                      onClick={handleExecuteRollover}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10"
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
