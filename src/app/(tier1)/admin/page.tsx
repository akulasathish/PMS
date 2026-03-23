"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Users, Activity, Plus,
  ShieldCheck, Zap, MoreVertical, Bell,
  ShieldAlert, ArrowUpRight, LogOut, Loader2,
  X 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerProperty } from '@/app/actions/property';


// --- PREMIUM UI COMPONENTS ---
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-500 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, trend, color = "indigo" }: { title: string, value: string, icon: React.ElementType, trend: string, color?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-500 group shadow-[0_0_15px_rgba(99,102,241,0.05)]"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
        <Icon size={18} />
      </div>
      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{trend}</span>
    </div>
    <div>
      <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.15em] mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
    </div>
    {/* Subtle gradient accent */}
    <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-10 bg-indigo-500 group-hover:opacity-20 transition-opacity duration-700" />
  </motion.div>
);

interface Property {
  id: string;
  name: string;
  tier: string;
  created_at?: string;
}

export default function Tier1Admin() {
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    async function fetchProperties() {
      setIsLoading(true);
      const { data } = await supabase
        .from('properties')
        .select('*')
        .order('name', { ascending: true });
      
      if (data) setProperties(data);
      setIsLoading(false);
    }
    fetchProperties();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleRegister = async (formData: FormData) => {
    setRegisterLoading(true);
    setRegisterError('');
    setGeneratedCredentials(null);

    const email = formData.get('ownerEmail') as string;

    const result = await registerProperty(formData);
    
    if (result?.error) {
      setRegisterError(result.error);
    } else if (result?.dummyPassword) {
      setGeneratedCredentials({
        email: email,
        password: result.dummyPassword
      });
      // Refresh the property list locally to show it immediately without full reload
      const { data } = await supabase.from('properties').select('*').order('name', { ascending: true });
      if (data) setProperties(data);
    }
    setRegisterLoading(false);
  };

  // Aggregates
  const totalProperties = properties.length;
  // In a real app, revenue would be summed from all property bookings. 
  // For demo, we'll use a placeholder or derived value.
  const totalRevenue = properties.length * 15000; 

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 p-8 font-sans selection:bg-indigo-500/30">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Command</h1>
          <p className="text-zinc-500 text-sm mt-1">SaaS Provider Engine • v2.0.26</p>
        </motion.div>
        
        <div className="flex gap-3">
          {/* NOTIFICATION BELL */}
          <button 
            onClick={() => setShowBroadcast(true)}
            className="p-2 relative hover:bg-zinc-800 rounded-lg border border-white/5 transition-colors text-zinc-400 hover:text-indigo-400"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#09090b]"></span>
          </button>

          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-rose-500/10 rounded-lg border border-white/5 transition-colors text-zinc-500 hover:text-rose-400 group relative"
            title="Terminate Session"
          >
            <LogOut size={20} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 border border-white/10 text-[10px] text-zinc-400 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Terminate Session
            </span>
          </button>
          
          <button 
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            <Plus size={18} />
            Register Property
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: STATS & TABLE */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* BENTO STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Properties" value={totalProperties.toString()} icon={Building2} trend="+0 new" />
            <StatCard title="Total MRR" value={`$${(totalRevenue/1000).toFixed(1)}k`} icon={Zap} trend="+0.0%" />
            <StatCard title="Live Network" value="Active" icon={Users} trend="Online" />
            <StatCard title="System" value="99.9%" icon={ShieldCheck} trend="Stable" />
          </div>

          {/* MAIN PROPERTY TABLE */}
          <GlassCard>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Property Fleet Manager</h2>
              <div className="flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase font-bold tracking-widest">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Live Network Sync
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-widest border-b border-white/5">
                  <th className="pb-4 font-medium">Property</th>
                  <th className="pb-4 font-medium">Tier</th>
                  <th className="pb-4 font-medium">Occupancy</th>
                  <th className="pb-4 font-medium">MRR</th>
                  <th className="pb-4 font-medium text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></td></tr>
                ) : properties.map((prop: Property, i: number) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    key={prop.id} 
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="py-4 font-semibold text-zinc-200 group-hover:text-white transition-colors">{prop.name}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border tracking-wider ${
                        prop.tier === 'Enterprise' 
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.1)]' 
                          : 'bg-zinc-800/50 border-white/10 text-zinc-500'
                      }`}>
                        {prop.tier}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `75%` }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                            className={`h-full rounded-full bg-emerald-500`} 
                          />
                        </div>
                        <span className="text-xs font-bold text-zinc-400">75%</span>
                      </div>
                    </td>
                    <td className="py-4 text-zinc-300 font-bold">${(totalRevenue/totalProperties/1000).toFixed(1)}k</td>
                    <td className="py-4 text-right">
                      <button className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-white/5 rounded">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN: SYSTEM SENTINEL & ATTENTION */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* ATTENTION REQUIRED CARD */}
          <GlassCard className="border-rose-500/20 bg-rose-500/5">
            <h2 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2 mb-4">
              <ShieldAlert size={14} />
              Attention Required
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center group cursor-pointer">
                <span className="text-xs text-zinc-300 group-hover:text-white">Ocean View: Payment Failed</span>
                <ArrowUpRight size={12} className="text-zinc-600" />
              </div>
              <div className="flex justify-between items-center group cursor-pointer">
                <span className="text-xs text-zinc-300 group-hover:text-white">Grand Hyatt: n8n Timeout</span>
                <ArrowUpRight size={12} className="text-zinc-600" />
              </div>
            </div>
          </GlassCard>

          {/* SYSTEM SENTINEL */}
          <GlassCard>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Activity size={14} className="text-indigo-500" />
              System Sentinel
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>n8n Engine</span>
                  <span className="text-emerald-500 text-[10px] font-bold uppercase">Active</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[95%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Supabase DB</span>
                  <span className="text-emerald-500 text-[10px] font-bold uppercase">Healthy</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[100%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>OTA Gateway</span>
                  <span className="text-amber-500 text-[10px] font-bold uppercase">Listening</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[40%]" />
                </div>
              </div>
            </div>

            <div className="mt-10 p-4 rounded-lg bg-indigo-600/10 border border-indigo-500/20">
              <p className="text-xs text-indigo-300 font-medium">Support Mode</p>
              <p className="text-[10px] text-zinc-500 mt-1">Enter a property dashboard to assist an owner.</p>
              <button className="w-full mt-3 py-2 text-[10px] bg-indigo-600 text-white rounded font-bold uppercase hover:bg-indigo-500 transition-colors">
                Launch Impersonation
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Register New Property</h2>
              <button onClick={() => { setShowRegisterModal(false); setGeneratedCredentials(null); setRegisterError(''); }} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {generatedCredentials ? (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <ShieldCheck size={32} className="text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-emerald-400 mb-1">Property Live in Fleet</h3>
                    <p className="text-xs text-emerald-500/80">Owner profile generated successfully. Please securely transmit these credentials to the owner.</p>
                  </div>
                  
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4 space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Owner Email</label>
                      <p className="text-sm text-white font-mono mt-1">{generatedCredentials.email}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Temporary Access Key</label>
                      <div className="flex items-center justify-between bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 mt-1">
                        <p className="text-sm font-bold text-emerald-400 font-mono tracking-widest">{generatedCredentials.password}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2 italic">The owner will be forced to change this key upon their first login.</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setShowRegisterModal(false); setGeneratedCredentials(null); }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 text-sm font-bold transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form action={handleRegister} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Property Name</label>
                    <input 
                      name="propertyName"
                      type="text" 
                      required
                      placeholder="e.g. The Grand Hotel"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Owner Email</label>
                    <input 
                      name="ownerEmail"
                      type="email" 
                      required
                      placeholder="owner@hotel.com"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tier Level</label>
                    <select 
                      name="tier"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
                    >
                      <option value="Starter">Starter</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>

                  {registerError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                      <ShieldAlert size={14} />
                      {registerError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={registerLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    {registerLoading ? <Loader2 size={16} className="animate-spin" /> : 'Launch Property into Fleet'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}