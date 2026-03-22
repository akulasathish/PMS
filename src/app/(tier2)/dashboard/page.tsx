"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  BedDouble, 
  Calendar,
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
  Star,
  CreditCard,
  Activity,
  Clock,
  Building2,
  ChevronDown
} from 'lucide-react';

// --- MOCK DATA FOR OWNER ---
const RECENT_BOOKINGS = [
  { id: "BK-99", guest: "Aman Sharma", room: "102", amount: "$450", status: "Confirmed", date: "Today", nights: 3 },
  { id: "BK-98", guest: "Sarah Jenkins", room: "305", amount: "$1,200", status: "Pending", date: "Today", nights: 5 },
  { id: "BK-97", guest: "Raj Malhotra", room: "201", amount: "$300", status: "Confirmed", date: "Yesterday", nights: 2 },
  { id: "BK-96", guest: "Elena Rodriguez", room: "404", amount: "$890", status: "Confirmed", date: "Yesterday", nights: 4 },
  { id: "BK-95", guest: "James Wilson", room: "108", amount: "$675", status: "Checked In", date: "2 days ago", nights: 3 },
];

const STAFF = [
  { name: "Anita Deshmukh", role: "Front Desk Manager", status: "On Shift", avatar: "AD", lastActive: "Now" },
  { name: "Vikram Singhania", role: "Housekeeping Lead", status: "Break", avatar: "VS", lastActive: "10m ago" },
  { name: "Suresh Kumar", role: "Night Security", status: "On Shift", avatar: "SK", lastActive: "Now" },
  { name: "Priya Nair", role: "Concierge", status: "Off Duty", avatar: "PN", lastActive: "3h ago" },
];

const REVENUE_DAYS = [
  { day: "Mon", value: 5200, pct: 65 },
  { day: "Tue", value: 6800, pct: 85 },
  { day: "Wed", value: 4100, pct: 51 },
  { day: "Thu", value: 7200, pct: 90 },
  { day: "Fri", value: 8400, pct: 100 },
  { day: "Sat", value: 7800, pct: 93 },
  { day: "Sun", value: 6100, pct: 76 },
];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BookOpen, label: "Bookings", active: false },
  { icon: DoorOpen, label: "Rooms", active: false },
  { icon: DollarSign, label: "Finance", active: false },
  { icon: Users, label: "Staff", active: false },
  { icon: Settings, label: "Settings", active: false },
];

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

const staffStatusStyles: Record<string, { dot: string; text: string }> = {
  "On Shift": { dot: "bg-emerald-500", text: "text-emerald-400" },
  "Break": { dot: "bg-amber-500", text: "text-amber-400" },
  "Off Duty": { dot: "bg-zinc-600", text: "text-zinc-500" },
};

