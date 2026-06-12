import React, { useState, useEffect } from 'react';
import { Tournament, UserProfile, Team, DbTournamentRegistration, AdminSettings, DbTournamentMatch, TournamentResult } from '../types';
import { supabaseService } from '../lib/supabaseService';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Gamepad2, 
  Layers, 
  AlertCircle, 
  Clock, 
  Medal, 
  Clipboard, 
  Search, 
  Filter, 
  BadgeInfo,
  ShieldCheck,
  Tag,
  Coins,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AdSenseSlot from './AdSenseSlot';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface TournamentsProps {
  tournaments: Tournament[];
  currentUser: UserProfile | null;
  userTeams: Team[];
  registrations: DbTournamentRegistration[];
  onRegisterTournament: (regData: {
    tournament_id: string;
    registration_type: 'solo' | 'team';
    team_id?: string | null;
    payment_status: 'pending' | 'paid' | 'unneeded' | 'rejected';
    transaction_id?: string | null;
    payment_screenshot_url?: string | null;
  }) => Promise<void>;
  onCancelRegistration?: (tournamentId: string) => Promise<void>;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  adminSettings?: AdminSettings;
  users?: UserProfile[];
  allTeams?: Team[];
}

export default function Tournaments({
  tournaments,
  currentUser,
  userTeams,
  registrations,
  onRegisterTournament,
  onCancelRegistration,
  addToast,
  adminSettings,
  users = [],
  allTeams = []
}: TournamentsProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const getParticipantGlobalName = (id: string | null | undefined, type: 'solo' | 'team') => {
    if (!id) return "BYE";
    if (type === 'solo') {
      const user = users.find(u => u.id === id);
      return user ? (user.gamerName || user.username || user.email || 'Gamer') : 'BYE';
    } else {
      const team = allTeams.find(ti => ti.id === id);
      return team ? team.name : 'BYE';
    }
  };
  
  // Details Modal and Registration states
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [selectedRegType, setSelectedRegType] = useState<'solo' | 'team'>('solo');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [txnId, setTxnId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [tournamentCouponCode, setTournamentCouponCode] = useState('');
  const [tourneyDiscountSummary, setTourneyDiscountSummary] = useState<{
    original: number;
    discount: number;
    final: number;
    savings: number;
  } | null>(null);
  const [showPlayersList, setShowPlayersList] = useState(false);

  // Tournament Bracket Matches state
  const [selectedTourneyMatches, setSelectedTourneyMatches] = useState<DbTournamentMatch[]>([]);
  const [selectedTourneyResults, setSelectedTourneyResults] = useState<TournamentResult[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // Load matches every time selectedTournament modal shifts
  useEffect(() => {
    if (selectedTournament) {
      setIsLoadingMatches(true);
      Promise.all([
        supabaseService.getTournamentMatches(selectedTournament.id),
        supabaseService.getTournamentResults(selectedTournament.id)
      ])
        .then(([matches, results]) => {
          setSelectedTourneyMatches(matches);
          setSelectedTourneyResults(results);
          setIsLoadingMatches(false);
        })
        .catch(err => {
          console.error("Failed loading matches or results:", err);
          setIsLoadingMatches(false);
        });
    } else {
      setSelectedTourneyMatches([]);
      setSelectedTourneyResults([]);
    }
  }, [selectedTournament?.id]);

  // Active status tabs (Optional quick tabs to complement search)
  const [activeTab, setActiveTab ] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('all');

  const getSeatNumber = (reg: DbTournamentRegistration) => {
    if (reg.payment_screenshot_url?.startsWith('seat:')) {
      const match = reg.payment_screenshot_url.match(/seat:(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    if (typeof (reg as any).seat_number === 'number') {
      return (reg as any).seat_number;
    }
    return 9999;
  };

  // List of unique games for filtering
  const gamesList = ['All', ...Array.from(new Set(tournaments.map(t => t.game).filter(Boolean)))];

  // Map backend status to user friendly string
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ongoing':
      case 'live':
        return {
          label: '🔴 LIVE NOW',
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
      case 'completed':
        return {
          label: '✔ COMPLETED',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'cancelled':
        return {
          label: '❌ CANCELLED',
          classes: 'bg-zinc-805/40 text-zinc-500 border-zinc-800'
        };
      case 'upcoming':
      default:
        return {
          label: '⏳ UPCOMING',
          classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        };
    }
  };

  // Filter Tournaments logic
  const filteredTournaments = tournaments.filter(t => {
    // 1. Search Query
    const query = searchQuery.trim().toLowerCase();
    const titleMatch = t.title?.toLowerCase().includes(query);
    const gameMatch = t.game?.toLowerCase().includes(query);
    const descMatch = t.description?.toLowerCase().includes(query) || false;
    const passesSearch = !query || titleMatch || gameMatch || descMatch;

    // 2. Game select filter
    const passesGame = selectedGame === 'All' || t.game === selectedGame;

    // 3. Status select filter
    const statusLower = t.status?.toLowerCase();
    let passesStatus = true;
    if (selectedStatus !== 'All') {
      const matchStatus = selectedStatus.toLowerCase();
      if (matchStatus === 'live') {
        passesStatus = statusLower === 'ongoing' || statusLower === 'live';
      } else {
        passesStatus = statusLower === matchStatus;
      }
    }

    // 4. Status Quick Tabs filter
    let passesTab = true;
    if (activeTab !== 'all') {
      if (activeTab === 'ongoing') {
        passesTab = statusLower === 'ongoing' || statusLower === 'live';
      } else {
        passesTab = statusLower === activeTab;
      }
    }

    return passesSearch && passesGame && passesStatus && passesTab;
  });

  const handleScreenshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addToast("Uploading verification screenshot proof...", "info");
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser?.id || 'guest'}_${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (error) {
        const objectUrl = URL.createObjectURL(file);
        setScreenshotUrl(objectUrl);
        addToast("Screenshot simulation hooked locally!", "success");
      } else {
        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(filePath);

        setScreenshotUrl(urlData.publicUrl);
        addToast("Transaction screenshot uploaded synchronously!", "success");
      }
    } catch (err) {
      console.error(err);
      const objectUrl = URL.createObjectURL(file);
      setScreenshotUrl(objectUrl);
      addToast("Screenshot proof simulated locally.", "success");
    }
  };

  const handleApplyTourneyCoupon = async () => {
    if (!selectedTournament) return;
    
    const entryFeeText = selectedTournament.entry_fee || selectedTournament.entryFee || 'Free';
    const parseFeeDiamonds = (feeStr: string | undefined): number => {
      if (!feeStr) return 0;
      const normalized = feeStr.trim().toLowerCase();
      if (normalized === 'free' || normalized === '0' || normalized === 'free entry') return 0;
      const match = normalized.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    
    const basePrice = parseFeeDiamonds(entryFeeText);
    if (basePrice <= 0) {
      addToast("This is a free tournament! You don't need a discount coupon.", "warning");
      return;
    }

    const code = tournamentCouponCode.trim().toUpperCase();
    if (!code) {
      addToast("Please input a valid promo or coupon code.", "warning");
      return;
    }

    const res = await supabaseService.validatePromoCode(code, currentUser?.id || '', 'tournament_entry', basePrice);
    if (res.isValid) {
      setTourneyDiscountSummary({
        original: basePrice,
        discount: res.discountAmount,
        final: res.finalAmount,
        savings: res.discountAmount
      });
      addToast(res.message, "success");
    } else {
      setTourneyDiscountSummary(null);
      addToast(res.message, "error");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;

    if (!currentUser) {
      addToast("You must log in to register for tournaments!", "warning");
      return;
    }

    if (!contactEmail.trim()) {
      addToast("Please provide a contact email!", "warning");
      return;
    }

    const entryFeeText = selectedTournament.entry_fee || selectedTournament.entryFee || 'Free';
    const requiresFee = entryFeeText.toLowerCase() !== 'free' && entryFeeText !== '0';

    const parseFeeDiamonds = (feeStr: string | undefined): number => {
      if (!feeStr) return 0;
      const normalized = feeStr.trim().toLowerCase();
      if (normalized === 'free' || normalized === '0' || normalized === 'free entry') return 0;
      const match = normalized.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const baseFeeDiamonds = parseFeeDiamonds(entryFeeText);
    let feeDiamonds = baseFeeDiamonds;
    let executedCouponCode: string | undefined = undefined;

    if (requiresFee && baseFeeDiamonds > 0 && tournamentCouponCode.trim()) {
      const promoRes = await supabaseService.executePromoUsage(tournamentCouponCode.trim(), currentUser.id, 'tournament_entry', baseFeeDiamonds);
      if (promoRes.status === 'success') {
        feeDiamonds = promoRes.finalAmount;
        executedCouponCode = tournamentCouponCode.trim().toUpperCase();
      } else {
        console.warn("[Coupon Engine] Promocode execution failed. Standard entry fee applied.");
      }
    }

    const userDiamonds = currentUser ? (currentUser.diamonds || 0) : 0;

    if (requiresFee) {
      if (baseFeeDiamonds > 0) {
        if (userDiamonds < feeDiamonds) {
          addToast(`Insufficient Diamonds! You need ${feeDiamonds} Diamonds (after discount) but only have ${userDiamonds}. Buy Diamonds to join!`, "warning");
          return;
        }
      } else {
        if (!txnId.trim()) {
          addToast("Please specify transaction reference ID (UTR)!", "warning");
          return;
        }
        if (!screenshotUrl.trim()) {
          addToast("Please provide/upload a payment screenshot!", "warning");
          return;
        }
      }
    }

    if (selectedRegType === 'team') {
      if (!selectedTeamId) {
        addToast("Please choose or build a squad to join!", "warning");
        return;
      }
    }

    const userPaidNote = executedCouponCode ? `Paid via Diamonds (Coupon: ${executedCouponCode})` : 'diamonds';

    const regPayload = {
      tournament_id: selectedTournament.id,
      registration_type: selectedRegType,
      team_id: selectedRegType === 'team' ? selectedTeamId : null,
      payment_status: (requiresFee ? (baseFeeDiamonds > 0 ? 'paid' : 'pending') : 'unneeded') as 'pending' | 'paid' | 'unneeded' | 'rejected',
      transaction_id: requiresFee ? (baseFeeDiamonds > 0 ? `diamonds-${Date.now()}` : txnId) : null,
      payment_screenshot_url: requiresFee ? (baseFeeDiamonds > 0 ? userPaidNote : screenshotUrl) : null,
    };

    try {
      await onRegisterTournament(regPayload);
      
      setShowRegModal(false);
      setSelectedTeamId('');
      setTxnId('');
      setScreenshotUrl('');
      setTournamentCouponCode('');
      setTourneyDiscountSummary(null);
      
      // update state in selected tournament modal locally as well
      setSelectedTournament(prev => {
        if (!prev) return null;
        return {
          ...prev,
          registrants: [...prev.registrants, {
            id: currentUser.id,
            name: currentUser.gamerName,
            logo: currentUser.activeFrame,
            type: selectedRegType,
            status: requiresFee ? 'pending' : 'approved',
            contactEmail,
            registeredAt: new Date().toISOString()
          }]
        };
      });
    } catch (err) {
      console.error(err);
      addToast("Failed to file tournament registration.", "error");
    }
  };

  const openRegistration = (tourney: Tournament) => {
    if (!currentUser) {
      addToast("Please log in first to sign up!", "warning");
      return;
    }
    setSelectedTournament(tourney);
    setSelectedRegType(tourney.registrationType);
    setContactEmail(currentUser.email);
    setShowRegModal(true);
  };

  const openDetails = (tourney: Tournament) => {
    setSelectedTournament(tourney);
    setShowDetailModal(true);
  };

  const formatDateString = (dt: string | undefined, placeholder: string) => {
    if (!dt) return placeholder;
    try {
      const parsed = new Date(dt);
      if (isNaN(parsed.getTime())) return dt; // Return raw string if custom format
      return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dt;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Header */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <Trophy className="text-emerald-400 w-8 h-8" />
            Arena Tournaments
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Register for premium sponsoropen tournaments, verify esports authority and win cash pools</p>
        </div>

        {/* Quick Tabs switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850 flex-wrap shrink-0">
          {[
            { id: 'all', label: 'ALL EVENTS' },
            { id: 'upcoming', label: 'UPCOMING' },
            { id: 'ongoing', label: 'LIVE' },
            { id: 'completed', label: 'COMPLETED' },
            { id: 'cancelled', label: 'CANCELLED' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedStatus('All'); // Sync selected status dropdown
              }}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-emerald-500 text-zinc-950 neon-glow-emerald' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modern Filter controls */}
      <div className="p-4 bg-zinc-900/45 border border-zinc-850/80 rounded-2xl flex flex-col lg:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full lg:flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Arena tournaments..."
            className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-xl py-2.5 pl-10 pr-4 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Game Select */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-zinc-400">
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[10px] text-zinc-550 uppercase">Game:</span>
            <select
              className="bg-transparent border-none text-zinc-100 font-bold focus:outline-none focus:ring-0 text-[11px]"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              {gamesList.map(game => (
                <option key={game} value={game} className="bg-zinc-950 text-white">{game}</option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[10px] text-zinc-550 uppercase">Status:</span>
            <select
              className="bg-transparent border-none text-zinc-100 font-bold focus:outline-none focus:ring-0 text-[11px]"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setActiveTab('all'); // Clear quick tab status
              }}
            >
              <option value="All" className="bg-zinc-950 text-white">All Statuses</option>
              <option value="Upcoming" className="bg-zinc-950 text-white">Upcoming</option>
              <option value="Live" className="bg-zinc-950 text-white">Live / Ongoing</option>
              <option value="Completed" className="bg-zinc-950 text-white">Completed</option>
              <option value="Cancelled" className="bg-zinc-950 text-white">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid view of tournament cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTournaments.length === 0 ? (
          <div className="lg:col-span-2 text-center py-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
            <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-300 font-mono text-sm leading-relaxed font-bold">No Match found</p>
            <p className="text-zinc-500 text-xs font-mono max-w-md mx-auto">Try clarifying keywords, reloading standard preset events, or selecting options in your filters above.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGame('All');
                setSelectedStatus('All');
                setActiveTab('all');
              }}
              className="text-xs bg-zinc-950 border border-zinc-800 px-4 py-2 hover:bg-zinc-900 hover:text-white rounded-xl text-emerald-400 transition-all font-mono"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredTournaments.map((tourney) => {
            const activeRegOnCard = currentUser ? (registrations || []).find(r => r.tournament_id === tourney.id && r.user_id === currentUser.id && r.status === 'registered') : null;
            const isRegistered = !!activeRegOnCard;
            const badgeMeta = getStatusBadge(tourney.status);

            // Default fallback gradients for cool banner backgrounds
            const bannerFallbackGradient = `bg-gradient-to-br from-indigo-950 via-zinc-900 to-rose-950`;

            return (
              <div 
                key={tourney.id} 
                className="group relative bg-zinc-900/80 border border-zinc-805/85 hover:border-emerald-500/35 transition-all duration-300 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl"
              >
                {/* Banner Thumbnail (Standard Top Layout) */}
                <div className="h-44 w-full relative overflow-hidden bg-zinc-950 flex items-center justify-center">
                  {tourney.banner_url ? (
                    <img 
                      src={tourney.banner_url} 
                      alt={tourney.title || "Tournament banner"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-505"
                      width={380}
                      height={176}
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full h-full ${bannerFallbackGradient} flex items-center justify-center p-6 relative`}>
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1),transparent_70%)]"></div>
                      <Gamepad2 className="w-16 h-16 text-emerald-500/20 absolute right-4 bottom-4" />
                      <Trophy className="w-20 h-20 text-white/5 absolute left-10 top-2" />
                      <span className="font-extrabold text-white/10 text-5xl tracking-widest font-display select-none uppercase absolute">{tourney.game}</span>
                    </div>
                  )}

                  {/* Status Overlay badge */}
                  <span className={`absolute top-4 right-4 text-[9px] font-mono font-black border px-3 py-1 rounded-full backdrop-blur-md shadow-md ${badgeMeta.classes}`}>
                    {badgeMeta.label}
                  </span>

                  {/* Prize pool overlay */}
                  <span className="absolute bottom-4 left-4 text-xs font-mono font-extrabold px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-black/75 text-emerald-400 backdrop-blur-md flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    PRIZE: {tourney.prizePool || tourney.prize_pool || 'Free'}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Game and Header Meta */}
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest leading-none">{tourney.game}</span>
                    </div>

                    <h3 className="text-xl font-bold font-display text-white mt-2 group-hover:text-emerald-400 transition-colors">{tourney.title}</h3>
                    {tourney.description && (
                      <p className="text-xs text-zinc-400 font-sans mt-2 line-clamp-2 leading-relaxed">{tourney.description}</p>
                    )}

                    {/* Stats & Deadline details rows */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 space-y-0.5">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">ENTRY FEE</span>
                        <span className="text-xs font-mono font-bold text-amber-400">{tourney.entry_fee || 'Free Entry'}</span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 space-y-0.5">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">REG. DEADLINE</span>
                        <span className="text-[10px] font-mono font-bold text-rose-400 truncate block">
                          {formatDateString(tourney.registration_deadline, "Open until start")}
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 space-y-0.5">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">EVENT START</span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 truncate block">
                          {formatDateString(tourney.tournament_start, "Check schedule")}
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 space-y-0.5">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">SEAT CAPACITY</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {(() => {
                            const maxSeats = tourney.max_teams || tourney.max_players || 16;
                            const activeRegsOnCard = (registrations || []).filter(
                              r => r.tournament_id === tourney.id && (((r.status as string) === 'registered') || r.status === 'approved')
                            );
                            const filledSeatsOnCard = activeRegsOnCard.length;
                            const remainingSeatsOnCard = Math.max(0, maxSeats - filledSeatsOnCard);
                            return `${filledSeatsOnCard} / ${maxSeats} Seats (${remainingSeatsOnCard} left)`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/60 flex gap-2">
                    {/* View Details Button */}
                    <button
                      type="button"
                      onClick={() => openDetails(tourney)}
                      className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px] font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <BadgeInfo className="w-4 h-4" />
                      View Details
                    </button>

                    {/* Quick Register / status CTA */}
                    {isRegistered ? (
                      <div className="flex flex-col gap-1 shrink-0">
                        <div className="px-3 py-1.5 text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          REGISTERED (Seat #{getSeatNumber(activeRegOnCard!)})
                        </div>
                        {onCancelRegistration && (
                          <button
                            type="button"
                            onClick={() => onCancelRegistration(tourney.id)}
                            className="text-[9px] font-mono text-rose-450 hover:text-rose-400 transition-colors bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded py-1 cursor-pointer font-bold uppercase"
                          >
                            Exit Seat
                          </button>
                        )}
                      </div>
                    ) : (
                      tourney.status !== 'completed' && tourney.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => openRegistration(tourney)}
                          className="px-5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-2.5 rounded-xl text-[11px] font-mono tracking-wider transition-all neon-glow-emerald cursor-pointer shrink-0"
                        >
                          REGISTER
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tournament Details Modal */}
      <AnimatePresence>
        {showDetailModal && selectedTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setShowDetailModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-0 z-10 space-y-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] scrollbar-thin scrollbar-thumb-zinc-800"
            >
              {/* Header Cover Banner */}
              <div className="h-60 w-full relative bg-zinc-950 flex items-center justify-center">
                {selectedTournament.banner_url ? (
                  <img 
                    src={selectedTournament.banner_url} 
                    alt={selectedTournament.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-zinc-900 to-rose-950 flex items-center justify-center relative p-6">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1),transparent_70%)]"></div>
                    <span className="font-extrabold text-white/10 text-6xl tracking-widest select-none uppercase font-display">{selectedTournament.game}</span>
                  </div>
                )}
                
                {/* Close Button overlay */}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 text-xs leading-none transition-colors border border-zinc-800"
                  title="Close Details"
                >
                  ✕
                </button>

                {/* Cover status badge */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-zinc-805/60 rounded-xl px-3 py-1 flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-zinc-300 font-bold uppercase">{selectedTournament.status}</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">{selectedTournament.game}</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-550 font-bold">CREATED: {formatDateString(selectedTournament.created_at, "Auto preset archive")}</span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black font-display text-white mt-1.5">{selectedTournament.title}</h2>
                </div>

                {/* Highlighted overview stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-950/80 p-4 border border-zinc-850 rounded-2xl">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide block">🏆 PRIZE POOL</span>
                    <span className="text-sm font-mono font-black text-emerald-400">{selectedTournament.prizePool || selectedTournament.prize_pool || 'Free'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide block">🪙 ENTRY COST</span>
                    <span className="text-sm font-mono font-black text-amber-400">{selectedTournament.entry_fee || 'Free'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide block">🎮 SQUADS LIMIT</span>
                    <span className="text-sm font-mono font-black text-zinc-305">{selectedTournament.max_teams || 16} max</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide block">👥 ENROLLED</span>
                    <span className="text-sm font-mono font-black text-cyan-400">
                      {(() => {
                        const activeRegs = (registrations || []).filter(
                          r => r.tournament_id === selectedTournament.id && (((r.status as string) === 'registered') || r.status === 'approved')
                        );
                        return activeRegs.length;
                      })()} squads
                    </span>
                  </div>
                </div>

                 {/* Part 3: Free Fire MAX Room Details Panel */}
                {(() => {
                  const activeRegDetail = currentUser ? (registrations || []).find(r => r.tournament_id === selectedTournament.id && r.user_id === currentUser.id && r.status === 'registered') : null;
                  const isRevealedByTime = selectedTournament.room_reveal_at && new Date() >= new Date(selectedTournament.room_reveal_at);
                  const isRevealed = !!(selectedTournament.room_revealed || isRevealedByTime);

                  const copyToClipboard = (text: string, label: string) => {
                    navigator.clipboard.writeText(text);
                    addToast(`${label} copied to clipboard!`, 'success');
                  };

                  return (
                    <div className="bg-zinc-950 p-5 border border-zinc-850 rounded-2xl space-y-4 shadow-lg">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 flex-row">
                          <span>Free Fire MAX Room Details</span>
                        </h4>
                        <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded leading-none ${
                          isRevealed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}>
                          {isRevealed ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>

                      {!currentUser ? (
                        <p className="text-zinc-500 font-mono text-[10.5px] text-center italic py-2">
                          Login and register to view room details.
                        </p>
                      ) : !activeRegDetail ? (
                        <p className="text-zinc-500 font-mono text-[10.5px] text-center italic py-2">
                          Register to view room details.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-850/40 relative flex flex-col gap-1">
                              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">ROOM ID</span>
                              {isRevealed ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-mono font-bold text-white select-all">{selectedTournament.room_id || 'Not Set'}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(selectedTournament.room_id || '', 'Room ID')}
                                    className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-[9px] uppercase font-mono px-2 py-1 rounded text-zinc-400 hover:text-white cursor-pointer transition-colors"
                                  >
                                    Copy
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-mono font-bold text-zinc-600">🔒 Locked</span>
                              )}
                            </div>

                            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-850/40 relative flex flex-col gap-1">
                              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">PASSWORD</span>
                              {isRevealed ? (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-mono font-bold text-white select-all">{selectedTournament.room_password || 'Not Set'}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(selectedTournament.room_password || '', 'Password')}
                                    className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-[9px] uppercase font-mono px-2 py-1 rounded text-zinc-400 hover:text-white cursor-pointer transition-colors"
                                  >
                                    Copy
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-mono font-bold text-zinc-650">🔒 Locked</span>
                              )}
                            </div>
                          </div>

                          {!isRevealed && (
                            <p className="text-[9.5px] font-mono text-zinc-500 text-center uppercase tracking-wide">
                              Room details will be revealed by admin before match.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Public Seat Counter & Beautiful Visual Seat Grid */}
                {(() => {
                  const maxSeats = selectedTournament.max_teams || selectedTournament.max_players || 16;
                  const activeRegs = (registrations || []).filter(
                    r => r.tournament_id === selectedTournament.id && (((r.status as string) === 'registered') || r.status === 'approved')
                  );
                  const filledSeats = activeRegs.length;
                  const remainingSeats = Math.max(0, maxSeats - filledSeats);

                  return (
                    <div className="space-y-3.5 bg-zinc-950 p-4 border border-zinc-850 rounded-2xl">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-wider">
                          Seat Availability Counter
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {filledSeats} / {maxSeats} Filled
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 w-full text-center py-2 bg-zinc-900/60 rounded-xl border border-zinc-850/40">
                        <div>
                          <span className="text-[8px] text-zinc-500 font-mono uppercase block">Total Seats</span>
                          <span className="text-xs font-black text-white">{maxSeats}</span>
                        </div>
                        <div className="border-x border-zinc-850">
                          <span className="text-[8px] text-zinc-500 font-mono uppercase block">Filled Seats</span>
                          <span className="text-xs font-black text-emerald-400">{filledSeats}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-zinc-500 font-mono uppercase block">Remaining</span>
                          <span className="text-xs font-black text-cyan-400">{remainingSeats}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPlayersList(!showPlayersList)}
                          className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-[10px] font-mono py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-inner cursor-pointer uppercase font-bold"
                        >
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          {showPlayersList ? 'Hide Arena Seat Map' : 'View Arena Seat Map'}
                        </button>

                        <AnimatePresence>
                          {showPlayersList && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden bg-zinc-950 rounded-xl border border-zinc-850/60 mt-2 p-3 space-y-3"
                            >
                              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-550 uppercase tracking-widest border-b border-zinc-900 pb-1.5 font-bold">
                                <span>Seat Alignment Blueprint</span>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500/40"></span> You
                                  <span className="w-2 h-2 rounded bg-zinc-900/60 border border-zinc-805"></span> Available
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                                {Array.from({ length: maxSeats }).map((_, idx) => {
                                  const seatNum = idx + 1;
                                  const reg = activeRegs.find(r => getSeatNumber(r) === seatNum);
                                  const playerUser = reg ? (users || []).find(u => u.id === reg.user_id) : null;
                                  const playerName = playerUser?.gamerName || playerUser?.username || 'Gamer';
                                  const isCurrentUserSeat = reg && currentUser && reg.user_id === currentUser.id;

                                  if (reg) {
                                    return (
                                      <div
                                        key={seatNum}
                                        className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-0.5 transition-all ${
                                          isCurrentUserSeat
                                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                                            : 'bg-zinc-900/30 border-zinc-850 text-zinc-300'
                                        }`}
                                      >
                                        <span className="text-[8px] font-mono text-zinc-500">Seat #{seatNum}</span>
                                        <span className="text-[10px] font-bold truncate max-w-full leading-none mt-0.5">{playerName}</span>
                                        <span className="text-[7.5px] font-mono text-zinc-500 mt-0.5 uppercase tracking-tight">TAKEN</span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div
                                        key={seatNum}
                                        className="p-2 rounded-xl border border-zinc-905/30 bg-zinc-950/20 flex flex-col items-center justify-center text-center gap-0.5"
                                      >
                                        <span className="text-[8px] font-mono text-zinc-600">Seat #{seatNum}</span>
                                        <span className="text-[10px] font-bold text-zinc-500">Available</span>
                                        <span className="text-[7.5px] font-mono text-zinc-700 mt-0.5 uppercase tracking-tight">EMPTY</span>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })()}

                {/* Game Full Information */}
                {selectedTournament.description && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider flex items-center gap-1">
                      <BadgeInfo className="w-4 h-4 text-emerald-400" />
                      Full Event Description
                    </h4>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed bg-zinc-950/20 p-4 border border-zinc-850/40 rounded-xl whitespace-pre-line">
                      {selectedTournament.description}
                    </p>
                  </div>
                )}

                {/* Rules Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Tournament Rules & Integrity Guidelines
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {selectedTournament.rules && selectedTournament.rules.length > 0 ? (
                      selectedTournament.rules.map((rule, idx) => (
                        <li key={idx} className="p-2.5 bg-zinc-950/45 border border-zinc-850 rounded-xl text-zinc-400 italic">
                          • {rule}
                        </li>
                      ))
                    ) : (
                      <li className="p-2 bg-zinc-950/45 border border-zinc-850 rounded text-zinc-500 italic md:col-span-2 text-center font-mono">
                        No custom rules submitted. Fairplay & standard anti-cheat terms mandate.
                      </li>
                    )}
                  </ul>
                </div>

                {/* Deadlines Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Crucial Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-zinc-950/50 border border-zinc-855 rounded-xl space-y-1">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase font-black block tracking-widest text-zinc-645">REGISTRATION ENDS</span>
                      <span className="text-[11px] font-mono font-extrabold text-rose-400 block">
                        {formatDateString(selectedTournament.registration_deadline, "Open until start")}
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-950/50 border border-zinc-855 rounded-xl space-y-1">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase font-black block tracking-widest text-zinc-645">TOURNAMENT BEGINS</span>
                      <span className="text-[11px] font-mono font-extrabold text-cyan-400 block">
                        {formatDateString(selectedTournament.tournament_start, "TBD")}
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-950/50 border border-zinc-855 rounded-xl space-y-1">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase font-black block tracking-widest text-zinc-645">TOURNAMENT CLOSES</span>
                      <span className="text-[11px] font-mono font-extrabold text-zinc-300 block">
                        {formatDateString(selectedTournament.tournament_end, "TBD")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Schedule / timeline map */}
                {selectedTournament.schedule && selectedTournament.schedule.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider flex items-center gap-1">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Lobbies & Broadcast Schedule
                    </h4>
                    <div className="bg-zinc-950 rounded-2xl border border-zinc-850 p-3 divider-y divide-zinc-850 overflow-hidden">
                      {selectedTournament.schedule.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 hover:bg-zinc-900/40 rounded transition-colors">
                          <span className="font-bold text-zinc-300 font-mono">{item.event}</span>
                          <span className="text-[10px] text-zinc-550 font-mono bg-zinc-900 py-1 px-2.5 rounded border border-zinc-805">{item.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Tournament Seeding Bracket */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-rose-500" />
                    Tournament Bracket System
                  </h4>

                  {isLoadingMatches ? (
                    <p className="text-xs text-zinc-500 font-mono italic">Loading matches database...</p>
                  ) : selectedTourneyMatches.length > 0 ? (
                    <div className="space-y-4">
                      {/* Check if current user is participating, and show their next opponent & match details */}
                      {(() => {
                        const myMatch = selectedTourneyMatches.find(m => {
                          const p1Id = selectedTournament.registrationType === 'solo' ? m.player1UserId : m.team1Id;
                          const p2Id = selectedTournament.registrationType === 'solo' ? m.player2UserId : m.team2Id;

                          if (selectedTournament.registrationType === 'solo') {
                            return currentUser && (currentUser.id === p1Id || currentUser.id === p2Id);
                          } else {
                            // find if user belongs to team1 or team2
                            return userTeams.some(ut => ut.id === p1Id || ut.id === p2Id);
                          }
                        });

                        if (myMatch) {
                          const isSolo = selectedTournament.registrationType === 'solo';
                          const myId = isSolo 
                            ? currentUser?.id 
                            : userTeams.find(ut => {
                                const p1Id = myMatch.team1Id;
                                const p2Id = myMatch.team2Id;
                                return ut.id === p1Id || ut.id === p2Id;
                              })?.id;

                          const opponentId = isSolo
                            ? (myMatch.player1UserId === myId ? myMatch.player2UserId : myMatch.player1UserId)
                            : (myMatch.team1Id === myId ? myMatch.team2Id : myMatch.team1Id);

                          const getParticipantName = (id: string | null | undefined, type: 'solo' | 'team') => {
                            if (!id) return "BYE";
                            if (type === 'solo') {
                              const user = users.find(u => u.id === id);
                              return user ? (user.gamerName || user.username || user.email || 'Gamer') : 'BYE';
                            } else {
                              const team = allTeams.find(ti => ti.id === id);
                              return team ? team.name : 'BYE';
                            }
                          };

                          const myName = getParticipantName(myId, selectedTournament.registrationType || 'solo');
                          const oppName = getParticipantName(opponentId, selectedTournament.registrationType || 'solo');

                          return (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5 animate-pulse">
                              <span className="text-[9px] font-mono font-black text-rose-400 uppercase tracking-widest block">🎯 YOUR UPCOMING ARENA BOUT</span>
                              <p className="text-xs text-zinc-300">
                                You ({myName}) will clash with <strong className="text-rose-400">{oppName}</strong> in Round {myMatch.roundNumber}.
                              </p>
                              {myMatch.status === 'live' && (
                                <span className="inline-block text-[8px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded animate-pulse uppercase tracking-wider mt-1">
                                  YOUR MATCH IS LIVE NOW!
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Visually map each round column */}
                      <div className="space-y-4">
                        {Array.from({ length: Math.max(...selectedTourneyMatches.map(m => m.roundNumber), 0) }, (_, rIdx) => {
                          const roundNum = rIdx + 1;
                          const roundMatches = selectedTourneyMatches.filter(m => m.roundNumber === roundNum);
                          const totalRounds = Math.max(...selectedTourneyMatches.map(m => m.roundNumber), 0);

                          const getRoundLabel = (rn: number, tr: number) => {
                            if (rn === tr) return "Grand Final";
                            if (rn === tr - 1) return "Semi-Finals";
                            if (rn === tr - 2) return "Quarter-Finals";
                            return `Round of ${Math.pow(2, tr - rn + 1)}`;
                          };

                          return (
                            <div key={roundNum} className="space-y-2">
                              <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-wide block border-b border-zinc-800/40 pb-1">
                                {getRoundLabel(roundNum, totalRounds)}
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {roundMatches.map(match => {
                                  const p1Id = selectedTournament.registrationType === 'solo' ? match.player1UserId : match.team1Id;
                                  const p2Id = selectedTournament.registrationType === 'solo' ? match.player2UserId : match.team2Id;

                                  const p1Name = getParticipantGlobalName(p1Id, selectedTournament.registrationType || 'solo');
                                  const p2Name = getParticipantGlobalName(p2Id, selectedTournament.registrationType || 'solo');

                                  const winnerId = selectedTournament.registrationType === 'solo' ? match.winnerUserId : match.winnerTeamId;
                                  const result = selectedTourneyResults.find(r => r.match_id === match.id);

                                  return (
                                    <div key={match.id} className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3 shadow-md relative">
                                      <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                                        <span className="font-bold uppercase tracking-wider">Match #{match.matchNumber}</span>
                                        <span className={`px-2 py-0.5 rounded-md border text-[8px] font-bold uppercase ${
                                          match.status === 'live' 
                                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                                            : match.status === 'completed' 
                                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                              : match.status === 'disputed'
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-550 animate-bounce'
                                                : 'bg-zinc-900 border-zinc-805 text-zinc-400'
                                        }`}>
                                          {match.status}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center gap-2">
                                        <div className={`flex-1 text-center py-2 px-3 rounded-xl border truncate text-xs ${
                                          winnerId && winnerId === p1Id && p1Id !== null
                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.15)] animate-pulse'
                                            : 'bg-zinc-900/60 border-zinc-850/60 text-zinc-300'
                                        }`}>
                                          {p1Name}
                                        </div>
                                        <span className="text-[9px] font-mono font-black text-zinc-550">VS</span>
                                        <div className={`flex-1 text-center py-2 px-3 rounded-xl border truncate text-xs ${
                                          winnerId && winnerId === p2Id && p2Id !== null
                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.15)] animate-pulse'
                                            : 'bg-zinc-900/60 border-zinc-850/60 text-zinc-300'
                                        }`}>
                                          {p2Name}
                                        </div>
                                      </div>

                                      {/* Match outcome like score, screenshot, admin notes if any exists */}
                                      {result && (
                                        <div className="pt-2.5 border-t border-zinc-900 space-y-1.5 text-[10px] font-mono">
                                          {result.score && (
                                            <div className="flex justify-between">
                                              <span className="text-zinc-500 uppercase text-[8px] tracking-widest">SCORE</span>
                                              <span className="text-amber-400 font-bold">{result.score}</span>
                                            </div>
                                          )}
                                          {result.notes && (
                                            <div className="text-zinc-400 bg-zinc-900/40 p-2 rounded-xl border border-zinc-850/50">
                                              <span className="text-[8px] text-amber-500/70 font-bold uppercase block tracking-wider">RESULT NOTE</span>
                                              {result.notes}
                                            </div>
                                          )}
                                          {result.result_screenshot_url && (
                                            <div className="space-y-1">
                                              <span className="text-zinc-550 text-[8px] uppercase block tracking-wider">PROOF SCREENSHOT</span>
                                              <a 
                                                href={result.result_screenshot_url} 
                                                target="_blank" 
                                                referrerPolicy="no-referrer"
                                                rel="noopener noreferrer"
                                                className="block overflow-hidden rounded-lg border border-zinc-800 hover:border-amber-550/40 transition-colors"
                                              >
                                                <img 
                                                  src={result.result_screenshot_url} 
                                                  alt="match_screenshot" 
                                                  referrerPolicy="no-referrer"
                                                  className="w-full h-20 object-cover hover:scale-105 transition-transform"
                                                />
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Match History List */}
                      {selectedTourneyMatches.some(m => m.status === 'completed' || m.status === 'disputed') && (
                        <div className="space-y-3 pt-5 border-t border-zinc-900 mt-6 md:p-1">
                          <h4 className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-rose-500" />
                            Arena Match History & Log
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                            {selectedTourneyMatches
                              .filter(m => m.status === 'completed' || m.status === 'disputed')
                              .map(m => {
                                const isSolo = selectedTournament.registrationType === 'solo';
                                const p1Id = isSolo ? m.player1UserId : m.team1Id;
                                const p2Id = isSolo ? m.player2UserId : m.team2Id;
                                
                                const p1Name = getParticipantGlobalName(p1Id, selectedTournament.registrationType || 'solo');
                                const p2Name = getParticipantGlobalName(p2Id, selectedTournament.registrationType || 'solo');
                                const winnerName = getParticipantGlobalName(isSolo ? m.winnerUserId : m.winnerTeamId, selectedTournament.registrationType || 'solo');
                                const res = selectedTourneyResults.find(r => r.match_id === m.id);

                                return (
                                  <div key={m.id} className="p-3 bg-zinc-950 border border-zinc-850/60 rounded-xl space-y-1.5 shadow-sm">
                                    <div className="flex justify-between items-center text-[9px] font-mono leading-none border-b border-zinc-900 pb-1">
                                      <span className="text-zinc-500 font-bold">R{m.roundNumber} - MATCH #{m.matchNumber}</span>
                                      <span className={`px-1 rounded text-[8px] font-bold uppercase ${
                                        m.status === 'completed' ? 'text-emerald-400' : 'text-amber-500'
                                      }`}>
                                        {m.status}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-300 font-sans leading-snug">
                                      <strong className="text-white">{p1Name}</strong> vs <strong className="text-white">{p2Name}</strong>
                                    </p>
                                    <div className="flex justify-between items-center text-[9.5px] font-mono mt-1">
                                      <span className="text-zinc-500">🏆 Win: <strong className="text-emerald-400 font-bold">{winnerName}</strong></span>
                                      {res?.score && <span className="text-zinc-500 leading-none">Score: <strong className="text-amber-400 font-bold">{res.score}</strong></span>}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-950/40 border border-dashed border-zinc-855 rounded-xl text-center">
                      <p className="text-xs text-zinc-500 font-mono italic">No bracket matchups loaded yet.</p>
                      <p className="text-[10px] text-zinc-650 mt-1">Seeding will configure once entries close and administrators lock brackets.</p>
                    </div>
                  )}
                </div>

                {/* Action Row */}
                <div className="pt-6 border-t border-zinc-800/60 flex flex-col md:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-xs py-3 rounded-2xl uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Close Details
                  </button>

                  {/* Register placeholder for next phase */}
                  {selectedTournament.status !== 'completed' && selectedTournament.status !== 'cancelled' ? (
                    (() => {
                      const activeRegDetailModal = currentUser ? (registrations || []).find(r => r.tournament_id === selectedTournament.id && r.user_id === currentUser.id && r.status === 'registered') : null;
                      if (activeRegDetailModal) {
                        return (
                          <div className="flex-1 flex flex-col gap-2">
                            <div className="bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2 font-black">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                              You are registered (Seat #{getSeatNumber(activeRegDetailModal)})
                            </div>
                            {onCancelRegistration && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDetailModal(false);
                                  onCancelRegistration(selectedTournament.id);
                                }}
                                className="bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-400 hover:text-white py-2.5 rounded-2xl font-mono text-xs font-bold uppercase tracking-widest text-center transition-colors cursor-pointer"
                              >
                                Exit Tournament (25% Refund)
                              </button>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setShowDetailModal(false);
                              openRegistration(selectedTournament);
                            }}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-3 rounded-2xl text-xs font-mono tracking-widest uppercase transition-all neon-glow-emerald cursor-pointer"
                          >
                            🚀 Enter Arena
                          </button>
                        );
                      }
                    })()
                  ) : (
                    <div className="flex-1 bg-zinc-950 text-zinc-600 border border-zinc-855/80 py-3 rounded-2xl font-mono text-xs uppercase tracking-widest text-center cursor-not-allowed">
                      ❌ Signups Closed / Cancelled
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Modal Form */}
      <AnimatePresence>
        {showRegModal && selectedTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowRegModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 z-10 space-y-4 neon-glow-emerald"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <h3 className="text-xl font-bold font-display text-white">ARENA REGISTRATION</h3>
                <button
                  onClick={() => setShowRegModal(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 text-xs">
                <p className="text-zinc-505 font-mono text-[9px] text-zinc-600">SELECTED TOURNAMENT</p>
                <p className="text-white font-bold text-sm mt-0.5">{selectedTournament.title}</p>
                <div className="flex justify-between text-zinc-400 mt-1.5 font-mono text-[10px]">
                  <span>SUPPORTED GAME: {selectedTournament.game}</span>
                  <span className="text-amber-400">PRIZE: {selectedTournament.prizePool || selectedTournament.prize_pool || 'Free'}</span>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-bold">Registration Format</label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl">
                    <button
                      type="button"
                      disabled={selectedTournament.registrationType === 'team'}
                      onClick={() => setSelectedRegType('solo')}
                      className={`py-2 text-[10px] font-mono font-bold rounded-lg transition-all ${
                        selectedRegType === 'solo' ? 'bg-emerald-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                      } ${selectedTournament.registrationType === 'team' ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      SOLO REGISTRATION
                    </button>
                    <button
                      type="button"
                      disabled={selectedTournament.registrationType === 'solo'}
                      onClick={() => setSelectedRegType('team')}
                      className={`py-2 text-[10px] font-mono font-bold rounded-lg transition-all ${
                        selectedRegType === 'team' ? 'bg-emerald-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                      } ${selectedTournament.registrationType === 'solo' ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      SQUAD REGISTRATION
                    </button>
                  </div>
                  {selectedTournament.registrationType === 'team' && (
                    <span className="text-[10px] text-zinc-550 mt-1 block">This tournament strictly mandates competitive squad registration.</span>
                  )}
                </div>

                {selectedRegType === 'team' && (
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-semibold">Choose Squad Roster *</label>
                    <select
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:border-emerald-500 rounded-xl px-3 py-2.5 focus:outline-none"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      <option value="">-- Choose Your Created Squad --</option>
                      {userTeams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name} ({team.game})</option>
                      ))}
                    </select>
                    {userTeams.length === 0 && (
                      <p className="text-[11px] text-rose-450 mt-1.5 italic font-mono">You haven't formed any squads yet! Please build one in the Team Finder tab before signing up.</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-semibold">Point of Contact Email/Discord *</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-emerald-500 rounded-xl px-4 py-2.5 focus:outline-none"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                  <p className="text-[10px] text-zinc-500 mt-1.5 font-sans leading-relaxed">We will send match lobbies, access codes, and stream brackets here.</p>
                </div>

                {/* Promo Coupon Application Block */}
                {selectedTournament.entryFee && selectedTournament.entryFee.toLowerCase() !== 'free' && selectedTournament.entryFee !== '0' && (
                  <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2">
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">Apply Coupon Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. BATTLE20, TOURNEY50"
                        className="flex-grow bg-zinc-900 border border-zinc-800 text-xs px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 rounded-xl font-mono uppercase"
                        value={tournamentCouponCode}
                        onChange={(e) => setTournamentCouponCode(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleApplyTourneyCoupon}
                        className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-[10px] font-mono text-zinc-350 rounded-xl font-bold transition-all cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {tourneyDiscountSummary ? (
                      <div className="flex justify-between items-center text-[10px] font-mono mt-1 text-emerald-400">
                        <span>Original: {tourneyDiscountSummary.original} Fee</span>
                        <span>Discounted Pay: <strong className="font-extrabold">{tourneyDiscountSummary.final}</strong></span>
                      </div>
                    ) : (
                      <p className="text-[9px] text-zinc-500 font-mono">Standard rates apply unless a valid active coupon is entered.</p>
                    )}
                  </div>
                )}

                {/* Entry fee payments section */}
                {selectedTournament.entryFee && selectedTournament.entryFee.toLowerCase() !== 'free' && selectedTournament.entryFee !== '0' && (
                  <div className="bg-zinc-950 p-4 rounded-xl border border-rose-500/10 space-y-3.5">
                    <div className="flex justify-between items-center bg-zinc-90 w-full animate-pulse">
                      <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-bold">MATCH DEPLOY ENTRY FEE MANDATED *</span>
                      <span className="text-red-500 text-xs font-mono font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{selectedTournament.entryFee}</span>
                    </div>

                    <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 space-y-2 flex flex-col items-center">
                      <p className="text-[10px] text-zinc-400 font-mono text-center">Scan UPI QR to deposit match entry fee:</p>
                      
                      {/* Interactive beautiful QR Display */}
                      <img 
                        src={adminSettings?.qrCodeUrl || "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=400"} 
                        alt="E-Sports League Payment QR" 
                        referrerPolicy="no-referrer"
                        className="w-32 h-32 rounded-lg border border-zinc-800 p-1.5 bg-white" 
                      />
                      
                      <div className="text-center mt-1">
                        <p className="text-[10px] font-mono text-zinc-500">Scan code above to secure instant seat</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-semibold">Transaction Reference ID (UTR) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 12-digit payment reference"
                          className="w-full bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-650 focus:border-red-500 rounded-xl px-3 py-2 focus:outline-none font-mono"
                          value={txnId}
                          onChange={(e) => setTxnId(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-semibold">Verify Screens Transfer Screenshot *</label>
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Paste payment screenshot URL"
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-650 focus:border-red-500 rounded-xl px-3 py-2 focus:outline-none"
                            value={screenshotUrl}
                            onChange={(e) => setScreenshotUrl(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <label className="border border-zinc-800 hover:border-zinc-700 bg-zinc-900 px-3 py-1.5 rounded-lg text-[10px] font-mono text-zinc-400 cursor-pointer flex items-center gap-1.5 transition-all">
                              <Upload className="w-3.5 h-3.5" />
                              Upload Screens Mock
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleScreenshotFileChange} 
                              />
                            </label>
                            {screenshotUrl && (
                              <span className="text-[9.5px] font-mono text-emerald-400 flex items-center">✓ Proof Synced!</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Highlighted Cancellation Policy Note */}
                <div className="bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/25 space-y-1">
                  <p className="text-[9.5px] font-mono font-black text-amber-400 uppercase tracking-widest block">Important Notice</p>
                  <p className="text-[10.5px] text-zinc-350 font-sans leading-relaxed">
                    If you leave/cancel your tournament registration before the room starts, only <strong className="text-amber-400 font-bold">25% of the registration diamonds</strong> will be refunded. To join again, you must pay the full registration fee once more.
                  </p>
                </div>

                {/* Rules Checklist */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-1.5">
                  <p className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase font-black">REGISTRATION DECLARATION</p>
                  <div className="text-[10px] text-zinc-550 space-y-1">
                    <p>✓ I verify our roster matches integrity rules.</p>
                    <p>✓ Stream streams sniping, griefing, or macro usage are causes for disqualification.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all neon-glow-emerald cursor-pointer"
                  >
                    SUBMIT VERIFICATION SIGNUP
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AdSense-ready tournament page slot */}
      <AdSenseSlot slotType="tournament" className="mt-8" />
    </div>
  );
}
