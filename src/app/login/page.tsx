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
  Plus,
  Building,
  Hotel,
  Layers,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

interface UserProperty {
  id: string;
  name: string;
  property_category?: 'PG' | 'Hotel' | 'Hybrid';
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Mode Selection Modal States
  const [showModeModal, setShowModeModal] = useState(false);
  const [userProperties, setUserProperties] = useState<UserProperty[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message || 'Authentication failed');
      setIsLoading(false);
      return;
    }

    const userId = authData.user.id;
    setSelectedUserId(userId);

    // 1. Fetch user accessible properties via property_access
    const { data: accessData } = await supabase
      .from('property_access')
      .select(`
        property_id,
        properties ( id, name, property_category )
      `)
      .eq('user_id', userId);

    let fetchedProps: UserProperty[] = (accessData || [])
      .map((item: any) => item.properties)
      .filter(Boolean);

    // 2. Fallback: Check user profile property_id
    if (fetchedProps.length === 0) {
      const { data: prof } = await supabase.from('profiles').select('property_id').eq('id', userId).maybeSingle();
      if (prof?.property_id) {
        const { data: pData } = await supabase.from('properties').select('id, name, property_category').eq('id', prof.property_id).maybeSingle();
        if (pData) fetchedProps.push(pData);
      }
    }

    // 3. Fallback: Check properties where owner_user_id = userId
    const { data: ownerProps } = await supabase.from('properties').select('id, name, property_category').eq('owner_user_id', userId);
    if (ownerProps && ownerProps.length > 0) {
      for (const op of ownerProps) {
        if (!fetchedProps.some(p => p.id === op.id)) {
          fetchedProps.push(op);
        }
      }
    }

    // 4. Fallback: Fetch all properties if user has access or profile
    if (fetchedProps.length === 0) {
      const { data: allProps } = await supabase.from('properties').select('id, name, property_category');
      if (allProps && allProps.length > 0) {
        fetchedProps = allProps;
      }
    }

    setUserProperties(fetchedProps);
    setIsLoading(false);
    setShowModeModal(true); // ALWAYS SHOW THE MODES GATEWAY PAGE ON SIGN IN!
  };

  const selectPropertyAndProceed = async (prop: UserProperty) => {
    setIsLoading(true);
    localStorage.setItem('pms_active_property', prop.id);

    if (selectedUserId) {
      await supabase
        .from('profiles')
        .update({ property_id: prop.id })
        .eq('id', selectedUserId);
    }

    router.refresh();
    if (prop.property_category === 'PG') {
      router.push('/dashboard/front-office');
    } else {
      router.push('/dashboard');
    }
  };

  const pgProps = userProperties.filter(p => p.property_category === 'PG');
  const hotelPgProps = userProperties.filter(p => p.property_category !== 'PG');

  return (
    <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-6 z-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[15%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {!showModeModal ? (
          /* LOGIN FORM CARD */
          <motion.div 
            key="login-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="w-[360px] relative z-10 flex flex-col items-center"
          >
            {/* Logo Area */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-transparent border border-white/10 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,255,255,0.05)] overflow-hidden">
                <img src="/logo.png" alt="StaySync Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Owner Portal</h1>
              <p className="text-zinc-600 text-[9px] uppercase tracking-[0.2em] mt-1 font-bold">StaySync Verification</p>
            </div>

            {/* Login Form */}
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
                      placeholder="you@example.com"
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

                {/* Password Field */}
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

                {/* Error Banner */}
                <div className="min-h-[16px] flex items-center px-1">
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-rose-400 text-[10px]">
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="truncate">{error}</span>
                    </motion.div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <Loader2 size={15} className="animate-spin text-black" />
                  ) : (
                    <>
                      <span>Log In to Dashboard</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-white/[0.05] text-center">
                <p className="text-[11px] text-zinc-500">
                  New property owner?{' '}
                  <a href="/signup" className="text-emerald-400 font-bold hover:underline">
                    Create Account
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* POST-LOGIN MODE & PROPERTY SELECTION MODAL */
          <motion.div
            key="mode-selector-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-20 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Select Operational Mode
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2">
                  Choose Property Mode
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Select a registered property mode or add another property to your account.
                </p>
              </div>
              <button
                onClick={() => {
                  router.refresh();
                  router.push('/dashboard/property-setup');
                }}
                className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              >
                <Plus size={14} />
                <span>Register New Property</span>
              </button>
            </div>

            {/* 2 MODE SECTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 🏢 1. PG MODE */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/30 transition-all group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                    <Building size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white">🏢 PG Mode</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Monthly Residents, Bed Sharing Matrix & Tenant Ledgers.
                  </p>
                </div>

                {pgProps.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {pgProps.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectPropertyAndProceed(p)}
                        className="w-full text-left bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 p-2.5 rounded-xl transition-all flex items-center justify-between group/btn"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Continue with PG</span>
                          <span className="text-xs font-bold text-white truncate block">{p.name}</span>
                        </div>
                        <ChevronRight size={14} className="text-amber-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      router.refresh();
                      router.push('/dashboard/property-setup?mode=PG');
                    }}
                    className="w-full text-center bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-amber-400 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Register PG Mode</span>
                  </button>
                )}
              </div>

              {/* 🏨🏢 2. HOTEL/PG MODE */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition-all group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                    <Layers size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white">🏨🏢 Hotel/PG Mode</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Combined Hotel Daily & Dedicated PG Resident Section.
                  </p>
                </div>

                {hotelPgProps.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {hotelPgProps.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectPropertyAndProceed(p)}
                        className="w-full text-left bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 p-2.5 rounded-xl transition-all flex items-center justify-between group/btn"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Continue with Hotel/PG</span>
                          <span className="text-xs font-bold text-white truncate block">{p.name}</span>
                        </div>
                        <ChevronRight size={14} className="text-indigo-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      router.refresh();
                      router.push('/dashboard/property-setup?mode=Hotel/PG');
                    }}
                    className="w-full text-center bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 text-indigo-400 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Register Hotel/PG Mode</span>
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-[#060608] items-center justify-center"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
