'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface BookingData {
  id: string;
  guest_name: string;
  guest_address?: string;
  id_verified: boolean;
  id_photo_url?: string;
  signature_url?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  room_id?: string;
  rooms?: {
    room_number: string;
  };
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
        .select('*, properties(*), rooms(room_number)')
        .eq('id', id)
        .single();
      
      if (booking) setData(booking as BookingData);
      setIsLoading(false);
      
      // Auto-trigger print dialog after data loads
      if (booking) {
        setTimeout(() => {
          window.print();
        }, 1200);
      }
    }
    fetchData();
  }, [id, supabase]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-zinc-500" /></div>;
  if (!data) return <div className="p-10 text-center text-zinc-500 font-sans font-bold">Registration Card Not Found.</div>;

  const property = data.properties;
  const cacheBuster = `?t=${Date.now()}`;

  return (
    <div className="bg-white text-black p-8 font-sans max-w-[800px] mx-auto min-h-screen print:p-0 print:max-w-full">
      {/* BRANDING HEADER */}
      <div className="border-b-4 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">{property?.name}</h1>
          <p className="text-xs font-semibold tracking-wider text-zinc-600 mt-1 uppercase">Official Guest Registration Card & Sarai Act Form F</p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-black text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest rounded mb-1">StaySync Verified</span>
          <p className="text-[10px] font-mono text-zinc-500 uppercase">GSTIN: {property?.gst_number || 'N/A'}</p>
          <p className="text-[10px] font-mono text-zinc-500 uppercase">Ref ID: {data.id.slice(0,8).toUpperCase()}</p>
        </div>
      </div>

      {/* INSTRUCTIONS */}
      <div className="mb-6 bg-zinc-50 border border-zinc-200 p-4 rounded-lg text-[11px] text-zinc-600 leading-relaxed">
        <strong>Sarai Act compliance notice:</strong> All guests staying at the property are required under national regulations to complete, sign, and verify their identity details. Please find the compiled registration details below.
      </div>

      {/* SECTION: ACCOMMODATION & RESERVATION DETAILS */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-black bg-zinc-100 px-3 py-1.5 rounded mb-3 border-l-4 border-black">1. Accommodation & Stay Details</h3>
        <div className="grid grid-cols-2 gap-4 border border-zinc-200 rounded-lg p-4 bg-white shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Guest Name</span>
            <span className="text-sm font-semibold text-black">{data.guest_name}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Assigned Room</span>
            <span className="text-sm font-semibold text-black">Room {data.rooms?.room_number || 'Assigned / TBD'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Arrival Date</span>
            <span className="text-sm font-semibold text-zinc-800">{data.check_in}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400 block">Departure Date</span>
            <span className="text-sm font-semibold text-zinc-800">{data.check_out}</span>
          </div>
        </div>
      </div>

      {/* SECTION: LEGAL COMPLIANCE & VERIFIED IDENTITY */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-black bg-zinc-100 px-3 py-1.5 rounded mb-3 border-l-4 border-black">2. Legal Compliance & Verified Identity</h3>
        <div className="border border-zinc-200 rounded-lg p-4 bg-white space-y-4 shadow-sm">
          <div className="grid grid-cols-1 gap-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Permanent Home Address</span>
            <span className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-1 leading-relaxed">
              {data.guest_address || 'Provided verbally upon arrival at check-in desk'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Identity Status</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded inline-block uppercase tracking-wider">
                {data.id_verified ? '✓ Digitally Verified' : 'Pending Verification'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Verification Ref</span>
              <span className="text-xs font-mono text-zinc-600">ID_REF_{data.id.slice(0,8).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: DOCUMENT PROOF & DIGITAL EVIDENCE */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-black bg-zinc-100 px-3 py-1.5 rounded mb-3 border-l-4 border-black">3. Identity Proof Document</h3>
          <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 flex flex-col items-center justify-center aspect-[4/3] relative overflow-hidden shadow-sm">
            {data.id_photo_url ? (
              <img 
                src={`${supabase.storage.from('guest-ids').getPublicUrl(data.id_photo_url).data.publicUrl}${cacheBuster}`} 
                className="w-full h-full object-contain mix-blend-multiply grayscale contrast-125" 
                alt="ID Proof Document" 
              />
            ) : (
              <div className="text-center p-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Physical ID Scan Required</p>
                <p className="text-[9px] text-zinc-400 mt-1">Please provide document to representative</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-black bg-zinc-100 px-3 py-1.5 rounded mb-3 border-l-4 border-black">4. Guest Digital Signature</h3>
          <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 flex flex-col items-center justify-center aspect-[4/3] relative overflow-hidden shadow-sm">
            {data.signature_url ? (
              <img 
                src={`${data.signature_url}${cacheBuster}`} 
                className="w-full h-full object-contain mix-blend-multiply grayscale contrast-125" 
                alt="Guest Signature" 
              />
            ) : (
              <div className="text-center p-4 border border-zinc-200 rounded-lg w-full h-full flex flex-col items-center justify-center bg-white shadow-inner">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Affix Manual Signature</p>
                <div className="w-2/3 border-b border-zinc-300 mt-8"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: SIGN-OFF & REPRESENTATIVE */}
      <div className="border-t-2 border-zinc-200 pt-6 flex justify-between items-start">
        <div className="text-left text-[10px] text-zinc-500 max-w-[450px] leading-relaxed">
          <p className="font-bold text-zinc-700 uppercase">Guest Declaration & Agreement:</p>
          <p className="mt-1">I hereby declare that all the information provided above is correct. I agree to abide by the hotel&apos;s house rules, terms of service, and checkout hours during my stay.</p>
        </div>
        <div className="text-right w-1/3">
          <p className="text-[10px] font-bold uppercase text-zinc-700">Hotel Representative</p>
          <div className="h-16 w-full border-b border-zinc-300 flex items-end justify-end pb-1 mt-2">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Office Stamp & Signature</span>
          </div>
        </div>
      </div>

      {/* DOCUMENT FOOTER */}
      <div className="mt-20 text-center text-[9px] text-zinc-400 uppercase tracking-wider font-semibold border-t border-zinc-100 pt-4 leading-relaxed">
        <p>This is a legally compliant digital record generated automatically by StaySync Engine v2026.1</p>
        <p className="font-extrabold text-zinc-500 mt-0.5">Securely processed under the Indian Sarai Act 1867 regulations.</p>
      </div>

      <style jsx global>{`
        @media print {
          body { 
            background: white !important; 
            color: black !important;
            font-size: 12pt;
          }
          .no-print { display: none !important; }
          @page { 
            margin: 1.5cm;
          }
          .shadow-sm, .rounded-lg {
            box-shadow: none !important;
            border-radius: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
