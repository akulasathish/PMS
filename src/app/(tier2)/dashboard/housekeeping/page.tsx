"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brush, Sparkles, Clock, CheckCircle2, 
  ArrowLeft, Loader2, Building2, LayoutDashboard,
  DoorOpen, Activity, Users, Settings, LogOut,
  ChevronsUpDown, Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
  const [isLoading, setIsLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessiblePropsList, setAccessiblePropsList] = useState<any[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      // Multi-tenant logic
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

        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .eq('property_id', activeId)
          .eq('status', 'Dirty')
          .order('room_number');
        setRooms(roomsData || []);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const handleClean = async (roomId: string) => {
    const { error } = await supabase.from('rooms').update({ status: 'Available' }).eq('id', roomId);
    if (!error) {
      setRooms(rooms.filter(r => r.id !== roomId));
    }
  };

  const hasAccess = (moduleName: string) => {
    if (!userProfile) return true;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    return (userProfile.permissions || {})[moduleName] !== 'none';
  };

  return (
    <div className="flex min-h-screen bg-[#08080a] font-sans selection:bg-indigo-500/30">
      
      {/* SIDEBAR (Unified) */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
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
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Brush className="text-indigo-400" />
              Housekeeping Terminal
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Real-time room recovery and maintenance</p>
          </div>
          
          <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 px-4 py-2 rounded-xl">
            <div className="text-right text-[11px]">
              <p className="text-zinc-500 uppercase font-bold tracking-widest">Pending Rooms</p>
              <p className="text-white font-bold text-lg">{rooms.length}</p>
            </div>
            <div className="w-px h-8 bg-white/10 mx-2" />
            <Sparkles className="text-amber-400 animate-pulse" size={20} />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></div>
          ) : rooms.length === 0 ? (
            <div className="col-span-full py-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="text-emerald-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">All Rooms Restored</h3>
              <p className="text-zinc-600 text-sm mt-2">Inventory is 100% clean and ready for arrivals.</p>
            </div>
          ) : rooms.map((room, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={room.id}
              className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 group hover:border-indigo-500/30 transition-all shadow-xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">#{room.room_number}</h4>
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{room.type}</span>
                </div>
                <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center gap-2">
                  <Clock size={12} className="text-rose-500" />
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Dirty</span>
                </div>
              </div>

              <button 
                onClick={() => handleClean(room.id)}
                className="w-full bg-indigo-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
              >
                <Sparkles size={16} />
                Mark as Cleaned
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
