import React, { useState } from 'react';
import { SponsorApplication, UserProfile, Sponsor } from '../types';
import { supabaseService } from '../lib/supabaseService';
import { Sparkles, DollarSign, Send, Mail, Download, ShieldCheck, UserCheck, Star, Award, BarChart3, HelpCircle, Gamepad2, FileDown, Plus, Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserProfileBannerStyle, getUserProfileFrameClass } from '../lib/premiumUtils';
import { GamerAvatar } from './GamerAvatar';
import { PremiumBanner } from './PremiumBanner';
import AdSenseSlot from './AdSenseSlot';
import UploadField from './UploadField';

interface SponsorZoneProps {
  sponsors: SponsorApplication[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  onSubmitSponsorApplication: (brandName: string, offerDetails: string, monthlyReach: string, pitch: string, contactEmail: string) => void;
  presetGamerName?: string; // prefill if coming from a specific user portfolio click
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function SponsorZone({
  sponsors,
  users,
  currentUser,
  onSubmitSponsorApplication,
  presetGamerName,
  addToast
}: SponsorZoneProps) {
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('Intel Core Esports Division');
  const [pitchDetails, setPitchDetails] = useState('');
  const [reachEstimates, setReachEstimates] = useState('10k - 25k monthly views');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [offerRequirements, setOfferRequirements] = useState('');
  const [sponsorDoc, setSponsorDoc] = useState('');

  // Sponsoring Brands Premium Database Marketplace
  const [partnerBrands, setPartnerBrands] = useState<Sponsor[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  React.useEffect(() => {
    let active = true;
    const loadBrands = async () => {
      try {
        const brands = await supabaseService.getSponsorBrands();
        const activeOnly = brands.filter(b => b.active);
        if (active) {
          setPartnerBrands(activeOnly);
          // Register dynamic impressions increment tracking
          activeOnly.forEach(b => {
            supabaseService.recordSponsorView(b.id).catch(() => {});
          });
        }
      } catch (err) {
        console.error("Failed loading partner brand campaigns:", err);
      }
    };
    loadBrands();
    return () => { active = false; };
  }, []);

  // Slide interval rotation loop
  React.useEffect(() => {
    if (partnerBrands.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % partnerBrands.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [partnerBrands]);

  const handleBrandClick = async (brandId: string) => {
    try {
      await supabaseService.recordSponsorClick(brandId, currentUser ? currentUser.id : null);
    } catch (err) {
      console.error("Tracking click count dispatch fail:", err);
    }
  };

  // Sponsoring Brands mock targets
  const SPONSORING_BRANDS = [
    { name: "Intel Core Esports Division", logo: "⚡", focus: "PC Hardware & CPU Rig sponsorship", status: "Active Opportunities" },
    { name: "RedBull Gaming Academy", logo: "🐂", focus: "Energy supplies and boot-camp residency sponsorships", status: "Active Opportunities" },
    { name: "Asus ROG Elite Labs", logo: "👾", focus: "Gaming Notebooks and Monitor backing", status: "Limited Vacancy" },
    { name: "Corsair Mechanical Labs", logo: "⛵", focus: "High-end keyboard/mouse mousepad provisions", status: "Active Opportunities" }
  ];

  // Filter featured gamers
  const featuredGamers = users.filter(user => user.isFeatured && !user.isBanned);

  const handlePitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast("Please login first to pitch sponsor programs!", "warning");
      return;
    }

    if (!pitchDetails || !contactEmail) {
      addToast("Please provide your pitch details and a valid contact email!", "warning");
      return;
    }

    onSubmitSponsorApplication(
      selectedBrand,
      offerRequirements || "Standard peripheral support and stream graphics banners overlay.",
      reachEstimates,
      pitchDetails,
      contactEmail
    );

    addToast(`Fantastic! Your sponsor pitch application for ${selectedBrand} has been logged in. Wait for reviews.`, "success");
    setPitchDetails('');
    setOfferRequirements('');
    setSponsorDoc('');
    setShowPitchModal(false);
  };

  const handleOpenPitch = (brandName: string) => {
    if (!currentUser) {
      addToast("Please login first to contact sponsors!", "warning");
      return;
    }
    setSelectedBrand(brandName);
    setContactEmail(currentUser.email);
    setShowPitchModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <Sparkles className="text-pink-500 w-8 h-8 animate-pulse" />
            Sponsorship Center
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Submit high-impact proposals to partner brands or generate beautiful recruitment-ready Media Kits instantly</p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) {
              addToast("Please login, then generate personalized sponsorships!", "warning");
              return;
            }
            setShowPitchModal(true);
          }}
          className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-1.5 transition-all text-sm neon-glow-pink"
        >
          <Plus className="w-5 h-5 stroke-[2.5px]" />
          Submit Sponsorship Pitch
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: Brand partnerships and gamers kit sheet */}
        <div className="xl:col-span-2 space-y-6">

