"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  LineChart,
  Lock,
  Globe,
  Cloud,
  Cpu,
  Code2,
  Database,
  Activity,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Floating Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#08080a]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="StaySync Logo" className="w-[42px] h-[42px] object-contain rounded-lg shadow-lg shadow-indigo-500/10" />
            <span className="text-white font-bold text-xl tracking-tight">StaySync</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#platform" className="hover:text-white transition-colors">Platform</a>
            <a href="#about" className="hover:text-white transition-colors">About Us</a>
            <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-zinc-300 hover:text-white transition-colors hidden sm:block">
              Log In
            </Link>
            <Link href="/signup" className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25">
              Start Free Setup
            </Link>
          </div>
        </div>
      </nav>

      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] animation-delay-2000 animate-pulse" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-40 pb-10">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">100% Free Forever &bull; Enterprise-Grade PMS</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-8 leading-[1.1]"
          >
            The One & Only Completely Free <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
              Property Management System in India
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-zinc-400 leading-relaxed mb-12"
          >
            StaySync is India's premier, fully-featured hospitality operations terminal. Experience automated billing, compliance, live tape charts, and housekeeping management. No credit cards, no subscription contracts, and no trial limits.
          </motion.p>
        </div>

        {/* Action Grid (Benefits) */}
        <div id="benefits" className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-32">
          
          {/* Benefit 1 Box */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative h-full bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[2.5rem] p-10 hover:border-indigo-500/30 transition-all duration-500 hover:shadow-[0_0_50px_rgba(99,102,241,0.1)] overflow-hidden">
              <div className="relative z-10 pt-12">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Enhanced Security</h3>
                <p className="text-zinc-500 leading-relaxed mb-10 text-sm">
                  Protect your data with industry-leading encryption and robust access controls.
                </p>
              </div>
              <div className="absolute top-6 right-8 text-[100px] font-bold text-white/[0.02] pointer-events-none italic">S1</div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
            </div>
          </motion.div>

          {/* Benefit 2 Box */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative h-full bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[2.5rem] p-10 hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden">
              <div className="relative z-10 pt-12">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 transition-transform">
                  <Building2 size={28} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Seamless Operations</h3>
                <p className="text-zinc-500 leading-relaxed mb-10 text-sm">
                  Automate tasks, streamline workflows, and manage all properties from a single interface.
                </p>
              </div>
              <div className="absolute top-6 right-8 text-[100px] font-bold text-white/[0.02] pointer-events-none italic">O2</div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
            </div>
          </motion.div>
        </div>

        {/* Feature Bar (Platform) */}
        <div id="platform" className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">Platform Capabilities</h2>
            <p className="text-zinc-500">Discover what makes StaySync the leader in property management.</p>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] backdrop-blur-sm"
          >
            {[
              { icon: Zap, label: "Infinite Scaling", sub: "Proprietary n8n core" },
              { icon: Globe, label: "Global Sync", sub: "100ms OTA relay" },
              { icon: Lock, label: "Secure Engine", sub: "Multi-tenant isolation" },
              { icon: LineChart, label: "Audit-Ready", sub: "Full financial tracing" },
              { icon: Cloud, label: "Cloud Native", sub: "Anywhere access" },
              { icon: Cpu, label: "AI Powered", sub: "Smart automation" },
              { icon: Code2, label: "API First", sub: "Easy integrations" },
              { icon: Database, label: "Data Rich", sub: "Actionable insights" },
            ].map((feat, idx) => (
              <motion.div 
                key={feat.label} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="text-center md:text-left p-4 rounded-xl hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <feat.icon size={16} className="text-zinc-500" />
                  <span className="text-[12px] font-bold text-white tracking-tight">{feat.label}</span>
                </div>
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{feat.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <section id="about" className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">About StaySync</h2>
            <p className="text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              StaySync is a modern hospitality technology company built to simplify property operations. We replace complex, outdated hotel software with a single, unified B2B SaaS platform that operates seamlessly across devices. We believe in providing hotel owners, homestay hosts, and resort operators with clean, fast, and secure tools to run their businesses without administrative hurdles.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
              <Zap size={48} className="text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">To remove operational complexity, protect property inventory, and enhance guest experiences globally.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Globe size={48} className="text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Our Vision</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">A completely connected, automated, and serverless ecosystem for modern hospitality operators.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}>
              <Code2 size={48} className="text-violet-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Our Technology</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">Powered by Next.js, Supabase RLS isolation, n8n webhook triggers, and automated scaling on AWS ECS Fargate.</p>
            </motion.div>
          </div>
        </section>

        {/* Final CTA / Contact Section */}
        <section id="contact" className="mb-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent rounded-[3rem] pointer-events-none" />
          <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-[3rem] p-12 md:p-20 text-center overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                Empower Your Property Operations Today
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Join modern hoteliers and co-living hosts who have automated check-ins, digitised compliance, and simplified billing with StaySync.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link 
                  href="/signup" 
                  className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
                >
                  Get Started Instantly
                </Link>
                <a 
                  href="mailto:support@staysync.online" 
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10"
                >
                  Contact Support Team
                </a>
              </div>

              {/* Direct Contacts Info */}
              <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 px-6 py-3 rounded-full bg-white/[0.02] border border-white/[0.05] text-xs font-semibold text-zinc-500">
                <span>Sales: <a href="mailto:sales@staysync.online" className="text-indigo-400 hover:underline">sales@staysync.online</a></span>
                <span className="hidden sm:block text-white/10">|</span>
                <span>Support: <a href="mailto:support@staysync.online" className="text-emerald-400 hover:underline">support@staysync.online</a></span>
                <span className="hidden sm:block text-white/10">|</span>
                <span>Phone: <a href="tel:+918686113435" className="text-white hover:underline">+91 8686113435</a></span>
              </div>

            </div>
          </div>
        </section>

        {/* Expanded Footer */}
        <footer className="border-t border-white/[0.05] pt-20 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <img src="/logo.png" alt="StaySync Logo" className="w-[31px] h-[31px] object-contain rounded-md" />
                <span className="text-white font-bold text-lg tracking-tight">StaySync</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Unified Property Intelligence for the modern enterprise. Built for scale, security, and speed.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li><Link href="/product/front-office" className="hover:text-indigo-400 transition-colors">Front Office</Link></li>
                <li><Link href="/product/housekeeping" className="hover:text-indigo-400 transition-colors">Housekeeping</Link></li>
                <li><Link href="/product/folio" className="hover:text-indigo-400 transition-colors">Folio Engine</Link></li>
                <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
              </ul>
            </div>
 
            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li><a href="#about" className="hover:text-indigo-400 transition-colors">About Us</a></li>
                <li><a href="mailto:sales@staysync.online" className="hover:text-indigo-400 transition-colors">Contact Sales</a></li>
                <li><Link href="/legal" className="hover:text-indigo-400 transition-colors">Legal & Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
              &copy; 2026 StaySync &bull; Unified Property Intelligence
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
}