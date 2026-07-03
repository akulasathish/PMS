"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'profile_missing') {
      setError('Your user profile could not be found. Please contact support.');
    } else if (err) {
      setError(err);
    }
  }, [searchParams]);

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

    // Successfully authenticated, route to dashboard
    const redirectTo = searchParams.get('redirect_to') || '/dashboard';

    router.refresh(); // Crucial for middleware to see the new session
    router.push(redirectTo);
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
        className="w-[360px] relative z-10 flex flex-col items-center"
      >
        {/* Compact Logo Area */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-white/10 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,255,255,0.05)] overflow-hidden">
            <img src="/logo.png" alt="StaySync Logo" className="w-full h-full object-cover scale-[1.3]" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Owner Portal</h1>
          <p className="text-zinc-600 text-[9px] uppercase tracking-[0.2em] mt-1 font-bold">Secure Verification</p>
        </div>

        {/* Login Form - Unified 360px format */}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-emerald-400 p-1"
                >
                  {showEmail ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Access Key Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Access Key</label>
                <button type="button" className="text-[9px] font-bold text-emerald-500/70 hover:text-emerald-400">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-emerald-400 p-1"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Error Message stabilizer */}
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
            E2EE SECURED
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function OwnerLogin() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-6 z-50">
        <Loader2 size={32} className="text-emerald-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
