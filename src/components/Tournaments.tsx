import React, { useState } from 'react';
import { Tournament, UserProfile, Team } from '../types';
import { Trophy, Calendar, Users, Sparkles, CheckCircle2, ChevronRight, Gamepad2, Layers, AlertCircle, Clock, Medal, Clipboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TournamentsProps {
  tournaments: Tournament[];
  currentUser: UserProfile | null;
  userTeams: Team[];
  onRegisterSolo: (tournamentId: string, contactEmail: string) => void;
  onRegisterTeam: (tournamentId: string, teamId: string, contactEmail: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function Tournaments({
  tournaments,
  currentUser,
  userTeams,
  onRegisterSolo,
  onRegisterTeam,
  addToast
}: TournamentsProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'brackets'>('upcoming');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedRegType, setSelectedRegType] = useState<'solo' | 'team'>('solo');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [showRegModal, setShowRegModal] = useState(false);

  // Filter tournaments by state
  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming');
  const finishedTournaments = tournaments.filter(t => t.status === 'completed');

  const handleRegisterSubmit = (e: React.FormEvent) => {
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

    if (selectedRegType === 'team') {
      if (!selectedTeamId) {
        addToast("Please choose or build a squad to join!", "warning");
        return;
      }
      onRegisterTeam(selectedTournament.id, selectedTeamId, contactEmail);
    } else {
      onRegisterSolo(selectedTournament.id, contactEmail);
    }

    setShowRegModal(false);
    setSelectedTeamId('');
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

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <Trophy className="text-emerald-400 w-8 h-8" />
            Arena Tournaments
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Register for premium sponsor-baked open tournaments to verify your esports authority and win cash pools</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-850">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              activeTab === 'upcoming' ? 'bg-emerald-500 text-zinc-950 neon-glow-emerald' : 'text-zinc-400 hover:text-white'
            }`}
          >
            UPCOMING
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              activeTab === 'completed' ? 'bg-emerald-500 text-zinc-950 neon-glow-emerald' : 'text-zinc-400 hover:text-white'
            }`}
          >
            COMPLETED
          </button>
          <button
            onClick={() => {
              setActiveTab('brackets');
              if (tournaments.length > 0 && !selectedTournament) {
                setSelectedTournament(tournaments[0]);
              }
            }}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              activeTab === 'brackets' ? 'bg-emerald-500 text-zinc-950 neon-glow-emerald' : 'text-zinc-400 hover:text-white'
            }`}
          >
            LIVE BRACKETS
          </button>
        </div>
      </div>

      {/* Grid distribution */}
      {activeTab === 'upcoming' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {upcomingTournaments.length === 0 ? (
            <div className="lg:col-span-2 text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
              <Calendar className="w-12 h-12 text-zinc-650 mx-auto mb-3" />
              <p className="text-zinc-400 font-mono text-sm leading-relaxed">No upcoming tournaments available at this moment.</p>
            </div>
          ) : (
            upcomingTournaments.map((tourney) => {
              const isRegistered = tourney.registrants.some(r => r.id === currentUser?.id || userTeams.some(ut => ut.id === r.id));
              
              return (
                <div key={tourney.id} className="p-6 bg-zinc-900/60 border border-zinc-805/85 rounded-2xl hover:border-emerald-500/35 transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <Gamepad2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">{tourney.game}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        PRIZE: {tourney.prizePool}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold font-display text-white mt-1">{tourney.title}</h3>

                    {/* Registrations count line */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2 font-mono">
                      <span>SIGNUP TYPE: <span className="text-zinc-300 font-bold uppercase">{tourney.registrationType}</span></span>
                      <span>SLOTS: {tourney.registrants.length} / {tourney.maxTeams || 16}</span>
                    </div>

                    {/* Schedule summary */}
                    <div className="mt-4 p-3 bg-zinc-950/80 rounded-xl border border-zinc-850 space-y-2">
                      <p className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        EVENT TIMELINE
                      </p>
                      <div className="space-y-1.5">
                        {tourney.schedule.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-zinc-400 font-mono">
                            <span>{item.event}</span>
                            <span className="text-zinc-500">{item.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rules snippet */}
                    <div className="mt-4 space-y-1">
                      <p className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 font-bold">Rules Summary</p>
                      <ul className="text-xs text-zinc-400 space-y-0.5 list-none pl-1">
                        {tourney.rules.slice(0, 2).map((rule, idx) => (
                          <li key={idx} className="line-clamp-1 italic">• {rule}</li>
                        ))}
                        {tourney.rules.length > 2 && <li className="text-[10px] text-zinc-650">+ {tourney.rules.length - 2} more rules inside form...</li>}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/40">
                    {isRegistered ? (
                      <div className="w-full text-center text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-2.5 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        REGISTRATION CONFIRMED (PENDING REVIEWS)
                      </div>
                    ) : (
                      <button
                        onClick={() => openRegistration(tourney)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-2.5 rounded-xl text-xs font-mono tracking-wider transition-all neon-glow-emerald"
                      >
                        REGISTER NOW
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {finishedTournaments.length === 0 ? (
            <div className="lg:col-span-2 text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
              <Trophy className="w-12 h-12 text-zinc-650 mx-auto mb-3" />
              <p className="text-zinc-400 font-mono text-sm leading-relaxed">No historical events found.</p>
            </div>
          ) : (
            finishedTournaments.map((tourney) => (
              <div key={tourney.id} className="p-6 bg-zinc-900/40 border border-zinc-805/85 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">{tourney.game}</span>
                    <span className="text-[10px] font-mono font-bold px-2 px-1 rounded bg-zinc-800 text-zinc-400 uppercase">
                      COMPLETED
                    </span>
                  </div>

                  <h3 className="text-lg font-bold font-display text-white mt-1">{tourney.title}</h3>

                  <div className="mt-4 p-4 bg-zinc-950/80 rounded-xl border border-rose-500/20 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <p className="text-xs font-bold font-mono tracking-widest text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded w-fit">
                      <Medal className="w-4 h-4 text-amber-400" />
                      OFFICIAL PODIUM WINNERS
                    </p>

                    <div className="space-y-2 mt-2">
                      {tourney.winners && tourney.winners.length > 0 ? (
                        tourney.winners.map((winner, idx) => {
                          const medalColors = [
                            'text-amber-400 bg-amber-500/10 border-amber-500/20',
                            'text-zinc-300 bg-zinc-300/10 border-zinc-300/20',
                            'text-amber-700 bg-amber-700/10 border-amber-700/20'
                          ];
                          return (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-zinc-900/60 border border-zinc-850 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-[10px] ${medalColors[idx] || 'text-zinc-400'}`}>
                                  {winner.rank}
                                </span>
                                <span className="font-bold text-white tracking-wide">{winner.name}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-green-400">{winner.prize}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-zinc-500 italic text-xs font-mono">No leaderboard registers uploaded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'brackets' && (
        <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur-xl relative space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Challenger Elimination Brackets</h3>
              <p className="text-zinc-400 text-xs mt-0.5">Realtime progress rendering from quarters, semi-finals up to grand physical podium finals</p>
            </div>

            {/* Select bracket to show */}
            <select
              className="bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
              value={selectedTournament?.id || ''}
              onChange={(e) => {
                const tourney = tournaments.find(t => t.id === e.target.value);
                if (tourney) setSelectedTournament(tourney);
              }}
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.game})</option>
              ))}
            </select>
          </div>

          {selectedTournament && selectedTournament.bracket && selectedTournament.bracket.length > 0 ? (
            <div className="flex flex-col md:flex-row gap-8 justify-around items-stretch pt-4 overflow-x-auto">
              {selectedTournament.bracket.map((round) => (
                <div key={round.roundNumber} className="flex-1 min-w-[240px] space-y-6 flex flex-col justify-center">
                  <div className="text-center pb-2 border-b border-zinc-800/80 mb-2">
                    <span className="text-xs font-mono font-black text-emerald-400 tracking-widest uppercase bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">
                      {round.roundName}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {round.matches.map((match) => (
                      <div key={match.id} className="p-3.5 bg-zinc-950/90 border border-zinc-805/80 hover:border-zinc-700 transition-colors rounded-xl font-mono text-xs relative space-y-2">
                        <span className="absolute -top-2 left-3 bg-zinc-800 text-[9px] uppercase font-bold text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                          {match.stageName}
                        </span>

                        <div className="space-y-1.5 pt-1">
                          <div className={`flex justify-between items-center p-1.5 rounded ${
                            match.winner === match.player1 ? 'bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20' : 'text-zinc-400'
                          }`}>
                            <span className="truncate max-w-[150px]">{match.player1}</span>
                            <span className="text-xs font-black">{match.score1 !== undefined ? match.score1 : '-'}</span>
                          </div>

                          <div className="text-center text-[9px] text-zinc-650">- VS -</div>

                          <div className={`flex justify-between items-center p-1.5 rounded ${
                            match.winner === match.player2 ? 'bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20' : 'text-zinc-400'
                          }`}>
                            <span className="truncate max-w-[150px]">{match.player2}</span>
                            <span className="text-xs font-black">{match.score2 !== undefined ? match.score2 : '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500 font-mono italic">No interactive matches loaded. If this tournament is recently drafted, brackets will load when qualifiers open.</p>
            </div>
          )}
        </div>
      )}

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
                <p className="text-zinc-500 font-mono">SELECTED TOURNAMENT</p>
                <p className="text-white font-bold text-sm mt-0.5">{selectedTournament.title}</p>
                <div className="flex justify-between text-zinc-400 mt-1.5 font-mono text-[10px]">
                  <span>SUPPORTED GAME: {selectedTournament.game}</span>
                  <span className="text-amber-400">PRIZE: {selectedTournament.prizePool}</span>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Registration Format</label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl">
                    <button
                      type="button"
                      disabled={selectedTournament.registrationType === 'team'}
                      onClick={() => setSelectedRegType('solo')}
                      className={`py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                        selectedRegType === 'solo' ? 'bg-emerald-505 bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400'
                      } ${selectedTournament.registrationType === 'team' ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      SOLO REGISTRATION
                    </button>
                    <button
                      type="button"
                      disabled={selectedTournament.registrationType === 'solo'}
                      onClick={() => setSelectedRegType('team')}
                      className={`py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                        selectedRegType === 'team' ? 'bg-emerald-505 bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400'
                      } ${selectedTournament.registrationType === 'solo' ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      SQUAD REGISTRATION
                    </button>
                  </div>
                  {selectedTournament.registrationType === 'team' && (
                    <span className="text-[10px] text-zinc-500 mt-1 block">This tournament strictly mandates competitive squad registration.</span>
                  )}
                </div>

                {selectedRegType === 'team' && (
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Choose Squad Roster *</label>
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
                      <p className="text-[11px] text-rose-400 mt-1 italic font-mono">You haven't formed any squads yet! Please build one in the Team Finder tab before signing up.</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Point of Contact Email/Discord *</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-emerald-500 rounded-xl px-4 py-2.5 focus:outline-none"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 font-sans">We will send match lobbies, passwords, and custom rules here.</p>
                </div>

                {/* Rules Checklist */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-1.5">
                  <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black">REGISTRATION DECLARATION</p>
                  <div className="text-[10px] text-zinc-500 space-y-1">
                    <p>✓ I verify our team meets anti-cheat mandates.</p>
                    <p>✓ Any stream streams sniping or griefing actions are final grounds for disqualification.</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all neon-glow-emerald"
                  >
                    SUBMIT VERIFICATION SIGNUP
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
