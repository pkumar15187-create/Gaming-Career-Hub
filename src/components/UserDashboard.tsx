import React, { useState } from 'react';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings } from '../types';
import { User, Shield, Trophy, Users, Heart, Award, Sparkles, Bell, CreditCard, Gift, Save, Send, Trash, Edit2, Gamepad2, Info, Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { getUserProfileFrameClass, getUserProfileBannerStyle, getUserTierBadgeIcon } from '../lib/premiumUtils';

interface UserDashboardProps {
  currentUser: UserProfile;
  userTeams: Team[];
  userTournaments: Tournament[];
  sponsorApplications: SponsorApplication[];
  notifications: Notification[];
  savedPlayersList: UserProfile[];
  adminSettings: AdminSettings;
  onUpdateProfile: (updatedFields: Partial<UserProfile>) => void;
  onConfirmPayment: (membership: 'Silver' | 'Gold' | 'Platinum', txId: string, screenshotUrl: string) => void;
  onMarkNotificationRead: (notifId: string) => void;
  onUnsavePlayer: (savedUserId: string) => void;
  onSelectGamerProfile: (gamerUsername: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function UserDashboard({
  currentUser,
  userTeams,
  userTournaments,
  sponsorApplications,
  notifications,
  savedPlayersList,
  adminSettings,
  onUpdateProfile,
  onConfirmPayment,
  onMarkNotificationRead,
  onUnsavePlayer,
  onSelectGamerProfile,
  addToast
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'teams' | 'tournaments' | 'sponsors' | 'membership' | 'notifications' | 'favorites'>('profile');

  // Edit profile form states
  const [gamerName, setGamerName] = useState(currentUser.gamerName);
  const [bio, setBio] = useState(currentUser.bio);
  const [country, setCountry] = useState(currentUser.country);
  const [state, setState] = useState(currentUser.state);
  const [city, setCity] = useState(currentUser.city);
  const [youtube, setYoutube] = useState(currentUser.social.youtube || '');
  const [instagram, setInstagram] = useState(currentUser.social.instagram || '');
  const [discord, setDiscord] = useState(currentUser.social.discord || '');
  const [favGames, setFavGames ] = useState<string[]>(currentUser.favoriteGames);

  // Premium customizer selections
  const [activeSticker, setActiveSticker] = useState(currentUser.activeSticker || '');
  const [activeFrame, setActiveFrame] = useState(currentUser.activeFrame || '');
  const [activeBanner, setActiveBanner] = useState(currentUser.activeBanner || '');

  // Stats edit states
  const [kdRatio, setKdRatio] = useState(currentUser.kdRatio.toString());
  const [winRate, setWinRate] = useState(currentUser.winRate.toString());
  const [skillRating, setSkillRating] = useState(currentUser.skillRating.toString());

  // Membership form states
  const [selectedPremiumTier, setSelectedPremiumTier] = useState<'Silver' | 'Gold' | 'Platinum' | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [transactionId, setTransactionId] = useState('');
  const [screenshotInput, setScreenshotInput] = useState('');

  // Predefined games list
  const gamesList = ["Free Fire", "BGMI", "PUBG Mobile", "COD Mobile", "Valorant", "CS2", "GTA V"];

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gamerName.trim()) {
      addToast("Gamer Name cannot be empty!", "error");
      return;
    }

    onUpdateProfile({
      gamerName,
      bio,
      country,
      state,
      city,
      social: { youtube, instagram, discord },
      favoriteGames: favGames,
      kdRatio: parseFloat(kdRatio) || 1.0,
      winRate: parseFloat(winRate) || 50.0,
      skillRating: parseInt(skillRating) || 1000,
      activeSticker,
      activeFrame,
      activeBanner
    });

    addToast("Gamer portfolio parameters updated successfully!", "success");
  };

  const handleGameToggle = (game: string) => {
    if (favGames.includes(game)) {
      setFavGames(prev => prev.filter(g => g !== game));
    } else {
      setFavGames(prev => [...prev, game]);
    }
  };

  // Membership Pricing
  const premiumTiers = {
    Silver: { price: 49, badge: "🥈 Silver Team Player", perks: ["Advanced Analytics", "Custom badge", "Up to 2 team rosters slots"] },
    Gold: { price: 99, badge: "🥇 Gold Athlete", perks: ["Featured Profile listing", "Custom badge", "Advanced analytics", "Up to 5 team positions"] },
    Platinum: { price: 199, badge: "👑 Platinum Champion", perks: ["Ultra-Boost Featured listing", "Sponsor-Zone priority", "Custom premium badge", "Unlimited squad configurations"] }
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    const coupon = adminSettings.activeCoupons.find(c => c.code === code);
    if (coupon) {
      setAppliedDiscount(coupon.discountPercent);
      addToast(`Coupon "${code}" applied: ${coupon.discountPercent}% OFF!`, "success");
    } else {
      addToast("Invalid or expired discount code!", "error");
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPremiumTier) return;
    if (!transactionId.trim()) {
      addToast("Transaction reference ID is mandated!", "warning");
      return;
    }

    // fallback screenshot if plain text
    const finalScreenshot = screenshotInput.trim() || "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=500&auto=format&fit=crop&q=60";

    onConfirmPayment(
      selectedPremiumTier,
      transactionId,
      finalScreenshot
    );

    addToast("Payment proof uploaded successfully! Awaiting verification approval from Gaming Admin.", "success");
    setTransactionId('');
    setScreenshotInput('');
    setSelectedPremiumTier(null);
    setAppliedDiscount(0);
    setCouponCode('');
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(currentUser.referralCode);
    addToast("Referral code copied! Share with squadmates to unlock premium discounts.", "success");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 bg-zinc-900/60 p-5 border border-zinc-800 rounded-2xl backdrop-blur-xl space-y-4">
        {/* User Card */}
        <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-800/40">
          <div className="relative">
            <img
              src={currentUser.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
              alt={currentUser.gamerName}
              referrerPolicy="no-referrer"
              className={`w-20 h-20 rounded-2xl object-cover ${getUserProfileFrameClass(currentUser, adminSettings)}`}
            />
            {currentUser.activeSticker && (
              <span className="absolute -bottom-1.5 -right-1.5 text-xl bg-zinc-950 border border-zinc-850 w-7 h-7 flex items-center justify-center rounded-full select-none shadow">
                {currentUser.activeSticker}
              </span>
            )}
          </div>
          <h3 className="text-lg font-black font-display text-white mt-3 flex items-center justify-center gap-1">
            {currentUser.gamerName}
            {getUserTierBadgeIcon(currentUser, adminSettings) && (
              <span className="text-xs" title={getUserTierBadgeIcon(currentUser, adminSettings)}>
                {getUserTierBadgeIcon(currentUser, adminSettings).split(' ')[0]}
              </span>
            )}
          </h3>
          <span className="text-zinc-500 font-mono text-[10px] uppercase flex flex-col gap-0.5 mt-0.5">
            {currentUser.membership === 'Free' ? (
              <span>Free Pilot Profile</span>
            ) : (
              <span className="text-amber-400 font-extrabold tracking-widest leading-none">{currentUser.membership} MEMBER</span>
            )}
            {currentUser.membership !== 'Free' && currentUser.membershipStatus === 'active' && currentUser.membershipExpires && (
              <span className="text-[8px] text-zinc-550 font-normal lowercase font-mono">expires: {new Date(currentUser.membershipExpires).toLocaleDateString()}</span>
            )}
          </span>

          {currentUser.membershipStatus === 'pending' && (
            <span className="text-[9px] bg-amber-500/15 border border-amber-500/20 text-amber-400 font-mono font-bold uppercase tracking-wider px-2 py-0.5 mt-1.5 rounded-full">
              ⚡ Membership Pending Review
            </span>
          )}
        </div>

        {/* Vertical menu navigation */}
        <div className="flex flex-col gap-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'profile' ? 'bg-zinc-800 text-rose-400 font-bold border-l-2 border-rose-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            Edit Profile
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'teams' ? 'bg-zinc-800 text-rose-400 font-bold border-l-2 border-rose-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            My Squads ({userTeams.length})
          </button>

          <button
            onClick={() => setActiveTab('tournaments')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'tournaments' ? 'bg-zinc-800 text-rose-400 font-bold border-l-2 border-rose-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            My Tournaments ({userTournaments.length})
          </button>

          <button
            onClick={() => setActiveTab('sponsors')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'sponsors' ? 'bg-zinc-800 text-rose-400 font-bold border-l-2 border-rose-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            My Sponsors ({sponsorApplications.length})
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start relative ${
              activeTab === 'notifications' ? 'bg-zinc-800 text-rose-400 font-bold border-l-2 border-rose-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            Notifications
            {notifications.some(n => !n.read) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-3 right-4 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'favorites' ? 'bg-zinc-800 text-rose-400 font-bold border-l-2 border-rose-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Heart className="w-4 h-4 shrink-0" />
            Saved Gamers ({savedPlayersList.length})
          </button>

          <button
            onClick={() => setActiveTab('membership')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'membership' ? 'bg-zinc-800 text-amber-400 font-bold border-l-2 border-amber-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-amber-400" />
            Upgrades Desk
          </button>
        </div>
      </div>

      {/* Main Form Fields View */}
      <div className="lg:col-span-3 bg-zinc-900/60 p-6 border border-zinc-805/85 rounded-2xl backdrop-blur-xl">
        <h2 className="text-xl font-extrabold text-white tracking-wide border-b border-zinc-800/40 pb-3 uppercase flex items-center gap-2 font-display">
          {activeTab === 'profile' && "Gamer Calibration Hub"}
          {activeTab === 'teams' && "My Squadron Command"}
          {activeTab === 'tournaments' && "Registered Tournaments Track"}
          {activeTab === 'sponsors' && "Submitted Brand Proposals"}
          {activeTab === 'notifications' && "Pilot Tactical Notification Log"}
          {activeTab === 'favorites' && "Starred Operatives List"}
          {activeTab === 'membership' && "Esports Premium Upgrades Desk"}
        </h2>

        {/* Tab content conditional routing */}
        <div className="mt-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Core Gaming Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Gamer Identity Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    value={gamerName}
                    onChange={(e) => setGamerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Competitive Skill Rating (MMR)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    value={skillRating}
                    onChange={(e) => setSkillRating(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">K/D Killing Ratio (Ratio)</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    value={kdRatio}
                    onChange={(e) => setKdRatio(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Global Win Percentage (%)</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    value={winRate}
                    onChange={(e) => setWinRate(e.target.value)}
                  />
                </div>
              </div>

              {/* Location parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-800/50 pt-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Country *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">State / Province</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">City / Node</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Bio block */}
              <div className="border-t border-zinc-800/50 pt-4">
                <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Pilot Narrative / Career Overview Biography *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Pitch your esports focus, career accomplishments, schedules..."
                  className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              {/* Favorite Games checkboxes */}
              <div className="border-t border-zinc-800/50 pt-4 space-y-2">
                <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-black">Favorite Games Supported *</label>
                <div className="flex flex-wrap gap-2">
                  {gamesList.map((game) => {
                    const isChecked = favGames.includes(game);
                    return (
                      <button
                        key={game}
                        type="button"
                        onClick={() => handleGameToggle(game)}
                        className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${
                          isChecked 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500 font-bold' 
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700/80'
                        }`}
                      >
                        {game}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Social URLs and Discord tag */}
              <div className="border-t border-zinc-800/50 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">YouTube URL</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Instagram Handle</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/..."
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Discord Tag</label>
                  <input
                    type="text"
                    placeholder="Username#0000"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                  />
                </div>
              </div>

              {/* Premium Perks & Customizer Desk */}
              <div className="border-t border-zinc-800/80 pt-6 mt-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold font-display text-white tracking-wide uppercase">PREMIUM CUSTOMIZATION DESK</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">Calibrate active avatar frames, signature badges, stickers & cover graphics</p>
                  </div>
                </div>

                {currentUser.membership === 'Free' || currentUser.membershipStatus !== 'active' ? (
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-dashed border-zinc-800 text-center space-y-2">
                    <Info className="w-6 h-6 text-zinc-600 mx-auto" />
                    <div>
                      <h5 className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Premium Cosmetics Terminal Locked</h5>
                      <p className="text-[11px] text-zinc-500 max-w-sm mx-auto mt-1 font-sans leading-relaxed">Upgrade to Silver, Gold or Platinum Membership tiers in the Upgrades Desk to unlock animated glowing frames, custom profile covers, and special sticker widgets!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      const isTierAllowed = (itemTier: 'Silver' | 'Gold' | 'Platinum' | 'All') => {
                        if (currentUser.membership === 'Platinum') return true;
                        if (currentUser.membership === 'Gold') return itemTier === 'Gold' || itemTier === 'Silver' || itemTier === 'All';
                        if (currentUser.membership === 'Silver') return itemTier === 'Silver' || itemTier === 'All';
                        return false;
                      };

                      const unlockedBadges = (adminSettings.badges || []).filter(b => isTierAllowed(b.tier));
                      const unlockedPacks = (adminSettings.stickerPacks || []).filter(p => isTierAllowed(p.tier));
                      const unlockedFrames = (adminSettings.profileFrames || []).filter(f => isTierAllowed(f.tier));
                      const unlockedBanners = (adminSettings.profileBanners || []).filter(b => isTierAllowed(b.tier));
                      const unlockedRewards = (adminSettings.premiumRewards || []).filter(r => isTierAllowed(r.tier));

                      return (
                        <div className="space-y-6">
                          {/* Profile Frame Selector */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black font-bold">Avatar Glow Border Selector ({unlockedFrames.length} unlocked)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <button
                                type="button"
                                onClick={() => setActiveFrame('')}
                                className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                  activeFrame === '' 
                                    ? 'border-rose-500 text-rose-400' 
                                    : 'border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full border border-zinc-800 mx-auto mb-1 flex items-center justify-center text-xs font-bold bg-zinc-900 select-none">✕</div>
                                <span className="text-[10px] font-mono block">No Frame</span>
                              </button>

                              {unlockedFrames.map((frame) => (
                                <button
                                  key={frame.id}
                                  type="button"
                                  onClick={() => setActiveFrame(frame.id)}
                                  className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                    activeFrame === frame.id 
                                      ? 'border-rose-500 text-rose-450' 
                                      : 'border-zinc-850 text-zinc-440 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="relative w-10 h-10 mx-auto mb-1 flex items-center justify-center">
                                    <img
                                      src={currentUser.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                                      className={`w-8 h-8 rounded-full object-cover ${frame.style}`}
                                      alt="preview"
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono block truncate" title={frame.name}>{frame.name}</span>
                                  <span className="text-[8px] opacity-60 font-mono block uppercase">{frame.tier}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Profile Banner Selector */}
                          {currentUser.membership !== 'Silver' && (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black font-semibold">Cover Banner Design Selector ({unlockedBanners.length} unlocked)</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setActiveBanner('')}
                                  className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                    activeBanner === '' 
                                      ? 'border-rose-500 text-rose-400 font-bold' 
                                      : 'border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="h-8 rounded-lg bg-zinc-900 border border-zinc-800 w-full mb-1"></div>
                                  <span className="text-[10px] font-mono block">Standard Black Banner</span>
                                </button>

                                {unlockedBanners.map((banner) => (
                                  <button
                                    key={banner.id}
                                    type="button"
                                    onClick={() => setActiveBanner(banner.id)}
                                    className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                      activeBanner === banner.id 
                                        ? 'border-rose-500 text-rose-400 font-bold' 
                                        : 'border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                  >
                                    <div className={`h-8 rounded-lg w-full mb-1 ${banner.style}`}></div>
                                    <span className="text-[10px] font-mono block truncate" title={banner.name}>{banner.name}</span>
                                    <span className="text-[8px] opacity-60 font-mono block uppercase">{banner.tier}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Premium Sticker Selector */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black font-bold">Signature Profile Sticker ({unlockedPacks.length} packs unlocked)</label>
                            <p className="text-[9px] text-zinc-500 font-sans">Click on any unlocked emoji sticker below to activate it hovering near your gamer tag card across rosters!</p>
                            
                            <div className="space-y-3">
                              {unlockedPacks.map((pack) => (
                                <div key={pack.id} className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-1.5">
                                  <p className="text-[9px] font-mono text-zinc-400 uppercase font-bold">{pack.name} <span className="opacity-50 text-[8px]">({pack.tier})</span></p>
                                  <div className="flex gap-2 flex-wrap">
                                    {pack.stickers.map((sticker) => {
                                      const isSelected = activeSticker === sticker;
                                      return (
                                        <button
                                          key={sticker}
                                          type="button"
                                          onClick={() => setActiveSticker(isSelected ? '' : sticker)}
                                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all bg-zinc-900 border ${
                                            isSelected 
                                              ? 'border-rose-500 bg-rose-500/10 scale-110 ring-2 ring-rose-500/10' 
                                              : 'border-zinc-800 text-zinc-450 hover:border-zinc-700 hover:text-white'
                                          }`}
                                        >
                                          {sticker}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                              {activeSticker && (
                                <button
                                  type="button"
                                  onClick={() => setActiveSticker('')}
                                  className="text-[10px] font-mono text-rose-500 hover:text-rose-650 bg-zinc-950 border border-zinc-850 px-2.5 py-1 rounded"
                                >
                                  ✕ Defuse Active Sticker
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Dynamically Unlocked Badges & System rewards Display */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Unlocked Badges Panel */}
                            <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                              <h5 className="text-[10px] font-mono tracking-wider font-extrabold text-cyan-400 uppercase">UNLOCKED CERTIFICATION BADGES</h5>
                              {unlockedBadges.length === 0 ? (
                                <p className="text-[10px] text-zinc-600 italic pl-1 font-mono">No static tier badges configured.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {unlockedBadges.map((badge) => (
                                    <div key={badge.id} className="text-[10px] font-mono flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-805">
                                      <span className="text-zinc-300">{badge.name}</span>
                                      <span className="font-extrabold text-amber-400">{badge.icon}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Unlocked Rewards List */}
                            <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 font-mono text-xs">
                              <h5 className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-400 uppercase">UNLOCKED STATIONS REWARDS</h5>
                              {unlockedRewards.length === 0 ? (
                                <p className="text-[10px] text-zinc-650 italic pl-1 font-mono">No custom tier rewards defined in administration dashboard.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 font-sans text-[11px] leading-tight">
                                  {unlockedRewards.map((reward) => (
                                    <div key={reward.id} className="text-[10px] p-2.5 bg-zinc-900 rounded border border-zinc-805 space-y-1 text-zinc-400">
                                      <p className="font-bold text-white flex items-center gap-1 font-mono">✓ {reward.name}</p>
                                      <p className="text-[9px] text-zinc-400 leading-normal">"{reward.description}"</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Save Trigger */}
              <div className="pt-4 border-t border-zinc-800/40">
                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-xs tracking-wider uppercase px-6 py-3 rounded-xl flex items-center gap-1.5 transition-all neon-glow-pink cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Calibration Files
                </button>
              </div>
            </form>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Directly command your formed squads or exit teams you have registered with as recruits.</p>
              
              {userTeams.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">No active squad affiliations detected.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userTeams.map(team => (
                    <div key={team.id} className="p-4 bg-zinc-950/70 border border-zinc-805 rounded-xl space-y-3">
                      <div className="flex gap-3 items-center">
                        <img src={team.logo} alt={team.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="text-sm font-extrabold text-white">{team.name}</h4>
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/20 uppercase font-bold">{team.game}</span>
                        </div>
                      </div>
                      <p className="text-zinc-500 text-xs lines-clamp-2">"{team.bio}"</p>
                      <div className="flex justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2 font-mono">
                        <span>COMMANDER: {team.creatorGamerName}</span>
                        <span>ROSTER SIZE: {team.members.length} / 5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tournaments' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Track registration verification status for registered upcoming brackets.</p>

              {userTournaments.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">No tournament enlistments found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTournaments.map(t => {
                    // find registrant element corresponding to current user id or our team id
                    const reg = t.registrants.find(r => r.id === currentUser.id || userTeams.some(ut => ut.id === r.id));
                    const statusColors = {
                      pending: 'text-amber-400 bg-amber-400/5 border-amber-400/20',
                      approved: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20',
                      rejected: 'text-rose-400 bg-rose-405 border-rose-405/20'
                    };
                    return (
                      <div key={t.id} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">{t.game}</span>
                          <h4 className="text-sm font-extrabold text-white mt-0.5">{t.title}</h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 font-mono">TYPE: {t.registrationType.toUpperCase()}</span>
                          {reg && (
                            <span className={`text-[10px] uppercase font-mono px-3 py-1 rounded border font-black ${statusColors[reg.status] || 'text-zinc-500'}`}>
                              {reg.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sponsors' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Monitor active corporate pitches submitted to partner sponsors.</p>

              {sponsorApplications.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">No proposals submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sponsorApplications.map(app => {
                    const colors = {
                      pending: 'text-amber-400 bg-amber-500/5 border-amber-400/25',
                      approved: 'text-emerald-400 bg-emerald-500/5 border-emerald-400/25',
                      rejected: 'text-rose-400 bg-rose-500/5 border-rose-400/25'
                    };
                    return (
                      <div key={app.id} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-3">
                        <div className="flex justify-between items-center flex-wrap">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wide">PITCH: {app.brandName}</h4>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${colors[app.status]}`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed italic">"{app.pitch}"</p>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-850">
                          <span>Reaches: {app.monthlyReach}</span>
                          <span>Registered contact: {app.contactEmail}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">Inbox empty. No intelligence feeds received.</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && onMarkNotificationRead(notif.id)}
                    className={`p-3.5 border rounded-xl flex items-start gap-3 transition-colors ${
                      notif.read ? 'bg-zinc-950/20 border-zinc-855 text-zinc-400' : 'bg-zinc-950/90 border-rose-500/30 text-white cursor-pointer hover:border-rose-500/50'
                    }`}
                  >
                    <div className="mt-0.5">
                      <Bell className={`w-4 h-4 ${notif.read ? 'text-zinc-650' : 'text-rose-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold font-sans">{notif.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1">{notif.message}</p>
                    </div>

                    {!notif.read && (
                      <span className="text-[9px] uppercase font-mono font-extrabold text-rose-400">Unread</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Review other gamers you saved from the directory list for future squad enlistments.</p>

              {savedPlayersList.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">No players saved. Check out Gamer Directory to discover team mates.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedPlayersList.map(gp => (
                    <div key={gp.id} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={gp.profilePhoto} alt={gp.gamerName} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="text-xs font-bold text-white leading-none">{gp.gamerName}</h4>
                          <span className="text-[9px] text-zinc-500 font-mono mt-1 block">{gp.city}, {gp.country}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onSelectGamerProfile(gp.username)}
                          className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 px-2.5 py-1 text-[10px] font-mono rounded"
                        >
                          View Card
                        </button>
                        <button
                          onClick={() => onUnsavePlayer(gp.id)}
                          className="text-rose-500 p-1.5 hover:bg-rose-500/10 rounded"
                          title="Remove"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'membership' && (
            <div className="space-y-6">
              {/* Premium membership pricing cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(premiumTiers).map(([tier, details]) => {
                  const isCurrent = currentUser.membership === tier && currentUser.membershipStatus === 'active';
                  const borderClass = isCurrent ? 'border-amber-500 bg-amber-500/5 neon-glow-blue' : 'border-zinc-800 bg-zinc-950/60';

                  return (
                    <div key={tier} className={`p-5 rounded-2xl border flex flex-col justify-between ${borderClass}`}>
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-extrabold text-sm text-white font-mono uppercase tracking-wide">{tier} PASS</h4>
                          {isCurrent && (
                            <span className="text-[9px] bg-amber-500/20 border border-amber-505 text-amber-400 font-mono px-2 py-0.5 rounded-full font-bold">
                              ACTIVE TIER
                            </span>
                          )}
                        </div>

                        <p className="text-2xl font-black text-white mt-3 font-display">
                          ₹{details.price} <span className="text-xs text-zinc-500 font-sans font-normal">/ lifetime</span>
                        </p>

                        <ul className="text-xs text-zinc-400 space-y-2 mt-4">
                          {details.perks.map((perk, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 select-none text-[11px] font-sans">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              {perk}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-zinc-800/40 mt-4">
                        <button
                          disabled={currentUser.membership === tier && currentUser.membershipStatus === 'active'}
                          onClick={() => setSelectedPremiumTier(tier as any)}
                          className={`w-full py-2 rounded-xl text-xs font-mono font-bold select-none transition-all ${
                            isCurrent 
                              ? 'bg-zinc-800/40 text-zinc-400 cursor-not-allowed'
                              : 'bg-amber-400 text-zinc-950 hover:bg-amber-500 cursor-pointer'
                          }`}
                        >
                          {isCurrent ? "Active Membership" : "Calibrate Upgrade"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* QR payment details panel */}
              {selectedPremiumTier && (
                <div className="p-6 bg-zinc-950 rounded-2xl border border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="text-center space-y-3">
                    <p className="text-xs font-mono tracking-widest text-zinc-400 uppercase font-black">Scan QR to pay ₹{premiumTiers[selectedPremiumTier].price - Math.floor((premiumTiers[selectedPremiumTier].price * appliedDiscount) / 100)}</p>
                    <div className="p-3 bg-white w-48 h-48 mx-auto rounded-xl flex items-center justify-center border border-zinc-200">
                      <img src={adminSettings.qrCodeUrl} alt="Payment scanner" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="text-[10px] text-zinc-500 block">Scan this QR scanner using any UPI app (GPay, PhonePe, Paytm).</span>
                  </div>

                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <h3 className="font-extrabold text-white text-base font-display flex items-center gap-1.5">
                      <Shield className="text-amber-400 w-5 h-5" />
                      Verification Proof Registry
                    </h3>

                    {/* Coupons support */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">Activate Discount Coupon</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. GAMER10, CHAMPION30"
                          className="flex-grow bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none focus:border-amber-500 rounded"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-mono text-zinc-300 rounded font-bold"
                        >
                          Apply
                        </button>
                      </div>
                      {appliedDiscount > 0 && (
                        <p className="text-[10px] text-emerald-400 font-mono">Current coupon active: {appliedDiscount}% deduction verified!</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-bold">Transaction Reference ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="UTR / Txn ID (12 Digit String)"
                        className="w-full bg-zinc-950 border border-zinc-805 text-xs text-white focus:border-amber-500 rounded px-3 py-2.5 outline-none font-mono"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-bold">Screenshot reference URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="Provide mock screenshot URL or let it generate"
                        className="w-full bg-zinc-950 border border-zinc-805 text-xs text-white focus:border-amber-500 rounded px-3 py-2.5 outline-none"
                        value={screenshotInput}
                        onChange={(e) => setScreenshotInput(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all shadow-md"
                    >
                      SUBMIT TRANSFERS LOG FOR REVIEW
                    </button>
                  </form>
                </div>
              )}

              {/* Referral engine details */}
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-white font-mono flex items-center gap-1">
                    <Gift className="w-4 h-4 text-rose-500" />
                    SQUAD REFERRAL COMMISSION
                  </h4>
                  <p className="text-zinc-500 text-xs mt-1">Get custom bonus rebates when other players update using your personalized code.</p>
                </div>

                <div className="flex gap-2 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-800">
                  <span className="font-mono font-bold text-zinc-300">{currentUser.referralCode}</span>
                  <button onClick={copyReferralCode} className="text-rose-400 hover:text-rose-500">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
