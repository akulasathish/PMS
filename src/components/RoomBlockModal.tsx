"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, CalendarDays, Wrench, Loader2, AlertCircle } from 'lucide-react';
import { createRoomBlock, resolveRoomBlockByRoom } from '@/app/actions/inventory';
import { Room } from '@/lib/types';

interface RoomBlockModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoomBlockModal({ room, onClose, onSuccess }: RoomBlockModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedReason, setSelectedReason] = useState('Plumbing');
  const [customReason, setCustomReason] = useState('');

  // If the room is already blocked, we show the Resolution UI
  const isCurrentlyBlocked = room.status === 'Blocked';

  const handleCreateBlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('roomId', room.id);
    formData.append('propertyId', room.property_id);

    if (selectedReason === 'Custom') {
      if (!customReason.trim()) {
        setError('Please specify a custom reason.');
        setLoading(false);
        return;
      }
      formData.set('reason', customReason.trim());
    }

    const res = await createRoomBlock(formData);
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const handleResolveBlock = async () => {
    setLoading(true);
    setError('');

    const res = await resolveRoomBlockByRoom(room.id);
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
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
        className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-2xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isCurrentlyBlocked ? 'Resolve Maintenance Block' : `Block Room ${room.room_number}`}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Current Status: <span className={isCurrentlyBlocked ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{room.status}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="p-6">
          {isCurrentlyBlocked ? (
            // Resolution UI
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-400 text-sm">
                <Wrench size={18} className="shrink-0 mt-0.5" />
                <p>Resolving this block will instantly release the room back into inventory. The status will be set to <strong>Dirty</strong> so Housekeeping can verify it before sale.</p>
              </div>
              
              <button
                onClick={handleResolveBlock}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Return Room to Service'}
              </button>
            </div>
          ) : (
            // Creation UI
            <form onSubmit={handleCreateBlock} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Start Date</label>
                  <div className="relative">
                    <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      name="startDate" type="date" required 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">End Date</label>
                  <div className="relative">
                    <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      name="endDate" type="date" required 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Block Type</label>
                <select name="type" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                  <option value="OOO">Out of Order (Physically broken / Deducts Inventory)</option>
                  <option value="OOS">Out of Service (Minor issue / Remains in Inventory)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Reason / Issue</label>
                <select 
                  name="reason" 
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  required 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                >
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="HVAC / AC">HVAC / Air Conditioning</option>
                  <option value="Deep Cleaning">Deep Cleaning</option>
                  <option value="Staff Use">Staff Use</option>
                  <option value="VIP / GM Sir Hold">VIP / GM Sir Hold</option>
                  <option value="Custom">Custom Reason (Specify below)</option>
                </select>
              </div>

              {selectedReason === 'Custom' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Custom Reason</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Painting, Marriage Hold, Owner Stay"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Additional Notes (Optional)</label>
                <textarea 
                  name="notes" rows={3} placeholder="e.g., Technician arriving Tuesday at 10 AM..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><AlertTriangle size={16} /> Enforce Room Block</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default RoomBlockModal;
