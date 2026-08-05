"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Loader2, Home, MapPin, Building, Flag, Sparkles, LogOut, 
  ArrowLeft, HelpCircle, CheckCircle, Send, Save, Plus, Settings, Info, Lock, X
} from 'lucide-react';
import { createProperty, updateProperty, savePartnerInvestments } from '@/app/actions/property';

interface Property {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  gst_number?: string;
  state_code?: string;
}

function PropertySetupForm() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'property' | 'suggestions'>('property');
  const [propertiesList, setPropertiesList] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyCountry, setPropertyCountry] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [propertyCategory, setPropertyCategory] = useState<'PG' | 'Hotel/PG'>('Hotel/PG');
  const [ownershipType, setOwnershipType] = useState<'single' | 'partnership'>('single');
  const [totalCapital, setTotalCapital] = useState<number>(5400000);
  const [customPartners, setCustomPartners] = useState<{ partner_name: string; investment_amount: number }[]>([
    { partner_name: 'Rajesh (Person 1)', investment_amount: 2000000 },
    { partner_name: 'Sathish (Person 2)', investment_amount: 1500000 },
    { partner_name: 'Anil (Person 3)', investment_amount: 1000000 },
    { partner_name: 'Partner 4', investment_amount: 500000 },
    { partner_name: 'Partner 5', investment_amount: 400000 },
  ]);
  
  // Partner Editing Unlock & Security States
  const [isEditingPartners, setIsEditingPartners] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Feedback Form State
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Feature Request');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [sessionFeedbacks, setSessionFeedbacks] = useState<{title: string, category: string, desc: string}[]>([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const handleVerifyPasswordToEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setAuthError('User session expired. Please log in.');
        setAuthLoading(false);
        return;
      }

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: authPassword,
      });

      if (verifyErr) {
        setAuthError('Security Verification Failed: Incorrect password.');
        setAuthLoading(false);
        return;
      }

      // Password verified -> unlock editing mode!
      setShowPasswordModal(false);
      setIsEditingPartners(true);
      setAuthPassword('');
    } catch (err: any) {
      setAuthError('Authentication error: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError('');
      try {
        const mode = searchParams.get('mode');
        if (mode === 'PG') {
          setPropertyCategory('PG');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch user profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        let props: Property[] = [];
        if (profile?.property_id) {
          const { data: userProp } = await supabase.from('properties').select('*').eq('id', profile.property_id).maybeSingle();
          if (userProp) {
            props = [userProp];
          }
        }

        if (props.length === 0) {
          const { data: allProps } = await supabase.from('properties').select('*');
          props = allProps || [];
        }

        setPropertiesList(props);

        if (props.length > 0 && mode !== 'PG' && mode !== 'Hotel/PG') {
          const activeId = profile?.property_id || props[0].id;
          const active = props.find((p: any) => p.id === activeId) || props[0];
          handleSelectProperty(active);
        } else {
          setIsCreatingNew(true);
          if (mode === 'PG') {
            setPropertyCategory('PG');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load settings data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectProperty = async (prop: Property) => {
    setSelectedProperty(prop);
    setIsCreatingNew(false);
    setPropertyName(prop.name || '');
    setPropertyAddress(prop.address || '');
    setPropertyCity(prop.city || '');
    setPropertyCountry(prop.country || '');
    setGstNumber((prop as any).gstin || (prop as any).gst_number || '');
    setPropertyCategory((prop as any).property_category || 'PG');
    setTotalCapital((prop as any).total_capital_investment || 0);

    // Persist active property selection locally
    localStorage.setItem('pms_active_property', prop.id);

    try {
      // Sync selected property ID to user's database profile for route-level middleware alignment
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ property_id: prop.id })
          .eq('id', user.id);
      }

      // Fetch existing partner investments from database
      const { data: existingPartners } = await supabase
        .from('partner_investments')
        .select('*')
        .eq('property_id', prop.id);

      if (existingPartners && existingPartners.length > 1) {
        setOwnershipType('partnership');
        setCustomPartners(existingPartners);
      } else {
        setOwnershipType('single');
        setCustomPartners([
          { partner_name: 'Primary Owner', investment_amount: (prop as any).total_capital_investment || 0 }
        ]);
      }
    } catch (err) {
      console.error('Failed to sync active property or load partners:', err);
    }
  };

  const handleNewPropertyToggle = () => {
    setIsCreatingNew(true);
    setSelectedProperty(null);
    setPropertyName('');
    setPropertyAddress('');
    setPropertyCity('');
    setPropertyCountry('');
    setGstNumber('');
    setStateCode('');
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Session expired. Please log in again.');
        router.push('/login');
        return;
      }

      if (isCreatingNew) {
        // Create new property
        const result = await createProperty({
          user_id: user.id,
          name: propertyName,
          address: propertyAddress,
          city: propertyCity,
          country: propertyCountry,
          property_category: propertyCategory,
          total_capital_investment: totalCapital
        });

        if (!result.success || !result.data) {
          setError(result.error || 'Failed to create property.');
          return;
        }

        const newProp = result.data as Property;
        
        // Save partner investments if provided
        if (totalCapital > 0 && customPartners.length > 0) {
          await savePartnerInvestments(newProp.id, totalCapital, customPartners);
        }

        setPropertiesList([...propertiesList, newProp]);
        localStorage.setItem('pms_active_property', newProp.id);
        handleSelectProperty(newProp);
        setSuccessMessage('Property created successfully! Opening workspace...');

        setTimeout(() => {
          router.refresh();
          router.push('/dashboard');
        }, 1000);
      } else {
        // Update existing property
        if (!selectedProperty) return;
        const result = await updateProperty(selectedProperty.id, {
          name: propertyName,
          address: propertyAddress,
          city: propertyCity,
          country: propertyCountry,
          gst_number: gstNumber,
          state_code: stateCode,
          property_category: propertyCategory,
        });

        if (!result.success) {
          setError(result.error || 'Failed to update property.');
          return;
        }

        // Save partner investments if provided
        if (totalCapital > 0 && customPartners.length > 0) {
          await savePartnerInvestments(selectedProperty.id, totalCapital, customPartners);
        }

        // Update list state
        const updatedList = propertiesList.map(p => 
          p.id === selectedProperty.id 
            ? { ...p, name: propertyName, address: propertyAddress, city: propertyCity, country: propertyCountry, gst_number: gstNumber, state_code: stateCode, property_category: propertyCategory }
            : p
        );
        setPropertiesList(updatedList);
        setSuccessMessage('Property settings saved successfully!');
      }

      // Auto-hide success message
      setTimeout(() => setSuccessMessage(''), 4000);

    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTitle || !feedbackDesc) return;

    const newFeedback = {
      title: feedbackTitle,
      category: feedbackCategory,
      desc: feedbackDesc
    };

    setSessionFeedbacks([newFeedback, ...sessionFeedbacks]);
    setFeedbackTitle('');
    setFeedbackDesc('');
    setFeedbackSubmitted(true);

    setTimeout(() => setFeedbackSubmitted(false), 4000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#08080a] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white font-sans relative selection:bg-indigo-500/30 overflow-x-hidden pb-16">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* HEADER SECTION */}
      <header className="border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Settings size={16} className="text-indigo-400" /> System Settings
              </h1>
              <p className="text-[10px] text-zinc-500 mt-0.5">Manage properties and view feature documentation.</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold active:scale-[0.98]"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 mt-8 relative z-10">
        
        {/* TABS SELECTOR */}
        <div className="flex border-b border-white/[0.06] mb-8 gap-6">
          <button
            onClick={() => { setActiveTab('property'); setError(''); }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
              activeTab === 'property' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Property Settings
            {activeTab === 'property' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('suggestions'); setError(''); }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-1.5 ${
              activeTab === 'suggestions' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles size={13} className="text-amber-400" /> Walkthroughs & Suggestions
            {activeTab === 'suggestions' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="p-4 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle size={14} />
            {successMessage}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'property' ? (
            <motion.div
              key="property-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Properties Selector Panel */}
              <div className="lg:col-span-4 space-y-4">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Select Property</h2>
                <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2xl p-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {propertiesList.map(prop => (
                    <button
                      key={prop.id}
                      onClick={() => handleSelectProperty(prop)}
                      className={`w-full p-3.5 rounded-xl text-left transition-all border flex items-center justify-between ${
                        selectedProperty?.id === prop.id && !isCreatingNew
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                          : 'bg-black/20 border-transparent hover:bg-white/[0.02] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold truncate">{prop.name}</div>
                        <div className="text-[9px] text-zinc-500 mt-1 truncate">{prop.city || 'No Location'}, {prop.country || 'No Country'}</div>
                      </div>
                      <Building size={14} className={selectedProperty?.id === prop.id && !isCreatingNew ? 'text-indigo-400' : 'text-zinc-600'} />
                    </button>
                  ))}

                  <button
                    onClick={handleNewPropertyToggle}
                    className={`w-full p-3.5 rounded-xl text-left transition-all border border-dashed flex items-center justify-center gap-2 text-xs font-bold ${
                      isCreatingNew 
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400' 
                        : 'border-white/[0.1] hover:border-white/20 hover:bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Plus size={14} /> Register New Property
                  </button>
                </div>
              </div>

              {/* Property Edit Form */}
              <div className="lg:col-span-8 bg-zinc-900/20 backdrop-blur-sm border border-white/[0.06] rounded-[2rem] p-6 lg:p-8">
                <h2 className="text-sm font-bold text-white tracking-tight mb-6">
                  {isCreatingNew ? 'Register a New Property' : 'Property Configuration'}
                </h2>
                
                <form onSubmit={handleSaveProperty} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Property Name</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                          <Building size={14} />
                        </div>
                        <input 
                          type="text" required placeholder="e.g. Grand Hyatt"
                          value={propertyName} onChange={(e) => setPropertyName(e.target.value)}
                          className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">GST/VAT Number (Optional)</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                          <Info size={14} />
                        </div>
                        <input 
                          type="text" placeholder="e.g. 29AAAAA1111A1Z1"
                          value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
                          className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Address</label>
                    <div className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                        <MapPin size={14} />
                      </div>
                      <input 
                        type="text" required placeholder="e.g. 123 Main St, Sector 4"
                        value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)}
                        className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">City</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                          <MapPin size={14} />
                        </div>
                        <input 
                          type="text" required placeholder="New York"
                          value={propertyCity} onChange={(e) => setPropertyCity(e.target.value)}
                          className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Country</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                          <Flag size={14} />
                        </div>
                        <input 
                          type="text" required placeholder="India"
                          value={propertyCountry} onChange={(e) => setPropertyCountry(e.target.value)}
                          className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">State Code (Optional)</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                          <Info size={14} />
                        </div>
                        <input 
                          type="text" placeholder="e.g. 29"
                          value={stateCode} onChange={(e) => setStateCode(e.target.value)}
                          className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PROPERTY CATEGORY MODE SELECTION */}
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Property Category & Operations Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'PG', title: '🏢 PG (Co-Living Mode)', desc: 'Monthly Tenant Directory, Bed-sharing, Fixed Due Dates, Tenant Ledgers.' },
                        { id: 'Hotel/PG', title: '🏨🏢 Hotel/PG Mode', desc: 'Hotel operations with dedicated PG section & co-living resident management.' }
                      ].map(cat => {
                        const isSelected = propertyCategory === cat.id;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => setPropertyCategory(cat.id as any)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative overflow-hidden ${
                              isSelected
                                ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                                : 'bg-black/40 border-white/[0.06] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-700 bg-zinc-900'
                            }`}>
                              {isSelected && <CheckCircle size={12} className="stroke-[3]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-bold text-white tracking-tight">{cat.title}</h4>
                                {isSelected && (
                                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                    Active Mode
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{cat.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* OWNERSHIP STRUCTURE SELECTION */}
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Ownership Structure</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => {
                          setOwnershipType('single');
                          setCustomPartners([{ partner_name: 'Primary Owner', investment_amount: totalCapital }]);
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative overflow-hidden ${
                          ownershipType === 'single'
                            ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            : 'bg-black/40 border-white/[0.06] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          ownershipType === 'single' ? 'border-emerald-400 bg-emerald-500 text-black' : 'border-zinc-700 bg-zinc-900'
                        }`}>
                          {ownershipType === 'single' && <CheckCircle size={12} className="stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-white tracking-tight">👤 Single Owner (100% Sole Ownership)</h4>
                            {ownershipType === 'single' && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                Active Structure
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Single owner property. 100% revenue entitlement with zero external partner reports.</p>
                        </div>
                      </div>

                      <div
                        onClick={() => setOwnershipType('partnership')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative overflow-hidden ${
                          ownershipType === 'partnership'
                            ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                            : 'bg-black/40 border-white/[0.06] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          ownershipType === 'partnership' ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-700 bg-zinc-900'
                        }`}>
                          {ownershipType === 'partnership' && <CheckCircle size={12} className="stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-white tracking-tight">🤝 Multi-Partner Investment (Partnership)</h4>
                            {ownershipType === 'partnership' && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                Active Structure
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Multiple financial partners with equity percentage shares & monthly dividend reports.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PARTNER CAPITAL ALLOCATION SETUP (Only shown if Partnership is selected) */}
                  {ownershipType === 'partnership' && (
                    <div className="pt-6 border-t border-white/10 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-zinc-900 to-indigo-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          🤝 PG Capital & Partner Profit-Sharing Summary
                        </label>
                        <p className="text-xs text-zinc-400 mt-0.5">Total Property Investment: <strong className="text-white font-mono">₹{totalCapital.toLocaleString('en-IN')}</strong></p>
                      </div>

                      {!isEditingPartners ? (
                        <button
                          type="button"
                          onClick={() => setShowPasswordModal(true)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 active:scale-95"
                        >
                          <Lock size={14} />
                          <span>Unlock Edit Shares</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingPartners(false)}
                          className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <CheckCircle size={14} />
                          <span>Lock Summary View</span>
                        </button>
                      )}
                    </div>

                    {/* READ-ONLY PREMIUM PARTNER CARDS VIEW */}
                    {!isEditingPartners ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {customPartners.map((partner, idx) => {
                          const sharePct = totalCapital > 0 && partner.investment_amount > 0 
                            ? Math.round((partner.investment_amount / totalCapital) * 10000) / 100 
                            : 0;

                          return (
                            <div key={idx} className="bg-black/40 border border-white/[0.06] p-4 rounded-2xl space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-sm font-bold text-white tracking-tight">{partner.partner_name}</h4>
                                  <p className="text-xs font-mono text-zinc-400 mt-0.5">Capital: <strong className="text-emerald-400">₹{Number(partner.investment_amount).toLocaleString('en-IN')}</strong></p>
                                </div>
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full font-mono">
                                  {sharePct}% Share
                                </span>
                              </div>
                              {/* Visual Equity Progress Bar */}
                              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min(100, sharePct)}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* EDITING MODE INPUTS */
                      <div className="space-y-4 bg-black/40 border border-indigo-500/30 p-4 rounded-2xl">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Total PG Capital Investment (₹)</label>
                          <input
                            type="number"
                            placeholder="e.g. 5400000 (54 Lakhs)"
                            value={totalCapital || ''}
                            onChange={(e) => setTotalCapital(Number(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-emerald-500/40 transition-all font-mono"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Partner Shares List</span>
                            <button
                              type="button"
                              onClick={() => setCustomPartners([...customPartners, { partner_name: `Partner ${customPartners.length + 1}`, investment_amount: 0 }])}
                              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                              <Plus size={12} /> Add Partner
                            </button>
                          </div>

                          {customPartners.map((partner, idx) => {
                            const sharePct = totalCapital > 0 && partner.investment_amount > 0 
                              ? Math.round((partner.investment_amount / totalCapital) * 10000) / 100 
                              : 0;

                            return (
                              <div key={idx} className="flex items-center gap-3 bg-black/60 border border-white/10 p-2.5 rounded-xl">
                                <input
                                  type="text"
                                  placeholder="Partner Name"
                                  value={partner.partner_name}
                                  onChange={(e) => {
                                    const updated = [...customPartners];
                                    updated[idx].partner_name = e.target.value;
                                    setCustomPartners(updated);
                                  }}
                                  className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-emerald-500"
                                />
                                <input
                                  type="number"
                                  placeholder="Amount (₹)"
                                  value={partner.investment_amount || ''}
                                  onChange={(e) => {
                                    const updated = [...customPartners];
                                    updated[idx].investment_amount = Number(e.target.value);
                                    setCustomPartners(updated);
                                  }}
                                  className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-32 focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-xs font-mono font-bold text-emerald-400 w-16 text-right">
                                  {sharePct}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCustomPartners(customPartners.filter((_, i) => i !== idx))}
                                  className="text-zinc-500 hover:text-rose-400 text-xs px-1"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                    {propertiesList.length > 0 && isCreatingNew && (
                      <button
                        type="button"
                        onClick={() => handleSelectProperty(propertiesList[0])}
                        className="py-3 px-6 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.05] text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isActionLoading}
                      className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                    >
                      {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> {isCreatingNew ? 'Register Property' : 'Save Configuration'}</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="suggestions-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Guides / Walkthrough Column */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* IN-DEPTH GUIDES */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle size={14} className="text-indigo-400" /> Interactive Feature Guides
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900/40 border border-white/[0.06] rounded-2xl hover:border-indigo-500/20 transition-all group hover:bg-[#0f0f11]">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                        <Sparkles size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-white">Co-Living Split Ledger</h4>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        Security Deposits are strictly separated from Rent incidentals. They are logged under independent ledgers with custom transaction allocation rules.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900/40 border border-white/[0.06] rounded-2xl hover:border-indigo-500/20 transition-all group hover:bg-[#0f0f11]">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                        <Sparkles size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-white">Dynamic Billing Cycles</h4>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        Payment logs allow choosing dynamic billing cycles computed on-the-fly from the guest's check-in date. Cycles print correctly on invoice PDFs.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900/40 border border-white/[0.06] rounded-2xl hover:border-indigo-500/20 transition-all group hover:bg-[#0f0f11]">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                        <Sparkles size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-white">Operational Date Locks</h4>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        The property is locked to a single "business date" in the database to prevent future billing drift. Run Night Audit to advance the calendar.
                      </p>
                    </div>

                    <div className="p-4 bg-zinc-900/40 border border-white/[0.06] rounded-2xl hover:border-indigo-500/20 transition-all group hover:bg-[#0f0f11]">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                        <Sparkles size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-white">Inline Rent Editor</h4>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        Change a guest's monthly base rate using the inline pencil editor inside the Folio Room charges row. Ledger recalculates automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SYSTEM CHANGELOG */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Release Updates</h3>
                  
                  <div className="border-l border-white/5 pl-4 ml-2 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-[#060608]" />
                      <div className="text-[10px] font-bold text-indigo-400">July 2026</div>
                      <h4 className="text-xs font-bold text-white mt-0.5">Mobile Responsive Optimizations</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">Realigned folio navigation tabs into compact grids and dynamically hid giant print/checkout buttons from forms on mobile.</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-700 border-2 border-[#060608]" />
                      <div className="text-[10px] font-bold text-zinc-500">June 2026</div>
                      <h4 className="text-xs font-bold text-white mt-0.5">1-Tier RLS Refactor</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">Migrated database security rules to follow unified, role-free row-level permissioning based directly on property ownership.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Suggestions / Feedback Submission Column */}
              <div className="lg:col-span-5 bg-zinc-900/20 backdrop-blur-sm border border-white/[0.06] rounded-[2rem] p-6 flex flex-col h-fit">
                <h3 className="text-sm font-bold text-white tracking-tight mb-2 flex items-center gap-2">
                  <Send size={15} className="text-indigo-400" /> Suggest a Feature
                </h3>
                <p className="text-[10px] text-zinc-500 mb-6">Have an idea on how we can improve StaySync? Drop your feedback directly below.</p>
                
                {feedbackSubmitted && (
                  <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={12} /> Suggestion Submitted! Thank you.
                  </div>
                )}

                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Suggestion Title</label>
                    <input 
                      type="text" required placeholder="e.g. Bulk check-in/check-out options"
                      value={feedbackTitle} onChange={(e) => setFeedbackTitle(e.target.value)}
                      className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2 px-3.5 text-white text-xs placeholder:text-zinc-750 focus:outline-none focus:border-indigo-500/40 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Category</label>
                    <select
                      value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2 px-3.5 text-white text-xs focus:outline-none focus:border-indigo-500/40 transition-all appearance-none"
                    >
                      <option value="Feature Request" className="bg-zinc-950 text-white">Feature Request</option>
                      <option value="User Interface" className="bg-zinc-950 text-white">User Interface Improvement</option>
                      <option value="Bug Report" className="bg-zinc-950 text-white">Bug Report</option>
                      <option value="Other" className="bg-zinc-950 text-white">Other Feedback</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">In-Depth Description</label>
                    <textarea 
                      required rows={4} placeholder="Describe the feature request, use case, or issue in detail..."
                      value={feedbackDesc} onChange={(e) => setFeedbackDesc(e.target.value)}
                      className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2 px-3.5 text-white text-xs placeholder:text-zinc-750 focus:outline-none focus:border-indigo-500/40 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98]"
                  >
                    <Send size={12} /> Submit Suggestion
                  </button>
                </form>

                {sessionFeedbacks.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-3.5">
                    <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Submitted in this session:</h4>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {sessionFeedbacks.map((f, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="font-bold text-zinc-200">{f.title}</span>
                            <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">{f.category}</span>
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-1.5 leading-relaxed">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      {/* 🔒 SECURITY PASSWORD VERIFICATION MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                  <Lock size={16} /> Security Check Required
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Unlock Partner Share Editing</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter your account password to authorize changing partner capital investments and equity percentages.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                  {authError}
                </div>
              )}

              <form onSubmit={handleVerifyPasswordToEdit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Account Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your login password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {authLoading ? <Loader2 size={14} className="animate-spin" /> : 'Authorize & Unlock'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}

export default function PropertySetupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-[#08080a] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    }>
      <PropertySetupForm />
    </Suspense>
  );
}
