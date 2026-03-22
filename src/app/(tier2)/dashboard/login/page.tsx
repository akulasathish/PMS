"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OwnerLogin() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Fast, responsive delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Valid credentials
    if (email === 'owner@pms.com' && phone === '8686113435' && password === 'password123') {
      document.cookie = "owner_session=owner_secure_entry_2026; path=/; max-age=86400; SameSite=Strict";
      router.push('/dashboard');
    } else {
      setError('Invalid owner credentials. Access denied.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-6 z-50 font-sans selection:bg-emerald-500/30 overflow-hidden">

      {/* Background Decor - Minimalist */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[15%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[340px] relative z-10 flex flex-col items-center"
      >
        {/* Compact Logo Area */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Building2 size={20} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Owner Portal</h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">Secure Verification</p>
        </div>

        {/* Login Form - Micro Portal Format */}
        <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-7 shadow-2xl shadow-black">
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors">
                  <Mail size={14} />
                </div>
                <input
                  type={showEmail ? "text" : "email"}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@pms.com"
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-10 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowEmail(!showEmail)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-emerald-400 p-1 transition-colors"
                >
                  {showEmail ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Phone Field */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Phone Number</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors">
                  <Phone size={14} />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
              </div>
            </div>

            {/* Access Key Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Access Key</label>
                <button type="button" className="text-[9px] font-bold text-emerald-500/70 hover:text-emerald-400 transition-colors focus:outline-none">
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors">
                  <Lock size={14} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-10 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-emerald-400 p-1 transition-colors"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Error Message Stabilizer */}
            <div className="min-h-[16px] flex items-center px-1">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-rose-500 text-[10px] font-semibold flex items-center gap-1.5"
                  >
                    <AlertCircle size={10} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 mt-1"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  Authorize & Enter
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <div className="mt-8 flex flex-col items-center">
          <div className="flex items-center gap-2 text-[8px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
            <ShieldCheck size={10} />
            E2EE Secured
          </div>
        </div>
      </motion.div>
    </div>
  );
}
