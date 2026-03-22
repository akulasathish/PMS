"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  ShieldEllipsis
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay for premium feel
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (username === 'pmsadmin' && password === '8686113435') {
      // Set a simple cookie (in a real app, this would be a secure JWT from a server)
      document.cookie = "admin_session=pms_secure_entry_2026; path=/; max-age=86400; SameSite=Strict";
      router.push('/admin');
    } else {
      setError('Invalid administrative credentials. Access denied.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Background Animated Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -top-[10%] -right-[10%] w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.1)]"
          >
            <ShieldCheck size={40} />
          </motion.div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Fleet Command</h1>
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-[0.2em]">Tier 1 Administrative Access</p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/[0.06] rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Administrator ID</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="pmsadmin"
                  className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 transition-all shadow-[0_10px_20px_rgba(79,70,229,0.2)] hover:shadow-[0_10px_30px_rgba(79,70,229,0.4)] group"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Authorize Entry
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
            <ShieldEllipsis size={14} />
            E2EE Active
          </div>
          <div className="w-1 h-1 bg-zinc-800 rounded-full" />
          <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
            Engine 2026 Protocol
          </div>
        </div>

      </motion.div>

      {/* Subtle Bottom Accent */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
    </div>
  );
}
