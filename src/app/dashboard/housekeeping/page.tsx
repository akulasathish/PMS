"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brush, Sparkles, Clock, CheckCircle2, UserCheck, 
  Loader2, Building2, LayoutDashboard,
  DoorOpen, Activity, Settings, Lock,
  Undo, CheckSquare, Square, LogOut, ShieldAlert,
  AlertTriangle, Moon
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { markRoomClean, markRoomDirty, bulkMarkRoomsClean, bulkMarkRoomsDirty } from '@/app/actions/housekeeping';
import { Property, Room, Booking, UserProfile } from '@/lib/types';

interface RoomWithProfile extends Room {
  profiles?: { full_name: string };
  cleaning_started_at?: string;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: false, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: true, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Moon, label: "Night Audit", href: "/dashboard/night-audit", active: false, module: 'night_audit' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

export default function HousekeepingTerminal() {
  const [rooms, setRooms] = useState<RoomWithProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessDate, setBusinessDate] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'todo' | 'clean' | 'all'>('todo');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  
  const supabase = createClient();

  const [activeBlocks, setActiveBlocks] = useState<any[]>([]);

  const loadHousekeepingData = useCallback(async () => {
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
            localStorage.setItem('pms_active_property', activeId || '');
         } else if (prof?.property_id) {
            activeId = prof.property_id;
            localStorage.setItem('pms_active_property', activeId || '');
         }
      }
      
