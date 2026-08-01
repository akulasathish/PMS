"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getRevenueData } from '@/app/actions/analytics';
import { getAuditLogs } from '@/app/actions/audit';
import { logAdditionalIncome } from '@/app/actions/partner-report';
import { UserProfile } from '@/lib/types';
import { updateProperty } from '@/app/actions/property';


import {
  UtensilsCrossed,
  TrendingUp,
  IndianRupee,
  Users,
  BedDouble,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  BarChart3,
  ChevronRight,
  Wallet,
  Percent,
  LayoutDashboard,
  DoorOpen,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Loader2,
  Activity,
  Clock,
  KeyRound,
  ShieldAlert,
  Building2,
  ChevronsUpDown,
  Lock,
  Brush,
  Moon,
  Calendar,
  Receipt,
  X,
  RefreshCw,
  Sparkles,
  Check,
  CreditCard,
  Crown,
  Mail,
  ShieldCheck
} from 'lucide-react';


const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: true, module: 'analytics' },
  { icon: Receipt, label: "Partner Report", href: "/dashboard/partner-report", active: false, module: 'partner_report' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: false, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Moon, label: "Night Audit", href: "/dashboard/night-audit", active: false, module: 'night_audit' },
  { icon: Settings, label: "Settings", href: "#", active: false, module: 'settings' }, 
];

interface Property {
  id: string;
  name: string;
  location?: string;
  property_category?: 'PG' | 'Hotel/PG';
}

interface Room {
  id: string;
  property_id: string;
  room_number: string;
  type: string;
  status: string;
}

interface Booking {
  id: string;
  property_id: string;
  room_id: string;
  guest_name: string;
  check_in: string;
  status: string;
  amount: number;
}

// --- COLOR MAP (Tailwind JIT-safe) ---
const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
    glow: "shadow-[0_0_15px_rgba(99,102,241,0.15)]",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.15)]",
  },
};

