'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import GuestRegistrationForm from '@/components/GuestRegistrationForm';

export default function GuestRegCard() {
  const { id: bookingId } = useParams();
  const [booking, setBooking] = useState<unknown>(null);
  const [property, setProperty] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchBooking() {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, properties(*)')
          .eq('id', bookingId)
          .single();
          
        if (error) throw error;
        setBooking(data);
        setProperty(data.properties);
      } catch {
        setError("Invalid link or booking not found.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId, supabase]);

  if (isLoading) return <div className="min-h-screen bg-[#08080a] flex items-center justify-center p-6"><Loader2 className="animate-spin text-indigo-500" /></div>;
  if (error) return <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-6 text-center"><AlertCircle size={48} className="text-rose-500 mb-4" /><p className="text-white font-bold">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[#08080a] text-white font-sans selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="p-6 border-b border-white/[0.05] bg-zinc-900/20 backdrop-blur-xl flex flex-col items-center text-center">
        <Building2 className="text-indigo-500 mb-2" size={32} />
        <h1 className="text-lg font-black uppercase tracking-widest">{(property as Record<string, unknown>)?.name as string}</h1>
        <p className="text-xs text-zinc-500 font-bold mt-1">Digital Registration Card</p>
      </header>

      <main className="p-6 max-w-md mx-auto">
         <GuestRegistrationForm 
            bookingId={(booking as Record<string, unknown>).id as string} 
            activePropertyId={(property as Record<string, unknown>).id as string} 
            guestName={(booking as Record<string, unknown>).guest_name as string} 
            guestEmail={(booking as Record<string, unknown>).guest_email as string} 
         />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 text-center bg-gradient-to-t from-[#08080a] to-transparent pointer-events-none">
        <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          Securely powered by <span className="text-zinc-500">StaySync Enterprise Edition</span>
        </p>
      </footer>
    </div>
  );
}
