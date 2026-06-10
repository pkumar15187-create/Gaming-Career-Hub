import React, { useState } from 'react';
import { UserProfile, Team, Tournament, AdminSettings } from '../types';
import { Trophy, Star, Gamepad2, Award, Zap, Flame, Compass, ChevronDown, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { getUserProfileFrameClass, getUserCardGlowClass, getUserTierBadgeIcon, getUserNameColorClass, isUserVIP } from '../lib/premiumUtils';
import AdSenseSlot from './AdSenseSlot';

interface LeaderboardProps {
  users: UserProfile[];
  teams: Team[];
  tournaments: Tournament[];
  adminSettings: AdminSettings;
}

export default function Leaderboard({ users, teams, tournaments, adminSettings }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'gamers' | 'teams' | 'winners'>('gamers');
  const [selectedGame, setSelectedGame] = useState('All');

  const gamesList = ["All", "Free Fire", "BGMI", "PUBG Mobile", "COD Mobile", "Valorant", "CS2", "GTA V"];

  // Filter and sort gamers
  const rankedGamers = [...users]
    .filter(u => {
      if (u.isBanned) return false;
      return selectedGame === 'All' || u.favoriteGames.includes(selectedGame);
    })
    .sort((a, b) => b.skillRating - a.skillRating);

  // Filter and sort teams
  const rankedTeams = [...teams]
    .filter(t => selectedGame === 'All' || t.game === selectedGame)
    .sort((a, b) => a.ranking - b.ranking); // lower rank number (1, 2) is better, or ranking score is better. Let's sorting higher score or rank 1 to top. Wait, ranking value is usually (1st, 2nd, etc), so lower rank should be at the top! Let's sort: (a, b) => a.ranking - b.ranking.

  // Extract completed tournament winners
  const completedTournaments = tournaments.filter(t => t.status === 'completed' && (selectedGame === 'All' || t.game === selectedGame));

  return (
    <div className="space-y-6">
      {/* Header section with tab selectors */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <Trophy className="text-amber-400 w-8 h-8" />
            Global Hall of Fame
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Realtime competitive leaderboards demonstrating top tactical gamers, active squads, and tournament champions</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
          <button
            onClick={() => setActiveTab('gamers')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              activeTab === 'gamers' ? 'bg-amber-400 text-zinc-950 neon-glow-emerald' : 'text-zinc-400 hover:text-white'
            }`}
          >
            TOP GAMERS
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              activeTab === 'teams' ? 'bg-amber-400 text-zinc-950 neon-glow-emerald' : 'text-zinc-400 hover:text-white'
            }`}
          >
            SQUAD RANKINGS
          </button>
          <button
            onClick={() => setActiveTab('winners')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              activeTab === 'winners' ? 'bg-amber-400 text-zinc-950 neon-glow-emerald' : 'text-zinc-400 hover:text-white'
            }`}
          >
            ARENA WINNERS
          </button>
        </div>
      </div>

      {/* Filter and game selectors */}
      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-2xl justify-between items-center">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase font-black">Filter by Game Engine:</span>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center">
          {gamesList.map((game) => (
            <button
              key={game}
              onClick={() => setSelectedGame(game)}
              className={`px-3.5 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                selectedGame === game
                  ? 'bg-amber-400/20 text-text-white border-amber-400 text-amber-300 shadow-md shadow-amber-400/5'
                  : 'bg-zinc-950/80 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-750'
              }`}
            >
              {game}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of details */}
      <div className="bg-zinc-900/60 border border-zinc-805/85 rounded-2xl overflow-hidden backdrop-blur-xl">
        {activeTab === 'gamers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/60 font-mono text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="p-4 pl-6 text-center w-20">Rank</th>
                  <th className="p-4">Gamer Profile</th>
                  <th className="p-4">Skill Rating</th>
                  <th className="p-4">Favorite Games</th>
                  <th className="p-4 text-center">K/D Ratio</th>
                  <th className="p-4 text-center">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 font-sans">
                {rankedGamers.map((gamer, index) => {
                  const isTopThree = index < 3;
                  const medalColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
                  
                  return (
                    <tr key={gamer.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="p-4 pl-6 text-center font-mono font-bold">
                        {isTopThree ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-sm ${medalColors[index]}`}>
                            {index === 0 && "🥇"}
                            {index === 1 && "🥈"}
                            {index === 2 && "🥉"}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono">#{index + 1}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={gamer.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                              alt={gamer.gamerName}
                              referrerPolicy="no-referrer"
                              className={`w-10 h-10 rounded-xl object-cover border border-zinc-850 ${getUserProfileFrameClass(gamer, adminSettings)}`}
                            />
                            {gamer.activeSticker && (
                              <span className="absolute -bottom-1 -right-1 text-[11px] bg-zinc-950 border border-zinc-850 rounded-full w-4.5 h-4.5 flex items-center justify-center select-none shadow">
                                {gamer.activeSticker}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold flex items-center gap-1.5 flex-wrap">
                              <span className={getUserNameColorClass(gamer)}>
                                {gamer.gamerName}
                              </span>
                              {isUserVIP(gamer) && (
                                <span className="text-[9px] bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-1.5 py-0.5 rounded font-mono font-extrabold shadow shadow-rose-500/20">VIP</span>
                              )}
                              {getUserTierBadgeIcon(gamer, adminSettings) && (
                                <span className="text-[11px]" title={getUserTierBadgeIcon(gamer, adminSettings)}>
                                  {getUserTierBadgeIcon(gamer, adminSettings).split(' ')[0]}
                                </span>
                              )}
                              {gamer.membership !== 'Free' && (
                                <span className="text-[8px] bg-rose-500/10 text-rose-450 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                  {gamer.membership === 'Platinum' ? '👑 PLATINUM VIP' : gamer.membership}
                                </span>
                              )}
                            </p>
                            <span className="text-xs text-zinc-500">{gamer.city}, {gamer.country}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono">
                        <span className="flex items-center gap-1 font-extrabold text-amber-400">
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          {gamer.skillRating}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {gamer.favoriteGames.map(game => (
                            <span key={game} className="text-[10px] bg-zinc-950 font-mono text-cyan-400 px-2 py-0.5 rounded border border-zinc-850">
                              {game}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-cyan-400">
                        {gamer.kdRatio.toFixed(2)}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-emerald-400">
                        {gamer.winRate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rankedGamers.length === 0 && (
              <div className="text-center py-16 text-zinc-500 font-mono text-xs">
                No active gamers match the game filters.
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/60 font-mono text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="p-4 pl-6 text-center w-20">Rank</th>
                  <th className="p-4">Squad Name</th>
                  <th className="p-4">Game Discipline</th>
                  <th className="p-4">Commander</th>
                  <th className="p-4 text-center">Roster Volume</th>
                  <th className="p-4">Vacancy Recruitment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 font-sans">
                {rankedTeams.map((team, index) => {
                  const isTopThree = index < 3;
                  const colors = ['text-amber-400 border-amber-500/20', 'text-slate-300 border-slate-500/20', 'text-amber-700 border-amber-700/20'];
                  
                  return (
                    <tr key={team.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="p-4 pl-6 text-center font-mono font-bold">
                        {isTopThree ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border ${colors[index]} text-sm`}>
                            {index === 0 && "🥇"}
                            {index === 1 && "🥈"}
                            {index === 2 && "🥉"}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono">#{index + 1}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={team.logo || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150"}
                            alt={team.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover border border-zinc-800"
                          />
                          <div>
                            <p className="font-extrabold text-white tracking-wide">{team.name}</p>
                            <p className="text-xs text-zinc-500 line-clamp-1 italic">"{team.bio}"</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2.5 py-0.5 rounded-full uppercase">
                          {team.game}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">
                        {team.creatorGamerName}
                      </td>
                      <td className="p-4 text-center font-mono font-black text-white">
                        {team.members.length} / 5
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono text-zinc-400">
                          Looking for: <span className="text-amber-400 font-bold">{team.requiredRole}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rankedTeams.length === 0 && (
              <div className="text-center py-16 text-zinc-500 font-mono text-xs">
                No squad records found matching filter constraints.
              </div>
            )}
          </div>
        )}

        {activeTab === 'winners' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedTournaments.map((tourney) => (
                <div key={tourney.id} className="p-5 bg-zinc-950/70 border border-zinc-805/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white tracking-wide">{tourney.title}</h4>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Game: {tourney.game} • Prize Pot: {tourney.prizePool}</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono px-2 py-0.5 rounded uppercase font-bold">
                      Verified
                    </span>
                  </div>

                  <div className="space-y-2 font-mono">
                    {tourney.winners && tourney.winners.length > 0 ? (
                      tourney.winners.map((winner, index) => {
                        const trophyColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
                        return (
                          <div key={index} className="flex justify-between items-center text-xs p-2 bg-zinc-900/60 border border-zinc-850 rounded-lg">
                            <span className="flex items-center gap-2">
                              <Star className={`w-3.5 h-3.5 fill-current ${trophyColors[index] || 'text-zinc-500'}`} />
                              <span>{winner.rank} Place: <strong className="text-white font-sans">{winner.name}</strong></span>
                            </span>
                            <span className="font-bold text-emerald-400">{winner.prize}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-zinc-650 italic text-xs pl-2">No prize distributions details recorded.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {completedTournaments.length === 0 && (
              <div className="text-center py-10 text-zinc-500 font-mono text-xs">
                No finished match summaries recorded.
              </div>
            )}
          </div>
        )}
      </div>

      {/* AdSense-ready leaderboard slot */}
      <AdSenseSlot slotType="leaderboard" className="mt-8" />
    </div>
  );
}
