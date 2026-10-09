"use client";

import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerUserWithoutVerification } from '@/app/actions/auth'; 
import Link from 'next/link';
import { Loader2, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setErrorState] = useState('');
  const setError = (errVal: any) => {
    if (!errVal) {
      setErrorState('');
      return;
    }

    let msg = '';
    if (typeof errVal === 'string') {
      msg = errVal;
    } else if (errVal?.message && typeof errVal.message === 'string') {
      msg = errVal.message;
    } else if (errVal?.error && typeof errVal.error === 'string') {
      msg = errVal.error;
    } else {
      try {
        msg = JSON.stringify(errVal);
      } catch {
        msg = 'Registration error occurred.';
      }
    }

    if (!msg || msg === '{}' || msg === '[]' || msg === '[object Object]') {
      msg = 'Unable to create account. An account with this email may already exist, or registration failed.';
    } else if (msg.includes('fetch failed') || msg.includes('EHOSTUNREACH') || msg.includes('ECONNREFUSED')) {
      msg = 'Authentication server is unreachable. Please check your network connection or try again later.';
    }

    setErrorState(msg);
  };
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan'); 

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Create & auto-confirm account via Admin API (bypasses email verification)
      const result = await registerUserWithoutVerification(cleanEmail, password);

      if (!result.success) {
        setError(result.error || 'Failed to create account.');
        setIsLoading(false);
        return;
      }

      // Sign in immediately on the client side
      setMessage('Account created! Signing you in...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError('Account created but sign-in failed: ' + signInError.message + '. Please go to Login.');
        setIsLoading(false);
        return;
      }

      // Redirect to property setup
      router.refresh();
      router.push('/dashboard/property-setup');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen bg-[#060608] items-center justify-center p-6 z-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[15%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" />
      </div>

      <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-[380px] relative z-10 flex flex-col items-center"
          >
            {/* Logo Area */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-transparent border border-white/10 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,255,255,0.05)] overflow-hidden">
                <img src="/logo.png" alt="StaySync Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Create Your StaySync Account</h1>
              <p className="text-zinc-500 text-xs mt-2 font-medium">Configure your premium operational workspace</p>
            </div>

            <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-7 shadow-2xl shadow-black relative overflow-hidden">

              <form onSubmit={handleSignUp} className="space-y-4">
                
                <div className="space-y-1">
                  <label htmlFor="email" className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors">
                      <Mail size={14} />
                    </div>
                    <input 
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/40 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors">
                      <Lock size={14} />
                    </div>
                    <input 
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/40 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-400 transition-colors">
                      <Lock size={14} />
                    </div>
                    <input 
                      id="confirmPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/40 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                {message && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                    <Sparkles size={14} />
                    {message}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10 mt-3"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-zinc-500 text-xs mt-6">
                Already have an account? {' '}
                <Link href="/login" className="text-emerald-400 hover:underline">Log In</Link>
              </p>
            </div>
          </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-[#060608] items-center justify-center p-6 z-50">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
