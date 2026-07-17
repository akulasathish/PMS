"use client";

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Calendar, Search, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function FrontOfficePage() {
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#08080a]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src="/logo.png" alt="StaySync Logo" className="w-[42px] h-[42px] object-contain rounded-lg shadow-lg shadow-indigo-500/10 hover:scale-105 transition-transform" />
            </Link>
            <span className="text-white font-bold text-xl tracking-tight">StaySync Product Suite</span>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <LayoutDashboard size={14} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Operational Core</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">Front Office Terminal</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto">
            Empower your receptionist and operational staff with a unified control deck designed for high-speed front desk administration.
          </p>
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-indigo-500/20 transition-all">
            <Calendar className="text-indigo-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Interactive Tape Chart</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              A fluid timeline calendar that visualizes room allocation, occupancy states, and guest check-ins. Drag and drop bookings, move guests instantly, and manage inventory blocking with strict validation check routines.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-indigo-500/20 transition-all">
            <Search className="text-indigo-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Universal Search & Arrivals</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Find reservations instantly by guest name, room, or ID. Manage daily check-ins, walk-ins, and checkout lists through a quick-action drawer that handles guest details, folio upgrades, and notes in one place.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-indigo-500/20 transition-all md:col-span-2">
            <ShieldCheck className="text-indigo-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Compliance & Guardrail Check-In</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Never miss local regulatory checks. StaySync enforces a strict compliance checklist requiring ID verification, digital signature, and secure payment processing before marking a guest as Checked In.
            </p>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem] p-10 text-center">
          <h4 className="text-2xl font-bold text-white mb-4">Want to see the Front Office in action?</h4>
          <p className="text-zinc-500 text-sm mb-6 max-w-xl mx-auto">
            Sign up for our 3-month free trial to experience the live tape chart, check-in checklists, and real-time room assignments.
          </p>
          <Link href="/signup" className="inline-block px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all">
            Start Your Free Trial
          </Link>
        </div>

      </main>
    </div>
  );
}
