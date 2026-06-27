"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, PenTool, CheckCircle2, Loader2, ShieldCheck 
} from 'lucide-react';
import Image from 'next/image';
import { processGuestRegistration } from '@/app/actions/guest';

const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio and scale down if dimensions exceed bounds
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original file
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file); // Fallback
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file); // Fallback on error
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file); // Fallback on error
    reader.readAsDataURL(file);
  });
};

interface GuestRegistrationFormProps {
  bookingId: string;
  activePropertyId: string;
  guestName: string;
  guestEmail: string;
}

export default function GuestRegistrationForm({ bookingId, activePropertyId, guestName, guestEmail }: GuestRegistrationFormProps) {
  const [step, setStep] = useState(1);
  
  // Form State
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6366f1';

    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

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
      // Convert signature base64 to Blob
      const signatureData = canvasRef.current.toDataURL('image/png');
      const fetchResponse = await fetch(signatureData);
      const signatureBlob = await fetchResponse.blob();

      // FALLBACK: If activePropertyId is missing from props, try localStorage
      let safePropertyId = activePropertyId;
      if (!safePropertyId || safePropertyId === 'undefined') {
         console.log("Prop missing. Trying localStorage fallback...");
         safePropertyId = localStorage.getItem('pms_active_property') || '';
      }
      
      if (!safePropertyId || safePropertyId === 'undefined') {
          console.error("❌ Step 2 Failed: Missing safePropertyId");
          throw new Error("CRITICAL ERROR: The active property ID is missing!");
      }

      console.log("Preparing to Save Guest & Upload files via Server Action...");
      
      console.log("Compressing ID Photo before upload to optimize transmission and stability...");
      const compressedIdPhotoBlob = await compressImage(idPhoto);
      // Create a File from the compressed blob (force .jpg extension since we compressed it to image/jpeg)
      const cleanBaseName = idPhoto.name ? idPhoto.name.replace(/\.[^/.]+$/, "") : "id_photo";
      const compressedIdPhotoFile = new File([compressedIdPhotoBlob], `${cleanBaseName}.jpg`, {
        type: 'image/jpeg'
      });

      const formData = new FormData();
      formData.append('bookingId', bookingId);
      formData.append('propertyId', safePropertyId);
      formData.append('guestName', guestName);
      formData.append('guestEmail', guestEmail);
      formData.append('idPhoto', compressedIdPhotoFile);
      formData.append('signature', signatureBlob, 'signature.png');

      const result = await processGuestRegistration(formData);

      if (result.error) {
          console.error("❌ Submission Failed (Server Action):", result.error);
          throw new Error(result.error);
      }
      console.log("✅ Submission Completed.");
      
      setStep(3);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Submission failed: " + err.message);
      } else {
        alert("Submission failed: An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            <p className="text-[11px] text-zinc-400 mt-1">Please provide a clear photo of your Aadhar, Passport, or Driver&apos;s License.</p>
          </div>

          <div className="relative group">
            <div className={`aspect-[3/2] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative ${idPreview ? 'border-emerald-500/50' : 'border-white/10'}`}>
              {idPreview ? (
                <Image src={idPreview} alt="ID Preview" fill className="object-cover rounded-[22px]" />
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
            <p className="text-[11px] text-zinc-400 mt-1">By signing, you agree to the hotel&apos;s terms and conditions.</p>
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
          <p className="text-zinc-500 text-sm mb-8">Thank you, {guestName}. Your check-in process is now being finalized at the front desk.</p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 inline-block">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">You can now close this tab</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}