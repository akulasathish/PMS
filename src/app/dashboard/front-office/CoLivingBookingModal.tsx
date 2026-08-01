'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Bed, Calendar, User, Mail, Phone, DollarSign, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { createBooking } from '@/app/actions/booking';
import { Room, Booking } from '@/lib/types';

interface CoLivingBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  propertyId: string;
  rooms: Room[];
  bookings: Booking[];
  defaultRoomId?: string;
  businessDate?: string;
}

export default function CoLivingBookingModal({ isOpen, onClose, onSuccess, propertyId, rooms, bookings, defaultRoomId, businessDate }: CoLivingBookingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [step, setStep] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const getLocalYYYYMMDD = (d: Date) => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    } catch (e) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const todayStr = businessDate || getLocalYYYYMMDD(new Date());

  const getNextYearFromStr = (dateStr: string) => {
    const parts = dateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setFullYear(d.getFullYear() + 1);
    return getLocalYYYYMMDD(d);
  };
  const nextYearStr = getNextYearFromStr(todayStr);

  const [selectedCheckIn, setSelectedCheckIn] = useState(todayStr);
  const [selectedCheckOut, setSelectedCheckOut] = useState(nextYearStr); // Co-living defaults to 1 year/long-term
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [recordPrepaid, setRecordPrepaid] = useState(false);

  // Sync selectedRoomId when modal opens with a defaultRoomId
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRoomId(defaultRoomId || '');
      setStep(1);
      setGuestName('');
      setGuestPhone('');
      setError('');
    }
  }, [isOpen, defaultRoomId]);

  // Filter rooms (In PG mode, all rooms are available for monthly co-living)
  const monthlyRooms = rooms;

  // Compute vacancy/occupancy for rooms to help selection
  const getRoomOccupancyInfo = (room: Room) => {
    const activeGuests = bookings.filter(b => {
      if (b.room_id !== room.id) return false;
      if (b.status === 'Cancelled' || b.status === 'Checked Out') return false;
      
      // Check if dates overlap
      const bIn = b.check_in ? String(b.check_in).substring(0, 10) : '';
      const bOut = b.check_out ? String(b.check_out).substring(0, 10) : '';
      return bIn < selectedCheckOut && bOut > selectedCheckIn;
    });

    const currentCount = activeGuests.length;
    const capacity = (room as any).sharing_capacity || 2;
    const vacantCount = Math.max(0, capacity - currentCount);

    return {
      currentCount,
      capacity,
      vacantCount,
      isFull: vacantCount === 0,
      activeGuests
    };
  };

  if (!isOpen) return null;

  const handleSubmit = async (formData: FormData) => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    if (!selectedRoomId) {
      setError('Please select a room for co-living.');
      setIsLoading(false);
      return;
    }

    const roomInfo = getRoomOccupancyInfo(rooms.find(r => r.id === selectedRoomId)!);
    if (roomInfo.isFull) {
      setError('Selected room is already at full sharing capacity.');
      setIsLoading(false);
      return;
    }

    formData.append('propertyId', propertyId);
    formData.append('roomId', selectedRoomId);
    formData.append('isMonthly', 'true');
    formData.append('status', 'Checked In');

    const result = await createBooking(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/20">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bed size={18} className="text-indigo-400" />
            🏠 Add Tenant to Room
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Co-Living Guest Added</h3>
              <p className="text-sm text-zinc-400">Resident profile and shared room ledger created.</p>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              
              {/* Stepper progress headers */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-black ${
                    step >= 1 ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-550'
                  }`}>1</span>
                  <span className={step === 1 ? 'text-white' : 'text-zinc-500'}>Resident</span>
                </div>
                <div className="w-8 h-px bg-zinc-800" />
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-black ${
                    step >= 2 ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-550'
                  }`}>2</span>
                  <span className={step === 2 ? 'text-white' : 'text-zinc-500'}>Stay Info</span>
                </div>
                <div className="w-8 h-px bg-zinc-800" />
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-black ${
                    step >= 3 ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-550'
                  }`}>3</span>
                  <span className={step === 3 ? 'text-white' : 'text-zinc-500'}>Billing</span>
                </div>
              </div>

              {/* STEP 1: RESIDENT DETAILS */}
              <div className={step === 1 ? "space-y-4" : "hidden"}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Guest Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <User size={16} />
                    </div>
                    <input 
                      type="text" 
                      name="guestName"
                      required={step === 1}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Harsha or Saikumar"
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Guest Phone</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Phone size={16} />
                    </div>
                    <input 
                      type="tel" 
                      name="guestPhone"
                      required={step === 1}
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Guest Email (optional)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      name="guestEmail"
                      placeholder="rahul@example.com"
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Government ID Proof</label>
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Max 150 KB</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 150 * 1024) {
                          setError("ID Proof file size exceeds 150 KB limit. Please upload a compressed or smaller file (Max 150 KB).");
                          e.target.value = "";
                          return;
                        }
                        setError("");
                      }
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-white text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!guestName.trim() || !guestPhone.trim()) {
                      setError("Please fill out guest name and phone number.");
                      return;
                    }
                    setError("");
                    setStep(2);
                  }}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                >
                  Continue: Room & Dates
                </button>
              </div>

              {/* STEP 2: STAY DETAILS */}
              <div className={step === 2 ? "space-y-4" : "hidden"}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Room Selection</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  >
                    <option value="" className="bg-[#0c0c0e]">Select shared monthly room...</option>
                    {monthlyRooms.map(room => {
                      const info = getRoomOccupancyInfo(room);
                      return (
                        <option 
                          key={room.id} 
                          value={room.id}
                          disabled={info.isFull}
                          className="bg-[#0c0c0e] text-white disabled:text-zinc-600"
                        >
                          Room {room.room_number} ({room.type}) &mdash; Bed {info.currentCount + 1} of {info.capacity} ({info.isFull ? 'FULL' : 'VACANT'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Join Date</label>
                    <input 
                      type="date" 
                      name="checkIn"
                      required={step === 2}
                      value={selectedCheckIn}
                      onChange={(e) => {
                        const newIn = e.target.value;
                        setSelectedCheckIn(newIn);
                        
                        if (newIn) {
                          const parts = newIn.split('-');
                          const inDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                          const outParts = selectedCheckOut.split('-');
                          const outDate = new Date(Number(outParts[0]), Number(outParts[1]) - 1, Number(outParts[2]));
                          
                          if (outDate <= inDate) {
                            const nextYear = new Date(inDate);
                            nextYear.setFullYear(nextYear.getFullYear() + 1);
                            setSelectedCheckOut(getLocalYYYYMMDD(nextYear));
                          }
                        }
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Contract End</label>
                    <input 
                      type="date" 
                      name="checkOut"
                      required={step === 2}
                      value={selectedCheckOut}
                      min={selectedCheckIn ? (() => {
                        const parts = selectedCheckIn.split('-');
                        const inDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                        const nextDay = new Date(inDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        return getLocalYYYYMMDD(nextDay);
                      })() : undefined}
                      onChange={(e) => setSelectedCheckOut(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedRoomId) {
                        setError("Please select a room for co-living.");
                        return;
                      }
                      setError("");
                      setStep(3);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Continue: Billing
                  </button>
                </div>
              </div>

              {/* STEP 3: FINANCIALS */}
              <div className={step === 3 ? "space-y-4" : "hidden"}>
                
                {/* Rent Section */}
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-3">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pb-1 border-b border-white/5">
                    1. Room Rent Setup
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Monthly Charges (₹)</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-550 font-mono text-xs select-none">
                          ₹
                        </div>
                        <input
                          type="number"
                          name="monthlyRate"
                          min="0"
                          step="0.01"
                          placeholder="13500.00"
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-8 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Billing Day (1-31)</label>
                      <input
                        type="number"
                        name="billingCycleDate"
                        min="1"
                        max="31"
                        defaultValue={(() => {
                          if (!selectedCheckIn) return 1;
                          const parts = selectedCheckIn.split('-');
                          const day = parts.length === 3 ? parseInt(parts[2], 10) : NaN;
                          return isNaN(day) || day < 1 || day > 31 ? 1 : day;
                        })()}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Rent Paid Now (Advance Rent - Optional) (₹)</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-550 font-mono text-xs select-none">
                        ₹
                      </div>
                      <input 
                        type="number" 
                        name="prepaidAmount"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-8 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Deposit Section */}
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-3">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pb-1 border-b border-white/5">
                    2. Security Deposit Setup
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Deposit Required (₹)</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-550 font-mono text-xs select-none">
                          ₹
                        </div>
                        <input 
                          type="number" 
                          name="amount"
                          min="0"
                          step="0.01"
                          placeholder="1000.00"
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-8 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Deposit Paid Now (Optional) (₹)</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-550 font-mono text-xs select-none">
                          ₹
                        </div>
                        <input 
                          type="number" 
                          name="prepaidDepositAmount"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-8 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Common Payment Details (Method & Date) */}
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-3">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pb-1 border-b border-white/5">
                    3. Payment Information
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Pay Method</label>
                      <select
                        name="prepaidMethod"
                        required={step === 3}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        <option value="UPI">UPI / PhonePe</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Pay Date</label>
                      <input
                        type="date"
                        name="prepaidDate"
                        required={step === 3}
                        defaultValue={todayStr}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Check-In'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                  <ShieldAlert size={14} />
                  {error}
                </div>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
