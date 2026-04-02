"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getRevenueData } from '@/app/actions/analytics';

import {
  TrendingUp,
  DollarSign,
  Users,
  BedDouble,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  BarChart3,
  ChevronRight,
  Wallet,
  Percent,
  LayoutDashboard,
  BookOpen,
  DoorOpen,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Loader2,
  Activity,
  Clock,
  KeyRound,
  ShieldAlert,
  Building2,
  ChevronsUpDown,
  Lock,
  Brush
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: true, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: false, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Users, label: "Staff", href: "/dashboard/staff", active: false, module: 'staff_management' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

interface Property {
  id: string;
  name: string;
  tier: string;
  location?: string;
}

interface Room {
  id: string;
  property_id: string;
  room_number: string;
  type: string;
  status: string;
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

// --- COLOR MAP (Tailwind JIT-safe) ---
const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
    glow: "shadow-[0_0_15px_rgba(99,102,241,0.15)]",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.15)]",
  },
};

// --- STATUS MAP ---
const statusStyles: Record<string, string> = {
  "Confirmed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Pending": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Checked In": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

// --- PREMIUM STAT CARD ---
const StatCard = ({ title, value, subtitle, icon: Icon, color = "indigo", trend, trendUp }: {
  title: string; value: string; subtitle: string; icon: React.ElementType; color?: string; trend: string; trendUp: boolean;
}) => {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-500 group ${c.glow}`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} border ${c.border}`}>
          <Icon size={18} />
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.12em] mb-1">{title}</p>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-[11px] text-zinc-600 mt-1.5">{subtitle}</p>
      </div>
      {/* Subtle gradient accent */}
      <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20 ${c.bg} group-hover:opacity-40 transition-opacity duration-700`} />
    </motion.div>
  );
};

export default function Tier2Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [accessiblePropsList, setAccessiblePropsList] = useState<{id: string, name: string}[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<{date: string, revenue: number}[]>([]);
  
  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
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

        const { data: accessibleProperties } = await supabase
          .from('property_access')
          .select(`
            property_id,
            properties ( id, name )
          `)
          .eq('user_id', user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) setUserProfile(profile);

        let activePropertyId = null;
        let parsedPropsList: {id: string, name: string}[] = [];
        
        if (accessibleProperties && accessibleProperties.length > 0) {
          parsedPropsList = accessibleProperties.map((p: any) => p.properties);
          setAccessiblePropsList(parsedPropsList);
          
          const savedId = localStorage.getItem('pms_active_property');
          if (savedId && parsedPropsList.some(p => p.id === savedId)) {
            activePropertyId = savedId;
          } else {
            activePropertyId = parsedPropsList[0].id;
            localStorage.setItem('pms_active_property', activePropertyId);
          }
        } else if (profile?.property_id) {
          activePropertyId = profile.property_id;
          const { data: fallbackProp } = await supabase.from('properties').select('id, name').eq('id', activePropertyId).single();
          if (fallbackProp) {
            setAccessiblePropsList([fallbackProp]);
          }
        }
          
        if (activePropertyId) {
          const { data: propData } = await supabase
            .from('properties')
            .select('*')
            .eq('id', activePropertyId)
            .single();
          
          if (propData) {
            setProperty(propData);
            
            if (profile && (profile.role === 'owner' || profile.role === 'admin' || (profile.permissions && profile.permissions.staff_management !== 'none'))) {
              const { data: staffData } = await supabase
                .from('profiles')
                .select('*')
                .eq('property_id', activePropertyId)
                .in('role', ['staff', 'Guest Journey', 'Night Auditor', 'Room Attendant', 'Supervisor']);
              if (staffData) setStaffList(staffData);
            }

            const { data: roomsData } = await supabase.from('rooms').select('*').eq('property_id', propData.id);
            const { data: bookingsData } = await supabase.from('bookings').select('*').eq('property_id', propData.id).order('check_in', { ascending: false });

            if (roomsData) setRooms(roomsData);
            if (bookingsData) setBookings(bookingsData);

            if (profile && (profile.role === 'owner' || profile.role === 'admin' || (profile.permissions && profile.permissions.analytics !== 'none'))) {
              try {
                const analyticsRes = await getRevenueData(propData.id);
                if (analyticsRes.success && analyticsRes.data) {
                  setRevenueData(analyticsRes.data);
                }
              } catch (e) {
                console.warn("Analytics fetch failed:", e);
              }
            }
          }
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [supabase]);

  const switchProperty = (propId: string) => {
    localStorage.setItem('pms_active_property', propId);
    setShowPropertyDropdown(false);
    window.location.reload();
  };

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
    
    // Quick reload strategy
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // --- METRIC CALCULATIONS ---
  const totalRevenue = bookings.reduce((acc, b) => acc + Number(b.amount), 0);
  const distinctGuests = new Set(bookings.map(b => b.guest_name)).size;
  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const totalRoomsCount = rooms.length || 1;
  const occupancyRate = ((occupiedRooms / totalRoomsCount) * 100).toFixed(1);
  const avgDailyRate = bookings.length > 0 ? (totalRevenue / bookings.length).toFixed(0) : "0";

  // --- ACCESS CONTROL HELPER ---
  const hasAccess = (moduleName: string) => {
    if (!userProfile) return true; // Loading state
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    
    const perms = userProfile.permissions || {};
    const modPerms = perms[moduleName];
    
    if (!modPerms || Object.values(modPerms).every(v => v === 'none')) {
      return false;
    }
    return perms[moduleName] !== 'none';
    };

    // 1. Loading State
    if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#08080a] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
    }

    // 2. Password Reset State
    if (requiresPasswordReset) {
    return (
      <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-6 z-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-[360px] relative z-10 flex flex-col items-center"
        >
          {/* Logo Area */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <KeyRound size={20} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Security Update</h1>
            <p className="text-zinc-500 text-[10px] text-center mt-2 font-medium">Please verify your identity by replacing the system-generated key with your own permanent password.</p>
          </div>

          <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-7 shadow-2xl shadow-black">
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
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-amber-500/40 transition-all"
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
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-amber-500/40 transition-all"
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
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10 mt-3"
              >
                {isResetLoading ? <Loader2 size={14} className="animate-spin" /> : 'Lock Credentials & Enter'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#08080a]">

      {/* ===== SIDEBAR ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        {/* Logo / Brand / Property Switcher */}
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

          {/* Dropdown Menu */}
          {showPropertyDropdown && accessiblePropsList.length > 1 && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Switch Property</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {accessiblePropsList.map(prop => (
                  <button
                    key={prop.id}
                    onClick={() => switchProperty(prop.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${
                      prop.id === property?.id 
                        ? 'bg-indigo-500/10 text-indigo-400' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {prop.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
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
                    : locked 
                      ? 'text-zinc-700 cursor-not-allowed'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
                }`}
              >
                <item.icon size={17} className={item.active ? 'text-indigo-400' : ''} />
                <span className="flex-1">{item.label}</span>
                {locked && <Lock size={12} className="text-zinc-800" />}
              </Link>
            );
          })}
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
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto">

        {/* TOP BAR */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#08080a]/80 border-b border-white/[0.04] px-8 py-4">
          <div className="flex justify-between items-center">
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">Owner Overview</h2>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-0.5">Real-time property intelligence &bull; March 22, 2026</p>
            </motion.div>

            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 cursor-not-allowed">
                <Search size={16} />
              </button>
              <button className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all relative">
                <Bell size={16} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#08080a]" />
              </button>
              <button className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-[12px] font-bold hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.06)] active:scale-[0.97]">
                <BarChart3 size={14} />
                Generate Report
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">

          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard
              title="Total Revenue" subtitle="Current historical total"
              icon={Wallet} color="emerald" value={`$${totalRevenue.toLocaleString()}`} trend="12.5%" trendUp={true}
            />
            <StatCard
              title="Avg Booking Value" subtitle="Per reservation"
              icon={DollarSign} color="indigo" value={`$${avgDailyRate}`} trend="3.2%" trendUp={true}
            />
            <StatCard
              title="Occupancy Rate" subtitle={`${occupiedRooms} of ${totalRoomsCount} rooms occupied`}
              icon={Percent} color="amber" value={`${occupancyRate}%`} trend="2.1%" trendUp={false}
            />
            <StatCard
              title="Total Guests" subtitle={`Across ${bookings.length} bookings`}
              icon={Users} color="violet" value={distinctGuests.toString()} trend="0.3" trendUp={true}
            />
          </div>

          <div className="grid grid-cols-12 gap-6">

            {/* ===== LEFT COLUMN ===== */}
            <div className="col-span-12 xl:col-span-8 space-y-6">

              {/* REVENUE CHART */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-zinc-900/40 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-7"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-[15px] font-bold text-white tracking-tight">Revenue Trend</h3>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Weekly performance overview</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-[11px] font-semibold bg-white/[0.06] text-zinc-400 px-3.5 py-1.5 rounded-lg hover:text-white transition-colors">
                      This Week
                      <ChevronDown size={12} className="inline ml-1" />
                    </button>
                  </div>
                </div>

                {/* Dynamic SVG Bar Chart */}
                <div className="flex items-end justify-between h-[180px] mt-6 pt-4 border-b border-white/[0.04] relative">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500/50" size={20} /></div>
                  ) : revenueData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center"><p className="text-[11px] text-zinc-600">No revenue data available.</p></div>
                  ) : (
                    <>
                      {/* Y-axis guidelines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[4, 3, 2, 1, 0].map((i) => (
                          <div key={i} className="w-full border-t border-white/[0.02] h-0 relative">
                            <span className="absolute -top-2.5 -left-8 text-[9px] text-zinc-600">${Math.round((Math.max(...revenueData.map(d => d.revenue)) * (i/4)) / 100) * 100}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Bars */}
                      <div className="w-full h-full flex items-end justify-between gap-1 z-10 pl-2">
                        {revenueData.slice(-14).map((day, i) => {
                          const maxRev = Math.max(...revenueData.map(d => d.revenue)) || 1;
                          const heightPct = Math.max((day.revenue / maxRev) * 100, 2); // min 2% height
                          return (
                            <div key={i} className="relative group flex-1 flex flex-col items-center justify-end h-full">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPct}%` }}
                                transition={{ delay: 0.1 + (i * 0.05), duration: 0.8, type: "spring" }}
                                className="w-full max-w-[12px] bg-gradient-to-t from-indigo-900/50 to-indigo-500/80 rounded-t-sm group-hover:from-indigo-700 group-hover:to-indigo-400 transition-colors cursor-pointer"
                              />
                              {/* Tooltip */}
                              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-xl border border-white/10">
                                ${day.revenue} <br/>
                                <span className="text-zinc-400 text-[8px] uppercase">{new Date(day.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between px-2 mt-3 text-[9px] text-zinc-600 font-medium uppercase tracking-wider">
                  <span>{revenueData.length > 0 ? new Date(revenueData[Math.max(0, revenueData.length - 14)].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}</span>
                  <span>{revenueData.length > 0 ? new Date(revenueData[revenueData.length - 1].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}</span>
                </div>
              </motion.div>

              {/* BOOKINGS TABLE */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-7 backdrop-blur-sm"
              >
                <div className="flex justify-between items-center mb-7">
                  <div>
                    <h3 className="text-[15px] font-bold text-white tracking-tight">Recent Bookings</h3>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Latest reservations and check-ins</p>
                  </div>
                  <button className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors flex items-center gap-1">
                    View All
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold pb-4 border-b border-white/[0.04] mb-2">
                  <div className="col-span-4">Guest</div>
                  <div className="col-span-2">Room</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Duration</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>

                {/* Table Rows */}
                <div className="space-y-1">
                  {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
                  ) : bookings.slice(0, 5).map((bk: Booking, i: number) => (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      key={bk.id}
                      className="grid grid-cols-12 gap-4 items-center py-4 rounded-xl hover:bg-white/[0.02] transition-all cursor-pointer group px-2"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700 border border-white/[0.06] flex items-center justify-center text-[11px] font-bold text-zinc-300 group-hover:from-indigo-600 group-hover:to-indigo-500 group-hover:text-white group-hover:border-indigo-500/30 transition-all duration-300">
                          {bk.guest_name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition-colors">{bk.guest_name}</p>
                          <p className="text-[10px] text-zinc-600">{bk.id.slice(0, 8)} &bull; {new Date(bk.check_in).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[12px] text-zinc-400 font-medium">Room {rooms.find((r: Room) => r.id === bk.room_id)?.room_number || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusStyles[bk.status] || ''}`}>
                          {bk.status}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[12px] text-zinc-500">Live</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-[13px] font-bold text-white">${bk.amount}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="col-span-12 xl:col-span-4 space-y-6">

              {/* TEAM MANAGEMENT CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-7 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.4)]"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-indigo-200" />
                      <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em]">Team Hub</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight mb-2">Manage Your Staff</h3>
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed mb-6">Onboard team members and control terminal access for your property.</p>
                  
                  <Link 
                    href="/dashboard/staff"
                    className="w-full bg-white text-indigo-700 py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-[0.97] shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
                  >
                    <UserPlus size={15} />
                    Open Staff Manager
                  </Link>
                </div>
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
              </motion.div>

              {/* STAFF OVERVIEW */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-7"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <Activity size={14} className="text-indigo-400" />
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]">Recent Staff</h3>
                  </div>
                  <Link href="/dashboard/staff" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">View All</Link>
                </div>
                
                {staffList.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic text-center py-4">No staff provisioned yet.</p>
                ) : (
                  <div className="space-y-4">
                    {staffList.slice(0, 3).map((st) => (
                      <div key={st.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-mono text-zinc-400 uppercase">
                          {st.email.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-white truncate">{st.email}</p>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* QUICK MANAGEMENT */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-6"
              >
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-5 px-1">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Inventory & Rates', description: 'Manage rooms and pricing', icon: BedDouble, color: 'indigo' },
                    { label: 'Financial Overview', description: 'Revenue and expenses', icon: Building2, color: 'emerald' },
                    { label: 'Channel Manager', description: 'OTA connections', icon: TrendingUp, color: 'amber' },
                    { label: 'Recent Activity', description: 'Audit log & events', icon: Clock, color: 'violet' },
                  ].map((item: { label: string, description: string, icon: React.ElementType, color: string }) => {
                    const c = colorMap[item.color] || colorMap.indigo;
                    return (
                      <button
                        key={item.label}
                        className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.03] rounded-xl transition-all group border border-transparent hover:border-white/[0.06]"
                      >
                        <div className={`p-2 rounded-lg ${c.bg} ${c.text} border ${c.border} group-hover:scale-105 transition-transform`}>
                          <item.icon size={15} />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-[12px] font-semibold text-zinc-400 group-hover:text-white transition-colors block">{item.label}</span>
                          <span className="text-[10px] text-zinc-700">{item.description}</span>
                        </div>
                        <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* OCCUPANCY VISUAL */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-zinc-900/40 border border-white/[0.06] rounded-2xl p-7"
              >
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-5">Room Occupancy</h3>
                <div className="flex justify-center mb-6">
                  <div className="relative w-32 h-32">
                    {/* Background ring */}
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.04)" strokeWidth="10" fill="none" />
                      <motion.circle
                        cx="60" cy="60" r="52"
                        stroke="url(#occupancy-gradient)"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="326.73"
                        initial={{ strokeDashoffset: 326.73 }}
                        animate={{ strokeDashoffset: 326.73 * (1 - 0.742) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      />
                      <defs>
                        <linearGradient id="occupancy-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{occupancyRate}%</span>
                      <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Occupied</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white/[0.03] rounded-xl py-3 px-2">
                    <p className="text-lg font-bold text-white">{occupiedRooms}</p>
                    <p className="text-[10px] text-zinc-600">Occupied</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl py-3 px-2">
                    <p className="text-lg font-bold text-zinc-400">{totalRoomsCount - occupiedRooms}</p>
                    <p className="text-[10px] text-zinc-600">Available</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}