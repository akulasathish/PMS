"use client";

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Trash2, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function HousekeepingPage() {
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#08080a]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src="/logo.png" alt="StaySync Logo" className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-indigo-500/10 hover:scale-105 transition-transform" />
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Trash2 size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Maintenance & Housekeeping</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">Housekeeping Master Board</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto">
            Synchronize front desk requests with your cleaning staff in real time. Maintain pristine room quality and fast turnovers.
          </p>
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-emerald-500/20 transition-all">
            <Clock className="text-emerald-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">The Quality Control (QC) Loop</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              StaySync transitions beyond simple "Clean/Dirty" switches. Our platform implements a full 3-step QC workflow: `Dirty` ➡️ `Clean` (set by cleaners) ➡️ `Inspected` (confirmed by supervisor). Only inspected rooms are made available for new guest check-ins.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-emerald-500/20 transition-all">
            <ShieldAlert className="text-emerald-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">X-Ray Guest Context</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Give cleaners visual context. Cleaners can see whether a room is a "Stayover" (guest is staying another night), "Departing Today" (needs deep clean soon), or "Arriving Soon" (high priority clean) to organize their daily schedule efficiently.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-emerald-500/20 transition-all md:col-span-2">
            <CheckCircle2 className="text-emerald-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Mobile Companion Optimization</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Housekeeping operates on a responsive, lightweight view designed for smartphones. Cleaners can start tasks, log completion times, and upload cleaning checklists instantly on the go, which immediately updates the Front Desk terminal.
            </p>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-10 text-center">
          <h4 className="text-2xl font-bold text-white mb-4">Empower your maintenance staff today</h4>
          <p className="text-zinc-500 text-sm mb-6 max-w-xl mx-auto">
            Experience our high-priority scheduling and supervisor inspection workflows. Try StaySync free.
          </p>
          <Link href="/signup" className="inline-block px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all">
            Start Your Free Trial
          </Link>
        </div>

      </main>
    </div>
  );
}
