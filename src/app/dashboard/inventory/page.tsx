"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  DoorOpen,
  Users,
  Settings,
  Building2,
  LogOut,
  Search,
  Bell,
  Plus,
  Loader2,
  ShieldAlert,
  ChevronsUpDown,
  Activity,
  Brush,
  Lock,
  Trash2, DollarSign, Moon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { addRoom, deleteRoom } from '@/app/actions/inventory';
import { Property, Room, UserProfile } from '@/lib/types';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: false, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: true, module: 'inventory' },
  { icon: Moon, label: "Night Audit", href: "/dashboard/night-audit", active: false, module: 'night_audit' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-500 ${className}`}>
    {children}
  </div>
);

export default function Inventory() {
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [accessiblePropsList, setAccessiblePropsList] = useState<{ id: string, name: string }[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) return;

        const [profResult, accessiblePropertiesResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('property_access')
            .select(`
              property_id,
              properties ( id, name )
            `)
            .eq('user_id', user.id)
        ]);

        const prof = profResult.data;
        const accessibleProperties = accessiblePropertiesResult.data;
        
        setUserProfile(prof as UserProfile);

        let activePropertyId = null;
        let parsedPropsList: { id: string, name: string }[] = [];

        if (accessibleProperties && accessibleProperties.length > 0) {
          parsedPropsList = accessibleProperties.map((p) => p.properties as unknown as { id: string, name: string });
          setAccessiblePropsList(parsedPropsList);

          const savedId = localStorage.getItem('pms_active_property');
          if (savedId && parsedPropsList.some(p => p.id === savedId)) {
            activePropertyId = savedId;
          } else {
            activePropertyId = parsedPropsList[0].id;
          }
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('property_id')
            .eq('id', user.id)
            .single();
          if (profile?.property_id) activePropertyId = profile.property_id;

          if (!activePropertyId || activePropertyId === 'undefined') activePropertyId = '63dad7aa-c5f9-4f0e-b21e-b0175397a42c';
          if (activePropertyId) {
            const { data: fallbackProp } = await supabase.from('properties').select('id, name').eq('id', activePropertyId).single();
            if (fallbackProp) {
              setAccessiblePropsList([fallbackProp]);
            }
          }
        }

        if (activePropertyId) {
          setPropertyId(activePropertyId);

          const [propResult, roomsResult] = await Promise.all([
            supabase
              .from('properties')
              .select('*')
              .eq('id', activePropertyId)
              .single(),
            supabase
              .from('rooms')
              .select('*')
              .eq('property_id', activePropertyId)
              .or('is_deleted.eq.false,is_deleted.is.null')
              .order('room_number', { ascending: true })
          ]);

          const propData = propResult.data;
          const roomsData = roomsResult.data;

          if (propData) {
            setProperty(propData);
          }
          if (roomsData) {
            setRooms(roomsData);
          }
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  React.useEffect(() => {
    if (!propertyId) return;

    const roomChannel = supabase
      .channel('rooms-sync-inventory')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: 'property_id=eq.' + propertyId
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRooms((prevRooms) =>
              prevRooms.map((r) => r.id === (payload.new as Room).id ? { ...r, ...(payload.new as Room) } : r)
            );
          } else if (payload.eventType === 'INSERT') {
            setRooms((prevRooms) => [...prevRooms, payload.new as Room]);
          } else if (payload.eventType === 'DELETE') {
            setRooms((prevRooms) => prevRooms.filter((r) => r.id !== (payload.old as Room).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [propertyId, supabase]);

  const switchProperty = (propId: string) => {
    localStorage.removeItem('pms_active_property');
    localStorage.setItem('pms_active_property', propId);
    setShowPropertyDropdown(false);
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const hasAccess = (_moduleName: string) => {
    return true;
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (!window.confirm(`CRITICAL WARNING: Are you absolutely sure you want to permanently delete Room ${roomNumber}? This action cannot be undone.`)) return;
    setActionLoading(true);
    const result = await deleteRoom(roomId);
    if (result?.error) {
      alert(result.error);
      setActionLoading(false);
    } else {
      setRooms(prev => prev.filter(r => r.id !== roomId));
      setActionLoading(false);
    }
  };

  const handleAddRoom = async (formData: FormData) => {
    setActionLoading(true);
    setActionError('');
    if (!property?.id) {
      setActionError('Property profile not found. Cannot add rooms.');
      setActionLoading(false);
      return;
    }
    formData.append('propertyId', property.id);
    const result = await addRoom(formData);
    if (result?.error) {
      setActionError(result.error);
    }
    setActionLoading(false);
  };

  if (isLoading) return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex min-h-screen bg-[#08080a]">
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="p-6 pb-4 relative">
          <button 
            onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
            className="w-full flex items-center justify-between gap-3 p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <Building2 size={18} className="text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-[13px] font-bold text-white tracking-tight truncate max-w-[130px]">{property?.name || 'Loading...'}</h1>
                <p className="text-[10px] text-zinc-600 font-medium">Owner Dashboard</p>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
          </button>

          {showPropertyDropdown && accessiblePropsList.length > 1 && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Switch Property</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {accessiblePropsList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => switchProperty(p.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${
                      p.id === property?.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 mb-3">Navigation</p>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                  item.active
                    ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : locked ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
                }`}
              >
                <item.icon size={17} className={item.active ? 'text-indigo-400' : ''} />
                <span className="flex-1">{item.label}</span>
                {locked && <Lock size={12} className="text-zinc-800" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
              IS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-300 truncate">Owner</p>
              <p className="text-[10px] text-zinc-600 truncate">Property Admin</p>
            </div>
            <button onClick={handleLogout} className="group flex items-center gap-2 text-zinc-600 hover:text-rose-400 transition-all px-2 py-1.5 rounded-lg hover:bg-rose-500/5">
              <LogOut size={16} />
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#08080a]/80 border-b border-white/[0.04] px-8 py-4">
          <div className="flex justify-between items-center">
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">Room Inventory</h2>
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Management
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-0.5">Control your fleet of available rooms</p>
            </motion.div>

            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 cursor-not-allowed">
                <Search size={16} />
              </button>
              <button className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all relative">
                <Bell size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 pb-28 lg:pb-8 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
            <GlassCard>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Active Inventory</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">Synced with Front Desk Terminal</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase font-bold tracking-widest">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Live Sync
                </div>
              </div>

              {rooms.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                  <DoorOpen size={32} className="mx-auto text-zinc-600 mb-3" />
                  <p className="text-zinc-400 font-medium mb-1">No rooms added yet.</p>
                  <p className="text-[11px] text-zinc-600">Add a room using the quick form to populate your fleet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rooms.map((room, i) => (
                    <motion.div 
                      key={room.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative bg-black/40 border border-white/[0.05] hover:border-indigo-500/30 rounded-2xl p-5 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <DoorOpen size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">{room.status}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <h4 className="text-xl font-bold text-white tracking-tight mb-1">{room.room_number}</h4>
                          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">{room.type}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteRoom(room.id, room.room_number)}
                          disabled={actionLoading}
                          className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Room"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <GlassCard>
              <div className="mb-6">
                <h3 className="text-[15px] font-bold text-white tracking-tight">Add New Room</h3>
                <p className="text-[11px] text-zinc-500 mt-1">Deploys instantly to Front Desk</p>
              </div>

              <form action={handleAddRoom} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Room Number / ID</label>
                  <input 
                    name="number"
                    type="text" 
                    required
                    placeholder="e.g. 101 or A-12"
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Room Category</label>
                  <select 
                    name="type"
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all appearance-none"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="Penthouse">Penthouse</option>
                  </select>
                </div>

                {actionError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                    <ShieldAlert size={14} />
                    {actionError}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all mt-6 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add to Fleet</>}
                </button>
              </form>
            </GlassCard>
            
            <div className="mt-6 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <LayoutDashboard size={14} /> Note for Owners
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                When you add a room here, it becomes instantly available in your Front Desk terminal and is exclusively isolated to your property.
              </p>
            </div>
          </div>
        </div>
      </main>

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