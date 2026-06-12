import React, { useRef } from 'react';
import { UserProfile, Team, Tournament, FeaturedItem } from '../types';
import { ChevronLeft, ChevronRight, Trophy, Users, Zap, Award, Sparkles, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface FeaturedPromotionProps {
  featuredItems: FeaturedItem[];
  users: UserProfile[];
  teams: Team[];
  tournaments: Tournament[];
  onNavigateToUser: (userId: string) => void;
  onNavigateToTeam: (teamId: string) => void;
  onNavigateToTournament: (tourney: Tournament) => void;
}

export default function FeaturedPromotion({
  featuredItems,
  users,
  teams,
  tournaments,
  onNavigateToUser,
  onNavigateToTeam,
  onNavigateToTournament
}: FeaturedPromotionProps) {
  const playersRef = useRef<HTMLDivElement>(null);
  const teamsRef = useRef<HTMLDivElement>(null);
  const tournamentsRef = useRef<HTMLDivElement>(null);

  // Filter items that are active (not expired)
  const isExpired = (expiryStr?: string) => {
    if (!expiryStr) return false;
    try {
      return new Date(expiryStr).getTime() < Date.now();
    } catch (e) {
      return false;
    }
  };

  const activeFeatItems = featuredItems.filter(f => !isExpired(f.expiry_date));

  // Extract profiles, teams, and tournaments that are featured either via featuredItems table or isFeatured boolean
  const featuredPlayers = users.filter(u => 
    u.isFeatured || 
    activeFeatItems.some(f => f.item_type === 'player' && f.item_id === u.id)
  );

  const featuredSquads = teams.filter(t => 
    t.isFeatured || 
    activeFeatItems.some(f => f.item_type === 'team' && f.item_id === t.id)
  );

  const featuredTourneys = tournaments.filter(t => 
    activeFeatItems.some(f => f.item_type === 'tournament' && f.item_id === t.id)
  );

  // Helper to check if an item is pinned in admin settings
  const isPinned = (item_id: string, type: 'player' | 'team' | 'tournament') => {
    const item = featuredItems.find(f => f.item_type === type && f.item_id === item_id);
    return item ? item.pinned : false;
  };

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 320;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Featured Tournament Slider */}
      {featuredTourneys.length > 0 && (
        <div id="feat-tournaments-slider" className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <h3 className="text-md font-extrabold text-white font-display tracking-wider flex items-center gap-2 uppercase italic">
              <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
              Featured Arenas & Tournaments
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => scroll(tournamentsRef, 'left')}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:text-white text-zinc-400 cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll(tournamentsRef, 'right')}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:text-white text-zinc-400 cursor-pointer transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={tournamentsRef}
            className="flex gap-4 overflow-x-auto scroll-smooth hide-scrollbar pb-2"
          >
            {/* Sort pinned first */}
            {[...featuredTourneys]
              .sort((a, b) => (isPinned(b.id, 'tournament') ? 1 : 0) - (isPinned(a.id, 'tournament') ? 1 : 0))
              .map(tourney => {
                const pinned = isPinned(tourney.id, 'tournament');
                return (
                  <div
                    key={tourney.id}
                    className="min-w-[320px] md:min-w-[420px] bg-zinc-900 border border-zinc-800 rounded-2xl relative overflow-hidden flex flex-col justify-between group transition-all hover:border-zinc-700"
                  >
                    {/* Badge */}
                    <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                      {pinned && (
                        <span className="text-[9px] bg-pink-500 text-white font-mono font-extrabold uppercase px-2 py-0.5 rounded flex items-center gap-0.5 shadow-lg">
                          <Sparkles className="w-2.5 h-2.5" /> PINNED
                        </span>
                      )}
                      <span className="text-[9px] bg-amber-500 text-black font-mono font-extrabold uppercase px-2 py-0.5 rounded">
                        FEATURED
                      </span>
                    </div>

                    {/* Image Header */}
                    <div className="h-40 relative bg-zinc-950 overflow-hidden">
                      <img
                        src={tourney.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80"}
                        alt={tourney.title}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-550"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3 font-mono">
                        <span className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wide bg-rose-950/80 px-2 py-0.5 rounded border border-rose-900/35">
                          {tourney.game}
                        </span>
                      </div>
                    </div>

                    {/* Item Body */}
                    <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-rose-400 transition-colors line-clamp-1 uppercase tracking-wide font-display">
                          {tourney.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {tourney.description || "Compete against master class operators in this professional tactical bracket."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-zinc-950/50 p-2 border border-zinc-850 rounded-xl font-mono">
                        <div>
                          <p className="text-zinc-500 uppercase font-black">Prize Pool</p>
                          <p className="text-emerald-400 font-black tracking-wide text-xs">
                            {tourney.prize_pool || tourney.prizePool || '₹50,000 INR'}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-500 uppercase font-black">Entry Fee</p>
                          <p className="text-cyan-400 font-black text-xs">
                            {tourney.entry_fee || 'Free'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigateToTournament(tourney)}
                        className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 group-hover:bg-rose-500 group-hover:text-white border border-zinc-800 group-hover:border-rose-500 transition-all font-mono text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest rounded-xl"
                      >
                        Enter Arena Block
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 2. Featured Player Carousel */}
      {featuredPlayers.length > 0 && (
        <div id="feat-players-carousel" className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <h3 className="text-md font-extrabold text-white font-display tracking-wider flex items-center gap-2 uppercase italic">
              <Zap className="w-5 h-5 text-rose-500 animate-pulse" />
              Featured Master Esports Players
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => scroll(playersRef, 'left')}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:text-white text-zinc-400 cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll(playersRef, 'right')}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:text-white text-zinc-400 cursor-pointer transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={playersRef}
            className="flex gap-4 overflow-x-auto scroll-smooth hide-scrollbar pb-2"
          >
            {[...featuredPlayers]
              .sort((a, b) => (isPinned(b.id, 'player') ? 1 : 0) - (isPinned(a.id, 'player') ? 1 : 0))
              .map(player => {
                const pinned = isPinned(player.id, 'player');
                const frameStyle = player.activeFrame || player.premiumFrame || "";
                
                return (
                  <div
                    key={player.id}
                    className="min-w-[280px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl relative p-5 flex flex-col justify-between group transition-all"
                  >
                    {/* Badges container */}
                    <div className="absolute top-3 right-3 flex gap-1 z-10">
                      {pinned && (
                        <span className="text-[8px] bg-pink-500 text-white font-mono px-1.5 py-0.5 rounded font-black uppercase">
                          PINNED
                        </span>
                      )}
                      {player.is_verified && (
                        <span className="text-[8px] bg-blue-500 text-white font-mono px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[4.5]" /> VERIFIED
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Avatar with custom optional frame */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-14 h-14 rounded-full overflow-hidden p-0.5 ${frameStyle ? frameStyle : "bg-gradient-to-tr from-rose-500 to-cyan-500"}`}>
                            <img
                              src={player.profilePhoto || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80"}
                              alt={player.gamerName}
                              className="w-full h-full object-cover rounded-full bg-zinc-950"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          {player.activeSticker && (
                            <span className="absolute -bottom-1 -right-1 text-base bg-zinc-950/85 rounded-full p-0.5 leading-none">
                              {player.activeSticker}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs text-zinc-400 font-mono font-bold">@{player.username}</h4>
                          <span className="text-sm font-black text-white group-hover:text-rose-400 transition-colors uppercase font-display tracking-tight flex items-center gap-1">
                            {player.gamerName}
                          </span>
                          <span className="text-[9px] bg-zinc-950 text-zinc-500 font-mono uppercase px-1.5 py-0.5 rounded">
                            {player.membership || 'Free'} Member
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {player.bio || "No custom bio registered. High caliber veteran shooter and support player."}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono bg-zinc-955/70 p-2.5 border border-zinc-850 rounded-xl">
                        <div>
                          <p className="text-zinc-500">K/D Ratio</p>
                          <p className="text-white font-black text-xs">{player.kdRatio || '2.45'}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Win Rate</p>
                          <p className="text-white font-black text-xs">{player.winRate || '54'}%</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateToUser(player.id)}
                      className="w-full py-2 bg-zinc-950 hover:bg-rose-500 hover:text-white border border-zinc-800 hover:border-rose-500 transition-all font-mono text-[10px] text-zinc-500 font-extrabold uppercase mt-4 rounded-lg tracking-wider"
                    >
                      Inspect Profile Record
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3. Featured Team Carousel */}
      {featuredSquads.length > 0 && (
        <div id="feat-teams-carousel" className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <h3 className="text-md font-extrabold text-white font-display tracking-wider flex items-center gap-2 uppercase italic">
              <Users className="w-5 h-5 text-cyan-500" />
              Featured Master Esports Teams
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => scroll(teamsRef, 'left')}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:text-white text-zinc-400 cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll(teamsRef, 'right')}
                className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:text-white text-zinc-400 cursor-pointer transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={teamsRef}
            className="flex gap-4 overflow-x-auto scroll-smooth hide-scrollbar pb-2"
          >
            {[...featuredSquads]
              .sort((a, b) => (isPinned(b.id, 'team') ? 1 : 0) - (isPinned(a.id, 'team') ? 1 : 0))
              .map(team => {
                const pinned = isPinned(team.id, 'team');
                return (
                  <div
                    key={team.id}
                    className="min-w-[280px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl relative p-5 flex flex-col justify-between group transition-all"
                  >
                    {/* Badge */}
                    <div className="absolute top-3 right-3 flex gap-1 z-10">
                      {pinned && (
                        <span className="text-[8px] bg-pink-500 text-white font-mono px-1.5 py-0.5 rounded font-black uppercase">
                          PINNED
                        </span>
                      )}
                      <span className="text-[8px] bg-cyan-500 text-black font-mono px-1.5 py-0.5 rounded font-black uppercase">
                        SQUAD
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Logo and info */}
                      <div className="flex items-center gap-3">
                        <img
                          src={team.logo || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                          alt={team.name}
                          className="w-12 h-12 rounded-xl object-cover bg-zinc-950 border border-zinc-800"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors uppercase font-display leading-tight">
                            {team.name}
                          </h4>
                          <span className="text-[9px] text-zinc-500 font-mono uppercase">
                            Ranking #{team.ranking || '15'} globally
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {team.bio || "Competitive active clan recruiting pro level tactical front liners."}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-zinc-955/70 p-2 border border-zinc-850 rounded-xl">
                        <div>
                          <p className="text-zinc-500">Active Game</p>
                          <p className="text-white font-extrabold line-clamp-1">{team.game || 'VALORANT'}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500">Total Members</p>
                          <p className="text-white font-black">{(team.members || []).length} / 10</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateToTeam(team.id)}
                      className="w-full py-2 bg-zinc-950 hover:bg-cyan-500 hover:text-black border border-zinc-800 hover:border-cyan-500 transition-all font-mono text-[10px] text-zinc-500 font-extrabold uppercase mt-4 rounded-lg tracking-wider"
                    >
                      Enlist / Inspect Team
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
