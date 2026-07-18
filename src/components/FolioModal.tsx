"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, CreditCard, Banknote, Smartphone, Building2, 
  ArrowRight, ShieldCheck, Loader2, AlertCircle, Printer, Trash2, Percent, Sparkles, CalendarDays, Edit2,
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getFolioSummary, postIncidentalCharge, postPayment, postProposedTimeCharge, waiveProposedTimeCharge, voidPayment, deleteIncidentalCharge, deleteSecurityDeposit, forceSettleFolio, updateMonthlyRate } from '@/app/actions/folio';
import { checkOutGuest, undoCheckOutGuest, applyBookingDiscount } from '@/app/actions/booking';
import { extendBookingStay } from '@/app/actions/night-audit';
import { generateGuestBillPDF, generateDailyItemizedLedgerPDF } from '@/utils/folio-pdf';

interface FolioModalProps {
  bookingId: string;
  propertyId: string;
  guestName: string;
  roomId: string; // The UUID required for the database update
  roomNumber: string; // The string for display purposes
  baseAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function FolioModal({ bookingId, propertyId, guestName, roomId, roomNumber, baseAmount, onClose, onSuccess }: FolioModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [folio, setFolio] = useState<any>(null);

  const hasEarlyCheckinPosted = folio?.incidentals?.some((item: any) => 
    item.description.toLowerCase().includes('early check-in') || 
    item.description.toLowerCase().includes('early checkin') ||
    item.description.toLowerCase().includes('automated early check-in fee')
  ) || false;

  const hasLateCheckoutPosted = folio?.incidentals?.some((item: any) => 
    item.description.toLowerCase().includes('late checkout') || 
    item.description.toLowerCase().includes('late check-out') ||
    item.description.toLowerCase().includes('automated late checkout fee')
  ) || false;
  
  // Waiver inputs for automated rules
  const [showWaiver, setShowWaiver] = useState<'early' | 'late' | null>(null);
  const [waiverReasonText, setWaiverReasonText] = useState('');
  
  // UI Tabs for forms
  const [activeTab, setActiveTab] = useState<'summary' | 'charge' | 'payment' | 'discount'>('summary');
  
  // Track selected payment method
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isPrepaid, setIsPrepaid] = useState(false);
  const [paymentAllocation, setPaymentAllocation] = useState('Rent');

  // Post charge dropdown states
  const [chargeCategory, setChargeCategory] = useState('Food & Water');
  const [customDescription, setCustomDescription] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Discount states
  const [discountVal, setDiscountVal] = useState('');
  const [discountReasonText, setDiscountReasonText] = useState('');

  // Extend stay states
  const [showExtensionInput, setShowExtensionInput] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');