// --- PREMIUM STAT CARD ---
const StatCard = ({ title, value, subtitle, icon: Icon, color = "indigo", trend, trendUp }: {
  title: string; value: string; subtitle: string; icon: any; color?: string; trend: string; trendUp: boolean;
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
  const [searchOpen, setSearchOpen] = useState(false);
  
  return (
    <div className="flex min-h-screen bg-[#08080a]">
      
      {/* ===== SIDEBAR ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        {/* Logo / Brand */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-white tracking-tight">Grand Hyatt</h1>
              <p className="text-[10px] text-zinc-600 font-medium">Owner Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 mb-3">Navigation</p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                item.active
                  ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
              }`}
            >
              <item.icon size={17} className={item.active ? 'text-indigo-400' : ''} />
              {item.label}
              {item.label === 'Bookings' && (
                <span className="ml-auto bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">12</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer - User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
              IS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-300 truncate">Ishitha M.</p>
              <p className="text-[10px] text-zinc-600 truncate">Property Owner</p>
            </div>
            <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <LogOut size={15} />
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
              <button className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all">
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
              title="Total Revenue" subtitle="vs. $38,100 last month" 
              icon={Wallet} color="emerald" value="$42,850" trend="12.5%" trendUp={true} 
            />
            <StatCard 
              title="Avg Daily Rate" subtitle="Per room per night" 
              icon={DollarSign} color="indigo" value="$185" trend="3.2%" trendUp={true} 
            />
            <StatCard 
              title="Occupancy Rate" subtitle="46 of 62 rooms occupied" 
              icon={Percent} color="amber" value="74.2%" trend="2.1%" trendUp={false} 
            />
            <StatCard 
              title="Guest Rating" subtitle="From 284 reviews" 
              icon={Star} color="violet" value="4.8" trend="0.3" trendUp={true} 
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
                
                {/* Bar Chart */}
                <div className="flex items-end justify-between gap-3 h-[180px]">
                  {REVENUE_DAYS.map((d, i) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[10px] font-semibold text-zinc-500">${(d.value / 1000).toFixed(1)}k</span>
                      <div className="w-full relative">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${d.pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                          className={`w-full rounded-xl ${
                            d.day === 'Fri' 
                              ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                              : 'bg-white/[0.06] hover:bg-white/[0.1]'
                          } transition-colors cursor-pointer`}
                          style={{ minHeight: '8px', position: 'absolute', bottom: 0, left: 0, right: 0 }}
                        />
                        <div style={{ height: '140px' }} />
                      </div>
                      <span className={`text-[11px] font-semibold ${d.day === 'Fri' ? 'text-indigo-400' : 'text-zinc-600'}`}>{d.day}</span>
                    </div>
                  ))}
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
                  {RECENT_BOOKINGS.map((bk, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      key={bk.id} 
                      className="grid grid-cols-12 gap-4 items-center py-4 rounded-xl hover:bg-white/[0.02] transition-all cursor-pointer group px-2"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700 border border-white/[0.06] flex items-center justify-center text-[11px] font-bold text-zinc-300 group-hover:from-indigo-600 group-hover:to-indigo-500 group-hover:text-white group-hover:border-indigo-500/30 transition-all duration-300">
                          {bk.guest.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition-colors">{bk.guest}</p>
                          <p className="text-[10px] text-zinc-600">{bk.id} &bull; {bk.date}</p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[12px] text-zinc-400 font-medium">Room {bk.room}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusStyles[bk.status] || ''}`}>
                          {bk.status}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[12px] text-zinc-500">{bk.nights} nights</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-[13px] font-bold text-white">{bk.amount}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="col-span-12 xl:col-span-4 space-y-6">
              
              {/* TEAM CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-7 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.4)]"
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus size={16} className="text-indigo-200" />
                    <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em]">Team Building</span>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight mb-2">Grow Your Team</h3>
                  <p className="text-[12px] text-indigo-200/70 leading-relaxed mb-6">Onboard staff members and assign roles to streamline your operations.</p>
                  <button className="w-full bg-white text-indigo-700 py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-[0.97] shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                    <UserPlus size={15} />
                    Invite Staff Member
                  </button>
                </div>
                {/* Decorative orbs */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/[0.08] rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
              </motion.div>

              {/* STAFF MONITOR */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-7"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <Activity size={14} className="text-indigo-400" />
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]">Active Staff</h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">3 Online</span>
                </div>
                <div className="space-y-4">
                  {STAFF.map((person, i) => {
                    const ss = staffStatusStyles[person.status] || staffStatusStyles["Off Duty"];
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.06 }}
                        key={person.name} 
                        className="flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/[0.06] flex items-center justify-center text-[10px] font-bold text-zinc-400 group-hover:border-white/[0.12] transition-all">
                            {person.avatar}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${ss.dot} border-2 border-[#0a0a0c]`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-zinc-300 group-hover:text-white transition-colors truncate">{person.name}</p>
                          <p className="text-[10px] text-zinc-600 truncate">{person.role}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-semibold ${ss.text}`}>{person.status}</span>
                          <p className="text-[9px] text-zinc-700">{person.lastActive}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
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
                    { label: 'Financial Overview', description: 'Revenue and expenses', icon: CreditCard, color: 'emerald' },
                    { label: 'Channel Manager', description: 'OTA connections', icon: TrendingUp, color: 'amber' },
                    { label: 'Recent Activity', description: 'Audit log & events', icon: Clock, color: 'violet' },
                  ].map((item) => {
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
                      <span className="text-2xl font-bold text-white">74.2%</span>
                      <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Occupied</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white/[0.03] rounded-xl py-3 px-2">
                    <p className="text-lg font-bold text-white">46</p>
                    <p className="text-[10px] text-zinc-600">Occupied</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl py-3 px-2">
                    <p className="text-lg font-bold text-zinc-400">16</p>
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