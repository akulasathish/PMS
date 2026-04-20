"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, CreditCard, Banknote, Smartphone, Building2, 
  ArrowRight, ShieldCheck, Loader2, AlertCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getFolioSummary, postIncidentalCharge, postPayment } from '@/app/actions/folio';
import { checkOutGuest } from '@/app/actions/booking';

interface FolioModalProps {
  bookingId: string;
  propertyId: string;
  guestName: string;
  roomNumber: string;
  baseAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function FolioModal({ bookingId, propertyId, guestName, roomNumber, baseAmount, onClose, onSuccess }: FolioModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [folio, setFolio] = useState<any>(null);
  
  // UI Tabs for forms
  const [activeTab, setActiveTab] = useState<'summary' | 'charge' | 'payment'>('summary');

  const loadFolio = async () => {
    setLoading(true);
    setError('');
    const res = await getFolioSummary(bookingId);
    if (res.error) {
      setError(res.error);
    } else {
      setFolio(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFolio();
  }, [bookingId]);

  const handlePostCharge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    formData.append('bookingId', bookingId);
    formData.append('propertyId', propertyId);
    
    const res = await postIncidentalCharge(formData);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActiveTab('summary');
      setActionLoading(false);
    }
  };

  const handlePostPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    formData.append('bookingId', bookingId);
    formData.append('propertyId', propertyId);
    
    const res = await postPayment(formData);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActiveTab('summary');
      setActionLoading(false);
    }
  };

  const handleFinalCheckout = async () => {
    if (Math.abs(folio?.balanceDue || 0) > 0.01) {
      setError('Cannot checkout with a non-zero balance. Please settle the folio first.');
      return;
    }
    
    setActionLoading(true);
    setError('');
    
    const res = await checkOutGuest(bookingId, roomNumber);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-4xl bg-[#121214] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Folio & Settlement</h2>
            <p className="text-xs text-zinc-500 mt-1">Guest: <span className="text-zinc-300 font-medium">{guestName}</span> • Room <span className="text-zinc-300 font-medium">{roomNumber}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm font-medium">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            
            {/* Left Sidebar - Navigation & Summary */}
            <div className="w-64 border-r border-white/5 p-6 flex flex-col gap-2">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`p-3 rounded-xl text-left transition-colors ${activeTab === 'summary' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Folio Ledger</div>
                <div className="text-2xl font-bold text-white">₹{folio?.balanceDue?.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Balance Due</div>
              </button>

              <div className="h-px bg-white/5 my-4" />

              <button 
                onClick={() => setActiveTab('charge')}
                className={`p-3 rounded-xl text-sm font-medium text-left flex items-center gap-3 transition-colors ${activeTab === 'charge' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Plus size={16} /> Post Charge
              </button>
              <button 
                onClick={() => setActiveTab('payment')}
                className={`p-3 rounded-xl text-sm font-medium text-left flex items-center gap-3 transition-colors ${activeTab === 'payment' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Banknote size={16} /> Log Payment
              </button>

              <div className="mt-auto pt-6">
                <button
                  onClick={handleFinalCheckout}
                  disabled={Math.abs(folio?.balanceDue || 0) > 0.01 || actionLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Checkout Guest</>}
                </button>
              </div>
            </div>

            {/* Right Side - Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#0a0a0c]/50">
              <AnimatePresence mode="wait">
                {activeTab === 'summary' && (
                  <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      
                      {/* Charges Column */}
                      <div>
                        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4">Room Charges</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <div>
                              <div className="text-sm font-medium text-white">Room Rate</div>
                              <div className="text-[10px] text-zinc-500">Base Accommodation</div>
                            </div>
                            <div className="font-mono text-sm text-white">₹{folio?.roomAmount?.toFixed(2)}</div>
                          </div>
                          
                          {folio?.incidentals?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                              <div>
                                <div className="text-sm font-medium text-white">{item.description}</div>
                                <div className="text-[10px] text-zinc-500">Incidental</div>
                              </div>
                              <div className="font-mono text-sm text-white">₹{Number(item.amount).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                          <span className="text-xs text-zinc-500 font-bold uppercase">Total Charges</span>
                          <span className="font-mono font-bold text-white">₹{folio?.totalCharges?.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payments Column */}
                      <div>
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Payments Received</h3>
                        <div className="space-y-3">
                          {folio?.payments?.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-zinc-500 text-xs font-medium">
                              No payments recorded
                            </div>
                          ) : (
                            folio?.payments?.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <div>
                                  <div className="text-sm font-medium text-emerald-400">{item.method}</div>
                                  <div className="text-[10px] text-emerald-500/70">{new Date(item.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="font-mono text-sm text-emerald-400">-₹{Number(item.amount).toFixed(2)}</div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                          <span className="text-xs text-zinc-500 font-bold uppercase">Total Paid</span>
                          <span className="font-mono font-bold text-emerald-400">-₹{folio?.totalPayments?.toFixed(2)}</span>
                        </div>
                      </div>
                      
                    </div>
                  </motion.div>
                )}

                {activeTab === 'charge' && (
                  <motion.div key="charge" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="max-w-md mx-auto">
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Post Incidental Charge</h3>
                        <p className="text-xs text-zinc-400 mt-1">Add items like minibar, laundry, or damages to the guest folio.</p>
                      </div>
                      
                      <form onSubmit={handlePostCharge} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Description</label>
                          <input 
                            name="description" type="text" required placeholder="e.g. Minibar - Water"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Amount (₹)</label>
                          <input 
                            name="amount" type="number" step="0.01" required min="1" placeholder="0.00"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <button disabled={actionLoading} type="submit" className="w-full bg-white text-black font-bold uppercase tracking-wider text-xs py-3 rounded-xl mt-4 hover:bg-zinc-200 transition-colors flex justify-center">
                          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Post Charge'}
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'payment' && (
                  <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                     <div className="max-w-md mx-auto">
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Log Payment</h3>
                        <p className="text-xs text-zinc-400 mt-1">Record a payment received from the guest to settle the folio.</p>
                      </div>
                      
                      <form onSubmit={handlePostPayment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Payment Method</label>
                            <select name="method" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                              <option value="UPI">UPI / QR Code</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="Cash">Cash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="OTA Pre-Paid">OTA Pre-Paid</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Amount (₹)</label>
                            <input 
                              name="amount" type="number" step="0.01" required min="1" 
                              defaultValue={folio?.balanceDue > 0 ? folio.balanceDue.toFixed(2) : ''}
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Transaction ID (Optional)</label>
                          <input 
                            name="transactionId" type="text" placeholder="e.g. txn_12345"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                          />
                        </div>
                        <button disabled={actionLoading} type="submit" className="w-full bg-emerald-500 text-black font-bold uppercase tracking-wider text-xs py-3 rounded-xl mt-4 hover:bg-emerald-400 transition-colors flex justify-center">
                          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Payment'}
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}
      </motion.div>
    </div>
  );
}

export default FolioModal;
