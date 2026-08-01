"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPartnerMonthlyReport, getDateSpecificDrilldown, PartnerReportSummary, DateDrilldownData } from '@/app/actions/partner-report';
import {
  TrendingUp,
  IndianRupee,
  Users,
  Printer,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  ShieldCheck,
  Eye,
  CreditCard,
  Building2,
  Clock,
  Receipt,
  FileText,
  AlertCircle,
  X,
  ChevronRight,
  Loader2,
  LayoutDashboard
} from 'lucide-react';

export default function PartnerReportPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string>('StaySync PG');
  const [userRole, setUserRole] = useState<'admin' | 'partner' | 'owner'>('partner');
  
  // Selected Month (e.g. "2026-07")
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Financial Report State
  const [report, setReport] = useState<PartnerReportSummary | null>(null);

  // Date Drilldown State (e.g. 5th of the month)
  const [drilldownDate, setDrilldownDate] = useState<string>(
    `${new Date().toISOString().slice(0, 7)}-05`
  );
  const [drilldownData, setDrilldownData] = useState<DateDrilldownData | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState<boolean>(false);
  const [showDrilldownModal, setShowDrilldownModal] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch user profile & property
      const { data: profile } = await supabase
        .from('profiles')
        .select('property_id, role, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole((profile.role as any) || 'partner');
        if (profile.property_id) {
          setPropertyId(profile.property_id);

          const { data: prop } = await supabase
            .from('properties')
            .select('name')
            .eq('id', profile.property_id)
            .single();

          if (prop) setPropertyName(prop.name);

          // Fetch Monthly Report
          const reportRes = await getPartnerMonthlyReport(profile.property_id, selectedMonth);
          if (reportRes.success && reportRes.data) {
            setReport(reportRes.data);
          }
        }
      }
      setLoading(false);
    }

    init();
  }, [selectedMonth]);

  // Handle Date Search / Drilldown (e.g. 5th of the month)
  const handleFetchDrilldown = async (dateStr: string) => {
    if (!propertyId) return;
    setDrilldownLoading(true);
    setDrilldownDate(dateStr);
    const res = await getDateSpecificDrilldown(propertyId, dateStr);
    if (res.success && res.data) {
      setDrilldownData(res.data);
      setShowDrilldownModal(true);
    }
    setDrilldownLoading(false);
  };

  // Trigger window print
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-sm text-zinc-400">Loading Partner Financial Dashboard...</span>
      </div>
    );
  }

  const isPartner = userRole === 'partner';

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      
      {/* 🖨️ PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">{propertyName} — Monthly Partner Profit Statement</h1>
        <p className="text-xs text-gray-600">Month: {selectedMonth} | Generated: {new Date().toLocaleDateString()}</p>
        <p className="text-xs text-gray-600">Calculated via Realized Cash & UPI Monthly Settlement (1st to Month-End)</p>
      </div>

      {/* TOP NAV BAR (WEB) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <LayoutDashboard size={18} />
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <PieChart size={12} /> Partner Report
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            {propertyName} — Live Profit-Sharing Engine
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real-time monthly revenue, expense auditing, and investment share distributions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Configure Partner Capital Button */}
          <Link
            href="/dashboard/property-setup"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Building2 size={14} />
            <span>Configure Capital & Partners</span>
          </Link>

          {/* Read-Only Badge for Partners */}
          {isPartner ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Eye size={14} /> Read-Only Partner Audit Mode
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck size={14} /> Admin Controls Active
            </div>
          )}

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5">
            <Calendar size={14} className="text-zinc-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            />
          </div>

        </div>
      </div>

      {/* 📊 SUMMARY METRICS HEADER CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* Operating Rent Revenue Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <IndianRupee size={18} />
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Operating Revenue</span>
          </div>
          <p className="text-[11px] text-zinc-500 uppercase font-semibold">Total Monthly Rent</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            ₹{(report?.totalIncome || 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-3 pt-3 border-t border-zinc-800">
            <span>Cash: <strong className="text-zinc-200">₹{(report?.cashIncome || 0).toLocaleString('en-IN')}</strong></span>
            <span>UPI: <strong className="text-emerald-400">₹{(report?.upiIncome || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Security Deposits Held (Trust Fund) Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck size={18} />
            </div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Refundable Liability</span>
          </div>
          <p className="text-[11px] text-zinc-500 uppercase font-semibold">Security Deposits Held</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-indigo-300 tracking-tight mt-0.5">
            ₹{(report?.securityDepositsHeld || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-zinc-500 mt-3 pt-3 border-t border-zinc-800">
            Held in trust separately; excluded from operating revenue & profit.
          </p>
        </div>

        {/* Expenses & Payroll Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingUp size={18} className="rotate-180" />
            </div>
            <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Deductions</span>
          </div>
          <p className="text-[11px] text-zinc-500 uppercase font-semibold">Expenses & Payroll</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            ₹{(report?.totalExpenses || 0).toLocaleString('en-IN')}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-3 pt-3 border-t border-zinc-800">
            <span>Ops: <strong className="text-zinc-200">₹{(report?.operationalExpenses || 0).toLocaleString('en-IN')}</strong></span>
            <span>Payroll: <strong className="text-rose-400">₹{(report?.payrollExpenses || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Net Distributable Profit Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.08)]">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Wallet size={18} />
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">Net Operating Profit</span>
          </div>
          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Net Distributable Profit</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight mt-0.5">
            ₹{(report?.netProfit || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-zinc-500 mt-3 pt-3 border-t border-zinc-800">
            100% Distributed dynamically based on partner investment shares
          </p>
        </div>

        {/* Date Search & Inspector Trigger Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
              <Search size={14} /> Date Search & Inspector
            </div>
            <p className="text-xs text-zinc-400">Search any day (e.g. 5th of month) for instant daily income vs expense breakdown.</p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="date"
              value={drilldownDate}
              onChange={(e) => setDrilldownDate(e.target.value)}
              className="bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white flex-1 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleFetchDrilldown(drilldownDate)}
              disabled={drilldownLoading}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
            >
              {drilldownLoading ? <Loader2 size={14} className="animate-spin" /> : 'Inspect'}
            </button>
          </div>
        </div>

      </div>

      {/* 🤝 DYNAMIC PARTNER PROFIT DISTRIBUTION SECTION */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-emerald-400" /> Partner Share Allocations & Dynamic Payouts
            </h2>
            <p className="text-xs text-zinc-400">Profit distribution based on partner equity investment percentages.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(report?.partnerPayouts || []).map((partner, index) => {
            const colors = [
              { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
              { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
              { border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400' },
              { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
              { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400' },
            ][index % 5];

            return (
              <motion.div
                key={partner.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-zinc-900/80 border ${colors.border} rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                      {partner.partner_name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-zinc-400">
                      {partner.share_percentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mt-3">Calculated Payout</p>
                  <p className={`text-2xl font-extrabold ${colors.text} tracking-tight mt-1`}>
                    ₹{partner.payout_amount.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Equity Share</span>
                  <span className="font-semibold text-zinc-300">{partner.share_percentage}% of Net</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 🔍 DATE DRILLDOWN MODAL / INSPECTOR (E.G. 5TH OF MONTH) */}
      <AnimatePresence>
        {showDrilldownModal && drilldownData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">
                    <Calendar size={14} /> Date-Specific Audit Inspection
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Daily Financial Report for {new Date(drilldownData.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDrilldownModal(false)}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Daily KPI Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">Total Collections</p>
                  <p className="text-lg font-bold text-emerald-400">
                    ₹{(drilldownData.totalCashReceived + drilldownData.totalUpiReceived).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-zinc-500">Cash: ₹{drilldownData.totalCashReceived} | UPI: ₹{drilldownData.totalUpiReceived}</p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">Total Expenses</p>
                  <p className="text-lg font-bold text-rose-400">
                    ₹{(drilldownData.totalCashExpenses + drilldownData.totalUpiExpenses).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-zinc-500">Cash: ₹{drilldownData.totalCashExpenses} | UPI: ₹{drilldownData.totalUpiExpenses}</p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">Net Cash-In-Hand</p>
                  <p className={`text-lg font-bold ${drilldownData.netCashInHand >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{drilldownData.netCashInHand.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-zinc-500">Daily Cash Drawer Balance</p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">Daily Net Profit</p>
                  <p className="text-lg font-bold text-indigo-400">
                    ₹{drilldownData.dailyNetProfit.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-zinc-500">Realized Income - Expense</p>
                </div>
              </div>

              {/* Collections & Expenses Side-by-Side Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Payments Received */}
                <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <IndianRupee size={16} /> Payments Received ({drilldownData.payments.length})
                  </h4>
                  {drilldownData.payments.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-4 text-center">No payment collections logged for this date.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {drilldownData.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 text-xs">
                          <div>
                            <p className="font-semibold text-white">{p.guest_name}</p>
                            <p className="text-[10px] text-zinc-400">{p.room_number} • {p.time || 'Completed'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-400">₹{p.amount.toLocaleString('en-IN')}</p>
                            <span className="text-[9px] uppercase font-bold bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded">
                              {p.payment_method}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expenses Incurred */}
                <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
                    <Receipt size={16} /> Expenses Incurred ({drilldownData.expenses.length})
                  </h4>
                  {drilldownData.expenses.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-4 text-center">No expenses logged for this date.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {drilldownData.expenses.map((e) => (
                        <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 text-xs">
                          <div>
                            <p className="font-semibold text-white">{e.title}</p>
                            <p className="text-[10px] text-zinc-400 uppercase">{e.category} • {e.timestamp}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-400">₹{e.amount.toLocaleString('en-IN')}</p>
                            <span className="text-[9px] uppercase font-bold bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded">
                              {e.payment_method}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setShowDrilldownModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
