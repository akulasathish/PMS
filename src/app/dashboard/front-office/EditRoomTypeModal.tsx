"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Bed, CheckCircle2, AlertCircle, Loader2, Settings } from 'lucide-react';
import { Room } from '@/lib/types';
import { updateRoomType } from '@/app/actions/inventory';

interface EditRoomTypeModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_OPTIONS = [
  { label: '1-Sharing (Single Deluxe)', type: 'Single Deluxe', capacity: 1 },
  { label: '2-Sharing (Double Deluxe)', type: '2-Sharing Deluxe', capacity: 2 },
  { label: '3-Sharing (Triple Executive)', type: '3-Sharing Executive', capacity: 3 },
  { label: '4-Sharing (Quadruple Standard)', type: '4-Sharing Deluxe', capacity: 4 },
  { label: '5-Sharing (5-Sharing Premium)', type: '5-Sharing Premium', capacity: 5 },
  { label: '6-Sharing (Dormitory)', type: '6-Sharing Dormitory', capacity: 6 },
];

export default function EditRoomTypeModal({ room, onClose, onSuccess }: EditRoomTypeModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    PRESET_OPTIONS.find(p => p.capacity === room.sharing_capacity)?.label || 'Custom'
  );
  const [customType, setCustomType] = useState<string>(room.type || `${room.sharing_capacity || 2}-Sharing`);
  const [capacity, setCapacity] = useState<number>(room.sharing_capacity || 2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSelectPreset = (presetLabel: string) => {
    setSelectedPreset(presetLabel);
    if (presetLabel === 'Custom') return;

    const preset = PRESET_OPTIONS.find(p => p.label === presetLabel);
    if (preset) {
      setCustomType(preset.type);
      setCapacity(preset.capacity);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!customType.trim()) {
      setError('Please provide a room type description.');
      return;
    }

    if (capacity < 1) {
      setError('Sharing capacity must be at least 1 bed.');
      return;
    }

    setIsLoading(true);
    setError('');

    const res = await updateRoomType(room.id, customType.trim(), capacity);

    if (res.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      setSuccessMsg(`Room ${room.room_number} updated to ${customType} (${capacity}-Sharing)`);
      setTimeout(() => {
        onSuccess();
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
            <Settings size={18} className="text-indigo-400" />
            Edit Room {room.room_number} Sharing & Type
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {successMsg ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Room Type Updated</h3>
              <p className="text-sm text-zinc-400">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Preset Selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                  Select Sharing Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_OPTIONS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectPreset(preset.label)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex flex-col gap-0.5 ${
                        selectedPreset === preset.label
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                          : 'bg-black/40 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{preset.capacity}-Sharing</span>
                      <span className="text-[10px] opacity-75 font-normal">{preset.type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Configuration Inputs */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                    Room Class / Category Name
                  </label>
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => {
                      setCustomType(e.target.value);
                      setSelectedPreset('Custom');
                    }}
                    placeholder="e.g. 4-Sharing Premium Deluxe"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                    Bed Sharing Capacity
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={capacity}
                      onChange={(e) => {
                        setCapacity(parseInt(e.target.value || '1', 10));
                        setSelectedPreset('Custom');
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 font-mono"
                    />
                    <div className="shrink-0 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold text-xs">
                      {capacity} Bed{capacity > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Bed size={16} /> Save Room Type</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
