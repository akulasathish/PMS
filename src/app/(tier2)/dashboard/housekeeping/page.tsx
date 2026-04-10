"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brush, Sparkles, Clock, CheckCircle2, UserCheck, 
  Loader2, Building2, LayoutDashboard,
  DoorOpen, Activity, Users, Settings, Lock,
  ChevronRight, Play, CheckCircle, ShieldCheck, AlertCircle, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { startCleaning, finishCleaning, inspectRoom } from '@/app/actions/housekeeping';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: false, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: true, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Users, label: "Staff", href: "/dashboard/staff", active: false, module: 'staff_management' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

export default function HousekeepingTerminal() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [property, setProperty] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'todo' | 'cleaning' | 'inspect' | 'stayovers' | 'all'>('todo');
  
  const supabase = createClient();

  const loadHousekeepingData = async () => {
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

          const [roomsRes, bookingsRes] = await Promise.all([
            supabase.from('rooms').select('*, profiles:assigned_staff_id(full_name)').eq('property_id', activeId).eq('is_deleted', false).order('room_number'),
            supabase.from('bookings').select('*').eq('property_id', activeId).in('status', ['Confirmed', 'Checked In'])
          ]);

          if (roomsRes.data) setRooms(roomsRes.data);
          if (bookingsRes.data) setBookings(bookingsRes.data);
        }

    } catch (err) {
      console.error("Housekeeping Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHousekeepingData();
  }, []);


  // Global Realtime listener for ROOM status changes
  useEffect(() => {
    if (!property?.id) return;

    const roomChannel = supabase
      .channel('rooms-sync-hk')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: 'property_id=eq.' + property.id
        },
        (payload) => {
          setRooms((prevRooms) => 
            prevRooms.map((r) => r.id === payload.new.id ? { ...r, status: payload.new.status } : r)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [supabase]);


  const getGuestContext = (room: any): { label: string, color: string, condition: string } => {
    const today = new Date().toISOString().substring(0, 10);
    const booking = bookings.find(b => b.room_id === room.id);
    
    // Determine Guest Situation
    let label = 'Vacant';
    let color = 'text-zinc-500 bg-zinc-500/10';
    
    if (booking) {
      if (booking.status === 'Confirmed' && booking.check_in === today) {
         label = 'Arrival Today';
         color = 'text-indigo-400 bg-indigo-500/10';
      } else if (booking.status === 'Checked In' && booking.check_out === today) {
         label = 'Departing Today';
         color = 'text-amber-400 bg-amber-500/10';
      } else if (booking.status === 'Checked In') {
         label = 'Stayover';
         color = 'text-emerald-400 bg-emerald-500/10';
      } else {
         label = 'Reserved';
      }
    }
    
    if (room.status === 'Blocked') {
       label = 'Blocked';
       color = 'text-rose-500 bg-rose-500/10';
    }

    // Determine Physical Condition
    let condition = '';
    if (room.status === 'Dirty') condition = 'Needs Deep Clean';
    if (room.status === 'Cleaning') condition = 'Cleaning in Progress...';
    if (room.status === 'Clean') condition = 'Ready for Inspection';
    if (room.status === 'Available') condition = 'Ready for Guest';
    if (room.status === 'Occupied') condition = 'Service Required';
    if (room.status === 'Blocked') condition = 'Under Maintenance';

    return { label, color, condition };
  };

  const handleAction = async (roomId: string, action: 'start' | 'finish' | 'inspect') => {
    setActionLoading(roomId);
    let res;
    if (action === 'start') res = await startCleaning(roomId);
    if (action === 'finish') res = await finishCleaning(roomId);
    if (action === 'inspect') res = await inspectRoom(roomId);

    if (res?.success) {
      await loadHousekeepingData();
    } else {
      alert(res?.error || "Action failed");
    }
    setActionLoading(null);
  };

  
  
  
      const getFilteredRooms = () => {
    if (activeTab === 'todo') return rooms.filter(r => r.status?.toLowerCase() === 'dirty');
    if (activeTab === 'cleaning') return rooms.filter(r => r.status?.toLowerCase() === 'cleaning');
    if (activeTab === 'inspect') return rooms.filter(r => r.status?.toLowerCase() === 'clean');
    if (activeTab === 'stayovers') return rooms.filter(r => r.status?.toLowerCase() === 'occupied');
    if (activeTab === 'all') return rooms;
    return [];
  };




  const canInspect = () => {
    if (!userProfile) return false;
    return userProfile.role === 'owner' || userProfile.role === 'admin' || userProfile.permissions?.housekeeping?.inspect === 'write';
  };

  const hasAccess = (moduleName: string) => {
    if (!userProfile) return true;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    const perms = userProfile.permissions || {};
    return perms[moduleName] && perms[moduleName] !== 'deny';
  };

  const calculateDuration = (startTime: string) => {
    if (!startTime) return '0m';
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / (1000 * 60));
    return `${diff}m`;
  };

  if (isLoading) return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex min-h-screen bg-[#08080a] font-sans selection:bg-indigo-500/30">
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 p-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-[13px] font-bold text-white truncate max-w-[130px]">{property?.name}</h1>
              <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Housekeeping Unit</p>
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
        <header className="p-8 border-b border-white/[0.04] bg-[#08080a] flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <Brush className="text-indigo-400" />
                Housekeeping Terminal
              </h2>
              <p className="text-zinc-500 text-sm mt-1">Operational Room Management & Quality Control</p>
            </div>
          </div>

          {/* SUB-TABS */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-2xl w-fit">
            {[
              { id: 'todo', label: 'To Clean', icon: Clock, count: rooms.filter(r => r.status?.toLowerCase() === 'dirty').length },
              { id: 'cleaning', label: 'In Progress', icon: Play, count: rooms.filter(r => r.status?.toLowerCase() === 'cleaning').length },
              { id: 'inspect', label: 'To Inspect', icon: ShieldCheck, count: rooms.filter(r => r.status?.toLowerCase() === 'clean').length },
              { id: 'stayovers', label: 'Stayover Service', icon: UserCheck, count: rooms.filter(r => r.status?.toLowerCase() === 'occupied').length },
              { id: 'all', label: 'All Rooms', icon: Activity, count: rooms.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.count > 0 && <span className="ml-1 bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{tab.count}</span>}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {getFilteredRooms().length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-40 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[40px] bg-white/[0.01]"
                >
                  <CheckCircle2 size={48} className="text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">No Rooms in this queue</p>
                </motion.div>
              ) : getFilteredRooms().map((room, i) => (
                <motion.div
                  key={room.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-6 relative group hover:border-indigo-500/30 transition-all shadow-2xl"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-3xl font-black text-white tracking-tighter">#{room.room_number}</h4>
                        
                        {/* THE REQUESTED HOUSEKEEPING STATUS BADGES */}
                        <div className="flex items-center gap-1">
                          {room.status?.toLowerCase() === 'dirty' && <span className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.4)]">Dirty</span>}
                          {room.status?.toLowerCase() === 'available' && <span className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.4)]">Ready</span>}
                          {room.status?.toLowerCase() === 'cleaning' && <span className="bg-amber-500 text-black px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.4)]">Cleaning</span>}
                          {room.status?.toLowerCase() === 'clean' && <span className="bg-cyan-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.4)]">Inspect</span>}
                          {room.status?.toLowerCase() === 'blocked' && <span className="bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 text-[9px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]"><ShieldAlert size={10}/> Maintenance</span>}
                          {room.status?.toLowerCase() === 'occupied' && <span className="bg-indigo-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(99,102,241,0.4)]">Occupied</span>}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className={"text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter w-fit " + getGuestContext(room).color}>
                           Guest Context: {getGuestContext(room).label}
                        </span>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{room.type}</p>
                      </div>
                    </div>
                    
                    {room.status === 'Cleaning' && (
                      <div className="flex flex-col items-end">
                        <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1.5 mb-1">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-black text-amber-500 uppercase">{calculateDuration(room.cleaning_started_at)}</span>
                        </div>
                        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">Started by {room.profiles?.full_name || 'Staff'}</p>
                      </div>
                    )}

                    {room.status === 'Clean' && (
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-500/5">
                        <CheckCircle size={12} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase">Ready for Inspection</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {room.status === 'Dirty' && (
                      <button 
                        onClick={() => handleAction(room.id, 'start')}
                        disabled={!!actionLoading}
                        className="w-full bg-white text-black hover:bg-indigo-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                      >
                        {actionLoading === room.id ? <Loader2 size={16} className="animate-spin" /> : <><Play size={16} fill="currentColor" /> Start Cleaning</>}
                      </button>
                    )}

                    {room.status === 'Cleaning' && (
                      <button 
                        onClick={() => handleAction(room.id, 'finish')}
                        disabled={!!actionLoading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                      >
                        {actionLoading === room.id ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Mark Finished</>}
                      </button>
                    )}

                    {room.status === 'Clean' && (
                      <button 
                        onClick={() => handleAction(room.id, 'inspect')}
                        disabled={!!actionLoading || !canInspect()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                      >
                        {actionLoading === room.id ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={18} /> Approve Room</>}
                      </button>
                    )}
                    
                    {room.status === 'Clean' && !canInspect() && (
                      <p className="text-[9px] text-rose-500 font-bold flex items-center justify-center gap-1.5"><Lock size={10} /> Supervisor access required to approve.</p>
                    )}
                    {room.status === 'Occupied' && (
                      <button 
                        onClick={() => alert("Stayover service logged. Daily towels and linens refreshed.")}
                        className="w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                      >
                        <Sparkles size={16} /> Log Daily Service
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
