'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Bed, Calendar, User, Mail, DollarSign, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { createBooking } from '@/app/actions/booking';

interface Room {
  id: string;
  room_number: string;
  type: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  rooms: Room[];
}

export default function BookingModal({ isOpen, onClose, propertyId, rooms }: BookingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-generate dates for speed
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (!isOpen) return null;

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError('');
    
    // Add propertyId to the form data
    formData.append('propertyId', propertyId);

    const result = await createBooking(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    }
    
    setIsLoading(false);
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
            <Calendar size={18} className="text-azure-400" />
            Create Walk-in Booking
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
              <h3 className="text-xl font-bold text-white mb-2">Booking Confirmed</h3>
              <p className="text-sm text-zinc-400">The matrix has been updated and welcome email queued.</p>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Room Assignment</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Bed size={16} />
                  </div>
                  <select 
                    name="roomId" 
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-azure-500/50 appearance-none"
                  >
                    <option value="">Select an available room...</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} ({room.type})
                      </option>
                    ))}
                  </select>
                </div>
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
                      placeholder="John Doe"
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-azure-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Guest Email</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email" 
                      name="guestEmail"
                      required
                      placeholder="john@example.com"
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-azure-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Check In</label>
                  <input 
                    type="date" 
                    name="checkIn"
                    required
                    defaultValue={todayStr}
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-azure-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Check Out</label>
                  <input 
                    type="date" 
                    name="checkOut"
                    required
                    defaultValue={tomorrowStr}
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-azure-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">Total Amount ($)</label>
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
                    placeholder="250.00"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-azure-500/50"
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
                className="w-full mt-4 bg-azure-600 hover:bg-azure-500 disabled:bg-azure-600/50 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)]"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm & Send Welcome Email'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
