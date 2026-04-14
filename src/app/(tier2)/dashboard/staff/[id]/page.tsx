"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, Save, Trash2, 
  Loader2, ShieldAlert,
  Building2, Code, Settings,
  Activity
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { updateStaffPermissions, revokeStaffAccess } from '@/app/actions/staff';
import { UserProfile } from '@/lib/types';

const FEATURE_MAP = {
  front_office: {
    label: 'Front Office',
    features: [
      { key: 'view_tape_chart', label: 'View Tape Chart' },
      { key: 'create_booking', label: 'Create Walk-In' },
      { key: 'perform_check_in', label: 'Check-In' },
      { key: 'perform_check_out', label: 'Check-Out' },
      { key: 'modify_booking', label: 'Modify Dates' },
      { key: 'upgrade_room', label: 'Room Upgrade' },
      { key: 'refund_folio', label: 'Refund Folio' },
      { key: 'guest_notes', label: 'Guest Notes' },
      { key: 'block_rooms', label: 'Block Rooms' },
      { key: 'view_guest_pii', label: 'Guest Contact Info' }
    ]
  },
  housekeeping: {
    label: 'Housekeeping',
    features: [
      { key: 'view_cleaning_list', label: 'Cleaning List' },
      { key: 'start_finish_cleaning', label: 'Cleaning Timers' },
      { key: 'mark_room_ready', label: 'Mark Ready' },
      { key: 'inspect_room', label: 'Inspect Button' },
      { key: 'post_minibar_charges', label: 'Minibar Posting' },
      { key: 'manage_cleaning_boards', label: 'Ops Management' }
    ]
  },
  inventory: {
    label: 'Inventory',
    features: [
      { key: 'view_inventory', label: 'View Rooms' },
      { key: 'manage_room_types', label: 'Manage Types' },
      { key: 'add_delete_rooms', label: 'Add/Delete Rooms' },
      { key: 'maintenance_log', label: 'Maintenance Log' }
    ]
  },
  finance: {
    label: 'Financials',
    features: [
      { key: 'view_analytics', label: 'Analytics' },
      { key: 'run_night_audit', label: 'Night Audit' },
      { key: 'manage_rates', label: 'Manage Rates' },
      { key: 'view_audit_logs', label: 'Audit Logs' }
    ]
  },
  management: {
    label: 'Management',
    features: [
      { key: 'manage_staff_accounts', label: 'Staff Architect' },
      { key: 'property_settings', label: 'Hotel Settings' }
    ]
  }
};

interface StaffWithProperty extends UserProfile {
  properties?: {
    name: string;
  };
}

