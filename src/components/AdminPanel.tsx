import React, { useState } from 'react';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings } from '../types';
import { ShieldAlert, LogOut, Users, Trophy, DollarSign, Image, Gift, Percent, Plus, Trash, Check, X, Ban, Sparkles, TrendingUp, KeyRound, Sparkle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  users: UserProfile[];
  teams: Team[];
  tournaments: Tournament[];
  sponsors: SponsorApplication[];
  adminSettings: AdminSettings;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  // State update callbacks
  onBanUser: (userId: string) => void;
  onUnbanUser: (userId: string) => void;
  onToggleFeaturedUser: (userId: string) => void;
  onDeleteProfile: (userId: string) => void;
  onApprovePayment: (userId: string) => void;
  onRejectPayment: (userId: string) => void;
  onApproveTournamentRegistration: (tourneyId: string, registrantId: string) => void;
  onRejectTournamentRegistration: (tourneyId: string, registrantId: string) => void;
  onApproveSponsorApplication: (applicationId: string) => void;
  onRejectSponsorApplication: (applicationId: string) => void;
  onCreateTournament: (tourney: Omit<Tournament, 'id' | 'registrants' | 'winners' | 'bracket'>) => void;
  onUpdateQrCode: (newUrl: string) => void;
  onAddCoupon: (code: string, discount: number) => void;
  onRemoveCoupon: (code: string) => void;
  onUpdateAdminSettings: (settings: AdminSettings) => void;
}

