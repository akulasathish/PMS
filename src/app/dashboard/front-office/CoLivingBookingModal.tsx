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
}

export default function CoLivingBookingModal({ isOpen, onClose, onSuccess, propertyId, rooms, bookings, defaultRoomId }: CoLivingBookingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalYYYYMMDD(new Date());
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const nextYearStr = getLocalYYYYMMDD(nextYear);

  const [selectedCheckIn, setSelectedCheckIn] = useState(todayStr);
  const [selectedCheckOut, setSelectedCheckOut] = useState(nextYearStr); // Co-living defaults to 1 year/long-term
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Sync selectedRoomId when modal opens with a defaultRoomId
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRoomId(defaultRoomId || '');
    }
  }, [isOpen, defaultRoomId]);

  // Filter rooms to those that allow monthly billing
  const monthlyRooms = rooms.filter(room => room.allowed_billing_type === 'monthly');

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
    // Capacity helper: Suites and Deluxe are 3-sharing, Standard and others are 2-sharing
    const getRoomCapacity = (r: Room): number => {
      if (r.type === 'Suite') return 3;
      if (r.type === 'Deluxe') return 3;
      return 2; // Standard or other rooms are 2 sharing
    };

    const capacity = getRoomCapacity(room);
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
        window.location.reload();
      }, 1500);
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
            Check-In Co-Living Guest
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
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Room Selection</label>
                <select
                  required
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
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Guest Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <User size={16} />
                    </div>
                    <input 
                      type="text" 
                      name="guestName"
                      required
                      placeholder="Rahul"
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
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
                      required
                      placeholder="+91 98765 43210"
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
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
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Join Date</label>
                  <input 
                    type="date" 
                    name="checkIn"
                    required
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
                    required
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

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Monthly Charges</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <DollarSign size={14} />
                      </div>
                      <input
                        type="number"
                        name="monthlyRate"
                        required
                        min="0"
                        step="0.01"
                        placeholder="13500.00"
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-8 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 pl-8 pr-4"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Billing Day (1-31)</label>
                    <input
                      type="number"
                      name="billingCycleDate"
                      required
                      min="1"
                      max="31"
                      placeholder="27"
                      defaultValue={new Date(selectedCheckIn).getDate()}
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Security Deposit / Advance ($)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <DollarSign size={16} />
                  </div>
                  <input 
                    type="number" 
                    name="amount"
                    min="0"
                    step="0.01"
                    required
                    placeholder="10000.00"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                  <ShieldAlert size={14} />
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Co-Living Check-In'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