          {/* PREMIUM SPONSOR CAMPAIGNS SHOWCASE */}
          {partnerBrands.length > 0 && (
            <div className="space-y-6">
              {/* FEATURED SPONSOR BANNER CAROUSEL */}
              <div id="partner-brand-carousel" className="bg-zinc-950/80 border border-amber-500/20 rounded-2xl overflow-hidden relative group">
                <div className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur px-2.5 py-1 rounded-md text-[9px] font-mono font-bold text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                  PLATFORM SPONSOR SPOTLIGHT
                </div>

                <div className="relative h-64 sm:h-72 overflow-hidden flex items-center justify-center bg-zinc-950">
                  <AnimatePresence mode="wait">
                    {partnerBrands.map((brand, idx) => {
                      if (idx !== currentSlide) return null;
                      return (
                        <motion.div
                          key={brand.id}
                          className="absolute inset-0 w-full h-full"
                          initial={{ opacity: 0, scale: 1.02 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.4 }}
                        >
                          {brand.banner_url ? (
                            <img
                              src={brand.banner_url}
                              referrerPolicy="no-referrer"
                              alt={brand.company_name || "Sponsor banner"}
                              className="w-full h-full object-cover opacity-50"
                              width={400}
                              height={160}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-[radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.1),transparent)] flex items-center justify-center" />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent flex flex-col justify-end p-6 text-left">
                            <div className="flex items-center gap-3 mb-2.5">
                              {brand.logo_url && (
                                <img
                                  src={brand.logo_url}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-800"
                                  alt={brand.company_name || "Sponsor logo"}
                                  width={36}
                                  height={36}
                                  loading="lazy"
                                />
                              )}
                              <h3 className="text-lg font-black text-white uppercase tracking-wide leading-none">{brand.company_name}</h3>
                            </div>

                            <p className="text-zinc-200 text-xs sm:text-sm max-w-xl leading-relaxed line-clamp-2 mb-4 font-sans">
                              {brand.description || "Active advertising campaign. Connect to back the portal."}
                            </p>

                            <div className="flex items-center gap-3">
                              {brand.website_url ? (
                                <a
                                  href={brand.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleBrandClick(brand.id)}
                                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black font-mono text-[10px] px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md uppercase cursor-pointer animate-pulse"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                  VISIT OFFICIAL BRAND SITE
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleBrandClick(brand.id);
                                    handleOpenPitch(brand.company_name);
                                  }}
                                  className="bg-pink-500 hover:bg-pink-600 text-white font-mono font-black text-[10px] px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md uppercase"
                                >
                                  PITCH FOR SPONSORSHIP
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Left / Right Arrows */}
                  {partnerBrands.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentSlide(prev => (prev - 1 + partnerBrands.length) % partnerBrands.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/65 border border-zinc-850 text-white hover:bg-black transition-all z-20 cursor-pointer text-center"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentSlide(prev => (prev + 1) % partnerBrands.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/65 border border-zinc-850 text-white hover:bg-black transition-all z-20 cursor-pointer text-center"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  
                  {/* Indicators */}
                  {partnerBrands.length > 1 && (
                    <div className="absolute bottom-4 right-6 flex gap-1 z-20">
                      {partnerBrands.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCurrentSlide(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentSlide ? "bg-amber-400 w-3" : "bg-zinc-650"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SPONSOR LOGO MARQUEE GRID */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-4.5 rounded-2xl text-left">
                <span className="text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest block mb-3">
                  🤝 Active Logo Coalitions (Carousel Grid)
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {partnerBrands.map((brand) => (
                    <a
                      key={brand.id}
                      href={brand.website_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleBrandClick(brand.id)}
                      className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer hover:border-amber-500/20"
                    >
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          referrerPolicy="no-referrer"
                          alt={brand.company_name}
                          className="w-10 h-10 object-contain rounded-lg bg-zinc-900 duration-250 group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-xl">⭐</span>
                      )}
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tight group-hover:text-white line-clamp-1">
                        {brand.company_name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Sponsorship programs */}
          <div className="bg-zinc-900/60 border border-zinc-855 rounded-2xl p-6 relative">
            <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2 mb-4">
              <Star className="text-pink-400 w-5 h-5" />
              Verified Sponsor Vacancies
            </h3>
            <p className="text-zinc-400 text-xs mt-1 mb-4 leading-relaxed">
              These industry giants are actively scouting. Review requirements, construct a compelling pitch, and link your custom Esports Career Profile as the validation proof.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SPONSORING_BRANDS.map((brand, idx) => (
                <div key={idx} className="p-4 bg-zinc-950/70 border border-zinc-805/80 rounded-xl hover:border-pink-500/30 transition-all flex flex-col justify-between space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">{brand.logo}</span>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wide">{brand.name}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1">{brand.focus}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40 text-[10px]">
                    <span className="font-mono text-emerald-400 flex items-center gap-1.5 uppercase font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {brand.status}
                    </span>

                    <button
                      onClick={() => handleOpenPitch(brand.name)}
                      className="bg-pink-500 hover:bg-pink-600 text-white font-mono px-3 py-1 rounded font-bold transition-all"
                    >
                      PITCH NOW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Sponsorable Athletes */}
          <div className="bg-zinc-900/60 border border-zinc-805/85 rounded-2xl p-6 relative">
            <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2 mb-1">
              <UserCheck className="text-blue-400 w-5 h-5" />
              Elite Featured Athletes
            </h3>
            <p className="text-zinc-400 text-xs mb-4">Brands are currently examining stats on these boosted operators. Looking to sponsor them? View portfolio cards to get in touch!</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredGamers.length === 0 ? (
                <div className="text-zinc-500 text-xs font-mono py-8 italic">No boosted profiles active. Premium Gold/Platinum members are listed here!</div>
              ) : (
                featuredGamers.map((gamer) => (
                  <div key={gamer.id} className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center gap-4">
                    <img
                      src={gamer.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                      alt={gamer.gamerName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-800"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-extrabold text-white">{gamer.gamerName}</h4>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                          {gamer.membership}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono mt-0.5 flex-wrap">
                        <span>K/D: <span className="text-cyan-400">{gamer.kdRatio.toFixed(2)}</span></span>
                        <span>SKILL: <span className="text-rose-500">{gamer.skillRating}</span></span>
                        <span>WIN: <span className="text-emerald-400">{gamer.winRate}%</span></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Media Kit Stat Card */}
        <div className="space-y-4">
          <div className="bg-zinc-900/90 border border-pink-500/30 rounded-2xl p-5 relative overflow-hidden neon-glow-pink">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold font-mono tracking-widest text-pink-400 uppercase">Gamer Media Kit</h4>
              <BarChart3 className="w-4 h-4 text-pink-400" />
            </div>

            {currentUser ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-zinc-850 bg-zinc-950 pb-3">
                  <PremiumBanner user={currentUser} heightClass="h-20" />

                  {/* Avatar Overlapping */}
                  <div className="flex items-center gap-3 px-3 -mt-6 relative z-10">
                    <GamerAvatar user={currentUser} size="sm" />
                    <div className="mt-5 min-w-0">
                      <h3 className="font-extrabold text-white text-sm leading-tight truncate">{currentUser.gamerName}</h3>
                      <p className="text-[9px] text-pink-400 font-mono font-bold uppercase tracking-widest mt-0.5 leading-none">TIER: {currentUser.membership}</p>
                    </div>
                  </div>
                </div>

                {/* Stat Matrix Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/60">
                  <div className="p-2.5 bg-zinc-950 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-mono text-zinc-500">Skill Tier</p>
                    <p className="text-sm font-extrabold text-white">{currentUser.skillRating} MMR</p>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-mono text-zinc-500">K/D Ratio</p>
                    <p className="text-sm font-extrabold text-pink-400">{currentUser.kdRatio.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-mono text-zinc-500">Win Index</p>
                    <p className="text-sm font-extrabold text-emerald-400">{currentUser.winRate}%</p>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-mono text-zinc-500">Medals Earned</p>
                    <p className="text-sm font-extrabold text-fuchsia-400">{currentUser.achievements.length}</p>
                  </div>
                </div>

                {/* Reach Estimates placeholder */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <p className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Esports Brand reach index</p>
                  <p className="text-xs text-zinc-300 font-mono mt-1 font-bold">120k Combined monthly reach</p>
                  <span className="text-[9px] text-zinc-500 font-sans block mt-1">Calculated from connected social parameters: YT, Discord.</span>
                </div>

                {/* Media kit triggers */}
                <div className="space-y-2 pt-2 text-center text-xs">
                  <button
                    onClick={() => {
                      addToast("Generating media kit parameters in PDF. Download starting shortly...", "success");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-300 font-mono uppercase font-bold border border-zinc-800 transition-all text-[11px]"
                  >
                    <FileDown className="w-3.5 h-3.5 text-pink-400" />
                    Download PDF Kit
                  </button>
                  <div className="text-[9px] text-zinc-500 pt-1 leading-snug">Generate a career proof file to mail directly to third-party team commanders.</div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Gamepad2 className="w-8 h-8 text-zinc-600 mx-auto mb-1" />
                <p className="text-xs text-zinc-500 italic">Please login to inspect your game Career metrics and sponsor reach stats.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Application Pitch Modal */}
      <AnimatePresence>
        {showPitchModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => setShowPitchModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-pink-500/40 rounded-2xl w-full max-w-lg p-6 z-10 space-y-4 neon-glow-pink"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <Star className="text-pink-500 w-5 h-5" />
                  Sponsor Pitch Program
                </h3>
                <button
                  onClick={() => setShowPitchModal(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePitchSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Scouting Brand</label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-pink-500 rounded-xl px-3 py-2.5 focus:outline-none"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                  >
                    {SPONSORING_BRANDS.map((item, idx) => (
                      <option key={idx} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Your Monthly Reach</label>
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-pink-500 rounded-xl px-3 py-2.5 focus:outline-none"
                      value={reachEstimates}
                      onChange={(e) => setReachEstimates(e.target.value)}
                    >
                      <option value="Under 10k combined stream index">Under 10k combined stream index</option>
                      <option value="10k - 25k monthly views">10k - 25k monthly views</option>
                      <option value="25k - 100k views and active YouTube">25k - 100k views and active YouTube</option>
                      <option value="Over 100k+ global esports views">Over 100k+ global esports views</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Contact Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-pink-500 rounded-xl px-4 py-2.5 focus:outline-none"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">What backing do you require? *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. peripheral provisions, graphics overlay sponsorship, travel coverage"
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-pink-500 rounded-xl px-4 py-2.5 focus:outline-none"
                    value={offerRequirements}
                    onChange={(e) => setOfferRequirements(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Pitch details & Bio values *</label>
                  <textarea
                    required
                    placeholder="Write a clear statement details explaining how you can market their hardware on stream, video integrations plans, and tournaments agenda..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-pink-500 rounded-xl p-3 focus:outline-none"
                    rows={4}
                    value={pitchDetails}
                    onChange={(e) => setPitchDetails(e.target.value)}
                  />
                </div>

                <div>
                  <UploadField 
                    id="sponsor-doc-upload"
                    bucketName="sponsor_documents"
                    label="Attach Media Plan or Pitch Deck (Optional)"
                    value={sponsorDoc}
                    onChange={(url) => setSponsorDoc(url)}
                    placeholder="Drop media deck PDF or image, or select"
                  />
                </div>

                {/* Stats note */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 text-[10px]/snug text-zinc-500">
                  ⚠️ <strong>ALERT:</strong> We will automatically annex your live competitive profile metrics (KD ratio, badges, skill rating MMR) to this application. Ensure your credentials are up to date.
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all neon-glow-pink"
                  >
                    SUBMIT TO VERIFICATION DESK
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AdSense-ready sponsor marketplace slot */}
      <AdSenseSlot slotType="sponsor" className="mt-8" />
    </div>
  );
}
