import React from 'react';
import { UserProfile } from '../types';
import { Trophy, ShieldAlert, Sparkles, CheckCircle2, Lock, Zap, Sword, Target, Award, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AchievementsProps {
  currentUser: UserProfile | null;
  onClaimAchievement: (achievementId: string, badgeName: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface AchievementDefinition {
  id: string;
  badge: string;
  title: string;
  description: string;
  requirementText: string;
  points: number;
  icon: React.ReactNode;
  checkEligible: (user: UserProfile) => boolean;
}

export default function Achievements({ currentUser, onClaimAchievement, addToast }: AchievementsProps) {
  
  const ACHIEVEMENTS_LIST: AchievementDefinition[] = [
    {
      id: "ach-mvp",
      badge: "Radiant MVP",
      title: "Radiant MVP",
      description: "Recognized as the primary carry operator on the team roster.",
      requirementText: "K/D ratio greater than or equal to 1.50",
      points: 150,
      icon: <Sword className="w-6 h-6 text-amber-400" />,
      checkEligible: (user) => user.kdRatio >= 1.5
    },
    {
      id: "ach-slayer",
      badge: "Pure Slayer",
      title: "Slayer God",
      description: "Pure tactical offense. Decimating enemy lobbies with mechanical aim superior to everyone.",
      requirementText: "K/D ratio greater than or equal to 3.50",
      points: 300,
      icon: <Target className="w-6 h-6 text-rose-500 animate-pulse" />,
      checkEligible: (user) => user.kdRatio >= 3.5
    },
    {
      id: "ach-streak",
      badge: "Streak Master",
      title: "Streak Master",
      description: "Winning in consistency. Maintaining strategic victory across consecutive maps.",
      requirementText: "Win rate greater than or equal to 55%",
      points: 100,
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      checkEligible: (user) => user.winRate >= 55
    },
    {
      id: "ach-clutch",
      badge: "Elite Sharpshooter",
      title: "Elite Sharpshooter",
      description: "Clutch mechanics when playing as the last remaining defender.",
      requirementText: "Gamer skill ranking greater than 4000 MMR",
      points: 250,
      icon: <Award className="w-6 h-6 text-fuchsia-400" />,
      checkEligible: (user) => user.skillRating >= 4000
    },
    {
      id: "ach-radiant",
      badge: "Tournament Winner",
      title: "Tournament Winner",
      description: "Stood upon official champion podium of any Arena Tournament.",
      requirementText: "Must have at least 1 tournament history podium entry",
      points: 400,
      icon: <Trophy className="w-6 h-6 text-yellow-400 animate-bounce" />,
      checkEligible: (user) => user.tournamentHistory.length > 0
    },
    {
      id: "ach-sponsor",
      badge: "Brand Backed",
      title: "Brand Backed Athlete",
      description: "Professional esports presence attract sponsors to fund your career.",
      requirementText: "Must upgrade to a premium Silver/Gold/Platinum tier profile",
      points: 200,
      icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
      checkEligible: (user) => user.membership !== 'Free'
    }
  ];

  const handleClaim = (ach: AchievementDefinition) => {
    if (!currentUser) {
      addToast("Please login first to claim achievement commendations!", "warning");
      return;
    }
    
    if (currentUser.achievements.includes(ach.id)) {
      addToast(`You have already claimed the "${ach.title}" badge!`, "info");
      return;
    }

    if (!ach.checkEligible(currentUser)) {
      addToast(`Requirement not met: ${ach.requirementText}`, "error");
      return;
    }

    onClaimAchievement(ach.id, ach.badge);
    addToast(`Outstanding! Claimed "${ach.title}" decoration! Check your updated profile.`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Upper Title */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <Trophy className="text-fuchsia-400 w-8 h-8" />
            Milestones & Badges
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Unlock cyber emblems, claim career merit points, and display medals directly on your shareable card</p>
        </div>

        {currentUser && (
          <div className="px-4 py-2 bg-zinc-950 rounded-xl border border-zinc-850 text-right font-mono text-xs">
            <p className="text-zinc-500">YOUR BADGES COLLECTION</p>
            <p className="text-fuchsia-400 font-bold font-display text-sm mt-0.5">
              {currentUser.achievements.length} / {ACHIEVEMENTS_LIST.length} Claimed
            </p>
          </div>
        )}
      </div>

      {/* Grid displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACHIEVEMENTS_LIST.map((ach) => {
          const isUnlocked = currentUser?.achievements.includes(ach.id) || false;
          const isEligible = currentUser ? ach.checkEligible(currentUser) : false;

          return (
            <div
              key={ach.id}
              className={`p-6 rounded-2xl bg-zinc-905 bg-zinc-900/40 border flex flex-col justify-between space-y-4 hover:border-zinc-750 transition-colors relative overflow-hidden ${
                isUnlocked 
                  ? 'border-fuchsia-500/30 shadow-md shadow-fuchsia-500/5' 
                  : 'border-zinc-850'
              }`}
            >
              <div>
                {/* Header Icon */}
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl bg-zinc-950 border ${isUnlocked ? 'border-fuchsia-500/40 text-fuchsia-400' : 'border-zinc-800 text-zinc-500'}`}>
                    {ach.icon}
                  </div>

                  {isUnlocked ? (
                    <span className="text-[10px] font-mono font-bold bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      LOCKED
                    </span>
                  )}
                </div>

                {/* Info Text */}
                <h3 className="text-lg font-extrabold text-white mt-4 tracking-wide">{ach.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 pb-4 border-b border-zinc-800/40 leading-relaxed italic">
                  "{ach.description}"
                </p>

                {/* Merit Requirement */}
                <div className="pt-3 space-y-1">
                  <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase font-black">Merit Unlock Metric:</span>
                  <p className={`text-xs font-mono font-bold ${isEligible ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {ach.requirementText}
                  </p>
                </div>
              </div>

              {/* Claim CTA Trigger */}
              <div className="pt-3">
                {isUnlocked ? (
                  <div className="w-full text-center text-xs font-mono bg-zinc-950/45 text-zinc-500 border border-zinc-850/80 py-2 rounded-xl">
                    COMMENDATION CLAIMED
                  </div>
                ) : (
                  <button
                    onClick={() => handleClaim(ach)}
                    className={`w-full py-2.5 rounded-xl font-bold font-mono text-xs transition-all uppercase ${
                      isEligible 
                        ? 'bg-fuchsia-500 text-white hover:bg-fuchsia-600 cursor-pointer shadow-md' 
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-500 cursor-not-allowed hover:bg-zinc-950/80'
                    }`}
                  >
                    {isEligible ? "🎁 CLAIM BADGE MEDAL" : "❌ REQUIREMENT NOT MET"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
