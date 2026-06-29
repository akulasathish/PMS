"use client";
import { QRCodeSVG } from 'qrcode.react';
// Dynamically imported inline to avoid SSR pre-rendering failures

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bed, Calendar, Search, UserCheck, 
  ArrowRightLeft, ChevronRight, 
  Plus, Loader2, Building2, LayoutDashboard,
  DoorOpen, Activity, Users, Settings, LogOut,
  ChevronsUpDown, Lock, Brush, CheckCircle2, ClipboardCheck, RefreshCw, RotateCcw, Printer, XCircle, Link2, Camera, X, ShieldCheck, AlertCircle, Phone, Mail,
  Trash2, DollarSign, Moon, Banknote, Smartphone, CreditCard, Clock, TrendingDown, Download, Wallet, FileText,
  Home, UserPlus, User
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import BookingModal from './BookingModal';
import CoLivingBookingModal from './CoLivingBookingModal';
import FolioModal from '@/components/FolioModal';
import RoomBlockModal from '@/components/RoomBlockModal';
import { checkInGuest, checkOutGuest, updateGuestNotes, upgradeRoom, issueRefund, cancelBooking, resetGuestIdentity, updateCheckInTime } from '@/app/actions/booking';
import { Property, Room, Booking, UserProfile } from '@/lib/types';


const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", active: false, module: 'analytics' },
  { icon: Activity, label: "Front Office", href: "/dashboard/front-office", active: true, module: 'front_office' },
  { icon: Brush, label: "Housekeeping", href: "/dashboard/housekeeping", active: false, module: 'housekeeping' },
  { icon: DoorOpen, label: "Inventory", href: "/dashboard/inventory", active: false, module: 'inventory' },
  { icon: Moon, label: "Night Audit", href: "/dashboard/night-audit", active: false, module: 'night_audit' },
  { icon: FileText, label: "Daily Reports", href: "#", active: false, module: 'front_office' },
];

const generateDaysFromDate = (baseDateStr: string) => {
  if (!baseDateStr) return [];
  const parts = baseDateStr.split('-');
  if (parts.length !== 3) return [];
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month, day + i);
    days.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
  }
  return days;
};

const getLocalYYYYMMDDStatic = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalDatetimeString = (isoString?: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().substring(0, 16);
};

const isRoomRelatedCharge = (desc: string): boolean => {
  const d = (desc || '').toLowerCase();
  return (
    d.startsWith('daily room charge') ||
    d.includes('early check-in') ||
    d.includes('early checkin') ||
    d.includes('late checkout') ||
    d.includes('late check-out') ||
    d.includes('past due') ||
    d.includes('past dues') ||
    d.includes('tariff') ||
    d.includes('room charge') ||
    d.includes('dues') ||
    d.includes('due amount') ||
    d.includes('balance transfer') ||
    d.includes('extra guest') ||
    d.includes('extra person') ||
    d.includes('extra occupant') ||
    d.includes('extra bed') ||
    d.includes('upgrade')
  );
};

const isCardRoomCharge = (desc: string): boolean => {
  const d = (desc || '').toLowerCase();
  if (
    d.includes('early check-in') ||
    d.includes('early checkin') ||
    d.includes('late checkout') ||
    d.includes('late check-out')
  ) {
    return false;
  }
  return isRoomRelatedCharge(desc);
};

