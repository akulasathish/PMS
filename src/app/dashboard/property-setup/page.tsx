"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Loader2, Home, MapPin, Building, Flag, Sparkles, LogOut, 
  ArrowLeft, HelpCircle, CheckCircle, Send, Save, Plus, Settings, Info
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

export default function PropertySetupPage() {
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
  const [propertyCategory, setPropertyCategory] = useState<'PG' | 'Hotel' | 'Hybrid'>('Hybrid');
  const [totalCapital, setTotalCapital] = useState<number>(5400000);
  const [customPartners, setCustomPartners] = useState<{ partner_name: string; investment_amount: number }[]>([
    { partner_name: 'Rajesh (Person 1)', investment_amount: 2000000 },
    { partner_name: 'Sathish (Person 2)', investment_amount: 1500000 },
    { partner_name: 'Anil (Person 3)', investment_amount: 1000000 },
    { partner_name: 'Partner 4', investment_amount: 500000 },
    { partner_name: 'Partner 5', investment_amount: 400000 },
  ]);
  
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

        // Fetch user profile and properties they own
        const [profileRes, propertiesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('properties').select('*').eq('owner_user_id', user.id)
        ]);

        const props = propertiesRes.data || [];
        setPropertiesList(props);

        if (props.length > 0) {
          const activeId = profileRes.data?.property_id || props[0].id;
          const active = props.find((p: any) => p.id === activeId) || props[0];
          handleSelectProperty(active);
        } else {
          setIsCreatingNew(true);
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
    setGstNumber(prop.gst_number || '');
    setStateCode(prop.state_code || '');

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
    } catch (err) {
      console.error('Failed to sync active property to profiles table:', err);
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
        handleSelectProperty(newProp);
        setSuccessMessage('Property created successfully!');
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
            ? { ...p, name: propertyName, address: propertyAddress, city: propertyCity, country: propertyCountry, gst_number: gstNumber, state_code: stateCode }
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'PG', title: '🏢 PG (Co-Living Mode)', desc: 'Monthly Tenant Directory, Bed-sharing (2-5), No Night Audits required.' },
                        { id: 'Hotel', title: '🏨 Hotel (Daily Mode)', desc: 'Daily room tariffs, Check-in/out, Folios, Nightly Audit engine.' },
                        { id: 'Hybrid', title: '🏨🏢 Hotel & PG (Hybrid)', desc: 'Dual-mode: Switch seamlessly between daily guests and monthly residents.' }
                      ].map(cat => (
                        <div
                          key={cat.id}
                          onClick={() => setPropertyCategory(cat.id as any)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            propertyCategory === cat.id
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-md'
                              : 'bg-black/40 border-white/[0.05] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <p className="text-xs font-bold">{cat.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{cat.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

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
      </main>
    </div>
  );
}
