"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bed, Calendar, Search, UserCheck, Clock, 
  ArrowRightLeft, ChevronLeft, ChevronRight, 
  Plus, Loader2, Building2, LayoutDashboard,
  DoorOpen, Activity, Users, Settings, LogOut,
  ChevronsUpDown, Lock, Brush, CheckCircle2, ClipboardCheck,
  Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BookingModal from './BookingModal';
import { checkInGuest, checkOutGuest, updateGuestNotes, toggleRoomBlock, upgradeRoom, issueRefund, cancelBooking } from '@/app/actions/booking';


const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: true, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Users, label: "Staff", href: "/dashboard/staff", active: false, module: 'staff_management' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

const generateDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
  }
  return days;
};

const DAYS = generateDays();

export default function FrontOfficeTerminal() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessiblePropsList, setAccessiblePropsList] = useState<any[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'tape' | 'arrivals' | 'departures' | 'house' | 'all'>('tape');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Drawer State
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [upgradeRoomId, setUpgradeRoomId] = useState('');
  const [refundInput, setRefundInput] = useState('');
  
  // Check-In Requirements State
  const [checkIdVerified, setCheckIdVerified] = useState(false);
  const [checkRegCardSigned, setCheckRegCardSigned] = useState(false);
  const [checkPaymentSecured, setCheckPaymentSecured] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  // Extract fetch data to a callable function to avoid window.location.reload()
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: acc } = await supabase.from('property_access').select('property_id, properties(id, name)').eq('user_id', auth.user.id);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
      setUserProfile(prof);

      let activeId = localStorage.getItem('pms_active_property');
      if (acc && acc.length > 0) {
        setAccessiblePropsList(acc.map((a: any) => a.properties));
        if (!activeId || !acc.some((a: any) => a.property_id === activeId)) {
          activeId = acc[0].property_id;
        }
      } else if (prof?.property_id) {
        activeId = prof.property_id;
        const { data: fallbackProp } = await supabase.from('properties').select('id, name').eq('id', activeId).single();
        if (fallbackProp) setAccessiblePropsList([fallbackProp]);
      }

      if (activeId) {
        const { data: prop } = await supabase.from('properties').select('*').eq('id', activeId).single();
        setProperty(prop);

        // Fetch rooms and bookings, explicitly bypassing browser cache
        const [roomsRes, bookingsRes] = await Promise.all([
          supabase.from('rooms').select('*').eq('property_id', activeId).order('room_number'),
          supabase.from('bookings').select('*').eq('property_id', activeId).order('created_at', { ascending: false })
        ]);

        setRooms(roomsRes.data || []);
        setBookings(bookingsRes.data || []);
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getBookingForRoom = (roomId: string) => {
    return bookings.find(b => b.room_id === roomId && (b.status === 'Confirmed' || b.status === 'Checked In'));
  };

  // Helper to format local date to YYYY-MM-DD
  const getLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to format date for human reading (e.g., "2026-04-21" -> "Apr 21, 2026")
  const formatFriendlyDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const getArrivalsToday = () => {
    const todayStr = getLocalYYYYMMDD(new Date());
    return bookings.filter(b => {
      // Extract only the first 10 characters (YYYY-MM-DD) from whatever Postgres returned
      const dbDate = b.check_in ? String(b.check_in).substring(0, 10) : '';
      return dbDate === todayStr && b.status === 'Confirmed';
    });
  };

  const getDeparturesToday = () => {
    const todayStr = getLocalYYYYMMDD(new Date());
    return bookings.filter(b => {
      // Extract only the first 10 characters
      const dbDate = b.check_out ? String(b.check_out).substring(0, 10) : '';
      return dbDate === todayStr && b.status === 'Checked In';
    });
  };

  const getInHouse = () => {
    return bookings.filter(b => b.status === 'Checked In');
  };

  const getAllReservations = () => {
    let filtered = bookings;
    
    if (searchQuery) {
      // UNIVERSAL SEARCH: If they are searching, look through EVERYTHING (Past, Present, Cancelled)
      const lowerQuery = searchQuery.toLowerCase();
      filtered = bookings.filter(b => 
        b.guest_name.toLowerCase().includes(lowerQuery) || 
        b.id.toLowerCase().includes(lowerQuery)
      );
    } else {
      // DEFAULT VIEW: If not searching, ONLY show upcoming 'Confirmed' reservations to prevent clutter
      filtered = bookings.filter(b => b.status === 'Confirmed');
    }

    // Sort chronologically by check-in date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.check_in).getTime();
      const dateB = new Date(b.check_in).getTime();
      return dateA - dateB;
    });
  };

  const hasAccess = (moduleName: string) => {
    if (!userProfile) return true;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    
    const perms = userProfile.permissions || {};
    const modPerms = perms[moduleName];
    
    if (!modPerms || Object.values(modPerms).every(v => v === 'none')) {
      return false;
    }
    return true;
  };

  // SURGICAL IAM CHECKS (Checking specific JSON keys)
  const canCreateBooking = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return userProfile.permissions?.front_office?.create_booking === 'write' || userProfile.permissions?.front_office?.create_booking === 'full';
  };

  const canCheckIn = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return userProfile.permissions?.front_office?.perform_check_in === 'write' || userProfile.permissions?.front_office?.perform_check_in === 'full';
  };

  const canCheckOut = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return userProfile.permissions?.front_office?.perform_check_out === 'write' || userProfile.permissions?.front_office?.perform_check_out === 'full';
  };

  const canRefund = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return userProfile.permissions?.front_office?.refund_folio === 'write' || userProfile.permissions?.front_office?.refund_folio === 'full';
  };

  const canUpgrade = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return userProfile.permissions?.front_office?.upgrade_room === 'write' || userProfile.permissions?.front_office?.upgrade_room === 'full';
  };

  const canBlockRoom = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return userProfile.permissions?.front_office?.block_rooms === 'write' || userProfile.permissions?.front_office?.block_rooms === 'full';
  };

  const canWriteNotes = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return userProfile.permissions?.front_office?.guest_notes === 'write' || userProfile.permissions?.front_office?.guest_notes === 'full';
  };

  const canCancel = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    // For now, we reuse modify_booking permission for cancellation
    return userProfile.permissions?.front_office?.modify_booking === 'write' || userProfile.permissions?.front_office?.modify_booking === 'full';
  };

  // --- ACTION HANDLERS ---
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    if (!confirm(`Are you sure you want to PERMANENTLY CANCEL the reservation for ${selectedBooking.guest_name}?`)) return;
    
    setActionLoading(true);
    const res = await cancelBooking(selectedBooking.id, selectedBooking.room_id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    const res = await updateGuestNotes(selectedBooking.id, notesInput);
    if (res.success) {
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, notes: notesInput } : b));
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleProcessRefund = async () => {
    if (!selectedBooking || !refundInput) return;
    const amount = parseFloat(refundInput);
    if (isNaN(amount) || amount <= 0) return alert("Invalid refund amount");

    setActionLoading(true);
    const res = await issueRefund(selectedBooking.id, selectedBooking.amount, amount);
    if (res.success && res.newAmount !== undefined) {
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, amount: res.newAmount } : b));
      setRefundInput('');
      setSelectedBooking({ ...selectedBooking, amount: res.newAmount }); // Update drawer UI
      alert(`Refund of $${amount} successful. New balance: $${res.newAmount}`);
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleExecuteUpgrade = async () => {
    if (!selectedBooking || !upgradeRoomId) return;
    setActionLoading(true);
    const res = await upgradeRoom(selectedBooking.id, selectedBooking.room_id, upgradeRoomId);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleBlockRoom = async (room: any) => {
    setActionLoading(true);
    const res = await toggleRoomBlock(room.id, room.status);
    if (res.success && res.newStatus) {
      setRooms(rooms.map(r => r.id === room.id ? { ...r, status: res.newStatus } : r));
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleSafeCheckIn = async (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation();
    await checkInGuest(bookingId);
    window.location.reload();
  };

  const handleSafeCheckOut = async (e: React.MouseEvent, bookingId: string, roomId: string) => {
    e.stopPropagation();
    await checkOutGuest(bookingId, roomId);
    window.location.reload();
  };

  const openActionDrawer = (booking: any) => {
    setSelectedBooking(booking);
    setNotesInput(booking.notes || '');
    setRefundInput('');
    setUpgradeRoomId('');
    
    // Reset Check-In checklist for safety
    setCheckIdVerified(false);
    setCheckRegCardSigned(false);
    setCheckPaymentSecured(false);
  };

  // --- SUB-COMPONENT: LIST ITEM ---
  const BookingRow = ({ booking }: { booking: any }) => (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => openActionDrawer(booking)}
      className="group flex items-center justify-between p-5 bg-zinc-900/40 border border-white/[0.04] rounded-2xl hover:border-indigo-500/40 transition-all cursor-pointer shadow-xl"
    >
      <div className="flex items-center gap-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center text-indigo-400 font-black text-xs uppercase group-hover:scale-105 transition-transform">
          {booking.guest_name.substring(0, 2)}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{booking.guest_name}</h4>
          <div className="flex flex-col gap-1 mt-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Room {rooms.find(r => r.id === booking.room_id)?.room_number || 'N/A'} &bull; {booking.id.slice(0, 8)}
            </p>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md w-fit">
              {calculateNights(booking.check_in, booking.check_out)} Nights &bull; {formatFriendlyDate(booking.check_in)} to {formatFriendlyDate(booking.check_out)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right hidden md:block">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter">Amount Due</p>
          <p className="text-sm font-black text-white">${booking.amount}</p>
        </div>
        
        <div className="flex gap-2">
          {booking.status === 'Confirmed' && (
            canCheckIn() ? (
              <button 
                onClick={(e) => { e.stopPropagation(); openActionDrawer(booking); }}
                className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-amber-500/10"
              >
                START CHECK-IN
              </button>
            ) : <Lock size={14} className="text-zinc-700 mx-4" />
          )}
          {booking.status === 'Checked In' && (
            canCheckOut() ? (
              <button 
                onClick={(e) => handleSafeCheckOut(e, booking.id, booking.room_id)}
                className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-rose-500/10"
              >
                CHECK OUT
              </button>
            ) : <Lock size={14} className="text-zinc-700 mx-4" />
          )}
        </div>
      </div>
    </motion.div>
  );

  const calculateNights = (inDate: string, outDate: string) => {
    const d1 = new Date(inDate);
    const d2 = new Date(outDate);
    const diff = d2.getTime() - d1.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (isLoading) {
    return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-[#08080a] font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* SIDEBAR (Unified) */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl shrink-0">
        <div className="p-6 pb-4 relative">
          <div className="flex items-center gap-3 p-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-[13px] font-bold text-white truncate max-w-[130px]">{property?.name || 'Loading...'}</h1>
              <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Operational Unit</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {NAV_ITEMS.map((item) => {
            const locked = !hasAccess(item.module);
            return (
              <Link
                key={item.label}
                href={locked ? "#" : item.href}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    alert(`Access Restricted: The ${item.label} module requires higher authorization.`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  item.active ? 'bg-white/[0.06] text-white' : locked ? 'text-zinc-700' : 'text-zinc-500 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <item.icon size={17} />
                <span className="flex-1">{item.label}</span>
                {locked && <Lock size={12} />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="p-8 border-b border-white/[0.04] bg-[#08080a] flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <Activity className="text-emerald-400" />
                Front Office Terminal
              </h2>
              <p className="text-zinc-500 text-sm mt-1">Real-time availability and guest management</p>
            </div>
            
            {canCreateBooking() && (
              <button 
                onClick={() => setShowBookingModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <Plus size={18} />
                New Walk-In
              </button>
            )}
          </div>

          {/* TAB SYSTEM */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-2xl w-fit self-center md:self-start">
              {[
                { id: 'tape', label: 'Tape Chart', icon: Calendar },
                { id: 'arrivals', label: 'Arrivals Today', icon: UserCheck },
                { id: 'departures', label: 'Departures Today', icon: LogOut },
                { id: 'house', label: 'In-House', icon: Bed },
                { id: 'all', label: 'Reservations', icon: Search },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery(''); // Clear search when switching tabs
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                  {tab.id === 'arrivals' && getArrivalsToday().length > 0 && <span className="ml-1 bg-white text-indigo-600 px-1.5 py-0.5 rounded-md text-[9px]">{getArrivalsToday().length}</span>}
                </button>
              ))}
            </div>

            {/* SEARCH BAR (Only visible on All Reservations) */}
            {activeTab === 'all' && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                <input 
                  type="text" 
                  placeholder="Search guest or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          {activeTab === 'tape' ? (
            <div className="bg-zinc-900/30 rounded-2xl border border-white/[0.06] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-white/[0.06]">
                    <th className="p-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest border-r border-white/5 sticky left-0 bg-[#09090b] z-20">Room</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-r border-white/5 min-w-[140px]">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => {
                    const booking = getBookingForRoom(room.id);
                    return (
                      <tr key={room.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-4 border-r border-white/5 sticky left-0 bg-[#09090b] z-10">
                          {canBlockRoom() ? (
                            <button 
                              onClick={() => handleBlockRoom(room)}
                              disabled={actionLoading || (room.status !== 'Available' && room.status !== 'Blocked')}
                              className={`text-sm font-bold transition-colors ${room.status === 'Blocked' ? 'text-rose-500 hover:text-rose-400' : 'text-white hover:text-rose-300'} disabled:opacity-50`}
                            >
                              {room.room_number} {room.status === 'Blocked' && <Lock size={10} className="inline ml-1" />}
                            </button>
                          ) : (
                            <p className={`text-sm font-bold ${room.status === 'Blocked' ? 'text-rose-500' : 'text-white'}`}>
                              {room.room_number} {room.status === 'Blocked' && <Lock size={10} className="inline ml-1" />}
                            </p>
                          )}
                          <p className="text-[10px] text-zinc-500 uppercase mt-0.5">{room.type}</p>
                        </td>
                        {DAYS.map((_, idx) => (
                          <td key={idx} className="p-2 border-r border-white/5 relative h-20">
                            {booking && idx === 0 ? (
                              <motion.div 
                                layoutId={booking.id}
                                onClick={() => openActionDrawer(booking)}
                                className={`absolute inset-y-2 left-2 right-[-240px] rounded-xl border p-3 flex items-center justify-between z-20 shadow-2xl cursor-pointer hover:border-indigo-400/50 transition-colors ${
                                  booking.status === 'Confirmed' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
                                }`}
                              >
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center gap-2">
                                    <UserCheck size={14} className={booking.status === 'Confirmed' ? 'text-amber-400' : 'text-emerald-400'} />
                                    <span className="text-[12px] font-bold text-white">{booking.guest_name}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      booking.status === 'Confirmed' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                                    }`}>
                                      {booking.status}
                                    </span>
                                    
                                    <div className="flex gap-2">
                                      {booking.status === 'Confirmed' && (
                                        canCheckIn() ? (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); openActionDrawer(booking); }}
                                            className="bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold px-3 py-1 rounded-lg transition-all"
                                          >
                                            Start Check-In
                                          </button>
                                        ) : (
                                          <button disabled className="bg-zinc-800 text-zinc-600 text-[9px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 cursor-not-allowed">
                                            <Lock size={10} /> Check In
                                          </button>
                                        )
                                      )}
                                      {booking.status === 'Checked In' && (
                                        canCheckOut() ? (
                                          <button 
                                            onClick={(e) => handleSafeCheckOut(e, booking.id, room.id)}
                                            className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold px-3 py-1 rounded-lg transition-all"
                                          >
                                            Check Out
                                          </button>
                                        ) : (
                                          <button disabled className="bg-zinc-800 text-zinc-600 text-[9px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 cursor-not-allowed">
                                            <Lock size={10} /> Check Out
                                          </button>
                                        )
                                      )}
                                    </div>                                  </div>
                                </div>
                              </motion.div>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4 pb-20">
              {activeTab === 'arrivals' && (
                getArrivalsToday().length === 0 ? (
                  <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <CheckCircle2 size={40} className="text-emerald-500/40 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Arrivals Remaining Today</p>
                  </div>
                ) : getArrivalsToday().map(b => <BookingRow key={b.id} booking={b} />)
              )}
              {activeTab === 'departures' && (
                getDeparturesToday().length === 0 ? (
                  <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <LogOut size={40} className="text-indigo-500/40 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Departures Scheduled Today</p>
                  </div>
                ) : getDeparturesToday().map(b => <BookingRow key={b.id} booking={b} />)
              )}
              {activeTab === 'house' && (
                getInHouse().length === 0 ? (
                  <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <Bed size={40} className="text-amber-500/40 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Guests Currently In-House</p>
                  </div>
                ) : getInHouse().map(b => <BookingRow key={b.id} booking={b} />)
              )}
              {activeTab === 'all' && (
                getAllReservations().length === 0 ? (
                  <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <Search size={40} className="text-zinc-500/40 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Reservations Found</p>
                  </div>
                ) : getAllReservations().map(b => <BookingRow key={b.id} booking={b} />)
              )}
            </div>
          )}
        </div>
      </main>

      {/* ACTION DRAWER */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[450px] bg-[#0a0a0c] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06] bg-zinc-900/40 backdrop-blur-md flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserCheck className="text-indigo-400" size={20} />
                    {selectedBooking.guest_name}
                  </h2>
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                    {calculateNights(selectedBooking.check_in, selectedBooking.check_out)} Nights &bull; {selectedBooking.check_in} to {selectedBooking.check_out}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* 0. CHECK-IN REQUIREMENTS (Only for Confirmed guests) */}
                {selectedBooking.status === 'Confirmed' && (
                  <div className="space-y-3 pb-6 border-b border-white/[0.04]">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <ClipboardCheck size={14} /> Check-In Requirements
                    </h3>
                    <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-white/[0.04]">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkIdVerified} onChange={e => setCheckIdVerified(e.target.checked)} />
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Verify Guest Identity (Aadhar/Passport)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkRegCardSigned} onChange={e => setCheckRegCardSigned(e.target.checked)} />
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Sign Digital RegCard & Terms</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkPaymentSecured} onChange={e => setCheckPaymentSecured(e.target.checked)} />
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Secure Payment / Auth (${selectedBooking.amount})</span>
                      </label>
                    </div>
                    
                    <button 
                      onClick={(e) => handleSafeCheckIn(e as any, selectedBooking.id)}
                      disabled={!checkIdVerified || !checkRegCardSigned || !checkPaymentSecured || actionLoading || !canCheckIn()}
                      className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 disabled:text-emerald-500/50 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:shadow-none flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Complete Check-In"}
                    </button>
                    {!canCheckIn() && <p className="text-[10px] text-rose-500 flex items-center gap-1 justify-center mt-2"><Lock size={10} /> You do not have permission to Check-In guests.</p>}
                  </div>
                )}

                {/* 1. GUEST NOTES */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> Guest Notes
                  </h3>
                  <div className="bg-black/40 border border-white/[0.04] rounded-xl p-2 focus-within:border-indigo-500/50 transition-colors">
                    <textarea 
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      disabled={!canWriteNotes() || actionLoading}
                      placeholder="Add dietary requirements, late arrival notes, etc..."
                      className="w-full h-24 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 resize-none focus:outline-none p-2 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveNotes}
                      disabled={!canWriteNotes() || actionLoading || notesInput === (selectedBooking.notes || "")}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Save Notes"}
                    </button>
                  </div>
                </div>

                {/* 2. ROOM UPGRADE */}
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRightLeft size={14} /> Room Move / Upgrade
                  </h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Moving this guest will instantly mark Room {rooms.find(r => r.id === selectedBooking.room_id)?.room_number} as "Dirty" and assign them to the new room.
                  </p>
                  <div className="flex items-center gap-3">
                    <select 
                      value={upgradeRoomId}
                      onChange={(e) => setUpgradeRoomId(e.target.value)}
                      disabled={!canUpgrade() || actionLoading}
                      className="flex-1 bg-black/40 border border-white/[0.06] text-sm text-zinc-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 appearance-none"
                    >
                      <option value="">Select Available Room...</option>
                      {rooms.filter(r => r.status === "Available" && r.id !== selectedBooking.room_id).map(r => (
                        <option key={r.id} value={r.id}>Room {r.room_number} ({r.type})</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleExecuteUpgrade}
                      disabled={!canUpgrade() || actionLoading || !upgradeRoomId}
                      className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      Execute Move
                    </button>
                  </div>
                  {!canUpgrade() && <p className="text-[10px] text-rose-500 flex items-center gap-1"><Lock size={10} /> You do not have permission to process room moves.</p>}
                </div>

                {/* 3. REFUND FOLIO */}
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> Refund Folio
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <span className="text-xs font-bold text-zinc-400">Total Collected</span>
                    <span className="text-sm font-black text-white">${selectedBooking.amount}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                      <input 
                        type="number"
                        value={refundInput}
                        onChange={(e) => setRefundInput(e.target.value)}
                        disabled={!canRefund() || actionLoading}
                        placeholder="Amount to refund"
                        className="w-full bg-black/40 border border-white/[0.06] text-sm text-zinc-300 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:border-rose-500/50 disabled:opacity-50"
                      />
                    </div>
                    <button 
                      onClick={handleProcessRefund}
                      disabled={!canRefund() || actionLoading || !refundInput}
                      className="bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      Issue Refund
                    </button>
                  </div>
                  {!canRefund() && <p className="text-[10px] text-rose-500 flex items-center gap-1"><Lock size={10} /> You do not have permission to issue refunds.</p>}
                </div>

                {/* 4. DANGER ZONE */}
                <div className="pt-6 border-t border-rose-500/20">
                  <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Trash2 size={14} /> Danger Zone
                  </h3>
                  <button 
                    onClick={handleCancelBooking}
                    disabled={!canCancel() || actionLoading}
                    className="w-full bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Cancel Reservation"}
                  </button>
                  {!canCancel() && <p className="text-[10px] text-rose-500 mt-2 flex items-center gap-1 justify-center"><Lock size={10} /> Cancellation restricted by your access level.</p>}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {showBookingModal && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={() => setShowBookingModal(false)}
          propertyId={property?.id} 
          rooms={rooms}
          bookings={bookings}
        />
      )}
    </div>
  );
}
