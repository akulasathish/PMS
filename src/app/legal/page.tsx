"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Scale, PhoneCall, ArrowLeft } from 'lucide-react';

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'refunds'>('terms');

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#08080a]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src="/logo.png" alt="StaySync Logo" className="w-[42px] h-[42px] object-contain rounded-lg shadow-lg shadow-indigo-500/10 hover:scale-105 transition-transform" />
            </Link>
            <span className="text-white font-bold text-xl tracking-tight">StaySync Legal Portal</span>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">Legal & Privacy Center</h1>
          <p className="text-zinc-500">Read our operating policies, terms of service, and user data privacy practices.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.05] mb-12 gap-8">
          <button 
            onClick={() => setActiveTab('terms')}
            className={`pb-4 text-sm font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'terms' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Scale size={16} />
            Terms of Service
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`pb-4 text-sm font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'privacy' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ShieldCheck size={16} />
            Privacy Policy
          </button>
          <button 
            onClick={() => setActiveTab('refunds')}
            className={`pb-4 text-sm font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'refunds' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileText size={16} />
            Refund Policy
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-8 md:p-12 backdrop-blur-sm">
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                By registering for or using StaySync ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not access or use our services.
              </p>
              
              <h2 className="text-2xl font-bold text-white">2. Description of Service</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                StaySync is a cloud-based multi-tenant Property Management System (PMS) designed to streamline hotel operations, room assignments, guest checking procedures, housekeeping status controls, and folio/invoice generation.
              </p>

              <h2 className="text-2xl font-bold text-white">3. User Workspaces & Data Isolation</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Each registered account holds a dedicated property workspace. StaySync guarantees strict tenant data isolation using advanced PostgreSQL Row-Level Security (RLS). You retain full ownership of the guest data, files, and booking registers uploaded to your workspace.
              </p>

              <h2 className="text-2xl font-bold text-white">4. Acceptable Use Policy</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                You agree not to use StaySync to violate any laws, host illegal guest registers, upload malicious scripts, or attempt to bypass security measures. The service reserves the right to terminate accounts that engage in fraudulent activities.
              </p>

              <h2 className="text-2xl font-bold text-white">5. Account Responsibilities</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                You are responsible for securing your login credentials and maintaining the confidentiality of your workspace parameters. StaySync is not liable for unauthorized access resulting from negligent credential management.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">1. Information We Collect</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                We collect personal registration details (name, business name, and email) when you register a workspace. Additionally, the platform stores guest metadata (names, contact numbers, government-issued IDs, and signatures) which you secure from guests during the check-in process.
              </p>

              <h2 className="text-2xl font-bold text-white">2. How We Secure Data</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Guest identity documents (Aadhar, Passports, etc.) are uploaded directly to secure Supabase storage buckets protected by active security policies. All data transmitted between the client, backend containers, and databases is protected under TLS/SSL encryption protocols.
              </p>

              <h2 className="text-2xl font-bold text-white">3. Sharing of Information</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                StaySync does not sell, rent, or trade your operational data or guest registers to third parties. Data is only processed to execute operations (such as sending guest emails via Resend or trigger routines via n8n automation) as configured in your workspace.
              </p>

              <h2 className="text-2xl font-bold text-white">4. Cookies and Sessions</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                We use secure, HTTP-only session cookies to authenticate users. No tracking cookies are used for marketing purposes.
              </p>
            </div>
          )}

          {activeTab === 'refunds' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">1. Subscription Pricing</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                StaySync offers subscriptions on a monthly, quarterly, semi-annual, or annual cycle. Details of active pricing rates are fully described on the StaySync homepage.
              </p>

              <h2 className="text-2xl font-bold text-white">2. Refund & Cancellation Terms</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Subscriptions can be canceled at any time from your account settings page. Since our platform offers a fully-featured 3-month Free Trial to evaluate compatibility before making payments:
              </p>
              <ul className="list-disc pl-6 text-zinc-400 space-y-2 text-sm">
                <li>Cancellation stops future automatic renewals.</li>
                <li>We do not issue partial refunds for unused portions of active billing cycles (quarterly, semi-annual, or annual).</li>
                <li>If a billing error occurs, please contact our support team within 14 days of the charge for resolution.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Contact Info Widget */}
        <div className="mt-12 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PhoneCall size={24} className="text-indigo-400" />
            <div>
              <h4 className="text-white font-bold text-sm">Need Legal Clarification?</h4>
              <p className="text-zinc-500 text-xs">Reach out to our support and compliance team directly.</p>
            </div>
          </div>
          <div className="flex flex-col text-right text-xs md:text-sm">
            <span className="text-white font-bold">support@staysync.online</span>
            <span className="text-zinc-400">+91 8686113435</span>
          </div>
        </div>
      </main>

    </div>
  );
}
