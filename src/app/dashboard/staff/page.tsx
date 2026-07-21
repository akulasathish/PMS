"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Loader2, UserPlus, Users, Key, AlertCircle, X, ShieldAlert,
  CheckCircle, ArrowLeft, Trash2, Shield, Eye, Settings, HelpCircle, Copy
} from 'lucide-react';
import { addStaff, getStaff, revokeStaffAccess } from '@/app/actions/staff';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: any;
  property_id: string;
}

interface RoleTemplate {
  id: string;
  name: string;
  permissions: any;
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  
  // Modal & Form State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selectedRole, setSelectedRole] = useState('Guest Journey (FO)');
  const [customPermissions, setCustomPermissions] = useState<any>({});
  
  // Success Credentials Display State
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError('');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // 1. Get active property from profile or local storage
        const { data: profile } = await supabase.from('profiles').select('property_id').eq('id', user.id).single();
        const savedPropertyId = localStorage.getItem('pms_active_property') || profile?.property_id;
        
        if (!savedPropertyId) {
          setError('No active property selected. Please register a property first.');
          setIsLoading(false);
          return;
        }
        
        setActivePropertyId(savedPropertyId);

        // 2. Fetch staff list & role templates concurrently
        const [staffRes, templatesRes] = await Promise.all([
          getStaff(savedPropertyId),
          supabase.from('role_templates').select('*')
        ]);

        if (staffRes.success && staffRes.staff) {
          setStaffList(staffRes.staff as UserProfile[]);
        } else {
          setError(staffRes.error || 'Failed to retrieve staff accounts.');
        }

        const templates = templatesRes.data || [];
        setRoleTemplates(templates);

