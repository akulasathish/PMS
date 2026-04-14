'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface BookingData {
  id: string;
  guest_name: string;
  guest_address?: string;
  id_verified: boolean;
  id_photo_url?: string;
  signature_url?: string;
  check_in: string;
  check_out: string;
  room_id?: string;
  properties: {
    name: string;
    gst_number?: string;
  };
}

export default function PrintRegCard() {
  const { id } = useParams();
  const [data, setData] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, properties(*)')
        .eq('id', id)
        .single();
      
      if (booking) setData(booking as BookingData);
      setIsLoading(false);
      
      // Auto-trigger print dialog after data loads
      if (booking) {
        setTimeout(() => {
          window.print();
        }, 1000);
      }
    }
    fetchData();
  }, [id, supabase]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="p-10 text-center">Registration Card Not Found.</div>;

  const property = data.properties;

  return (
    <div className="bg-white text-black p-10 font-serif max-w-[800px] mx-auto min-h-screen print:p-0">
      {/* HEADER */}
      <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">{property?.name}</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 mt-1">Guest Registration Card & Form F</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase">GSTIN: {property?.gst_number || 'N/A'}</p>
          <p className="text-[10px] font-bold uppercase">Booking ID: {data.id.slice(0,8).toUpperCase()}</p>
        </div>
      </div>

      {/* STAY DETAILS GRID */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-10 border border-black/10 p-6 rounded-lg bg-zinc-50/50">
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-zinc-400">Guest Name</label>
          <p className="text-sm font-bold border-b border-black/10 pb-1">{data.guest_name}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-zinc-400">Room Assigned</label>
          <p className="text-sm font-bold border-b border-black/10 pb-1">Room {data.room_id ? 'Assigned' : 'TBD'}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-zinc-400">Arrival Date</label>
          <p className="text-sm font-bold border-b border-black/10 pb-1">{data.check_in}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-zinc-400">Departure Date</label>
          <p className="text-sm font-bold border-b border-black/10 pb-1">{data.check_out}</p>
        </div>
      </div>

      {/* FORM F DATA (LEGAL REQUIREMENTS) */}
      <div className="space-y-8 mb-12">
        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] border-l-4 border-black pl-3 mb-4">Legal Details (Police Form F)</h3>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-zinc-400">Permanent Home Address</label>
               <p className="text-sm border-b border-black/10 pb-1 leading-relaxed">{data.guest_address || '____________________________________________________________________'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-1">
             <label className="text-[9px] font-black uppercase text-zinc-400">Identity Document Type</label>
             <p className="text-sm border-b border-black/10 pb-1">{data.id_verified ? 'Verified Digital ID' : '________________'}</p>
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black uppercase text-zinc-400">ID Number / Reference</label>
             <p className="text-sm border-b border-black/10 pb-1">Ref: {data.id.slice(0,6)}</p>
          </div>
        </div>
      </div>

      
        <div className="space-y-4">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] border-l-4 border-black pl-3 mb-4">Identity Verification Proof</h3>
           <div className="grid grid-cols-1 gap-6">
              <div className="aspect-[3/2] w-full max-w-[300px] border-2 border-black/10 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-50 relative">
                {data.id_photo_url ? (
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guest-ids/${data.id_photo_url}`} 
                    className="object-cover grayscale contrast-125" 
                    alt="ID Proof" 
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                ) : (
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">Physical ID Scan Required</p>
                )}
              </div>
              <p className="text-[8px] text-zinc-400 font-bold uppercase italic mt-1">* This image is a digital capture of the guest&apos;s original identity document.</p>
           </div>
        </div>

      {/* SIGNATURE SECTION */}
      <div className="mt-20 pt-10 border-t-2 border-black/5 flex justify-between items-center">
        <div className="w-1/2">
          <p className="text-[9px] font-black uppercase text-zinc-400 mb-4">Guest Digital Signature</p>
          {data.signature_url ? (
            <div className="bg-zinc-50 border border-black/5 p-2 rounded inline-block relative h-24 w-64">
              <Image src={data.signature_url} className="object-contain grayscale contrast-125" alt="Signature" fill sizes="256px" />
            </div>
          ) : (
             <div className="h-24 w-64 border-b-2 border-dotted border-black/20 flex items-end pb-2">
               <span className="text-[10px] text-zinc-300 font-bold uppercase italic">Affix Manual Signature Here</span>
             </div>
          )}
        </div>

        <div className="text-right w-1/2">
           <p className="text-[10px] font-bold uppercase mb-2">Hotel Representative</p>
           <div className="h-16 w-48 border-b border-black/20 ml-auto flex items-end pb-1 justify-end">
              <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Office Stamp / Sign</span>
           </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-32 text-center text-[8px] text-zinc-400 uppercase tracking-widest font-bold border-t border-black/5 pt-6">
        <p>This is a digitally generated document from RE-PMS Engine v2026.1</p>
        <p className="mt-1 font-black">All data securely stored in accordance with Indian Sarai Act regulations.</p>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  );
}
