"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bed, Calendar, Search, UserCheck, Clock, 
  ArrowRightLeft, ChevronLeft, ChevronRight, 
  Plus, Loader2, Building2, LayoutDashboard,
  DoorOpen, Activity, Users, Settings, LogOut,
  ChevronsUpDown, Lock, Brush
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BookingModal from './BookingModal';
import { checkInGuest, checkOutGuest } from '@/app/actions/booking';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: true, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Users, label: "Staff", href: "/dashboard/staff", active: false, module: 'staff_management' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

const DAYS = ["22 Mar", "23 Mar", "24 Mar", "25 Mar", "26 Mar", "27 Mar", "28 Mar"];

export default function FrontOfficeTerminal() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessiblePropsList, setAccessiblePropsList] = useState<any[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    async function fetchData() {
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
        }

        if (activeId) {
          const { data: prop } = await supabase.from('properties').select('*').eq('id', activeId).single();
          setProperty(prop);

          // Fetch rooms and bookings
          const [roomsRes, bookingsRes] = await Promise.all([
            supabase.from('rooms').select('*').eq('property_id', activeId).order('room_number'),
            supabase.from('bookings').select('*').eq('property_id', activeId)
          ]);

          setRooms(roomsRes.data || []);
          setBookings(bookingsRes.data || []);
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const getBookingForRoom = (roomId: string) => {
    return bookings.find(b => b.room_id === roomId && (b.status === 'Confirmed' || b.status === 'Checked In'));
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

  const isReadOnly = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return false;
    if (isLoading) return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;

  return (userProfile.permissions || {}).front_office === 'read';
  };

  if (isLoading) return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;

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
            if (isLoading) return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;

  return (
              <Link
                key={item.label}
                href={locked ? "#" : item.href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  item.active ? 'bg-white/[0.06] text-white' : locked ? 'text-zinc-700' : 'text-zinc-500 hover:text-white'
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
        <header className="p-8 border-b border-white/[0.04] flex justify-between items-center bg-[#08080a]">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Activity className="text-emerald-400" />
              Front Office Terminal
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Real-time availability and guest management</p>
          </div>
          
          {!isReadOnly() && (
            <button 
              onClick={() => setShowBookingModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Plus size={18} />
              New Walk-In
            </button>
          )}
        </header>

        <div className="flex-1 p-8 overflow-auto">
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
                {isLoading ? (
                  <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></td></tr>
                ) : rooms.map((room) => {
                  const booking = getBookingForRoom(room.id);
                  if (isLoading) return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;

  return (
                    <tr key={room.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                      <td className="p-4 border-r border-white/5 sticky left-0 bg-[#09090b] z-10">
                        <p className="text-sm font-bold text-white">{room.room_number}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{room.type}</p>
                      </td>
                      {DAYS.map((_, idx) => (
                        <td key={idx} className="p-2 border-r border-white/5 relative h-20">
                          {booking && idx === 0 ? (
                            <motion.div 
                              layoutId={booking.id}
                              className={`absolute inset-y-2 left-2 right-[-240px] rounded-xl border p-3 flex items-center justify-between z-20 shadow-2xl ${
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
                                  
                                  {!isReadOnly() && (
                                    <div className="flex gap-2">
                                      {booking.status === 'Confirmed' && (
                                        <button 
                                          onClick={async () => await checkInGuest(booking.id)}
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold px-3 py-1 rounded-lg transition-all"
                                        >
                                          Check In
                                        </button>
                                      )}
                                      {booking.status === 'Checked In' && (
                                        <button 
                                          onClick={async () => await checkOutGuest(booking.id, room.id)}
                                          className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold px-3 py-1 rounded-lg transition-all"
                                        >
                                          Check Out
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
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
        </div>
      </main>

      {showBookingModal && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={() => setShowBookingModal(false)} 
          propertyId={property?.id} 
          rooms={rooms.filter(r => r.status === 'Available')} 
        />
      )}
    </div>
  );
}
