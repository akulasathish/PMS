"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Layers, 
  Globe, 
  LayoutDashboard,
  LineChart,
  Users,
  Lock,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] animation-delay-2000 animate-pulse" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        
        {/* Hero Section */}
        <div className="text-center mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Next-Gen Property OS</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-8 leading-[1.1]"
          >
            Universal Command <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
              For Your Real Estate Fleet
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-zinc-400 leading-relaxed mb-12"
          >
            A cohesive intelligence layer for multi-tier property management. 
            Onboard entire portfolios, automate operations, and scale with precision using our Engine 2026 stack.
          </motion.p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Tier 1 Box */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Link href="/admin" className="group block h-full">
              <div className="relative h-full bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-10 hover:border-indigo-500/30 transition-all duration-500 hover:shadow-[0_0_50px_rgba(99,102,241,0.1)] overflow-hidden">
                <div className="relative z-10 pt-12">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Fleet Command</h3>
                  <p className="text-zinc-500 leading-relaxed mb-10 text-sm">
                    The ultimate console for SaaS providers and enterprise managers. 
                    Control global settings, monitor all properties, and manage user tiers from a unified interface.
                  </p>
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    Enter Admin Console
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-6 right-8 text-[100px] font-bold text-white/[0.02] pointer-events-none italic">T1</div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
              </div>
            </Link>
          </motion.div>

          {/* Tier 2 Box */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link href="/dashboard" className="group block h-full">
              <div className="relative h-full bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-10 hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden">
                <div className="relative z-10 pt-12">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 transition-transform">
                    <Building2 size={28} />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Owner Overview</h3>
                  <p className="text-zinc-500 leading-relaxed mb-10 text-sm">
                    Tailored intelligence for property owners and hotel managers. 
                    Real-time occupancy stats, direct booking feeds, and staff performance monitoring in a polished dashboard.
                  </p>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    Manage My Property
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-6 right-8 text-[100px] font-bold text-white/[0.02] pointer-events-none italic">T2</div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
              </div>
            </Link>
          </motion.div>

        </div>

        {/* Feature Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] backdrop-blur-sm"
        >
          {[
            { icon: Zap, label: "Infinite Scaling", sub: "Proprietary n8n core" },
            { icon: Globe, label: "Global Sync", sub: "100ms OTA relay" },
            { icon: Lock, label: "Secure Engine", sub: "Multi-tenant isolation" },
            { icon: LineChart, label: "Audit-Ready", sub: "Full financial tracing" },
          ].map((feat, i) => (
            <div key={feat.label} className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <feat.icon size={16} className="text-zinc-500" />
                <span className="text-[12px] font-bold text-white tracking-tight">{feat.label}</span>
              </div>
              <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{feat.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <footer className="mt-24 text-center">
          <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
            Developed by Ishitham Projects &bull; Engine 2026 &bull; Secure Protocol
          </p>
        </footer>

      </main>
    </div>
  );
}