        // Select first template as default in form
        if (templates.length > 0) {
          const defaultTemplate = templates.find((t: any) => t.name.includes('Guest Journey')) || templates[0];
          setSelectedRole(defaultTemplate.name);
          setCustomPermissions(defaultTemplate.permissions);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRoleChange = (roleName: string) => {
    setSelectedRole(roleName);
    const template = roleTemplates.find(t => t.name === roleName);
    if (template) {
      setCustomPermissions(template.permissions);
    }
  };

  const handlePermissionOverride = (module: string, action: string, value: 'write' | 'read' | 'deny') => {
    setCustomPermissions((prev: any) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: value
      }
    }));
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePropertyId) return;
    setIsActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await addStaff({
        email: inviteEmail,
        fullName: inviteName,
        role: selectedRole,
        permissions: customPermissions,
        propertyId: activePropertyId
      });

      if (!result.success) {
        setError(result.error || 'Failed to invite staff.');
        setIsActionLoading(false);
        return;
      }

      // Show temporary password in dialog
      setCreatedCredentials({
        email: inviteEmail,
        tempPass: result.tempPassword || ''
      });

      // Reload staff list
      const staffRes = await getStaff(activePropertyId);
      if (staffRes.success && staffRes.staff) {
        setStaffList(staffRes.staff as UserProfile[]);
      }

      // Reset form
      setInviteEmail('');
      setInviteName('');
      setShowInviteModal(false);
      setSuccess('Staff member added successfully!');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevokeStaff = async (staffUserId: string) => {
    if (!activePropertyId) return;
    if (!confirm('Are you absolutely sure you want to revoke this staff member\'s access? This will permanently delete their account.')) return;
    
    setIsActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await revokeStaffAccess(staffUserId, activePropertyId);
      if (!result.success) {
        setError(result.error || 'Failed to revoke staff access.');
        setIsActionLoading(false);
        return;
      }

      // Update local state list
      setStaffList(prev => prev.filter(st => st.id !== staffUserId));
      setSuccess('Staff access revoked and account deleted successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to revoke staff access.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(
      `StaySync Staff Credentials\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.tempPass}\n\nPlease login and change your password in property settings.`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 size={30} className="text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans antialiased p-6 lg:p-10 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2.5 bg-zinc-900 border border-white/5 hover:border-white/10 hover:bg-zinc-850 rounded-xl transition-all text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Users size={20} className="text-indigo-400" />
                Staff Manager
              </h1>
              <p className="text-xs text-zinc-500 mt-1">Onboard team members and configure granular permission gates.</p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs active:scale-[0.97] shadow-lg shadow-indigo-500/10"
          >
            <UserPlus size={14} /> Add Staff Account
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-450 text-sm font-medium animate-fade-in">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Temporary Credentials Success Display */}
        {createdCredentials && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-[#121215] border border-emerald-500/20 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Key size={16} /> Created Staff Credentials (Local / Demo environment bypass)
            </div>
            <p className="text-xs text-zinc-400">Share these details with your team member. They must use this email and temporary password to log in.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-xs">
              <div>
                <span className="text-zinc-600 block text-[9px] uppercase font-bold tracking-wider">Email Address</span>
                <span className="text-white font-bold">{createdCredentials.email}</span>
              </div>
              <div className="relative">
                <span className="text-zinc-600 block text-[9px] uppercase font-bold tracking-wider">Temporary Password</span>
                <span className="text-indigo-400 font-bold">{createdCredentials.tempPass}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={copyToClipboard}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button 
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Staff Directory Table */}
        <div className="bg-[#121215]/60 backdrop-blur-md border border-white/[0.06] rounded-[2rem] shadow-2xl overflow-hidden">
          {staffList.length === 0 ? (
            <div className="py-24 text-center">
              <Users size={40} className="text-zinc-650 mx-auto mb-4" />
              <h3 className="text-white font-bold text-sm">No Staff Members Registered</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Add team members to grant them terminal access to rooms, bookings, and housekeeping.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-black/25 text-[10px] font-bold text-zinc-550 uppercase tracking-widest">
                    <th className="py-4.5 px-6">Name</th>
                    <th className="py-4.5 px-6">Email Address</th>
                    <th className="py-4.5 px-6">Assigned Role</th>
                    <th className="py-4.5 px-6">Module Permissions</th>
                    <th className="py-4.5 px-6 text-right">Access Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-xs">
                  {staffList.map(st => (
                    <tr key={st.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center font-mono text-[10px] font-bold text-zinc-400 uppercase">
                            {st.full_name.substring(0, 2)}
                          </div>
                          {st.full_name}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-400 font-mono">{st.email}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400">
                          <Shield size={10} />
                          {st.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(st.permissions || {}).map((mod) => {
                            // Check if they have at least one allowed action in this module
                            const modObj = st.permissions[mod];
                            const keys = typeof modObj === 'object' ? Object.keys(modObj) : [];
                            const hasAccess = keys.some(k => modObj[k] === 'write' || modObj[k] === 'read');
                            
                            if (!hasAccess) return null;
                            return (
                              <span key={mod} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-black uppercase text-zinc-400 tracking-wider">
                                {mod.replace('_', ' ')}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleRevokeStaff(st.id)}
                          disabled={isActionLoading}
                          className="p-2 bg-rose-500/5 hover:bg-rose-500 text-rose-450 hover:text-white border border-rose-500/10 hover:border-transparent rounded-xl transition-all inline-flex items-center justify-center"
                          title="Revoke Access & Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Staff Modal Dialog */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#121215] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Onboard New Staff Member</h2>
                  <p className="text-[10px] text-zinc-550 mt-1">Specify account identity and configure access templates.</p>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Form Scroll Area */}
              <form onSubmit={handleInviteStaff} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Identity Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" required placeholder="e.g. Ramesh Kumar"
                      value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" required placeholder="ramesh@staysync.com"
                      value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                    />
                  </div>
                </div>

                {/* Role Template Selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Base Role Template</label>
                  <select 
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all appearance-none"
                  >
                    {roleTemplates.map(t => (
                      <option key={t.id} value={t.name} className="bg-zinc-950 text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Permissions matrix */}
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <ShieldAlert size={12} className="text-indigo-400" />
                    Permission Controls (Fine-Tuning)
                  </label>
                  
                  <div className="bg-black/30 rounded-2xl border border-white/5 divide-y divide-white/[0.03] overflow-hidden">
                    {Object.keys(customPermissions).map((module) => {
                      const modObj = customPermissions[module];
                      if (typeof modObj !== 'object') return null;

                      return (
                        <div key={module} className="p-4 space-y-2">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                            {module.replace('_', ' ')} Module
                          </h4>
                          
                          <div className="space-y-1.5">
                            {Object.keys(modObj).map((action) => {
                              const value = modObj[action];
                              return (
                                <div key={action} className="flex items-center justify-between text-[11px] py-1">
                                  <span className="text-zinc-400 font-medium">{action.replaceAll('_', ' ')}</span>
                                  <div className="flex bg-black/40 border border-white/5 rounded-lg p-0.5 text-[8px] font-black uppercase">
                                    {['write', 'read', 'deny'].map((level) => (
                                      <button
                                        key={level}
                                        type="button"
                                        onClick={() => handlePermissionOverride(module, action, level as any)}
                                        className={`px-2 py-1 rounded transition-all ${
                                          value === level 
                                            ? 'bg-zinc-800 text-white shadow-sm' 
                                            : 'text-zinc-650 hover:text-zinc-400'
                                        }`}
                                      >
                                        {level}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 border-t border-white/5 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="py-3 px-5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05] text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-650/50 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center gap-1.5"
                  >
                    {isActionLoading ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle size={13} /> Provision Account</>}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
