"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  DoorOpen,
  DollarSign,
  Users,
  Settings,
  Building2,
  LogOut,
  Search,
  Bell,
  UserPlus,
  Loader2,
  ShieldAlert,
  Activity,
  Trash2,
  Mail,
  ChevronsUpDown,
  Lock,
  Brush
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { addStaff, getRoleTemplates } from '@/app/actions/staff';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: false, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Users, label: "Staff", href: "/dashboard/staff", active: true, module: 'staff_management' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' },
];

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-500 ${className}`}>
    {children}
  </div>
);

export default function StaffManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [staffCredentials, setStaffCredentials] = useState<{email: string, password: string} | null>(null);
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [property, setProperty] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessiblePropsList, setAccessiblePropsList] = useState<{id: string, name: string}[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);

  // IAM Architect State
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [permissionsMatrix, setPermissionsMatrix] = useState<any>({
    front_office: 'none', housekeeping: 'none', analytics: 'none', inventory: 'none', staff_management: 'none'
  });

  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch user profile for RBAC permissions
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(prof);

      const { data: accessibleProperties } = await supabase
        .from('property_access')
        .select(`
          property_id,
          properties ( id, name )
        `)
        .eq('user_id', user.id);

      let activePropertyId = null;
      let parsedPropsList: {id: string, name: string}[] = [];
      
      if (accessibleProperties && accessibleProperties.length > 0) {
        parsedPropsList = accessibleProperties.map((p: any) => p.properties);
        setAccessiblePropsList(parsedPropsList);
        
        // Try to get saved property from localStorage
        const savedId = localStorage.getItem('pms_active_property');
        if (savedId && parsedPropsList.some(p => p.id === savedId)) {
          activePropertyId = savedId;
        } else {
          activePropertyId = parsedPropsList[0].id;
        }
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('property_id')
          .eq('id', user.id)
          .single();
        if (profile?.property_id) activePropertyId = profile.property_id;

        if (activePropertyId) {
          const { data: fallbackProp } = await supabase.from('properties').select('id, name').eq('id', activePropertyId).single();
          if (fallbackProp) {
            setAccessiblePropsList([fallbackProp]);
          }
        }
      }
        
      if (activePropertyId) {
        const { data: propData } = await supabase
          .from('properties')
          .select('*')
          .eq('id', activePropertyId)
          .single();

        if (propData) {
          setProperty(propData);

          const { data: staffData } = await supabase
            .from('profiles')
            .select('*')
            .eq('property_id', activePropertyId)
            .eq('role', 'staff');
            
          if (staffData) setStaffList(staffData);

          // Fetch Role Templates for IAM Architect
          const fetchedTemplates = await getRoleTemplates(activePropertyId);
          setTemplates(fetchedTemplates);

          // Pre-select the first template
          if (fetchedTemplates && fetchedTemplates.length > 0) {
            setSelectedTemplate(fetchedTemplates[0]);
            setPermissionsMatrix(fetchedTemplates[0].permissions);
          }
        }
      }
      setIsLoading(false);
    }
    
    fetchData();
  }, [supabase]);

  const switchProperty = (propId: string) => {
    localStorage.setItem('pms_active_property', propId);
    setShowPropertyDropdown(false);
    window.location.reload();
  };
const handleAddStaff = async (formData: FormData) => {
  setActionLoading(true);
  setActionError('');
  setStaffCredentials(null);

  if (!property?.id) return;

  formData.append('propertyId', property.id);
  formData.append('role', selectedTemplate ? selectedTemplate.name : 'Custom');
  formData.append('permissions', JSON.stringify(permissionsMatrix));

  const result = await addStaff(formData);
  if (result.error) {
    setActionError(result.error);
  } else if (result.credentials) {
    setStaffCredentials(result.credentials);

    const { data: staffData } = await supabase
      .from('profiles')
      .select('*')
      .eq('property_id', property.id)
      .eq('role', 'staff');
    if (staffData) setStaffList(staffData);
  }

  setActionLoading(false);
};

const [saveTemplateName, setSaveTemplateName] = useState('');
const [isSavingTemplate, setIsSavingTemplate] = useState(false);

const FEATURE_MAP = {
  front_office: {
    label: 'Front Office',
    features: [
      { key: 'tape_chart', label: 'Tape Chart' },
      { key: 'check_in_out', label: 'Check-In / Out' },
      { key: 'room_upgrades', label: 'Room Upgrades' },
      { key: 'refund_folios', label: 'Refund Folios' },
      { key: 'guest_notes', label: 'Guest Notes' },
      { key: 'block_rooms', label: 'Block Rooms' }
    ]
  },
  housekeeping: {
    label: 'Housekeeping',
    features: [
      { key: 'task_list', label: 'Cleaning Task List' },
      { key: 'room_inspection', label: 'Room Inspection' },
      { key: 'minibar_posting', label: 'Minibar Posting' },
      { key: 'ops_management', label: 'Ops Management' }
    ]
  },
  finance: {
    label: 'Financials',
    features: [
      { key: 'night_audit', label: 'Night Audit' },
      { key: 'reports', label: 'Financial Reports' }
    ]
  },
  inventory: {
    label: 'Inventory',
    features: [
      { key: 'manage_rooms', label: 'Manage Rooms' }
    ]
  },
  staff_management: {
    label: 'Staff Management',
    features: [
      { key: 'manage_staff', label: 'Invite / Edit Staff' }
    ]
  }
};

const handlePermissionChange = (module: string, feature: string, level: string) => {
  setPermissionsMatrix((prev: any) => ({
    ...prev,
    [module]: {
      ...(prev[module] || {}),
      [feature]: level
    }
  }));
  setSelectedTemplate(null);
};

const handleSaveTemplate = async () => {
  if (!saveTemplateName || !property?.id) return;
  setIsSavingTemplate(true);
  // Dynamic import to avoid circular dependencies in the top scope if needed, 
  // but we can just use the action we added.
  const { saveRoleTemplate } = await import('@/app/actions/staff');
  const res = await saveRoleTemplate(property.id, saveTemplateName, permissionsMatrix);
  if (!res.error) {
    setSaveTemplateName('');
    const fetchedTemplates = await getRoleTemplates(property.id);
    setTemplates(fetchedTemplates);
    alert('Template Saved Successfully!');
  } else {
    alert(res.error);
  }
  setIsSavingTemplate(false);
};
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // --- ACCESS CONTROL HELPER ---
  const hasAccess = (moduleName: string) => {
    if (!userProfile) return true; 
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    
    const perms = userProfile.permissions || {};
    const modPerms = perms[moduleName];
    
    // If the module object is empty or all its sub-features are 'none', lock the sidebar tab
    if (!modPerms || Object.values(modPerms).every(v => v === 'none')) {
      return false;
    }
    return true;
  };

  return (
    <div className="flex min-h-screen bg-[#08080a]">
      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl shrink-0">
        <div className="p-6 pb-4 relative">
          <button 
            onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
            className="w-full flex items-center justify-between gap-3 p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <Building2 size={18} className="text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-[13px] font-bold text-white tracking-tight truncate max-w-[130px]">{property?.name || 'Loading...'}</h1>
                <p className="text-[10px] text-zinc-600 font-medium">Owner Dashboard</p>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
          </button>

          {/* Dropdown Menu */}
          {showPropertyDropdown && accessiblePropsList.length > 1 && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Switch Property</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {accessiblePropsList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => switchProperty(p.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${
                      p.id === property?.id 
                        ? 'bg-indigo-500/10 text-indigo-400' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 mb-3">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const locked = !hasAccess(item.module);
            return (
              <Link
                key={item.label}
                href={locked ? "#" : item.href}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    alert(`Access Restricted: The ${item.label} module requires higher authorization.`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                  item.active
                    ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : locked 
                      ? 'text-zinc-700 cursor-not-allowed'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
                }`}
              >
                <item.icon size={17} className={item.active ? 'text-indigo-400' : ''} />
                <span className="flex-1">{item.label}</span>
                {locked && <Lock size={12} className="text-zinc-800" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-rose-500 hover:bg-rose-500/5 transition-all">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#08080a]/80 border-b border-white/[0.04] px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Staff Management</h2>
              <p className="text-[11px] text-zinc-600 mt-0.5">Manage permissions and onboard new team members</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white transition-all"><Search size={16} /></button>
              <button className="p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white transition-all"><Bell size={16} /></button>
            </div>
          </div>
        </header>

        <div className="p-8 grid grid-cols-12 gap-8">
          {/* STAFF LIST */}
          <div className="col-span-12 lg:col-span-8">
            <GlassCard>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Your Team</h3>
                  <p className="text-[11px] text-zinc-500">Active Front Desk credentials for this property</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase font-bold tracking-widest border border-emerald-500/20">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full" /> {staffList.length} Active
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
              ) : staffList.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                  <Users size={32} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-400 font-medium mb-1">No staff members yet</p>
                  <p className="text-[11px] text-zinc-600">Provision your first account using the form</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {staffList.map((st, i) => (
                    <motion.div 
                      key={st.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/[0.04] hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400">
                          <Mail size={18} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white">{st.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Front Desk Staff</span>
                            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest italic flex items-center gap-1">
                              <Activity size={10} /> Active
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><Settings size={14} /></button>
                         <button className="p-2 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* ADD FORM */}
          <div className="col-span-12 lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 shadow-2xl"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={18} className="text-indigo-200" />
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em]">Onboarding</span>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight mb-2">New Staff</h3>
                <p className="text-[12px] text-indigo-200/80 leading-relaxed mb-6">Create credentials and issue temporary access keys instantly.</p>
                
                {staffCredentials ? (
                  <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-5 border border-emerald-500/30">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <ShieldAlert size={14} /> Provision Complete
                    </p>
                    <div className="space-y-2 mb-4">
                      <div>
                         <p className="text-[9px] text-indigo-200/60 uppercase font-black tracking-widest">Username</p>
                         <p className="text-xs font-bold text-white">{staffCredentials.email}</p>
                      </div>
                      <div>
                         <p className="text-[9px] text-indigo-200/60 uppercase font-black tracking-widest">Master Key</p>
                         <p className="text-xs font-bold text-amber-400 font-mono tracking-widest">{staffCredentials.password}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-200/70 italic leading-relaxed">Account requires security verification on first login.</p>
                    <button 
                      onClick={() => setStaffCredentials(null)}
                      className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white rounded-xl py-2.5 text-[10px] font-bold uppercase transition-all"
                    >
                      Add Another Staff
                    </button>
                  </div>
                ) : (
                  <form action={handleAddStaff} className="space-y-4">
                    <div>
                      <input 
                        name="email"
                        type="email" 
                        required
                        placeholder="Employee Email Address"
                        className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder:text-indigo-200/40 focus:outline-none focus:border-white/30 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <div className="relative">
                        <select 
                          className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-white/30 transition-all appearance-none font-bold"
                          value={selectedTemplate ? selectedTemplate.id : 'custom'}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setSelectedTemplate(null);
                            } else {
                              const tmpl = templates.find(t => t.id === e.target.value);
                              if (tmpl) {
                                setSelectedTemplate(tmpl);
                                setPermissionsMatrix(tmpl.permissions);
                              }
                            }
                          }}
                        >
                          <option value="custom" className="bg-zinc-900 text-white font-normal">Custom Configuration</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id} className="bg-zinc-900 text-white font-normal">{t.name}</option>
                          ))}
                        </select>
                        <ChevronsUpDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                      </div>
                    </div>

                    {/* Capability Matrix */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-4 mt-2 h-[320px] overflow-y-auto custom-scrollbar">
                      <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest opacity-80 sticky top-0 bg-[#0c0c0e] py-1 z-10">Advanced Action Matrix</p>
                      
                      {Object.entries(FEATURE_MAP).map(([modKey, modData]) => (
                        <div key={modKey} className="space-y-2 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                          <h4 className="text-[12px] text-white font-bold">{modData.label}</h4>
                          <div className="space-y-1.5 pl-3 border-l-2 border-white/5">
                            {modData.features.map(feat => {
                              const currentLevel = (permissionsMatrix[modKey] && permissionsMatrix[modKey][feat.key]) || 'none';
                              return (
                                <div key={feat.key} className="flex items-center justify-between bg-zinc-900/30 p-2 rounded-lg">
                                  <span className="text-[10px] text-white/70 font-medium">{feat.label}</span>
                                  <div className="flex bg-black/50 rounded-md p-0.5 border border-white/5">
                                    {['full', 'read', 'none'].map((level) => {
                                      const isActive = currentLevel === level;
                                      return (
                                        <button
                                          key={level}
                                          type="button"
                                          onClick={() => handlePermissionChange(modKey, feat.key, level)}
                                          className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all ${
                                            isActive 
                                              ? level === 'full' ? 'bg-emerald-500 text-white shadow-sm' 
                                              : level === 'read' ? 'bg-amber-500 text-white shadow-sm'
                                              : 'bg-rose-500/80 text-white shadow-sm'
                                              : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                                          }`}
                                        >
                                          {level.charAt(0)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Custom Template Saver */}
                    {!selectedTemplate && (
                      <div className="flex items-center gap-2 mt-2 bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10">
                        <input 
                          type="text"
                          value={saveTemplateName}
                          onChange={(e) => setSaveTemplateName(e.target.value)}
                          placeholder="Name this Template (e.g. Junior FO)"
                          className="flex-1 bg-transparent text-[11px] text-white focus:outline-none px-2"
                        />
                        <button 
                          type="button"
                          onClick={handleSaveTemplate}
                          disabled={isSavingTemplate || !saveTemplateName}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    {actionError && (
                      <div className="p-3 bg-rose-500/20 rounded-xl text-rose-200 text-xs flex items-start gap-2 border border-rose-500/30">
                        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                        {actionError}
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-white text-indigo-700 py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-[0.98] shadow-xl mt-4"
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} /> Deploy Credentials</>}
                    </button>
                  </form>
                )}
              </div>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
