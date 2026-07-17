"use client";

import React from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Receipt, Percent, FileText, ArrowLeft } from 'lucide-react';

export default function FolioPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <FileSpreadsheet size={14} className="text-violet-400" />
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Financial Ledger</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">Folio & Financial Invoicing</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto">
            Audit-ready folio logging, tax automation, and direct guest invoicing built on strict double-entry ledger security.
          </p>
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-violet-500/20 transition-all">
            <Receipt className="text-violet-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Incidental Charge Posting</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Post charges to guest accounts easily. Log mini-bar items, laundry service, room upgrades, and dining charges directly to the guest's folio ledger. Supports custom line-item descriptions and multiple payment methods.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-violet-500/20 transition-all">
            <Percent className="text-violet-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">GST Slabs & Local Tax Compliance</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              StaySync automates local tax compliance with built-in GST and CGST/SGST/IGST tax slab configurations. The invoicing engine automatically assigns the proper tax rates based on room pricing thresholds and logs SAC/HSN codes.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 hover:border-violet-500/20 transition-all md:col-span-2">
            <FileText className="text-violet-400 mb-6" size={32} />
            <h3 className="text-xl font-bold text-white mb-2">Automated PDF Invoices & Zero-Balance Checkout</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Enforce billing integrity at the front desk. StaySync mathematically blocks checkout if the folio balance is not exactly zero. Upon checkout clearance, the n8n webhook triggers automatic PDF invoice creation and sends it directly to the guest.
            </p>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-[2.5rem] p-10 text-center">
          <h4 className="text-2xl font-bold text-white mb-4">Set up compliant hotel billing today</h4>
          <p className="text-zinc-500 text-sm mb-6 max-w-xl mx-auto">
            Audit-ready incidental logs, automated invoices, and zero-balance enforcement. Try StaySync free.
          </p>
          <Link href="/signup" className="inline-block px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 transition-all">
            Get Started Free
          </Link>
        </div>

      </main>
    </div>
  );
}