      if (activeId && activeId !== 'undefined') {
          let finalRoomsQuery;
          if (!activeId || activeId === 'undefined' || activeId === 'null') activeId = '63dad7aa-c5f9-4f0e-b21e-b0175397a42c';
          if (activeId && activeId !== 'undefined' && activeId !== 'null') {
             finalRoomsQuery = supabase.from('rooms').select('*, profiles:assigned_staff_id(full_name)').eq('property_id', activeId).or('is_deleted.eq.false,is_deleted.is.null').order('room_number');
          } else if (prof?.property_id) {
             finalRoomsQuery = supabase.from('rooms').select('*, profiles:assigned_staff_id(full_name)').eq('property_id', prof.property_id).or('is_deleted.eq.false,is_deleted.is.null').order('room_number');
          } else {
             finalRoomsQuery = supabase.from('rooms').select('*, profiles:assigned_staff_id(full_name)').or('is_deleted.eq.false,is_deleted.is.null').order('room_number');
          }

          const [propRes, settingsRes, roomsRes, bookingsRes, blocksRes] = await Promise.all([
            supabase.from('properties').select('*').eq('id', activeId).single(),
            supabase.from('app_settings').select('value').eq('key', 'business_date').single(),
            finalRoomsQuery,
            supabase.from('bookings').select('*').eq('property_id', activeId).in('status', ['Confirmed', 'Checked In']),
            supabase.from('room_blocks').select('*').eq('property_id', activeId).eq('status', 'Active')
          ]);

          if (propRes.data) {
            setProperty(propRes.data);
          }

          const activeDate = settingsRes.data?.value || '2026-06-21';
          setBusinessDate(activeDate);

          if (!roomsRes.data || roomsRes.data.length === 0) {
              console.error("🚨 EMERGENCY TRUTH LOG: ZERO ROOMS FETCHED FOR PROPERTY!", activeId);
              
              const { data: realPropAccess } = await supabase.from('property_access').select('property_id').eq('user_id', auth.user.id);
              let realPropId = realPropAccess?.[0]?.property_id;
              
              if (!realPropId && prof?.property_id) {
                  realPropId = prof.property_id;
              }
              
              if (realPropId && realPropId !== activeId) {
                  console.log("🩹 Auto-Repair: Zombie ID detected. Erasing cache and rebooting app to:", realPropId);
                  localStorage.setItem('pms_active_property', realPropId);
                  window.location.reload();
                  return;
              }
          }

          if (roomsRes.data) setRooms(roomsRes.data);
          if (bookingsRes.data) setBookings(bookingsRes.data);
          if (blocksRes.data) setActiveBlocks(blocksRes.data);
        }

    } catch (err) {
      console.error("Housekeeping Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadHousekeepingData();
  }, [loadHousekeepingData]);


  // Global Realtime listener for ROOM status changes
  useEffect(() => {
    if (!property?.id) return;

    const roomChannel = supabase
      .channel('rooms-sync-hk')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: 'property_id=eq.' + property.id
        },
        (payload: any) => {
          console.log("Housekeeping Realtime Sync:", payload.eventType, payload.new);
          
          if (payload.eventType === 'UPDATE') {
            setRooms((prevRooms) => 
              prevRooms.map((r) => r.id === payload.new.id ? { ...r, ...payload.new } : r)
            );
          } else if (payload.eventType === 'INSERT') {
            setRooms((prevRooms) => [...prevRooms, payload.new as RoomWithProfile]);
          } else if (payload.eventType === 'DELETE') {
            setRooms((prevRooms) => prevRooms.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [property?.id, supabase]);


  const getTrueHousekeepingStatus = (room: RoomWithProfile) => {
    const activeBooking = bookings.find(b => b.room_id === room.id && b.status === 'Checked In');
    if (activeBooking && room.status !== 'Blocked') {
      if (room.status === 'Dirty' || room.status === 'Available') {
        return 'Occupied';
      }
    }
    return room.status;
  };

  const getGuestContext = (room: RoomWithProfile): { label: string, color: string, condition: string, detail?: string } => {
    const status = getTrueHousekeepingStatus(room);
    if (status === 'Blocked') {
      const block = activeBlocks?.find(b => b.room_id === room.id);
      return { 
        label: 'Out of Order / Maintenance', 
        color: 'text-rose-500 bg-rose-500/10 border border-rose-500/20',
        condition: 'offline',
        detail: block ? `Reason: ${block.reason}` : undefined
      };
    }

    const today = businessDate || new Date().toISOString().substring(0, 10);
    const booking = bookings.find(b => b.room_id === room.id);
    
    let label = 'Vacant';
    let color = 'text-zinc-500 bg-zinc-500/10';
    
    if (booking) {
      if (booking.status === 'Confirmed' && booking.check_in === today) {
         label = 'Arrival Today';
         color = 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20';
      } else if (booking.status === 'Checked In' && booking.check_out === today) {
         label = 'Departing Today';
         color = 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
      } else if (booking.status === 'Checked In') {
         label = 'Stayover';
         color = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
      } else {
         label = 'Reserved';
      }
    }

    let condition = '';
    if (['dirty', 'cleaning'].includes(status?.toLowerCase() || '')) condition = 'To Clean';
    if (['clean', 'available'].includes(status?.toLowerCase() || '')) condition = 'Clean / Ready for Guest';
    if (status === 'Occupied') condition = 'Service Required';

    return { label, color, condition };
  };

  // Simplified and direct actions
  const handleMarkClean = async (roomId: string) => {
    setActionLoading(roomId);
    const res = await markRoomClean(roomId);
    if (res?.success) {
      setSelectedRoomIds(prev => prev.filter(id => id !== roomId));
      await loadHousekeepingData();
    } else {
      alert(res?.error || "Action failed");
    }
    setActionLoading(null);
  };

  const handleMarkDirty = async (roomId: string) => {
    setActionLoading(roomId);
    const res = await markRoomDirty(roomId);
    if (res?.success) {
      setSelectedRoomIds(prev => prev.filter(id => id !== roomId));
      await loadHousekeepingData();
    } else {
      alert(res?.error || "Action failed");
    }
    setActionLoading(null);
  };

  const handleBulkClean = async () => {
    if (selectedRoomIds.length === 0) return;
    setActionLoading('bulk');
    const res = await bulkMarkRoomsClean(selectedRoomIds);
    if (res?.success) {
      setSelectedRoomIds([]);
      await loadHousekeepingData();
    } else {
      alert(res?.error || "Bulk clean action failed");
    }
    setActionLoading(null);
  };

  const handleBulkDirty = async () => {
    if (selectedRoomIds.length === 0) return;
    setActionLoading('bulk');
    const res = await bulkMarkRoomsDirty(selectedRoomIds);
    if (res?.success) {
      setSelectedRoomIds([]);
      await loadHousekeepingData();
    } else {
      alert(res?.error || "Bulk revert action failed");
    }
    setActionLoading(null);
  };

  const toggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = getFilteredRooms().map(r => r.id);
    const allSelected = filteredIds.every(id => selectedRoomIds.includes(id));
    if (allSelected) {
      setSelectedRoomIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedRoomIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const getFilteredRooms = () => {
    if (activeTab === 'todo') return rooms.filter(r => getTrueHousekeepingStatus(r)?.toLowerCase() === 'dirty');
    if (activeTab === 'clean') return rooms.filter(r => ['available', 'clean'].includes(getTrueHousekeepingStatus(r)?.toLowerCase() || ''));
    if (activeTab === 'all') return rooms;
    return [];
  };

  const hasAccess = (_moduleName: string) => {
    return true;
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
        <header className="p-4 md:p-8 border-b border-white/[0.04] bg-[#08080a] flex flex-col gap-4 md:gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                <Brush className="text-indigo-400" />
                Housekeeping Terminal
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm mt-1">Operational Room Management & Quality Control</p>
            </div>
          </div>

          {/* SUB-TABS */}
          {/* Mobile Dropdown Tab Selector */}
          <div className="block md:hidden w-full relative">
            <select
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value as 'todo' | 'clean' | 'all');
                setSelectedRoomIds([]);
              }}
              className="w-full appearance-none bg-zinc-900 border border-white/10 rounded-2xl py-3.5 pl-4 pr-12 text-xs text-white font-bold uppercase tracking-wider focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-zinc-800 transition-all shadow-xl active:scale-[0.99]"
            >
              <option value="todo" className="bg-[#0c0c0e] text-white">⏰ To Clean ({rooms.filter(r => getTrueHousekeepingStatus(r)?.toLowerCase() === 'dirty').length})</option>
              <option value="clean" className="bg-[#0c0c0e] text-white"> Ready / Clean ({rooms.filter(r => ['available', 'clean'].includes(getTrueHousekeepingStatus(r)?.toLowerCase() || '')).length})</option>
              <option value="all" className="bg-[#0c0c0e] text-white">📊 All Rooms ({rooms.length})</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 flex items-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {/* Desktop Sub-Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-2xl w-fit">
            {[
              { id: 'todo', label: 'To Clean', icon: Clock, count: rooms.filter(r => getTrueHousekeepingStatus(r)?.toLowerCase() === 'dirty').length },
              { id: 'clean', label: 'Clean Rooms', icon: CheckCircle2, count: rooms.filter(r => ['available', 'clean'].includes(getTrueHousekeepingStatus(r)?.toLowerCase() || '')).length },
              { id: 'all', label: 'All Rooms', icon: Activity, count: rooms.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as 'todo' | 'clean' | 'all');
                  setSelectedRoomIds([]);
                }}
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

          {/* BULK ACTION BAR */}
          {selectedRoomIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-950/40 border border-indigo-500/20 px-6 py-4 rounded-3xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-xs">
                  {selectedRoomIds.length}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Rooms Selected</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Perform bulk status changes</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={toggleSelectAll}
                  className="flex-1 sm:flex-initial bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-white/5 transition-colors"
                >
                  Select / Deselect All
                </button>
                {activeTab === 'todo' && (
                  <button
                    onClick={handleBulkClean}
                    disabled={actionLoading === 'bulk'}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-colors"
                  >
                    {actionLoading === 'bulk' ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle2 size={12} /> Mark Clean ({selectedRoomIds.length})</>}
                  </button>
                )}
                {activeTab === 'clean' && (
                  <button
                    onClick={handleBulkDirty}
                    disabled={actionLoading === 'bulk'}
                    className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10 transition-colors"
                  >
                    {actionLoading === 'bulk' ? <Loader2 size={12} className="animate-spin" /> : <><Undo size={12} /> Revert to Dirty ({selectedRoomIds.length})</>}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </header>

        <div className="flex-1 p-4 md:p-8 pb-28 lg:pb-8 overflow-y-auto">
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
              ) : getFilteredRooms().map((room) => {
                const trueStatus = getTrueHousekeepingStatus(room);
                const isSelected = selectedRoomIds.includes(room.id);
                return (
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
                      <div className="flex items-start gap-4">
                        {/* Checkbox for selection */}
                        {(trueStatus?.toLowerCase() === 'dirty' || trueStatus?.toLowerCase() === 'available' || trueStatus?.toLowerCase() === 'clean') && (
                          <button
                            onClick={() => toggleSelectRoom(room.id)}
                            className="mt-1.5 p-1 rounded-lg border border-white/10 hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors text-zinc-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare size={18} className="text-indigo-400" />
                            ) : (
                              <Square size={18} className="text-zinc-600" />
                            )}
                          </button>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-3xl font-black text-white tracking-tighter">#{room.room_number}</h4>
                            
                            {/* THE REQUESTED HOUSEKEEPING STATUS BADGES */}
                            <div className="flex items-center gap-1">
                              {trueStatus?.toLowerCase() === 'dirty' && <span className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.4)]">Dirty</span>}
                              {['available', 'clean'].includes(trueStatus?.toLowerCase() || '') && <span className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.4)]">Clean</span>}
                              {trueStatus?.toLowerCase() === 'blocked' && <span className="bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 text-[9px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]"><ShieldAlert size={10}/> Maintenance</span>}
                              {trueStatus?.toLowerCase() === 'occupied' && <span className="bg-indigo-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(99,102,241,0.4)]">Occupied</span>}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className={"text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter w-fit " + getGuestContext(room).color}>
                               Guest Context: {getGuestContext(room).label}
                            </span>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{room.type}</p>
                          </div>
                        </div>
                      </div>
                      
                      {getGuestContext(room).detail && (
                        <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 mt-3 mb-2">
                          <AlertTriangle size={12} className="text-rose-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-relaxed">{getGuestContext(room).detail}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {trueStatus === 'Dirty' && (
                        <button 
                          onClick={() => handleMarkClean(room.id)}
                          disabled={!!actionLoading}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50"
                        >
                          {actionLoading === room.id ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Mark Clean</>}
                        </button>
                      )}

                      {['available', 'clean'].includes(trueStatus?.toLowerCase() || '') && (
                        <button 
                          onClick={() => handleMarkDirty(room.id)}
                          disabled={!!actionLoading}
                          className="w-full bg-rose-950/20 hover:bg-rose-900 border border-rose-500/20 text-rose-400 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50"
                        >
                          {actionLoading === room.id ? <Loader2 size={16} className="animate-spin" /> : <><Undo size={16} /> Revert to Dirty</>}
                        </button>
                      )}
                      
                      {trueStatus === 'Occupied' && (
                        <button 
                          onClick={() => alert("Stayover service logged. Daily towels and linens refreshed.")}
                          className="w-full bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                        >
                          <Sparkles size={16} /> Log Daily Service
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
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
