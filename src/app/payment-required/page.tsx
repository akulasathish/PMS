import { AlertTriangle } from 'lucide-react';

export default function PaymentRequired() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 flex items-center justify-center p-4 selection:bg-rose-500/30">
      <div className="max-w-md w-full bg-zinc-900/60 backdrop-blur-xl border border-rose-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-rose-500/10">
        
        {/* Header Banner */}
        <div className="bg-rose-500/10 border-b border-rose-500/20 p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-4 border border-rose-500/30">
            <AlertTriangle className="text-rose-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Access Suspended</h1>
          <p className="text-rose-400/80 text-sm mt-2 font-medium">Payment Required</p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          <p className="text-sm text-zinc-400 text-center leading-relaxed">
            Your property&apos;s access to the Engine has been temporarily suspended due to an outstanding balance or subscription issue. 
          </p>

          <div className="bg-black/50 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Status Code</p>
            <p className="text-sm text-zinc-300 font-mono">ERR_SUBSCRIPTION_HALTED</p>
          </div>

          <p className="text-xs text-zinc-500 text-center">
            Please contact the SaaS Provider (Admin) or check your billing portal to resolve this issue and restore access to your dashboard and front-desk terminals.
          </p>
        </div>

      </div>
    </div>
  );
}