  // Edit monthly rent rate states
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRateVal, setNewRateVal] = useState('');

  const handleSaveRentRate = async () => {
    if (actionLoading) return;
    const rate = parseFloat(newRateVal);
    if (isNaN(rate) || rate <= 0) {
      alert("Please enter a valid monthly rent rate.");
      return;
    }
    setActionLoading(true);
    const res = await updateMonthlyRate(bookingId, propertyId, rate);
    if (res.error) {
      alert(res.error);
    } else {
      await loadFolio();
      setIsEditingRate(false);
    }
    setActionLoading(false);
  };

  const loadFolio = async () => {
    setLoading(true);
    setError('');
    const res = await getFolioSummary(bookingId);
    if (res.error) {
      setError(res.error);
    } else {
      setFolio(res.data);
      if (res.data?.isMonthly) {
        setChargeCategory('Room Rent');
      } else {
        setChargeCategory('Food & Water');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFolio();
  }, [bookingId]);

  const handleApplyProposedCharge = async (type: 'early' | 'late', amount: number) => {
    setActionLoading(true);
    setError('');
    const description = type === 'early' ? 'Automated Early Check-In Fee' : 'Automated Late Checkout Fee';
    const res = await postProposedTimeCharge(bookingId, propertyId, description, amount);
    if (res.error) {
      setError(res.error);
    } else {
      await loadFolio();
    }
    setActionLoading(false);
  };

  const handleConfirmWaiver = async (type: 'early' | 'late') => {
    if (!waiverReasonText.trim()) {
      setError('Please specify a waiver reason.');
      return;
    }
    setActionLoading(true);
    setError('');
    const description = type === 'early' ? 'Early Check-In Fee' : 'Late Checkout Fee';
    const res = await waiveProposedTimeCharge(bookingId, propertyId, description, waiverReasonText);
    if (res.error) {
      setError(res.error);
    } else {
      setWaiverReasonText('');
      setShowWaiver(null);
      await loadFolio();
    }
    setActionLoading(false);
  };

  const handlePostCharge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (actionLoading) return;
    setActionLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    formData.append('bookingId', bookingId);
    formData.append('propertyId', propertyId);

    // Dynamically set description from category selection
    let finalDescription = chargeCategory === 'Others' ? customDescription.trim() : chargeCategory;
    if (!finalDescription) {
      setError('Please provide a description or select a category.');
      setActionLoading(false);
      return;
    }

    const finalDescLower = finalDescription.toLowerCase();
    if (
      (finalDescLower.includes('early check-in') || finalDescLower.includes('early checkin')) &&
      hasEarlyCheckinPosted
    ) {
      setError('An Early Check-In charge has already been recorded for this booking. Multiple entries are not allowed.');
      setActionLoading(false);
      return;
    }

    if (
      (finalDescLower.includes('late checkout') || finalDescLower.includes('late check-out')) &&
      hasLateCheckoutPosted
    ) {
      setError('A Late Checkout charge has already been recorded for this booking. Multiple entries are not allowed.');
      setActionLoading(false);
      return;
    }
    
    // Append quantity manually if greater than 1
    if (quantity > 1) {
      finalDescription = `${finalDescription} (Qty: ${quantity})`;
    }
    
    formData.set('description', finalDescription);
    
    const res = await postIncidentalCharge(formData);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActiveTab('summary');
      setChargeCategory('Food & Water');
      setCustomDescription('');
      setQuantity(1); // Reset quantity
      setActionLoading(false);
    }
  };

  const handlePostPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (actionLoading) return;
    setActionLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    formData.append('bookingId', bookingId);
    formData.append('propertyId', propertyId);

    const selectedMethod = formData.get('method') as string;
    if (selectedMethod === 'Others') {
      const customVal = formData.get('customMethod') as string;
      if (!customVal || !customVal.trim()) {
        setError('Please enter a custom payment method.');
        setActionLoading(false);
        return;
      }
      formData.set('method', customVal.trim());
    }
    
    const res = await postPayment(formData);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActiveTab('summary');
      setPaymentMethod('UPI'); // Reset to default
      setIsPrepaid(false); // Reset prepaid toggle
      setPaymentAllocation('Rent'); // Reset allocation to Rent
      setActionLoading(false);
    }
  };

  const handleVoidPayment = async (paymentId: string) => {
    if (actionLoading) return;
    const reason = prompt("Enter reason for voiding this payment:");
    if (reason === null) return; // user cancelled
    if (!reason.trim()) {
      alert("A void reason is required.");
      return;
    }

    setActionLoading(true);
    setError('');

    const res = await voidPayment(paymentId, propertyId, reason);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActionLoading(false);
    }
  };

  const handleDeleteIncidental = async (chargeId: string) => {
    if (actionLoading) return;
    if (!confirm("Are you sure you want to delete this incidental charge entry? This action cannot be undone.")) return;

    setActionLoading(true);
    setError('');

    const res = await deleteIncidentalCharge(chargeId, propertyId);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActionLoading(false);
    }
  };

  const handleDeleteSecurityDeposit = async () => {
    if (actionLoading) return;
    if (!confirm("Are you sure you want to delete the security deposit / advance payment for this booking? This will set the security deposit to ₹0.00 and cannot be undone.")) return;

    setActionLoading(true);
    setError('');

    const res = await deleteSecurityDeposit(bookingId, propertyId);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActionLoading(false);
    }
  };

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    if (!discountVal || isNaN(Number(discountVal))) {
      setError("Please enter a valid numeric discount amount.");
      return;
    }

    const discountAmount = Number(discountVal);
    if (discountAmount < 0) {
      setError("Discount amount cannot be negative.");
      return;
    }

    if (!discountReasonText.trim()) {
      setError("A discount authorization reason is required.");
      return;
    }

    setActionLoading(true);
    setError('');

    const res = await applyBookingDiscount(bookingId, discountAmount, discountReasonText);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setDiscountVal('');
      setDiscountReasonText('');
      setActiveTab('summary');
      setActionLoading(false);
    }
  };

  const handleFinalCheckout = async () => {
    if ((folio?.balanceDue || 0) > 0.01) {
      setError('Cannot checkout with a non-zero balance. Please settle the folio first.');
      return;
    }
    
    if (actionLoading) return;
    setActionLoading(true);
    setError('');
    
    const res = await checkOutGuest(bookingId, roomId);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      onSuccess();
    }
  };

  const handleForceSettle = async () => {
    const formattedBalance = Math.abs(folio?.balanceDue || 0).toFixed(2);
    const actionText = (folio?.balanceDue || 0) > 0 ? "post a write-off adjustment payment" : "post a settlement adjustment charge";
    
    if (!confirm(`Are you sure you want to force settle the folio balance of ₹${(folio?.balanceDue || 0).toFixed(2)} to ₹0.00? This will ${actionText} to balance the ledger. This cannot be undone.`)) return;

    if (actionLoading) return;
    setActionLoading(true);
    setError('');

    const res = await forceSettleFolio(bookingId, propertyId);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      await loadFolio();
      setActionLoading(false);
    }
  };

  const handleUndoCheckout = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setError('');
    
    const res = await undoCheckOutGuest(bookingId, roomId);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      onSuccess();
    }
  };

  const handleExtendStay = async () => {
    if (!extensionDate) return;
    if (actionLoading) return;
    setActionLoading(true);
    setError('');

    const res = await extendBookingStay(bookingId, extensionDate);
    if (res.error) {
      setError(res.error);
      setActionLoading(false);
    } else {
      setShowExtensionInput(false);
      await loadFolio();
      setActionLoading(false);
      if (onSuccess) onSuccess();
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
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto">
            
            {/* Left Sidebar - Navigation & Summary */}
            <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/5 p-4 lg:p-6 flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 bg-[#0f0f11] lg:bg-transparent">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`p-3 rounded-xl text-left transition-colors sm:flex-1 lg:flex-none ${activeTab === 'summary' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-1">
                  {folio?.isMonthly ? "Total Outstanding" : "Folio Ledger"}
                </div>
                <div className="text-2xl font-bold text-white">
                  ₹{(() => {
                    const depositDue = folio?.isMonthly ? Math.max(0, (folio.securityDepositRequired || 0) - (folio.securityDepositPaid || 0)) : 0;
                    return ((folio?.balanceDue || 0) + depositDue).toFixed(2);
                  })()}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  {folio?.isMonthly ? (
                    <>
                      Rent Due: <span className="font-bold text-zinc-300">₹{folio.balanceDue.toFixed(2)}</span>
                      <br />
                      Deposit Due: <span className="font-bold text-zinc-300">₹{Math.max(0, (folio.securityDepositRequired || 0) - (folio.securityDepositPaid || 0)).toFixed(2)}</span>
                    </>
                  ) : (
                    "Balance Due"
                  )}
                </div>
              </button>

              <div className="hidden lg:block h-px bg-white/5 my-4" />

              {/* Tabs selector grid on mobile, flex on desktop */}
              <div className="grid grid-cols-3 lg:flex lg:flex-col gap-2 w-full">
                <button 
                  onClick={() => setActiveTab('charge')}
                  className={`p-3 rounded-xl text-[11px] sm:text-sm font-medium text-center lg:text-left flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 transition-colors ${activeTab === 'charge' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Plus size={16} /> Post Charge
                </button>
                <button 
                  onClick={() => setActiveTab('payment')}
                  className={`p-3 rounded-xl text-[11px] sm:text-sm font-medium text-center lg:text-left flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 transition-colors ${activeTab === 'payment' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Banknote size={16} /> Log Payment
                </button>
                <button 
                  onClick={() => setActiveTab('discount')}
                  className={`p-3 rounded-xl text-[11px] sm:text-sm font-medium text-center lg:text-left flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 transition-colors ${activeTab === 'discount' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Percent size={16} /> Apply Discount
                </button>
              </div>

              <div className="hidden lg:flex sm:mt-0 lg:mt-auto pt-4 sm:pt-0 lg:pt-6 sm:ml-auto lg:ml-0 shrink-0 flex-col gap-2">
                <button
                  onClick={async () => {
                    if (!folio) return;
                    await generateGuestBillPDF(folio);
                  }}
                  disabled={actionLoading || !folio}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                >
                  <Printer size={16} /> Print / Download Bill
                </button>

                {!folio?.isMonthly && (
                  <button
                    onClick={async () => {
                      if (!folio) return;
                      await generateDailyItemizedLedgerPDF(folio);
                    }}
                    disabled={actionLoading || !folio}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <FileText size={16} /> Print Daily Ledger
                  </button>
                )}

                {folio?.bookingStatus === 'Checked Out' && (
                  <button
                    onClick={handleUndoCheckout}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><X size={16} /> Revert Checkout</>}
                  </button>
                )}

                {folio?.bookingStatus === 'Checked In' && (
                  <button
                    onClick={handleFinalCheckout}
                    disabled={(folio?.balanceDue || 0) > 0.01 || actionLoading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Checkout Guest</>}
                  </button>
                )}

                {folio?.bookingStatus === 'Checked In' && Math.abs(folio?.balanceDue || 0) > 0.01 && (
                  <button
                    onClick={handleForceSettle}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 rounded-xl bg-red-600/90 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Force Settle Folio</>}
                  </button>
                )}

                {folio?.bookingStatus === 'Confirmed' && (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px] uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                    <AlertCircle size={12} /> Upcoming Booking / Pre-Arrival
                  </div>
                )}

                {(folio?.bookingStatus === 'Checked In' || folio?.bookingStatus === 'Confirmed') && !showExtensionInput && (
                  <button
                    onClick={() => {
                      setExtensionDate(folio?.checkOut?.split('T')[0] || '');
                      setShowExtensionInput(true);
                    }}
                    disabled={actionLoading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    <CalendarDays size={16} /> Extend Stay
                  </button>
                )}

                {showExtensionInput && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl mt-2 flex flex-col gap-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">New Checkout Date</label>
                    <input
                      type="date"
                      value={extensionDate}
                      min={folio?.checkOut ? folio.checkOut.split('T')[0] : undefined}
                      onChange={(e) => setExtensionDate(e.target.value)}
                      className="bg-zinc-950 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowExtensionInput(false)}
                        className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExtendStay}
                        disabled={actionLoading || !extensionDate || extensionDate === folio?.checkOut?.split('T')[0]}
                        className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors flex items-center justify-center gap-1"
                      >
                        {actionLoading ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#0a0a0c]/50">
              <AnimatePresence mode="wait">
                {activeTab === 'summary' && (
                  <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    
                    {/* Automated Time Rule Recommendation Banner */}
                    {((folio?.proposedLateCheckoutFee > 0 || folio?.proposedEarlyCheckinFee > 0) && !loading && !folio?.isMonthly) && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
                            <AlertCircle size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-white tracking-wide">Automated Billing Recommendation</h4>
                            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                              {folio?.proposedLateCheckoutFee > 0 ? (
                                <>
                                  Late Checkout detected. Standard checkout is **{folio.standardHours?.checkOut || '11:00 AM'}**. 
                                  Proposed Fee: <span className="text-indigo-400 font-bold font-mono text-sm">₹{folio.proposedLateCheckoutFee.toFixed(2)}</span> *(Based on 50% room rate rules)*.
                                </>
                              ) : (
                                <>
                                  Early Check-In detected. Standard check-in is **{folio.standardHours?.checkIn || '2:00 PM'}**.
                                  Proposed Fee: <span className="text-indigo-400 font-bold font-mono text-sm">₹{folio.proposedEarlyCheckinFee.toFixed(2)}</span> *(Based on early arrival tiers)*.
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {showWaiver ? (
                          <div className="pl-12 space-y-3.5 max-w-md">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Waiver Reason</label>
                              <input 
                                type="text"
                                value={waiverReasonText}
                                onChange={(e) => setWaiverReasonText(e.target.value)}
                                placeholder="e.g. VIP guest, room readiness delay..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleConfirmWaiver(showWaiver)}
                                disabled={actionLoading}
                                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                Confirm Waive
                              </button>
                              <button 
                                onClick={() => { setShowWaiver(null); setWaiverReasonText(''); }}
                                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pl-12 flex gap-2">
                            <button 
                              onClick={() => handleApplyProposedCharge(
                                folio?.proposedLateCheckoutFee > 0 ? 'late' : 'early',
                                folio?.proposedLateCheckoutFee > 0 ? folio.proposedLateCheckoutFee : folio.proposedEarlyCheckinFee
                              )}
                              disabled={actionLoading}
                              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Post Charge
                            </button>
                            <button 
                              onClick={() => setShowWaiver(folio?.proposedLateCheckoutFee > 0 ? 'late' : 'early')}
                              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Waive Fee
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {folio?.isMonthly && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Security Deposit Ledger Card */}
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                            Security Deposit Ledger
                          </span>
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Deposit Required:</span>
                              <span className="font-mono text-zinc-300">₹{(folio.securityDepositRequired || 0).toFixed(2)}</span>
                            </div>

                            {/* Manual Deposit Charges list */}
                            {(() => {
                              const depCharges = folio.securityDepositCharges || [];
                              if (depCharges.length > 0) {
                                return (
                                  <div className="pl-3 space-y-1 my-1">
                                    {depCharges.map((item: any) => (
                                      <div key={item.id} className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                        <span>Manual Charge:</span>
                                        <div className="flex items-center gap-1.5">
                                          <span>₹{Number(item.amount).toFixed(2)}</span>
                                          <button 
                                            onClick={() => handleDeleteIncidental(item.id)}
                                            className="p-0.5 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Delete Deposit Charge"
                                            disabled={actionLoading}
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Deposit Paid:</span>
                              <span className="font-mono text-emerald-400">₹{(folio.securityDepositPaid || 0).toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-white/5 my-1" />
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-white">Deposit Balance Due:</span>
                              <span className="font-mono text-indigo-400">
                                ₹{Math.max(0, (folio.securityDepositRequired || 0) - (folio.securityDepositPaid || 0)).toFixed(2)}
                              </span>
                            </div>

                            {/* Deposit Payments History list */}
                            {(() => {
                              const depPays = folio.payments.filter((p: any) => p.allocation === 'Security Deposit' && !p.is_void);
                              if (depPays.length > 0) {
                                return (
                                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                                    <div className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Deposit Transactions</div>
                                    {depPays.map((p: any) => (
                                      <div key={p.id} className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 py-0.5 px-1.5 rounded-full">{p.method}</span>
                                          <span className="text-zinc-500">{p.business_date ? new Date(p.business_date).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span>-₹{Number(p.amount).toFixed(2)}</span>
                                          <button 
                                            onClick={() => handleVoidPayment(p.id)}
                                            className="p-0.5 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Void Deposit Payment"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        {/* Room Rent & Incidentals Ledger Card */}
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            Rent & Incidentals Ledger
                          </span>
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Rent + Incidentals Charges:</span>
                              <span className="font-mono text-zinc-300">₹{(folio.rentChargesSum || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Rent + Incidentals Paid:</span>
                              <span className="font-mono text-emerald-400">₹{(folio.rentPaid || 0).toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-white/5 my-1" />
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-white">Rent Balance Due:</span>
                              <span className="font-mono text-emerald-400">
                                ₹{Math.max(0, (folio.rentChargesSum || 0) - (folio.rentPaid || 0)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Charges Column */}
                      <div>
                        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4">Room Charges</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <div>
                              <div className="text-sm font-medium text-white">{folio?.discountAmount > 0 ? 'Room Rate (Original)' : 'Room Rate'}</div>
                              <div className="text-[10px] text-zinc-500">Base Accommodation</div>
                            </div>
                            {isEditingRate ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  value={newRateVal} 
                                  onChange={(e) => setNewRateVal(e.target.value)}
                                  className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                                  placeholder="0.00"
                                />
                                <button 
                                  onClick={handleSaveRentRate}
                                  className="text-[10px] text-emerald-400 font-bold uppercase hover:underline"
                                  disabled={actionLoading}
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setIsEditingRate(false)}
                                  className="text-[10px] text-zinc-500 font-bold uppercase hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="font-mono text-sm text-white">₹{(folio?.roomAmount + (folio?.discountAmount || 0))?.toFixed(2)}</div>
                                {folio?.isMonthly && (
                                  <button 
                                    onClick={() => { setIsEditingRate(true); setNewRateVal((folio?.roomAmount + (folio?.discountAmount || 0)).toString()); }}
                                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                    title="Edit Monthly Rent Rate"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {folio?.discountAmount > 0 && (
                            <div className="flex justify-between items-center p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                              <div>
                                <div className="text-sm font-bold">Applied Discount</div>
                                <div className="text-[10px] text-zinc-400">{folio?.discountReason || 'Staff discretionary discount'}</div>
                              </div>
                              <div className="font-mono text-sm font-bold">-₹{folio?.discountAmount?.toFixed(2)}</div>
                            </div>
                          )}
                          
                           {folio?.incidentals?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                              <div>
                                <div className="text-sm font-medium text-white">{item.description}</div>
                                <div className="text-[10px] text-zinc-500">
                                  {item.business_date ? `${new Date(item.business_date).toLocaleDateString()} • ` : ''}
                                  Incidental
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="font-mono text-sm text-white">₹{Number(item.amount).toFixed(2)}</div>
                                {item.id === 'security-deposit-charge' ? (
                                  <button 
                                    onClick={handleDeleteSecurityDeposit}
                                    className="p-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete Security Deposit"
                                    disabled={actionLoading}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleDeleteIncidental(item.id)}
                                    className="p-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete Charge"
                                    disabled={actionLoading}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                          <span className="text-xs text-zinc-500 font-bold uppercase">
                            {folio?.isMonthly ? "Total Rent & Charges" : "Total Charges"}
                          </span>
                          <span className="font-mono font-bold text-white">₹{folio?.totalCharges?.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payments Column */}
                      <div>
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Payments Received</h3>
                        <div className="space-y-3">
                          {(() => {
                            const paymentsToShow = folio?.isMonthly 
                              ? folio.payments.filter((item: any) => item.allocation === 'Rent' || !item.allocation)
                              : folio.payments;

                            if (paymentsToShow.length === 0) {
                              return (
                                <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-zinc-500 text-xs font-medium">
                                  No payments recorded
                                </div>
                              );
                            }

                            return paymentsToShow.map((item: any) => (
                              <div 
                                key={item.id} 
                                className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                                  item.is_void 
                                    ? "bg-red-500/5 border-red-500/10 opacity-60" 
                                    : "bg-emerald-500/5 border-emerald-500/20"
                                }`}
                              >
                                <div>
                                  <div className={`text-sm font-medium ${item.is_void ? "text-zinc-500 line-through" : "text-emerald-400"}`}>
                                    {item.method} {item.is_void && "(Voided)"}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {item.business_date ? new Date(item.business_date).toLocaleDateString() : new Date(item.created_at).toLocaleDateString()}
                                    {item.billing_period && ` • Cycle: ${item.billing_period}`}
                                    {folio?.isMonthly && ` • Allocated to: ${item.allocation || 'Rent'}`}
                                    {item.is_void && ` • Reason: ${item.void_reason}`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className={`font-mono text-sm ${item.is_void ? "text-zinc-500 line-through" : "text-emerald-400"}`}>
                                    -₹{Number(item.amount).toFixed(2)}
                                  </div>
                                  {!item.is_void && (
                                    <button 
                                      onClick={() => handleVoidPayment(item.id)}
                                      className="p-1 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                      title="Void Payment"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                          <span className="text-xs text-zinc-500 font-bold uppercase">Total Paid</span>
                          <span className="font-mono font-bold text-emerald-400">-₹{folio?.totalPayments?.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Mobile Action Buttons (visible only on mobile/tablet) */}
                      <div className="lg:hidden flex flex-col gap-2 mt-6 border-t border-white/5 pt-6">
                        <button
                          onClick={async () => {
                            if (!folio) return;
                            await generateGuestBillPDF(folio);
                          }}
                          disabled={actionLoading || !folio}
                          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                        >
                          <Printer size={16} /> Print / Download Bill
                        </button>

                        {!folio?.isMonthly && (
                          <button
                            onClick={async () => {
                              if (!folio) return;
                              await generateDailyItemizedLedgerPDF(folio);
                            }}
                            disabled={actionLoading || !folio}
                            className="w-full py-3.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
                          >
                            <FileText size={16} /> Print Daily Ledger
                          </button>
                        )}

                        {folio?.bookingStatus === 'Checked Out' && (
                          <button
                            onClick={handleUndoCheckout}
                            disabled={actionLoading}
                            className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><X size={16} /> Revert Checkout</>}
                          </button>
                        )}

                        {folio?.bookingStatus === 'Checked In' && (
                          <button
                            onClick={handleFinalCheckout}
                            disabled={(folio?.balanceDue || 0) > 0.01 || actionLoading}
                            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Checkout Guest</>}
                          </button>
                        )}

                        {folio?.bookingStatus === 'Checked In' && Math.abs(folio?.balanceDue || 0) > 0.01 && (
                          <button
                            onClick={handleForceSettle}
                            disabled={actionLoading}
                            className="w-full py-3.5 px-4 rounded-xl bg-red-600/90 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 mt-2"
                          >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Force Settle Folio</>}
                          </button>
                        )}

                        {folio?.bookingStatus === 'Confirmed' && (
                          <div className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px] uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                            <AlertCircle size={12} /> Upcoming Booking / Pre-Arrival
                          </div>
                        )}

                        {(folio?.bookingStatus === 'Checked In' || folio?.bookingStatus === 'Confirmed') && !showExtensionInput && (
                          <button
                            onClick={() => {
                              setExtensionDate(folio?.checkOut?.split('T')[0] || '');
                              setShowExtensionInput(true);
                            }}
                            disabled={actionLoading}
                            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 mt-2"
                          >
                            <CalendarDays size={16} /> Extend Stay
                          </button>
                        )}

                        {showExtensionInput && (
                          <div className="p-3 bg-white/5 border border-white/10 rounded-xl mt-2 flex flex-col gap-2">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">New Checkout Date</label>
                            <input
                              type="date"
                              value={extensionDate}
                              min={folio?.checkOut ? folio.checkOut.split('T')[0] : undefined}
                              onChange={(e) => setExtensionDate(e.target.value)}
                              className="bg-zinc-950 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowExtensionInput(false)}
                                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleExtendStay}
                                disabled={actionLoading || !extensionDate || extensionDate === folio?.checkOut?.split('T')[0]}
                                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors flex items-center justify-center gap-1"
                              >
                                {actionLoading ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                              </button>
                            </div>
                          </div>
                        )}
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
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Charge Category</label>
                          <select 
                            value={chargeCategory}
                            onChange={(e) => setChargeCategory(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                          >
                            {folio?.isMonthly ? (
                              <>
                                <option value="Room Rent" className="bg-zinc-900 text-white">Room Rent</option>
                                <option value="Security Deposit" className="bg-zinc-900 text-white">Security Deposit</option>
                                <option value="Food & Water Charges" className="bg-zinc-900 text-white">Food & Water Charges</option>
                                <option value="Other Utilities" className="bg-zinc-900 text-white">Other Utilities</option>
                                <option value="Others" className="bg-zinc-900 text-white">Others</option>
                              </>
                            ) : (
                              <>
                                <option value="Food & Water" className="bg-zinc-900 text-white">Food & Water</option>
                                <option 
                                  value="Late Checkout" 
                                  className="bg-zinc-900 text-white disabled:text-zinc-500 disabled:opacity-55"
                                  disabled={hasLateCheckoutPosted}
                                >
                                  Late Checkout {hasLateCheckoutPosted && '(Already Recorded)'}
                                </option>
                                <option 
                                  value="Early Check-In" 
                                  className="bg-zinc-900 text-white disabled:text-zinc-500 disabled:opacity-55"
                                  disabled={hasEarlyCheckinPosted}
                                >
                                  Early Check-In {hasEarlyCheckinPosted && '(Already Recorded)'}
                                </option>
                                <option value="Extra Person Charge" className="bg-zinc-900 text-white">Extra Person Charge</option>
                                <option value="Previous Stay Past Due" className="bg-zinc-900 text-white">Previous Stay Pending Dues</option>
                                <option value="Others" className="bg-zinc-900 text-white">Others</option>
                              </>
                            )}
                          </select>
                        </div>

                        {chargeCategory === 'Others' && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Custom Description</label>
                            <input 
                              type="text" required placeholder="e.g. Minibar, Laundry, Damages"
                              value={customDescription}
                              onChange={(e) => setCustomDescription(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Quantity</label>
                            <input 
                              type="number" min="1" required value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
                        <p className="text-xs text-zinc-400 mt-1">Record a payment received from the guest to settle the folio. For split/combination payments (e.g. Cash + UPI), simply log each payment amount separately.</p>
                      </div>
                      
                      <form onSubmit={handlePostPayment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Payment Method</label>
                            <select 
                              name="method" 
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                              <option value="UPI">UPI / PhonePe</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="SWIPE">SWIPE</option>
                              <option value="Cash">Cash</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="OTA Pre-Paid">OTA Pre-Paid</option>
                              <option value="Others">Others (Custom Mode)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Amount (₹)</label>
                            <input 
                              key={`${folio?.balanceDue}-${paymentAllocation}`}
                              name="amount" type="number" step="0.01" required min="1" 
                              defaultValue={(() => {
                                if (paymentAllocation === 'Security Deposit') {
                                  const depDue = Math.max(0, (folio.securityDepositRequired || 0) - (folio.securityDepositPaid || 0));
                                  return depDue > 0 ? depDue.toFixed(2) : '';
                                }
                                return folio?.balanceDue > 0 ? folio.balanceDue.toFixed(2) : '';
                              })()}
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>

                        {paymentMethod === 'Others' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1.5 mt-2"
                          >
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Custom Payment Mode</label>
                            <input 
                              name="customMethod" 
                              type="text" 
                              required 
                              placeholder="e.g. GooglePay personal, xyz"
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </motion.div>
                        )}

                        {folio?.isMonthly && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Payment Allocation</label>
                              <select 
                                name="allocation" 
                                value={paymentAllocation}
                                onChange={(e) => setPaymentAllocation(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                              >
                                <option value="Rent">Room Rent & Incidentals</option>
                                <option value="Security Deposit">Security Deposit</option>
                              </select>
                            </div>

                            {paymentAllocation === 'Rent' && (
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Billing Cycle Period</label>
                                <select 
                                  name="billingPeriod" 
                                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                  <option value="">Not Applicable / General Rent</option>
                                  {(() => {
                                    const checkInStr = folio?.checkIn;
                                    const busDateStr = folio?.businessDate || new Date().toISOString().substring(0, 10);
                                    if (!checkInStr) return null;

                                    const base = new Date(checkInStr);
                                    const currentBusiness = new Date(busDateStr);
                                    
                                    const options = [];
                                    // Generate 4 cycles: past, current, and upcoming
                                    for (let i = -1; i <= 2; i++) {
                                      const start = new Date(base);
                                      start.setMonth(base.getMonth() + i);
                                      const end = new Date(base);
                                      end.setMonth(base.getMonth() + i + 1);

                                      // Format as DD MMM YYYY
                                      const startFormatted = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                      const endFormatted = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                      const periodVal = `${startFormatted} to ${endFormatted}`;

                                      // Determine tag relative to current business date
                                      let tag = "";
                                      if (currentBusiness >= start && currentBusiness < end) {
                                        tag = " (Current Cycle)";
                                      } else if (currentBusiness >= end) {
                                        tag = " (Past Cycle)";
                                      } else if (currentBusiness < start) {
                                        tag = " (Upcoming Cycle)";
                                      }

                                      options.push(
                                        <option key={i} value={periodVal}>
                                          {periodVal}{tag}
                                        </option>
                                      );
                                    }
                                    return options;
                                  })()}
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                            {folio?.isMonthly ? "Transaction No / Bill No" : "Transaction ID (Optional)"}
                          </label>
                          <input 
                            name="transactionId" 
                            type="text" 
                            placeholder={folio?.isMonthly ? "e.g. BILL-102 or UPI Transaction ID" : "e.g. txn_12345"}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-2.5 py-1 px-1">
                          <input 
                            type="checkbox" 
                            id="isPrepaid"
                            checked={isPrepaid}
                            onChange={(e) => setIsPrepaid(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <label htmlFor="isPrepaid" className="text-xs font-medium text-zinc-400 cursor-pointer hover:text-white select-none transition-colors">
                            Prepaid / Advance Payment Received
                          </label>
                        </div>

                        <AnimatePresence>
                          {isPrepaid && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1.5 pt-2 border-t border-white/5 overflow-hidden"
                            >
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Payment Receipt Date (Prepaid Date)</label>
                              <input 
                                name="businessDate" 
                                type="date" 
                                required
                                defaultValue={folio?.businessDate || new Date().toISOString().substring(0, 10)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                              />
                              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                                Specifying the prepaid receipt date ensures this payment is accounted for on the correct day in your PMS accounting reports, matching your physical bank statement.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <button disabled={actionLoading} type="submit" className="w-full bg-emerald-500 text-black font-bold uppercase tracking-wider text-xs py-3 rounded-xl mt-4 hover:bg-emerald-400 transition-colors flex justify-center">
                          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Payment'}
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'discount' && (
                  <motion.div key="discount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                     <div className="max-w-md mx-auto">
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Apply Tariff Discount</h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Apply a discount to the room tariff. This will reduce the total taxable room charges and recalculate the balance due in real-time.
                        </p>
                      </div>

                      {folio?.discountAmount > 0 && (
                        <div className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-400">
                          Current Discount Applied: <span className="font-bold font-mono">₹{folio.discountAmount.toFixed(2)}</span>
                          {folio.discountReason && (
                            <p className="mt-1 text-[10px] text-zinc-400">Reason: {folio.discountReason}</p>
                          )}
                        </div>
                      )}
                      
                      <form onSubmit={handleApplyDiscount} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Discount Amount (₹)</label>
                          <input 
                            type="number" step="0.01" min="0" required placeholder="0.00"
                            value={discountVal}
                            onChange={(e) => setDiscountVal(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Reason / Authorization</label>
                          <input 
                            type="text" required placeholder="e.g. Service Recovery - AC issue, negotiated rate"
                            value={discountReasonText}
                            onChange={(e) => setDiscountReasonText(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>

                        <button disabled={actionLoading} type="submit" className="w-full bg-indigo-600 text-white font-bold uppercase tracking-wider text-xs py-3 rounded-xl mt-4 hover:bg-indigo-500 transition-colors flex justify-center">
                          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Apply Discount'}
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
