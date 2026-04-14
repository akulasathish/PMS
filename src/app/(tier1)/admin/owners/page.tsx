"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, UserPlus, ShieldCheck, Mail, 
  X, Loader2, ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { provisionOwner, getOwnersList, getAdminProperties } from '@/app/actions/owner';

interface Property {
  id: string;
  name: string;
}

interface OwnerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  property_access: {
    property_id: string;
    properties: {
      name: string;
    } | null;
  }[] | null;
}

export default function AdminOwners() {
  const [owners, setOwners] = useState<OwnerProfile[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{email: string, password: string} | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      // Fetch owners
      const ownersList = await getOwnersList();
      setOwners(ownersList);

      // Fetch properties for multi-select via server action
      const props = await getAdminProperties();
      if (props) setProperties(props);
      
      setIsLoading(false);
    }
    init();
  }, [supabase]);

  const handleProvision = async (formData: FormData) => {
    setIsProvisioning(true);
    setError('');
    
    const res = await provisionOwner(formData);
    
    if (res.error) {
      setError(res.error);
    } else {
      setCredentials({
        email: formData.get('email') as string,
        password: res.tempPassword!
      });
      // Refresh list
      const ownersList = await getOwnersList();
      setOwners(ownersList);
    }
    setIsProvisioning(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 p-8 font-sans selection:bg-indigo-500/30">
      
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-white/5 rounded-lg border border-white/5 transition-colors text-zinc-500 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Owner Management</h1>
            <p className="text-zinc-500 text-sm mt-1">Provision and assign property executives</p>
          </div>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-[0.98]"
        >
          <UserPlus size={18} />
          Provision New Owner
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="pb-4 font-bold">Executive</th>
                <th className="pb-4 font-bold">Email</th>
                <th className="pb-4 font-bold">Assigned Properties</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></td></tr>
              ) : owners.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-zinc-600">No executives provisioned yet.</td></tr>
              ) : owners.map((owner, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={owner.id} 
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                        {owner.full_name?.substring(0, 2)}
                      </div>
                      <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{owner.full_name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-zinc-400 font-mono text-xs">{owner.email}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {owner.property_access?.map((pa) => (
                        <span key={pa.property_id} className="px-2 py-0.5 bg-zinc-800 border border-white/5 rounded text-[10px] text-zinc-500">
                          {pa.properties?.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Authorized
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button className="text-zinc-600 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
                      Edit Access
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROVISIONING MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Provision Executive</h2>
              <button onClick={() => { setShowModal(false); setCredentials(null); setError(''); }} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {credentials ? (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <ShieldCheck size={32} className="text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-emerald-400 mb-1">Executive Authorized</h3>
                    <p className="text-xs text-emerald-500/80 leading-relaxed">Account created and linked. n8n automation has been triggered to send the welcome email.</p>
                  </div>
                  
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4 space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Owner Email</label>
                      <p className="text-sm text-white font-mono mt-1">{credentials.email}</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Temporary Security Key</label>
                      <div className="flex items-center justify-between bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 mt-1">
                        <p className="text-sm font-bold text-emerald-400 font-mono tracking-widest">{credentials.password}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2 italic">User will be prompted for mandatory key rotation upon entry.</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setShowModal(false); setCredentials(null); }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg"
                  >
                    Close & Return to Fleet
                  </button>
                </div>
              ) : (
                <form action={handleProvision} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                      <input 
                        name="fullName"
                        type="text" 
                        required
                        placeholder="John Executive"
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Executive Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                      <input 
                        name="email"
                        type="email" 
                        required
                        placeholder="owner@hotelgroup.com"
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1 text-indigo-400">Assign Properties (Multi-select)</label>
                    <div className="bg-black/50 border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                      {properties.map(prop => (
                        <label key={prop.id} className="flex items-center gap-3 group cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="propertyIds" 
                            value={prop.id}
                            className="w-4 h-4 rounded border-white/10 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors"
                          />
                          <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{prop.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[9px] text-zinc-600 italic mt-1">Hold Shift/Cmd for manual selection if needed. Access is granted instantly.</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[10px] font-bold flex items-center gap-2">
                      <ShieldAlert size={14} />
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isProvisioning}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                  >
                    {isProvisioning ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        Authorize Provisioning
                      </>
                    )}
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