// --- STATUS MAP ---
const statusStyles: Record<string, string> = {
  "Confirmed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Pending": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Checked In": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

// --- PREMIUM STAT CARD ---
const StatCard = ({ title, value, subtitle, icon: Icon, color = "indigo", trend, trendUp }: {
  title: string; value: string; subtitle: string; icon: React.ElementType; color?: string; trend: string; trendUp: boolean;
}) => {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden bg-zinc-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-500 group ${c.glow}`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className={`p-2.5 rounded-xl ${c.bg} ${c.text} border ${c.border}`}>
          <Icon size={18} />
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.12em] mb-1">{title}</p>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-[11px] text-zinc-600 mt-1.5">{subtitle}</p>
      </div>
      {/* Subtle gradient accent */}
      <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-20 ${c.bg} group-hover:opacity-40 transition-opacity duration-700`} />
    </motion.div>
  );
};

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [hasMultiplePartners, setHasMultiplePartners] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [accessiblePropsList, setAccessiblePropsList] = useState<{id: string, name: string, property_category?: 'PG' | 'Hotel/PG'}[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [revenueData, setRevenueData] = useState<{date: string, revenue: number}[]>([]);
  
  // --- AUDIT LOGS STATES ---
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // --- ANCILLARY INCOME STATES ---
  const [showAdditionalIncomeModal, setShowAdditionalIncomeModal] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState('Custom Cooking');
  const [incomeTitle, setIncomeTitle] = useState('');
  const [incomeTenant, setIncomeTenant] = useState('');
  const [incomeAmount, setIncomeAmount] = useState<number | ''>('');
  const [incomePaymentMethod, setIncomePaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [incomeSubmitting, setIncomeSubmitting] = useState(false);
  const [incomeSuccess, setIncomeSuccess] = useState('');

  const handleLogAdditionalIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property?.id || !incomeAmount) return;
    setIncomeSubmitting(true);
    setIncomeSuccess('');

    try {
      const res = await logAdditionalIncome({
        propertyId: property.id,
        category: incomeCategory,
        title: incomeTitle || `${incomeCategory} Charge`,
        amount: Number(incomeAmount),
        paymentMethod: incomePaymentMethod,
        tenantName: incomeTenant
      });

      if (res.success) {
        setIncomeSuccess('Ancillary income logged successfully!');
        setTimeout(() => {
          setShowAdditionalIncomeModal(false);
          setIncomeSuccess('');
          setIncomeTitle('');
          setIncomeTenant('');
          setIncomeAmount('');
        }, 1500);
      } else {
        alert(res.error || 'Failed to log income');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIncomeSubmitting(false);
    }
  };

  // --- SUBSCRIPTION & PLAN STATES ---
  const [showSubscriptionDrawer, setShowSubscriptionDrawer] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(2);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  // Mock form state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const fetchLogs = async () => {
    if (!property?.id) return;
    setLogsLoading(true);
    try {
      const res = await getAuditLogs(property.id, 50);
      if (res.success && res.data) {
        setActivityLogs(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  React.useEffect(() => {
    if (showActivityDrawer && property?.id) {
      fetchLogs();
    }
  }, [showActivityDrawer, property?.id]);
  
  
  // --- PAST DAYS AUDIT STATES ---
  const [auditDate, setAuditDate] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditResults, setAuditResults] = useState<{
    ran: boolean;
    roomsSold: number;
    bookingRevenue: number;
    cashCollected: number;
    bookings: any[];
    payments: any[];
  } | null>(null);

  // Set default audit date to today's local date
  React.useEffect(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    setAuditDate(localDate.toISOString().substring(0, 10));
  }, []);

  const runPastDaysAudit = async () => {
    if (!auditDate || !property?.id) return;
    setAuditLoading(true);
    try {
      const startOfDay = `${auditDate}T00:00:00.000`;
      const endOfDay = `${auditDate}T23:59:59.999`;

      const [bookingsRes, paymentsResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('property_id', property.id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('payments')
          .select('*')
          .eq('property_id', property.id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const filteredBookings = (bookingsRes.data || []).filter((b: any) => b.status !== 'Cancelled');
      const roomsSold = filteredBookings.length;
      const bookingRevenue = filteredBookings.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
      const cashCollected = (paymentsResult.data || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      setAuditResults({
        ran: true,
        roomsSold,
        bookingRevenue,
        cashCollected,
        bookings: filteredBookings,
        payments: paymentsResult.data || []
      });
    } catch (err) {
      console.error("Audit query failed:", err);
      alert("Failed to run performance audit. Please try again.");
    } finally {
      setAuditLoading(false);
    }
  };

  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        
        if (!user) {
          setIsLoading(false);
          return;
        }

        setAuthUser(user);

        // Check for forced password reset
        if (user.user_metadata?.requires_password_change === true) {
          setRequiresPasswordReset(true);
          setIsLoading(false);
          return;
        }

        const [accessiblePropertiesResult, profileResult] = await Promise.all([
          supabase
            .from('property_access')
            .select(`
              property_id,
              properties ( id, name, property_category )
            `)
            .eq('user_id', user.id),
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        ]);

        const accessibleProperties = accessiblePropertiesResult.data;
        const profile = profileResult.data;
        
        if (profile) setUserProfile(profile);

        let activePropertyId = null;
        let parsedPropsList: {id: string, name: string, property_category?: 'PG' | 'Hotel/PG'}[] = [];
        
        if (accessibleProperties && accessibleProperties.length > 0) {
          parsedPropsList = (accessibleProperties as unknown as { properties: { id: string, name: string, property_category?: 'PG' | 'Hotel/PG' } }[]).map((p) => p.properties);
          setAccessiblePropsList(parsedPropsList);
          
          const savedId = localStorage.getItem('pms_active_property');
          if (savedId && parsedPropsList.some(p => p.id === savedId)) {
            activePropertyId = savedId;
          } else {
            activePropertyId = parsedPropsList[0].id;
            localStorage.setItem('pms_active_property', activePropertyId);
          }
        } else if (profile?.property_id) {
          activePropertyId = profile.property_id;
          const { data: fallbackProp } = await supabase.from('properties').select('id, name').eq('id', activePropertyId).single();
          if (fallbackProp) {
            setAccessiblePropsList([fallbackProp]);
          }
        }
          
        if (activePropertyId) {
          const [propResult, roomsResult, bookingsResult, paymentsResult, partnersResult, analyticsResult] = await Promise.all([
            supabase
              .from('properties')
              .select('*')
              .eq('id', activePropertyId)
              .single(),
            supabase
              .from('rooms')
              .select('*')
              .eq('property_id', activePropertyId),
            supabase
              .from('bookings')
              .select('*')
              .eq('property_id', activePropertyId)
              .order('check_in', { ascending: false }),
            supabase
              .from('payments')
              .select('*')
              .eq('property_id', activePropertyId),
            supabase
              .from('partner_investments')
              .select('*')
              .eq('property_id', activePropertyId),
            getRevenueData(activePropertyId).catch((e) => {
              console.warn("Analytics fetch failed:", e);
              return { success: false, data: null };
            })
          ]);

          const propData = propResult.data;
          const roomsData = roomsResult.data;
          const bookingsData = bookingsResult.data;
          const paymentsData = paymentsResult.data;
          const partnersData = partnersResult.data;
          
          if (propData) {
            setProperty(propData);
          }
          if (roomsData) {
            setRooms(roomsData);
          }
          if (bookingsData) {
            setBookings(bookingsData);
          }
          if (paymentsData) {
            setPaymentsList(paymentsData);
          }
          if (partnersData) {
            setHasMultiplePartners(partnersData.length > 1);
          }
          if (analyticsResult && analyticsResult.success && analyticsResult.data) {
            setRevenueData(analyticsResult.data);
          }
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [supabase]);

  const switchProperty = (propId: string) => {
    localStorage.setItem('pms_active_property', propId);
    setShowPropertyDropdown(false);
    window.location.reload();
  };

  const handlePasswordReset = async (formData: FormData) => {
    setIsResetLoading(true);
    setResetError('');
    
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      setIsResetLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      setIsResetLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { requires_password_change: false }
    });

    if (error) {
      setResetError(error.message);
      setIsResetLoading(false);
      return;
    }

    // Success! Hide modal and trigger standard data load
    setRequiresPasswordReset(false);
    
    // Quick reload strategy
    window.location.reload();
  };

  const handleSendVerification = async () => {
    if (!authUser?.email) return;
    setVerificationSending(true);
    setVerificationSuccess(false);
    setVerificationError('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authUser.email,
        options: {
          emailRedirectTo: window.location.origin + '/dashboard',
        }
      });
      if (error) {
        setVerificationError(error.message);
      } else {
        setVerificationSuccess(true);
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to send verification link.');
    } finally {
      setVerificationSending(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // --- METRIC CALCULATIONS ---
  const isPgOnly = (property as any)?.property_category === 'PG';
  const validBookings = bookings.filter((b: any) => {
    if (b.status === 'Cancelled') return false;
    if (!isPgOnly) {
      // In Hotel/PG mode, top StatCards measure Daily Hotel Reservations (short stays)
      return !b.is_monthly;
    }
    return true;
  });
  const totalRevenue = validBookings.reduce((acc, b: any) => {
    const rawAmt = b.amount ?? b.total_amount ?? b.monthly_rate ?? 0;
    const amt = Number(rawAmt);
    return acc + (isNaN(amt) ? 0 : amt);
  }, 0);
  const distinctGuests = new Set(validBookings.map(b => b.guest_name)).size;
  const activeCheckedInBookings = bookings.filter((b: any) => b.status === 'Checked In' && (isPgOnly || !b.is_monthly));
  const activeRoomIds = new Set(activeCheckedInBookings.map((b: any) => b.room_id));
  const occupiedRooms = activeRoomIds.size;
  const totalRoomsCount = rooms.length || 1;
  const occupancyRate = ((occupiedRooms / totalRoomsCount) * 100).toFixed(1);
  const avgDailyRate = validBookings.length > 0 ? (totalRevenue / validBookings.length).toFixed(0) : "0";

  // --- ACCESS CONTROL HELPER ---
  const hasAccess = (_moduleName: string) => {
    return true; // All authenticated users have full access to all modules
  };

  // 1. Loading State
  if (isLoading) {
  return (
    <div className="flex min-h-screen bg-[#08080a] items-center justify-center">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );
  }

    // 2. Password Reset State
    if (requiresPasswordReset) {
    return (
      <div className="fixed inset-0 bg-[#060608] flex items-center justify-center p-6 z-50 font-sans selection:bg-emerald-500/30 overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-[360px] relative z-10 flex flex-col items-center"
        >
          {/* Logo Area */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <KeyRound size={20} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Security Update</h1>
            <p className="text-zinc-500 text-[10px] text-center mt-2 font-medium">Please verify your identity by replacing the system-generated key with your own permanent password.</p>
          </div>

          <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-7 shadow-2xl shadow-black">
            <form action={handlePasswordReset} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-400 transition-colors">
                    <KeyRound size={14} />
                  </div>
                  <input 
                    name="newPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-400 transition-colors">
                    <KeyRound size={14} />
                  </div>
                  <input 
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-black/60 border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-zinc-800 focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2 mt-2">
                  <ShieldAlert size={14} />
                  {resetError}
                </div>
              )}

              <button 
                type="submit"
                disabled={isResetLoading}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10 mt-3"
              >
                {isResetLoading ? <Loader2 size={14} className="animate-spin" /> : 'Lock Credentials & Enter'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#08080a]">

      {/* ===== SIDEBAR ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        {/* Logo / Brand / Property Switcher */}
        <div className="p-6 pb-4 relative">
          <div 
            onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
            className="w-full flex items-center justify-between gap-3 p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-transparent flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="StaySync Logo" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-[13px] font-bold text-white tracking-tight truncate max-w-[130px]">{property?.name || 'Loading...'}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {property?.property_category || 'Hotel/PG'}
                  </span>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!property) return;
                      const targetCategory = property.property_category === 'PG' ? 'Hotel/PG' : 'PG';
                      const result = await updateProperty(property.id, {
                        name: property.name,
                        address: (property as any).address || '',
                        city: (property as any).city || '',
                        country: (property as any).country || '',
                        property_category: targetCategory
                      });
                      if (result.success) {
                        setProperty({ ...property, property_category: targetCategory });
                      }
                    }}
                    className="text-[9px] font-bold text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Switch to {property?.property_category === 'PG' ? 'Hotel/PG' : 'PG'}
                  </button>
                </div>
              </div>
            </div>
            <ChevronsUpDown size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
          </div>

          {/* Dropdown Menu */}
          {showPropertyDropdown && accessiblePropsList.length > 1 && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Switch Property</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {accessiblePropsList.map(prop => (
                  <button
                    key={prop.id}
                    onClick={() => switchProperty(prop.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${
                      prop.id === property?.id 
                        ? 'bg-indigo-500/10 text-indigo-400' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {prop.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 mb-3">Navigation</p>
          {NAV_ITEMS.filter(item => {
            if (item.label === 'Partner Report' && !hasMultiplePartners) return false;
            if (property?.property_category === 'PG') {
              return item.label !== 'Night Audit' && item.label !== 'Housekeeping';
            }
            return true;
          }).map((item) => {
            const locked = !hasAccess(item.module);
            return (
              <Link
                key={item.label}
                href={locked ? "#" : item.href}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    alert(`Access Restricted: The ${item.label} module requires higher authorization.`);
                  } else if (item.label === 'Settings') {
                    e.preventDefault();
                    router.push('/dashboard/property-setup');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                  item.active
                    ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : locked 
                      ? 'text-zinc-700 cursor-not-allowed'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
                }`}
              >
                <item.icon size={17} className={item.active ? 'text-indigo-400' : ''} />
                <span className="flex-1">{item.label}</span>
                {locked && <Lock size={12} className="text-zinc-800" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer - User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
              IS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-300 truncate">Sathish A.</p>
              <p className="text-[10px] text-zinc-600 truncate">Property Owner</p>
            </div>
            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 text-zinc-600 hover:text-rose-400 transition-all px-2 py-1.5 rounded-lg hover:bg-rose-500/5"
              title="Terminate Session"
            >
              <LogOut size={16} />
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto">

        {/* TOP BAR */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#08080a]/80 border-b border-white/[0.04] px-4 md:px-8 py-4">
          <div className="flex justify-between items-center gap-3">
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight truncate">Owner Overview</h2>
                <span className="text-[9px] md:text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 md:gap-1.5 shrink-0">
                  <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {property?.property_category ? `${property.property_category} Mode` : 'Live'}
                </span>

                {/* HEADER MODE SWITCHER - Displayed ONLY for users with multiple properties */}
                {accessiblePropsList.length > 1 && (
                  <select
                    value={property?.id || ''}
                    onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        router.push('/dashboard/property-setup');
                      } else {
                        switchProperty(e.target.value);
                      }
                    }}
                    className="bg-[#121216] border border-white/10 hover:border-emerald-500/40 text-white text-[11px] font-bold px-3 py-1 rounded-xl cursor-pointer transition-all focus:outline-none shadow-lg"
                  >
                    {accessiblePropsList.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0c0c0e] text-white">
                        {p.property_category === 'PG' ? '🏢 PG:' : '🏨🏢 Hotel/PG:'} {p.name}
                      </option>
                    ))}
                    <option value="NEW" className="bg-[#0c0c0e] text-emerald-400 font-bold">➕ Register New Property Mode</option>
                  </select>
                )}
              </div>
              <p className="text-[10px] md:text-[11px] text-zinc-600 mt-0.5 truncate">Real-time property intelligence &bull; {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </motion.div>

            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
              <button 
                onClick={() => {
                  setShowSubscriptionDrawer(true);
                }}
                className="flex items-center gap-1 md:gap-1.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-400 hover:text-white hover:border-emerald-500/40 px-2 py-2 md:px-3 md:py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.08)] active:scale-[0.97]"
              >
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="hidden sm:inline">Free Access Active</span>
              </button>

              <button className="p-2 md:p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 cursor-not-allowed">
                <Search size={15} />
              </button>
              <button className="p-2 md:p-2.5 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all relative">
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-[#08080a]" />
              </button>

              <button className="flex items-center gap-1.5 bg-white text-black p-2.5 md:px-5 md:py-2.5 rounded-xl text-[12px] font-bold hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.06)] active:scale-[0.97]" title="Generate Report">
                <BarChart3 size={14} />
                <span className="hidden md:inline">Generate Report</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 pb-28 lg:pb-8 space-y-8">

          {/* DEDICATED PG MODE TERMINAL */}
          {property?.property_category === 'PG' ? (
            <div className="space-y-8">
              {/* PG STAT CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                  title="Total Rent Collected" subtitle="Current month tenant payments"
                  icon={Wallet} color="emerald" value={`₹${totalRevenue.toLocaleString()}`} trend="Monthly" trendUp={true}
                />
                <StatCard
                  title="Daily Expenses Paid" subtitle="Mess, food & utilities"
                  icon={BarChart3} color="indigo" value={`₹${(bookings.reduce((sum, b: any) => sum + (Number(b.monthly_rent) || 0), 0) * 0.15).toLocaleString()}`} trend="Logged" trendUp={false}
                />
                <StatCard
                  title="Bed Occupancy" subtitle={`${bookings.filter(b => b.status === 'Checked In' || b.status === 'Confirmed').length} of ${rooms.reduce((s, r: any) => s + (Number(r.sharing_capacity) || 1), 0)} beds occupied`}
                  icon={Users} color="amber" value={`${rooms.reduce((s, r: any) => s + (Number(r.sharing_capacity) || 1), 0) > 0 ? Math.round((bookings.filter(b => b.status === 'Checked In' || b.status === 'Confirmed').length / rooms.reduce((s, r: any) => s + (Number(r.sharing_capacity) || 1), 0)) * 100) : 0}%`} trend="Live" trendUp={true}
                />
                <StatCard
                  title={hasMultiplePartners ? "Net Partner Profit" : "Net Owner Profit"} subtitle={hasMultiplePartners ? "Estimated net dividend" : "Estimated net income"}
                  icon={IndianRupee} color="emerald" value={`₹${Math.max(0, totalRevenue - (bookings.reduce((sum, b: any) => sum + (Number(b.monthly_rent) || 0), 0) * 0.15)).toLocaleString()}`} trend="Net" trendUp={true}
                />
              </div>

              {/* MONTH-END CLOSING CONTROL BANNER */}
              <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-indigo-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {hasMultiplePartners ? "Month-End Financial Closing & Partner Shares" : "Month-End Financial Closing & P&L Statement"}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {hasMultiplePartners 
                      ? "Calculate monthly tenant fees collected, subtract mess & utility expenses, and distribute partner equity percentages."
                      : "Calculate monthly tenant fees collected, subtract mess & utility expenses, and audit net property income."}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <button
                    onClick={() => setShowAdditionalIncomeModal(true)}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95"
                  >
                    <UtensilsCrossed size={16} />
                    <span>+ Add Ancillary Income</span>
                  </button>

                  <button
                    onClick={() => router.push('/dashboard/partner-report')}
                    className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center gap-2 active:scale-95"
                  >
                    <BarChart3 size={16} />
                    <span>Run Month-End Closing</span>
                  </button>
                </div>
              </div>

              {/* DAILY TENANT FEES PAID TABLE */}
              <div className="bg-zinc-900/40 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Daily Tenant Rent Fees Paid</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Track resident monthly rent payments and pending dues</p>
                  </div>
                  <button 
                    onClick={() => router.push('/dashboard/front-office')}
                    className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
                  >
                    <span>Open Resident Directory</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        <th className="py-3 px-4">Resident Name</th>
                        <th className="py-3 px-4">Room & Bed</th>
                        <th className="py-3 px-4">Monthly Rent</th>
                        <th className="py-3 px-4">Rent Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                      {(() => {
                        const activeTenants = bookings.filter((b: any) => 
                          (b.is_monthly || b.monthly_rent) && 
                          b.status !== 'Cancelled' && 
                          b.status !== 'Checked Out'
                        );

                        if (activeTenants.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-zinc-600 text-xs">
                                No active monthly residents enrolled yet. Add residents in PG Front Office.
                              </td>
                            </tr>
                          );
                        }

                        return activeTenants.map((tenant: any) => {
                          const assignedRoom = rooms.find(r => r.id === tenant.room_id);
                          const roomText = assignedRoom ? `Room ${assignedRoom.room_number}` : 'Room N/A';
                          const tenantPayments = paymentsList.filter((p: any) => p.booking_id === tenant.id && !p.is_void);
                          const rentPaid = tenantPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                          const monthlyRent = Number(tenant.monthly_rent || tenant.total_amount || 0);
                          const isPaid = tenant.payment_status === 'Paid' || (rentPaid >= monthlyRent && monthlyRent > 0);

                          return (
                            <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3.5 px-4 font-bold text-white">{tenant.guest_name}</td>
                              <td className="py-3.5 px-4 text-zinc-400">{roomText}</td>
                              <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">₹{Number(tenant.monthly_rent || tenant.total_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isPaid
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {isPaid ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => router.push('/dashboard/front-office')}
                                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all"
                                >
                                  View Payment
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* HOTEL & HYBRID DASHBOARD */
            <div className="space-y-8">
              {/* STAT CARDS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                  title="Total Revenue" subtitle="Current historical total"
                  icon={Wallet} color="emerald" value={`₹${totalRevenue.toLocaleString()}`} trend="12.5%" trendUp={true}
                />
                <StatCard
                  title="Avg Booking Value" subtitle="Per reservation"
                  icon={IndianRupee} color="indigo" value={`₹${avgDailyRate}`} trend="3.2%" trendUp={true}
                />
                <StatCard
                  title="Occupancy Rate" subtitle={`${occupiedRooms} of ${totalRoomsCount} rooms occupied`}
                  icon={Percent} color="amber" value={`${occupancyRate}%`} trend="2.1%" trendUp={false}
                />
                <StatCard
                  title="Total Guests" subtitle={`Across ${bookings.length} bookings`}
                  icon={Users} color="violet" value={distinctGuests.toString()} trend="0.3" trendUp={true}
                />
              </div>

          <div className="grid grid-cols-12 gap-6">

            {/* ===== LEFT COLUMN ===== */}
            <div className="col-span-12 xl:col-span-8 space-y-6">

              {/* REVENUE CHART */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-zinc-900/40 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-7"
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-[15px] font-bold text-white tracking-tight">Revenue Trend</h3>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Weekly performance overview</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-[11px] font-semibold bg-white/[0.06] text-zinc-400 px-3.5 py-1.5 rounded-lg hover:text-white transition-colors">
                      This Week
                      <ChevronDown size={12} className="inline ml-1" />
                    </button>
                  </div>
                </div>

                {/* Dynamic SVG Bar Chart */}
                <div className="flex items-end justify-between h-[180px] mt-6 pt-4 border-b border-white/[0.04] relative">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500/50" size={20} /></div>
                  ) : revenueData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center"><p className="text-[11px] text-zinc-600">No revenue data available.</p></div>
                  ) : (
                    <>
                      {/* Y-axis guidelines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[4, 3, 2, 1, 0].map((i) => (
                          <div key={i} className="w-full border-t border-white/[0.02] h-0 relative">
                            <span className="absolute -top-2.5 -left-8 text-[9px] text-zinc-600">₹{Math.round((Math.max(...revenueData.map(d => d.revenue)) * (i/4)) / 100) * 100}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Bars */}
                      <div className="w-full h-full flex items-end justify-between gap-1 z-10 pl-2">
                        {revenueData.slice(-14).map((day, i) => {
                          const maxRev = Math.max(...revenueData.map(d => d.revenue)) || 1;
                          const heightPct = Math.max((day.revenue / maxRev) * 100, 2); // min 2% height
                          return (
                            <div key={i} className="relative group flex-1 flex flex-col items-center justify-end h-full">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPct}%` }}
                                transition={{ delay: 0.1 + (i * 0.05), duration: 0.8, type: "spring" }}
                                className="w-full max-w-[12px] bg-gradient-to-t from-indigo-900/50 to-indigo-500/80 rounded-t-sm group-hover:from-indigo-700 group-hover:to-indigo-400 transition-colors cursor-pointer"
                              />
                              {/* Tooltip */}
                              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-xl border border-white/10">
                                ₹{day.revenue} <br/>
                                <span className="text-zinc-400 text-[8px] uppercase">{new Date(day.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between px-2 mt-3 text-[9px] text-zinc-600 font-medium uppercase tracking-wider">
                  <span>{revenueData.length > 0 ? new Date(revenueData[Math.max(0, revenueData.length - 14)].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}</span>
                  <span>{revenueData.length > 0 ? new Date(revenueData[revenueData.length - 1].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}</span>
                </div>
              </motion.div>

              {/* BOOKINGS TABLE */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-7 backdrop-blur-sm"
              >
                <div className="flex justify-between items-center mb-7">
                  <div>
                    <h3 className="text-[15px] font-bold text-white tracking-tight">Recent Bookings</h3>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Latest reservations and check-ins</p>
                  </div>
                  <button className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors flex items-center gap-1">
                    View All
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Table Header - Hidden on mobile, shown on desktop */}
                <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold pb-4 border-b border-white/[0.04] mb-2">
                  <div className="col-span-4">Guest</div>
                  <div className="col-span-2">Room</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Duration</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>

                {/* Table Rows - Flex layout on mobile, grid on desktop */}
                <div className="space-y-1">
                  {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>
                  ) : bookings.filter((bk: Booking) => bk.status !== 'Cancelled' && ((property as any)?.property_category === 'PG' || !(bk as any).is_monthly)).length === 0 ? (
                    <div className="py-8 text-center text-zinc-600 text-xs">
                      {(property as any)?.property_category === 'PG' ? 'No active resident enrollments found.' : 'No active daily hotel reservations found.'}
                    </div>
                  ) : bookings.filter((bk: Booking) => bk.status !== 'Cancelled' && ((property as any)?.property_category === 'PG' || !(bk as any).is_monthly)).slice(0, 5).map((bk: Booking, i: number) => (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      key={bk.id}
                      className="flex md:grid md:grid-cols-12 gap-4 items-center justify-between md:justify-normal py-4 rounded-xl hover:bg-white/[0.02] transition-all cursor-pointer group px-2"
                    >
                      <div className="flex-1 md:flex-none md:col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700 border border-white/[0.06] flex items-center justify-center text-[11px] font-bold text-zinc-300 group-hover:from-indigo-600 group-hover:to-indigo-500 group-hover:text-white group-hover:border-indigo-500/30 transition-all duration-300 shrink-0">
                          {bk.guest_name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">{bk.guest_name}</p>
                          <p className="text-[10px] text-zinc-600 truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="font-bold text-zinc-400 md:hidden">R-{rooms.find((r: Room) => r.id === bk.room_id)?.room_number || 'N/A'}</span>
                            <span className="md:hidden text-zinc-700">&bull;</span>
                            <span>{new Date(bk.check_in).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                          </p>
                        </div>
                      </div>
                      <div className="hidden md:block md:col-span-2">
                        <span className="text-[12px] text-zinc-400 font-medium">Room {rooms.find((r: Room) => r.id === bk.room_id)?.room_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3 md:gap-0 md:contents shrink-0">
                        <div className="md:col-span-2 flex justify-end md:justify-start">
                          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border shrink-0 ${statusStyles[bk.status] || ''}`}>
                            {bk.status}
                          </span>
                        </div>
                        <div className="hidden md:block md:col-span-2">
                          <span className="text-[12px] text-zinc-500">Live</span>
                        </div>
                        <div className="md:col-span-2 text-right">
                          <span className="text-[12px] md:text-[13px] font-bold text-white whitespace-nowrap">₹{bk.amount}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="col-span-12 xl:col-span-4 space-y-6">

              {/* PAST DAYS AUDIT WIDGET */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={15} className="text-indigo-400" />
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]">Past Days Audit</h3>
                </div>

                <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
                  Select any past date to audit revenue, rooms sold, and actual payments collected.
                </p>

                <div className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={auditDate}
                      onChange={(e) => setAuditDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500/50 [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={runPastDaysAudit}
                    disabled={auditLoading || !auditDate}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {auditLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Search size={13} />
                    )}
                    Run Audit
                  </button>
                </div>

                {auditResults && auditResults.ran && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Rooms Sold */}
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Rooms Sold</span>
                        <span className="text-base font-black text-emerald-400 font-mono">{auditResults.roomsSold}</span>
                      </div>

                      {/* Booked Revenue */}
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Booked Rev</span>
                        <span className="text-base font-black text-indigo-400 font-mono">₹{auditResults.bookingRevenue}</span>
                      </div>

                      {/* Cash Collected */}
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Cash Coll</span>
                        <span className="text-base font-black text-violet-400 font-mono">₹{auditResults.cashCollected}</span>
                      </div>
                    </div>

                    {/* Details list */}
                    {(auditResults.bookings.length > 0 || auditResults.payments.length > 0) ? (
                      <div className="pt-3 border-t border-white/[0.04] space-y-2 max-h-[180px] overflow-y-auto no-scrollbar">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Audit Logs</span>
                        
                        {/* Bookings */}
                        {auditResults.bookings.map((b: any) => (
                          <div key={b.id} className="flex justify-between items-center text-[10px] bg-white/[0.01] px-2.5 py-1.5 rounded-lg border border-white/[0.02]">
                            <div className="truncate max-w-[120px]">
                              <span className="text-zinc-300 font-semibold block truncate">{b.guest_name}</span>
                              <span className="text-[8px] text-zinc-600 uppercase font-bold">Room Booked</span>
                            </div>
                            <span className="font-mono text-indigo-400 font-bold">₹{b.amount}</span>
                          </div>
                        ))}

                        {/* Payments */}
                        {auditResults.payments.map((p: any) => (
                          <div key={p.id} className="flex justify-between items-center text-[10px] bg-white/[0.01] px-2.5 py-1.5 rounded-lg border border-white/[0.02]">
                            <div className="truncate max-w-[120px]">
                              <span className="text-zinc-300 font-semibold block truncate">Payment Logged</span>
                              <span className="text-[8px] text-violet-500 uppercase font-bold">{p.payment_method || 'Unknown'}</span>
                            </div>
                            <span className="font-mono text-violet-400 font-bold">+₹{p.amount}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic text-center py-2">No operations logged on this date.</p>
                    )}
                  </div>
                )}
              </motion.div>

              {/* TEAM MANAGEMENT CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-7 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.4)]"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-indigo-200" />
                      <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em]">Team Hub</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight mb-2">Manage Your Staff</h3>
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed mb-6">Onboard team members and control terminal access for your property.</p>
                  
                  <Link 
                    href="/dashboard/staff"
                    className="w-full bg-white text-indigo-700 py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-[0.97] shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
                  >
                    <UserPlus size={15} />
                    Open Staff Manager
                  </Link>
                </div>
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
              </motion.div>

              {/* STAFF OVERVIEW */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-7"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <Activity size={14} className="text-indigo-400" />
                    <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]">Recent Staff</h3>
                  </div>
                  <Link href="/dashboard/staff" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">View All</Link>
                </div>
                
                {staffList.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic text-center py-4">No staff provisioned yet.</p>
                ) : (
                  <div className="space-y-4">
                    {staffList.slice(0, 3).map((st) => (
                      <div key={st.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-mono text-zinc-400 uppercase">
                          {st.email ? st.email.substring(0, 2) : 'NA'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-white truncate">{st.email}</p>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* QUICK MANAGEMENT */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-6"
              >
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-5 px-1">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Inventory & Rates', description: 'Manage rooms and pricing', icon: BedDouble, color: 'indigo' },
                    { label: 'Financial Overview', description: 'Revenue and expenses', icon: Building2, color: 'emerald' },
                    { label: 'Channel Manager', description: 'OTA connections', icon: TrendingUp, color: 'amber' },
                    { label: 'Recent Activity', description: 'Audit log & events', icon: Clock, color: 'violet' },
                  ].map((item: { label: string, description: string, icon: React.ElementType, color: string }) => {
                    const c = colorMap[item.color] || colorMap.indigo;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (item.label === 'Recent Activity') {
                            setShowActivityDrawer(true);
                          }
                        }}
                        className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.03] rounded-xl transition-all group border border-transparent hover:border-white/[0.06]"
                      >
                        <div className={`p-2 rounded-lg ${c.bg} ${c.text} border ${c.border} group-hover:scale-105 transition-transform`}>
                          <item.icon size={15} />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-[12px] font-semibold text-zinc-400 group-hover:text-white transition-colors block">{item.label}</span>
                          <span className="text-[10px] text-zinc-700">{item.description}</span>
                        </div>
                        <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* OCCUPANCY VISUAL */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-zinc-900/40 border border-white/[0.06] rounded-2xl p-7"
              >
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-5">Room Occupancy</h3>
                <div className="flex justify-center mb-6">
                  <div className="relative w-32 h-32">
                    {/* Background ring */}
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.04)" strokeWidth="10" fill="none" />
                      <motion.circle
                        cx="60" cy="60" r="52"
                        stroke="url(#occupancy-gradient)"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="326.73"
                        initial={{ strokeDashoffset: 326.73 }}
                        animate={{ strokeDashoffset: 326.73 * (1 - 0.742) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      />
                      <defs>
                        <linearGradient id="occupancy-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{occupancyRate}%</span>
                      <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Occupied</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white/[0.03] rounded-xl py-3 px-2">
                    <p className="text-lg font-bold text-white">{occupiedRooms}</p>
                    <p className="text-[10px] text-zinc-600">Occupied</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl py-3 px-2">
                    <p className="text-lg font-bold text-zinc-400">{totalRoomsCount - occupiedRooms}</p>
                    <p className="text-[10px] text-zinc-600">Available</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-40 bg-[#0a0a0c]/85 backdrop-blur-xl border-t border-white/[0.05] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around py-2 px-1 max-w-md mx-auto">
          {NAV_ITEMS.filter(item => {
            if (property?.property_category === 'PG') {
              return item.label !== 'Night Audit';
            }
            return item.label !== 'Partner Report';
          }).map((item) => {
            const locked = !hasAccess(item.module);
            return (
              <Link
                key={item.label}
                href={locked ? "#" : item.href}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    alert(`Access Restricted: The ${item.label} module requires higher authorization.`);
                  } else if (item.label === 'Settings') {
                    e.preventDefault();
                    router.push('/dashboard/property-setup');
                  }
                }}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-300 ${
                  item.active 
                    ? 'text-indigo-400 font-bold' 
                    : locked 
                      ? 'text-zinc-800' 
                      : 'text-zinc-500 active:text-zinc-200'
                }`}
              >
                <item.icon size={18} className={item.active ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} />
                <span className="text-[9px] uppercase tracking-wider font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ACTIVITY LOG DRAWER */}
      {/* SUBSCRIPTION & BILLING DRAWER */}
      <AnimatePresence>
        {showSubscriptionDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubscriptionDrawer(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-[#08080a] border-l border-white/[0.08] shadow-2xl z-[100] flex flex-col font-sans select-none"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06] bg-zinc-900/40 backdrop-blur-md flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-indigo-400" size={22} />
                    Account & Security
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    Manage your account status
                  </p>
                </div>
                
                <button 
                  onClick={() => setShowSubscriptionDrawer(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Active Plan Card */}
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
                  
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    Current Account Status
                  </span>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight">
                        Free Access Plan
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Enjoy full system features and operations.
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Verification Status Card */}
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5 space-y-4 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-indigo-500/5 rounded-full blur-[30px] pointer-events-none" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                      Security & Account
                    </span>
                    
                    {(authUser?.email_confirmed_at || authUser?.confirmed_at) ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-1">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg flex items-center gap-1">
                        ✗ Unverified
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Mail size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">Login Email</h4>
                      <p className="text-sm font-black text-white truncate mt-0.5">{authUser?.email || userProfile?.email || 'Loading...'}</p>
                    </div>
                  </div>

                  {!(authUser?.email_confirmed_at || authUser?.confirmed_at) && authUser?.email && (
                    <div className="pt-1">
                      <button
                        onClick={handleSendVerification}
                        disabled={verificationSending}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.15)] active:scale-[0.98]"
                      >
                        {verificationSending ? 'Sending Verification Link...' : 'Resend Verification Email'}
                      </button>
                      {verificationSuccess && (
                        <p className="text-[11px] text-emerald-400 mt-2 font-semibold">✓ Verification link sent! Please check your inbox.</p>
                      )}
                      {verificationError && (
                        <p className="text-[11px] text-rose-400 mt-2 font-semibold">✗ {verificationError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showActivityDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActivityDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-[#0a0a0c] border-l border-white/[0.08] shadow-2xl z-[100] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06] bg-zinc-900/40 backdrop-blur-md flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="text-violet-400 animate-pulse" size={20} />
                    Activity & Audit Feed
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    Real-time operational logs
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchLogs}
                    disabled={logsLoading}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-violet-400 transition-all disabled:opacity-50"
                    title="Refresh Feed"
                  >
                    <RefreshCw size={16} className={logsLoading ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setShowActivityDrawer(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Feed Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {logsLoading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3">
                    <Loader2 size={32} className="text-violet-500 animate-spin" />
                    <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Syncing logs...</p>
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <Clock size={36} className="text-zinc-600 mb-3" />
                    <p className="text-zinc-400 font-bold uppercase tracking-wider text-xs">No Activity Logs Found</p>
                    <p className="text-zinc-600 text-[10px] mt-1">Once front-office actions are made, logs will appear here.</p>
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-white/[0.06] ml-2 space-y-6 text-left">
                    {activityLogs.map((log: any) => {
                      const badge = formatLogAction(log.action);
                      const operator = log.profiles?.full_name || log.profiles?.email || 'Automated System';
                      
                      return (
                        <div key={log.id} className="relative group text-left">
                          {/* Timeline bullet */}
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border border-white/20 group-hover:border-violet-500 group-hover:bg-violet-500/20 transition-all duration-300" />
                          
                          <div className="bg-zinc-900/30 border border-white/[0.04] hover:border-white/[0.08] p-4 rounded-2xl space-y-2 transition-all">
                            {/* Metadata row */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.color}`}>
                                {badge.label}
                              </span>
                              <span className="text-[10px] text-zinc-600 font-mono">
                                {new Date(log.created_at).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} &bull; {new Date(log.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>

                            {/* Details text */}
                            <p className="text-xs font-medium text-zinc-300 normal-case leading-relaxed">
                              {renderLogDetails(log)}
                            </p>

                            {/* Operator info */}
                            <div className="flex items-center gap-1.5 text-[9px] font-semibold text-zinc-500 tracking-wide uppercase pt-1 border-t border-white/[0.02]">
                              <span className="text-zinc-600">Operator:</span>
                              <span className="text-zinc-400 font-medium normal-case">{operator}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🍳 LOG ANCILLARY / ADDITIONAL PG INCOME MODAL */}
      <AnimatePresence>
        {showAdditionalIncomeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/30 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                  <UtensilsCrossed size={16} /> Log Additional PG Income
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdditionalIncomeModal(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Record Non-Rent Revenue</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Log custom food cooking charges, laundry fees, late fees, or extra guest stay collections.
                </p>
              </div>

              {incomeSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
                  ✓ {incomeSuccess}
                </div>
              )}

              <form onSubmit={handleLogAdditionalIncome} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Category</label>
                    <select
                      value={incomeCategory}
                      onChange={(e) => setIncomeCategory(e.target.value)}
                      className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Custom Cooking">🍳 Custom Cooking (e.g. Chicken/Mutton)</option>
                      <option value="Laundry Service">🧺 Laundry Service</option>
                      <option value="Guest Stay">🛌 Extra Guest Stay</option>
                      <option value="Late Fee">⏰ Late Fee</option>
                      <option value="Other Ancillary">➕ Other Ancillary</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 500"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-4 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 kgs Chicken Cooking Charge"
                    value={incomeTitle}
                    onChange={(e) => setIncomeTitle(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-4 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tenant / Resident Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh (Room 101)"
                      value={incomeTenant}
                      onChange={(e) => setIncomeTenant(e.target.value)}
                      className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-4 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Payment Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIncomePaymentMethod('Cash')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          incomePaymentMethod === 'Cash'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-black/40 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        💵 Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncomePaymentMethod('UPI')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          incomePaymentMethod === 'UPI'
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                            : 'bg-black/40 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        📱 UPI
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdditionalIncomeModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={incomeSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {incomeSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Log Income'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- LOG LOGIC HELPERS ---
const formatLogAction = (action: string) => {
  switch (action) {
    case 'GUEST_CHECK_IN':
      return { label: 'Guest Check-In', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    case 'GUEST_CHECK_OUT':
      return { label: 'Guest Check-Out', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    case 'UNDO_CHECK_OUT':
      return { label: 'Undo Checkout', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'INCIDENTAL_CHARGE_POSTED':
      return { label: 'Charge Posted', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
    case 'PAYMENT_RECEIVED':
      return { label: 'Payment Received', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    case 'CHECK_IN_TIME_MODIFIED':
      return { label: 'Time Adjusted', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' };
    case 'AUTO_CHECK_IN_TIME_RECORDED':
      return { label: 'Check-In Tracked', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' };
    default:
      return { label: action.replace(/_/g, ' '), color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' };
  }
};

const renderLogDetails = (log: any) => {
  const { action, details } = log;
  if (!details) return '';

  switch (action) {
    case 'GUEST_CHECK_IN':
      return `Checked in guest ${details.guestName || 'N/A'}${details.paymentRecorded ? ` (Recorded payment of ₹${details.paymentAmount})` : ''}`;
    case 'GUEST_CHECK_OUT':
      return `Checked out guest ${details.guestName || 'N/A'}${details.totalCharges ? ` (Folio settled for ₹${details.totalPayments})` : ''}`;
    case 'UNDO_CHECK_OUT':
      return `Reverted checkout for guest ${details.guestName || 'N/A'}`;
    case 'INCIDENTAL_CHARGE_POSTED':
      return `Posted charge of ₹${Number(details.amount).toFixed(2)} (${details.description || 'no description'})`;
    case 'PAYMENT_RECEIVED':
      return `Received payment of ₹${Number(details.amount).toFixed(2)} via ${details.method || 'N/A'}${details.transactionId ? ` (Txn: ${details.transactionId})` : ''}`;
    case 'CHECK_IN_TIME_MODIFIED':
      return `Manually adjusted check-in time for ${details.guestName || 'N/A'} to ${details.newCheckInTime ? new Date(details.newCheckInTime).toLocaleString() : 'N/A'}`;
    case 'AUTO_CHECK_IN_TIME_RECORDED':
      return `Auto-recorded physical check-in time for ${details.guestName || 'N/A'} at ${details.checkInTime ? new Date(details.checkInTime).toLocaleString() : 'N/A'}`;
    default:
      return JSON.stringify(details);
  }
};