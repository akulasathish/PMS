"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bed, 
  Calendar, 
  Search, 
  UserCheck, 
  Clock, 
  ArrowRightLeft, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import BookingModal from './BookingModal';

const DAYS = ["22 Mar", "23 Mar", "24 Mar", "25 Mar", "26 Mar", "27 Mar", "28 Mar"];

interface Room {
  id: string;
  property_id: string;
  room_number: string;
  type: string;
  status: string;
  created_at: string;
}

interface Booking {
  id: string;
  property_id: string;
  room_id: string;
  guest_name: string;
  check_in: string;
  status: string;
  amount: number;
}

export default function Tier3FrontDesk() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const [property, setProperty] = useState<{name: string} | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check for forced password reset
      if (user.user_metadata?.requires_password_change === true) {
        setRequiresPasswordReset(true);
        setIsLoading(false);
        return;
      }

      // 1. Get the staff's property_id from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('property_id')
        .eq('id', user.id)
        .single();

      if (profile?.property_id) {
        setPropertyId(profile.property_id);
        
        // 2. Fetch property details for the header
        const { data: propData } = await supabase
          .from('properties')
          .select('name')
          .eq('id', profile.property_id)
          .single();
        if (propData) setProperty(propData);

        // 3. Fetch rooms ONLY for this property
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .eq('property_id', profile.property_id)
          .order('room_number', { ascending: true }); 

        // 4. Fetch active bookings (Confirmed or Checked In) ONLY for this property
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .eq('property_id', profile.property_id)
          .in('status', ['Confirmed', 'Checked In']);

        if (roomsData) setRooms(roomsData);
        if (bookingsData) setBookings(bookingsData);
      }
      setIsLoading(false);
    }

    fetchData();
  }, [supabase]);

  const handlePasswordReset = async (formData: FormData) => {
    setIsResetLoading(true);
    setResetError('');
    
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      setIsResetLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      setIsResetLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { requires_password_change: false }
    });

    if (error) {
      setResetError(error.message);
      setIsResetLoading(false);
      return;
    }

    // Success! Hide modal and trigger standard data load
    setRequiresPasswordReset(false);
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Middleware will redirect
  };

  // Helper to find booking for a room
  const getBookingForRoom = (roomId: string) => {
    return bookings.find(b => b.room_id === roomId);
  };

  // Status to Color mapping for UI
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Occupied': return "bg-indigo-500/20 text-indigo-400 border-indigo-500/40";
      case 'Available': return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case 'Dirty': return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      default: return "";
    }
  };

  if (requiresPasswordReset) {
    return (
      <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-6 z-50 font-sans selection:bg-indigo-500/30 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-[360px] relative z-10 flex flex-col items-center"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <KeyRound size={20} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Security Update</h1>
            <p className="text-zinc-500 text-[10px] text-center mt-2 font-medium uppercase tracking-wider">Required: Set Permanent Staff Credentials</p>
          </div>

          <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-7 shadow-2xl">
            <form action={handlePasswordReset} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-400 transition-colors">
                    <KeyRound size={14} />
                  </div>
                  <input 
                    name="newPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-400 transition-colors">
                    <KeyRound size={14} />
                  </div>
                  <input 
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2 mt-2">
                  <ShieldAlert size={14} />
                  {resetError}
                </div>
              )}

              <button 
                type="submit"
                disabled={isResetLoading}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all mt-3"
              >
                {isResetLoading ? <Loader2 size={14} className="animate-spin" /> : 'Update Staff Password & Enter'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 p-6 selection:bg-indigo-500/30">
      
      {/* HEADER: OPERATIONAL BAR */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Front Desk</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{property?.name || 'Loading Architecture...'} • Day Shift</p>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Arrivals</p>
              <p className="text-sm font-bold text-emerald-500">12</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Departures</p>
              <p className="text-sm font-bold text-rose-500">08</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search Guest or Room..."
              disabled
              className="bg-zinc-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs opacity-50 cursor-not-allowed w-64"
            />
          </div>
          <button 
            onClick={() => setShowBookingModal(true)}
            className="bg-azure-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-azure-500 transition-all shadow-lg shadow-azure-500/20"
          >
            <Plus size={16} />
            New Booking
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-1" />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-500 text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* TAPE CHART (THE GRID) */}
        <div className="col-span-12 lg:col-span-9 bg-zinc-900/20 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/20">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              Availability Matrix
            </h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/5 rounded-lg border border-white/10 transition-colors"><ChevronLeft size={16}/></button>
              <button className="p-2 hover:bg-white/5 rounded-lg border border-white/10 transition-colors"><ChevronRight size={16}/></button>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[300px] flex items-center justify-center relative">
            {isLoading ? (
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-4 text-left text-[10px] font-bold text-zinc-500 uppercase border-b border-r border-white/5 sticky left-0 bg-[#09090b] z-10 w-32">Room</th>
                    {DAYS.map((day: string) => (
                      <th key={day} className="p-4 text-center text-[10px] font-bold text-zinc-400 uppercase border-b border-white/5 min-w-[120px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room: Room) => {
                    const booking = getBookingForRoom(room.id);
                    return (
                      <tr key={room.id} className="group border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 border-r border-white/5 sticky left-0 bg-[#09090b] z-10 group-hover:bg-zinc-900 transition-colors">
                          <p className="text-sm font-bold text-white">{room.room_number}</p>
                          <p className="text-[10px] text-zinc-500">{room.type}</p>
                        </td>
                        {DAYS.map((day: string, idx: number) => (
                          <td key={idx} className="p-2 border-r border-white/5 relative h-16">
                            {booking && idx === 0 ? (
                              <motion.div 
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`absolute inset-y-2 left-2 right-[-240px] rounded-lg border p-2 flex items-center justify-between z-20 shadow-xl ${getStatusColor(room.status)}`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <UserCheck size={14} />
                                  <span className="text-[11px] font-bold truncate">{booking.guest_name}</span>
                                </div>
                                <span className="text-[9px] font-black uppercase opacity-60">{booking.status}</span>
                              </motion.div>
                            ) : null}
                            {!booking && room.status === 'Dirty' ? (
                              <div className="flex items-center justify-center h-full opacity-20">
                                <Clock size={14} />
                              </div>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* SIDEBAR: QUEUE & ACTIONS */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-indigo-400" />
              In-House Activity
            </h3>
            
            <div className="space-y-4">
              {[
                { time: "10:30 AM", action: "Check-in", guest: "Martha S.", room: "102" },
                { time: "11:15 AM", action: "Check-out", guest: "James B.", room: "305" },
                { time: "1:00 PM", action: "Laundry", guest: "Housekeeping", room: "201" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start p-3 hover:bg-white/5 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/5 group">
                  <div className="text-[9px] font-bold text-zinc-600 group-hover:text-indigo-400 transition-colors pt-1">
                    {item.time}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{item.action}: {item.guest}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">Room {item.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500 rounded-lg text-white">
                <Bed size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Room Inventory</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase">Total Rooms</p>
                <p className="text-xl font-bold text-white">{rooms.length}</p>
              </div>
              <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase">Available</p>
                <p className="text-xl font-bold text-emerald-500">{rooms.filter(r => r.status === 'Available' || r.status === 'clean').length}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODALS */}
      {propertyId && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={() => setShowBookingModal(false)} 
          propertyId={propertyId} 
          rooms={rooms.filter(r => r.status === 'Available')} 
        />
      )}
    </div>
  );
}