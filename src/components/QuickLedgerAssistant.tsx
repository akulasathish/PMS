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
  FileText,
  Trash2,
  BookOpen,
  LogOut,
  AlertTriangle,
  CreditCard,
  UserCheck,
  ArrowRightLeft
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
  const [showCheatSheet, setShowCheatSheet] = useState(false);
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

  // Load saved chat history on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pms_quick_ledger_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load quick ledger history:', e);
      }
    }
  }, []);

  // Save chat history whenever messages change (keeps last 50 messages)
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem('pms_quick_ledger_history', JSON.stringify(messages.slice(-50)));
      } catch (e) {
        console.warn('Failed to save quick ledger history:', e);
      }
    }
  }, [messages]);

  const handleClearHistory = () => {
    if (confirm('Clear chat history? (Transactions already saved in database will NOT be deleted)')) {
      setMessages([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pms_quick_ledger_history');
      }
    }
  };

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
      } else if (msg.result.type === 'update_tenant') {
        undoPayload = {
          type: 'update_tenant',
          bookingId: msg.result.bookingId,
          prevValues: msg.result.prevValues
        };
      } else if (msg.result.type === 'checkout') {
        undoPayload = {
          type: 'checkout',
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

  const BOT_COMMAND_CATEGORIES = [
    {
      category: '📊 Resident Statements & Dues Reports',
      items: [
        { label: 'Resident Ledger Statement', prompt: 'report of srikanth 201' },
        { label: 'Statement by Room', prompt: 'report of room 201' },
        { label: 'All Pending Dues', prompt: 'report of pending dues' },
        { label: 'Who Has Pending Dues?', prompt: 'who has pending dues' },
        { label: "Today's Summary (Rev vs Exp)", prompt: 'today summary' },
        { label: "Today's Ledger History", prompt: 'today history' }
      ]
    },
    {
      category: '👤 New Tenant Admission',
      items: [
        { label: 'Clean Admission (All Details)', prompt: 'join sathish to room 201, joined on 1st october 2026, due date 5th, refundable 1000 paid, maintenance 1000 paid, room fee paid 8000' },
        { label: 'Admission with Due Balances', prompt: 'join sathish to room 201, joined on 1st october 2026, due date 5th, refundable due 1000, maintenance due 1000, room fee due 8000' },
        { label: 'With Bed Sharing & Deposit', prompt: 'add sathish to room 201 3 share 8500 room fee and 1000 refundable' },
        { label: 'Quick Admission', prompt: 'join sathish to room 201' }
      ]
    },
    {
      category: '💰 Rent & Fee Payments',
      items: [
        { label: 'Rent Paid on Date', prompt: 'srikanth room 201 paid 8500 on 1st' },
        { label: 'Rent + Security Deposit', prompt: 'sathish 101 5000 room fee and 1000 deposit paid' },
        { label: 'Full Month Rent', prompt: 'srikanth 201 paid full rent for october' },
        { label: 'Rent + Maintenance Fee', prompt: 'srikanth 201 paid 8500 room fee and 1000 maintenance' }
      ]
    },
    {
      category: '🛒 Daily Property Expenses',
      items: [
        { label: 'Groceries & Vegetables', prompt: 'paid 1200 groceries and 350 vegetables' },
        { label: 'Water Tanker Utility', prompt: 'water tanker expences 2500' },
        { label: 'Electrician / Plumber Repairs', prompt: 'electrician repair 850 expences' },
        { label: 'Staff Salary', prompt: 'cleaner ramesh salary 8000 expences' },
        { label: 'Multi-Item Grocery Bill', prompt: 'expences 700 vegetables 200 oil 800 rice' }
      ]
    },
    {
      category: '📅 Daily Basis Guests (Short Stay)',
      items: [
        { label: 'Daily with Partial Pay', prompt: 'kiran joined room 204 daily basis per day 600 total 2 days paid 600 pending 600' },
        { label: 'Daily with Full Pay', prompt: 'guest rajesh room 201 3 days 1500 paid' },
        { label: 'Daily 2 Days @ 500', prompt: 'add guest suresh room 301 2 days 500 per day paid 500' }
      ]
    },
    {
      category: '✏️ Change Dates & Profile',
      items: [
        { label: 'Change Joining Date', prompt: 'change joining date of room 201 to 1st october' },
        { label: 'Change Rent Due Date', prompt: 'change due date of room 201 to 10th' },
        { label: 'Change Both Dates', prompt: 'change joining date to 1st and due date to 10th for room 201 srikanth' },
        { label: 'Change Monthly Rent', prompt: 'change rent of room 201 to 8500' }
      ]
    },
    {
      category: '🚪 Resident Checkout & Vacate',
      items: [
        { label: 'Checkout Resident', prompt: 'checkout srikanth from room 201' },
        { label: 'Force Checkout with Dues', prompt: 'force checkout srikanth room 201' },
        { label: 'Vacate Room', prompt: 'checkout room 201' }
      ]
    }
  ];

  const suggestions = [
    'report of srikanth 201',
    'report of pending dues',
    'today summary',
    'srikanth room 201 paid 8500',
    'join sathish to room 201, joined on 1st october 2026, due date 5th, refundable 1000 paid, maintenance 1000 paid, room fee paid 8000',
    'paid 1200 groceries and 350 vegetables',
    'water tanker expences 2500',
    'change due date of room 201 to 10th',
    'checkout srikanth from room 201'
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
              className="relative w-full sm:max-w-2xl lg:max-w-3xl bg-[#0c0c0e] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col h-[92dvh] sm:h-[680px] lg:h-[720px] max-h-[95dvh] overflow-hidden z-10 transition-all"
            >
              {/* Header */}
              <div className="p-3.5 sm:p-4 px-4 sm:px-5 border-b border-white/[0.08] bg-zinc-900/60 backdrop-blur-md flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 flex-shrink-0 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Zap size={16} className="fill-emerald-400 sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                      Quick Ledger Assistant
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider flex-shrink-0">Live</span>
                    </h3>
                    <p className="hidden sm:block text-[10px] text-zinc-400 truncate">Instant voice & text ledger for front office</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowCheatSheet(prev => !prev)}
                    className={`text-[10px] sm:text-[11px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors border ${
                      showCheatSheet
                        ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40 shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5'
                    }`}
                    title="Toggle All Commands Guide"
                  >
                    <BookOpen size={12} className="text-yellow-400" />
                    <span className="font-bold">Commands</span>
                  </button>

                  {messages.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-[10px] sm:text-[11px] flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors border border-white/5"
                      title="Clear chat history"
                    >
                      <Trash2 size={12} />
                      <span className="hidden md:inline">Clear</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Collapsible Commands Cheat Sheet Panel */}
              <AnimatePresence>
                {showCheatSheet && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/[0.08] bg-black/90 backdrop-blur-xl"
                  >
                    <div className="p-3.5 sm:p-4 space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-yellow-400" /> All Quick Chat Commands
                        </span>
                        <span className="text-[9px] text-zinc-500">Tap any to load into chat</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        {BOT_COMMAND_CATEGORIES.map((cat, idx) => (
                          <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 sm:p-3 space-y-2">
                            <span className="text-[11px] font-bold text-indigo-300 block border-b border-white/5 pb-1">{cat.category}</span>
                            <div className="space-y-1.5">
                              {cat.items.map((item, iIdx) => (
                                <button
                                  key={iIdx}
                                  onClick={() => {
                                    setInput(item.prompt);
                                    setShowCheatSheet(false);
                                    if (inputRef.current) inputRef.current.focus();
                                  }}
                                  className="w-full text-left text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/30 text-zinc-300 hover:text-white transition-all flex flex-col gap-0.5 group"
                                  title={item.prompt}
                                >
                                  <span className="font-semibold text-white group-hover:text-indigo-200">{item.label}</span>
                                  <span className="text-[9px] text-zinc-500 font-mono truncate w-full">&bull; {item.prompt}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Message List */}
              <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center py-4 px-2 space-y-5 text-zinc-400 max-w-xl mx-auto">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-zinc-200 mb-2.5 shadow-inner">
                        <Sparkles size={22} className="text-indigo-400" />
                      </div>
                      <h4 className="font-black text-white text-base tracking-tight">Quick Ledger Assistant</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        Say or type entries naturally to record rent, admit residents, track daily expenses, or pull instant statements.
                      </p>
                    </div>

                    <div className="w-full space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Featured Quick Actions</span>
                        <button
                          type="button"
                          onClick={() => setShowCheatSheet(true)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                        >
                          <span>View All 25+ Commands &rarr;</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInput('report of srikanth 201');
                            if (inputRef.current) inputRef.current.focus();
                          }}
                          className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-indigo-500/15 border border-white/5 hover:border-indigo-500/30 transition-all group"
                        >
                          <div className="text-[11px] font-bold text-white group-hover:text-indigo-300 flex items-center gap-1.5">
                            <UserCheck size={13} className="text-indigo-400" /> Resident Statement
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">report of srikanth 201</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInput('report of pending dues');
                            if (inputRef.current) inputRef.current.focus();
                          }}
                          className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/30 transition-all group"
                        >
                          <div className="text-[11px] font-bold text-white group-hover:text-amber-300 flex items-center gap-1.5">
                            <FileText size={13} className="text-amber-400" /> Pending Dues List
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">report of pending dues</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInput('join sathish to room 201, joined on 1st october 2026, due date 5th, refundable 1000 paid, maintenance 1000 paid, room fee paid 8000');
                            if (inputRef.current) inputRef.current.focus();
                          }}
                          className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-emerald-500/15 border border-white/5 hover:border-emerald-500/30 transition-all group"
                        >
                          <div className="text-[11px] font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                            <UserPlus size={13} className="text-emerald-400" /> New Tenant Admission
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">join sathish to room 201...</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInput('paid 1200 groceries and 350 vegetables');
                            if (inputRef.current) inputRef.current.focus();
                          }}
                          className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-rose-500/15 border border-white/5 hover:border-rose-500/30 transition-all group"
                        >
                          <div className="text-[11px] font-bold text-white group-hover:text-rose-300 flex items-center gap-1.5">
                            <TrendingDown size={13} className="text-rose-400" /> Daily Property Expense
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">paid 1200 groceries...</div>
                        </button>
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
                          {msg.result?.hasPendingDues ? (
                            /* PENDING DUES DECISION CARD (2 OPTIONS) */
                            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 shadow-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-rose-400 font-black text-[11px] uppercase tracking-wider">
                                  <AlertTriangle size={15} />
                                  <span>Pending Dues Detected</span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                              </div>

                              <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-[11px] text-zinc-400">Resident</span>
                                  <span className="text-xs font-bold text-white capitalize">{msg.result.tenantName} (Room {msg.result.roomNumber})</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                                  <span className="text-[11px] text-rose-300 font-bold">Outstanding Balance Due</span>
                                  <span className="text-sm font-black text-rose-400 font-mono">₹{msg.result.pendingDues?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>

                              <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                Folio is not settled. Choose how you want to proceed:
                              </p>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSend(`${msg.result?.tenantName} room ${msg.result?.roomNumber} paid ${msg.result?.pendingDues} room fee`)}
                                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white font-bold text-[11px] border border-emerald-500/30 transition-all text-center shadow"
                                >
                                  <CreditCard size={13} />
                                  <span>Settle & Checkout</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSend(`force checkout ${msg.result?.tenantName} room ${msg.result?.roomNumber}`)}
                                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-[11px] border border-rose-500/30 transition-all text-center shadow"
                                >
                                  <LogOut size={13} />
                                  <span>Force Checkout</span>
                                </button>
                              </div>
                            </div>
                          ) : msg.result?.success ? (
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
                                  {msg.result.paymentDate ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">Payment Date</span>
                                      <span className="text-xs font-bold text-amber-300">{msg.result.paymentDate}</span>
                                    </div>
                                  ) : null}
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
                                      ₹{Number(msg.result.newBalanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                    <span className="text-[11px] text-zinc-400">Tenant / Guest</span>
                                    <span className="text-xs font-bold text-white capitalize">{msg.result.tenantName}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Assigned Room</span>
                                    <span className="text-xs font-bold text-indigo-300">Room {msg.result.roomNumber}</span>
                                  </div>
                                  {msg.result.isDaily ? (
                                    <>
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[11px] text-zinc-400">Stay Type</span>
                                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/25">Daily Basis ({msg.result.stayDays} Day{msg.result.stayDays && msg.result.stayDays > 1 ? 's' : ''})</span>
                                      </div>
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[11px] text-zinc-400">Duration</span>
                                        <span className="text-xs font-mono font-bold text-zinc-200">{msg.result.checkInDate} &rarr; {msg.result.checkOutDate}</span>
                                      </div>
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[11px] text-zinc-400">Daily Tariff Rate</span>
                                        <span className="text-xs font-bold text-white font-mono">₹{msg.result.perDayRate?.toLocaleString('en-IN')}/day</span>
                                      </div>
                                      <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                                        <span className="text-[11px] font-semibold text-zinc-300">Total Tariff</span>
                                        <span className="text-sm font-black text-white font-mono">₹{msg.result.totalTariff?.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[11px] text-zinc-400">Paid Now</span>
                                        <span className="text-xs font-bold text-emerald-400 font-mono">₹{msg.result.paidAmount?.toLocaleString('en-IN')}</span>
                                      </div>
                                      <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                                        <span className="text-[11px] font-bold text-rose-300">Pending Balance Due</span>
                                        <span className={`text-sm font-black font-mono ${msg.result.newBalanceDue && msg.result.newBalanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                          ₹{msg.result.newBalanceDue?.toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {msg.result.checkInDate ? (
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[11px] text-zinc-400">Joined Date</span>
                                          <span className="text-xs font-bold text-amber-300">{msg.result.checkInDate}</span>
                                        </div>
                                      ) : null}
                                      {msg.result.sharing ? (
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[11px] text-zinc-400">Bed Sharing</span>
                                          <span className="text-xs font-bold text-amber-300">{msg.result.sharing}-Share Bed</span>
                                        </div>
                                      ) : null}
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[11px] text-zinc-400">Individual Rent</span>
                                        <span className="text-xs font-bold text-emerald-400">₹{msg.result.monthlyRent?.toLocaleString('en-IN')}/mo</span>
                                      </div>
                                      {msg.result.feePaid !== undefined ? (
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[11px] text-zinc-400">Rent Paid Now</span>
                                          <span className="text-xs font-bold text-emerald-400 font-mono">₹{msg.result.feePaid.toLocaleString('en-IN')}</span>
                                        </div>
                                      ) : null}
                                      {msg.result.monthlyRent !== undefined && msg.result.feePaid !== undefined && (msg.result.monthlyRent - msg.result.feePaid) > 0 ? (
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[11px] font-bold text-rose-300">Pending Rent Due</span>
                                          <span className="text-xs font-bold text-rose-400 font-mono">₹{(msg.result.monthlyRent - msg.result.feePaid).toLocaleString('en-IN')}</span>
                                        </div>
                                      ) : null}
                                      {msg.result.refundableDeposit ? (
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[11px] text-zinc-400">Refundable Amount</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-emerald-400 font-mono">₹{msg.result.refundableDeposit.toLocaleString('en-IN')}</span>
                                            {msg.result.depositPaid !== undefined && msg.result.depositPaid === 0 ? (
                                              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1 rounded">Due</span>
                                            ) : (
                                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1 rounded">Paid</span>
                                            )}
                                          </div>
                                        </div>
                                      ) : null}
                                      {msg.result.maintenanceFee ? (
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[11px] text-zinc-400">Maintenance (Non-Ref)</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-amber-400 font-mono">₹{msg.result.maintenanceFee.toLocaleString('en-IN')}</span>
                                            {msg.result.maintPaid !== undefined && msg.result.maintPaid === 0 ? (
                                              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1 rounded">Due</span>
                                            ) : (
                                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1 rounded">Paid</span>
                                            )}
                                          </div>
                                        </div>
                                      ) : null}
                                      {!msg.result.refundableDeposit && !msg.result.maintenanceFee && msg.result.advPaid ? (
                                        <div className="flex justify-between items-baseline">
                                          <span className="text-[11px] text-zinc-400">Security Deposit / Adv</span>
                                          <span className="text-xs font-bold text-cyan-400">₹{msg.result.advPaid.toLocaleString('en-IN')}</span>
                                        </div>
                                      ) : null}
                                      <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                                        <span className="text-[11px] text-zinc-400">Rent Due Day</span>
                                        <span className="text-xs font-semibold text-zinc-200">{msg.result.dueDay}th of every month</span>
                                      </div>
                                    </>
                                  )}
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
                            ) : msg.result.type === 'move_tenant' ? (
                              /* MOVE TENANT SUCCESS CARD */
                              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-indigo-400 font-black text-[11px] uppercase tracking-wider">
                                    <ArrowRightLeft size={15} />
                                    <span>Resident Room Shifted</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Resident</span>
                                    <span className="text-xs font-bold text-white capitalize">{msg.result.tenantName}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Moved From</span>
                                    <span className="text-xs font-bold text-zinc-400">Room {msg.result.fromRoom}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">New Room</span>
                                    <span className="text-xs font-bold text-emerald-400">Room {msg.result.toRoom}</span>
                                  </div>
                                  {msg.result.newRent ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">New Monthly Rent</span>
                                      <span className="text-xs font-bold text-indigo-300">₹{msg.result.newRent.toLocaleString('en-IN')}/mo</span>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] text-emerald-400 font-semibold">Updated in Front Office</span>
                                </div>
                              </div>
                            ) : msg.result.type === 'update_tenant' ? (
                              /* UPDATE TENANT SUCCESS CARD */
                              <div className="bg-sky-950/30 border border-sky-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-sky-400 font-black text-[11px] uppercase tracking-wider">
                                    <CheckCircle2 size={15} />
                                    <span>Tenant Profile Updated</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Tenant</span>
                                    <span className="text-xs font-bold text-white capitalize">{msg.result.tenantName} (Room {msg.result.roomNumber})</span>
                                  </div>
                                  {msg.result.checkInDate ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">Joining Date</span>
                                      <span className="text-xs font-bold text-emerald-400">{msg.result.checkInDate}</span>
                                    </div>
                                  ) : null}
                                  {msg.result.dueDay ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">Rent Due Date</span>
                                      <span className="text-xs font-bold text-amber-300">{msg.result.dueDay}th of month</span>
                                    </div>
                                  ) : null}
                                  {msg.result.monthlyRent ? (
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[11px] text-zinc-400">Monthly Rent</span>
                                      <span className="text-xs font-bold text-indigo-300">₹{msg.result.monthlyRent.toLocaleString('en-IN')}/mo</span>
                                    </div>
                                  ) : null}
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
                            ) : msg.result.type === 'checkout' ? (
                              /* CHECKOUT SUCCESS CARD */
                              <div className={`border rounded-2xl p-4 shadow-lg space-y-2.5 ${msg.result.isForce ? 'bg-amber-950/30 border-amber-500/30' : 'bg-emerald-950/30 border-emerald-500/30'}`}>
                                <div className="flex items-center justify-between">
                                  <div className={`flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider ${msg.result.isForce ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    <LogOut size={15} />
                                    <span>{msg.result.isForce ? 'Force Checked Out' : 'Resident Checked Out'}</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Resident</span>
                                    <span className="text-xs font-bold text-white capitalize">{msg.result.tenantName}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Vacated Room</span>
                                    <span className="text-xs font-bold text-indigo-300">Room {msg.result.roomNumber}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline pt-1 border-t border-white/10">
                                    <span className="text-[11px] text-zinc-400">Settlement Status</span>
                                    <span className={`text-xs font-bold ${msg.result.isForce && msg.result.newBalanceDue ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      {msg.result.isForce && msg.result.newBalanceDue ? `₹${msg.result.newBalanceDue.toLocaleString('en-IN')} Unsettled (In Notes)` : 'Folio Settled (₹0 Due)'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] text-zinc-400">Room status updated</span>
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
                            ) : msg.result.type === 'tenant_report' && msg.result.tenantReport ? (
                              /* INDIVIDUAL TENANT LEDGER / STATEMENT CARD */
                              <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-950/60 to-purple-950/40 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-indigo-300 font-black text-[11px] uppercase tracking-wider">
                                    <UserCheck size={16} className="text-indigo-400" />
                                    <span>Resident Ledger Statement</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                                </div>

                                {/* Tenant Header Banner */}
                                <div className="bg-black/50 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-black text-white capitalize flex items-center gap-2">
                                      {msg.result.tenantReport.guestName}
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Room {msg.result.tenantReport.roomNumber}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 mt-0.5">
                                      Joined: <span className="text-amber-300 font-medium">{msg.result.tenantReport.checkInDate || 'N/A'}</span> • Due Day: <span className="text-zinc-200 font-medium">{msg.result.tenantReport.dueDay}th of month</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[10px] text-zinc-400 uppercase">Monthly Rent</div>
                                    <div className="text-xs font-bold text-emerald-400 font-mono">
                                      ₹{msg.result.tenantReport.monthlyRent.toLocaleString('en-IN')}/mo
                                    </div>
                                  </div>
                                </div>

                                {/* Key Financial Highlights Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                  <div className="bg-black/50 rounded-xl p-2.5 border border-white/5">
                                    <div className="text-[10px] text-zinc-400 font-medium uppercase">Monthly Rent</div>
                                    <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">₹{msg.result.tenantReport.monthlyRent.toLocaleString('en-IN')}</div>
                                  </div>
                                  <div className="bg-black/50 rounded-xl p-2.5 border border-emerald-500/10">
                                    <div className="text-[10px] text-emerald-400/80 font-medium uppercase">Rent Paid</div>
                                    <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">₹{msg.result.tenantReport.totalRentPaid.toLocaleString('en-IN')}</div>
                                  </div>
                                  <div className="bg-black/50 rounded-xl p-2.5 border border-rose-500/10">
                                    <div className="text-[10px] text-rose-400/80 font-medium uppercase">Pending Rent</div>
                                    <div className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${msg.result.tenantReport.pendingRentDue > 0 ? 'text-rose-400 font-black' : 'text-emerald-400'}`}>
                                      {msg.result.tenantReport.pendingRentDue > 0 ? `₹${msg.result.tenantReport.pendingRentDue.toLocaleString('en-IN')}` : '₹0 (Clear)'}
                                    </div>
                                  </div>
                                  <div className="bg-black/50 rounded-xl p-2.5 border border-cyan-500/10">
                                    <div className="text-[10px] text-cyan-400/80 font-medium uppercase">Total Paid</div>
                                    <div className="text-xs sm:text-sm font-bold text-cyan-300 font-mono mt-0.5">₹{msg.result.tenantReport.totalPaidOverall.toLocaleString('en-IN')}</div>
                                  </div>
                                </div>

                                {/* Financial Details */}
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-zinc-400">Total Rent Paid</span>
                                    <span className="text-xs font-bold text-emerald-400 font-mono">₹{msg.result.tenantReport.totalRentPaid.toLocaleString('en-IN')}</span>
                                  </div>

                                  <div className="flex justify-between items-baseline pt-1 border-t border-white/5">
                                    <span className="text-[11px] font-semibold text-rose-300">Pending Rent Due</span>
                                    <span className={`text-xs font-mono ${msg.result.tenantReport.pendingRentDue > 0 ? 'text-rose-400 font-black text-sm' : 'text-emerald-400 font-bold'}`}>
                                      {msg.result.tenantReport.pendingRentDue > 0 ? `₹${msg.result.tenantReport.pendingRentDue.toLocaleString('en-IN')}` : '₹0 (Cleared)'}
                                    </span>
                                  </div>

                                  {msg.result.tenantReport.refundableDeposit ? (
                                    <div className="flex justify-between items-baseline pt-1 border-t border-white/5">
                                      <span className="text-[11px] text-zinc-400">Refundable Deposit</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-emerald-400 font-mono">₹{msg.result.tenantReport.refundableDeposit.toLocaleString('en-IN')}</span>
                                        {msg.result.tenantReport.depositPaid >= msg.result.tenantReport.refundableDeposit ? (
                                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1 rounded">Paid</span>
                                        ) : (
                                          <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1 rounded">Due</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}

                                  {msg.result.tenantReport.maintenanceFee ? (
                                    <div className="flex justify-between items-baseline pt-1 border-t border-white/5">
                                      <span className="text-[11px] text-zinc-400">Maintenance Fee</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-amber-400 font-mono">₹{msg.result.tenantReport.maintenanceFee.toLocaleString('en-IN')}</span>
                                        {msg.result.tenantReport.maintenancePaid >= msg.result.tenantReport.maintenanceFee ? (
                                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1 rounded">Paid</span>
                                        ) : (
                                          <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1 rounded">Due</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}

                                  <div className="flex justify-between items-baseline pt-1.5 border-t border-white/10">
                                    <span className="text-[11px] font-bold text-zinc-200">Total Collected Till Date</span>
                                    <span className="text-sm font-black text-white font-mono">₹{msg.result.tenantReport.totalPaidOverall.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>

                                {/* Month-by-Month Breakdown (if multi-month) */}
                                {msg.result.tenantReport.monthBreakdown && msg.result.tenantReport.monthBreakdown.length > 1 ? (
                                  <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">Month-by-Month Rent Breakdown</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {msg.result.tenantReport.monthBreakdown.map((m, idx) => (
                                        <div key={idx} className="bg-black/30 rounded-lg p-2 border border-white/5 flex items-center justify-between text-[11px]">
                                          <div>
                                            <div className="font-semibold text-zinc-200">{m.month}</div>
                                            <div className="text-[10px] text-zinc-400 font-mono">Rent: ₹{m.rentCharged.toLocaleString('en-IN')}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="font-bold text-emerald-400 font-mono">₹{m.rentPaid.toLocaleString('en-IN')} Paid</div>
                                            <span className={`text-[10px] font-semibold px-1 rounded ${m.due > 0 ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                                              {m.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {/* Recent Payments History */}
                                {msg.result.tenantReport.payments && msg.result.tenantReport.payments.length > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">Payment History ({msg.result.tenantReport.payments.length})</div>
                                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                      {msg.result.tenantReport.payments.map((p, idx) => (
                                        <div key={p.id || idx} className="bg-black/30 rounded-lg p-2 border border-white/5 flex items-center justify-between text-[11px]">
                                          <div>
                                            <span className="font-semibold text-zinc-200">{p.allocation}</span>
                                            {p.billingPeriod ? <span className="text-[10px] text-amber-300 ml-1.5 font-medium">({p.billingPeriod})</span> : null}
                                            <span className="text-[10px] text-zinc-500 ml-2 font-mono">{p.date} • {p.method}</span>
                                          </div>
                                          <span className="font-bold text-emerald-400 font-mono">₹{p.amount.toLocaleString('en-IN')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
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
                                            {((d.maintDue && d.maintDue > 0) || (d.depositDue && d.depositDue > 0)) ? (
                                              <div className="text-[9px] text-amber-400/90 font-medium mt-0.5">
                                                {[
                                                  d.rentDue !== undefined && d.rentDue > 0 ? `Rent: ₹${d.rentDue.toLocaleString('en-IN')}` : null,
                                                  d.maintDue && d.maintDue > 0 ? `Maint: ₹${d.maintDue.toLocaleString('en-IN')}` : null,
                                                  d.depositDue && d.depositDue > 0 ? `Deposit: ₹${d.depositDue.toLocaleString('en-IN')}` : null
                                                ].filter(Boolean).join(' • ')}
                                              </div>
                                            ) : null}
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
                            ) : msg.result.type === 'today_summary' ? (
                              /* TODAY SUMMARY CARD */
                              <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-zinc-900 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-indigo-400 font-black text-[11px] uppercase tracking-wider">
                                    <Sparkles size={15} />
                                    <span>Today's Ledger Summary</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-mono">{msg.result.todayDateStr}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-black/50 rounded-xl p-2.5 border border-white/5">
                                    <div className="text-[9px] uppercase font-bold text-zinc-400">Revenue</div>
                                    <div className="text-xs font-black text-emerald-400 mt-0.5">
                                      ₹{msg.result.todayRevenue?.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[8px] text-zinc-500">{msg.result.todayRevenueCount} payment(s)</div>
                                  </div>
                                  <div className="bg-black/50 rounded-xl p-2.5 border border-white/5">
                                    <div className="text-[9px] uppercase font-bold text-zinc-400">Expenses</div>
                                    <div className="text-xs font-black text-rose-400 mt-0.5">
                                      ₹{msg.result.todayExpense?.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[8px] text-zinc-500">{msg.result.todayExpenseCount} bill(s)</div>
                                  </div>
                                  <div className="bg-black/50 rounded-xl p-2.5 border border-white/5">
                                    <div className="text-[9px] uppercase font-bold text-zinc-400">Net Cash</div>
                                    <div className={`text-xs font-black mt-0.5 ${(msg.result.todayNet || 0) >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                                      ₹{msg.result.todayNet?.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[8px] text-zinc-500">In / Out</div>
                                  </div>
                                </div>

                                <p className="text-[10px] text-zinc-400 text-center italic">
                                  Scroll up in chat to view your full action history and one-tap undo buttons.
                                </p>
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
              <div className="p-3 sm:p-4 bg-zinc-900/60 border-t border-white/[0.08] backdrop-blur-xl space-y-2.5">
                {/* Quick chip shortcuts bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none text-[11px] touch-pan-x">
                  <button
                    type="button"
                    onClick={() => setShowCheatSheet(prev => !prev)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/35 transition-all shadow-sm"
                  >
                    <BookOpen size={11} className="text-yellow-400" />
                    <span>All Commands</span>
                  </button>
                  {suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setInput(sug)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 hover:text-white border border-white/[0.08] transition-all whitespace-nowrap text-[11px]"
                      title={sug}
                    >
                      {sug}
                    </button>
                  ))}
                </div>

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
                    placeholder={isListening ? 'Listening...' : 'e.g. "report of srikanth 201", "paid 1200 groceries", "join sathish to 201..."'}
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
