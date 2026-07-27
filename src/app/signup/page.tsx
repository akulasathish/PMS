"use client";

import React, { useState, useRef, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerUserWithoutVerification, registerUserWithVerification } from '@/app/actions/auth'; 
import Link from 'next/link';
import { Loader2, Mail, Lock, User, AlertCircle, MailOpen, ArrowLeft, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

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
  
  // OTP Verification States
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  
  const [bypassVerification, setBypassVerification] = useState(
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ); // Developer toggle!
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan'); 

  const supabase = createClient();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isVerificationSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVerificationSent, resendTimer]);

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
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const redirectUrl = `${origin}/auth/callback`;

      if (bypassVerification) {
        // DEV BYPASS: Auto-verify instantly via Admin API
        const result = await registerUserWithoutVerification(email, password, plan || 'free_trial');

        if (!result.success) {
          setError(result.error || 'Failed to create account.');
          setIsLoading(false);
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          setError('Account created, but auto-login failed. Try manually.');
          setIsLoading(false);
          return;
        }

        setMessage('Account created! Logging you in...');
        router.refresh();
        setTimeout(() => {
          router.push('/dashboard/property-setup');
        }, 1000);
      } else {
        // PRODUCTION MODE: Standard sign up (sends 6-digit OTP confirmation to email)
        const result = await registerUserWithVerification(email, password, redirectUrl);

        if (!result.success) {
          setError(result.error || 'Failed to trigger signup.');
          setIsLoading(false);
          return;
        }

        setIsVerificationSent(true);
        setResendTimer(60);
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Input Field Handlers
  const handleOtpChange = (val: string, index: number) => {
    if (isNaN(Number(val))) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = val.slice(-1); // Only keep the last digit
    setOtp(newOtp);
    setOtpError('');

    // Auto-focus next input
    if (val !== '' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputsRef.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6).split('');
    if (pastedData.every(char => !isNaN(Number(char)))) {
      const newOtp = [...otp];
      pastedData.forEach((char, idx) => {
        if (idx < 6) newOtp[idx] = char;
      });
      setOtp(newOtp);
      // Focus last filled input
      const targetFocusIdx = Math.min(pastedData.length, 5);
      inputsRef.current[targetFocusIdx]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join('');
    if (token.length < 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      // Verify OTP via standard Supabase Client
      // Setting type to 'signup' exchanges this code and signs in the user locally
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (verifyError) {
        setOtpError(verifyError.message || 'Invalid verification code. Please check and try again.');
        setIsVerifyingOtp(false);
        return;
      }

      if (data?.session) {
        // Success! Logged in, redirect to property setup
        setMessage('Verification successful! Syncing session...');
        router.refresh();
        setTimeout(() => {
          router.push('/dashboard/property-setup');
        }, 1200);
      } else {
        setOtpError('Session could not be established. Please try logging in manually.');
        setIsVerifyingOtp(false);
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed.');
      setIsVerifyingOtp(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setOtpError('');
    setOtp(['', '', '', '', '', '']);
    inputsRef.current[0]?.focus();
    
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const redirectUrl = `${origin}/auth/callback`;
      
      const result = await registerUserWithVerification(email, password, redirectUrl);
      if (result.success) {
        setResendTimer(60);
        setMessage('A fresh verification code has been dispatched to your email.');
        setTimeout(() => setMessage(''), 4000);
      } else {
        setOtpError(result.error || 'Failed to resend code.');
      }
    } catch (err: any) {
      setOtpError('Error resending verification code.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#060608] items-center justify-center p-6 z-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[15%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse" />
      </div>

      <AnimatePresence mode="wait">
        {!isVerificationSent ? (
          <motion.div 
            key="signup-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
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
              
              {/* Dev Mode Banner Indicator */}
              {bypassVerification && (
                <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4 flex items-center justify-between text-[10px] text-amber-400 font-medium z-20 animate-pulse">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={12} />
                    <span>Dev Mode: Bypassing SMTP Verification</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignUp} className={`space-y-4 ${bypassVerification ? 'pt-6' : ''}`}>
                
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
                    <AlertCircle size={14} />
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
        ) : (
          <motion.div 
            key="otp-verification-screen"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-[420px] relative z-10 flex flex-col items-center"
          >
            <div className="w-full bg-zinc-900/80 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] p-8 shadow-2xl shadow-black relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              
              <div className="w-16 h-12 flex items-center justify-center relative mx-auto mb-5">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                <MailOpen size={44} className="text-emerald-400 relative z-10 animate-pulse" />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight text-center">Verify Your Domain Email</h2>
              
              <p className="text-zinc-400 text-xs text-center mt-3 leading-relaxed">
                We've sent a 6-digit confirmation key to <span className="text-white font-semibold underline">{email}</span>.<br />
                Please type it below to authenticate your workspace.
              </p>

              {/* Six Digit OTP Inputs Box */}
              <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
                <div className="flex items-center justify-center gap-2.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputsRef.current[idx] = el; }}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      className="w-12 h-14 bg-black/70 border border-white/[0.08] focus:border-emerald-500/60 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-inner"
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="leading-tight">{otpError}</span>
                  </div>
                )}

                {message && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                    <Sparkles size={14} className="shrink-0" />
                    <span className="leading-tight">{message}</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button 
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      'Verify & Open Workspace'
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-zinc-500 px-1 pt-1">
                    <span>Haven't received it?</span>
                    <button
                      type="button"
                      disabled={resendTimer > 0}
                      onClick={handleResendCode}
                      className={`font-bold transition-all flex items-center gap-1 focus:outline-none ${
                        resendTimer > 0 
                          ? 'text-zinc-600 cursor-not-allowed' 
                          : 'text-emerald-400 hover:text-emerald-300 hover:underline'
                      }`}
                    >
                      <RefreshCw size={12} className={resendTimer === 0 ? "animate-spin-slow" : ""} />
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-center">
                <button 
                  onClick={() => setIsVerificationSent(false)}
                  className="text-zinc-500 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 focus:outline-none"
                >
                  <ArrowLeft size={13} />
                  Change Email Address
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
