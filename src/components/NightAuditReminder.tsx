'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { syncBusinessDateToToday } from '@/app/actions/folio';

export default function NightAuditReminder() {
  const pathname = usePathname();
  const [showReminder, setShowReminder] = useState(false);
  const [showBlocker, setShowBlocker] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [businessDate, setBusinessDate] = useState<string | null>(null);

  // Only run the checks on dashboard pages (excluding login and property setup)
  const isDashboard = pathname.startsWith('/dashboard') && pathname !== '/dashboard/login';
  const isNightAuditPage = pathname === '/dashboard/night-audit';
  const isPropertySetupPage = pathname === '/dashboard/property-setup';
  
  const shouldBlock = isDashboard && !isNightAuditPage && !isPropertySetupPage;

  useEffect(() => {
    if (!isDashboard) {
      setShowReminder(false);
      setShowBlocker(false);
      return;
    }

    const checkNightAuditStatus = async () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      try {
        const supabase = createClient();
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setShowReminder(false);
          setShowBlocker(false);
          return;
        }

        // Check property_category of the user's active property
        const { data: profile } = await supabase
          .from('profiles')
          .select('property_id')
          .eq('id', session.user.id)
          .single();

        if (profile?.property_id) {
          const { data: prop } = await supabase
            .from('properties')
            .select('property_category')
            .eq('id', profile.property_id)
            .single();

          if (prop?.property_category === 'PG') {
            // In PG / Co-Living mode, Night Audit reminders and date rollover prompts are completely disabled!
            setShowReminder(false);
            setShowBlocker(false);
            return;
          }
        }

        // Fetch business date from app_settings
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
          const isPending = settings.value < localDateStr;

          if (isPending) {
            console.log(`[NightAuditReminder] Auto-syncing stale business date ${settings.value} to today ${localDateStr}...`);
            const syncRes = await syncBusinessDateToToday();
            if (syncRes && syncRes.success) {
              window.location.reload();
              return;
            }
          }

          if (isPending && shouldBlock) {
            // Condition 1: Hard Blocker (After 4:00 AM)
            if (hours >= 4) {
              setShowBlocker(true);
              setShowReminder(false);
            } 
            // Condition 2: Soft Reminder (12:30 AM to 4:00 AM)
            else if ((hours === 0 && minutes >= 30) || (hours >= 1 && hours < 4)) {
              setShowBlocker(false);
              if (!isDismissed) {
                setShowReminder(true);
              } else {
                setShowReminder(false);
              }
            } else {
              // Outside target alert hours, do not show reminder or blocker
              setShowBlocker(false);
              setShowReminder(false);
            }
          } else {
            setShowReminder(false);
            setShowBlocker(false);
          }
        }
      } catch (err) {
        console.error("Night Audit checker error:", err);
      }
    };

    // Run check immediately
    checkNightAuditStatus();

    // Check periodically (every 2 minutes for faster updates)
    const interval = setInterval(checkNightAuditStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isDashboard, isDismissed, shouldBlock]);

  // If dismissed, auto-reset dismissal after 30 minutes to remind again
  useEffect(() => {
    if (isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 30 * 60 * 1000); // 30 minutes
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  return (
    <>
      {/* Soft Reminder Card (Bottom Right Popup) */}
      {showReminder && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#18181b]/95 border border-amber-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <AlertTriangle size={18} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white tracking-tight">Night Audit Reminder</h4>
                <button 
                  onClick={() => setIsDismissed(true)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                The business date is still set to <span className="font-semibold text-zinc-300">{businessDate}</span>. Please complete the date rollover.
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
      )}

      {/* Hard Blocker Overlay (Full-screen) */}
      {showBlocker && (
        <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 backdrop-blur-lg flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#18181b] border border-amber-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6 border-t-amber-500">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
              <AlertTriangle size={32} className="animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Date Rollover Required</h3>
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest">
                Operations Locked (Overdue after 4:00 AM)
              </p>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Front office operations are locked because the system business date (<span className="text-zinc-200 font-bold">{businessDate}</span>) is behind the actual calendar date. To prevent financial inconsistencies, you must perform the Night Audit rollover.
            </p>

            <div className="pt-4 border-t border-white/[0.04]">
              <Link
                href="/dashboard/night-audit"
                className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 active:scale-[0.98]"
              >
                Go to Night Audit <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
