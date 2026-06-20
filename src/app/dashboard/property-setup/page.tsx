"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Home, MapPin, Building, Flag } from 'lucide-react';
import { createProperty } from '@/app/actions/property'; // Assuming this action exists or will be created

export default function PropertySetupPage() {
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyCountry, setPropertyCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('User not authenticated. Please log in again.');
        router.push('/login');
        return;
      }

      // Call the server action to create the property
      const { success, error: createError, data: newProperty } = await createProperty({
        user_id: user.id,
        name: propertyName,
        address: propertyAddress,
        city: propertyCity,
        country: propertyCountry,
        // Add other necessary fields
      });

      if (!success || createError) {
        setError(createError || 'Failed to create property.');
        return;
      }

      // Redirect to dashboard upon successful property creation
      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during property setup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#060608] items-center justify-center p-6 z-50 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[15%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[400px] relative z-10 flex flex-col items-center"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <Home size={20} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Set Up Your First Property</h1>
          <p className="text-zinc-500 text-[10px] text-center mt-2 font-medium">Let's get your hospitality business registered with StaySync.</p>
        </div>

        <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-7 shadow-2xl shadow-black">
          <form onSubmit={handleCreateProperty} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Property Name</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                  <Building size={14} />
                </div>
                <input 
                  type="text"
                  required
                  placeholder="e.g., Grand Hyatt"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-indigo-500/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Address</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                  <MapPin size={14} />
                </div>
                <input 
                  type="text"
                  required
                  placeholder="e.g., 123 Main St"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-indigo-500/40 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">City</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                    <MapPin size={14} />
                  </div>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., New York"
                    value={propertyCity}
                    onChange={(e) => setPropertyCity(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-indigo-500/40 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Country</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                    <Flag size={14} />
                  </div>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., USA"
                    value={propertyCountry}
                    onChange={(e) => setPropertyCountry(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-indigo-500/40 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10 mt-3"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Create Property & Continue'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
