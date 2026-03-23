"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function FrontDeskLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // Role check - ensure this user is 'front-desk' or 'staff'
    const role = data.user?.user_metadata?.role;
    if (role !== 'front-desk' && role !== 'staff') {
      await supabase.auth.signOut();
      setError('Access denied. You do not have front-desk permissions.');
      setIsLoading(false);
      return;
    }

    router.push('/front-desk');
    router.refresh();
  };

  return (
    <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-6 z-50 font-sans selection:bg-azure-500/30 overflow-hidden">
      
      {/* Background Decor - Azure/Blue Accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[15%] w-[300px] h-[300px] bg-azure-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[15%] w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-[360px] relative z-10 flex flex-col items-center"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-azure-500/10 border border-azure-500/20 flex items-center justify-center text-azure-400 mb-3 shadow-lg shadow-azure-500/5">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Front Desk</h1>
          <p className="text-zinc-600 text-[9px] uppercase tracking-[0.3em] mt-1 font-bold">Secure Verification</p>
        </div>

        {/* Login Form - Strict Fixed Width */}
        <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-7 shadow-2xl shadow-black/80">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Username Field */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-azure-400 transition-colors">
                  <User size={14} />
                </div>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@pms.com"
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-azure-500/40 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-azure-400 transition-colors">
                  <Lock size={14} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-10 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-azure-500/40 transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-azure-400 p-1"
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

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-azure-600 hover:bg-azure-500 disabled:bg-azure-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-azure-500/10 mt-1"
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

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center">
          <div className="flex items-center gap-2 text-[8px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
            <ShieldCheck size={10} />
            Front-Desk Node Secured
          </div>
        </div>
      </motion.div>
    </div>
  );
}
