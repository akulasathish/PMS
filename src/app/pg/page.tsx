"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Wifi, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  Utensils, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  Clock, 
  Play, 
  Camera, 
  X, 
  Coffee,
  Check,
  Send,
  User,
  ArrowRight,
  Salad
} from 'lucide-react';

export default function PgPublicPage() {
  const [activeSharingFilter, setActiveSharingFilter] = useState<string>('all');
  
  // Visit Modal States
  const [showVisitModal, setShowVisitModal] = useState<boolean>(false);
  const [selectedRoomForVisit, setSelectedRoomForVisit] = useState<string>('2-Sharing Room');
  const [visitName, setVisitName] = useState('');
  const [visitPhone, setVisitPhone] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitSubmitted, setVisitSubmitted] = useState(false);

  // WhatsApp Quick Modal States
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [tenantName, setTenantName] = useState('');
  const [targetRoomName, setTargetRoomName] = useState('');

  // Contact details
  const contactPhone = "8686113435";

  const openWhatsAppModal = (roomTitle?: string) => {
    setTargetRoomName(roomTitle || '');
    setShowWhatsAppModal(true);
  };

  const handleWhatsAppRedirect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = tenantName.trim();
    let message = '';

    if (name) {
      if (targetRoomName) {
        message = `Hello! My name is ${name}. I am interested in the ${targetRoomName} at StaySync Premium Men's PG. Please share the pricing and availability.`;
      } else {
        message = `Hello! My name is ${name}. I am interested in StaySync Premium Men's PG. Please share room sharing options and pricing.`;
      }
    } else {
      if (targetRoomName) {
        message = `Hello! I would like to check the price and availability for ${targetRoomName} at StaySync Premium Men's PG.\n\nMy name is: `;
      } else {
        message = `Hello! I am interested in StaySync Premium Men's PG. Please share room details and pricing.\n\nMy name is: `;
      }
    }

    window.open(`https://wa.me/918686113435?text=${encodeURIComponent(message)}`, '_blank');
    setShowWhatsAppModal(false);
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVisitSubmitted(true);
    const name = visitName.trim() || 'Prospective Tenant';
    const message = `Hello! My name is ${name}.\nI would like to schedule a visit to StaySync Premium Men's PG.\n\n👤 Name: ${visitName}\n📞 Phone: ${visitPhone}\n🛏️ Sharing Preference: ${selectedRoomForVisit}\n📅 Preferred Date: ${visitDate}`;
    window.open(`https://wa.me/918686113435?text=${encodeURIComponent(message)}`, '_blank');
  };

  // User-specified features for ALL sharings:
  const commonFeatures = [
    '24/7 Power backup included',
    'Attached western washroom',
    'Individual lockable cupboards',
    'High-speed Wi-Fi hotspot in room',
    'Regular daily housekeeping',
    'Full access to 3-time meals & laundry',
    'CCTV security'
  ];

  const sharingRooms = [
    {
      id: 'room-2-share',
      sharing: 2,
      title: 'Premium 2-Sharing Room',
      subtitle: 'Spacious & Comfortable with Personal Wardrobes',
      type: 'AC & Non-AC Available',
      bedsAvailable: 'Available Now',
      features: commonFeatures,
      tag: 'Most Popular'
    },
    {
      id: 'room-3-share',
      sharing: 3,
      title: 'Premium 3-Sharing Room',
      subtitle: 'Well-ventilated with dedicated storage space',
      type: 'AC & Non-AC Available',
      bedsAvailable: 'Filling Fast',
      features: commonFeatures,
      tag: 'Best Value'
    },
    {
      id: 'room-4-share',
      sharing: 4,
      title: 'Executive 4-Sharing Room',
      subtitle: 'Cost-effective stay for working professionals & students',
      type: 'AC & Non-AC Available',
      bedsAvailable: 'Available',
      features: commonFeatures,
      tag: 'Budget Friendly'
    },
    {
      id: 'room-5-share',
      sharing: 5,
      title: 'Economy 5-Sharing Room',
      subtitle: 'Maximum savings with all premium food & amenities included',
      type: 'Non-AC Available',
      bedsAvailable: 'Limited Beds',
      features: commonFeatures,
      tag: 'Super Saver'
    }
  ];

  const filteredRooms = sharingRooms.filter(room => {
    if (activeSharingFilter !== 'all' && room.sharing.toString() !== activeSharingFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050507] text-zinc-100 selection:bg-emerald-500/30 font-sans antialiased">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-black to-emerald-950/80 border-b border-emerald-500/20 py-2.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-xs sm:text-sm font-semibold text-emerald-400">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Premium Men&apos;s PG Accommodation | 3-Time Homestyle Meals (Separate Veg Cooking) | Zero Hidden Charges</span>
        </div>
      </div>

      {/* 2. FLOATING BLACK NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#070709]/95 backdrop-blur-md border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <Link href="/pg" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-xl bg-black border border-white/10 p-1.5 flex items-center justify-center shadow-lg shadow-emerald-900/20 group-hover:border-emerald-500/50 transition-all">
              <img src="/logo.png" alt="StaySync Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                StaySync <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Men&apos;s PG</span>
              </div>
              <p className="text-[11px] font-medium text-zinc-400 tracking-wide uppercase">Premium Men&apos;s PG</p>
            </div>
          </Link>

          {/* Nav Links Desktop */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#rooms" className="hover:text-white transition-colors">Rooms & Sharing</a>
            <a href="#food" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-emerald-400" /> Food Menu
            </a>
            <a href="#amenities" className="hover:text-white transition-colors">Amenities</a>
            <a href="#video-tour" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400" /> Video Tour
            </a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>

          {/* Quick Contact Actions */}
          <div className="flex items-center gap-3">
            <a 
              href={`tel:${contactPhone}`} 
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Call Us</span>
            </a>

            <button 
              onClick={() => openWhatsAppModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black text-xs font-black shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            >
              <MessageSquare className="w-4 h-4 fill-black" />
              <span>WhatsApp</span>
            </button>

            <button 
              onClick={() => setShowVisitModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 hidden md:block"
            >
              Book a Visit
            </button>
          </div>
        </div>
      </nav>

      {/* 3. HERO SECTION */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 overflow-hidden border-b border-white/[0.06]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Exclusively For Men • Premium Paying Guest Accommodation
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
            StaySync Premium Men&apos;s PG. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-teal-400">Delicious Food. Zero Stress.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 mb-10 leading-relaxed">
            High-speed Wi-Fi, 3x non-repetitive homestyle meals, daily housekeeping, 24/7 power backup, and complete living comfort.
          </p>

          {/* Highlights Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto mb-12">
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-emerald-400">Pure Veg</span>
              <span className="text-xs font-medium text-zinc-400 mt-1">Paneer / Mushroom Cooked Separately</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white">3 Times</span>
              <span className="text-xs font-medium text-zinc-400 mt-1">Delicious Daily Meals</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-emerald-400">2x Chicken</span>
              <span className="text-xs font-medium text-zinc-400 mt-1">+ 3x Eggs Per Week</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white">24/7</span>
              <span className="text-xs font-medium text-zinc-400 mt-1">Power Backup & CCTV</span>
            </div>
          </div>

          {/* Main Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => setShowVisitModal(true)}
              className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <Calendar className="w-5 h-5 text-black" />
              <span>Schedule a Free Visit</span>
            </button>
            <button 
              onClick={() => openWhatsAppModal()}
              className="px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white font-bold text-sm sm:text-base transition-all flex items-center gap-2.5"
            >
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
              <span>Get Pricing on WhatsApp</span>
            </button>
          </div>

        </div>
      </section>

      {/* 4. ROOMS & SHARING SECTION (2, 3, 4, 5 SHARING) */}
      <section id="rooms" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-b border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Room Choices & Availability</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Available Sharing Options</h2>
            <p className="text-sm text-zinc-400 mt-2">2, 3, 4 & 5-sharing rooms with attached western washrooms, 24/7 power backup, and high-speed Wi-Fi.</p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-black p-1.5 rounded-2xl border border-white/10">
            {['all', '2', '3', '4', '5'].map((sh) => (
              <button
                key={sh}
                onClick={() => setActiveSharingFilter(sh)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSharingFilter === sh 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {sh === 'all' ? 'All Sharing' : `${sh}-Sharing`}
              </button>
            ))}
          </div>
        </div>

        {/* Room Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredRooms.map((room) => (
            <div 
              key={room.id}
              className="bg-black/80 rounded-3xl border border-white/[0.08] hover:border-emerald-500/40 transition-all overflow-hidden flex flex-col justify-between group shadow-xl"
            >
              <div>
                {/* Photo Placeholder / Image Space */}
                <div className="relative h-48 bg-zinc-900 border-b border-white/[0.08] overflow-hidden flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-400">{room.title}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Room Photos Coming Soon</span>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white">
                    {room.sharing}-Sharing
                  </div>

                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[10px] font-extrabold uppercase tracking-wide">
                    {room.tag}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-black text-white">{room.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{room.subtitle}</p>

                  {/* Room Type & Status */}
                  <div className="mt-4 p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Room Type:</span>
                      <span className="font-bold text-emerald-400">{room.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                      <span className="text-zinc-400">Status:</span>
                      <span className="font-semibold text-white">{room.bedsAvailable}</span>
                    </div>
                  </div>

                  {/* Standardized Features (Common for all sharings) */}
                  <div className="mt-4 space-y-2">
                    {room.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="p-5 pt-0 mt-4 border-t border-white/5 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedRoomForVisit(`${room.sharing}-Sharing Room`);
                    setShowVisitModal(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white text-xs font-bold transition-all text-center"
                >
                  Schedule Visit
                </button>
                <button
                  onClick={() => openWhatsAppModal(room.title)}
                  className="py-2.5 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                  title="Inquire on WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Price</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* 5. FOOD MENU & CATERING HIGHLIGHT */}
      <section id="food" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-b border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
              <Utensils className="w-3.5 h-3.5" />
              Nutritious & Delicious Food
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              3 Times Homestyle Food with Non-Repetitive Curries
            </h2>
            <p className="text-zinc-400 mt-4 text-sm sm:text-base leading-relaxed">
              We know good food is essential for your workday. Our dedicated chefs prepare hygienic, non-repetitive meals every single day with separate cooking for vegetarians.
            </p>

            <div className="mt-8 space-y-4">
              {/* Chicken Highlight */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">2 Times Chicken Per Week</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Special chicken curry & biryani made fresh for meat lovers.</p>
                </div>
              </div>

              {/* Egg Highlight */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Coffee className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">3 Times Egg Curries / Boiled Eggs</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">High-protein nutrition prepared 3 times every week.</p>
                </div>
              </div>

              {/* Separate Vegetarian Cooking Highlight */}
              <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Salad className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <span>Separate Veg Cooking: Paneer / Mushroom</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">100% Pure Veg</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Paneer and Mushroom dishes are cooked completely separately in dedicated utensils for vegetarians.</p>
                </div>
              </div>

              {/* Non-Repetitive Curries */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Non-Repetitive Daily Curries</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Rotating weekly menu of North & South Indian dishes with hot rotis and rice.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Schedule Card */}
          <div className="lg:col-span-7 bg-black rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-white">Daily Dining Schedule</h3>
                <p className="text-xs text-zinc-400">Prepared fresh in our commercial hygienic kitchen</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">Included Free</span>
            </div>

            <div className="space-y-4">
              {/* Breakfast without tea or vada, with poha & bonda */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Breakfast (7:30 AM - 10:00 AM)</span>
                  <span className="text-xs text-zinc-400">Daily Fresh</span>
                </div>
                <p className="text-sm font-semibold text-white mt-1">Idli, Dosa, Puri, Upma, Poha, Mysore Bonda with Hot Sambar & 2 Chutneys</p>
              </div>

              {/* Lunch */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Lunch (12:30 PM - 3:00 PM)</span>
                  <span className="text-xs text-zinc-400">Dabba / Box Facility Available</span>
                </div>
                <p className="text-sm font-semibold text-white mt-1">Steamed Rice, Fresh Dal, Seasonal Veg Curry, Curd, Pickle & Sambar</p>
              </div>

              {/* Dinner with Paneer/Mushroom for vegetarians cooked separately */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Dinner (7:30 PM - 10:30 PM)</span>
                  <span className="text-xs text-emerald-400 font-semibold">Special Non-Veg & Veg Days</span>
                </div>
                <p className="text-sm font-semibold text-white mt-1">Hot Phulkas/Chapatis, Rice, Curries, 2x Chicken Special, 3x Egg Curry (Paneer / Mushroom Cooked Separately for Vegetarians) & Salad</p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
              <div className="text-xs text-zinc-300">
                Want to taste our food before joining? <strong>Book a visit during lunch/dinner hours!</strong>
              </div>
              <button 
                onClick={() => setShowVisitModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold shrink-0 hover:bg-emerald-400 transition-colors ml-3"
              >
                Taste the Food
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 6. AMENITIES GRID */}
      <section id="amenities" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-b border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Everything You Need</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Premium PG Amenities</h2>
          <p className="text-sm text-zinc-400 mt-2">Zero hassle stay. From fast fiber Wi-Fi to clean laundry and uninterrupted power, we&apos;ve got you covered.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Wifi, title: "High-Speed Wi-Fi", desc: "Fiber connection on every floor" },
            { icon: Zap, title: "24/7 Power Backup", desc: "Uninterrupted inverter & generator" },
            { icon: Sparkles, title: "Daily Cleaning", desc: "Rooms & washrooms sanitized daily" },
            { icon: Layers, title: "Washing Machines", desc: "Multiple automatic machines" },
            { icon: Utensils, title: "Refrigerator", desc: "Provided on every floor" },
            { icon: ShieldCheck, title: "24/7 CCTV & Security", desc: "Biometric & camera monitored" }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="p-5 rounded-2xl bg-black border border-white/[0.08] hover:border-emerald-500/40 hover:bg-zinc-950 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-3">
                <item.icon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">{item.title}</h4>
              <p className="text-[11px] text-zinc-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. VIDEO & PHOTO GALLERY TOUR (PLACEHOLDER WITH VIDEO PLAYER DESIGN) */}
      <section id="video-tour" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-b border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Virtual Walkthrough</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Tour the Property</h2>
          <p className="text-sm text-zinc-400 mt-2">See our rooms, dining area, corridors, and amenities before visiting in person.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Tour Placeholder */}
          <div className="lg:col-span-2 relative h-80 sm:h-96 rounded-3xl bg-zinc-950 border border-white/10 overflow-hidden flex flex-col items-center justify-center text-center p-6 group">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all cursor-pointer shadow-xl shadow-emerald-500/20 mb-4">
              <Play className="w-7 h-7 fill-current ml-1" />
            </div>
            <h3 className="text-lg font-bold text-white">Full Video Walkthrough Coming Soon</h3>
            <p className="text-xs text-zinc-400 max-w-md mt-1">We are finalizing high-definition video tours of the rooms, lounge, dining area, and terrace.</p>
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 text-xs font-semibold text-zinc-300">
              HD Video Tour Ready for Your Media
            </div>
          </div>

          {/* Photo Gallery Placeholders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col items-center justify-center text-center p-3">
              <Camera className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-xs font-bold text-zinc-300">Dining Area & Kitchen</span>
              <span className="text-[10px] text-zinc-500">Photo Space</span>
            </div>
            <div className="h-44 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col items-center justify-center text-center p-3">
              <Camera className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-xs font-bold text-zinc-300">Attached Washrooms</span>
              <span className="text-[10px] text-zinc-500">Photo Space</span>
            </div>
            <div className="h-44 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col items-center justify-center text-center p-3">
              <Camera className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-xs font-bold text-zinc-300">High-Speed Wi-Fi & Lounge</span>
              <span className="text-[10px] text-zinc-500">Photo Space</span>
            </div>
            <div className="h-44 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col items-center justify-center text-center p-3">
              <Camera className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-xs font-bold text-zinc-300">Washing & Laundry Floor</span>
              <span className="text-[10px] text-zinc-500">Photo Space</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PROFESSIONAL CONTACT & LEADERSHIP CARD */}
      <section id="contact" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-b from-zinc-950 to-black rounded-3xl border border-white/10 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Leadership Profile */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
                Management & Operations
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Direct Assistance from Leadership</h2>
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
                Have questions regarding rooms, custom corporate stays, food menu, or check-in schedules? Speak directly with our executive team.
              </p>

              {/* Profile Card */}
              <div className="mt-8 p-5 rounded-2xl bg-black border border-white/10 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl shrink-0">
                  AS
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Akula Sathish</h3>
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Managing Director & Head of Operations</p>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>+91 8686113435</span>
                  </p>
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`tel:${contactPhone}`}
                  className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Call +91 8686113435</span>
                </a>
                <button
                  onClick={() => openWhatsAppModal()}
                  className="px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <MessageSquare className="w-4 h-4 fill-black" />
                  <span>Chat on WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Quick Visit Booking Form */}
            <div className="lg:col-span-6 bg-zinc-950 p-6 sm:p-8 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold text-white mb-1">Schedule a Property Visit</h3>
              <p className="text-xs text-zinc-400 mb-6">Drop your details below. We&apos;ll show you around the rooms and facilities!</p>

              {visitSubmitted ? (
                <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-white font-bold text-base">Visit Request Scheduled!</h4>
                  <p className="text-xs text-zinc-400 mt-1">Our team is reaching out on WhatsApp and phone to confirm your visit time.</p>
                  <button 
                    onClick={() => setVisitSubmitted(false)}
                    className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 text-xs text-white hover:bg-zinc-800 border border-white/10"
                  >
                    Schedule Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVisitSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Your Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Sai Kumar" 
                      value={visitName}
                      onChange={(e) => setVisitName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Mobile / WhatsApp Number</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. 9876543210" 
                      value={visitPhone}
                      onChange={(e) => setVisitPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1">Sharing Preference</label>
                      <select 
                        value={selectedRoomForVisit}
                        onChange={(e) => setSelectedRoomForVisit(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="2-Sharing Room">2-Sharing</option>
                        <option value="3-Sharing Room">3-Sharing</option>
                        <option value="4-Sharing Room">4-Sharing</option>
                        <option value="5-Sharing Room">5-Sharing</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1">Preferred Date</label>
                      <input 
                        type="date" 
                        required
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Confirm Visit & Message on WhatsApp</span>
                  </button>
                </form>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-white/[0.08] bg-black py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="StaySync Logo" className="w-9 h-9 object-contain" />
            <div>
              <span className="text-sm font-black text-white tracking-tight">StaySync Premium Men&apos;s PG</span>
              <p className="text-[11px] text-zinc-500">Exclusively for Men • StaySync Premium Men&apos;s PG</p>
            </div>
          </div>

          <div className="text-xs text-zinc-400">
            For urgent room bookings: Call <a href={`tel:${contactPhone}`} className="text-emerald-400 font-bold hover:underline">+91 {contactPhone}</a>
          </div>

          <div className="text-xs text-zinc-500">
            © {new Date().getFullYear()} StaySync PG. All rights reserved.
          </div>

        </div>
      </footer>

      {/* 10. QUICK WHATSAPP INQUIRY MODAL (TENANT NAME PERSONALISED) */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#09090b] rounded-3xl border border-white/10 max-w-sm w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] mb-4">
              <MessageSquare className="w-6 h-6 fill-current" />
            </div>

            <h3 className="text-lg font-black text-white">Connect on WhatsApp</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {targetRoomName 
                ? `Inquiring about ${targetRoomName}`
                : "Chat directly with management for room availability & pricing."}
            </p>

            <form onSubmit={handleWhatsAppRedirect} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">What is your Name?</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="e.g. Sai Kumar"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-[#25D366] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black font-black text-xs transition-all shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 fill-black" />
                  <span>
                    {tenantName.trim() ? `Continue as ${tenantName.trim()}` : "Open WhatsApp"}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  type="button"
                  onClick={() => handleWhatsAppRedirect()}
                  className="w-full py-2 text-center text-[11px] text-zinc-400 hover:text-white"
                >
                  Skip name & open directly
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL: SCHEDULE VISIT */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#09090b] rounded-3xl border border-white/10 max-w-md w-full p-6 sm:p-8 relative shadow-2xl">
            <button 
              onClick={() => setShowVisitModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-white">Book a Property Visit</h3>
            <p className="text-xs text-zinc-400 mt-1">Come check out our rooms, food, and facilities in person.</p>

            {visitSubmitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-white font-bold">Request Sent!</h4>
                <p className="text-xs text-zinc-400 mt-1">We&apos;ll connect with you on WhatsApp to confirm.</p>
                <button 
                  onClick={() => {
                    setVisitSubmitted(false);
                    setShowVisitModal(false);
                  }}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleVisitSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Your Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Sai Kumar"
                    value={visitName}
                    onChange={(e) => setVisitName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="e.g. 9876543210"
                    value={visitPhone}
                    onChange={(e) => setVisitPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Room Sharing Preference</label>
                  <select 
                    value={selectedRoomForVisit}
                    onChange={(e) => setSelectedRoomForVisit(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="2-Sharing Room">2-Sharing Room</option>
                    <option value="3-Sharing Room">3-Sharing Room</option>
                    <option value="4-Sharing Room">4-Sharing Room</option>
                    <option value="5-Sharing Room">5-Sharing Room</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Preferred Visit Date</label>
                  <input 
                    type="date" 
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Request on WhatsApp</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
