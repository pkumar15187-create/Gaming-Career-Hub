import React, { useState } from 'react';
import { Team, UserProfile } from '../types';
import { Users, Plus, Star, Shield, Search, Send, Check, X, ShieldAlert, BookOpen, MessageSquare, Gamepad2, UserCheck, Sparkles, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UploadField from './UploadField';

interface TeamFinderProps {
  teams: Team[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  onCreateTeam: (teamData: Omit<Team, 'id' | 'ranking' | 'creatorId' | 'creatorGamerName' | 'members' | 'pendingRequests' | 'pendingInvites'>) => void;
  onSendJoinRequest: (teamId: string, message: string) => void;
  onAcceptJoinRequest: (teamId: string, applicantId: string) => void;
  onRejectJoinRequest: (teamId: string, applicantId: string) => void;
  onLeaveTeam: (teamId: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function TeamFinder({
  teams,
  users,
  currentUser,
  onCreateTeam,
  onSendJoinRequest,
  onAcceptJoinRequest,
  onRejectJoinRequest,
  onLeaveTeam,
  addToast
}: TeamFinderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState('All');

  // Create Team form states
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [teamBio, setTeamBio] = useState('');
  const [gameCategory, setGameCategory] = useState('Valorant');
  const [requiredRole, setRequiredRole] = useState('All-Rounder');

  // Request to join message state
  const [showRequestInputId, setShowRequestInputId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  // Predefined game list
  const gamesList = ["Free Fire", "BGMI", "PUBG Mobile", "COD Mobile", "Valorant", "CS2", "GTA V"];

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast("You must be logged in to create a team!", "warning");
      return;
    }
    if (!teamName || !teamBio) {
      addToast("Please fill in the team name and biography!", "warning");
      return;
    }

    // Set fallback logo if none provided
    const logoUrl = teamLogo.trim() || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80";

    onCreateTeam({
      name: teamName,
      logo: logoUrl,
      bio: teamBio,
      game: gameCategory,
      requiredRole: requiredRole
    });

    // Reset fields
    setTeamName('');
    setTeamLogo('');
    setTeamBio('');
    setShowCreateModal(false);
  };

  const submitJoinRequest = (teamId: string) => {
    if (!currentUser) {
      addToast("Login first to send recruiting requests!", "warning");
      return;
    }
    if (!requestMessage.trim()) {
      addToast("Please enter a short pitch message to recruit!", "warning");
      return;
    }
    onSendJoinRequest(teamId, requestMessage);
    setRequestMessage('');
    setShowRequestInputId(null);
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          team.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGame = selectedGameFilter === 'All' || team.game === selectedGameFilter;
    return matchesSearch && matchesGame;
  });

  return (
    <div className="space-y-6">
      {/* Header element */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/60 p-6 border border-zinc-800 rounded-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-700/5 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <Users className="text-cyan-400 w-8 h-8" />
            Squad Recruitments
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Conquer local matches and pro leagues by recruiting top tier gaming squadmates</p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) {
              addToast("Please login first to construct a squad!", "warning");
              return;
            }
            setShowCreateModal(true);
          }}
          className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-bold px-5 py-3 rounded-xl flex items-center gap-1.5 transition-all text-sm neon-glow-blue"
        >
          <Plus className="w-5 h-5 stroke-[2.5px]" />
          Create Team
        </button>
      </div>

      {/* Filter and roster search bars */}
      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-2xl">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Search teams by name, bio tag lines..."
            className="w-full bg-zinc-950/85 border border-zinc-800 focus:border-cyan-500 rounded-xl px-11 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            className="w-full bg-zinc-950/85 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none transition-all"
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
          >
            <option value="All">All Games</option>
            {gamesList.map((game) => (
              <option key={game} value={game}>{game}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTeams.map((team) => {
          const isCreator = currentUser?.id === team.creatorId;
          const isMember = team.members.some(m => m.userId === currentUser?.id);
          const hasRequested = team.pendingRequests.some(r => r.userId === currentUser?.id);

          return (
            <div
              key={team.id}
              className={`bg-zinc-900/60 p-6 border rounded-2xl backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors ${
                isCreator ? 'border-cyan-500/40 shadow-md shadow-cyan-500/5' : 'border-zinc-805/80'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={team.logo || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150"}
                    alt={team.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-800 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-white tracking-wide">{team.name}</h3>
                      <span className="text-[10px] uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 px-2 py-0.5 rounded-full font-mono font-medium">
                        {team.game}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Led by <span className="text-zinc-400 font-medium">{team.creatorGamerName}</span> • Rank #{team.ranking}
                    </p>
                  </div>
                </div>

                {isCreator && (
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/20 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Squad Owner
                  </span>
                )}
              </div>

              {/* Biography Details */}
              <p className="text-zinc-400 text-xs leading-relaxed italic">
                "{team.bio}"
              </p>

              {/* Roster members summary */}
              <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-850">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40 mb-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">ROSTER LIST ({team.members.length})</span>
                  <span className="text-[10px] text-cyan-400 font-mono">VACANCY: {team.requiredRole}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((member) => (
                    <span
                      key={member.userId}
                      className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 md:text-zinc-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-mono"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${member.role.toLowerCase().includes('igl') ? 'bg-amber-400' : 'bg-cyan-500'}`} />
                      {member.gamerName}
                      <span className="text-[9px] text-zinc-500">({member.role})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons & Recruiting requests display */}
              <div className="pt-3 border-t border-zinc-800/40">
                {/* Standard gamer controls */}
                {!isCreator && !isMember && (
                  <div className="space-y-3">
                    {hasRequested ? (
                      <div className="w-full text-center text-xs font-mono bg-zinc-950/55 border border-zinc-800/60 text-zinc-400 py-2.5 rounded-xl">
                        Application Sent (Pending Approval)
                      </div>
                    ) : (
                      <>
                        {showRequestInputId !== team.id ? (
                          <button
                            onClick={() => setShowRequestInputId(team.id)}
                            className="w-full bg-zinc-950 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 md:text-cyan-300 hover:text-white py-2.5 rounded-xl font-bold font-mono text-xs tracking-wider transition-all"
                          >
                            REQUEST TO JOIN SQUAD
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              placeholder="Describe your role, stats, and why we should recruit you..."
                              className="w-full bg-zinc-950 text-white placeholder-zinc-600 border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:border-cyan-500"
                              value={requestMessage}
                              rows={2}
                              onChange={(e) => setRequestMessage(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitJoinRequest(team.id)}
                                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-bold py-2 rounded-lg text-xs font-mono"
                              >
                                Submit Request
                              </button>
                              <button
                                onClick={() => setShowRequestInputId(null)}
                                className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isMember && !isCreator && (
                  <button
                    onClick={() => onLeaveTeam(team.id)}
                    className="w-full border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:bg-rose-500/5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave Team
                  </button>
                )}

                {/* Squad Commander controls */}
                {isCreator && (
                  <div className="space-y-3 mt-2">
                    <h4 className="text-[10px] font-bold font-mono tracking-widest text-zinc-500 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                      RECRUITMENT PIPELINE ({team.pendingRequests.length})
                    </h4>
                    {team.pendingRequests.length === 0 ? (
                      <p className="text-[11px] text-zinc-500 font-mono italic pl-1">No active applicants. Share your profile to invite others!</p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {team.pendingRequests.map((req) => (
                          <div key={req.userId} className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-cyan-400">{req.gamerName}</span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => onAcceptJoinRequest(team.id, req.userId)}
                                  className="p-1 bg-emerald-500/20 border border-emerald-500/35 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 rounded transition-all"
                                  title="Accept"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onRejectJoinRequest(team.id, req.userId)}
                                  className="p-1 bg-rose-500/20 border border-rose-500/35 hover:bg-rose-500 text-rose-400 hover:text-white rounded transition-all"
                                  title="Decline"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-400 italic">"{req.message}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-cyan-500/40 rounded-2xl w-full max-w-lg p-6 z-10 space-y-4 neon-glow-blue"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <h3 className="text-xl font-black font-display text-white flex items-center gap-2">
                  <Gamepad2 className="text-cyan-400 w-5 h-5 animate-pulse" />
                  CONSTRUCT SQUAD
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1.5">Team Identity Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Redline Warriors"
                    className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>

                <div>
                  <UploadField 
                    id="team-logo-upload"
                    bucketName="team_logos"
                    label="Team Logotype"
                    value={teamLogo}
                    onChange={(url) => setTeamLogo(url)}
                    placeholder="Drop squad logo here, or select"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1.5">Game Category</label>
                    <select
                      className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none"
                      value={gameCategory}
                      onChange={(e) => setGameCategory(e.target.value)}
                    >
                      {gamesList.map((game) => (
                        <option key={game} value={game}>{game}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1.5">Vacant Role Needed</label>
                    <select
                      className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none"
                      value={requiredRole}
                      onChange={(e) => setRequiredRole(e.target.value)}
                    >
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="In-Game Leader (IGL)">In-Game Leader (IGL)</option>
                      <option value="Sniper / Marskman">Sniper / Marskman</option>
                      <option value="Assaulter / Entry Fragger">Assaulter / Entry Fragger</option>
                      <option value="Support / Controller">Support / Controller</option>
                      <option value="Coach / Analyst">Coach / Analyst</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-zinc-400 mb-1.5">Cohesion Bio & Goals *</label>
                  <textarea
                    required
                    placeholder="Explain play schedules, core requirements, competitive goal, and social pitch..."
                    className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    rows={3}
                    value={teamBio}
                    onChange={(e) => setTeamBio(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all neon-glow-blue"
                  >
                    CONSTRUCT AND PERSIST SQUAD
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