const openSecurePDFWindow = () => {
  if (typeof window === 'undefined') return null;
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    try {
      newWindow.document.title = "Generating Report...";
      newWindow.document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0c; color: #fff; margin: 0; padding: 20px; box-sizing: border-box; text-align: center;">
          <div style="width: 48px; height: 48px; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%; border-top-color: #4f46e5; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 24px; font-size: 15px; font-weight: 700; color: #f4f4f5; letter-spacing: 0.1em; text-transform: uppercase;">Generating Secure Report</p>
          <p style="margin-top: 6px; font-size: 12px; color: #71717a; max-width: 280px; line-height: 1.5;">Please wait while your PDF report is compiled on-the-fly.</p>
          <style>
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </div>
      `;
    } catch (e) {
      console.warn("Could not write loader to new window", e);
    }
  }
  return newWindow;
};

const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};


export default function FrontOfficeTerminal() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessDate, setBusinessDate] = useState<string>('');


  const [property, setProperty] = useState<Property | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'tape' | 'arrivals' | 'departures' | 'house' | 'all' | 'balances' | 'expenses' | 'monthly' | 'reports'>('tape');
  const [showCoLivingModal, setShowCoLivingModal] = useState(false);
  const [selectedCoLivingRoomId, setSelectedCoLivingRoomId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [balancesFilter, setBalancesFilter] = useState<'inHouse' | 'allActive'>('inHouse');
  const [hidePaidGuests, setHidePaidGuests] = useState(true);
  const [incidentals, setIncidentals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dailyCashBalances, setDailyCashBalances] = useState<any[]>([]);
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('Utility');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().substring(0, 10));
  const [newExpenseQuantity, setNewExpenseQuantity] = useState(1);
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [selectedLedgerDate, setSelectedLedgerDate] = useState(new Date().toISOString().substring(0, 10));
  const [reservationFilter, setReservationFilter] = useState('Confirmed');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const activeBaseDate = filterStartDate || businessDate || getLocalYYYYMMDDStatic(new Date());
  const DAYS = generateDaysFromDate(activeBaseDate);

  // Action Drawer State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [upgradeRoomId, setUpgradeRoomId] = useState('');
  const [refundInput, setRefundInput] = useState('');
  
  // Check-In Requirements State
  const [checkIdVerified, setCheckIdVerified] = useState(false);
  const [checkRegCardSigned, setCheckRegCardSigned] = useState(false);
  const [checkPaymentSecured, setCheckPaymentSecured] = useState(false);
  const [checkFormFDone, setCheckFormFDone] = useState(false);
  
  // Custom check-in payment details
  const [checkInPaymentRecorded, setCheckInPaymentRecorded] = useState(true);
  const [checkInPaymentMethod, setCheckInPaymentMethod] = useState<'Cash' | 'UPI' | 'Credit Card' | 'Bank Transfer' | 'OTA Pre-Paid'>('Cash');
  const [checkInPaymentAmount, setCheckInPaymentAmount] = useState('');
  const [checkInPaymentTxnId, setCheckInPaymentTxnId] = useState('');
  
  // Form F Fields State
  const [guestAddress, setGuestAddress] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [isIdentityMenuOpen, setIsIdentityMenuOpen] = useState(false);
  const [activeCheckoutBooking, setActiveCheckoutBooking] = useState<{bookingId: string, roomId: string, guestName: string, amount: number} | null>(null);
  const [activeBlockRoom, setActiveBlockRoom] = useState<Room | null>(null);

  // Cash Handover and Close Counter states
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [handedOverCashInput, setHandedOverCashInput] = useState('');

  // Backdated Check-In Time Change State
  const [isEditingCheckInTime, setIsEditingCheckInTime] = useState(false);
  const [tempCheckInTime, setTempCheckInTime] = useState('');

  // Live Webcam Modal states
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startWebcam = async () => {
    setShowWebcamModal(true);
    try {
      let stream;
      try {
        // Try with ideal facingMode constraint (great for mobile rear camera)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          } 
        });
      } catch (firstErr) {
        console.warn("Could not start webcam with facingMode constraint, trying standard video:", firstErr);
        // Fallback to simple video constraint (works on any desktop/laptop webcam)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }
      
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Failed to start webcam completely:", err);
      setShowWebcamModal(false);
      // Fallback: trigger standard native camera/file picker
      alert("Browser camera access blocked or unsupported. Falling back to native device file/camera picker...");
      document.getElementById('direct-id-capture-input')?.click();
    }
  };

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setShowWebcamModal(false);
  }, [webcamStream]);

  const captureSnapshot = async () => {
    if (!videoRef.current || !selectedBooking) return;
    
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        // Stop stream first
        if (webcamStream) {
          webcamStream.getTracks().forEach(track => track.stop());
          setWebcamStream(null);
        }
        setShowWebcamModal(false);
        
        setActionLoading(true);
        try {
          console.log("Webcam Capture: Starting image compression");
          const file = new File([blob], "webcam_capture.jpg", { type: 'image/jpeg' });
          const compressedBlob = await compressImage(file);
          const idExt = 'jpg';
          const idFileName = `${selectedBooking.id}_id.${idExt}`;

          console.log("Webcam Capture: Uploading compressed file to Supabase Storage");
          const { error: uploadError } = await supabase.storage
            .from('guest-ids')
            .upload(idFileName, compressedBlob, { upsert: true, contentType: 'image/jpeg' });

          if (uploadError) throw uploadError;

          console.log("Webcam Capture: Updating Booking");
          const { error: updateError } = await supabase
            .from('bookings')
            .update({
              id_verified: true,
              id_photo_url: idFileName,
              status: 'Confirmed'
            })
            .eq('id', selectedBooking.id);

          if (updateError) throw updateError;

          console.log("Webcam Capture: Inserting record into Guests table");
          const { error: guestError } = await supabase
            .from('guests')
            .insert([{
              booking_id: selectedBooking.id,
              property_id: selectedBooking.property_id,
              full_name: selectedBooking.guest_name,
              email: selectedBooking.guest_email || '',
              id_photo_url: idFileName
            }]);

          if (guestError) {
            console.warn("Webcam Capture: Guests insertion warning:", guestError);
          }

          await loadDashboardData();
          
          const { data: updatedBooking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', selectedBooking.id)
            .single();
          if (updatedBooking) {
            setSelectedBooking(updatedBooking as Booking);
            setCheckIdVerified(true);
            setCheckRegCardSigned(true);
          }

          alert("ID Card captured and verified successfully!");
        } catch (err: any) {
          console.error("Webcam capture failed during upload/update:", err);
          alert("Webcam capture failed: " + err.message);
        } finally {
          setActionLoading(false);
        }
      }, 'image/jpeg', 0.8);
    } catch (err: any) {
      console.error("Failed to capture snapshot:", err);
      alert("Failed to capture snapshot: " + err.message);
    }
  };

  const supabase = createClient();

  const handleDirectCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking) return;

    setActionLoading(true);
    try {
      console.log("Direct Capture: Starting image compression for", file.name);
      const compressedBlob = await compressImage(file);
      const idExt = file.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() || 'jpg');
      const idFileName = `${selectedBooking.id}_id.${idExt}`;

      console.log("Direct Capture: Uploading compressed file to Supabase Storage as", idFileName);
      // Upload to storage with explicit contentType: 'image/jpeg'
      const { error: uploadError } = await supabase.storage
        .from('guest-ids')
        .upload(idFileName, compressedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      console.log("Direct Capture: Updating Booking id_verified and id_photo_url");
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          id_verified: true,
          id_photo_url: idFileName,
          status: 'Confirmed'
        })
        .eq('id', selectedBooking.id);

      if (updateError) throw updateError;

      console.log("Direct Capture: Inserting record into Guests table");
      const { error: guestError } = await supabase
        .from('guests')
        .insert([{
          booking_id: selectedBooking.id,
          property_id: selectedBooking.property_id,
          full_name: selectedBooking.guest_name,
          email: selectedBooking.guest_email || '',
          id_photo_url: idFileName
        }]);

      if (guestError) {
        console.warn("Direct Capture: Non-fatal guests table insertion warning:", guestError);
      }

      await loadDashboardData();
      
      // Also force-refresh the selected booking state so drawer displays it immediately
      const { data: updatedBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', selectedBooking.id)
        .single();
      if (updatedBooking) {
        setSelectedBooking(updatedBooking as Booking);
        setCheckIdVerified(true);
        setCheckRegCardSigned(true);
      }

      alert("ID Card captured and verified successfully!");
    } catch (err: any) {
      console.error("Direct capture failed:", err);
      alert("Direct capture failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Extract fetch data to a callable function to avoid window.location.reload()
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
      setUserProfile(prof);

      let activeId = localStorage.getItem('pms_active_property');
      
      if (!activeId || activeId === 'undefined') {
         console.log("No localStorage activeId found. Querying database for property access...");
         const { data: acc } = await supabase.from('property_access').select('property_id').eq('user_id', auth.user.id);
         if (acc && acc.length > 0) {
            activeId = acc[0].property_id;
            localStorage.setItem('pms_active_property', activeId || ''); // Fix the browser memory
         } else if (prof?.property_id) {
            activeId = prof.property_id;
            localStorage.setItem('pms_active_property', activeId || '');
         }
      }
      
      if (activeId && activeId !== 'undefined') {
        const currentActiveId = activeId || prof?.property_id;

        let finalRoomsQuery;
        if (currentActiveId && currentActiveId !== 'undefined' && currentActiveId !== 'null') {
           finalRoomsQuery = supabase.from('rooms').select('*').eq('property_id', currentActiveId).or('is_deleted.eq.false,is_deleted.is.null').order('room_number');
        } else {
           finalRoomsQuery = supabase.from('rooms').select('*').or('is_deleted.eq.false,is_deleted.is.null').order('room_number');
        }

        let bookingsQuery = supabase.from('bookings').select('*').eq('property_id', currentActiveId || '00000000-0000-0000-0000-000000000000');
        if (currentActiveId) {
          bookingsQuery = bookingsQuery.eq('property_id', currentActiveId);
        }
        bookingsQuery = bookingsQuery.order('created_at', { ascending: false });

        const [propRes, settingsRes, roomsRes, bookingsRes, incidentalsRes, paymentsRes, expensesRes, cashBalancesRes] = await Promise.all([
          supabase.from('properties').select('*').eq('id', activeId).single(),
          supabase.from('app_settings').select('value').eq('key', 'business_date').single(),
          finalRoomsQuery,
          bookingsQuery,
          supabase.from('incidental_charges').select('*').eq('property_id', activeId),
          supabase.from('payments').select('*').eq('property_id', activeId),
          supabase.from('expenses').select('*').eq('property_id', activeId),
          supabase.from('daily_cash_balances').select('*').eq('property_id', activeId)
        ]);

        if (propRes.data) {
          setProperty(propRes.data);
        }

        const bDate = settingsRes.data?.value || '2026-06-21';
        setBusinessDate(bDate);
        setSelectedLedgerDate(bDate);
        setNewExpenseDate(bDate);

        if (!roomsRes.data || roomsRes.data.length === 0) {
            console.error("🚨 EMERGENCY TRUTH LOG: ZERO ROOMS FETCHED FOR PROPERTY!", activeId);
            
            // The browser is stuck on a zombie ID. We MUST find the real property ID from the database.
            // Since the fallback query might ALSO fail if it uses the wrong ActiveID somewhere else in the chain,
            // we explicitly find the first property this user actually owns, and force the app to restart completely.
            
            const { data: realPropAccess } = await supabase.from('property_access').select('property_id').eq('user_id', auth.user.id);
            let realPropId = realPropAccess?.[0]?.property_id;
            
            if (!realPropId && prof?.property_id) {
                realPropId = prof.property_id;
            }
            
            if (realPropId && realPropId !== activeId) { // ONLY reload if the ID actually changed!
                console.log("🩹 Auto-Repair: Zombie ID detected. Erasing cache and rebooting app to:", realPropId);
                localStorage.setItem('pms_active_property', realPropId);
                window.location.reload(); // Force a hard reboot so React drops all corrupted state
                return; // Stop rendering
            } else {
               console.log("Hotel legitimately has 0 rooms, or user has no properties.");
            }
        }

        setRooms(roomsRes.data || []);
        setBookings(bookingsRes.data || []);
        setIncidentals(incidentalsRes.data || []);
        setPayments(paymentsRes.data || []);
        setExpenses(expensesRes.data || []);
        setDailyCashBalances(cashBalancesRes.data || []);
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Global Realtime listener for ROOM status changes (Housekeeping Sync)
  useEffect(() => {
    if (!property?.id) return;

    const roomChannel = supabase
      .channel('rooms-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: 'property_id=eq.' + property.id
        },
        (payload) => {
          console.log("Realtime Room Update:", payload.new);
          setRooms((prevRooms) => 
            prevRooms.map((r) => r.id === payload.new.id ? { ...r, status: payload.new.status as Room['status'] } : r)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [property?.id, supabase]);

  // Self-Healing Status Logic: If a guest is Checked In, the room MUST be Occupied, even if the DB room status says Available
  const getTrueRoomStatus = (room: Room) => {
    const activeBooking = bookings.find(b => b.room_id === room.id && b.status === 'Checked In');
    if (activeBooking && room.status !== 'Blocked') {
      return 'Occupied';
    }
    return room.status;
  };

  const getBookingForRoom = (roomId: string) => {
    return bookings.find(b => {
      if (b.room_id !== roomId) return false;
      if (b.is_monthly) return false;
      if (!['Confirmed', 'Checked In', 'Checked Out'].includes(b.status)) return false;
      
      const bIn = b.check_in ? String(b.check_in).substring(0, 10) : '';
      const bOut = b.check_out ? String(b.check_out).substring(0, 10) : '';
      
      // Look up booking overlapping with activeBaseDate
      return bIn <= activeBaseDate && bOut > activeBaseDate;
    });
  };

  // Helper to format local date to YYYY-MM-DD
  const getLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to format date for human reading (e.g., "2026-04-21" -> "Apr 21, 2026")
  const formatFriendlyDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const getArrivalsToday = () => {
    const todayStr = businessDate || getLocalYYYYMMDD(new Date());
    let filtered = bookings.filter(b => {
      // Extract only the first 10 characters (YYYY-MM-DD) from whatever Postgres returned
      const dbDate = b.check_in ? String(b.check_in).substring(0, 10) : '';
      return dbDate === todayStr && b.status === 'Confirmed' && !b.is_monthly;
    });

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => {
        const roomNum = rooms.find(r => r.id === b.room_id)?.room_number || '';
        const nameMatch = b.guest_name ? b.guest_name.toLowerCase().includes(lowerQuery) : false;
        const roomMatch = roomNum.toLowerCase().includes(lowerQuery);
        return nameMatch || roomMatch;
      });
    }

    return filtered;
  };

  const getDeparturesToday = () => {
    const todayStr = businessDate || getLocalYYYYMMDD(new Date());
    let filtered = bookings.filter(b => {
      // Extract only the first 10 characters
      const dbDate = b.check_out ? String(b.check_out).substring(0, 10) : '';
      return dbDate === todayStr && b.status === 'Checked In' && !b.is_monthly;
    });

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => {
        const roomNum = rooms.find(r => r.id === b.room_id)?.room_number || '';
        const nameMatch = b.guest_name ? b.guest_name.toLowerCase().includes(lowerQuery) : false;
        const roomMatch = roomNum.toLowerCase().includes(lowerQuery);
        return nameMatch || roomMatch;
      });
    }

    return filtered;
  };

  const getInHouse = () => {
    let filtered = bookings;

    if (filterStartDate || filterEndDate) {
      filtered = bookings.filter(b => {
        if (!['Confirmed', 'Checked In', 'Checked Out'].includes(b.status)) return false;
        if (b.is_monthly) return false;

        const bIn = b.check_in ? String(b.check_in).substring(0, 10) : '';
        const bOut = b.check_out ? String(b.check_out).substring(0, 10) : '';

        const startBoundary = filterStartDate || bIn;
        const endBoundary = filterEndDate || bOut;

        return bIn < endBoundary && bOut > startBoundary;
      });
    } else {
      filtered = bookings.filter(b => b.status === 'Checked In' && !b.is_monthly);
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => {
        const roomNum = rooms.find(r => r.id === b.room_id)?.room_number || '';
        const nameMatch = b.guest_name ? b.guest_name.toLowerCase().includes(lowerQuery) : false;
        const roomMatch = roomNum.toLowerCase().includes(lowerQuery);
        return nameMatch || roomMatch;
      });
    }

    return filtered;
  };

  
  
  const getAllReservations = () => {
    let filtered = bookings.filter(b => !b.is_monthly);
    
    // 1. Status Filter
    if (reservationFilter !== 'All') {
      if (reservationFilter === 'Past') {
        filtered = filtered.filter(b => b.status === 'Checked Out' || b.status === 'Cancelled');
      } else {
        filtered = filtered.filter(b => b.status === reservationFilter);
      }
    }

    // 2. Date Range Filter
    if (filterStartDate) {
      filtered = filtered.filter(b => b.check_in >= filterStartDate);
    }
    if (filterEndDate) {
      filtered = filtered.filter(b => b.check_in <= filterEndDate);
    }

    // 3. Text Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => {
        const roomNum = rooms.find(r => r.id === b.room_id)?.room_number || '';
        const nameMatch = b.guest_name ? b.guest_name.toLowerCase().includes(lowerQuery) : false;
        const roomMatch = roomNum.toLowerCase() === lowerQuery;
        return nameMatch || roomMatch;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.check_in).getTime();
      const dateB = new Date(b.check_in).getTime();
      if (reservationFilter === 'Past') {
         const outA = new Date(a.check_out || a.created_at || '').getTime();
         const outB = new Date(b.check_out || b.created_at || '').getTime();
         return outB - outA;
      }
      return dateA - dateB;
    });
  };



  const hasAccess = (_moduleName: string) => {
    return true;
  };

  // SURGICAL IAM CHECKS (Checking specific JSON keys)
  const canCreateBooking = () => {
    return true;
  };

  const canCheckIn = () => {
    return true;
  };

  const canCheckOut = () => {
    return true;
  };

  const canRefund = () => {
    return true;
  };

  const canUpgrade = () => {
    return true;
  };

  const canBlockRoom = () => {
    return true;
  };

  const canWriteNotes = () => {
    return true;
  };

  const canCancel = () => {
    return true;
  };

  // --- ACTION HANDLERS ---
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    if (!confirm(`Are you sure you want to PERMANENTLY CANCEL the reservation for ${selectedBooking.guest_name}?`)) return;
    
    setActionLoading(true);
    const res = await cancelBooking(selectedBooking.id, selectedBooking.room_id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    const res = await updateGuestNotes(selectedBooking.id, notesInput);
    if (res.success) {
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, notes: notesInput } : b));
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleProcessRefund = async () => {
    if (!selectedBooking || !refundInput) return;
    const amount = parseFloat(refundInput);
    if (isNaN(amount) || amount <= 0) return alert("Invalid refund amount");

    setActionLoading(true);
    const res = await issueRefund(selectedBooking.id, selectedBooking.amount, amount);
    if (res.success && res.newAmount !== undefined) {
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, amount: res.newAmount } : b));
      setRefundInput('');
      setSelectedBooking({ ...selectedBooking, amount: res.newAmount }); // Update drawer UI
      alert(`Refund of ₹${amount} successful. New balance: ₹${res.newAmount}`);
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleExecuteUpgrade = async () => {
    if (!selectedBooking || !upgradeRoomId) return;
    setActionLoading(true);
    const res = await upgradeRoom(selectedBooking.id, selectedBooking.room_id, upgradeRoomId);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleBlockRoom = (room: Room) => {
    setActiveBlockRoom(room);
  };

  const handleSafeCheckIn = async (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation();
    setActionLoading(true);
    
    let paymentDetails = undefined;
    if (checkPaymentSecured && checkInPaymentRecorded) {
      const amountVal = parseFloat(checkInPaymentAmount);
      if (isNaN(amountVal) || amountVal <= 0) {
        alert("Please enter a valid check-in payment amount.");
        setActionLoading(false);
        return;
      }
      paymentDetails = {
        amount: amountVal,
        method: checkInPaymentMethod,
        transactionId: checkInPaymentTxnId.trim() || undefined
      };
    }

    const res = await checkInGuest(bookingId, paymentDetails);
    setActionLoading(false);
    
    if (res.error) {
      alert(res.error);
    } else {
      setSelectedBooking(null);
      loadDashboardData();
    }
  };

  const handleSafeCheckOut = async (e: React.MouseEvent, bookingId: string, roomId: string) => {
    e.stopPropagation();
    const b = bookings.find(b => b.id === bookingId);
    if (!b) return;
    setActiveCheckoutBooking({
      bookingId,
      roomId,
      guestName: b.guest_name,
      amount: Number(b.amount)
    });
  };


  useEffect(() => {
    if (!selectedBooking) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: "id=eq." + selectedBooking.id
        },
        (payload) => {
          if (payload.new.id_verified) {
            setSelectedBooking(payload.new as Booking);
            setCheckIdVerified(true);
            setCheckRegCardSigned(true);
            setShowQrCode(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBooking, supabase]);



  const handleRetakeIdentity = async () => {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to VOID the current ID and signature? You will need to capture them again.")) return;
    
    setActionLoading(true);
    const res = await resetGuestIdentity(selectedBooking.id);
    if (res.success) {
      // Fetch fresh data to reset UI
      await refreshBookingStatus();
      setCheckIdVerified(false);
      setCheckRegCardSigned(false);
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const refreshBookingStatus = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    const { data, error } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
    if (data && !error) {
      setSelectedBooking(data as Booking);
      if (data.id_verified) {
        setCheckIdVerified(true);
        setCheckRegCardSigned(true);
      }
    }
    setActionLoading(false);
  };

  const openActionDrawer = (booking: Booking) => {
    setSelectedBooking(booking);
    setNotesInput(booking.notes || '');
    setRefundInput('');
    setUpgradeRoomId('');
    
    // Reset Check-In checklist for safety
    setCheckIdVerified(false);
    setCheckRegCardSigned(false);
    setCheckPaymentSecured(false);
    setCheckFormFDone(false);
    setGuestAddress(booking.guest_address || '');
    
    // Reset and pre-fill check-in payment details
    setCheckInPaymentRecorded(true);
    setCheckInPaymentMethod('Cash');
    setCheckInPaymentAmount(booking.amount.toString());
    setCheckInPaymentTxnId('');
    
    // Auto-check requirements if they were already done via the Magic Link
    if (booking.id_verified) {
      setCheckIdVerified(true);
      setCheckRegCardSigned(true);
    }

    // Initialize check-in time editing states
    setIsEditingCheckInTime(false);
    setTempCheckInTime(toLocalDatetimeString(booking.check_in_time));
  };

  // --- SUB-COMPONENT: LIST ITEM ---
  const BookingRow = ({ booking }: { booking: Booking }) => {
    const bookingIncidentals = incidentals.filter(i => i.booking_id === booking.id);
    const bookingPayments = payments.filter(p => p.booking_id === booking.id && !p.is_void);

    const dailyRoomChargesSum = bookingIncidentals
      .filter(item => item.description?.startsWith('Daily Room Charge'))
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const roomAmount = booking.is_monthly
      ? Number(booking.monthly_rate || 0)
      : Math.max(0, Number(booking.amount) - dailyRoomChargesSum);
    const incidentalsAmount = bookingIncidentals.reduce((sum, item) => sum + Number(item.amount), 0) + (booking.is_monthly ? Number(booking.amount) : 0);
    const totalCharges = roomAmount + incidentalsAmount;
    const totalPaid = bookingPayments.reduce((sum, item) => sum + Number(item.amount), 0);

    // Compute room-only charges for the card (Standard Room Tariff + Past Stay Dues only, EXCLUDING food & water, early check-in, and late checkout)
    const cardChargesTotal = roomAmount + 
      (booking.is_monthly ? Number(booking.amount) : 0) +
      bookingIncidentals
        .filter(inc => isCardRoomCharge(inc.description || ''))
        .reduce((sum, inc) => sum + Number(inc.amount), 0);

    const excludedChargesTotal = totalCharges - cardChargesTotal;
    const cardPaid = Math.max(0, totalPaid - excludedChargesTotal);
    const cardBalanceDue = Math.max(0, cardChargesTotal - cardPaid);
    
    const hasDues = cardBalanceDue > 0.01;

    return (
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => openActionDrawer(booking)}
        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 bg-zinc-900/40 border border-white/[0.04] rounded-2xl hover:border-indigo-500/40 transition-all cursor-pointer shadow-xl gap-4"
      >
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/5 flex items-center justify-center text-indigo-400 font-black text-xs uppercase group-hover:scale-105 transition-transform shrink-0">
            {booking.guest_name.substring(0, 2)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{booking.guest_name}</h4>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Room {rooms.find(r => r.id === booking.room_id)?.room_number || 'N/A'} &bull; {booking.id.slice(0, 8)}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md w-fit">
                  {calculateNights(booking.check_in, booking.check_out)} Nights &bull; {formatFriendlyDate(booking.check_in)} to {formatFriendlyDate(booking.check_out)}
                </p>
                {booking.is_monthly && (
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded-md w-fit flex items-center gap-1">
                    Co-Living Guest (Rent: ₹{Number(booking.monthly_rate || 0).toLocaleString('en-IN')} /mo, Cycle Day: {booking.billing_cycle_date})
                  </p>
                )}
                {booking.check_in_time && (
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md w-fit flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    C.In: {new Date(booking.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                )}
                {booking.check_out_time && (
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md w-fit flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    C.Out: {new Date(booking.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/[0.04] pt-3 sm:pt-0">
          <div className="text-left sm:text-right">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter">Amount Due</p>
            <p className={`text-sm font-black ${hasDues ? 'text-rose-400' : 'text-emerald-400'}`}>
              ₹{cardBalanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          
          <div className="flex gap-2">
            {booking.status === 'Confirmed' && (
              canCheckIn() ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); openActionDrawer(booking); }}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-amber-500/10 shrink-0"
                >
                  START CHECK-IN
                </button>
              ) : <Lock size={14} className="text-zinc-700 mx-4" />
            )}
            {booking.status === 'Checked In' && (
              canCheckOut() ? (
                <button 
                  onClick={(e) => handleSafeCheckOut(e, booking.id, booking.room_id)}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-rose-500/10 shrink-0"
                >
                  CHECK OUT
                </button>
              ) : <Lock size={14} className="text-zinc-700 mx-4" />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const calculateNights = (inDate: string, outDate: string) => {
    const d1 = new Date(inDate);
    const d2 = new Date(outDate);
    const diff = d2.getTime() - d1.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getPaymentDateStr = (p: any) => {
    if (p.business_date) {
      const s = String(p.business_date);
      if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
        return s.substring(0, 10);
      }
    }
    if (!p.created_at) return '';
    try {
      return new Date(p.created_at).toISOString().substring(0, 10);
    } catch {
      return String(p.created_at).substring(0, 10);
    }
  };

  const getOpeningCashForDate = (dateStr: string): number => {
    const record = dailyCashBalances.find(b => b.date === dateStr);
    if (record) {
      return Number(record.opening_cash);
    }
    const previousBalances = dailyCashBalances
      .filter(b => b.date < dateStr)
      .sort((a, b) => b.date.localeCompare(a.date));
      
    if (previousBalances.length > 0) {
      const lastRecord = previousBalances[0];
      if (lastRecord.closing_cash !== null && lastRecord.closing_cash !== undefined) {
        return Number(lastRecord.closing_cash);
      }
      return getExpectedCashForDate(lastRecord.date);
    }
    return 0;
  };

  const getExpectedCashForDate = (dateStr: string): number => {
    const opening = getOpeningCashForDate(dateStr);
    const cashPayments = payments
      .filter(p => !p.is_void && p.method === 'Cash' && getPaymentDateStr(p) === dateStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const cashExpenses = expenses
      .filter(e => e.payment_method === 'Cash' && e.date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return opening + cashPayments - cashExpenses;
  };

  const getLedgerTotalsForDate = (dateStr: string) => {
    const openingCash = getOpeningCashForDate(dateStr);
    const cashPayments = payments
      .filter(p => !p.is_void && p.method === 'Cash' && getPaymentDateStr(p) === dateStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const upiPayments = payments
      .filter(p => !p.is_void && p.method === 'UPI' && getPaymentDateStr(p) === dateStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const otherPayments = payments
      .filter(p => !p.is_void && !['Cash', 'UPI'].includes(p.method) && getPaymentDateStr(p) === dateStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const cashExpenses = expenses
      .filter(e => e.payment_method === 'Cash' && e.date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const upiExpenses = expenses
      .filter(e => e.payment_method === 'UPI' && e.date === dateStr)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const expectedClosingCash = openingCash + cashPayments - cashExpenses;
    const savedRecord = dailyCashBalances.find(b => b.date === dateStr);
    const actualClosingCash = savedRecord?.closing_cash !== null && savedRecord?.closing_cash !== undefined 
      ? Number(savedRecord.closing_cash) 
      : null;
    const handedOverCash = savedRecord?.handed_over_cash !== null && savedRecord?.handed_over_cash !== undefined
      ? Number(savedRecord.handed_over_cash)
      : 0;
    return {
      openingCash,
      cashPayments,
      upiPayments,
      otherPayments,
      cashExpenses,
      upiExpenses,
      expectedClosingCash,
      actualClosingCash,
      handedOverCash,
      isClosed: actualClosingCash !== null
    };
  };

  const handleSaveOpeningCash = async () => {
    if (!property?.id) return;
    const amountVal = parseFloat(openingCashInput);
    if (isNaN(amountVal) || amountVal < 0) {
      alert("Please enter a valid cash amount.");
      return;
    }
    setIsSavingExpense(true);
    try {
      const record = dailyCashBalances.find(b => b.date === selectedLedgerDate);
      let error;
      if (record) {
        const res = await supabase
          .from('daily_cash_balances')
          .update({ opening_cash: amountVal })
          .eq('id', record.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('daily_cash_balances')
          .insert({
            property_id: property.id,
            date: selectedLedgerDate,
            opening_cash: amountVal
          });
        error = res.error;
      }
      if (error) {
        alert("Error saving opening cash: " + error.message);
      } else {
        setOpeningCashInput('');
        await loadDashboardData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleCloseCash = async (closingAmount: number, handedOverAmount: number = 0) => {
    if (!property?.id) return;
    setIsSavingExpense(true);
    try {
      const record = dailyCashBalances.find(b => b.date === selectedLedgerDate);
      let error;
      if (record) {
        const res = await supabase
          .from('daily_cash_balances')
          .update({ 
            closing_cash: closingAmount,
            handed_over_cash: handedOverAmount
          })
          .eq('id', record.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('daily_cash_balances')
          .insert({
            property_id: property.id,
            date: selectedLedgerDate,
            opening_cash: getOpeningCashForDate(selectedLedgerDate),
            closing_cash: closingAmount,
            handed_over_cash: handedOverAmount
          });
        error = res.error;
      }
      if (error) {
        alert("Error closing cash: " + error.message);
      } else {
        await loadDashboardData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleResetCloseCash = async () => {
    if (!property?.id) return;
    const record = dailyCashBalances.find(b => b.date === selectedLedgerDate);
    if (!record) return;
    if (!confirm("Are you sure you want to RE-OPEN the cash counter for this day?")) {
      return;
    }
    setIsSavingExpense(true);
    try {
      const { error } = await supabase
        .from('daily_cash_balances')
        .update({ 
          closing_cash: null,
          handed_over_cash: 0.00
        })
        .eq('id', record.id);
      if (error) {
        alert("Error re-opening cash: " + error.message);
      } else {
        await loadDashboardData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property?.id) return;
    const amountVal = parseFloat(newExpenseAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }
    if (!newExpenseDescription.trim()) {
      alert("Please enter an expense description.");
      return;
    }
    setIsSavingExpense(true);
    
    // Append quantity manually if greater than 1
    let finalDesc = newExpenseDescription.trim();
    if (newExpenseQuantity > 1) {
      finalDesc = `${finalDesc} (Qty: ${newExpenseQuantity})`;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          property_id: property.id,
          description: finalDesc,
          category: newExpenseCategory,
          amount: amountVal,
          payment_method: newExpensePaymentMethod,
          date: newExpenseDate
        });
      if (error) {
        alert("Error saving expense: " + error.message);
      } else {
        setNewExpenseDescription('');
        setNewExpenseAmount('');
        setNewExpenseQuantity(1); // Reset quantity
        await loadDashboardData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setIsSavingExpense(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) {
        alert("Error deleting expense: " + error.message);
      } else {
        await loadDashboardData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const generateHorizontalPDFReport = async (type: 'checkins' | 'checkouts' | 'pending' | 'inhouse') => {
    const newWindow = openSecurePDFWindow();
    if (!property) {
      if (newWindow) newWindow.close();
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
    
    // Polyfill window.jsPDF to ensure jspdf-autotable loads/binds properly in Next.js
    if (typeof window !== 'undefined') {
      (window as any).jsPDF = jsPDF;
    }
    
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    let title = '';
    let dataList: any[] = [];
    if (type === 'checkins') {
      title = `Daily Check-Ins Report - ${formatFriendlyDate(selectedLedgerDate)}`;
      dataList = bookings.filter(b => {
        if (b.is_monthly) return false; // Isolate from daily transient reports
        const cInTimeStr = b.check_in_time ? getLocalYYYYMMDD(new Date(b.check_in_time)) : '';
        const cInDateStr = b.check_in ? b.check_in.substring(0, 10) : '';
        const actDate = cInTimeStr || cInDateStr;
        return actDate === selectedLedgerDate && ['Checked In', 'Checked Out'].includes(b.status);
      });
    } else if (type === 'checkouts') {
      title = `Daily Check-Outs Report - ${formatFriendlyDate(selectedLedgerDate)}`;
      dataList = bookings.filter(b => {
        if (b.is_monthly) return false; // Isolate from daily transient reports
        const cOutTimeStr = b.check_out_time ? getLocalYYYYMMDD(new Date(b.check_out_time)) : '';
        const cOutDateStr = b.check_out ? b.check_out.substring(0, 10) : '';
        const actDate = cOutTimeStr || cOutDateStr;
        return actDate === selectedLedgerDate && b.status === 'Checked Out';
      });
    } else if (type === 'inhouse') {
      title = `Daily In-House Guests Report - ${formatFriendlyDate(selectedLedgerDate)}`;
      dataList = bookings.filter(b => {
        if (b.is_monthly) return false; // Isolate from daily transient reports
        const checkInDate = b.check_in_time ? getLocalYYYYMMDD(new Date(b.check_in_time)) : (b.check_in ? b.check_in.substring(0, 10) : '');
        const checkOutDate = b.check_out_time ? getLocalYYYYMMDD(new Date(b.check_out_time)) : (b.check_out ? b.check_out.substring(0, 10) : '');
        
        if (b.status === 'Checked In') {
          return checkInDate <= selectedLedgerDate;
        }
        if (b.status === 'Checked Out') {
          // Historically in-house on selectedLedgerDate (excluding checkout date)
          return checkInDate <= selectedLedgerDate && checkOutDate > selectedLedgerDate;
        }
        return false;
      });
    } else if (type === 'pending') {
      title = `Daily Pending Bills Report - ${formatFriendlyDate(selectedLedgerDate)}`;
      dataList = bookings.filter(b => {
        if (b.is_monthly) return false; // Isolate from daily transient reports
        if (b.status !== 'Checked In') return false;
        const bookingIncidentals = incidentals.filter(i => i.booking_id === b.id);
        const bookingPayments = payments.filter(p => p.booking_id === b.id && !p.is_void);
        const dailyRoomChargesSum = bookingIncidentals
          .filter(item => item.description?.startsWith('Daily Room Charge'))
          .reduce((sum, item) => sum + Number(item.amount), 0);
        const roomAmount = b.is_monthly
          ? Number(b.monthly_rate || 0)
          : Math.max(0, Number(b.amount) - dailyRoomChargesSum);
        const incidentalsAmount = bookingIncidentals.reduce((sum, item) => sum + Number(item.amount), 0) + (b.is_monthly ? Number(b.amount) : 0);
        const totalCharges = roomAmount + incidentalsAmount;
        const totalPaid = bookingPayments.reduce((sum, item) => sum + Number(item.amount), 0);
        const balanceDue = totalCharges - totalPaid;
        return balanceDue > 0.01;
      });
    }
    let totalCash = 0;
    let totalUPI = 0;
    let totalDue = 0;
    const rows = dataList.map((b, idx) => {
      const roomNum = rooms.find(r => r.id === b.room_id)?.room_number || 'N/A';
      const bookingPaymentsOnDate = payments.filter(p => p.booking_id === b.id && getPaymentDateStr(p) === selectedLedgerDate && !p.is_void);
      const cashAmt = bookingPaymentsOnDate.filter(p => p.method === 'Cash').reduce((sum, p) => sum + Number(p.amount), 0);
      const upiAmt = bookingPaymentsOnDate.filter(p => p.method === 'UPI').reduce((sum, p) => sum + Number(p.amount), 0);
      
      const bookingIncidentals = incidentals.filter(i => i.booking_id === b.id);
      const bookingPaymentsAll = payments.filter(p => p.booking_id === b.id && !p.is_void);
      const dailyRoomChargesSum = bookingIncidentals
        .filter(item => item.description?.startsWith('Daily Room Charge'))
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const roomAmount = b.is_monthly
        ? Number(b.monthly_rate || 0)
        : Math.max(0, Number(b.amount) - dailyRoomChargesSum);
      const incidentalsAmount = bookingIncidentals.reduce((sum, item) => sum + Number(item.amount), 0) + (b.is_monthly ? Number(b.amount) : 0);
      const totalCharges = roomAmount + incidentalsAmount;
      const totalPaid = bookingPaymentsAll.reduce((sum, item) => sum + Number(item.amount), 0);
      const balanceDue = Math.max(0, totalCharges - totalPaid);
      
      totalCash += cashAmt;
      totalUPI += upiAmt;
      totalDue += balanceDue;
      const formatDateTime = (isoStr?: string) => {
        if (!isoStr) return 'N/A';
        const date = new Date(isoStr);
        
        // Format the date part (e.g., "22 Jun")
        const formattedDate = date.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short' 
        });
        
        // Check if a specific hour/minute time was recorded (not just a pure date string)
        const hasTime = isoStr.includes('T') && 
                        !isoStr.endsWith('T00:00:00') && 
                        !isoStr.endsWith('T00:00:00.000Z');
                        
        if (hasTime) {
          const formattedTime = date.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          return `${formattedDate} (${formattedTime})`; // e.g. "22 Jun (08:00 PM)"
        }
        
        return formattedDate;
      };
      return [
        idx + 1,
        b.guest_name,
        b.guest_phone || 'N/A',
        formatDateTime(b.check_in_time || b.check_in),
        formatDateTime(b.check_out_time || b.check_out),
        roomNum,
        cashAmt > 0 ? `Rs. ${cashAmt.toFixed(2)}` : 'Rs. 0.00',
        upiAmt > 0 ? `Rs. ${upiAmt.toFixed(2)}` : 'Rs. 0.00',
        `Rs. ${balanceDue.toFixed(2)}`
      ];
    });
    doc.setFillColor(10, 10, 12);
    doc.rect(0, 0, 297, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(property.name.toUpperCase(), 15, 15);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(title, 15, 25);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 15, 32);
    autoTable(doc, {
      startY: 45,
      head: [['SL', 'GUEST NAME', 'PHONE', 'C.IN/TIME', 'C.OUT/TIME', 'ROOM', 'CASH', 'UPI', 'DUE']],
      body: rows,
      foot: [['', 'TOTALS', '', '', '', '', `Rs. ${totalCash.toFixed(2)}`, `Rs. ${totalUPI.toFixed(2)}`, `Rs. ${totalDue.toFixed(2)}` ]],
      showFoot: 'lastPage',
      theme: 'grid',
      rowPageBreak: 'avoid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        font: 'helvetica',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      footStyles: {
        fillColor: [244, 244, 245],
        textColor: [24, 24, 27],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        5: { fontStyle: 'bold' },
        6: { fontStyle: 'bold', halign: 'right' },
        7: { fontStyle: 'bold', halign: 'right' },
        8: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38] }
      }
    });
    
      // Output a Blob and open it in a new tab for inline previewing/printing/downloading
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (newWindow) {
        newWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (err: any) {
      if (newWindow) newWindow.close();
      console.error("PDF Generate error:", err);
      alert("Failed to build PDF. Please check console.");
    }
  };

  const generateReconciliationPDFReport = async () => {
    const newWindow = openSecurePDFWindow();
    if (!property) {
      if (newWindow) newWindow.close();
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Calculate identical metrics as Night Audit to guarantee absolute precision
      const dayPayments = payments.filter(p => getPaymentDateStr(p) === selectedLedgerDate && !p.is_void);

      let roomCash = 0, roomUPI = 0, roomSwipe = 0, roomOthers = 0;
      let foodCash = 0, foodUPI = 0, foodSwipe = 0, foodOthers = 0;

      dayPayments.forEach(p => {
        const amt = Number(p.amount);
        const method = p.method;
        const bkId = p.booking_id;
        
        // Find all incidentals and payments for this booking
        const bookingIncidentals = incidentals.filter(inc => inc.booking_id === bkId);
        const bookingPayments = payments.filter(pm => pm.booking_id === bkId && !pm.is_void);

        // Sum food & water charges
        const foodChargesTotal = bookingIncidentals
          .filter(inc => !isRoomRelatedCharge(inc.description || ''))
          .reduce((sum, inc) => sum + Number(inc.amount), 0);

        // Sort booking payments chronologically
        const sortedBkPayments = [...bookingPayments].sort((a, b) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tA - tB;
        });

        const pIndex = sortedBkPayments.findIndex(pm => pm.id === p.id);
        const prevPaid = sortedBkPayments.slice(0, pIndex).reduce((sum, pm) => sum + Number(pm.amount), 0);
        const totalPaidToDate = prevPaid + amt;

        const foodCoveredPrev = Math.min(foodChargesTotal, prevPaid);
        const foodCoveredToDate = Math.min(foodChargesTotal, totalPaidToDate);

        const foodAlloc = Math.max(0, foodCoveredToDate - foodCoveredPrev);
        const roomAlloc = Math.max(0, amt - foodAlloc);

        if (method === 'Cash') {
          foodCash += foodAlloc;
          roomCash += roomAlloc;
        } else if (method === 'UPI') {
          foodUPI += foodAlloc;
          roomUPI += roomAlloc;
        } else if (method === 'SWIPE') {
          foodSwipe += foodAlloc;
          roomSwipe += roomAlloc;
        } else {
          foodOthers += foodAlloc;
          roomOthers += roomAlloc;
        }
      });

      const reconData = {
        room: { Cash: roomCash, UPI: roomUPI, SWIPE: roomSwipe, Others: roomOthers },
        food: { Cash: foodCash, UPI: foodUPI, SWIPE: foodSwipe, Others: foodOthers },
        total: {
          Cash: roomCash + foodCash,
          UPI: roomUPI + foodUPI,
          SWIPE: roomSwipe + foodSwipe,
          Others: roomOthers + foodOthers
        }
      };

      const todayCashCollected = reconData.total.Cash;
      const totalSaleAmount = reconData.total.Cash + reconData.total.UPI + reconData.total.SWIPE + reconData.total.Others;
      const openingCash = getOpeningCashForDate(selectedLedgerDate);
      const dayExpenses = expenses.filter(e => e.date === selectedLedgerDate);
      const cashExpenses = dayExpenses.filter(e => e.payment_method === 'Cash').reduce((sum, e) => sum + Number(e.amount), 0);
      const totalExpenses = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const cashInCounter = openingCash + todayCashCollected - cashExpenses;

      // Luxury dark header block for Shift Handover
      doc.setFillColor(15, 23, 42); // slate-900 (Highly professional dark theme)
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("STAYSYNC PMS - CASHIER SHIFT RECONCILIATION & HANDOVER", 15, 14);
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(`PROPERTY: ${property?.name || 'StaySync Boutique Property'}`, 15, 22);
      doc.text(`SHIFT DATE: ${formatFriendlyDate(selectedLedgerDate)}`, 15, 28);
      doc.text(`GENERATED ON: ${new Date().toLocaleString()}`, 135, 28);

      // Section 1: Categories breakdown table
      let currentY = 46;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("1. SALES REVENUE BREAKDOWN CATEGORIES (BY PAYMENT MODE)", 15, currentY);

      const salesHeaders = ["Category", "Cash", "PhonePe UPI", "Swipe Card", "Others (Custom)", "Total"];
      const salesRows = [
        [
          "Room Tariff", 
          `Rs. ${reconData.room.Cash.toFixed(2)}`, 
          `Rs. ${reconData.room.UPI.toFixed(2)}`, 
          `Rs. ${reconData.room.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.room.Others.toFixed(2)}`,
          `Rs. ${(reconData.room.Cash + reconData.room.UPI + reconData.room.SWIPE + reconData.room.Others).toFixed(2)}`
        ],
        [
          "Food & Water", 
          `Rs. ${reconData.food.Cash.toFixed(2)}`, 
          `Rs. ${reconData.food.UPI.toFixed(2)}`, 
          `Rs. ${reconData.food.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.food.Others.toFixed(2)}`,
          `Rs. ${(reconData.food.Cash + reconData.food.UPI + reconData.food.SWIPE + reconData.food.Others).toFixed(2)}`
        ],
        [
          "TOTAL", 
          `Rs. ${reconData.total.Cash.toFixed(2)}`, 
          `Rs. ${reconData.total.UPI.toFixed(2)}`, 
          `Rs. ${reconData.total.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.total.Others.toFixed(2)}`,
          `Rs. ${totalSaleAmount.toFixed(2)}`
        ]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        head: [salesHeaders],
        body: salesRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Section 2: Expenses
      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("2. TOTAL EXPENSES REGISTER (SHIFT OUTFLOW)", 15, currentY);

      const expRows = dayExpenses.map((ex, i) => [
        i + 1,
        ex.description,
        ex.category,
        ex.payment_method,
        `Rs. ${Number(ex.amount).toFixed(2)}`
      ]);

      if (expRows.length === 0) {
        expRows.push(["-", "No localized expenses logged today.", "-", "-", "Rs. 0.00"]);
      } else {
        expRows.push(["", "TOTAL", "", "", `Rs. ${totalExpenses.toFixed(2)}`]);
      }

      autoTable(doc, {
        startY: currentY + 3,
        head: [["S.No", "Description / Vendor", "Category", "Payment Mode", "Amount"]],
        body: expRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [115, 115, 115], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 70, fontStyle: 'bold' },
          4: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Section 3 & 4: Dual columnar summary
      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("3. CASH COUNTER RECONCILIATION", 15, currentY);
      doc.text("4. TRUE PERIOD SALES TOTAL", 110, currentY);

      const stats = getLedgerTotalsForDate(selectedLedgerDate);
      const reconciliationFormula = [
        ["Yesterday Cash Balance (Opening)", `+ Rs. ${openingCash.toFixed(2)}`],
        ["Today Cash Received (Tariff + Food)", `+ Rs. ${todayCashCollected.toFixed(2)}`],
        ["Today Cash Expenses (Subtracted)", `- Rs. ${cashExpenses.toFixed(2)}`],
        ["Expected Cash In Counter Drawer", `Rs. ${stats.expectedClosingCash.toFixed(2)}`],
        ["Handed Over to Finance", `- Rs. ${stats.handedOverCash.toFixed(2)}`],
        ["Remaining Counter Float (Closing)", `Rs. ${(stats.isClosed ? stats.actualClosingCash : (stats.expectedClosingCash - stats.handedOverCash))?.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        body: reconciliationFormula,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
        },
        margin: { left: 15 }
      });

      const netSaleVsExpenses = totalSaleAmount - totalExpenses;
      const paymentSalesSummary = [
        ["Cash Collections", `Rs. ${reconData.total.Cash.toFixed(2)}`],
        ["PhonePe UPI Collections", `Rs. ${reconData.total.UPI.toFixed(2)}`],
        ["Swipe Card Collections", `Rs. ${reconData.total.SWIPE.toFixed(2)}`],
        ["Others (Custom Payment Modes)", `Rs. ${reconData.total.Others.toFixed(2)}`],
        ["TOTAL SALE FOR THE PERIOD", `Rs. ${totalSaleAmount.toFixed(2)}`],
        ["Total Logged Expenses", `- Rs. ${totalExpenses.toFixed(2)}`],
        ["TOTAL SALE VS EXPENSES (NET)", `Rs. ${netSaleVsExpenses.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        body: paymentSalesSummary,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
        },
        margin: { left: 110 }
      });

      // Section 5: Handover Verification Sign-off Block
      currentY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("5. CASHIER HANDOVER SIGN-OFF VERIFICATION", 15, currentY);

      const handoverRows = [
        ["Expected Cash in Drawer:", `Rs. ${stats.expectedClosingCash.toFixed(2)}`, "Outgoing Cashier Name & Sign:", ""],
        ["Actual Handover Cash:", stats.isClosed ? `Rs. ${stats.handedOverCash.toFixed(2)}` : "Rs. _________________", "Incoming Cashier Name & Sign:", ""],
        ["Remaining Counter Float:", stats.isClosed ? `Rs. ${stats.actualClosingCash?.toFixed(2)}` : "Rs. _________________", "Manager Approval & Sign:", ""]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        body: handoverRows,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 4, font: 'helvetica', valign: 'middle' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, fillColor: [248, 250, 252] },
          1: { fontStyle: 'bold', cellWidth: 45 },
          2: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
          3: { cellWidth: 50 }
        }
      });

      // Verification Footer
      const lastY = (doc as any).lastAutoTable.finalY + 12;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, lastY, 195, lastY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("* Reconciled automatically under database-level atomicity. Signature marks required for cashier shifts.", 15, lastY + 4);

      // Output and open in a new tab (inline PDF viewer)
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (newWindow) {
        newWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (err) {
      if (newWindow) newWindow.close();
      console.error("PDF Generate error:", err);
      alert("Failed to build PDF. Please check console.");
    }
  };

  const generateNightAuditPDFReport = async () => {
    const newWindow = openSecurePDFWindow();
    if (!property) {
      if (newWindow) newWindow.close();
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Split calculation logic matching Step 3
      const dayPayments = payments.filter(p => getPaymentDateStr(p) === selectedLedgerDate && !p.is_void);

      let roomCash = 0, roomUPI = 0, roomSwipe = 0, roomOthers = 0;
      let foodCash = 0, foodUPI = 0, foodSwipe = 0, foodOthers = 0;

      dayPayments.forEach(p => {
        const amt = Number(p.amount);
        const method = p.method;
        const bkId = p.booking_id;
        
        // Find all incidentals and payments for this booking
        const bookingIncidentals = incidentals.filter(inc => inc.booking_id === bkId);
        const bookingPayments = payments.filter(pm => pm.booking_id === bkId && !pm.is_void);

        // Sum food & water charges
        const foodChargesTotal = bookingIncidentals
          .filter(inc => !isRoomRelatedCharge(inc.description || ''))
          .reduce((sum, inc) => sum + Number(inc.amount), 0);

        // Sort booking payments chronologically
        const sortedBkPayments = [...bookingPayments].sort((a, b) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tA - tB;
        });

        const pIndex = sortedBkPayments.findIndex(pm => pm.id === p.id);
        const prevPaid = sortedBkPayments.slice(0, pIndex).reduce((sum, pm) => sum + Number(pm.amount), 0);
        const totalPaidToDate = prevPaid + amt;

        const foodCoveredPrev = Math.min(foodChargesTotal, prevPaid);
        const foodCoveredToDate = Math.min(foodChargesTotal, totalPaidToDate);

        const foodAlloc = Math.max(0, foodCoveredToDate - foodCoveredPrev);
        const roomAlloc = Math.max(0, amt - foodAlloc);

        if (method === 'Cash') {
          foodCash += foodAlloc;
          roomCash += roomAlloc;
        } else if (method === 'UPI') {
          foodUPI += foodAlloc;
          roomUPI += roomAlloc;
        } else if (method === 'SWIPE') {
          foodSwipe += foodAlloc;
          roomSwipe += roomAlloc;
        } else {
          foodOthers += foodAlloc;
          roomOthers += roomAlloc;
        }
      });

      const reconData = {
        room: { Cash: roomCash, UPI: roomUPI, SWIPE: roomSwipe, Others: roomOthers },
        food: { Cash: foodCash, UPI: foodUPI, SWIPE: foodSwipe, Others: foodOthers },
        total: {
          Cash: roomCash + foodCash,
          UPI: roomUPI + foodUPI,
          SWIPE: roomSwipe + foodSwipe,
          Others: roomOthers + foodOthers
        }
      };

      const todayCashCollected = reconData.total.Cash;
      const totalSaleAmount = reconData.total.Cash + reconData.total.UPI + reconData.total.SWIPE + reconData.total.Others;
      const openingCash = getOpeningCashForDate(selectedLedgerDate);
      const dayExpenses = expenses.filter(e => e.date === selectedLedgerDate);
      const cashExpenses = dayExpenses.filter(e => e.payment_method === 'Cash').reduce((sum, e) => sum + Number(e.amount), 0);
      const totalExpenses = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const cashInCounter = openingCash + todayCashCollected - cashExpenses;

      // Luxury dark header block
      doc.setFillColor(10, 10, 12); // #0a0a0c
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("STAYSYNC PMS - DAILY NIGHT AUDIT RECONCILIATION", 15, 14);
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(`PROPERTY: ${property?.name || 'StaySync Boutique Property'}`, 15, 22);
      doc.text(`BUSINESS DATE: ${formatFriendlyDate(selectedLedgerDate)}`, 15, 28);
      doc.text(`GENERATED ON: ${new Date().toLocaleString()}`, 135, 28);

      // Section 1: Categories breakdown table
      let currentY = 46;
      doc.setTextColor(10, 10, 12);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("1. SALES REVENUE BREAKDOWN CATEGORIES", 15, currentY);

      const salesHeaders = ["Category", "Cash", "PhonePe UPI", "Swipe Card", "Others (Custom)", "Total"];
      const salesRows = [
        [
          "Room Tariff", 
          `Rs. ${reconData.room.Cash.toFixed(2)}`, 
          `Rs. ${reconData.room.UPI.toFixed(2)}`, 
          `Rs. ${reconData.room.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.room.Others.toFixed(2)}`,
          `Rs. ${(reconData.room.Cash + reconData.room.UPI + reconData.room.SWIPE + reconData.room.Others).toFixed(2)}`
        ],
        [
          "Food & Water", 
          `Rs. ${reconData.food.Cash.toFixed(2)}`, 
          `Rs. ${reconData.food.UPI.toFixed(2)}`, 
          `Rs. ${reconData.food.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.food.Others.toFixed(2)}`,
          `Rs. ${(reconData.food.Cash + reconData.food.UPI + reconData.food.SWIPE + reconData.food.Others).toFixed(2)}`
        ],
        [
          "TOTAL", 
          `Rs. ${reconData.total.Cash.toFixed(2)}`, 
          `Rs. ${reconData.total.UPI.toFixed(2)}`, 
          `Rs. ${reconData.total.SWIPE.toFixed(2)}`, 
          `Rs. ${reconData.total.Others.toFixed(2)}`,
          `Rs. ${totalSaleAmount.toFixed(2)}`
        ]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        head: [salesHeaders],
        body: salesRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Section 2: Expenses
      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("2. TOTAL EXPENSES REGISTER", 15, currentY);

      const expRows = dayExpenses.map((ex, i) => [
        i + 1,
        ex.description,
        ex.category,
        ex.payment_method,
        `Rs. ${Number(ex.amount).toFixed(2)}`
      ]);

      if (expRows.length === 0) {
        expRows.push(["-", "No localized expenses logged today.", "-", "-", "Rs. 0.00"]);
      } else {
        expRows.push(["", "TOTAL", "", "", `Rs. ${totalExpenses.toFixed(2)}`]);
      }

      autoTable(doc, {
        startY: currentY + 3,
        head: [["S.No", "Description / Vendor", "Category", "Payment Mode", "Amount"]],
        body: expRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [115, 115, 115], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 70, fontStyle: 'bold' },
          4: { halign: 'right', fontStyle: 'bold' }
        }
      });

      // Section 3 & 4: Dual columnar summary
      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("3. CASH COUNTER RECONCILIATION", 15, currentY);
      doc.text("4. TRUE DAILY SALES TOTAL", 110, currentY);

      const stats = getLedgerTotalsForDate(selectedLedgerDate);
      const reconciliationFormula = [
        ["Yesterday Cash Balance (Opening)", `+ Rs. ${openingCash.toFixed(2)}`],
        ["Today Cash Received (Tariff + Food)", `+ Rs. ${todayCashCollected.toFixed(2)}`],
        ["Today Cash Expenses (Subtracted)", `- Rs. ${cashExpenses.toFixed(2)}`],
        ["Expected Cash In Counter Drawer", `Rs. ${stats.expectedClosingCash.toFixed(2)}`],
        ["Handed Over to Finance", `- Rs. ${stats.handedOverCash.toFixed(2)}`],
        ["Remaining Counter Float (Closing)", `Rs. ${(stats.isClosed ? stats.actualClosingCash : (stats.expectedClosingCash - stats.handedOverCash))?.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        body: reconciliationFormula,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
        },
        margin: { left: 15 }
      });

      const netSaleVsExpenses = totalSaleAmount - totalExpenses;
      const paymentSalesSummary = [
        ["Cash Collections", `Rs. ${reconData.total.Cash.toFixed(2)}`],
        ["PhonePe UPI Collections", `Rs. ${reconData.total.UPI.toFixed(2)}`],
        ["Swipe Card Collections", `Rs. ${reconData.total.SWIPE.toFixed(2)}`],
        ["Others (Custom Payment Modes)", `Rs. ${reconData.total.Others.toFixed(2)}`],
        ["TOTAL SALE FOR THE DAY", `Rs. ${totalSaleAmount.toFixed(2)}`],
        ["Total Logged Expenses", `- Rs. ${totalExpenses.toFixed(2)}`],
        ["TOTAL SALE VS EXPENSES (NET)", `Rs. ${netSaleVsExpenses.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        body: paymentSalesSummary,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
        },
        margin: { left: 110 }
      });

      // Verification Footers
      const lastY = (doc as any).lastAutoTable.finalY + 15;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, lastY, 195, lastY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("* Reconciled automatically under database-level atomicity. Signature marks required for cashier shifts.", 15, lastY + 4);

      // Output and open in a new tab (inline PDF viewer)
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (newWindow) {
        newWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (err) {
      if (newWindow) newWindow.close();
      console.error("PDF Generate error:", err);
      alert("Failed to build PDF. Please check console.");
    }
  };

  const generateMonthlyPaymentsPDFReport = async () => {
    const newWindow = openSecurePDFWindow();
    if (!property) {
      if (newWindow) newWindow.close();
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Filter payments strictly by selected business date
      const dayPayments = payments.filter(p => getPaymentDateStr(p) === selectedLedgerDate && !p.is_void);

      // Find monthly guest payments
      const monthlyPayments = dayPayments.filter(p => {
        const b = bookings.find(bk => bk.id === p.booking_id);
        return b && b.is_monthly === true;
      });

      let totalRent = 0;
      let totalDeposit = 0;
      let totalGrand = 0;

      const rows = monthlyPayments.map((p, idx) => {
        const b = bookings.find(bk => bk.id === p.booking_id);
        const guestName = b ? b.guest_name : 'Monthly Guest';
        const roomNum = b ? (rooms.find(r => r.id === b.room_id)?.room_number || 'N/A') : 'N/A';
        const amt = Number(p.amount);
        totalGrand += amt;

        // Classification
        let classification = "Monthly Rent";
        if (b) {
          const depositAmt = Number(b.amount || 0);
          const rentAmt = Number(b.monthly_rate || 0);
          if (amt === depositAmt) {
            classification = "Security Deposit";
            totalDeposit += amt;
          } else if (amt === rentAmt) {
            classification = "Monthly Rent";
            totalRent += amt;
          } else if (depositAmt > 0 && Math.abs(amt - depositAmt) < 0.01) {
            classification = "Security Deposit / Advance";
            totalDeposit += amt;
          } else if (amt < depositAmt && amt > 0) {
            classification = "Partial Deposit / Advance";
            totalDeposit += amt;
          } else if (amt < rentAmt && amt > 0) {
            classification = "Partial Monthly Rent";
            totalRent += amt;
          } else {
            classification = "Rent / Advance Payment";
            totalRent += amt;
          }
        } else {
          totalRent += amt;
        }

        return [
          idx + 1,
          roomNum,
          guestName,
          p.method,
          p.transaction_id || 'N/A',
          classification,
          `Rs. ${amt.toFixed(2)}`
        ];
      });

      if (rows.length === 0) {
        rows.push(["-", "-", "No monthly guest payments collected today.", "-", "-", "-", "Rs. 0.00"]);
      }

      // Luxury dark header block for Monthly Payments
      doc.setFillColor(30, 27, 75); // deep royal indigo
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("STAYSYNC PMS - MONTHLY PAYMENTS REGISTER", 15, 14);
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(199, 210, 254); // indigo-200
      doc.text(`PROPERTY: ${property?.name || 'StaySync Boutique Property'}`, 15, 22);
      doc.text(`BUSINESS DATE: ${formatFriendlyDate(selectedLedgerDate)}`, 15, 28);
      doc.text(`GENERATED ON: ${new Date().toLocaleString()}`, 135, 28);

      let currentY = 46;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("DAILY CO-LIVING RESIDENT PAYMENTS RECEIVED", 15, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        head: [["S.No", "Room", "Guest Name", "Payment Mode", "Transaction ID", "Classification", "Amount"]],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.2, font: 'helvetica' },
        headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontStyle: 'bold' }, // indigo-800
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { fontStyle: 'bold', cellWidth: 40 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'center', cellWidth: 30 },
          5: { halign: 'center', cellWidth: 38 },
          6: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
        }
      });

      const lastY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("MONTHLY GUEST REVENUE SUMMARY", 15, lastY);

      const summaryRows = [
        ["Total Security Deposit / Advance Collected", `Rs. ${totalDeposit.toFixed(2)}`],
        ["Total Monthly Rent Collected", `Rs. ${totalRent.toFixed(2)}`],
        ["GRAND TOTAL MONTHLY COLLECTIONS", `Rs. ${totalGrand.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: lastY + 3,
        body: summaryRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 100 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
        },
        margin: { left: 15 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, finalY, 195, finalY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("* Reconciled automatically. Monthly guest ledgers are mapped per contractual tenancy cycles.", 15, finalY + 4);

      // Output and open in a new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (newWindow) {
        newWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (err) {
      if (newWindow) newWindow.close();
      console.error("PDF Generate error:", err);
      alert("Failed to build PDF. Please check console.");
    }
  };

  const generateCentralPaymentsPDFReport = async () => {
    const newWindow = openSecurePDFWindow();
    if (!property) {
      if (newWindow) newWindow.close();
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Filter payments strictly by selected business date, excluding voided payments
      const dayPayments = payments.filter(p => getPaymentDateStr(p) === selectedLedgerDate && !p.is_void);

      let totalRegular = 0;
      let totalMonthlyRent = 0;
      let totalMonthlyDeposit = 0;
      let totalMonthlyTotal = 0;

      // Group payments into Transient and Monthly
      const transientPayments: any[] = [];
      const monthlyPayments: any[] = [];

      dayPayments.forEach(p => {
        const b = bookings.find(bk => bk.id === p.booking_id);
        const isMonthly = b ? b.is_monthly === true : false;
        const amt = Number(p.amount);

        if (isMonthly && b) {
          const depositAmt = Number(b.amount || 0);
          const rentAmt = Number(b.monthly_rate || 0);
          if (amt === depositAmt) {
            totalMonthlyDeposit += amt;
          } else if (amt === rentAmt) {
            totalMonthlyRent += amt;
          } else if (depositAmt > 0 && Math.abs(amt - depositAmt) < 0.01) {
            totalMonthlyDeposit += amt;
          } else if (amt < depositAmt && amt > 0) {
            totalMonthlyDeposit += amt;
          } else if (amt < rentAmt && amt > 0) {
            totalMonthlyRent += amt;
          } else {
            totalMonthlyRent += amt;
          }
          totalMonthlyTotal += amt;
          monthlyPayments.push(p);
        } else {
          totalRegular += amt;
          transientPayments.push(p);
        }
      });

      // UPI metrics calculations
      const dailyUPIPayments = transientPayments.filter(p => p.method === 'UPI');
      const dailyUPICount = dailyUPIPayments.length;
      const dailyUPISum = dailyUPIPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const monthlyUPIPayments = monthlyPayments.filter(p => p.method === 'UPI');
      const monthlyUPICount = monthlyUPIPayments.length;
      const monthlyUPISum = monthlyUPIPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const totalUPICount = dailyUPICount + monthlyUPICount;
      const totalUPISum = dailyUPISum + monthlyUPISum;

      // Luxury dark header block for Central Master Ledger
      doc.setFillColor(15, 23, 42); // slate-900 (highly professional)
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("STAYSYNC PMS - CENTRAL MASTER PAYMENTS LEDGER", 15, 14);
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`PROPERTY: ${property?.name || 'StaySync Boutique Property'}`, 15, 22);
      doc.text(`BUSINESS DATE: ${formatFriendlyDate(selectedLedgerDate)}`, 15, 28);
      doc.text(`GENERATED ON: ${new Date().toLocaleString()}`, 135, 28);

      let currentY = 46;

      // Section 1: Transient Daily Guest Payments
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("1. DAILY TRANSIENT GUEST PAYMENTS", 15, currentY);

      const transientRows = transientPayments.map((p, idx) => {
        const b = bookings.find(bk => bk.id === p.booking_id);
        const guestName = b ? b.guest_name : 'Walk-In Guest';
        const roomNum = b ? (rooms.find(r => r.id === b.room_id)?.room_number || 'N/A') : 'N/A';
        const amt = Number(p.amount);
        return [
          idx + 1,
          roomNum,
          guestName,
          p.method,
          p.transaction_id || 'N/A',
          "Base Rate / Incidentals",
          `Rs. ${amt.toFixed(2)}`
        ];
      });

      if (transientRows.length === 0) {
        transientRows.push(["-", "-", "No transient payments received today.", "-", "-", "-", "Rs. 0.00"]);
      }

      autoTable(doc, {
        startY: currentY + 3,
        head: [["S.No", "Room", "Guest Name", "Mode", "Transaction ID", "Classification", "Amount"]],
        body: transientRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { fontStyle: 'bold', cellWidth: 45 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 32 },
          5: { halign: 'center', cellWidth: 35 },
          6: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Section 2: Monthly Co-Living Guest Payments
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("2. MONTHLY CO-LIVING GUEST PAYMENTS", 15, currentY);

      const monthlyRows = monthlyPayments.map((p, idx) => {
        const b = bookings.find(bk => bk.id === p.booking_id);
        const guestName = b ? b.guest_name : 'Monthly Guest';
        const roomNum = b ? (rooms.find(r => r.id === b.room_id)?.room_number || 'N/A') : 'N/A';
        const amt = Number(p.amount);

        let classification = "Monthly Rent";
        if (b) {
          const depositAmt = Number(b.amount || 0);
          const rentAmt = Number(b.monthly_rate || 0);
          if (amt === depositAmt) {
            classification = "Security Deposit";
          } else if (amt === rentAmt) {
            classification = "Monthly Rent";
          } else if (depositAmt > 0 && Math.abs(amt - depositAmt) < 0.01) {
            classification = "Security Deposit / Advance";
          } else if (amt < depositAmt && amt > 0) {
            classification = "Partial Deposit / Advance";
          } else if (amt < rentAmt && amt > 0) {
            classification = "Partial Monthly Rent";
          } else {
            classification = "Rent / Advance Payment";
          }
        }

        return [
          idx + 1,
          roomNum,
          guestName,
          p.method,
          p.transaction_id || 'N/A',
          classification,
          `Rs. ${amt.toFixed(2)}`
        ];
      });

      if (monthlyRows.length === 0) {
        monthlyRows.push(["-", "-", "No monthly payments received today.", "-", "-", "-", "Rs. 0.00"]);
      }

      autoTable(doc, {
        startY: currentY + 3,
        head: [["S.No", "Room", "Guest Name", "Mode", "Transaction ID", "Classification", "Amount"]],
        body: monthlyRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { fontStyle: 'bold', cellWidth: 45 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 32 },
          5: { halign: 'center', cellWidth: 35 },
          6: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Section 3: UPI Payments and Tally Details
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("3. UPI TRANSACTIONS & TALLY DETAILS", 15, currentY);

      const upiPaymentsOnly = dayPayments.filter(p => p.method === 'UPI');
      const upiRows = upiPaymentsOnly.map((p, idx) => {
        const b = bookings.find(bk => bk.id === p.booking_id);
        const guestName = b ? b.guest_name : 'Guest';
        const roomNum = b ? (rooms.find(r => r.id === b.room_id)?.room_number || 'N/A') : 'N/A';
        const isMonthly = b ? b.is_monthly === true : false;
        const guestClass = isMonthly ? "Monthly" : "Daily Transient";
        const amt = Number(p.amount);
        return [
          idx + 1,
          roomNum,
          guestName,
          guestClass,
          p.transaction_id || 'N/A',
          `Rs. ${amt.toFixed(2)}`
        ];
      });

      if (upiRows.length === 0) {
        upiRows.push(["-", "-", "No UPI payments received today.", "-", "-", "Rs. 0.00"]);
      }

      autoTable(doc, {
        startY: currentY + 3,
        head: [["S.No", "Room", "Guest Name", "Guest Class", "UPI Transaction ID", "Amount"]],
        body: upiRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { fontStyle: 'bold', cellWidth: 45 },
          3: { halign: 'center', cellWidth: 35 },
          4: { halign: 'center', cellWidth: 45 },
          5: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
        }
      });

      const lastY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("REVENUE RECONCILIATION SUMMARY", 15, lastY);

      const summaryRows = [
        ["Total Regular Transient Collections (Daily Guest)", `Rs. ${totalRegular.toFixed(2)}`],
        ["Total Monthly Co-Living Rent Collected", `Rs. ${totalMonthlyRent.toFixed(2)}`],
        ["Total Monthly Co-Living Security Deposits Collected", `Rs. ${totalMonthlyDeposit.toFixed(2)}`],
        ["Total Monthly Co-Living Collections (Sub-Total)", `Rs. ${totalMonthlyTotal.toFixed(2)}`],
        ["GRAND TOTAL REVENUE COLLECTIONS (CONSOLIDATED)", `Rs. ${(totalRegular + totalMonthlyTotal).toFixed(2)}`],
        ["", ""], // spacer
        ["[TALLY] UPI TRANSIENT COLLECTIONS", `${dailyUPICount} Payment(s) - Rs. ${dailyUPISum.toFixed(2)}`],
        ["[TALLY] UPI MONTHLY COLLECTIONS", `${monthlyUPICount} Payment(s) - Rs. ${monthlyUPISum.toFixed(2)}`],
        ["[TALLY] GRAND TOTAL UPI COLLECTIONS", `${totalUPICount} Payment(s) - Rs. ${totalUPISum.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: lastY + 3,
        body: summaryRows,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 4, font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 110 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 65 }
        },
        margin: { left: 15 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, finalY, 195, finalY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("* Master unified ledger statement generated automatically from live transactions data under full integrity.", 15, finalY + 4);

      // Output and open in a new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (newWindow) {
        newWindow.location.href = pdfUrl;
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (err) {
      if (newWindow) newWindow.close();
      console.error("PDF Generate error:", err);
      alert("Failed to build PDF. Please check console.");
    }
  };

  const renderReportsView = () => {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-zinc-900/40 border border-white/[0.04] p-6 rounded-3xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Selected Ledger Date</span>
              <input 
                type="date"
                value={selectedLedgerDate}
                onChange={(e) => {
                  setSelectedLedgerDate(e.target.value);
                  setNewExpenseDate(e.target.value);
                }}
                className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer [color-scheme:dark] shadow-xl"
              />
            </div>
            <div className="mt-4 sm:mt-0 sm:pl-4 sm:border-l sm:border-white/10">
              <h3 className="text-sm font-bold text-white">Daily Ledger Reports</h3>
              <p className="text-xs text-zinc-500 mt-1">Review operational logs and generate export registers.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button
              onClick={() => generateHorizontalPDFReport('checkins')}
              className="flex-1 sm:flex-initial bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download size={14} />
              Check-Ins Report
            </button>
            <button
              onClick={() => generateHorizontalPDFReport('inhouse')}
              className="flex-1 sm:flex-initial bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download size={14} />
              In-House Report
            </button>
            <button
              onClick={() => generateHorizontalPDFReport('checkouts')}
              className="flex-1 sm:flex-initial bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download size={14} />
              Check-Outs Report
            </button>
            <button
              onClick={() => generateHorizontalPDFReport('pending')}
              className="flex-1 sm:flex-initial bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download size={14} />
              Dues Report
            </button>
            <button
              onClick={generateReconciliationPDFReport}
              className="w-full sm:w-auto bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/20 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <FileText size={14} />
              Shift Handover Report
            </button>
            <button
              onClick={generateNightAuditPDFReport}
              className="w-full sm:w-auto bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 border border-amber-500/20 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Moon size={14} />
              Night Audit Report
            </button>
            <button
              onClick={generateMonthlyPaymentsPDFReport}
              className="w-full sm:w-auto bg-indigo-500/10 hover:bg-indigo-500 hover:text-black text-indigo-400 border border-indigo-500/20 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Users size={14} />
              Monthly Payments Report
            </button>
            <button
              onClick={generateCentralPaymentsPDFReport}
              className="w-full sm:w-auto bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/20 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <ClipboardCheck size={14} />
              Central Payments Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderExpensesView = () => {
    const stats = getLedgerTotalsForDate(selectedLedgerDate);
    const dayExpenses = expenses.filter(e => e.date === selectedLedgerDate);
    const totalSales = stats.cashPayments + stats.upiPayments + stats.otherPayments;
    const totalExpensesSum = stats.cashExpenses + stats.upiExpenses;
    const netBalance = totalSales - totalExpensesSum;
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Date Selector Header for Expenses */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-zinc-900/40 border border-white/[0.04] p-6 rounded-3xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Selected Ledger Date</span>
              <input 
                type="date"
                value={selectedLedgerDate}
                onChange={(e) => {
                  setSelectedLedgerDate(e.target.value);
                  setNewExpenseDate(e.target.value);
                }}
                className="bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer [color-scheme:dark] shadow-xl"
              />
            </div>
            <div className="mt-4 sm:mt-0 sm:pl-4 sm:border-l sm:border-white/10">
              <h3 className="text-sm font-bold text-white">Daily Expenses & Cash Drawer</h3>
              <p className="text-xs text-zinc-500 mt-1">Log property expenditures and reconcile expected drawer cash vs float.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="bg-zinc-900/20 border border-white/[0.04] p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Opening Cash Balance</span>
              <Wallet className="text-zinc-500" size={16} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">₹{stats.openingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold">Counter starting float</p>
            </div>
            <div className="pt-2 flex gap-2">
              <input
                type="number"
                placeholder="Set starting..."
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <button
                onClick={handleSaveOpeningCash}
                disabled={isSavingExpense || !openingCashInput}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
              >
                Set
              </button>
            </div>
          </div>
          <div className="bg-zinc-900/20 border border-white/[0.04] p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Expected Drawer Cash</span>
              <Banknote className="text-emerald-400" size={16} />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-400">
                ₹{(stats.isClosed ? stats.actualClosingCash : stats.expectedClosingCash)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <div className="text-[9px] text-zinc-500 mt-1 uppercase font-bold space-y-0.5">
                <p>Opening: +₹{stats.openingCash.toFixed(2)}</p>
                <p>Collected: +₹{stats.cashPayments.toFixed(2)}</p>
                <p>Expenses: -₹{stats.cashExpenses.toFixed(2)}</p>
                {stats.isClosed && (
                  <>
                    <p className="text-rose-400/80">Handed Over: -₹{stats.handedOverCash.toFixed(2)}</p>
                    <p className="text-emerald-400 font-black">Remaining Float: ₹{stats.actualClosingCash?.toFixed(2)}</p>
                  </>
                )}
              </div>
            </div>
            <div className="pt-2">
              {!stats.isClosed ? (
                <button
                  onClick={() => {
                    setHandedOverCashInput('');
                    setIsCloseCashModalOpen(true);
                  }}
                  disabled={isSavingExpense}
                  className="w-full bg-emerald-600/10 hover:bg-emerald-600 hover:text-black border border-emerald-500/20 text-emerald-400 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Close Cash Balance
                </button>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 flex-1 text-center">
                    ✓ Closed: ₹{stats.actualClosingCash?.toFixed(2)}
                  </span>
                  <button
                    onClick={handleResetCloseCash}
                    disabled={isSavingExpense}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all"
                    title="Re-open cash drawer"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="bg-zinc-900/20 border border-white/[0.04] p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Income Collections</span>
              <DollarSign className="text-indigo-400" size={16} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <div className="text-[9px] text-zinc-500 mt-1 uppercase font-bold space-y-0.5">
                <p className="flex justify-between"><span>Cash Collected:</span><span className="text-zinc-400">₹{stats.cashPayments.toFixed(2)}</span></p>
                <p className="flex justify-between"><span>UPI Collected:</span><span className="text-zinc-400">₹{stats.upiPayments.toFixed(2)}</span></p>
                <p className="flex justify-between"><span>Other Methods:</span><span className="text-zinc-400">₹{stats.otherPayments.toFixed(2)}</span></p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/20 border border-white/[0.04] p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logged Expenses</span>
              <TrendingDown className="text-rose-400" size={16} />
            </div>
            <div>
              <p className="text-2xl font-black text-rose-400">₹{totalExpensesSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <div className="text-[9px] text-zinc-500 mt-1 uppercase font-bold space-y-0.5">
                <p className="flex justify-between"><span>Cash Spent:</span><span className="text-zinc-400">₹{stats.cashExpenses.toFixed(2)}</span></p>
                <p className="flex justify-between"><span>UPI Spent:</span><span className="text-zinc-400">₹{stats.upiExpenses.toFixed(2)}</span></p>
                <p className="flex justify-between"><span>Total Entries:</span><span className="text-zinc-400">{dayExpenses.length} bills</span></p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/20 border border-white/[0.04] p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                Sale vs Expenses Net
              </span>
              <Activity className={netBalance >= 0 ? "text-emerald-400" : "text-rose-400"} size={16} />
            </div>
            <div>
              <p className={`text-2xl font-black ${netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <div className="text-[9px] text-zinc-500 mt-1 uppercase font-bold space-y-0.5">
                <p className="flex justify-between"><span>Total Sales:</span><span className="text-zinc-400">₹{totalSales.toFixed(2)}</span></p>
                <p className="flex justify-between"><span>Total Expenses:</span><span className="text-zinc-400">₹{totalExpensesSum.toFixed(2)}</span></p>
                <p className="flex justify-between">
                  <span>Net Status:</span>
                  <span className={netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {netBalance >= 0 ? "SURPLUS" : "DEFICIT"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="bg-zinc-900/20 border border-white/[0.04] p-6 rounded-3xl space-y-6">
            <div className="border-b border-white/[0.04] pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-indigo-400" />
                Log New Expense
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Record an outgoing property payment here.</p>
            </div>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laundry powder, vegetables, plumber..."
                  value={newExpenseDescription}
                  onChange={(e) => setNewExpenseDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Category</label>
                  <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                  >
                    <option value="Food" className="bg-[#0c0c0e]">Food</option>
                    <option value="Utilities" className="bg-[#0c0c0e]">Utilities</option>
                    <option value="Laundry" className="bg-[#0c0c0e]">Laundry</option>
                    <option value="Maintenance" className="bg-[#0c0c0e]">Maintenance</option>
                    <option value="Staff" className="bg-[#0c0c0e]">Staff</option>
                    <option value="Refund" className="bg-[#0c0c0e]">Refund</option>
                    <option value="Others" className="bg-[#0c0c0e]">Others</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Payment Method</label>
                  <select
                    value={newExpensePaymentMethod}
                    onChange={(e) => setNewExpensePaymentMethod(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                  >
                    <option value="Cash" className="bg-[#0c0c0e]">Cash</option>
                    <option value="UPI" className="bg-[#0c0c0e]">UPI</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Qty</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newExpenseQuantity}
                    onChange={(e) => setNewExpenseQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Date</label>
                <input
                  type="date"
                  required
                  value={newExpenseDate}
                  onChange={(e) => setNewExpenseDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark] cursor-pointer"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingExpense}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isSavingExpense ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Log Expense
                  </>
                )}
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-zinc-900/20 border border-white/[0.04] p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingDown size={16} className="text-rose-400" />
                  Today&apos;s Expense Ledger
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Summary of payments logged for {formatFriendlyDate(selectedLedgerDate)}</p>
              </div>
              <span className="bg-zinc-800/80 border border-white/5 px-3 py-1 rounded-full text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                {dayExpenses.length} Records
              </span>
            </div>
            {dayExpenses.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500/40 mb-3" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No Expenses Logged For This Date</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <th className="py-3 px-2">Desc</th>
                      <th className="py-3 px-2">Cat</th>
                      <th className="py-3 px-2">Qty</th>
                      <th className="py-3 px-2">Method</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                      <th className="py-3 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-xs">
                    {dayExpenses.map((exp) => (
                      <tr key={exp.id} className="text-zinc-300 hover:text-white transition-colors">
                        <td className="py-3 px-2 font-medium">{exp.description}</td>
                        <td className="py-3 px-2">
                          <span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-400">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-zinc-500">{exp.quantity}x</td>
                        <td className="py-3 px-2 font-bold text-[10px] tracking-wider text-indigo-400">{exp.payment_method}</td>
                        <td className="py-3 px-2 text-right font-bold text-rose-400">
                          ₹{(Number(exp.amount) * Number(exp.quantity || 1)).toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            disabled={isSavingExpense}
                            className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Delete record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyCoLivingView = () => {
    const getRoomCapacity = (room: Room): number => {
      return (room as any).sharing_capacity || 2;
    };

    // Filter rooms that are allowed for monthly co-living
    const monthlyRooms = rooms.filter(
      r => r.allowed_billing_type === 'monthly'
    ).sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' }));

    // Apply text search filter if any
    const searchQueryLower = searchQuery.toLowerCase().trim();
    const filteredMonthlyRooms = searchQueryLower
      ? monthlyRooms.filter(r => {
          const roomMatch = r.room_number.toLowerCase().includes(searchQueryLower);
          const hasGuestMatch = bookings.some(b => 
            b.room_id === r.id && 
            b.is_monthly === true &&
            b.status !== 'Cancelled' && 
            b.status !== 'Checked Out' &&
            b.guest_name.toLowerCase().includes(searchQueryLower)
          );
          return roomMatch || hasGuestMatch;
        })
      : monthlyRooms;

    // Calculate quick stats
    let totalBeds = 0;
    let occupiedBeds = 0;
    let totalMonthlyDues = 0;

    monthlyRooms.forEach(room => {
      const cap = getRoomCapacity(room);
      totalBeds += cap;
      
      const activeRoomBookings = bookings.filter(b => 
        b.room_id === room.id && 
        b.is_monthly === true &&
        b.status !== 'Cancelled' && 
        b.status !== 'Checked Out'
      );
      occupiedBeds += activeRoomBookings.length;

      activeRoomBookings.forEach(booking => {
        const guestIncidentals = incidentals.filter(inc => inc.booking_id === booking.id);
        const guestPayments = payments.filter(p => p.booking_id === booking.id && !p.is_void);
         const totalCharged = Number(booking.monthly_rate || 0) + Number(booking.amount) + guestIncidentals.reduce((sum, inc) => sum + Number(inc.amount), 0);
        const totalPaid = guestPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const due = totalCharged - totalPaid;
        if (due > 0) {
          totalMonthlyDues += due;
        }
      });
    });

    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

    return (
      <div className="space-y-6">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/30 border border-white/[0.05] p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Co-Living Rooms</p>
              <h3 className="text-xl font-bold text-white mt-1">{monthlyRooms.length}</h3>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/[0.05] p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Occupied Beds</p>
              <h3 className="text-xl font-bold text-white mt-1">{occupiedBeds} <span className="text-xs text-zinc-500 font-normal">of {totalBeds}</span></h3>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/[0.05] p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bed size={22} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Vacant Beds</p>
              <h3 className="text-xl font-bold text-white mt-1">{vacantBeds} <span className="text-xs text-zinc-500 font-normal">available</span></h3>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/[0.05] p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-black text-base select-none">
              ₹
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Monthly Dues</p>
              <h3 className="text-xl font-bold text-white mt-1">₹{totalMonthlyDues.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </div>

        {/* SECTION HEADER & CONTROL */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 border border-white/[0.06] p-4 rounded-2xl">
          <div>
            <h2 className="text-md font-bold text-white">Monthly Co-Living Hub</h2>
            <p className="text-xs text-zinc-400 mt-1">Manage long-term, multi-sharing residents and billing cycles.</p>
          </div>
          <button
            onClick={() => {
              setSelectedCoLivingRoomId(undefined);
              setShowCoLivingModal(true);
            }}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs active:scale-95 shadow-lg shadow-indigo-500/10"
          >
            <UserPlus size={15} />
            Add Co-Living Guest
          </button>
        </div>

        {filteredMonthlyRooms.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <Home size={40} className="text-zinc-500/40 mx-auto mb-4" />
            <h3 className="text-white font-bold text-sm">No Co-Living Rooms Found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
              Ensure you designate rooms as <span className="text-indigo-400 font-bold">Monthly Only</span> or <span className="text-indigo-400 font-bold">Both (Daily/Monthly)</span> in the Room Inventory panel to see them listed here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMonthlyRooms.map(room => {
              const capacity = getRoomCapacity(room);
              const activeRoomBookings = bookings.filter(b => 
                b.room_id === room.id && 
                b.is_monthly === true &&
                b.status !== 'Cancelled' && 
                b.status !== 'Checked Out'
              );

              return (
                <div key={room.id} className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.15] rounded-3xl overflow-hidden transition-all shadow-xl flex flex-col">
                  {/* Room Card Title Header */}
                  <div className="p-5 border-b border-white/[0.05] bg-black/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm">
                        {room.room_number}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Room {room.room_number}</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{room.type} Class</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-zinc-400 font-bold uppercase tracking-wider">
                        {capacity}-Sharing
                      </span>
                      <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">
                        {activeRoomBookings.length} of {capacity} Occupied
                      </p>
                    </div>
                  </div>

                  {/* Bed Grid List */}
                  <div className="p-5 space-y-4 flex-1">
                    {Array.from({ length: capacity }).map((_, index) => {
                      const booking = activeRoomBookings[index];
                      const bedLetter = String.fromCharCode(65 + index); // Bed A, Bed B, Bed C

                      if (booking) {
                        // Compute dues for this specific guest
                        const guestIncidentals = incidentals.filter(inc => inc.booking_id === booking.id);
                        const guestPayments = payments.filter(p => p.booking_id === booking.id && !p.is_void);
                        
                        const totalCharged = Number(booking.monthly_rate || 0) + Number(booking.amount) + guestIncidentals.reduce((sum, inc) => sum + Number(inc.amount), 0);
                        const totalPaid = guestPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                        const balanceDue = totalCharged - totalPaid;

                        return (
                          <div key={booking.id} className="p-4 bg-zinc-900/50 border border-white/[0.05] rounded-2xl space-y-3 relative overflow-hidden">
                            {/* Bed Identifier Indicator */}
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20">
                                  Bed {bedLetter} &bull; Occupied
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                balanceDue > 0.01 
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {balanceDue > 0.01 ? `₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Due` : 'No Dues'}
                              </span>
                            </div>
 
                            {/* Resident Info Details */}
                            <div className="space-y-1">
                              <h5 className="text-sm font-bold text-white flex items-center gap-2">
                                <User size={14} className="text-indigo-400" />
                                {booking.guest_name}
                              </h5>
                              <div className="text-xs text-zinc-500 space-y-0.5 pl-5">
                                {booking.guest_phone && <p className="flex items-center gap-1.5"><Phone size={11} /> {booking.guest_phone}</p>}
                                {booking.guest_email && <p className="flex items-center gap-1.5"><Mail size={11} /> {booking.guest_email}</p>}
                                <p className="flex items-center gap-1.5"><Calendar size={11} /> Joined: {new Date(booking.check_in).toLocaleDateString()}</p>
                              </div>
                            </div>
 
                            {/* Rent/Cycle/Advance Info */}
                            <div className="grid grid-cols-2 gap-2 bg-black/30 border border-white/[0.03] p-2.5 rounded-xl text-[10px] text-zinc-400 font-bold">
                              <div>
                                <span className="text-zinc-500 font-normal">Monthly Rent:</span>
                                <p className="text-white font-mono mt-0.5">₹{(booking.monthly_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500 font-normal">Cycle Day:</span>
                                <p className="text-white font-mono mt-0.5">{booking.billing_cycle_date || 'N/A'}th / Month</p>
                              </div>
                              <div className="mt-1.5">
                                <span className="text-zinc-500 font-normal">Security Deposit:</span>
                                <p className="text-white font-mono mt-0.5">₹{Number(booking.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              </div>
                              <div className="mt-1.5">
                                <span className="text-zinc-500 font-normal">Total Paid:</span>
                                <p className="text-white font-mono mt-0.5">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
 
                            {/* Guest Payments List */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider pl-1">Payment Ledger / History</span>
                              {guestPayments.length === 0 ? (
                                <p className="text-[10px] text-zinc-600 pl-1 italic">No payments recorded yet.</p>
                              ) : (
                                <div className="space-y-1 max-h-20 overflow-y-auto no-scrollbar bg-black/10 rounded-lg p-1.5 border border-white/[0.02]">
                                  {guestPayments.map((p, idx) => (
                                    <div key={p.id || idx} className="flex justify-between items-center text-[9px] text-zinc-400 bg-white/[0.01] px-1.5 py-1 rounded">
                                      <span>{new Date(p.created_at || p.payment_date || Date.now()).toLocaleDateString()} ({p.payment_method || 'UPI'})</span>
                                      <span className="font-mono text-emerald-400 font-bold">₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
 
                            {/* Collect Rent / Ledger action */}
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setActiveCheckoutBooking({
                                    bookingId: booking.id,
                                    roomId: booking.room_id,
                                    guestName: booking.guest_name,
                                    amount: booking.amount
                                  });
                                }}
                                className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1"
                              >
                                <Banknote size={11} />
                                Collect Payment
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                }}
                                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                              >
                                Options
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={`vacant-${index}`} className="p-4 border border-dashed border-white/10 bg-white/[0.01] rounded-2xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <Bed size={15} />
                              </div>
                              <div>
                                <span className="bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/5">
                                  Bed {bedLetter} &bull; Vacant
                                </span>
                                <h5 className="text-[11px] font-bold text-zinc-400 mt-0.5">Vacant Space Available</h5>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedCoLivingRoomId(room.id);
                                setShowCoLivingModal(true);
                              }}
                              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1 active:scale-95"
                            >
                              <Plus size={11} />
                              Assign Guest
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderBalancesView = () => {
    // Filter bookings based on selected balancesFilter (In-House Only or All Active)
    let filteredBookings = bookings.filter(b => !b.is_monthly);
    
    if (balancesFilter === 'inHouse') {
      filteredBookings = filteredBookings.filter(b => b.status === 'Checked In');
    } else {
      // All active includes Checked In and Confirmed (excluding Checked Out and Cancelled)
      filteredBookings = filteredBookings.filter(b => b.status === 'Checked In' || b.status === 'Confirmed');
    }

    // Apply text search if any
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      filteredBookings = filteredBookings.filter(b => {
        const roomNum = rooms.find(r => r.id === b.room_id)?.room_number || '';
        const nameMatch = b.guest_name ? b.guest_name.toLowerCase().includes(lowerQuery) : false;
        const roomMatch = roomNum.toLowerCase() === lowerQuery;
        return nameMatch || roomMatch;
      });
    }

    // Map to calculated balances and sort room-wise
    const rawBalanceItems = filteredBookings.map(booking => {
      const room = rooms.find(r => r.id === booking.room_id);
      const roomNum = room?.room_number || 'N/A';
      
      const bookingIncidentals = incidentals.filter(i => i.booking_id === booking.id);
      const bookingPayments = payments.filter(p => p.booking_id === booking.id && !p.is_void);

      const dailyRoomChargesSum = bookingIncidentals
        .filter(item => item.description?.startsWith('Daily Room Charge'))
        .reduce((sum, item) => sum + Number(item.amount), 0);

      const roomAmount = booking.is_monthly
        ? Number(booking.monthly_rate || 0)
        : Math.max(0, Number(booking.amount) - dailyRoomChargesSum);
      const incidentalsAmount = bookingIncidentals.reduce((sum, item) => sum + Number(item.amount), 0) + (booking.is_monthly ? Number(booking.amount) : 0);
      const totalCharges = roomAmount + incidentalsAmount;
      const totalPaid = bookingPayments.reduce((sum, item) => sum + Number(item.amount), 0);
      const balanceDue = totalCharges - totalPaid;

      // Classify room charges vs food & water charges
      const roomChargesTotal = roomAmount + bookingIncidentals
        .filter(inc => isRoomRelatedCharge(inc.description || ''))
        .reduce((sum, inc) => sum + Number(inc.amount), 0);

      const foodChargesTotal = bookingIncidentals
        .filter(inc => !isRoomRelatedCharge(inc.description || ''))
        .reduce((sum, inc) => sum + Number(inc.amount), 0);

      // Payments cover food & water first
      const foodPending = Math.max(0, foodChargesTotal - totalPaid);
      const roomPending = Math.max(0, balanceDue - foodPending);

      return {
        booking,
        roomNum,
        roomType: room?.type || 'N/A',
        roomAmount,
        incidentalsAmount,
        roomChargesTotal,
        foodChargesTotal,
        foodPending,
        roomPending,
        totalCharges,
        totalPaid,
        balanceDue
      };
    });

    const outstandingCount = rawBalanceItems.filter(item => item.balanceDue > 0.01).length;

    const balanceItems = (hidePaidGuests 
      ? rawBalanceItems.filter(item => item.balanceDue > 0.01)
      : rawBalanceItems
    ).sort((a, b) => {
      return a.roomNum.localeCompare(b.roomNum, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
      <div className="space-y-6">
        {/* Balances Sub-Header Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-zinc-900/40 border border-white/[0.06] p-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-wrap w-full lg:w-auto">
            {/* Show Dues Group */}
            <div className="flex flex-col gap-1.5 flex-1 sm:flex-none">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Show Dues:</span>
              <div className="grid grid-cols-2 bg-black/40 border border-white/10 p-0.5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setBalancesFilter('inHouse')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center shrink-0 ${
                    balancesFilter === 'inHouse'
                      ? 'bg-[#4f46e5] text-white shadow-lg shadow-[#4f46e5]/10'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  In-House
                </button>
                <button
                  onClick={() => setBalancesFilter('allActive')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center shrink-0 ${
                    balancesFilter === 'allActive'
                      ? 'bg-[#4f46e5] text-white shadow-lg shadow-[#4f46e5]/10'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  All Active
                </button>
              </div>
            </div>

            {/* Filter Group */}
            <div className="flex flex-col gap-1.5 flex-1 sm:flex-none sm:border-l sm:border-white/10 sm:pl-4">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Filter:</span>
              <div className="grid grid-cols-2 bg-black/40 border border-white/10 p-0.5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setHidePaidGuests(true)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    hidePaidGuests
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-lg'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${hidePaidGuests ? 'bg-rose-400 animate-pulse' : 'bg-zinc-500'}`} />
                  Dues ({outstandingCount})
                </button>
                <button
                  onClick={() => setHidePaidGuests(false)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    !hidePaidGuests
                      ? 'bg-emerald-500/10 text-[#10b981] border border-emerald-500/20 shadow-lg'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${!hidePaidGuests ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  All ({rawBalanceItems.length})
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-right lg:text-left self-end lg:self-auto">
            Showing <span className="text-white font-black">{balanceItems.length}</span> rooms with active folios
          </div>
        </div>

        {balanceItems.length === 0 ? (
          <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <CheckCircle2 size={40} className="text-emerald-500/40 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Outstanding Balances Found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-[#0a0a0c]/60 border border-white/[0.04] rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40 border-b border-white/[0.06] text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <th className="p-4 pl-6">Room / Sl No</th>
                      <th className="p-4">Guest Details</th>
                      <th className="p-4 text-right">ROOM Charges (Pending)</th>
                      <th className="p-4 text-right">Food & Water (Pending)</th>
                      <th className="p-4 text-right">Total Charges</th>
                      <th className="p-4 text-right text-emerald-400">Total Paid</th>
                      <th className="p-4 text-right text-rose-400 font-bold bg-rose-500/5">Balance Due</th>
                      <th className="p-4 pr-6 text-center">Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {balanceItems.map(({ booking, roomNum, roomType, roomAmount, incidentalsAmount, roomChargesTotal, foodChargesTotal, foodPending, roomPending, totalCharges, totalPaid, balanceDue }) => {
                      const hasDues = balanceDue > 0.01;
                      return (
                        <tr key={booking.id} className="hover:bg-white/[0.01] transition-colors">
                          {/* Room Number / Serial */}
                          <td className="p-4 pl-6 align-middle">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black text-white bg-white/5 px-2.5 py-1 rounded-lg w-fit">
                                Room {roomNum}
                              </span>
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider pl-0.5">
                                {roomType}
                              </span>
                            </div>
                          </td>

                          {/* Guest details */}
                          <td className="p-4 align-middle">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => openActionDrawer(booking)}>
                                {booking.guest_name}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  booking.status === 'Checked In' 
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                  {booking.status}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  {booking.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* ROOM Charges (Pending) */}
                          <td className="p-4 text-right align-middle font-semibold text-zinc-300">
                            ₹{roomPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Food & Water (Pending) */}
                          <td className="p-4 text-right align-middle font-semibold text-zinc-400">
                            ₹{foodPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Total Charges */}
                          <td className="p-4 text-right align-middle font-bold text-white">
                            ₹{totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Total Paid */}
                          <td className="p-4 text-right align-middle font-bold text-emerald-400">
                            ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Balance Due */}
                          <td className="p-4 text-right align-middle bg-rose-500/[0.01]">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-base font-black ${hasDues ? 'text-rose-400 font-mono shadow-sm' : 'text-zinc-600 font-mono'}`}>
                                ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {hasDues ? (
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  Outstanding
                                </span>
                              ) : (
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  Paid in Full
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action buttons */}
                          <td className="p-4 pr-6 text-center align-middle">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCheckoutBooking({
                                  bookingId: booking.id,
                                  roomId: booking.room_id,
                                  guestName: booking.guest_name,
                                  amount: Number(booking.amount)
                                });
                              }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                hasDues
                                  ? 'bg-[#4f46e5] text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/10'
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                              }`}
                            >
                              Open Folio
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card Grid View */}
            <div className="block md:hidden space-y-4">
              {balanceItems.map(({ booking, roomNum, roomType, roomAmount, incidentalsAmount, roomChargesTotal, foodChargesTotal, foodPending, roomPending, totalCharges, totalPaid, balanceDue }) => {
                const hasDues = balanceDue > 0.01;
                return (
                  <div key={booking.id} className="bg-zinc-900/40 border border-white/[0.06] rounded-2xl p-4 space-y-4">
                    {/* Header: Room & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white bg-white/5 px-2.5 py-1 rounded-lg w-fit">
                          Room {roomNum}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1 pl-0.5">
                          {roomType}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${
                        booking.status === 'Checked In' 
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    {/* Guest Details */}
                    <div className="border-t border-white/[0.04] pt-3">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Guest Details</p>
                      <p className="text-sm font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => openActionDrawer(booking)}>
                        {booking.guest_name}
                      </p>
                      <p className="text-[9px] text-zinc-600 mt-0.5">Booking ID: {booking.id.slice(0, 8)}</p>
                    </div>

                    {/* Charges Breakdown */}
                    <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                      <div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Room Pending</p>
                        <p className="text-xs font-semibold text-zinc-300 mt-0.5">
                          ₹{roomPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Food Pending</p>
                        <p className="text-xs font-semibold text-zinc-400 mt-0.5">
                          ₹{foodPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="border-t border-white/[0.04] pt-2 mt-1">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Total Charges</p>
                        <p className="text-xs font-bold text-white mt-0.5">
                          ₹{totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="border-t border-white/[0.04] pt-2 mt-1">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider text-emerald-400">Total Paid</p>
                        <p className="text-xs font-bold text-emerald-400 mt-0.5">
                          ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Balance Due & Action */}
                    <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Balance Due</span>
                        <span className={`text-sm font-black font-mono mt-0.5 ${hasDues ? 'text-rose-400' : 'text-zinc-600'}`}>
                          ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCheckoutBooking({
                            bookingId: booking.id,
                            roomId: booking.room_id,
                            guestName: booking.guest_name,
                            amount: Number(booking.amount)
                          });
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          hasDues
                            ? 'bg-[#4f46e5] text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/10'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        Open Folio
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex min-h-screen bg-[#08080a] items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-[#08080a] font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* SIDEBAR (Unified) */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl shrink-0">
        <div className="p-6 pb-4 relative">
          <div className="flex items-center gap-3 p-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-[13px] font-bold text-white truncate max-w-[130px]">{property?.name || 'Loading...'}</h1>
              <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Operational Unit</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {NAV_ITEMS.map((item) => {
            const locked = !hasAccess(item.module);
            const isItemActive = item.label === "Daily Reports" 
              ? activeTab === 'reports' 
              : (item.label === "Front Office" ? activeTab !== 'reports' : item.active);
            return (
              <Link
                key={item.label}
                href={locked ? "#" : item.href}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    alert(`Access Restricted: The ${item.label} module requires higher authorization.`);
                  } else if (item.label === "Daily Reports") {
                    e.preventDefault();
                    setActiveTab('reports');
                  } else if (item.label === "Front Office" && activeTab === 'reports') {
                    setActiveTab('tape');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  isItemActive ? 'bg-white/[0.06] text-white' : locked ? 'text-zinc-700' : 'text-zinc-500 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <item.icon size={17} />
                <span className="flex-1">{item.label}</span>
                {locked && <Lock size={12} />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="p-4 md:p-8 border-b border-white/[0.04] bg-[#08080a] flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            {activeTab === 'reports' ? (
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                  <FileText className="text-indigo-400" />
                  Daily Reports Terminal
                </h2>
                <p className="text-zinc-500 text-xs sm:text-sm mt-1">Audit operations and generate export registers</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                  <Activity className="text-emerald-400" />
                  Front Office Terminal
                </h2>
                <p className="text-zinc-500 text-xs sm:text-sm mt-1">Real-time availability and guest management</p>
              </div>
            )}
            
            {activeTab !== 'reports' && canCreateBooking() && (
              <button 
                onClick={() => setShowBookingModal(true)}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 text-xs sm:text-sm"
              >
                <Plus size={18} />
                New Walk-In
              </button>
            )}
          </div>

          {/* TAB SYSTEM */}
          {activeTab !== 'reports' && (
            <div className="flex flex-col w-full gap-6">
              {/* Mobile Dropdown Tab Selector */}
              <div className="block md:hidden w-full relative">
                <select
                  value={activeTab}
                  onChange={(e) => {
                    setActiveTab(e.target.value as 'tape' | 'arrivals' | 'departures' | 'house' | 'all' | 'balances' | 'expenses' | 'monthly' | 'reports');
                  setSearchQuery('');
                }}
                className="w-full appearance-none bg-zinc-900 border border-white/10 rounded-2xl py-3.5 pl-4 pr-12 text-xs text-white font-bold uppercase tracking-wider focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-zinc-800 transition-all shadow-xl active:scale-[0.99]"
              >
                <option value="tape" className="bg-[#0c0c0e] text-white">📅 Tape Chart</option>
                <option value="arrivals" className="bg-[#0c0c0e] text-white">👤 Arrivals Today ({getArrivalsToday().length})</option>
                <option value="departures" className="bg-[#0c0c0e] text-white">🚪 Departures Today</option>
                <option value="house" className="bg-[#0c0c0e] text-white">🛏️ In-House ({bookings.filter(b => b.status === 'Checked In' && !b.is_monthly).length} Occupied)</option>
                <option value="balances" className="bg-[#0c0c0e] text-white">💵 Pending Payments</option>
                <option value="expenses" className="bg-[#0c0c0e] text-white">💸 Expenses & Cash Ledger</option>
                <option value="all" className="bg-[#0c0c0e] text-white">🔍 Reservations</option>
                <option value="monthly" className="bg-[#0c0c0e] text-white">🏢 Monthly Co-Living Hub</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronsUpDown size={14} />
              </div>
            </div>

            {/* Desktop Row Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar scroll-smooth">
              {[
                { id: 'tape', label: 'Tape Chart', icon: Calendar },
                { id: 'arrivals', label: 'Arrivals Today', icon: UserCheck },
                { id: 'departures', label: 'Departures Today', icon: LogOut },
                { id: 'house', label: 'In-House', icon: Bed },
                { id: 'balances', label: 'Pending Payments', icon: DollarSign },
                { id: 'expenses', label: 'Expenses & Cash', icon: TrendingDown },
                { id: 'all', label: 'Reservations', icon: Search },
                { id: 'monthly', label: 'Monthly Co-Living', icon: Home },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery(''); // Clear search when switching tabs
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                    activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                  {tab.id === 'arrivals' && getArrivalsToday().length > 0 && <span className="ml-1 bg-white text-indigo-600 px-1.5 py-0.5 rounded-md text-[9px]">{getArrivalsToday().length}</span>}
                  {tab.id === 'house' && bookings.filter(b => b.status === 'Checked In' && !b.is_monthly).length > 0 && <span className="ml-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[9px]">{bookings.filter(b => b.status === 'Checked In' && !b.is_monthly).length}</span>}
                </button>
              ))}
            </div>

            
            {/* TAPE CHART DATE FILTER */}
            {activeTab === 'tape' && (
              <div className="flex items-center justify-end gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Base Date</span>
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-transparent text-xs text-white font-bold focus:outline-none [color-scheme:dark] cursor-pointer"
                  />
                </div>

                {(filterStartDate || filterEndDate) && (
                  <button 
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                    }}
                    className="p-2 text-zinc-500 hover:text-rose-400 bg-zinc-800 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all"
                    title="Clear Date Filters"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            )}

            {/* UNIFIED SEARCH CONTROL FOR LIST TABS */}
            {(activeTab === 'arrivals' || activeTab === 'departures' || activeTab === 'house' || activeTab === 'balances') && (
              <div className="flex items-center justify-end gap-3 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search room number or guest..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-2 text-zinc-500 hover:text-rose-400 bg-zinc-800 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all"
                    title="Clear Search"
                  >
                    <XCircle size={14} />
                  </button>
                )}

                {/* IN-HOUSE DATE RANGE CONTROLS */}
                {activeTab === 'house' && (
                  <>
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">From</span>
                      <input 
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="bg-transparent text-xs text-white font-bold focus:outline-none [color-scheme:dark] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">To</span>
                      <input 
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="bg-transparent text-xs text-white font-bold focus:outline-none [color-scheme:dark] cursor-pointer"
                      />
                    </div>

                    {(filterStartDate || filterEndDate) && (
                      <button 
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="p-2 text-zinc-500 hover:text-rose-400 bg-zinc-800 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all"
                        title="Clear Date Filters"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* RESERVATIONS MASTER CONTROLS */}
            {activeTab === 'all' && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select 
                    value={reservationFilter}
                    onChange={(e) => setReservationFilter(e.target.value)}
                    className="appearance-none bg-zinc-800 border border-white/20 rounded-xl py-2 pl-4 pr-10 text-xs text-white font-bold focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-zinc-700 transition-colors"
                  >
                    <option value="Confirmed">Upcoming (Confirmed)</option>
                    <option value="Checked In">In-House</option>
                    <option value="Past">Past (Checked Out/Cancelled)</option>
                    <option value="All">View Everything</option>
                  </select>
                  <ChevronsUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                
                {/* INJECTED DATE PICKERS */}
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-1 focus-within:border-indigo-500/50">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">From</span>
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-transparent text-xs text-white font-bold focus:outline-none [color-scheme:dark] cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-indigo-500/50 transition-colors">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">To</span>
                  <input 
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-transparent text-xs text-white font-bold focus:outline-none [color-scheme:dark] cursor-pointer"
                  />
                </div>
                
                {/* CLEAR BUTTON */}
                {(searchQuery || filterStartDate || filterEndDate || reservationFilter !== 'Confirmed') && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setReservationFilter('Confirmed');
                    }}
                    className="p-2 text-zinc-500 hover:text-rose-400 bg-zinc-800 hover:bg-rose-500/10 border border-white/5 rounded-xl transition-all"
                    title="Clear All Filters"
                  >
                    <XCircle size={14} />
                  </button>
                )}
                
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search guest or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>
            )}

          </div>
          )}
        </header>

        <div className="flex-1 p-4 md:p-8 pb-28 lg:pb-8 overflow-auto">
          {activeTab === 'tape' ? (
            <div className="bg-zinc-900/30 rounded-2xl border border-white/[0.06] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-white/[0.06]">
                    <th className="p-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest border-r border-white/5 sticky left-0 bg-[#09090b] z-20">Room</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest border-r border-white/5 min-w-[140px]">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.filter(room => room.allowed_billing_type !== 'monthly').map((room) => {
                    const booking = getBookingForRoom(room.id);
                    return (
                      <tr key={room.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-4 border-r border-white/5 sticky left-0 bg-[#09090b] z-10 min-w-[120px] align-top">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                {canBlockRoom() ? (
                                  <button
                                    onClick={() => handleBlockRoom(room)}
                                    disabled={actionLoading}
                                    className={`text-sm font-bold transition-colors ${room.status === 'Blocked' ? 'text-red-500 hover:text-red-400' : 'text-white hover:text-zinc-300'} disabled:opacity-50`}
                                  >                                    {room.room_number}
                                  </button>
                                ) : (
                                  <p className={`text-sm font-bold ${room.status === 'Blocked' ? 'text-red-500' : 'text-white'}`}>
                                    {room.room_number}
                                  </p>
                                )}
                              </div>
                              
                              {/* Housekeeping Badges (Requested Colors) */}
                              <div className="flex flex-col gap-1 items-start">
                                {(() => {
                                  const s = getTrueRoomStatus(room)?.toLowerCase();
                                  if (['available', 'clean', 'ready'].includes(s || '')) return <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.4)]">Clean</span>;
                                  if (['dirty', 'cleaning'].includes(s || '')) return <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.4)]">Dirty</span>;
                                  if (s === 'blocked') return <span className="bg-red-600 text-white px-2 py-0.5 rounded flex items-center gap-1 text-[9px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]"><Lock size={10}/> Maint</span>;
                                  if (s === 'occupied') return <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(99,102,241,0.4)]">Occupied</span>;
                                  return null;
                                })()}
                              </div>
                              <p className="text-[10px] text-zinc-500 uppercase font-medium">{room.type}</p>
                            </div>
                          </td>
                        {DAYS.map((_, idx) => (
                          <td key={idx} className="p-2 border-r border-white/5 relative h-20">
                            {booking && idx === 0 ? (
                              <motion.div 
                                layoutId={booking.id}
                                onClick={() => openActionDrawer(booking)}
                                className={`absolute inset-y-2 left-2 right-[-240px] rounded-xl border p-3 flex items-center justify-between z-20 shadow-2xl cursor-pointer hover:border-indigo-400/50 transition-colors ${
                                  booking.is_monthly
                                    ? 'bg-indigo-500/10 border-indigo-500/30'
                                    : booking.status === 'Confirmed'
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-emerald-500/10 border-emerald-500/30'
                                }`}
                              >
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center gap-2">
                                    <UserCheck size={14} className={booking.status === 'Confirmed' ? 'text-amber-400' : 'text-emerald-400'} />
                                    <span className="text-[12px] font-bold text-white">{booking.guest_name}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      booking.is_monthly
                                        ? 'bg-indigo-500/25 text-indigo-400 border border-indigo-500/20'
                                        : booking.status === 'Confirmed'
                                        ? 'bg-amber-500/20 text-amber-500'
                                        : 'bg-emerald-500/20 text-emerald-500'
                                    }`}>
                                      {booking.is_monthly ? `Monthly • ${booking.status}` : booking.status}
                                    </span>
                                    
                                    <div className="flex gap-2">
                                      {booking.status === 'Confirmed' && (
                                        canCheckIn() ? (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); openActionDrawer(booking); }}
                                            className="bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold px-3 py-1 rounded-lg transition-all"
                                          >
                                            Start Check-In
                                          </button>
                                        ) : (
                                          <button disabled className="bg-zinc-800 text-zinc-600 text-[9px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 cursor-not-allowed">
                                            <Lock size={10} /> Check In
                                          </button>
                                        )
                                      )}
                                      {booking.status === 'Checked In' && (
                                        canCheckOut() ? (
                                          <button 
                                            onClick={(e) => handleSafeCheckOut(e, booking.id, room.id)}
                                            className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold px-3 py-1 rounded-lg transition-all"
                                          >
                                            Check Out
                                          </button>
                                        ) : (
                                          <button disabled className="bg-zinc-800 text-zinc-600 text-[9px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 cursor-not-allowed">
                                            <Lock size={10} /> Check Out
                                          </button>
                                        )
                                      )}
                                    </div>                                  </div>
                                </div>
                              </motion.div>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4 pb-20">
              {activeTab === 'arrivals' && (
                getArrivalsToday().length === 0 ? (
                  <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <CheckCircle2 size={40} className="text-emerald-500/40 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Arrivals Remaining Today</p>
                  </div>
                ) : getArrivalsToday().map(b => <BookingRow key={b.id} booking={b} />)
              )}
              {activeTab === 'departures' && (
                getDeparturesToday().length === 0 ? (
                  <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <LogOut size={40} className="text-indigo-500/40 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Departures Scheduled Today</p>
                  </div>
                ) : getDeparturesToday().map(b => <BookingRow key={b.id} booking={b} />)
              )}
              {activeTab === 'house' && (
                <>
                  <div className="mb-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-emerald-500/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                        <Bed size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">In-House Overview</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Real-time room occupancy report</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg sm:text-xl font-black text-emerald-400 tracking-tighter">
                        {bookings.filter(b => b.status === 'Checked In' && !b.is_monthly).length} Rooms Occupied
                      </span>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">out of {rooms.filter(room => room.allowed_billing_type !== 'monthly').length} total rooms</p>
                    </div>
                  </div>

                  {getInHouse().length === 0 ? (
                    <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                      <Bed size={40} className="text-amber-500/40 mx-auto mb-4" />
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Guests Currently In-House</p>
                    </div>
                  ) : getInHouse().map(b => <BookingRow key={b.id} booking={b} />)}
                </>
              )}
              {activeTab === 'all' && (
                getAllReservations().length === 0 ? (
                  <div className="py-40 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <Search size={40} className="text-zinc-500/40 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Reservations Found</p>
                  </div>
                ) : getAllReservations().map(b => <BookingRow key={b.id} booking={b} />)
              )}
              {activeTab === 'balances' && renderBalancesView()}
              {activeTab === 'expenses' && renderExpensesView()}
              {activeTab === 'monthly' && renderMonthlyCoLivingView()}
              {activeTab === 'reports' && renderReportsView()}
            </div>
          )}
        </div>
      </main>

      {/* ACTION DRAWER */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0a0a0c] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06] bg-zinc-900/40 backdrop-blur-md flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserCheck className="text-indigo-400" size={20} />
                    {selectedBooking.guest_name}
                  </h2>
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mt-1 mb-2">
                    {calculateNights(selectedBooking.check_in, selectedBooking.check_out)} Nights &bull; {selectedBooking.check_in} to {selectedBooking.check_out}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    {selectedBooking.guest_phone && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <Phone size={12} className="text-zinc-500" />
                        {selectedBooking.guest_phone}
                      </span>
                    )}
                    {selectedBooking.guest_email && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <Mail size={12} className="text-zinc-500" />
                        {selectedBooking.guest_email}
                      </span>
                    )}
                  </div>


                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={refreshBookingStatus}
                    disabled={actionLoading}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-indigo-400 transition-all disabled:opacity-50"
                    title="Refresh Status"
                  >
                    <RefreshCw size={16} className={actionLoading ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setSelectedBooking(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Physical Check-In / Out Timestamps */}
                {(selectedBooking.check_in_time || selectedBooking.check_out_time) && (
                  <div className="space-y-3 pb-6 border-b border-white/[0.04]">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} className="text-indigo-400" /> Physical Timestamps
                    </h3>
                    <div className="bg-black/40 border border-white/[0.04] rounded-2xl p-4 space-y-3">
                      {selectedBooking.check_in_time && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <span className="text-zinc-500">Actual Check-In:</span>
                            {!isEditingCheckInTime ? (
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold normal-case">
                                  {new Date(selectedBooking.check_in_time).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempCheckInTime(toLocalDatetimeString(selectedBooking.check_in_time));
                                    setIsEditingCheckInTime(true);
                                  }}
                                  className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline capitalize text-[10px]"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="datetime-local"
                                  value={tempCheckInTime}
                                  onChange={(e) => setTempCheckInTime(e.target.value)}
                                  className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!tempCheckInTime) return;
                                    setActionLoading(true);
                                    try {
                                      const utcIsoString = new Date(tempCheckInTime).toISOString();
                                      const res = await updateCheckInTime(selectedBooking.id, utcIsoString);
                                      if (res.error) {
                                        alert(res.error);
                                      } else {
                                        setSelectedBooking(prev => prev ? { ...prev, check_in_time: utcIsoString } : null);
                                        loadDashboardData();
                                        setIsEditingCheckInTime(false);
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert("Invalid date format.");
                                    } finally {
                                      setActionLoading(false);
                                    }
                                  }}
                                  disabled={actionLoading}
                                  className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline disabled:opacity-50 text-[10px]"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingCheckInTime(false)}
                                  disabled={actionLoading}
                                  className="text-zinc-500 hover:text-zinc-400 font-bold hover:underline disabled:opacity-50 text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedBooking.check_out_time && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          <span className="text-zinc-500">Actual Check-Out:</span>
                          <span className="text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded-md font-bold normal-case">
                            {new Date(selectedBooking.check_out_time).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 0. BILLING & FOLIO LEDGER (For Checked In and Checked Out guests) */}
                {(selectedBooking.status === 'Checked In' || selectedBooking.status === 'Checked Out') && (
                  <div className="space-y-3 pb-6 border-b border-white/[0.04]">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign size={14} /> Billing & Folio Ledger
                    </h3>
                    <div className="bg-black/40 border border-white/[0.04] rounded-2xl p-4 space-y-4">
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Manage guest billing, record cash or UPI payments, and view detailed folio summaries.
                      </p>
                      
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.02] space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">
                              {selectedBooking.is_monthly ? 'Monthly Room Rent' : 'Base Room Rate'}
                            </span>
                            <span className="text-xs text-zinc-400 mt-0.5 font-medium block">Accommodation charges</span>
                          </div>
                          <span className="text-sm font-black text-white font-mono">
                            ₹{Number(selectedBooking.is_monthly ? selectedBooking.monthly_rate : selectedBooking.amount).toFixed(2)}
                          </span>
                        </div>
                        {selectedBooking.is_monthly && Number(selectedBooking.amount) > 0 && (
                          <div className="pt-2 border-t border-white/[0.02] flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Security Deposit / Advance</span>
                              <span className="text-xs text-zinc-400 mt-0.5 font-medium block">Refundable deposit</span>
                            </div>
                            <span className="text-sm font-black text-white font-mono">
                              ₹{Number(selectedBooking.amount).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCheckoutBooking({
                            bookingId: selectedBooking.id,
                            roomId: selectedBooking.room_id,
                            guestName: selectedBooking.guest_name,
                            amount: Number(selectedBooking.amount)
                          });
                        }}
                        className="w-full bg-emerald-600/10 hover:bg-emerald-600 hover:text-black text-emerald-400 border border-emerald-500/20 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        <Banknote size={16} /> Open Folio & Log Payment
                      </button>
                    </div>
                  </div>
                )}

                {/* 0. CHECK-IN REQUIREMENTS (Only for Confirmed guests) */}
                {selectedBooking.status === 'Confirmed' && (
                  <div className="space-y-3 pb-6 border-b border-white/[0.04]">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <ClipboardCheck size={14} /> Check-In Requirements
                    </h3>
                    <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-white/[0.04]">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkIdVerified} onChange={e => setCheckIdVerified(e.target.checked)} />
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Verify Guest Identity (Aadhar/Passport)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkRegCardSigned} onChange={e => setCheckRegCardSigned(e.target.checked)} />
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Sign Digital RegCard & Terms</span>
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkPaymentSecured} onChange={e => setCheckPaymentSecured(e.target.checked)} />
                          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Verify / Collect Check-In Payment</span>
                        </label>
                        
                        <AnimatePresence>
                          {checkPaymentSecured && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-zinc-900/60 p-4 rounded-xl border border-white/[0.04] space-y-4 ml-7">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-zinc-400">Record Payment in Ledger?</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={checkInPaymentRecorded} 
                                      onChange={(e) => setCheckInPaymentRecorded(e.target.checked)} 
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                                    <span className="ml-2 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{checkInPaymentRecorded ? 'Yes' : 'No'}</span>
                                  </label>
                                </div>

                                {checkInPaymentRecorded ? (
                                  <div className="space-y-3.5">
                                    {/* Amount Input */}
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Payment Amount (₹)</label>
                                      <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">₹</span>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          value={checkInPaymentAmount}
                                          onChange={(e) => setCheckInPaymentAmount(e.target.value)}
                                          placeholder="0.00"
                                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-7 pr-3 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition-all"
                                        />
                                      </div>
                                    </div>

                                    {/* Payment Method Quick Selector */}
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Payment Method</label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          { id: 'Cash', label: 'Cash', icon: Banknote },
                                          { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                                          { id: 'Credit Card', label: 'Card', icon: CreditCard },
                                          { id: 'Bank Transfer', label: 'Transfer', icon: Building2 },
                                        ].map((method) => {
                                          const Icon = method.icon;
                                          const isSelected = checkInPaymentMethod === method.id;
                                          return (
                                            <button
                                              key={method.id}
                                              type="button"
                                              onClick={() => setCheckInPaymentMethod(method.id as any)}
                                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                isSelected 
                                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                                  : 'bg-black/20 text-zinc-400 border-white/5 hover:bg-white/5 hover:text-white'
                                              }`}
                                            >
                                              <Icon size={14} className={isSelected ? 'text-emerald-400' : 'text-zinc-500'} />
                                              {method.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <p className="text-[9px] text-zinc-500 italic mt-1.5 pl-0.5 leading-relaxed">
                                        💡 For combination payments (e.g. Cash + UPI), complete check-in without recording a payment here, then log each payment separately in the Billing/Folio modal.
                                      </p>
                                    </div>

                                    {/* Transaction ID */}
                                    {checkInPaymentMethod !== 'Cash' && (
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Transaction ID (Optional)</label>
                                        <input 
                                          type="text"
                                          value={checkInPaymentTxnId}
                                          onChange={(e) => setCheckInPaymentTxnId(e.target.value)}
                                          placeholder="e.g. UPI / Ref number"
                                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition-all"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                                    No payment will be logged during check-in. The full balance of <span className="font-mono not-italic text-zinc-400 font-bold">₹{Number(selectedBooking.amount).toFixed(2)}</span> will remain outstanding as Balance Due, and must be settled before checkout.
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded bg-black border-white/20 accent-amber-500" checked={checkFormFDone} onChange={e => setCheckFormFDone(e.target.checked)} />
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Capture Form F (Home Address)</span>
                      </label>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">Guest Home Address</label>
                        <textarea 
                          value={guestAddress}
                          onChange={(e) => setGuestAddress(e.target.value)}
                          placeholder="Full address for police records..."
                          className="w-full h-16 bg-black/40 border border-white/[0.06] text-xs text-zinc-300 rounded-xl p-3 focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                      </div>

                    </div>

                    
                    
                  </div>
                )}

                {/* 1. GUEST NOTES */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> Guest Notes
                  </h3>
                  <div className="bg-black/40 border border-white/[0.04] rounded-xl p-2 focus-within:border-indigo-500/50 transition-colors">
                    <textarea 
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      disabled={!canWriteNotes() || actionLoading}
                      placeholder="Add dietary requirements, late arrival notes, etc..."
                      className="w-full h-24 bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 resize-none focus:outline-none p-2 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveNotes}
                      disabled={!canWriteNotes() || actionLoading || notesInput === (selectedBooking.notes || "")}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Save Notes"}
                    </button>
                  </div>
                </div>

                {/* 1. GUEST IDENTITY (The Magic Link) */}
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} className="text-indigo-400" /> Guest Identity
                    </h3>
                    {selectedBooking.id_verified ? (
                      <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1">
                        <AlertCircle size={12} /> Pending
                      </span>
                    )}
                  </div>

                  {!selectedBooking.id_verified ? (
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl space-y-3 relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="direct-id-capture-input" 
                        className="hidden" 
                        onChange={handleDirectCameraCapture} 
                      />

                      <p className="text-[11px] text-zinc-500">
                        Select an action below to capture guest identity and sign registration forms instantly.
                      </p>
                      
                      <div className="relative">
                        <button 
                          onClick={() => setIsIdentityMenuOpen(!isIdentityMenuOpen)}
                          className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider text-white flex items-center justify-between transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-indigo-400" />
                            Select Capture Option...
                          </span>
                          <ChevronsUpDown size={14} className="text-zinc-500" />
                        </button>

                        {isIdentityMenuOpen && (
                          <>
                            {/* Invisible background overlay to handle dismiss clicking outside */}
                            <div className="fixed inset-0 z-10" onClick={() => setIsIdentityMenuOpen(false)} />
                            
                            <div className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 divide-y divide-white/[0.04]">
                              <button 
                                onClick={() => {
                                  setIsIdentityMenuOpen(false);
                                  document.getElementById('direct-id-capture-input')?.click();
                                }}
                                className="w-full hover:bg-zinc-900/60 px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-zinc-300 hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Camera size={14} className="text-emerald-400" />
                                <div>
                                  <p>Open Camera / Gallery</p>
                                  <p className="text-[8.5px] text-zinc-500 font-normal normal-case mt-0.5">Take photo or browse from gallery</p>
                                </div>
                              </button>

                              <button 
                                onClick={() => {
                                  setIsIdentityMenuOpen(false);
                                  const url = window.location.origin + "/guest/regcard/" + selectedBooking.id;
                                  navigator.clipboard.writeText(url);
                                  alert("Magic Link copied to clipboard! Send this to the guest via WhatsApp/SMS.");
                                }}
                                className="w-full hover:bg-zinc-900/60 px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-zinc-300 hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Link2 size={14} className="text-indigo-400" />
                                <div>
                                  <p>Copy Magic Link</p>
                                  <p className="text-[8.5px] text-zinc-500 font-normal normal-case mt-0.5">Copy guest link to share on WhatsApp</p>
                                </div>
                              </button>

                              <button 
                                onClick={() => {
                                  setIsIdentityMenuOpen(false);
                                  const url = window.location.origin + "/guest/regcard/" + selectedBooking.id;
                                  window.open(url, "_blank");
                                }}
                                className="w-full hover:bg-zinc-900/60 px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-zinc-300 hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Smartphone size={14} className="text-indigo-400" />
                                <div>
                                  <p>Open Self Check-In Terminal</p>
                                  <p className="text-[8.5px] text-zinc-500 font-normal normal-case mt-0.5">Open guest-facing form in a new tab</p>
                                </div>
                              </button>

                              <button 
                                onClick={() => {
                                  setIsIdentityMenuOpen(false);
                                  setShowQrCode(true);
                                }}
                                className="w-full hover:bg-zinc-900/60 px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-zinc-300 hover:text-white flex items-center gap-2.5 transition-colors"
                              >
                                <Smartphone size={14} className="text-amber-400" />
                                <div>
                                  <p>QR Code Scan</p>
                                  <p className="text-[8.5px] text-zinc-500 font-normal normal-case mt-0.5">Show QR on screen for guest to scan</p>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      
                      <div className="flex justify-end mb-1">
                        <button 
                          onClick={handleRetakeIdentity}
                          disabled={actionLoading}
                          className="text-[9px] font-black text-rose-500 hover:text-rose-400 uppercase flex items-center gap-1 transition-colors px-2 py-1 rounded bg-rose-500/5 hover:bg-rose-500/10"
                        >
                          <RotateCcw size={10} /> Retake / Void
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="aspect-[3/2] bg-black/40 border border-white/5 rounded-xl overflow-hidden relative group flex items-center justify-center">
                           {selectedBooking.id_photo_url ? (
                             <Image 
                               src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guest-ids/${selectedBooking.id_photo_url}`} 
                               alt="Guest ID Scan" 
                               fill 
                               className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                             />
                           ) : (
                             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-wider text-center px-2">No Image File</span>
                           )}
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <p className="text-[8px] font-black text-white/40 uppercase tracking-tighter drop-shadow-md">Guest ID Scan</p>
                           </div>
                        </div>
                        <div className="aspect-[3/2] bg-white rounded-xl overflow-hidden relative flex items-center justify-center p-2">
                           {selectedBooking.signature_url && <Image src={selectedBooking.signature_url} alt="Signature" fill className="object-contain" />}
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open("/guest/print-regcard/" + selectedBooking.id, "_blank")}
                        className="w-full bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        <Printer size={16} /> Print Official Form F / RegCard
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. ROOM UPGRADE */}
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRightLeft size={14} /> Room Move / Upgrade
                  </h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Moving this guest will instantly mark Room {rooms.find(r => r.id === selectedBooking.room_id)?.room_number} as &quot;Dirty&quot; and assign them to the new room.
                  </p>
                  <div className="flex items-center gap-3">
                    <select 
                      value={upgradeRoomId}
                      onChange={(e) => setUpgradeRoomId(e.target.value)}
                      disabled={!canUpgrade() || actionLoading}
                      className="flex-1 bg-black/40 border border-white/[0.06] text-sm text-zinc-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 appearance-none"
                    >
                      <option value="">Select Available Room...</option>
                      {rooms.filter(r => r.status === "Available" && r.id !== selectedBooking.room_id).map(r => (
                        <option key={r.id} value={r.id}>Room {r.room_number} ({r.type})</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleExecuteUpgrade}
                      disabled={!canUpgrade() || actionLoading || !upgradeRoomId}
                      className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      Execute Move
                    </button>
                  </div>
                  {!canUpgrade() && <p className="text-[10px] text-rose-500 flex items-center gap-1"><Lock size={10} /> You do not have permission to process room moves.</p>}
                </div>

                {/* 3. REFUND FOLIO */}
                <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> Refund Folio
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <span className="text-xs font-bold text-zinc-400">Total Collected</span>
                    <span className="text-sm font-black text-white">₹{selectedBooking.amount}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
                      <input 
                        type="number"
                        value={refundInput}
                        onChange={(e) => setRefundInput(e.target.value)}
                        disabled={!canRefund() || actionLoading}
                        placeholder="Amount to refund"
                        className="w-full bg-black/40 border border-white/[0.06] text-sm text-zinc-300 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:border-rose-500/50 disabled:opacity-50"
                      />
                    </div>
                    <button 
                      onClick={handleProcessRefund}
                      disabled={!canRefund() || actionLoading || !refundInput}
                      className="bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      Issue Refund
                    </button>
                  </div>
                  {!canRefund() && <p className="text-[10px] text-rose-500 flex items-center gap-1"><Lock size={10} /> You do not have permission to issue refunds.</p>}
                </div>


                {/* 3.5 FINAL ACTION */}
                {selectedBooking.status === 'Confirmed' && (
                  <div className="pt-4">
                    <button
                      onClick={(e) => handleSafeCheckIn(e as unknown as React.MouseEvent, selectedBooking.id)}
                      disabled={!checkIdVerified || !checkRegCardSigned || !checkPaymentSecured || actionLoading || !canCheckIn()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3"
                    >                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Complete Final Check-In</>}
                    </button>
                    {!canCheckIn() && <p className="text-[10px] text-rose-500 mt-2 text-center">Unauthorized to finalize check-in.</p>}
                  </div>
                )}

                {/* 4. DANGER ZONE */}
                <div className="pt-6 border-t border-rose-500/20">
                  <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Trash2 size={14} /> Danger Zone
                  </h3>
                  <button 
                    onClick={handleCancelBooking}
                    disabled={!canCancel() || actionLoading}
                    className="w-full bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Cancel Reservation"}
                  </button>
                  {!canCancel() && <p className="text-[10px] text-rose-500 mt-2 flex items-center gap-1 justify-center"><Lock size={10} /> Cancellation restricted by your access level.</p>}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {isCloseCashModalOpen && (() => {
        const stats = getLedgerTotalsForDate(selectedLedgerDate);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Banknote className="text-emerald-400" size={20} />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Close Cash Counter</h3>
                </div>
                <button 
                  onClick={() => setIsCloseCashModalOpen(false)} 
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Ledger Summary */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Expected Drawer Summary</span>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Starting Opening Cash:</span>
                      <span className="font-semibold">₹{stats.openingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>(+) Cash Payments Collected:</span>
                      <span className="font-semibold">₹{stats.cashPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-400">
                      <span>(-) Cash Expenses Paid:</span>
                      <span className="font-semibold">₹{stats.cashExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-bold text-white">
                      <span>Expected Closing Balance:</span>
                      <span>₹{stats.expectedClosingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Handover Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex justify-between">
                    <span>Handover to Finance Dept</span>
                    <span className="text-emerald-400">Expected: ₹{stats.expectedClosingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-zinc-500 text-xs">₹</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={stats.expectedClosingCash}
                      placeholder="Enter amount handed over to finance..."
                      value={handedOverCashInput}
                      onChange={(e) => setHandedOverCashInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <p className="text-[9px] text-zinc-500 uppercase font-semibold">
                    Specify how much physical cash is handed over to the finance team. The rest remains in the counter drawer.
                  </p>
                </div>

                {/* Calculated Float Remaining */}
                {(() => {
                  const handoverValue = parseFloat(handedOverCashInput) || 0;
                  const remainingFloat = Math.max(0, stats.expectedClosingCash - handoverValue);
                  const isOverLimit = handoverValue > stats.expectedClosingCash;
                  const isNegative = handoverValue < 0;
                  const isInvalid = isOverLimit || isNegative;

                  return (
                    <div className="space-y-4">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Remaining Counter Float</span>
                          <span className="text-[10px] text-zinc-400">To be carried forward as opening cash</span>
                        </div>
                        <span className={`text-lg font-black ${isInvalid ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ₹{remainingFloat.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {isOverLimit && (
                        <div className="flex items-center gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-xs">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>Handover amount cannot exceed the expected drawer cash!</span>
                        </div>
                      )}

                      {isNegative && (
                        <div className="flex items-center gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-xs">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>Handover amount cannot be negative!</span>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setIsCloseCashModalOpen(false)}
                          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 text-white py-3 rounded-2xl text-xs font-bold transition-all uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (isInvalid) return;
                            setIsCloseCashModalOpen(false);
                            await handleCloseCash(remainingFloat, handoverValue);
                          }}
                          disabled={isSavingExpense || isInvalid}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-black py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-wider"
                        >
                          {isSavingExpense ? "Closing..." : "Confirm & Close"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        );
      })()}

      {showWebcamModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/[0.06] flex justify-between items-center bg-zinc-900/50">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Camera className="text-indigo-400 animate-pulse" size={16} /> Live ID Card Capture
                </h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Align the guest ID within the frame and capture</p>
              </div>
              <button 
                onClick={stopWebcam} 
                className="p-2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Camera Frame Container */}
            <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Overlay HUD guides */}
              <div className="absolute inset-0 border-[24px] border-black/60 pointer-events-none flex items-center justify-center">
                {/* ID scanning guide boundary */}
                <div className="w-[85%] h-[75%] border-2 border-dashed border-indigo-400/50 rounded-2xl relative flex items-center justify-center">
                  {/* Subtle corners */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-1.5 -ml-1.5 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-1.5 -mr-1.5 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-1.5 -ml-1.5 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-1.5 -mr-1.5 rounded-br-lg" />
                  
                  {/* Glowing center indicator */}
                  <span className="text-[9px] font-black text-indigo-400/80 bg-black/60 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                    Place ID Card Here
                  </span>
                </div>
              </div>
            </div>

            {/* Footer and controls */}
            <div className="p-6 bg-zinc-900/50 border-t border-white/[0.06] flex items-center justify-between">
              <button
                onClick={stopWebcam}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={captureSnapshot}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} />
                    <span>Capture Photo</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showBookingModal && (
        <BookingModal 
          isOpen={showBookingModal} 
          onClose={() => setShowBookingModal(false)}
          propertyId={property?.id || ''} 
          rooms={rooms}
          bookings={bookings}
          businessDate={businessDate}
        />
      )}

      {showCoLivingModal && (
        <CoLivingBookingModal 
          isOpen={showCoLivingModal} 
          onClose={() => {
            setShowCoLivingModal(false);
            setSelectedCoLivingRoomId(undefined);
          }}
          propertyId={property?.id || ''} 
          rooms={rooms}
          bookings={bookings}
          defaultRoomId={selectedCoLivingRoomId}
          businessDate={businessDate}
        />
      )}

      {showQrCode && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-8 text-center"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Phone Scanner Link</h3>
              <button onClick={() => setShowQrCode(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-3xl inline-block mb-6 shadow-xl shadow-indigo-500/10">
              <QRCodeSVG 
                value={window.location.origin + "/guest/regcard/" + selectedBooking.id} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Point your phone camera at this screen to open the <span className="text-indigo-400 font-bold">Identity Capture Terminal</span> for {selectedBooking.guest_name}.
            </p>

            <div className="flex items-center justify-center gap-3 py-3 px-4 bg-white/5 rounded-2xl border border-white/5">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Waiting for phone sync...</span>
            </div>
          </motion.div>
        </div>
      )}

      {activeCheckoutBooking && property?.id && (
        <FolioModal
          bookingId={activeCheckoutBooking.bookingId}
          propertyId={property.id}
          guestName={activeCheckoutBooking.guestName}
          roomId={activeCheckoutBooking.roomId}
          roomNumber={rooms.find(r => r.id === activeCheckoutBooking.roomId)?.room_number || ''}
          baseAmount={activeCheckoutBooking.amount}
          onClose={() => {
            setActiveCheckoutBooking(null);
            loadDashboardData();
          }}
          onSuccess={() => {
            setActiveCheckoutBooking(null);
            loadDashboardData();
          }}
        />
      )}

      {activeBlockRoom && (
        <RoomBlockModal
          room={activeBlockRoom}
          onClose={() => setActiveBlockRoom(null)}
          onSuccess={() => {
            setActiveBlockRoom(null);
            loadDashboardData();
          }}
        />
      )}
      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-40 bg-[#0a0a0c]/85 backdrop-blur-xl border-t border-white/[0.05] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around py-2 px-1 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const locked = !hasAccess(item.module);
            const isItemActive = item.label === "Daily Reports" 
              ? activeTab === 'reports' 
              : (item.label === "Front Office" ? activeTab !== 'reports' : item.active);
            return (
              <Link
                key={item.label}
                href={locked ? "#" : item.href}
                onClick={(e) => {
                  if (locked) {
                    e.preventDefault();
                    alert(`Access Restricted: The ${item.label} module requires higher authorization.`);
                  } else if (item.label === "Daily Reports") {
                    e.preventDefault();
                    setActiveTab('reports');
                  } else if (item.label === "Front Office" && activeTab === 'reports') {
                    setActiveTab('tape');
                  }
                }}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-300 ${
                  isItemActive 
                    ? 'text-indigo-400 font-bold' 
                    : locked 
                      ? 'text-zinc-800' 
                      : 'text-zinc-500 active:text-zinc-200'
                }`}
              >
                <item.icon size={18} className={isItemActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} />
                <span className="text-[9px] uppercase tracking-wider font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
