"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Activity, 
  Plus, 
  Download, 
  Terminal, 
  ShieldCheck, 
  Zap,
  MoreVertical
} from 'lucide-react';

// --- MOCK DATA ---
const PROPERTIES = [
  { id: 1, name: "Grand Hyatt Regency", tier: "Enterprise", occupancy: 88, status: "Healthy", revenue: "$42,000" },
  { id: 2, name: "Ocean View Resort", tier: "Pro", occupancy: 45, status: "Warning", revenue: "$18,500" },
  { id: 3, name: "The Delhi Boutique", tier: "Starter", occupancy: 92, status: "Healthy", revenue: "$8,200" },
  { id: 4, name: "Swiss Alps Lodge", tier: "Enterprise", occupancy: 12, status: "Healthy", revenue: "$65,000" },
];

// --- PREMIUM UI COMPONENTS ---
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <GlassCard className="flex flex-col gap-2">
    <div className="flex justify-between items-start text-zinc-400">
      <Icon size={20} />
      <span className="text-xs font-medium text-emerald-500">{trend}</span>
    </div>
    <div className="mt-2">
      <p className="text-sm text-zinc-500 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
    </div>
  </GlassCard>
);

// --- THE MAIN EXPORT (THIS FIXES YOUR ERROR) ---
export default function Tier1Admin() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 p-8 font-sans selection:bg-indigo-500/30">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Command</h1>
          <p className="text-zinc-500 text-sm mt-1">SaaS Provider Engine • v2.0.26</p>
        </motion.div>
        
        <div className="flex gap-3">
          <button className="p-2 hover:bg-zinc-800 rounded-lg border border-white/5 transition-colors text-zinc-500 hover:text-white">
            <Terminal size={20} />
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            <Plus size={18} />
            Register Property
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: STATS & TABLE */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* BENTO STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Properties" value="12" icon={Building2} trend="+2 new" />
            <StatCard title="Processed" value="$1.24M" icon={Zap} trend="+14.2%" />
            <StatCard title="Live Guests" value="842" icon={Users} trend="Active" />
            <StatCard title="System" value="99.9%" icon={ShieldCheck} trend="Stable" />
          </div>

          {/* MAIN PROPERTY TABLE */}
          <GlassCard>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Property Fleet Manager</h2>
              <div className="flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase font-bold tracking-widest">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Live Network Sync
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-widest border-b border-white/5">
                  <th className="pb-4 font-medium">Property</th>
                  <th className="pb-4 font-medium">Tier</th>
                  <th className="pb-4 font-medium">Occupancy</th>
                  <th className="pb-4 font-medium">MRR</th>
                  <th className="pb-4 font-medium text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {PROPERTIES.map((prop) => (
                  <tr key={prop.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 font-medium text-white">{prop.name}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        prop.tier === 'Enterprise' ? 'border-indigo-500/50 text-indigo-400' : 'border-zinc-700 text-zinc-500'
                      }`}>
                        {prop.tier}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${prop.occupancy > 80 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
                        {prop.occupancy}%
                      </div>
                    </td>
                    <td className="py-4 text-zinc-400">{prop.revenue}</td>
                    <td className="py-4 text-right">
                      <button className="text-zinc-600 hover:text-white transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN: SYSTEM SENTINEL */}
        <div className="col-span-12 lg:col-span-3">
          <GlassCard className="h-full">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Activity size={14} className="text-indigo-500" />
              System Sentinel
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>n8n Engine</span>
                  <span className="text-emerald-500 text-[10px] font-bold uppercase">Active</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[95%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Supabase DB</span>
                  <span className="text-emerald-500 text-[10px] font-bold uppercase">Healthy</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[100%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>OTA Gateway</span>
                  <span className="text-amber-500 text-[10px] font-bold uppercase">Listening</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[40%]" />
                </div>
              </div>
            </div>

            <div className="mt-10 p-4 rounded-lg bg-indigo-600/10 border border-indigo-500/20">
              <p className="text-xs text-indigo-300 font-medium">Support Mode</p>
              <p className="text-[10px] text-zinc-500 mt-1">Enter a property dashboard to assist an owner.</p>
              <button className="w-full mt-3 py-2 text-[10px] bg-indigo-600 text-white rounded font-bold uppercase hover:bg-indigo-500 transition-colors">
                Launch Impersonation
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}