export default function AdminPanel({
  users,
  teams,
  tournaments,
  sponsors,
  adminSettings,
  addToast,
  onBanUser,
  onUnbanUser,
  onToggleFeaturedUser,
  onDeleteProfile,
  onApprovePayment,
  onRejectPayment,
  onApproveTournamentRegistration,
  onRejectTournamentRegistration,
  onApproveSponsorApplication,
  onRejectSponsorApplication,
  onCreateTournament,
  onUpdateQrCode,
  onAddCoupon,
  onRemoveCoupon,
  onUpdateAdminSettings
}: AdminPanelProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Tab routing
  const [activeTab, setActiveTab ] = useState<'analytics' | 'users' | 'tournaments' | 'payments' | 'coupons' | 'sponsors' | 'membership_benefits'>('analytics');

  // New Tournament States
  const [newTourneyTitle, setNewTourneyTitle] = useState('');
  const [newTourneyGame, setNewTourneyGame] = useState('Valorant');
  const [newTourneyPrize, setNewTourneyPrize] = useState('₹50,000');
  const [newTourneyMaxTeams, setNewTourneyMaxTeams] = useState('16');
  const [newTourneyRegType, setNewTourneyRegType] = useState<'solo' | 'team'>('team');
  const [newTourneyRules, setNewTourneyRules] = useState('');
  const [newTourneySchedule, setNewTourneySchedule] = useState('');

  // Coupon addition states
  const [couponCode, setCouponCode] = useState('');
  const [couponPercent, setCouponPercent] = useState('10');

  // QR config
  const [qrCodeInput, setQrCodeInput] = useState(adminSettings.qrCodeUrl);

  // Dynamic Premium Catalog Creation States
  const [badgeName, setBadgeName] = useState('');
  const [badgeTier, setBadgeTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [badgeIcon, setBadgeIcon] = useState('🥈 ');

  const [stickerPackName, setStickerPackName] = useState('');
  const [stickerPackTier, setStickerPackTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [stickerPackEmojis, setStickerPackEmojis] = useState('🧪, 🧬, 🚀, 🛸');

  const [frameName, setFrameName] = useState('');
  const [frameTier, setFrameTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [frameStyle, setFrameStyle] = useState('ring-4 ring-blue-500 ring-offset-2 ring-offset-zinc-950');

  const [bannerName, setBannerName] = useState('');
  const [bannerTier, setBannerTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Gold');
  const [bannerStyle, setBannerStyle] = useState('bg-gradient-to-r from-teal-600 to-emerald-800 border-b border-teal-400');

  const [rewardName, setRewardName] = useState('');
  const [rewardTier, setRewardTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [rewardDesc, setRewardDesc] = useState('');

  // Delete confirm popups states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Authenticate
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === 'Admin@123') {
      setIsAdminLoggedIn(true);
      setLoginError('');
      addToast("Administrative authentication successful! Welcome Commander.", "success");
    } else {
      setLoginError('Wrong username or password');
      addToast("Authentication request rejected.", "error");
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setUsername('');
    setPassword('');
    addToast("Administrative session closed safely.", "info");
  };

  // Tournament submit handler
  const handleCreateTourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyTitle.trim()) {
      addToast("Tournament title is mandated!", "warning");
      return;
    }

    // Parse schedules split by comma or newline
    const scheduleItems = newTourneySchedule.split(',').map((item, idx) => {
      const parts = item.split(':');
      return {
        date: parts[0]?.trim() || "2026-06-15",
        event: parts[1]?.trim() || "Round robin match"
      };
    });

    // Parse rules
    const rulesList = newTourneyRules.split('\n').filter(r => r.trim().length > 0);

    onCreateTournament({
      title: newTourneyTitle,
      game: newTourneyGame,
      prizePool: newTourneyPrize,
      maxTeams: parseInt(newTourneyMaxTeams) || 16,
      registrationType: newTourneyRegType,
      status: 'upcoming',
      rules: rulesList.length > 0 ? rulesList : ["1. Fairplay mandatory.", "2. Double check schedules."],
      schedule: scheduleItems
    });

    addToast(`Successfully configured brand new tournament "${newTourneyTitle}"`, "success");
    setNewTourneyTitle('');
    setNewTourneyRules('');
    setNewTourneySchedule('');
  };

  const submitAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    const pct = parseInt(couponPercent) || 10;
    onAddCoupon(code, pct);
    addToast(`Active percentage coupon ${code} added!`, "success");
    setCouponCode('');
  };

  const submitQrCodeUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeInput.trim()) return;
    onUpdateQrCode(qrCodeInput);
    addToast("Core dynamic UPI QR gateway updated!", "success");
  };

  // Submit handlers for Premium catalogs
  const submitAddBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeName.trim() || !badgeIcon.trim()) {
      addToast("Badge specifications required", "warning");
      return;
    }
    const currentBadges = adminSettings.badges || [];
    const updated = {
      ...adminSettings,
      badges: [...currentBadges, {
        id: `badge-${Date.now()}`,
        name: badgeName,
        tier: badgeTier,
        icon: badgeIcon
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new badge catalog entry: "${badgeName}"`, "success");
    setBadgeName('');
  };

  const submitRemoveBadge = (id: string) => {
    const currentBadges = adminSettings.badges || [];
    const updated = {
      ...adminSettings,
      badges: currentBadges.filter(b => b.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Badge removed from active configuration", "info");
  };

  const submitAddStickerPack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stickerPackName.trim() || !stickerPackEmojis.trim()) {
      addToast("Sticker pack specs required", "warning");
      return;
    }
    const stickerList = stickerPackEmojis.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const currentPacks = adminSettings.stickerPacks || [];
    const updated = {
      ...adminSettings,
      stickerPacks: [...currentPacks, {
        id: `pack-${Date.now()}`,
        name: stickerPackName,
        tier: stickerPackTier,
        stickers: stickerList
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new premium stickers catalog entry: "${stickerPackName}"`, "success");
    setStickerPackName('');
    setStickerPackEmojis('');
  };

  const submitRemoveStickerPack = (id: string) => {
    const currentPacks = adminSettings.stickerPacks || [];
    const updated = {
      ...adminSettings,
      stickerPacks: currentPacks.filter(p => p.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Sticker pack removed from database", "info");
  };

  const submitAddProfileFrame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frameName.trim() || !frameStyle.trim()) {
      addToast("Frame specs required", "warning");
      return;
    }
    const currentFrames = adminSettings.profileFrames || [];
    const updated = {
      ...adminSettings,
      profileFrames: [...currentFrames, {
        id: `frame-${Date.now()}`,
        name: frameName,
        tier: frameTier,
        style: frameStyle
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new profile frame catalog entry: "${frameName}"`, "success");
    setFrameName('');
    setFrameStyle('');
  };

  const submitRemoveProfileFrame = (id: string) => {
    const currentFrames = adminSettings.profileFrames || [];
    const updated = {
      ...adminSettings,
      profileFrames: currentFrames.filter(f => f.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Profile frame configuration retracted", "info");
  };

  const submitAddProfileBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerName.trim() || !bannerStyle.trim()) {
      addToast("Banner specifications required", "warning");
      return;
    }
    const currentBanners = adminSettings.profileBanners || [];
    const updated = {
      ...adminSettings,
      profileBanners: [...currentBanners, {
        id: `banner-${Date.now()}`,
        name: bannerName,
        tier: bannerTier,
        style: bannerStyle
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new profile banner catalog entry: "${bannerName}"`, "success");
    setBannerName('');
    setBannerStyle('');
  };

  const submitRemoveProfileBanner = (id: string) => {
    const currentBanners = adminSettings.profileBanners || [];
    const updated = {
      ...adminSettings,
      profileBanners: currentBanners.filter(b => b.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Profile banner configuration retracted", "info");
  };

  const submitAddPremiumReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName.trim() || !rewardDesc.trim()) {
      addToast("Reward details required", "warning");
      return;
    }
    const currentRewards = adminSettings.premiumRewards || [];
    const updated = {
      ...adminSettings,
      premiumRewards: [...currentRewards, {
        id: `reward-${Date.now()}`,
        name: rewardName,
        tier: rewardTier,
        description: rewardDesc
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new premium reward catalog entry: "${rewardName}"`, "success");
    setRewardName('');
    setRewardDesc('');
  };

  const submitRemovePremiumReward = (id: string) => {
    const currentRewards = adminSettings.premiumRewards || [];
    const updated = {
      ...adminSettings,
      premiumRewards: currentRewards.filter(r => r.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Premium reward configuration retracted", "info");
  };

  const triggerDelete = (userId: string) => {
    onDeleteProfile(userId);
    setDeleteConfirmId(null);
    addToast("Spam player account destroyed from systems archive.", "success");
  };

  // Metrics calculators
  const premiumUsersCount = users.filter(u => u.membership !== 'Free' && u.membershipStatus === 'active').length;
  const pendingPayments = users.filter(u => u.membershipStatus === 'pending');
  const totalEsportsRevenue = users.reduce((acc, curr) => {
    if (curr.membershipStatus !== 'active') return acc;
    const tierPricing = { Free: 0, Silver: 49, Gold: 99, Platinum: 199 };
    return acc + (tierPricing[curr.membership] || 0);
  }, 0);

  // If Admin is not logged, show standard terminal secure logingate
  if (!isAdminLoggedIn) {
    return (
      <div className="flex justify-center items-center py-12 md:py-20 px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 md:p-8 max-w-md w-full relative overflow-hidden neon-glow-pink"
        >
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-pink-500 to-red-600 animate-pulse"></div>

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-2xl font-black font-display text-white tracking-wider">ADMIN GATEWAY</h2>
            <p className="text-zinc-500 text-xs mt-1 font-mono uppercase tracking-widest">Stateful Administrative Terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Commander ID</label>
              <input
                type="text"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Passphrase Security</label>
              <input
                type="password"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-400 font-mono bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all shadow-md mt-2"
            >
              INITIALIZE COMMAND PATH
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="p-6 bg-zinc-900 border border-red-600/30 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500 w-7 h-7" />
            ADMIN CONTROL TERMINAL
          </h1>
          <p className="text-zinc-500 font-mono text-xs mt-1 uppercase tracking-wider">Gaming Career Hub Master Console</p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-red-400 hover:text-red-500 font-mono text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          LOGOUT COMMANDER
        </button>
      </div>

      {/* Horizontal Category Nav */}
      <div className="flex flex-wrap gap-2 bg-zinc-900/40 p-2 border border-zinc-850 rounded-2xl">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'analytics' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          SYS METRICS
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'users' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          PLAYER MANAGE
        </button>
        <button
          onClick={() => setActiveTab('tournaments')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'tournaments' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          TOURNAMENTS & REGISTRANTS
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'payments' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          MEMBERSHIP INVOICES
          {pendingPayments.length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-amber-500 text-zinc-950 font-black font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900 animate-pulse">
              {pendingPayments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'coupons' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          PROMO CODES & QR
        </button>
        <button
          onClick={() => setActiveTab('sponsors')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'sponsors' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          BRAND PROPOSALS
          {sponsors.filter(s => s.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-rose-500 text-white font-black font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900">
              {sponsors.filter(s => s.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('membership_benefits')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'membership_benefits' ? 'bg-red-600 text-white shadow' : "text-zinc-400 hover:text-white"
          }`}
        >
          👑 BENEFITS MANAGER
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-805/85 rounded-2xl backdrop-blur-xl">
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">High-impact Intelligence Metric Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Registered Operatives</p>
                <p className="text-3xl font-black text-white mt-1 font-display">{users.length}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Total active database registers</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Esports Squads formed</p>
                <p className="text-3xl font-black text-cyan-400 mt-1 font-display">{teams.length}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Recruiting coalitions built</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Premium Athletes</p>
                <p className="text-3xl font-black text-amber-400 mt-1 font-display">{premiumUsersCount}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Silver/Gold/Platinum memberships</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Total Revenue pool</p>
                <p className="text-3xl font-black text-emerald-400 mt-1 font-display">₹{totalEsportsRevenue}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Calculated verified pass subscriptions</span>
              </div>
            </div>

            {/* Quick action notifications warnings */}
            {pendingPayments.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl flex items-center justify-between">
                <span className="font-mono flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  COMMAND ALERT: You have {pendingPayments.length} pending custom member payment receipts looking for verification!
                </span>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="bg-amber-400 text-zinc-950 hover:bg-amber-500 font-mono px-3 py-1 font-bold text-[10px] rounded"
                >
                  RESOLVE NOW
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Operational Player Directory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-950/60 font-mono py-2.5 uppercase text-zinc-400">
                    <th className="p-3 pl-4">Gamer Profile</th>
                    <th className="p-3">Credentials</th>
                    <th className="p-3 text-center">MMR / KD</th>
                    <th className="p-3">Tier Status</th>
                    <th className="p-3 text-right pr-4">Tactical Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 font-sans">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-950/30">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <img src={u.profilePhoto} referrerPolicy="no-referrer" className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-white flex items-center gap-1">
                              {u.gamerName}
                              {u.isBanned && <span className="text-[8px] bg-red-650 bg-red-500/25 text-red-400 font-mono font-bold px-1 py-0.5 rounded">BANNED</span>}
                            </p>
                            <span className="text-[10px] text-zinc-500">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        {u.city}, {u.country}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="text-rose-400 font-bold">{u.skillRating} MMR</span> <span className="text-zinc-650">/</span> <span className="text-cyan-400">{u.kdRatio} KD</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-zinc-200">
                          {u.membership} ({u.membershipStatus.toUpperCase()})
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <button
                            onClick={() => onToggleFeaturedUser(u.id)}
                            className={`p-1.5 rounded transition-all font-mono font-bold text-[9px] uppercase border ${
                              u.isFeatured 
                                ? 'bg-amber-400/25 border-amber-400 text-amber-300' 
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            }`}
                            title="Boost Featured Banner List"
                          >
                            ⭐ {u.isFeatured ? 'Featured' : 'Regular'}
                          </button>

                          {u.isBanned ? (
                            <button
                              onClick={() => onUnbanUser(u.id)}
                              className="p-1.5 bg-zinc-950 border border-green-500/25 hover:border-green-500 text-green-400 rounded text-[9px] font-mono leading-none"
                            >
                              UNBAN
                            </button>
                          ) : (
                            <button
                              onClick={() => onBanUser(u.id)}
                              className="p-1.5 bg-zinc-950 border border-red-500/25 hover:border-red-500 text-red-400 rounded text-[9px] font-mono leading-none"
                            >
                              BAN
                            </button>
                          )}

                          {deleteConfirmId === u.id ? (
                            <div className="flex gap-1 bg-red-650 bg-red-600/10 border border-red-500 px-2 py-0.5 rounded items-center">
                              <span className="text-[9px] text-red-400 font-mono uppercase">CONFIRM?</span>
                              <button onClick={() => triggerDelete(u.id)} className="text-red-400 hover:text-white font-mono font-bold hover:underline py-0.5">YES</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="text-zinc-400 hover:text-white font-mono py-0.5">NO</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(u.id)}
                              className="p-1.5 bg-zinc-950 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[9px] font-mono leading-none"
                              title="Instantly Purge player records"
                            >
                              PURGE
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Assemble Arena Brackets</h3>

            {/* Create Tournament Form */}
            <form onSubmit={handleCreateTourneySubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-850">
              <h4 className="md:col-span-3 text-xs font-mono font-bold tracking-wider text-red-400 uppercase">Architect Simulator creation</h4>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Fire India Masters"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none focus:border-red-500 rounded"
                  value={newTourneyTitle}
                  onChange={(e) => setNewTourneyTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">FPS / Battle Royale Game</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-300 focus:outline-none focus:border-red-500 rounded"
                  value={newTourneyGame}
                  onChange={(e) => setNewTourneyGame(e.target.value)}
                >
                  <option value="Valorant">Valorant</option>
                  <option value="BGMI">BGMI</option>
                  <option value="Free Fire">Free Fire</option>
                  <option value="CS2">CS2</option>
                  <option value="COD Mobile">COD Mobile</option>
                  <option value="PUBG Mobile">PUBG Mobile</option>
                  <option value="GTA V">GTA V</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Prize pool format</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                  value={newTourneyPrize}
                  onChange={(e) => setNewTourneyPrize(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Max slots limit</label>
                <input
                  type="number"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                  value={newTourneyMaxTeams}
                  onChange={(e) => setNewTourneyMaxTeams(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Registration layout restrictions</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-300 focus:outline-none rounded font-mono"
                  value={newTourneyRegType}
                  onChange={(e) => setNewTourneyRegType(e.target.value as any)}
                >
                  <option value="solo">Solo Registered (Individually)</option>
                  <option value="team">Team Registered (Full squad)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Event Timetable lines (split by commas)</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-06-21: Qualifiers map, 2026-06-25: Finals lobby"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                  value={newTourneySchedule}
                  onChange={(e) => setNewTourneySchedule(e.target.value)}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Custom rule points (Split by newline)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. No emulators allowed. Safe anti-cheat mandations."
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 text-white focus:outline-none focus:border-red-500 rounded"
                  value={newTourneyRules}
                  onChange={(e) => setNewTourneyRules(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="md:col-span-3 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider"
              >
                DEPLOY BRACKET TO FRONT Arena
              </button>
            </form>

            {/* Active tournament applications to approve */}
            <div className="space-y-4 pt-4 border-t border-zinc-800/40">
              <h4 className="text-xs font-black font-mono tracking-widest text-zinc-400">ENROLLMENT REGISTRATION APPROVALS DECK</h4>

              {tournaments.flatMap(t => t.registrants.map(r => ({ ...r, tourneyId: t.id, tourneyTitle: t.title }))).length === 0 ? (
                <p className="text-zinc-500 font-mono text-xs pl-2 italic">No roster registrations active in databases.</p>
              ) : (
                <div className="space-y-2">
                  {tournaments.map(t => (
                    <div key={t.id} className="space-y-2">
                      {t.registrants.some(r => r.status === 'pending') && (
                        <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                          <p className="font-bold text-white text-xs">{t.title} Signups</p>
                          {t.registrants.filter(r => r.status === 'pending').map((r, idx) => (
                            <div key={r.id + idx} className="flex justify-between items-center text-xs p-2 bg-zinc-900 border border-zinc-800 rounded">
                              <div>
                                <p className="font-mono text-zinc-300">Name: <strong className="text-white font-sans">{r.name}</strong> ({r.type.toUpperCase()})</p>
                                <p className="text-[10px] text-zinc-500">Contact: {r.contactEmail} • Registered: {r.registeredAt}</p>
                              </div>

                              <div className="flex gap-1.5 font-mono">
                                <button
                                  onClick={() => onApproveTournamentRegistration(t.id, r.id)}
                                  className="bg-zinc-950 border border-green-500/35 px-2 py-1 hover:bg-green-500 hover:text-zinc-950 text-green-400 rounded text-[9px] font-bold"
                                >
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => onRejectTournamentRegistration(t.id, r.id)}
                                  className="bg-zinc-950 border border-red-500/35 px-2 py-1 hover:bg-red-500 hover:text-white text-red-500 rounded text-[9px] font-bold"
                                >
                                  REJECT
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Esports Pass Verification</h3>
            <p className="text-xs text-zinc-400">Match verified screenshot uploads and transaction ID trackers before approving membership tiers.</p>

            {pendingPayments.length === 0 ? (
              <div className="p-10 text-center bg-zinc-950/40 border border-zinc-850 rounded-xl">
                <Check className="w-10 h-10 text-green-400 mx-auto mb-2 animate-bounce" />
                <p className="text-xs text-zinc-500 font-mono italic">No pending payment validations. Everything cleared!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingPayments.map(user => (
                  <div key={user.id} className="p-4 bg-zinc-950/70 border border-zinc-805 rounded-xl space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center bg-zinc-90 w-full flex-wrap">
                      <span className="font-bold text-white text-sm">{user.gamerName}</span>
                      <span className="bg-amber-400/10 border border-amber-400/20 text-amber-400 font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                        {user.membership} Upgrade Request
                      </span>
                    </div>

                    <div className="space-y-1 bg-zinc-900 border border-zinc-850 p-3 rounded-lg text-[10px]/relaxed text-zinc-400">
                      <p>Txn Reference ID: <strong className="text-white font-sans text-xs">{user.membershipTxId}</strong></p>
                      <p>Screenshot Verification Proof: </p>
                      <a href={user.membershipScreenshot} target="_blank" rel="noopener noreferrer" className="text-cyan-400 truncate block hover:underline">
                        {user.membershipScreenshot}
                      </a>
                    </div>

                    {/* Screenshot image viewport snippet */}
                    {user.membershipScreenshot && (
                      <div className="border border-zinc-800/60 rounded overflow-hidden max-h-32 bg-black flex items-center justify-center">
                        <img src={user.membershipScreenshot} className="object-cover max-h-full max-w-full" />
                      </div>
                    )}

                    <div className="flex gap-2 font-mono pt-2 border-t border-zinc-800/50">
                      <button
                        onClick={() => onApprovePayment(user.id)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[10px] tracking-wide"
                      >
                        ✓ VERIFY & UNLOCK
                      </button>
                      <button
                        onClick={() => onRejectPayment(user.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white text-[10px] font-bold"
                      >
                        ✕ DECLINE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coupon additions */}
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Skins Discount Coupons</h3>

              <form onSubmit={submitAddCoupon} className="space-y-3 bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Coupon code symbol</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SQUAD25"
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white px-3 py-2 rounded focus:outline-none"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Rebate Percentage (%)</label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded focus:outline-none"
                    value={couponPercent}
                    onChange={(e) => setCouponPercent(e.target.value)}
                  >
                    <option value="10">10% OFF</option>
                    <option value="20">20% OFF</option>
                    <option value="30">30% OFF</option>
                    <option value="50">50% OFF</option>
                    <option value="100">100% FREE (Sponsor)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-mono font-bold py-2 rounded text-xs"
                >
                  ACTIVATE PROMO RULE
                </button>
              </form>

              {/* Coupons Active view */}
              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-850 space-y-2">
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">Active system rules codes:</p>
                {adminSettings.activeCoupons.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-zinc-900 border border-zinc-800 rounded font-mono">
                    <span>CODE: <strong className="text-white">{c.code}</strong> ({c.discountPercent}% OFF)</span>
                    <button onClick={() => onRemoveCoupon(c.code)} className="text-rose-500 hover:text-rose-600 font-bold p-1">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* QR upload gateway settings */}
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Core dynamic UPI QR gateway configuration</h3>

              <form onSubmit={submitQrCodeUpdate} className="space-y-3 bg-zinc-950 p-4 border border-zinc-800 rounded-xl font-mono text-xs">
                <div>
                  <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1">Image URL of the Scanner Code</label>
                  <input
                    type="url"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 text-[11px] text-white px-3 py-2 focus:border-red-500 outline-none rounded"
                    value={qrCodeInput}
                    onChange={(e) => setQrCodeInput(e.target.value)}
                  />
                </div>

                {qrCodeInput && (
                  <div className="border border-zinc-800 rounded overflow-hidden max-w-sm max-h-48 flex justify-center items-center p-2 bg-white">
                    <img src={qrCodeInput} className="object-contain max-h-full max-w-full" />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 py-2.5 rounded font-black text-xs"
                >
                  SAVE UPI SCANNERS LOG
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'sponsors' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Sponsor Application Screening</h3>
            <p className="text-xs text-zinc-400">Match verified statistics of gamers before approving sponsorship tracks with global partner brands.</p>

            {sponsors.length === 0 ? (
              <div className="p-10 text-center bg-zinc-950/40 border border-zinc-850 rounded-xl">
                <p className="text-xs text-zinc-500 font-mono italic">No sponsor pitches filed in database.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sponsors.map((app) => (
                  <div key={app.id} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-3 text-xs leading-relaxed font-mono">
                    <div className="flex justify-between items-center flex-wrap">
                      <span className="font-bold text-white text-sm">Gamer: {app.gamerName}</span>
                      <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded">
                        Target Brand: {app.brandName}
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-1.5 font-sans leading-relaxed">
                      <p className="text-zinc-400 italic text-xs">"{app.pitch}"</p>
                      <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>Combined Social Reach: {app.monthlyReach}</span>
                        <span>Official verification: {app.contactEmail}</span>
                      </div>
                    </div>

                    {app.status === 'pending' ? (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => onApproveSponsorApplication(app.id)}
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black rounded-lg text-[10px] uppercase font-mono tracking-wider transition-all"
                        >
                          ✓ CONNECT BRAND PARTNERSHIP
                        </button>
                        <button
                          onClick={() => onRejectSponsorApplication(app.id)}
                          className="px-3 py-1.5 bg-rose-500/10 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold font-mono transition-all"
                        >
                          ✕ DECLINE PITCH
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-500 uppercase font-bold pt-1 font-mono">
                        Application resolved status: <span className="text-white">{app.status}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'membership_benefits' && (
          <div className="space-y-8 font-mono text-xs">
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-505" />
                UPGRADE PERKS & MEMBERSHIP BENEFITS MANAGER
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">Directly build, audit, and authorize custom badges, premium stickers, profile glow frames, banners, and unlockable rewards.</p>
            </div>

            {/* Badges Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddBadge} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Sparkle className="w-4 h-4 text-amber-400" /> REGISTER TARGET BADGE</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Badge Title Name</label>
                  <input type="text" placeholder="e.g. Diamond Veteran Sniper" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px]" value={badgeName} onChange={e => setBadgeName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Badge Icon Badge / Label text (Emoji or Tag)</label>
                  <input type="text" placeholder="e.g. 💎 Radiant Master" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={badgeIcon} onChange={e => setBadgeIcon(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tied Minimum Premium Level</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={badgeTier} onChange={e => setBadgeTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier Pass</option>
                    <option value="Gold">Gold Tier Pass</option>
                    <option value="Platinum">Platinum VIP Pass</option>
                    <option value="All">All Tiers (Silver+)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Badge Catalog Entry</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Badges ({ (adminSettings.badges || []).length })</p>
                {(adminSettings.badges || []).map(b => (
                  <div key={b.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{b.name}</p>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">TIER: {b.tier} | ICON: <strong className="text-amber-400">{b.icon}</strong></span>
                    </div>
                    <button onClick={() => submitRemoveBadge(b.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticker Pack Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddStickerPack} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-rose-500" /> REGISTER STICKER PACK</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Pack Name</label>
                  <input type="text" placeholder="e.g. Neon Demonic Sigils" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={stickerPackName} onChange={e => setStickerPackName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Stickers Emotic List (Comma Separated)</label>
                  <input type="text" placeholder="👹, 👾, 👻, 💀, 🤡" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={stickerPackEmojis} onChange={e => setStickerPackEmojis(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tier Requirement</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={stickerPackTier} onChange={e => setStickerPackTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier</option>
                    <option value="Gold">Gold Tier</option>
                    <option value="Platinum">Platinum VIP Tier</option>
                    <option value="All">All Tiers</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Sticker Pack</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Packs ({ (adminSettings.stickerPacks || []).length })</p>
                {(adminSettings.stickerPacks || []).map(p => (
                  <div key={p.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{p.name}</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {p.stickers.map((s, i) => <span key={i} className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded select-none text-xs">{s}</span>)}
                      </div>
                      <span className="text-[9px] text-zinc-500 block mt-1">TIER: {p.tier}</span>
                    </div>
                    <button onClick={() => submitRemoveStickerPack(p.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Frames */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddProfileFrame} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-cyan-400" /> REGISTER PROFILE FRAMES</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Frame Name Title</label>
                  <input type="text" placeholder="e.g. Hologram Plasma Aura" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px]" value={frameName} onChange={e => setFrameName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tailwind Style Classes CSS</label>
                  <input type="text" placeholder="ring-4 ring-cyan-450 shadow-[0_0_12px_cyan]" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px] font-mono" value={frameStyle} onChange={e => setFrameStyle(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Unlock Tier</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={frameTier} onChange={e => setFrameTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier</option>
                    <option value="Gold">Gold Tier</option>
                    <option value="Platinum">Platinum VIP Tier</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Profile Frame</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Frames ({ (adminSettings.profileFrames || []).length })</p>
                {(adminSettings.profileFrames || []).map(f => (
                  <div key={f.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{f.name}</p>
                      <span className="text-[9px] text-zinc-500 block font-mono bg-zinc-900 px-1.5 py-1 rounded my-1 border border-zinc-800 truncate max-w-xs">{f.style}</span>
                      <span className="text-[9px] text-zinc-500 block">TIER: {f.tier}</span>
                    </div>
                    <button onClick={() => submitRemoveProfileFrame(f.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Banners */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddProfileBanner} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Image className="w-4 h-4 text-purple-400" /> REGISTER PROFILE BANNERS</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Banner Style Name</label>
                  <input type="text" placeholder="e.g. Electric Cyber Sunset" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={bannerName} onChange={e => setBannerName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tailwind Style Classes (or Image URL)</label>
                  <input type="text" placeholder="bg-gradient-to-r from-purple-800 via-pink-700 to-amber-700" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px] font-mono" value={bannerStyle} onChange={e => setBannerStyle(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Unlock Level</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={bannerTier} onChange={e => setBannerTier(e.target.value as any)}>
                    <option value="Gold">Gold Tier (Silver is standard black)</option>
                    <option value="Platinum">Platinum VIP Tier</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Profile Banner</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Banners ({ (adminSettings.profileBanners || []).length })</p>
                {(adminSettings.profileBanners || []).map(b => (
                  <div key={b.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{b.name}</p>
                      <span className="text-[9px] text-zinc-500 block font-mono bg-zinc-900 px-1.5 py-1 border border-zinc-800 rounded my-1 truncate max-w-xs">{b.style}</span>
                      <span className="text-[9px] text-zinc-500 block">TIER: {b.tier}</span>
                    </div>
                    <button onClick={() => submitRemoveProfileBanner(b.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Rewards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddPremiumReward} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Gift className="w-4 h-4 text-emerald-400" /> REGISTER PREMIUM REWARDS</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Reward System Title</label>
                  <input type="text" placeholder="e.g. Priority Sponsor Consultation Slots" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px]" value={rewardName} onChange={e => setRewardName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Detailed Reward Description</label>
                  <textarea placeholder="Write full description" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px] h-16 font-sans text-xs" value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Redemption Tier</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={rewardTier} onChange={e => setRewardTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier Pass</option>
                    <option value="Gold">Gold Tier Pass</option>
                    <option value="Platinum">Platinum VIP Pass</option>
                    <option value="All">All Tiers</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Premium Reward</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Rewards ({ (adminSettings.premiumRewards || []).length })</p>
                {(adminSettings.premiumRewards || []).map(r => (
                  <div key={r.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{r.name}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 font-sans leading-tight">"{r.description}"</p>
                      <span className="text-[9px] text-zinc-500 block mt-1">TIER: {r.tier}</span>
                    </div>
                    <button onClick={() => submitRemovePremiumReward(r.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
