import React, { useState, useEffect } from 'react';
import { UserProfile, MembershipType, AdminSettings, ProfileComment } from '../types';
import { Search, MapPin, Gamepad2, Award, Zap, Heart, Share2, Youtube, Instagram, MessageSquare, Trophy, Calendar, Users, Eye, Sparkles, MessageCircle, Send, Star, Compass, UserPlus, UserMinus, UserCheck, MessageSquarePlus, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserProfileFrameClass, getUserCardGlowClass, getUserProfileBannerStyle, getUserTierBadgeIcon, getUserNameColorClass, isUserVIP, getThemePackAssetUrl, PLATINUM_DEFAULTS } from '../lib/premiumUtils';
import { GamerAvatar } from './GamerAvatar';
import { PremiumBanner } from './PremiumBanner';
import AdSenseSlot from './AdSenseSlot';
import { supabaseSocialService } from '../lib/supabaseSocialService';

interface GamerProfilesProps {
  users: UserProfile[];
  currentUser: UserProfile | null;
  adminSettings: AdminSettings;
  onToggleSave: (targetUserId: string) => void;
  onNavigateToSponsors?: (presetGamerName?: string) => void;
  onAddComment?: (targetUserId: string, text: string) => void;
  onMessageGamer?: (targetUserId: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function GamerProfiles({ users, currentUser, adminSettings, onToggleSave, onNavigateToSponsors, onAddComment, onMessageGamer, addToast }: GamerProfilesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState('All');
  const [minKd, setMinKd] = useState('');
  const [selectedMembership, setSelectedMembership] = useState('All');
  const [selectedGamer, setSelectedGamer] = useState<UserProfile | null>(null);
  const [newComment, setNewComment] = useState('');

  // Social Network metrics & state
  const [isFollowingGamer, setIsFollowingGamer] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends' | 'loading'>('none');
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReasonText, setReportReasonText] = useState('');
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  // List of unique supported games
  const gamesList = ["All", "Free Fire", "BGMI", "PUBG Mobile", "COD Mobile", "Valorant", "CS2", "GTA V"];

  useEffect(() => {
    if (!selectedGamer || !currentUser) return;
    
    let active = true;
    
    const loadSocialData = async () => {
      try {
        // 1. Follow state
        const following = await supabaseSocialService.isFollowing(currentUser.id, selectedGamer.id);
        const fers = await supabaseSocialService.getFollowersCount(selectedGamer.id);
        const fings = await supabaseSocialService.getFollowingCount(selectedGamer.id);
        
        // 2. Friend state
        const reqs = await supabaseSocialService.getFriendRequests(currentUser.id);
        const acceptedFriends = await supabaseSocialService.getFriends(currentUser.id);
        
        let status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'loading' = 'none';
        if (acceptedFriends.includes(selectedGamer.id)) {
          status = 'friends';
        } else {
          const outgoing = reqs.find(r => r.sender_id === currentUser.id && r.receiver_id === selectedGamer.id && r.status === 'pending');
          const incoming = reqs.find(r => r.sender_id === selectedGamer.id && r.receiver_id === currentUser.id && r.status === 'pending');
          if (outgoing) status = 'pending_sent';
          else if (incoming) status = 'pending_received';
        }
        
        // 3. Recent posts
        const allPosts = await supabaseSocialService.getPosts();
        const gamerPosts = allPosts.filter(p => p.user_id === selectedGamer.id);
        
        if (active) {
          setIsFollowingGamer(following);
          setFollowersCount(fers);
          setFollowingCount(fings);
          setFriendStatus(status);
          setRecentPosts(gamerPosts);
        }
      } catch (err) {
        console.warn("Error loading social specs:", err);
      }
    };
    
    loadSocialData();
    
    return () => {
      active = false;
    };
  }, [selectedGamer, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || !selectedGamer) {
      addToast("Please register or sign in to follow players.", "warning");
      return;
    }
    
    try {
      if (isFollowingGamer) {
        await supabaseSocialService.unfollowUser(currentUser.id, selectedGamer.id);
        setIsFollowingGamer(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        addToast(`Unfollowed ${selectedGamer.gamerName}.`, "info");
      } else {
        await supabaseSocialService.followUser(currentUser.id, selectedGamer.id);
        setIsFollowingGamer(true);
        setFollowersCount(prev => prev + 1);
        addToast(`Successfully following ${selectedGamer.gamerName}!`, "success");
        
        // Add follow notification
        await supabaseSocialService.addNotification(
          selectedGamer.id,
          "New Follower!",
          `${currentUser.gamerName} started following your gamer hub portfolio!`,
          "follow",
          currentUser.id
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFriendRequestToggle = async () => {
    if (!currentUser || !selectedGamer) {
      addToast("Please register or sign in to build alliances.", "warning");
      return;
    }
    
    try {
      if (friendStatus === 'none') {
        setFriendStatus('pending_sent');
        await supabaseSocialService.sendFriendRequest(currentUser.id, selectedGamer.id);
        addToast(`Friend proposal forwarded to ${selectedGamer.gamerName}!`, "success");
        
        // Add pending notice
        await supabaseSocialService.addNotification(
          selectedGamer.id,
          "Friend Request!",
          `${currentUser.gamerName} proposed building a tactical gamer alliance.`,
          "friend_request",
          currentUser.id
        );
      } else if (friendStatus === 'pending_sent') {
        setFriendStatus('none');
        await supabaseSocialService.cancelFriendRequest(currentUser.id, selectedGamer.id);
        addToast("Friend request retracted.", "info");
      } else if (friendStatus === 'pending_received') {
        setFriendStatus('friends');
        await supabaseSocialService.acceptFriendRequest(selectedGamer.id, currentUser.id);
        addToast(`Alliance confirmed with ${selectedGamer.gamerName}!`, "success");
        
        // Create direct conversation
        await supabaseSocialService.startOrCreateConversation(currentUser.id, selectedGamer.id);
        
        // Add accepted notice
        await supabaseSocialService.addNotification(
          selectedGamer.id,
          "Alliance Confirmed!",
          `${currentUser.gamerName} accepted your gamer companion alliance proposal!`,
          "system", // types.ts has 'follow' | 'friend_request' | 'tournament' | 'system'
          currentUser.id
        );
      } else if (friendStatus === 'friends') {
        if (confirm(`Do you wish to dissolve your alliance with ${selectedGamer.gamerName}?`)) {
          setFriendStatus('none');
          await supabaseSocialService.cancelFriendRequest(currentUser.id, selectedGamer.id);
          addToast("Alliance dissolved.", "info");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessageGamerClick = async () => {
    if (!currentUser || !selectedGamer) {
      addToast("Please register or sign in to send messages.", "warning");
      return;
    }
    
    try {
      await supabaseSocialService.startOrCreateConversation(currentUser.id, selectedGamer.id);
      if (onMessageGamer) {
        onMessageGamer(selectedGamer.id);
      }
    } catch (err) {
      console.error(err);
    }
  };


  const filteredUsers = users.filter(user => {
    if (user.isBanned) return false;
    const matchesSearch = user.gamerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGame = selectedGame === 'All' || user.favoriteGames.includes(selectedGame);
    const matchesKd = minKd === '' || user.kdRatio >= parseFloat(minKd);
    const matchesMembership = selectedMembership === 'All' || user.membership === selectedMembership;

    return matchesSearch && matchesGame && matchesKd && matchesMembership;
  });

  const handleShare = (gamer: UserProfile) => {
    const shareUrl = `${window.location.origin}/#gamer/${gamer.username}`;
    navigator.clipboard.writeText(shareUrl);
    addToast(`Shareable portfolio link for ${gamer.gamerName} copied to clipboard!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header and filters */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              <Users className="text-rose-500 w-8 h-8" />
              Gamer Directory
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Discover, analyze, and save professional esports athletes & content creators</p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-full border border-rose-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured players boosted</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by gamer tag, location..."
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-rose-500 rounded-xl px-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none transition-all"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              <option value="All">All Games</option>
              {gamesList.slice(1).map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="number"
              step="0.1"
              placeholder="Min K/D Ratio (e.g. 1.5)"
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
              value={minKd}
              onChange={(e) => setMinKd(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none transition-all"
              value={selectedMembership}
              onChange={(e) => setSelectedMembership(e.target.value)}
            >
              <option value="All">All Membership Status</option>
              <option value="Platinum">👑 Platinum</option>
              <option value="Gold">🥇 Gold</option>
              <option value="Silver">🥈 Silver</option>
              <option value="Free">Free Tier</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Gamer List Column */}
        <div className="xl:col-span-2 space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              <Gamepad2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-1">No gamers found</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">Try clarifying your filters or searching using another gamer tag.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((gamer) => {
                const isFavorite = currentUser?.savedPlayers.includes(gamer.id) || false;
                const membershipColors: Record<MembershipType, { text: string, bg: string, ring: string }> = {
                  Free: { text: 'text-zinc-400', bg: 'bg-zinc-800/20 border-zinc-800', ring: '' },
                  Silver: { text: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20', ring: '' },
                  Gold: { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', ring: 'ring-1 ring-amber-500/30' },
                  Platinum: { text: 'text-fuchsia-400 font-extrabold', bg: 'bg-fuchsia-500/15 border-fuchsia-500/30', ring: 'ring-2 ring-fuchsia-500/50' }
                };

                return (
                  <motion.div
                    key={gamer.id}
                    layoutId={`gamer-card-${gamer.id}`}
                    onClick={() => setSelectedGamer(gamer)}
                    className={`p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/90 border transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between h-64 ${
                      getUserCardGlowClass(gamer)
                    }`}
                  >
                    <div>
                      {/* Top bar */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={gamer.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                              alt={gamer.gamerName}
                              referrerPolicy="no-referrer"
                              className={`w-12 h-12 rounded-xl object-cover border border-zinc-800 ${getUserProfileFrameClass(gamer, adminSettings)}`}
                            />
                            {gamer.activeSticker && (
                              <span className="absolute -bottom-1 -right-1 text-sm bg-zinc-950 border border-zinc-850 rounded-full w-5 h-5 flex items-center justify-center select-none shadow">
                                {gamer.activeSticker}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold tracking-wide transition-colors flex items-center gap-1">
                                <span className={getUserNameColorClass(gamer)}>
                                  {gamer.gamerName}
                                </span>
                                {isUserVIP(gamer) && (
                                  <span className="text-[9px] bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-1.5 py-0.5 rounded font-mono font-extrabold shadow shadow-rose-500/30">VIP</span>
                                )}
                                {getUserTierBadgeIcon(gamer, adminSettings) && (
                                  <span className="text-xs" title={getUserTierBadgeIcon(gamer, adminSettings)}>
                                    {getUserTierBadgeIcon(gamer, adminSettings).split(' ')[0]}
                                  </span>
                                )}
                              </h3>
                              {gamer.membership !== 'Free' && (
                                <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${membershipColors[gamer.membership].bg} ${membershipColors[gamer.membership].text} ${membershipColors[gamer.membership].ring}`}>
                                  {gamer.membership === 'Platinum' ? '👑 PLATINUM VIP' : gamer.membership}
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-500 text-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {gamer.city}, {gamer.country}
                            </span>
                          </div>
                        </div>

                        {/* Favorite button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!currentUser) {
                              addToast("Please login first to save players!", "warning");
                              return;
                            }
                            onToggleSave(gamer.id);
                          }}
                          className={`p-2 rounded-xl border ${
                            isFavorite 
                              ? 'bg-rose-500/20 border-rose-500 text-rose-500' 
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          } transition-all`}
                        >
                          <Heart className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
                        </button>
                      </div>

                      {/* Bio */}
                      <p className="text-zinc-400 text-xs mt-3.5 line-clamp-2 italic">
                        "{gamer.bio || 'Veteran gamer looking to build a career in esports.'}"
                      </p>

                      {/* Favorite Games Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {gamer.favoriteGames.map(game => (
                          <span key={game} className="text-[10px] font-mono bg-zinc-950/60 text-cyan-400 border border-zinc-800/80 px-2 py-0.5 rounded">
                            {game}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/40 text-center font-mono mt-auto bg-zinc-950/35 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Rating</div>
                        <div className="text-xs font-bold text-white flex items-center justify-center gap-0.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          {gamer.skillRating}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">K/D Ratio</div>
                        <div className="text-xs font-bold text-cyan-400">{gamer.kdRatio.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Win Rate</div>
                        <div className="text-xs font-bold text-emerald-400">{gamer.winRate}%</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Detail Portfolio Sidebar */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selectedGamer ? (
              (() => {
                const isPlatinum = selectedGamer.membership === 'Platinum' && selectedGamer.membershipStatus === 'active';
                const isGold = selectedGamer.membership === 'Gold' && selectedGamer.membershipStatus === 'active';
                
                // Set custom styled background classes for legendary profile context
                const containerClass = isPlatinum 
                  ? "platinum-profile-theme electric_sweep_overlay bg-gradient-to-br from-zinc-950 via-zinc-900/85 to-zinc-950 border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.15)] shadow-pink-950/20"
                  : `bg-zinc-900/95 border-zinc-805 ${getUserCardGlowClass(selectedGamer)}`;

                return (
                  <motion.div
                    key={selectedGamer.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`border rounded-2xl p-6 relative overflow-hidden shadow-2xl ${containerClass}`}
                    style={isPlatinum && selectedGamer.platinum_theme_enabled ? {
                      backgroundImage: `url("${selectedGamer.platinum_background_url || PLATINUM_DEFAULTS.background}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : {}}
                  >
                    {/* Platinum Exclusive Cyberpunk Light Rays & Glowing Background Accents */}
                    {isPlatinum && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        {/* Pink Cyber Ray */}
                        <div className="absolute -top-24 -left-24 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] opacity-75"></div>
                        {/* Indigo Light Spot */}
                        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/8 rounded-full blur-[120px] opacity-60"></div>
                        
                        {/* Render Platinum Theme Overlay Image */}
                        {selectedGamer.platinum_theme_enabled && (
                          <img 
                            src={selectedGamer.platinum_overlay_url || PLATINUM_DEFAULTS.particleOverlay} 
                            alt="Theme overlay" 
                            className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none mix-blend-screen z-0"
                            referrerPolicy="no-referrer"
                          />
                        )}

                        {/* Subtle moving particles in container background */}
                        <div className="absolute top-1/4 left-10 w-1.5 h-1.5 bg-rose-400/30 rounded-full animate-ping"></div>
                        <div className="absolute bottom-1/3 right-12 w-1 h-1 bg-cyan-400/20 rounded-full animate-pulse"></div>
                      </div>
                    )}

                    {/* Background Banner style */}
                    <div className="relative -mx-6 -mt-6 mb-6 overflow-hidden z-10">
                      <PremiumBanner user={selectedGamer} adminSettings={adminSettings} heightClass="h-32 md:h-38" />
                      
                      {/* Close banner trigger */}
                      <div className="absolute top-3 right-3 z-30">
                        <button
                          onClick={() => setSelectedGamer(null)}
                          className="text-white hover:bg-black/80 hover:text-rose-400 text-[10px] px-2.5 py-1 rounded bg-black/50 backdrop-blur-md border border-white/10 font-mono font-bold tracking-widest uppercase cursor-pointer transition-colors"
                        >
                          CLOSE ✕
                        </button>
                      </div>
                    </div>

                    {/* Profile Card and avatar overlapping the banner */}
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-3 -mt-14 md:-mt-16 mb-4 relative z-20 px-2 text-center md:text-left">
                      <div className="shrink-0">
                        <GamerAvatar user={selectedGamer} adminSettings={adminSettings} size="xl" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap">
                          <h3 className="text-xl md:text-2xl font-black font-display tracking-wide flex items-center gap-1.5 flex-wrap">
                            <span className={isPlatinum && selectedGamer.platinum_theme_enabled ? "platinum-name-glow" : getUserNameColorClass(selectedGamer)}>
                              {selectedGamer.gamerName}
                            </span>
                            {(isUserVIP(selectedGamer) || (isPlatinum && selectedGamer.platinum_theme_enabled)) && (
                              <span className="text-[9px] bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-2 py-0.5 rounded font-mono font-extrabold shadow shadow-rose-500/20 animate-pulse">VIP</span>
                            )}
                            {getUserTierBadgeIcon(selectedGamer, adminSettings) && (
                              <span className="text-xs shrink-0" title={getUserTierBadgeIcon(selectedGamer, adminSettings)}>
                                {getUserTierBadgeIcon(selectedGamer, adminSettings).split(' ')[0]}
                              </span>
                            )}
                          </h3>
                          {selectedGamer.membership !== 'Free' && (
                            <span className="text-[9px] bg-rose-500/15 border border-rose-500/25 text-rose-400 font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded">
                              {selectedGamer.membership === 'Platinum' ? '👑 PLATINUM VIP' : `${selectedGamer.membership} MEMBER`}
                            </span>
                          )}
                        </div>
                        {isPlatinum && selectedGamer.platinum_theme_enabled && (
                          <div className="mt-1 flex items-center justify-center md:justify-start gap-1.5">
                            <span className="text-[8px] bg-rose-600/20 border border-rose-500/35 text-rose-400 px-2 py-0.5 rounded font-mono font-black uppercase tracking-wider animate-pulse">VIP ACCESS</span>
                            <span className="text-[8px] bg-indigo-600/20 border border-indigo-500/35 text-indigo-300 px-2 py-0.5 rounded font-mono font-black uppercase tracking-wider">PLATINUM LEGEND</span>
                          </div>
                        )}
                        <p className="text-xs text-rose-450 font-mono tracking-widest mt-1.5 uppercase">
                          {selectedGamer.favoriteGames.join(" / ")}
                        </p>
                        <p className="text-zinc-400 text-xs flex items-center justify-center md:justify-start gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {selectedGamer.city}, {selectedGamer.state}, {selectedGamer.country}
                        </p>
                        <div className="flex gap-4 mt-3 mb-1 justify-center md:justify-start font-mono text-xs">
                          <div className="text-zinc-300">
                            <span className="text-fuchsia-400 font-bold text-sm mr-1">{followersCount}</span> Followers
                          </div>
                          <div className="text-zinc-300">
                            <span className="text-cyan-400 font-bold text-sm mr-1">{followingCount}</span> Following
                          </div>
                          {friendStatus === 'friends' && (
                            <div className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ALLIANCE PARTNER
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="flex flex-wrap gap-2.5 mb-6 justify-center md:justify-start relative z-20">
                      <button
                        onClick={() => handleShare(selectedGamer)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-850/60 border border-zinc-800 text-xs text-zinc-300 font-medium transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                        Get Link
                      </button>

                      {/* Follow / Unfollow Button */}
                      {currentUser && currentUser.id !== selectedGamer.id && (
                        <button
                          onClick={handleFollowToggle}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                            isFollowingGamer
                              ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 text-rose-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFollowingGamer ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          {isFollowingGamer ? 'Unfollow' : 'Follow'}
                        </button>
                      )}

                      {/* Add Friend / Alliance Button */}
                      {currentUser && currentUser.id !== selectedGamer.id && (
                        <button
                          onClick={handleFriendRequestToggle}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                            friendStatus === 'friends'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : friendStatus === 'pending_sent'
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-400 cursor-not-allowed'
                              : friendStatus === 'pending_received'
                              ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-zinc-950 animate-pulse font-bold'
                              : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                          }`}
                        >
                          {friendStatus === 'friends' ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Alliance Active
                            </>
                          ) : friendStatus === 'pending_sent' ? (
                            <>
                              <Users className="w-3.5 h-3.5" />
                              Proposal Sent
                            </>
                          ) : friendStatus === 'pending_received' ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Accept Alliance
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              Propose Alliance
                            </>
                          )}
                        </button>
                      )}

                      {/* Message Option */}
                      {currentUser && currentUser.id !== selectedGamer.id && (
                        <button
                          onClick={handleMessageGamerClick}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-medium transition-all"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          Send Message
                        </button>
                      )}

                      {onNavigateToSponsors && (
                        <button
                          onClick={() => onNavigateToSponsors(selectedGamer.gamerName)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs text-white font-medium transition-all neon-glow-pink font-semibold"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Sponsor Me
                        </button>
                      )}
                    </div>


                    {/* Stats Matrix: Custom Animated stats card grid for Platinum */}
                    <div className="mt-6 relative z-10 transition-all">
                      {isPlatinum ? (
                        (() => {
                          let hudAssets: any = null;
                          if (selectedGamer.platinum_hud_assets) {
                            try {
                              hudAssets = typeof selectedGamer.platinum_hud_assets === 'string'
                                ? JSON.parse(selectedGamer.platinum_hud_assets)
                                : selectedGamer.platinum_hud_assets;
                            } catch (err) {
                              console.warn("Failed parsing platinum_hud_assets:", err);
                            }
                          }

                          const getHudValue = (key: string, fallback: any) => {
                            if (!hudAssets) return fallback;
                            if (Array.isArray(hudAssets)) {
                              const found = hudAssets.find((item: any) => item.key === key || item.name?.toLowerCase() === key.toLowerCase());
                              return found ? found.value : fallback;
                            }
                            return hudAssets[key] !== undefined ? hudAssets[key] : fallback;
                          };

                          const cardBgStyle = isPlatinum && selectedGamer.platinum_theme_enabled 
                            ? { 
                                backgroundImage: `url("${selectedGamer.platinum_profile_card_url || PLATINUM_DEFAULTS.profileCard}")`, 
                                backgroundSize: 'cover', 
                                backgroundPosition: 'center' 
                              } 
                            : {};

                          return (
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-extrabold font-mono tracking-widest text-rose-450 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                                LEGENDARY PERFORMANCE MATRIX
                              </h4>
                              
                              {/* Rich glassmorphic stats cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {/* Card 1: Skill */}
                                <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden group" style={cardBgStyle}>
                                  <div className="absolute -right-2 -bottom-2 opacity-5 text-rose-500 group-hover:scale-110 transition-transform">
                                    <Award className="w-12 h-12" />
                                  </div>
                                  <p className="text-[8px] text-zinc-500 font-mono tracking-widest">SKILL</p>
                                  <p className="text-base font-black font-display text-rose-400 mt-0.5">{getHudValue('skill', selectedGamer.skillRating)}</p>
                                  <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-tight block">🔥 Top 0.2%</span>
                                </div>

                                {/* Card 2: Level */}
                                <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden group" style={cardBgStyle}>
                                  <p className="text-[8px] text-zinc-500 font-mono tracking-widest">LEVEL</p>
                                  <p className="text-base font-black font-display text-indigo-400 mt-0.5">Lv {Math.floor(Number(getHudValue('skill', selectedGamer.skillRating)) / 100)}</p>
                                  <span className="text-[8px] font-mono text-indigo-300 block">XP: {getHudValue('xp', selectedGamer.xp || (selectedGamer.skillRating * 4 + 250))}</span>
                                </div>

                                {/* Card 3: Rank Category */}
                                <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden col-span-1 group" style={cardBgStyle}>
                                  <p className="text-[8px] text-zinc-500 font-mono tracking-widest">RANK</p>
                                  <p className="text-[10px] font-black font-display text-amber-400 mt-1 uppercase tracking-wider truncate">
                                    {getHudValue('rank', selectedGamer.skillRating > 1700 ? "GRANDMASTER" : "TACTICAL ELITE")}
                                  </p>
                                  <span className="text-[8px] font-mono text-amber-500 uppercase tracking-tight block">★ Tier-S</span>
                                </div>

                                {/* Card 4: K/D Ratio */}
                                <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden group" style={cardBgStyle}>
                                  <p className="text-[8px] text-zinc-500 font-mono tracking-widest">K/D RATIO</p>
                                  <p className="text-base font-black font-display text-cyan-400 mt-0.5">{(selectedGamer.kdRatio || 1.85).toFixed(2)}</p>
                                  <span className="text-[8px] font-mono text-zinc-400 block">win rate: {selectedGamer.winRate || 58}%</span>
                                </div>

                                {/* Card 5: Squad Affiliation */}
                                <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden group" style={cardBgStyle}>
                                  <p className="text-[8px] text-zinc-500 font-mono tracking-widest">TEAM COMMAND</p>
                                  <p className="text-xs font-black font-display text-emerald-400 mt-1 truncate">
                                    {getHudValue('team', (selectedGamer.teamHistory && selectedGamer.teamHistory.length > 0) ? selectedGamer.teamHistory[0].teamName : "SQUAD DELTA")}
                                  </p>
                                  <span className="text-[8px] font-mono text-zinc-500 block">role: leader ({selectedGamer.teamHistory?.length || 1})</span>
                                </div>

                                {/* Card 6: Followers */}
                                <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden group" style={cardBgStyle}>
                                  <p className="text-[8px] text-zinc-500 font-mono tracking-widest">FOLLOWERS</p>
                                  <p className="text-base font-black font-display text-fuchsia-400 mt-0.5">
                                    {getHudValue('followers', Number((selectedGamer.skillRating - 1000) * 3).toLocaleString())}
                                  </p>
                                  <span className="text-[8px] font-mono text-fuchsia-300 block">commendations: {selectedGamer.comments?.length || 0}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-4">
                          <h4 className="text-xs font-bold font-mono text-zinc-400 flex items-center gap-1">
                            <Award className="w-4 h-4 text-cyan-400" />
                            COMPETITIVE METRICS
                          </h4>
                          <div className="grid grid-cols-3 gap-2 text-center font-mono">
                            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                              <p className="text-[10px] text-zinc-500 tracking-wider">SKILL</p>
                              <p className="text-sm font-black text-rose-500">{selectedGamer.skillRating}</p>
                            </div>
                            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                              <p className="text-[10px] text-zinc-500 tracking-wider">K/D</p>
                              <p className="text-sm font-black text-cyan-400">{selectedGamer.kdRatio.toFixed(2)}</p>
                            </div>
                            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                              <p className="text-[10px] text-zinc-500 tracking-wider">WIN RATE</p>
                              <p className="text-sm font-black text-emerald-400">{selectedGamer.winRate}%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Platinum Exclusive Stickers Showcase */}
                    {isPlatinum && (
                      <div className="mt-6 space-y-3 relative z-10">
                        <h4 className="text-[10px] font-extrabold font-mono tracking-widest text-cyan-400 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-cyan-400 animate-spin [animation-duration:6s]" />
                          PLATINUM STICKER COLLECTION
                        </h4>
                        <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl flex items-center gap-3 overflow-x-auto">
                          {/* Render custom stickers unlocked by user */}
                          {selectedGamer.unlocked_stickers && selectedGamer.unlocked_stickers.length > 0 ? (
                            selectedGamer.unlocked_stickers.map((sticker, index) => (
                              <div key={index} className="flex flex-col items-center shrink-0 bg-gradient-to-b from-rose-950/40 to-zinc-950 border border-rose-500/30 rounded-xl p-2.5 w-18 h-18 justify-center relative group">
                                <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity animate-pulse"></div>
                                <div className="relative w-8 h-8 flex items-center justify-center">
                                  {/* Animated rotating SVG outline backing */}
                                  <svg className="absolute inset-0 w-full h-full text-rose-500/30 animate-spin [animation-duration:12s]" viewBox="0 0 100 100">
                                    <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="currentColor" strokeWidth="4" />
                                  </svg>
                                  <span className="text-xl relative z-10 animate-bounce">{sticker}</span>
                                </div>
                                <span className="text-[7px] text-zinc-400 font-mono tracking-widest truncate max-w-full uppercase mt-1">UNLOCKED</span>
                              </div>
                            ))
                          ) : null}
                          
                          {/* Render default legendary animatable stickers */}
                          {[
                            { emoji: "🔥", name: "Ignition", style: "animate-pulse" },
                            { emoji: "⚡", name: "Precision", style: "animate-bounce" },
                            { emoji: "👑", name: "Crown", style: "animate-pulse" },
                            { emoji: "👾", name: "Matrix", style: "animate-spin [animation-duration:8s]" }
                          ].map((sticker, idx) => (
                            <div key={idx} className="flex flex-col items-center shrink-0 bg-white/[0.02] border border-white/[0.04] rounded-xl p-2 w-16 h-16 justify-center text-center">
                              <span className={`text-2xl select-none filter drop-shadow-[0_0_8px_rgba(244,63,94,0.4)] ${sticker.style}`}>{sticker.emoji}</span>
                              <span className="text-[7.5px] font-mono text-rose-400 font-bold mt-1 tracking-tight truncate leading-none">{sticker.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                {/* About Bio */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-xs font-bold font-mono text-zinc-400 flex items-center gap-1">
                    <Award className="w-4 h-4 text-rose-500" />
                    PILOT BIOGRAPHY
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-zinc-850 italic">
                    "{selectedGamer.bio || 'This elite operator hasn\'t loaded a customized bio yet.'}"
                  </p>
                </div>

                {/* Achievements Badges */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-xs font-bold font-mono text-zinc-400 flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    MILITARY BADGES & COMMENDATIONS
                  </h4>
                  {selectedGamer.badges && selectedGamer.badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedGamer.badges.map((badge, idx) => (
                        <span key={idx} className="text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic font-mono pl-1">No custom badges registered.</p>
                  )}
                </div>

                {/* Team History */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-xs font-bold font-mono text-zinc-400 flex items-center gap-1">
                    <Users className="w-4 h-4 text-emerald-400" />
                    TEAM REGISTRATION HISTORIC
                  </h4>
                  {selectedGamer.teamHistory && selectedGamer.teamHistory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedGamer.teamHistory.map((th, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-zinc-950/50 border border-zinc-850 rounded-lg">
                          <div>
                            <p className="font-bold text-white">{th.teamName}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">Role: {th.role}</p>
                          </div>
                          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                            {th.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic font-mono pl-1">No historic team affiliations.</p>
                  )}
                </div>

                {/* Highlight Videos & Social links */}
                <div className="mt-6 space-y-3 pt-6 border-t border-zinc-800">
                  <div className="flex justify-center gap-4">
                    {selectedGamer.social.youtube && (
                      <a href={selectedGamer.social.youtube} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-red-500 transition-colors">
                        <Youtube className="w-5 h-5" />
                      </a>
                    )}
                    {selectedGamer.social.instagram && (
                      <a href={selectedGamer.social.instagram} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-pink-500 transition-colors">
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {selectedGamer.social.discord && (
                      <span className="text-zinc-400 hover:text-indigo-400 transition-colors flex items-center gap-1 text-xs font-mono cursor-pointer" title={selectedGamer.social.discord}>
                        <MessageSquare className="w-4 h-4" />
                        {selectedGamer.social.discord}
                      </span>
                    )}
                  </div>
                </div>

                {/* VOUCHES & COMMENDATIONS WALL */}
                <div className="mt-6 border-t border-zinc-800/80 pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold font-mono text-zinc-350 uppercase">PILOT COMMENDATIONS</h4>
                      <p className="text-[9px] text-zinc-550 font-mono">Endorsements, vouches, and recommendations from elite operators</p>
                    </div>
                  </div>

                  {/* List comments */}
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {!selectedGamer.comments || selectedGamer.comments.length === 0 ? (
                      <p className="text-[10px] text-zinc-650 italic pl-1 font-mono">No commendations posted yet. Be the first to vouch for this pilot!</p>
                    ) : (
                      selectedGamer.comments.map((comm) => (
                        <div key={comm.id} className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={comm.authorPhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80"}
                                className="w-5 h-5 rounded-full object-cover border border-zinc-800"
                                alt={comm.authorGamerName}
                              />
                              <p className="text-[10px] font-mono text-white flex items-center gap-1 font-bold">
                                {comm.authorGamerName}
                                {comm.authorMembership !== 'Free' && (
                                  <span className="text-[8px] tracking-wide text-amber-500 uppercase font-black" title={`${comm.authorMembership} Member`}>
                                    [{comm.authorMembership === 'Platinum' ? 'VIP' : comm.authorMembership}]
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="text-[8px] text-zinc-550 font-mono">{new Date(comm.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10.5px] text-zinc-300 font-sans leading-normal break-words pl-1 bg-zinc-900/40 py-1 px-1.5 rounded-lg">
                            {comm.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Post comment form */}
                  {currentUser ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newComment.trim()) return;
                        if (onAddComment) {
                          onAddComment(selectedGamer.id, newComment.trim());
                          setNewComment('');
                        } else {
                          addToast("Portfolio commendation feature loading...", "info");
                        }
                      }}
                      className="space-y-2 pt-1"
                    >
                      <textarea
                        rows={2}
                        placeholder="Type vouch endorsement (e.g. 'Highly certified dual shooter. Incredibly calm in clutches.')"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-[11px] text-white focus:outline-none focus:border-rose-500 placeholder-zinc-650 leading-normal"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        required
                        maxLength={250}
                      />
                      <button
                        type="submit"
                        className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/30 text-[9px] font-mono font-bold tracking-wider uppercase py-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        Transmit Commendation
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-850/60 text-center">
                      <p className="text-[9px] text-zinc-600 font-mono">AUTHENTICATION REQUIRED</p>
                      <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Please sign in from the user dashboard to endorse elite athletes.</p>
                    </div>
                  )}
                </div>

                {/* GAMER RECENT POSTS SECTION */}
                <div className="mt-6 border-t border-zinc-800/80 pt-5 space-y-4 text-left">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold font-mono text-zinc-350 uppercase">GAMER RECENT PUBLICATIONS</h4>
                      <p className="text-[9px] text-zinc-550 font-mono">Status updates, clips, screenshots and announcements from this operator</p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {recentPosts.length === 0 ? (
                      <p className="text-[10px] text-zinc-650 italic pl-1 font-mono">No publications or posts shared by this operator yet.</p>
                    ) : (
                      recentPosts.map((post) => (
                        <div key={post.id} className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                          <p className="text-[11.5px] text-zinc-200 leading-normal font-sans">
                            {post.content}
                          </p>
                          {post.image_url && (
                            <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 max-h-48 flex justify-center items-center">
                              <img
                                src={post.image_url}
                                alt="Gamer upload"
                                className="w-full max-h-48 object-cover object-center"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono pt-1 border-t border-zinc-900">
                            <span className="text-[8px] text-zinc-600">{new Date(post.created_at).toLocaleDateString()}</span>
                            <div className="flex gap-3">
                              <span>👍 {post.likes_count || 0} Likes</span>
                              <span>💬 {post.comments_count || 0} Comments</span>
                              <button
                                onClick={async () => {
                                  if (!currentUser) return addToast("Please sign in to report.", "warning");
                                  const reason = prompt("Enter moderation report reason:");
                                  if (reason && reason.trim()) {
                                    await supabaseSocialService.reportPost(post.id, currentUser.id, reason.trim());
                                    addToast("Publication reported for review.", "warning");
                                  }
                                }}
                                className="text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Flag className="w-2.5 h-2.5" />
                                Report
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </motion.div>
            );
          })()
        ) : (
              <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center py-12">
                <p className="text-zinc-500 text-sm font-mono uppercase tracking-wider mb-2">TARGET NOT SELECTED</p>
                <p className="text-xs text-zinc-600">Select any esports athlete from the directory list to examine their competitive portfolio file, stats, highlight clips, and medals.</p>
              </div>
            )}
          </AnimatePresence>

          {/* AdSense-ready directory ad slot */}
          <AdSenseSlot slotType="directory" className="w-full mt-4" />
        </div>
      </div>
    </div>
  );
}
