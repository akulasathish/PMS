'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, PenTool, CheckCircle2, Loader2, 
  Building2, ShieldCheck, AlertCircle, UploadCloud
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function GuestRegCard() {
  const { id: bookingId } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: ID Photo, 2: Signature, 3: Success
  
  // Form State
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
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
      } catch (err: any) {
        setError("Invalid link or booking not found.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SIGNATURE CANVAS LOGIC ---
  const startDrawing = (e: any) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6366f1'; // Indigo-500

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSubmit = async () => {
    if (!idPhoto || !canvasRef.current) return;
    setIsSubmitting(true);
    
    try {
      // 1. Upload ID Photo
      const fileExt = idPhoto.name.split('.').pop();
      const fileName = `${bookingId}_id.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('guest-ids')
        .upload(fileName, idPhoto, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Capture Signature as DataURL
      const signatureData = canvasRef.current.toDataURL('image/png');

      // 3. Update Booking Table
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          id_verified: true,
          id_photo_url: fileName,
          signature_url: signatureData,
          status: 'Confirmed' // Ensure it's ready for check-in
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;
      
      setStep(3);
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#08080a] flex items-center justify-center p-6"><Loader2 className="animate-spin text-indigo-500" /></div>;
  if (error) return <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-6 text-center"><AlertCircle size={48} className="text-rose-500 mb-4" /><p className="text-white font-bold">{error}</p></div>;

  return (
    <div className="min-h-screen bg-[#08080a] text-white font-sans selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="p-6 border-b border-white/[0.05] bg-zinc-900/20 backdrop-blur-xl flex flex-col items-center text-center">
        <Building2 className="text-indigo-500 mb-2" size={32} />
        <h1 className="text-lg font-black uppercase tracking-widest">{property?.name}</h1>
        <p className="text-xs text-zinc-500 font-bold mt-1">Digital Registration Card</p>
      </header>

      <main className="p-6 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <ShieldCheck size={18} /> Identity Verification
                </h2>
                <p className="text-[11px] text-zinc-400 mt-1">Please provide a clear photo of your Aadhar, Passport, or Driver's License.</p>
              </div>

              <div className="relative group">
                <div className={`aspect-[3/2] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${idPreview ? 'border-emerald-500/50' : 'border-white/10'}`}>
                  {idPreview ? (
                    <img src={idPreview} className="w-full h-full object-cover rounded-[22px]" alt="ID Preview" />
                  ) : (
                    <>
                      <Camera size={32} className="text-zinc-700 mb-2" />
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tap to capture ID</p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              <button 
                disabled={!idPhoto}
                onClick={() => setStep(2)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
              >
                Next: Digital Signature
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl text-center">
                <h2 className="text-sm font-bold text-indigo-400 flex items-center justify-center gap-2">
                  <PenTool size={18} /> Sign Registration Card
                </h2>
                <p className="text-[11px] text-zinc-400 mt-1">By signing, you agree to the hotel's terms and conditions.</p>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden touch-none shadow-2xl">
                <canvas 
                  ref={canvasRef}
                  width={350}
                  height={250}
                  className="w-full h-full"
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={clearSignature}
                  className="flex-1 bg-zinc-800 text-zinc-400 font-bold uppercase tracking-widest text-xs py-4 rounded-2xl"
                >
                  Clear
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Submit & Complete"}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Verified!</h2>
              <p className="text-zinc-500 text-sm mb-8">Thank you, {booking?.guest_name}. Your check-in process is now being finalized at the front desk.</p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 inline-block">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">You can now close this tab</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 text-center bg-gradient-to-t from-[#08080a] to-transparent">
        <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          Securely powered by <span className="text-zinc-500">RE-PMS Engine 2026</span>
        </p>
      </footer>
    </div>
  );
}
