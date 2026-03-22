"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bed, 
  Calendar, 
  Search, 
  UserCheck, 
  Clock, 
  ArrowRightLeft, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus
} from 'lucide-react';

// --- MOCK DATA ---
const DAYS = ["22 Mar", "23 Mar", "24 Mar", "25 Mar", "26 Mar", "27 Mar", "28 Mar"];
const ROOMS = [
  { id: "101", type: "Deluxe", status: "Occupied", guest: "John Wick", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" },
  { id: "102", type: "Standard", status: "Available", guest: null },
  { id: "103", type: "Suite", status: "Occupied", guest: "Sarah Connor", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  { id: "104", type: "Standard", status: "Dirty", guest: null },
  { id: "201", type: "Deluxe", status: "Occupied", guest: "Bruce Wayne", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
];

export default function Tier3FrontDesk() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 p-6 selection:bg-indigo-500/30">
      
      {/* HEADER: OPERATIONAL BAR */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Front Desk</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Grand Hyatt Regency • Day Shift</p>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Arrivals</p>
              <p className="text-sm font-bold text-emerald-500">12</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Departures</p>
              <p className="text-sm font-bold text-rose-500">08</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search Guest or Room..."
              className="bg-zinc-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:border-azure-500 outline-none transition-all w-64"
            />
          </div>
          <button className="bg-azure-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-azure-500 transition-all shadow-lg shadow-azure-500/20">
            <Plus size={16} />
            New Booking
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-1" />
          <button 
            onClick={() => {
              document.cookie = "frontdesk_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.href = "/front-desk/login";
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-500 text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* TAPE CHART (THE GRID) */}
        <div className="col-span-12 lg:col-span-9 bg-zinc-900/20 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/20">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              Availability Matrix
            </h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-white/5 rounded-lg border border-white/10 transition-colors"><ChevronLeft size={16}/></button>
              <button className="p-2 hover:bg-white/5 rounded-lg border border-white/10 transition-colors"><ChevronRight size={16}/></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-4 text-left text-[10px] font-bold text-zinc-500 uppercase border-b border-r border-white/5 sticky left-0 bg-[#09090b] z-10 w-32">Room</th>
                  {DAYS.map(day => (
                    <th key={day} className="p-4 text-center text-[10px] font-bold text-zinc-400 uppercase border-b border-white/5 min-w-[120px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROOMS.map(room => (
                  <tr key={room.id} className="group border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                    <td className="p-4 border-r border-white/5 sticky left-0 bg-[#09090b] z-10 group-hover:bg-zinc-900 transition-colors">
                      <p className="text-sm font-bold text-white">{room.id}</p>
                      <p className="text-[10px] text-zinc-500">{room.type}</p>
                    </td>
                    {DAYS.map((day, idx) => (
                      <td key={idx} className="p-2 border-r border-white/5 relative h-16">
                        {room.guest && idx === 0 ? (
                          <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`absolute inset-y-2 left-2 right-[-240px] rounded-lg border p-2 flex items-center justify-between z-20 shadow-xl ${room.color}`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <UserCheck size={14} />
                              <span className="text-[11px] font-bold truncate">{room.guest}</span>
                            </div>
                            <span className="text-[9px] font-black uppercase opacity-60">Confirmed</span>
                          </motion.div>
                        ) : null}
                        {!room.guest && room.status === 'Dirty' ? (
                          <div className="flex items-center justify-center h-full opacity-20">
                            <Clock size={14} />
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIDEBAR: QUEUE & ACTIONS */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-indigo-400" />
              In-House Activity
            </h3>
            
            <div className="space-y-4">
              {[
                { time: "10:30 AM", action: "Check-in", guest: "Martha S.", room: "102" },
                { time: "11:15 AM", action: "Check-out", guest: "James B.", room: "305" },
                { time: "1:00 PM", action: "Laundry", guest: "Housekeeping", room: "201" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start p-3 hover:bg-white/5 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/5 group">
                  <div className="text-[9px] font-bold text-zinc-600 group-hover:text-indigo-400 transition-colors pt-1">
                    {item.time}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{item.action}: {item.guest}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">Room {item.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500 rounded-lg text-white">
                <Bed size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Room Inventory</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase">Total Rooms</p>
                <p className="text-xl font-bold text-white">45</p>
              </div>
              <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase">Available</p>
                <p className="text-xl font-bold text-emerald-500">18</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}