export default function StaffProfile() {
  const params = useParams();
  const staffId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'matrix' | 'json'>('matrix');
  const [staff, setStaff] = useState<StaffWithProperty | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, string>>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function loadStaff() {
      setIsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*, properties(name)')
        .eq('id', staffId)
        .single();
      
      if (data) {
        setStaff(data as unknown as StaffWithProperty);
        setPermissions(data.permissions || {});
      }
      setIsLoading(false);
    }
    loadStaff();
  }, [staffId, supabase]);

  const handleLevelChange = (modKey: string, featKey: string, level: string) => {
    setPermissions((prev: Record<string, Record<string, string>>) => ({
      ...prev,
      [modKey]: {
        ...(prev[modKey] || {}),
        [featKey]: level
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateStaffPermissions(staffId, permissions);
    if (res.success) {
      alert("Permissions successfully synchronized.");
    } else {
      alert(res.error);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await revokeStaffAccess(staffId);
    if (res.success) {
      router.push('/dashboard/staff');
    } else {
      alert(res.error);
    }
    setIsDeleting(false);
  };

  if (isLoading) return <div className="min-h-screen bg-[#08080a] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 p-8 font-sans selection:bg-indigo-500/30">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/dashboard/staff" className="p-2.5 hover:bg-white/5 rounded-xl border border-white/10 transition-all text-zinc-500 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">{staff?.email}</h1>
              <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                {staff?.role}
              </div>
            </div>
            <p className="text-zinc-500 text-sm flex items-center gap-2">
              <Building2 size={14} /> Assigned to {staff?.properties?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode(viewMode === 'matrix' ? 'json' : 'matrix')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5 transition-all"
          >
            {viewMode === 'matrix' ? <Code size={16} /> : <Settings size={16} />}
            {viewMode === 'matrix' ? 'JSON Playground' : 'Visual Matrix'}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Sync Permissions
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-12 gap-8">
        
        {/* LEFT COL: IAM CONSOLE */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 overflow-hidden shadow-2xl relative">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-white">Action-Level Permissions</h3>
                <p className="text-xs text-zinc-500 mt-1">Surgically assign Write, Read, or Deny access across all modules.</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                <input 
                  type="text" 
                  placeholder="Search Actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === 'matrix' ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {Object.entries(FEATURE_MAP).map(([modKey, modData]) => {
                    const filteredFeatures = modData.features.filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase()));
                    if (filteredFeatures.length === 0) return null;

                    return (
                      <div key={modKey} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">{modData.label}</h4>
                          <div className="flex-1 h-px bg-white/5" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredFeatures.map(feat => {
                            const currentLevel = (permissions[modKey] && permissions[modKey][feat.key]) || 'deny';
                            return (
                              <div key={feat.key} className="flex items-center justify-between bg-black/30 border border-white/[0.03] p-3 rounded-2xl group hover:border-white/10 transition-all">
                                <span className="text-[12px] font-medium text-zinc-300">{feat.label}</span>
                                <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/5">
                                  {[
                                    { k: 'write', l: 'W', c: 'bg-emerald-500/20 text-emerald-400' },
                                    { k: 'read', l: 'R', c: 'bg-amber-500/20 text-amber-400' },
                                    { k: 'deny', l: 'D', c: 'bg-rose-500/20 text-rose-400' }
                                  ].map((lvl) => {
                                    const isActive = currentLevel === lvl.k;
                                    return (
                                      <button
                                        key={lvl.k}
                                        onClick={() => handleLevelChange(modKey, feat.key, lvl.k)}
                                        className={`w-7 h-7 flex items-center justify-center text-[10px] font-black rounded-md transition-all ${
                                          isActive ? lvl.c : 'text-zinc-700 hover:text-zinc-500'
                                        }`}
                                      >
                                        {lvl.l}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="bg-black/60 rounded-2xl p-4 border border-white/5 font-mono text-xs leading-relaxed overflow-hidden">
                    <textarea 
                      value={JSON.stringify(permissions, null, 2)}
                      onChange={(e) => {
                        try { setPermissions(JSON.parse(e.target.value)); } catch { /* ignore parse error */ }
                      }}
                      className="w-full h-[400px] bg-transparent text-indigo-300 focus:outline-none scrollbar-hide resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-zinc-600 italic">
                    <ShieldAlert size={12} />
                    Careful: Manually editing JSON can break UI expectations if keys are misspelled.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT COL: DANGER ZONE */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Account Status</h3>
            <div className="space-y-4">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Last Authorized</p>
                <p className="text-sm text-zinc-200 font-medium">Just now (via Cloud Node)</p>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Login Activity</p>
                <p className="text-sm text-emerald-400 font-bold flex items-center gap-2">
                  <Activity size={14} /> Active Session
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/5">
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4">Danger Zone</h4>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="w-full group flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white py-3 rounded-2xl font-bold text-sm transition-all"
              >
                <Trash2 size={16} />
                Revoke System Access
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#09090b] border border-rose-500/20 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Confirm Revocation?</h2>
              <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
                You are about to permanently delete the account for <strong className="text-white">{staff?.email}</strong>. This staff member will be logged out instantly and their credentials will be destroyed.
              </p>
              
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-zinc-300 font-bold text-xs hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-all flex items-center justify-center gap-2">
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : "Revoke Access"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
