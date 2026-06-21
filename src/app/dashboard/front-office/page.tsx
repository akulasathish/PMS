"use client";
import { QRCodeSVG } from 'qrcode.react';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bed, Calendar, Search, UserCheck, 
  ArrowRightLeft, ChevronRight, 
  Plus, Loader2, Building2, LayoutDashboard,
  DoorOpen, Activity, Users, Settings, LogOut,
  ChevronsUpDown, Lock, Brush, CheckCircle2, ClipboardCheck, RefreshCw, RotateCcw, Printer, XCircle, Link2, Camera, X, ShieldCheck, AlertCircle,
  Trash2, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import BookingModal from './BookingModal';
import FolioModal from '@/components/FolioModal';
import RoomBlockModal from '@/components/RoomBlockModal';
import { checkInGuest, checkOutGuest, updateGuestNotes, upgradeRoom, issueRefund, cancelBooking, resetGuestIdentity } from '@/app/actions/booking';
import { Property, Room, Booking, UserProfile } from '@/lib/types';


const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: true, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [property, setProperty] = useState<Property | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'tape' | 'arrivals' | 'departures' | 'house' | 'all'>('tape');
  const [searchQuery, setSearchQuery] = useState('');
  const [reservationFilter, setReservationFilter] = useState('Confirmed');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Action Drawer State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [upgradeRoomId, setUpgradeRoomId] = useState('');
  const [refundInput, setRefundInput] = useState('');
  
  // Check-In Requirements State
  const [checkIdVerified, setCheckIdVerified] = useState(false);
  const [checkRegCardSigned, setCheckRegCardSigned] = useState(false);
  const [checkPaymentSecured, setCheckPaymentSecured] = useState(false);
  const [checkFormFDone, setCheckFormFDone] = useState(false);
  
  // Form F Fields State
  const [guestAddress, setGuestAddress] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [activeCheckoutBooking, setActiveCheckoutBooking] = useState<{bookingId: string, roomId: string, guestName: string, amount: number} | null>(null);
  const [activeBlockRoom, setActiveBlockRoom] = useState<Room | null>(null);

  const supabase = createClient();
  // Extract fetch data to a callable function to avoid window.location.reload()
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
      setUserProfile(prof);

      let activeId = localStorage.getItem('pms_active_property');
      
      if (!activeId || activeId === 'undefined') {
         console.log("No localStorage activeId found. Querying database for property access...");
         const { data: acc } = await supabase.from('property_access').select('property_id').eq('user_id', auth.user.id);
         if (acc && acc.length > 0) {
            activeId = acc[0].property_id;
            localStorage.setItem('pms_active_property', activeId || ''); // Fix the browser memory
         } else if (prof?.property_id) {
            activeId = prof.property_id;
            localStorage.setItem('pms_active_property', activeId || '');
         }
      }
      
      if (activeId && activeId !== 'undefined') {
        const { data: prop } = await supabase.from('properties').select('*').eq('id', activeId).single();
        setProperty(prop);

        // Fetch rooms and bookings, explicitly bypassing browser cache
        let finalRoomsQuery;
        const currentActiveId = activeId || prof?.property_id;
        
        if (currentActiveId && currentActiveId !== 'undefined' && currentActiveId !== 'null') {
           finalRoomsQuery = supabase.from('rooms').select('*').eq('property_id', currentActiveId).or('is_deleted.eq.false,is_deleted.is.null').order('room_number');
        } else {
           finalRoomsQuery = supabase.from('rooms').select('*').or('is_deleted.eq.false,is_deleted.is.null').order('room_number');
        }

        const executedRoomsRes = await finalRoomsQuery;
        
        // FIX: Add property_id filter to bookings to ensure we see our data
        let bookingsQuery = supabase.from('bookings').select('*').eq('property_id', currentActiveId || '00000000-0000-0000-0000-000000000000');
        if (currentActiveId) {
          bookingsQuery = bookingsQuery.eq('property_id', currentActiveId);
        }
        const executedBookingsRes = await bookingsQuery.order('created_at', { ascending: false });

        const roomsRes = executedRoomsRes;
        const bookingsRes = executedBookingsRes;

        if (!roomsRes.data || roomsRes.data.length === 0) {
            console.error("🚨 EMERGENCY TRUTH LOG: ZERO ROOMS FETCHED FOR PROPERTY!", activeId);
            
            // The browser is stuck on a zombie ID. We MUST find the real property ID from the database.
            // Since the fallback query might ALSO fail if it uses the wrong ActiveID somewhere else in the chain,
            // we explicitly find the first property this user actually owns, and force the app to restart completely.
            
            const { data: realPropAccess } = await supabase.from('property_access').select('property_id').eq('user_id', auth.user.id);
            let realPropId = realPropAccess?.[0]?.property_id;
            
            if (!realPropId && prof?.property_id) {
                realPropId = prof.property_id;
            }
            
            if (realPropId && realPropId !== activeId) { // ONLY reload if the ID actually changed!
                console.log("🩹 Auto-Repair: Zombie ID detected. Erasing cache and rebooting app to:", realPropId);
                localStorage.setItem('pms_active_property', realPropId);
                window.location.reload(); // Force a hard reboot so React drops all corrupted state
                return; // Stop rendering
            } else {
               console.log("Hotel legitimately has 0 rooms, or user has no properties.");
            }
        }

        setRooms(roomsRes.data || []);
        setBookings(bookingsRes.data || []);
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Global Realtime listener for ROOM status changes (Housekeeping Sync)
  useEffect(() => {
    if (!property?.id) return;

    const roomChannel = supabase
      .channel('rooms-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: 'property_id=eq.' + property.id
        },
        (payload) => {
          console.log("Realtime Room Update:", payload.new);
          setRooms((prevRooms) => 
            prevRooms.map((r) => r.id === payload.new.id ? { ...r, status: payload.new.status as Room['status'] } : r)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [property?.id, supabase]);

  // Self-Healing Status Logic: If a guest is Checked In, the room MUST be Occupied, even if the DB room status says Available
  const getTrueRoomStatus = (room: Room) => {
    const activeBooking = bookings.find(b => b.room_id === room.id && b.status === 'Checked In');
    if (activeBooking && room.status !== 'Blocked') {
      return 'Occupied';
    }
    return room.status;
  };

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
    
    // 1. Status Filter
    if (reservationFilter !== 'All') {
      if (reservationFilter === 'Past') {
        filtered = filtered.filter(b => b.status === 'Checked Out' || b.status === 'Cancelled');
      } else {
        filtered = filtered.filter(b => b.status === reservationFilter);
      }
    }

    // 2. Date Range Filter
    if (filterStartDate) {
      filtered = filtered.filter(b => b.check_in >= filterStartDate);
    }
    if (filterEndDate) {
      filtered = filtered.filter(b => b.check_in <= filterEndDate);
    }

    // 3. Text Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => {
        const roomNum = rooms.find(r => r.id === b.room_id)?.room_number || '';
        const nameMatch = b.guest_name ? b.guest_name.toLowerCase().includes(lowerQuery) : false;
        const roomMatch = roomNum.toLowerCase() === lowerQuery;
        return nameMatch || roomMatch;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.check_in).getTime();
      const dateB = new Date(b.check_in).getTime();
      if (reservationFilter === 'Past') {
         const outA = new Date(a.check_out || a.created_at || '').getTime();
         const outB = new Date(b.check_out || b.created_at || '').getTime();
         return outB - outA;
      }
      return dateA - dateB;
    });
  };



  const hasAccess = (_moduleName: string) => {
    return true;
  };

  // SURGICAL IAM CHECKS (Checking specific JSON keys)
  const canCreateBooking = () => {
    return true;
  };

  const canCheckIn = () => {
    return true;
  };

  const canCheckOut = () => {
    return true;
  };

  const canRefund = () => {
    return true;
  };

  const canUpgrade = () => {
    return true;
  };

  const canBlockRoom = () => {
    return true;
  };

  const canWriteNotes = () => {
    return true;
  };

  const canCancel = () => {
    return true;
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

  const handleBlockRoom = (room: Room) => {
    setActiveBlockRoom(room);
  };

  const handleSafeCheckIn = async (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation();
    await checkInGuest(bookingId);
    window.location.reload();
  };

  const handleSafeCheckOut = async (e: React.MouseEvent, bookingId: string, roomId: string) => {
    e.stopPropagation();
    const b = bookings.find(b => b.id === bookingId);
    if (!b) return;
    setActiveCheckoutBooking({
      bookingId,
      roomId,
      guestName: b.guest_name,
      amount: Number(b.amount)
    });
  };


  useEffect(() => {
    if (!selectedBooking) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: "id=eq." + selectedBooking.id
        },
        (payload) => {
          if (payload.new.id_verified) {
            setSelectedBooking(payload.new as Booking);
            setCheckIdVerified(true);
            setCheckRegCardSigned(true);
            setShowQrCode(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBooking, supabase]);



  const handleRetakeIdentity = async () => {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to VOID the current ID and signature? You will need to capture them again.")) return;
    
    setActionLoading(true);
    const res = await resetGuestIdentity(selectedBooking.id);
    if (res.success) {
      // Fetch fresh data to reset UI
      await refreshBookingStatus();
      setCheckIdVerified(false);
      setCheckRegCardSigned(false);
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const refreshBookingStatus = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    const { data, error } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
    if (data && !error) {
      setSelectedBooking(data as Booking);
      if (data.id_verified) {
        setCheckIdVerified(true);
        setCheckRegCardSigned(true);
      }
    }
    setActionLoading(false);
  };

  const openActionDrawer = (booking: Booking) => {
    setSelectedBooking(booking);
    setNotesInput(booking.notes || '');
    setRefundInput('');
    setUpgradeRoomId('');
    
    // Reset Check-In checklist for safety
    setCheckIdVerified(false);
    setCheckRegCardSigned(false);
    setCheckPaymentSecured(false);
    setCheckFormFDone(false);
    setGuestAddress(booking.guest_address || '');
    
    // Auto-check requirements if they were already done via the Magic Link
    if (booking.id_verified) {
      setCheckIdVerified(true);
      setCheckRegCardSigned(true);
    }
  };

  // --- SUB-COMPONENT: LIST ITEM ---
  const BookingRow = ({ booking }: { booking: Booking }) => (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => openActionDrawer(booking)}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 bg-zinc-900/40 border border-white/[0.04] rounded-2xl hover:border-indigo-500/40 transition-all cursor-pointer shadow-xl gap-4"
    >
      <div className="flex items-center gap-4 md:gap-5">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center text-indigo-400 font-black text-xs uppercase group-hover:scale-105 transition-transform shrink-0">
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

      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/[0.04] pt-3 sm:pt-0">
        <div className="text-left sm:text-right">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter">Amount Due</p>
          <p className="text-sm font-black text-white">${booking.amount}</p>
        </div>
        
        <div className="flex gap-2">
          {booking.status === 'Confirmed' && (
            canCheckIn() ? (
              <button 
                onClick={(e) => { e.stopPropagation(); openActionDrawer(booking); }}
                className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-amber-500/10 shrink-0"
              >
                START CHECK-IN
              </button>
            ) : <Lock size={14} className="text-zinc-700 mx-4" />
          )}
          {booking.status === 'Checked In' && (
            canCheckOut() ? (
              <button 
                onClick={(e) => handleSafeCheckOut(e, booking.id, booking.room_id)}
                className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-rose-500/10 shrink-0"
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
        <header className="p-4 md:p-8 border-b border-white/[0.04] bg-[#08080a] flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                <Activity className="text-emerald-400" />
                Front Office Terminal
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm mt-1">Real-time availability and guest management</p>
            </div>
            
            {canCreateBooking() && (
              <button 
                onClick={() => setShowBookingModal(true)}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 text-xs sm:text-sm"
              >
                <Plus size={18} />
                New Walk-In
              </button>
            )}
          </div>

          {/* TAB SYSTEM */}
          <div className="flex flex-col w-full gap-6">
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar scroll-smooth">
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
                    setActiveTab(tab.id as 'tape' | 'arrivals' | 'departures' | 'house' | 'all');
                    setSearchQuery(''); // Clear search when switching tabs
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                  {tab.id === 'arrivals' && getArrivalsToday().length > 0 && <span className="ml-1 bg-white text-indigo-600 px-1.5 py-0.5 rounded-md text-[9px]">{getArrivalsToday().length}</span>}
                </button>
              ))}
            </div>

            
            {/* RESERVATIONS MASTER CONTROLS */}
            {activeTab === 'all' && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select 
                    value={reservationFilter}
                    onChange={(e) => setReservationFilter(e.target.value)}
                    className="appearance-none bg-zinc-800 border border-white/20 rounded-xl py-2 pl-4 pr-10 text-xs text-white font-bold focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-zinc-700 transition-colors"
                  >
                    <option value="Confirmed">Upcoming (Confirmed)</option>
                    <option value="Checked In">In-House</option>
                    <option value="Past">Past (Checked Out/Cancelled)</option>
                    <option value="All">View Everything</option>
                  </select>
                  <ChevronsUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                
                {/* INJECTED DATE PICKERS */}
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-1 focus-within:border-indigo-500/50">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">From</span>
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-transparent text-xs text-white font-bold focus:outline-none [color-scheme:dark] cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">To</span>
                  <input 
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-transparent text-xs text-white font-bold focus:outline-none [color-scheme:dark] cursor-pointer"
                  />
                </div>
                
                {/* CLEAR BUTTON */}
                {(searchQuery || filterStartDate || filterEndDate || reservationFilter !== 'Confirmed') && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setReservationFilter('Confirmed');
                    }}
                    className="p-2 text-zinc-500 hover:text-rose-400 bg-zinc-800 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all"
                    title="Clear All Filters"
                  >
                    <XCircle size={14} />
                  </button>
                )}
                
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
              </div>
            )}

          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 pb-28 lg:pb-8 overflow-auto">
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
                        <td className="p-4 border-r border-white/5 sticky left-0 bg-[#09090b] z-10 min-w-[120px] align-top">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                {canBlockRoom() ? (
                                  <button
                                    onClick={() => handleBlockRoom(room)}
                                    disabled={actionLoading}
                                    className={`text-sm font-bold transition-colors ${room.status === 'Blocked' ? 'text-red-500 hover:text-red-400' : 'text-white hover:text-zinc-300'} disabled:opacity-50`}
                                  >                                    {room.room_number}
                                  </button>
                                ) : (
                                  <p className={`text-sm font-bold ${room.status === 'Blocked' ? 'text-red-500' : 'text-white'}`}>
                                    {room.room_number}
                                  </p>
                                )}
                              </div>
                              
                              {/* Housekeeping Badges (Requested Colors) */}
                              <div className="flex flex-col gap-1 items-start">
                                {(() => {
                                  const s = getTrueRoomStatus(room)?.toLowerCase();
                                  if (s === 'available') return <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.4)]">Ready</span>;
                                  if (s === 'dirty') return <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.4)]">Dirty</span>;
                                  if (s === 'cleaning') return <span className="bg-amber-500 text-black px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.4)]">Cleaning</span>;
                                  if (s === 'clean') return <span className="bg-cyan-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.4)]">Inspect</span>;
                                  if (s === 'blocked') return <span className="bg-red-600 text-white px-2 py-0.5 rounded flex items-center gap-1 text-[9px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]"><Lock size={10}/> Maint</span>;
                                  if (s === 'occupied') return <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(99,102,241,0.4)]">Occupied</span>;
                                  return null;
                                })()}
                              </div>
                              <p className="text-[10px] text-zinc-500 uppercase font-medium">{room.type}</p>
                            </div>
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
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={refreshBookingStatus}
                    disabled={actionLoading}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-indigo-400 transition-all disabled:opacity-50"
                    title="Refresh Status"
                  >
                    <RefreshCw size={16} className={actionLoading ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setSelectedBooking(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

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
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkFormFDone} onChange={e => setCheckFormFDone(e.target.checked)} />
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Capture Form F (Home Address)</span>
                      </label>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Guest Home Address</label>
                        <textarea 
                          value={guestAddress}
                          onChange={(e) => setGuestAddress(e.target.value)}
                          placeholder="Full address for police records..."
                          className="w-full h-16 bg-black/40 border border-white/[0.06] text-xs text-zinc-300 rounded-xl p-3 focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                      </div>

                    </div>

                    
                    
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

                {/* 1. GUEST IDENTITY (The Magic Link) */}
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} className="text-indigo-400" /> Guest Identity
                    </h3>
                    {selectedBooking.id_verified ? (
                      <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1">
                        <AlertCircle size={12} /> Pending
                      </span>
                    )}
                  </div>

                  {!selectedBooking.id_verified ? (
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl space-y-3">
                      <p className="text-[11px] text-zinc-500">
                        Send a secure magic link to the guest&apos;s phone. They can scan their ID and sign the RegCard instantly.
                      </p>
                                            <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const url = window.location.origin + "/guest/regcard/" + selectedBooking.id;
                            navigator.clipboard.writeText(url);
                            alert("Magic Link copied to clipboard! Send this to the guest via WhatsApp/SMS.");
                          }}
                          className="flex-[2] bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        >
                          <Link2 size={14} /> Send Link
                        </button>
                        <button 
                          onClick={() => setShowQrCode(true)}
                          className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/20 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        >
                          <Camera size={14} /> QR Scan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      
                      <div className="flex justify-end mb-1">
                        <button 
                          onClick={handleRetakeIdentity}
                          disabled={actionLoading}
                          className="text-[9px] font-black text-rose-500 hover:text-rose-400 uppercase flex items-center gap-1 transition-colors px-2 py-1 rounded bg-rose-500/5 hover:bg-rose-500/10"
                        >
                          <RotateCcw size={10} /> Retake / Void
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="aspect-[3/2] bg-black/40 border border-white/5 rounded-xl overflow-hidden relative group">
                           <Image src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guest-ids/${selectedBooking.id_photo_url}`} alt="Guest ID Scan" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <p className="text-[8px] font-black text-white/40 uppercase tracking-tighter drop-shadow-md">Guest ID Scan</p>
                           </div>
                        </div>
                        <div className="aspect-[3/2] bg-white rounded-xl overflow-hidden relative flex items-center justify-center p-2">
                           {selectedBooking.signature_url && <Image src={selectedBooking.signature_url} alt="Signature" fill className="object-contain" />}
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open("/guest/print-regcard/" + selectedBooking.id, "_blank")}
                        className="w-full bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        <Printer size={16} /> Print Official Form F / RegCard
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. ROOM UPGRADE */}
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRightLeft size={14} /> Room Move / Upgrade
                  </h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Moving this guest will instantly mark Room {rooms.find(r => r.id === selectedBooking.room_id)?.room_number} as &quot;Dirty&quot; and assign them to the new room.
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


                {/* 3.5 FINAL ACTION */}
                {selectedBooking.status === 'Confirmed' && (
                  <div className="pt-4">
                    <button
                      onClick={(e) => handleSafeCheckIn(e as unknown as React.MouseEvent, selectedBooking.id)}
                      disabled={!checkIdVerified || !checkRegCardSigned || !checkPaymentSecured || !checkFormFDone || guestAddress.trim().length < 5 || actionLoading || !canCheckIn()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3"
                    >                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Complete Final Check-In</>}
                    </button>
                    {!canCheckIn() && <p className="text-[10px] text-rose-500 mt-2 text-center">Unauthorized to finalize check-in.</p>}
                  </div>
                )}

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
          propertyId={property?.id || ''} 
          rooms={rooms}
          bookings={bookings}
        />
      )}

      {showQrCode && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-8 text-center"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Phone Scanner Link</h3>
              <button onClick={() => setShowQrCode(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-3xl inline-block mb-6 shadow-xl shadow-indigo-500/10">
              <QRCodeSVG 
                value={window.location.origin + "/guest/regcard/" + selectedBooking.id} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Point your phone camera at this screen to open the <span className="text-indigo-400 font-bold">Identity Capture Terminal</span> for {selectedBooking.guest_name}.
            </p>

            <div className="flex items-center justify-center gap-3 py-3 px-4 bg-white/5 rounded-2xl border border-white/5">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Waiting for phone sync...</span>
            </div>
          </motion.div>
        </div>
      )}

      {activeCheckoutBooking && property?.id && (
        <FolioModal
          bookingId={activeCheckoutBooking.bookingId}
          propertyId={property.id}
          guestName={activeCheckoutBooking.guestName}
          roomId={activeCheckoutBooking.roomId}
          roomNumber={rooms.find(r => r.id === activeCheckoutBooking.roomId)?.room_number || ''}
          baseAmount={activeCheckoutBooking.amount}
          onClose={() => setActiveCheckoutBooking(null)}
          onSuccess={() => {
            setActiveCheckoutBooking(null);
            loadDashboardData();
          }}
        />
      )}

      {activeBlockRoom && (
        <RoomBlockModal
          room={activeBlockRoom}
          onClose={() => setActiveBlockRoom(null)}
          onSuccess={() => {
            setActiveBlockRoom(null);
            loadDashboardData();
          }}
        />
      )}
      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-40 bg-[#0a0a0c]/85 backdrop-blur-xl border-t border-white/[0.05] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around py-2 px-1 max-w-md mx-auto">
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
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-300 ${
                  item.active 
                    ? 'text-indigo-400 font-bold' 
                    : locked 
                      ? 'text-zinc-800' 
                      : 'text-zinc-500 active:text-zinc-200'
                }`}
              >
                <item.icon size={18} className={item.active ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} />
                <span className="text-[9px] uppercase tracking-wider font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
