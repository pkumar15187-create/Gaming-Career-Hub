import React, { useState } from 'react';
import { UserProfile, MembershipType, AdminSettings, ProfileComment } from '../types';
import { Search, MapPin, Gamepad2, Award, Zap, Heart, Share2, Youtube, Instagram, MessageSquare, Trophy, Calendar, Users, Eye, Sparkles, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserProfileFrameClass, getUserCardGlowClass, getUserProfileBannerStyle, getUserTierBadgeIcon } from '../lib/premiumUtils';

interface GamerProfilesProps {
  users: UserProfile[];
  currentUser: UserProfile | null;
  adminSettings: AdminSettings;
  onToggleSave: (targetUserId: string) => void;
  onNavigateToSponsors?: (presetGamerName?: string) => void;
  onAddComment?: (targetUserId: string, text: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function GamerProfiles({ users, currentUser, adminSettings, onToggleSave, onNavigateToSponsors, onAddComment, addToast }: GamerProfilesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState('All');
  const [minKd, setMinKd] = useState('');
  const [selectedMembership, setSelectedMembership] = useState('All');
  const [selectedGamer, setSelectedGamer] = useState<UserProfile | null>(null);
  const [newComment, setNewComment] = useState('');

  // List of unique supported games
  const gamesList = ["All", "Free Fire", "BGMI", "PUBG Mobile", "COD Mobile", "Valorant", "CS2", "GTA V"];

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
                              <h3 className="font-bold text-white tracking-wide group-hover:text-rose-400 transition-colors flex items-center gap-1">
                                {gamer.gamerName}
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
              <motion.div
                key={selectedGamer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`bg-zinc-900/95 border border-zinc-805 rounded-2xl p-6 relative overflow-hidden shadow-2xl ${getUserCardGlowClass(selectedGamer)}`}
              >
                {/* Background Banner style */}
                <div className={`h-24 -mx-6 -mt-6 mb-6 relative overflow-hidden bg-zinc-950 ${getUserProfileBannerStyle(selectedGamer, adminSettings)}`}>
                  {/* Close banner trigger */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={() => setSelectedGamer(null)}
                      className="text-white hover:bg-black/60 text-[10px] px-2.5 py-1 rounded bg-black/40 backdrop-blur-md border border-white/10 font-mono font-bold tracking-widest uppercase cursor-pointer"
                    >
                      CLOSE ✕
                    </button>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent"></div>
                </div>

                {/* Profile Card */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <img
                      src={selectedGamer.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                      alt={selectedGamer.gamerName}
                      referrerPolicy="no-referrer"
                      className={`w-24 h-24 rounded-2xl object-cover border border-zinc-800 ${getUserProfileFrameClass(selectedGamer, adminSettings)}`}
                    />
                    {selectedGamer.activeSticker && (
                      <span className="absolute -bottom-1.5 -right-1.5 text-2xl bg-zinc-950 border border-zinc-850 rounded-full w-8 h-8 flex items-center justify-center select-none shadow animate-pulse">
                        {selectedGamer.activeSticker}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black font-display text-white mt-4 tracking-wide flex items-center justify-center gap-1.5 flex-wrap">
                    {selectedGamer.gamerName}
                    {getUserTierBadgeIcon(selectedGamer, adminSettings) && (
                      <span className="text-xs shrink-0" title={getUserTierBadgeIcon(selectedGamer, adminSettings)}>
                        {getUserTierBadgeIcon(selectedGamer, adminSettings).split(' ')[0]}
                      </span>
                    )}
                  </h3>
                  
                  {selectedGamer.membership !== 'Free' && (
                    <span className="text-[9px] bg-rose-500/15 border border-rose-500/25 text-rose-400 font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded mt-1.5">
                      {selectedGamer.membership === 'Platinum' ? '👑 PLATINUM VIP' : `${selectedGamer.membership} MEMBER`}
                    </span>
                  )}

                  <p className="text-xs text-rose-450 font-mono tracking-widest mt-2 uppercase">
                    {selectedGamer.favoriteGames.join(" / ")}
                  </p>
                  <p className="text-zinc-550 text-xs flex items-center gap-1 justify-center mt-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedGamer.city}, {selectedGamer.state}, {selectedGamer.country}
                  </p>

                  <div className="flex gap-2.5 mt-4">
                    <button
                      onClick={() => handleShare(selectedGamer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-medium transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Get Link
                    </button>

                    {onNavigateToSponsors && (
                      <button
                        onClick={() => onNavigateToSponsors(selectedGamer.gamerName)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs text-white font-medium transition-all neon-glow-pink"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Sponsor Me
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats Matrix */}
                <div className="mt-6 p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-4">
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
              </motion.div>
            ) : (
              <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center py-12">
                <p className="text-zinc-500 text-sm font-mono uppercase tracking-wider mb-2">TARGET NOT SELECTED</p>
                <p className="text-xs text-zinc-600">Select any esports athlete from the directory list to examine their competitive portfolio file, stats, highlight clips, and medals.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
