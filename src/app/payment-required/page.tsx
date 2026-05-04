"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Building2, 
  Mail, 
  Lock, 
  CreditCard, 
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { selfServiceOnboarding } from '@/app/actions/onboarding';

export default function RegistrationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') || 'starter';
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('plan', plan);

    const result = await selfServiceOnboarding(formData);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/login');
      }, 3000);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Welcome to StaySync!</h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
            Your property instance has been provisioned and your account is ready. Redirecting you to the login portal...
          </p>
          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 animate-[progress_3s_ease-in-out]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 selection:bg-indigo-500/30">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-50">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-20 min-h-screen flex flex-col items-center justify-center">
        
        <Link href="/" className="absolute top-10 left-6 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back to Plans</span>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
          
          {/* Left Side: Summary */}
          <div className="hidden md:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6">
              <ShieldCheck size={12} className="text-indigo-500" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Secure Checkout</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-6">Complete Your <br />Registration</h1>
            <p className="text-zinc-500 leading-relaxed mb-10 max-w-sm">
              You&apos;ve selected the <span className="text-indigo-400 font-bold capitalize">{plan}</span> plan. 
              Fill in your property details to instantly launch your dedicated dashboard.
            </p>

            <div className="space-y-6">
              {[
                { icon: Zap, text: "Instant Provisioning" },
                { icon: Lock, text: "Enterprise-grade Isolation" },
                { icon: CreditCard, text: "Secure Payment Processing" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-400">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-zinc-400">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/[0.06] rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 w-full max-w-md mx-auto">
            <div className="mb-8 text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-2">Property Details</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Plan: {plan}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Hotel Name</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input 
                    name="propertyName"
                    required
                    placeholder="e.g. Grand Stay Palace"
                    className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Owner Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input 
                    name="email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input 
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input 
                      name="confirmPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/[0.06] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Complete Registration & Pay
                  </>
                )}
              </button>

              <p className="text-[10px] text-zinc-600 text-center mt-6 leading-relaxed px-4 uppercase font-bold tracking-widest">
                By clicking pay, you agree to the StaySync terms of service.
              </p>

            </form>
          </div>

        </div>

      </main>
    </div>
  );
}
