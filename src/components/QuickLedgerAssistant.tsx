'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingDown, 
  Loader2,
  Building2,
  Sparkles,
  UserPlus,
  FileText
} from 'lucide-react';
import { processQuickLedger, undoQuickLedgerAction, QuickLedgerResult } from '@/app/actions/quick-ledger';
import { useRouter, usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  result?: QuickLedgerResult;
  timestamp: string;
  undoState?: 'idle' | 'undoing' | 'undone';
}

export default function QuickLedgerAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Read active property from localStorage or window
  useEffect(() => {
    const updateActiveProp = () => {
      const pId = localStorage.getItem('pms_active_property');
      if (pId && pId !== 'undefined' && pId !== 'null') {
        setActivePropertyId(pId);
      }
    };
    updateActiveProp();
    window.addEventListener('storage', updateActiveProp);
    return () => window.removeEventListener('storage', updateActiveProp);
  }, []);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Indian English handles Hinglish names and words well

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported on this browser. Please type your message.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition error:', err);
      }
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = 'usr_' + Date.now();
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [
      ...prev,
      { id: userMsgId, sender: 'user', text: textToSend, timestamp: timeStr }
    ]);

    setInput('');
    setIsLoading(true);

    try {
      const pId = activePropertyId || localStorage.getItem('pms_active_property') || undefined;
      const res = await processQuickLedger(textToSend, pId);

      const botMsgId = 'bot_' + Date.now();
      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          result: res,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          undoState: 'idle'
        }
      ]);

      if (res.success) {
        if (typeof window !== 'undefined') {
          // Play subtle vibration if supported on phone
          try { navigator.vibrate?.(40); } catch {}
          window.dispatchEvent(new CustomEvent('pms_quick_ledger_updated'));
          router.refresh();
        }
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'bot_err_' + Date.now(),
          sender: 'bot',
          result: {
            success: false,
            message: err.message || 'An error occurred while processing.'
          },
          timestamp: timeStr
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = async (msg: ChatMessage) => {
    if (!msg.result || msg.undoState === 'undoing' || msg.undoState === 'undone') return;

    setMessages(prev =>
      prev.map(m => (m.id === msg.id ? { ...m, undoState: 'undoing' } : m))
    );

    try {
      let undoPayload: any = null;
      if (msg.result.type === 'expense' && msg.result.expenseIds) {
        undoPayload = {
          type: 'expense',
          ids: msg.result.expenseIds
        };
      } else if (msg.result.type === 'revenue' && msg.result.paymentIds) {
        undoPayload = {
          type: 'revenue',
          ids: msg.result.paymentIds,
          bookingId: msg.result.bookingId,
          advAmountAdded: msg.result.advAmountAdded
        };
      } else if (msg.result.type === 'assign') {
        undoPayload = {
          type: 'assign',
          ids: msg.result.paymentIds || [],
          bookingId: msg.result.bookingId
        };
      }

      if (undoPayload) {
        const undoRes = await undoQuickLedgerAction(undoPayload);
        if (undoRes.success) {
          setMessages(prev =>
            prev.map(m => (m.id === msg.id ? { ...m, undoState: 'undone' } : m))
          );
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pms_quick_ledger_updated'));
            router.refresh();
          }
        } else {
          alert('Undo failed: ' + undoRes.message);
          setMessages(prev =>
            prev.map(m => (m.id === msg.id ? { ...m, undoState: 'idle' } : m))
          );
        }
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
      setMessages(prev =>
        prev.map(m => (m.id === msg.id ? { ...m, undoState: 'idle' } : m))
      );
    }
  };

  const suggestions = [
    'report of pending dues',
    'add akshith to room 204',
    'assign ravi room 201 rent 8000 adv 2000',
    'sathish 101 5000 rom fee and 2000 adv paid',
    'expences 700 vegitbales 200 oil 800 varalakshmi traders',
    'water tanker expences 22000'
  ];

  if (!pathname?.startsWith('/dashboard')) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white font-bold text-xs rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_35px_rgba(99,102,241,0.45)] border border-white/20 backdrop-blur-xl transition-all"
        title="Quick Ledger Chatbot"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300"></span>
        </span>
        <Zap size={16} className="text-yellow-300 fill-yellow-300" />
        <span className="tracking-wide font-black uppercase text-[11px]">Quick Ledger</span>
      </motion.button>

      {/* Slide-Up Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Chat Modal / Bottom Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full sm:max-w-lg bg-[#0c0c0e] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col h-[85vh] sm:h-[620px] max-h-[90vh] overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-4 px-5 border-b border-white/[0.08] bg-zinc-900/40 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Zap size={18} className="fill-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                      Quick Ledger Assistant
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">Active</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400">Type or speak rent payments & daily expenses</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-zinc-400">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-zinc-300">
                      <Sparkles size={26} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Two Streams • Zero Hassle</p>
                      <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                        Log tenant rents or property expenses with a quick message. Rooms and mess ledgers update instantly.
                      </p>
                    </div>

                    <div className="w-full text-left space-y-2 pt-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Quick Tap Examples:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(sug)}
                            className="text-left text-[11px] px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/[0.08] hover:border-indigo-500/30 text-zinc-300 hover:text-white transition-all"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {msg.sender === 'user' ? (
                        <div className="max-w-[85%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 px-4 shadow-md font-medium text-xs leading-relaxed">
                          {msg.text}
                          <div className="text-[9px] text-indigo-200/70 text-right mt-1 font-mono">{msg.timestamp}</div>
                        </div>
                      ) : (
                        <div className="max-w-[92%] w-full">
                          {msg.result?.success ? (
                            msg.result.type === 'revenue' ? (
                              /* REVENUE SUCCESS CARD */
                              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[11px] uppercase tracking-wider">
                                    <CheckCircle2 size={15} />
                                    <span>Revenue Recorded</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Tenant</span>
                                    <span className="text-xs font-bold text-white capitalize">{msg.result.tenantName} (Room {msg.result.roomNumber})</span>
                                  </div>
                                  {msg.result.feePaid ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">Room Fee Paid</span>
                                      <span className="text-xs font-bold text-emerald-400">₹{msg.result.feePaid.toLocaleString('en-IN')}</span>
                                    </div>
                                  ) : null}
                                  {msg.result.advPaid ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">Advance / Deposit Paid</span>
                                      <span className="text-xs font-bold text-cyan-400">₹{msg.result.advPaid.toLocaleString('en-IN')}</span>
                                    </div>
                                  ) : null}
                                  <div className="pt-1.5 border-t border-white/10 flex justify-between items-baseline">
                                    <span className="text-[11px] font-semibold text-zinc-300">Total Collected</span>
                                    <span className="text-sm font-black text-white">₹{msg.result.totalPaid?.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <div className="text-[11px]">
                                    <span className="text-zinc-500">Pending Due: </span>
                                    <span className={`font-black ${msg.result.newBalanceDue && msg.result.newBalanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      ₹{msg.result.newBalanceDue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleUndo(msg)}
                                    disabled={msg.undoState === 'undoing' || msg.undoState === 'undone'}
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                      msg.undoState === 'undone'
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    <RotateCcw size={12} className={msg.undoState === 'undoing' ? 'animate-spin' : ''} />
                                    {msg.undoState === 'undone' ? 'Undone' : msg.undoState === 'undoing' ? 'Undoing...' : 'Undo'}
                                  </button>
                                </div>
                              </div>
                            ) : msg.result.type === 'assign' ? (
                              /* ASSIGN TENANT SUCCESS CARD */
                              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-indigo-400 font-black text-[11px] uppercase tracking-wider">
                                    <UserPlus size={15} />
                                    <span>Tenant Assigned & Checked In</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Tenant</span>
                                    <span className="text-xs font-bold text-white capitalize">{msg.result.tenantName}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Assigned Room</span>
                                    <span className="text-xs font-bold text-indigo-300">Room {msg.result.roomNumber}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Monthly Rent</span>
                                    <span className="text-xs font-bold text-emerald-400">₹{msg.result.monthlyRent?.toLocaleString('en-IN')}/mo</span>
                                  </div>
                                  {msg.result.advPaid ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">Security Deposit / Adv</span>
                                      <span className="text-xs font-bold text-cyan-400">₹{msg.result.advPaid.toLocaleString('en-IN')}</span>
                                    </div>
                                  ) : null}
                                  <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                                    <span className="text-[11px] text-zinc-400">Rent Due Day</span>
                                    <span className="text-xs font-semibold text-zinc-200">{msg.result.dueDay}th of every month</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] text-emerald-400 font-semibold">Live in Front Office</span>
                                  <button
                                    onClick={() => handleUndo(msg)}
                                    disabled={msg.undoState === 'undoing' || msg.undoState === 'undone'}
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                      msg.undoState === 'undone'
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    <RotateCcw size={12} className={msg.undoState === 'undoing' ? 'animate-spin' : ''} />
                                    {msg.undoState === 'undone' ? 'Undone' : msg.undoState === 'undoing' ? 'Undoing...' : 'Undo'}
                                  </button>
                                </div>
                              </div>
                            ) : msg.result.type === 'dues_report' ? (
                              /* PENDING DUES REPORT CARD */
                              <div className="bg-amber-950/25 border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-amber-400 font-black text-[11px] uppercase tracking-wider">
                                    <FileText size={15} />
                                    <span>Pending Dues Report</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                {msg.result.duesCount === 0 ? (
                                  <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-center space-y-1">
                                    <div className="text-emerald-400 font-bold text-sm">🎉 All Clear!</div>
                                    <p className="text-[11px] text-zinc-400">Every active tenant is cleared till date with ₹0 pending dues.</p>
                                  </div>
                                ) : (
                                  <>
                                    {/* Summary Banner */}
                                    <div className="bg-black/50 rounded-xl p-3 border border-amber-500/20 flex items-center justify-between">
                                      <div>
                                        <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Total Pending Dues</div>
                                        <div className="text-lg font-black text-amber-400">
                                          ₹{msg.result.totalDues?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                          {msg.result.duesCount} {msg.result.duesCount === 1 ? 'Tenant' : 'Tenants'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Tenant Dues List */}
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                      {msg.result.duesList?.map((d, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-black/40 rounded-xl p-2.5 px-3 border border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between"
                                        >
                                          <div>
                                            <div className="font-bold text-white text-xs capitalize flex items-center gap-1.5">
                                              <span>{d.guestName}</span>
                                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                                Room {d.roomNumber}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-zinc-400 mt-0.5">
                                              Rent: ₹{d.monthlyRent.toLocaleString('en-IN')}/mo • Due day: {d.dueDay}th
                                            </div>
                                          </div>

                                          <div className="text-right">
                                            <div className="text-xs font-black text-amber-400">
                                              ₹{d.due.toLocaleString('en-IN')}
                                            </div>
                                            {d.paid > 0 ? (
                                              <div className="text-[9px] text-emerald-400">
                                                Paid: ₹{d.paid.toLocaleString('en-IN')}
                                              </div>
                                            ) : (
                                              <div className="text-[9px] text-zinc-500">Unpaid</div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="pt-1 text-[10px] text-zinc-500 flex items-center justify-between">
                                      <span>To pay: <span className="text-zinc-400 italic">"[name] [room] [amt]"</span></span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              /* EXPENSE SUCCESS CARD */
                              <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-rose-400 font-black text-[11px] uppercase tracking-wider">
                                    <TrendingDown size={15} />
                                    <span>Expense Recorded</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5">
                                  {msg.result.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between items-baseline text-[11px]">
                                      <span className="text-zinc-300">
                                        {item.description} <span className="text-[9px] text-zinc-500">({item.category})</span>
                                      </span>
                                      <span className="font-bold text-rose-400">₹{item.amount.toLocaleString('en-IN')}</span>
                                    </div>
                                  ))}
                                  <div className="pt-1.5 border-t border-white/10 flex justify-between items-baseline">
                                    <span className="text-[11px] font-semibold text-zinc-300">Total Deducted</span>
                                    <span className="text-sm font-black text-rose-300">₹{msg.result.totalExpense?.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => handleUndo(msg)}
                                    disabled={msg.undoState === 'undoing' || msg.undoState === 'undone'}
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                      msg.undoState === 'undone'
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    <RotateCcw size={12} className={msg.undoState === 'undoing' ? 'animate-spin' : ''} />
                                    {msg.undoState === 'undone' ? 'Undone' : msg.undoState === 'undoing' ? 'Undoing...' : 'Undo'}
                                  </button>
                                </div>
                              </div>
                            )
                          ) : (
                            /* ERROR CARD */
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 px-4 text-xs text-red-300 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertCircle size={14} />
                                <span>Could Not Log Entry</span>
                              </div>
                              <p className="text-[11px] text-zinc-400">{msg.result?.message}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-zinc-900/60 border-t border-white/[0.08] backdrop-blur-xl">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                    title={isListening ? 'Stop listening' : 'Speak entry via microphone'}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={isListening ? 'Listening...' : 'e.g. "sathish 101 5000 rom fee and 2000 adv paid"'}
                    disabled={isLoading}
                    className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
