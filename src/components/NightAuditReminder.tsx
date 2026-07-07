'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

export default function NightAuditReminder() {
  const pathname = usePathname();
  const [showReminder, setShowReminder] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [businessDate, setBusinessDate] = useState<string | null>(null);

  // Only run the checks on dashboard pages (excluding login)
  const isDashboard = pathname.startsWith('/dashboard') && pathname !== '/dashboard/login';

  useEffect(() => {
    if (!isDashboard || isDismissed) {
      setShowReminder(false);
      return;
    }

    const checkNightAuditStatus = async () => {
      // 1. Check local time conditions (Must be after 1:00 AM)
      const now = new Date();
      const hours = now.getHours();
      
      if (hours < 1) {
        setShowReminder(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setShowReminder(false);
          return;
        }

        // 2. Fetch business date from app_settings
        const { data: settings } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'business_date')
          .single();

        if (settings?.value) {
          setBusinessDate(settings.value);
          
          // Format local date as YYYY-MM-DD
          const localYear = now.getFullYear();
          const localMonth = String(now.getMonth() + 1).padStart(2, '0');
          const localDay = String(now.getDate()).padStart(2, '0');
          const localDateStr = `${localYear}-${localMonth}-${localDay}`;

          // If database business date is behind today's local date, audit is pending
          if (settings.value < localDateStr) {
            setShowReminder(true);
          } else {
            setShowReminder(false);
          }
        }
      } catch (err) {
        console.error("Night Audit checker error:", err);
      }
    };

    // Run check immediately
    checkNightAuditStatus();

    // Check periodically (every 5 minutes to verify time and status)
    const interval = setInterval(checkNightAuditStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isDashboard, isDismissed]);

  // If dismissed, auto-reset dismissal after 30 minutes to remind again
  useEffect(() => {
    if (isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 30 * 60 * 1000); // 30 minutes
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  if (!showReminder) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#18181b]/95 border border-amber-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex gap-3 items-start">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
          <AlertTriangle size={18} className="animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-tight">Night Audit Overdue</h4>
            <button 
              onClick={() => setIsDismissed(true)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            The business date is still set to <span className="font-semibold text-zinc-300">{businessDate}</span>. Please complete the rollover to avoid ledger errors.
          </p>
          <div className="mt-3">
            <Link
              href="/dashboard/night-audit"
              onClick={() => setShowReminder(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/10"
            >
              Run Night Audit <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
