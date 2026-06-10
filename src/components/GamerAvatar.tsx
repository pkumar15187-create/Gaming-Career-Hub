import React from 'react';
import { UserProfile, AdminSettings } from '../types';
import { getUserProfileFrameClass } from '../lib/premiumUtils';
import { Zap, Sparkles } from 'lucide-react';

interface GamerAvatarProps {
  user: UserProfile;
  adminSettings?: AdminSettings;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  customSizeClass?: string;
}

export const GamerAvatar: React.FC<GamerAvatarProps> = ({
  user,
  adminSettings,
  size = 'md',
  customSizeClass = '',
}) => {
  const isPlatinum = user.membership === 'Platinum' && user.membershipStatus === 'active';
  const isGold = user.membership === 'Gold' && user.membershipStatus === 'active';
  const isSilver = user.membership === 'Silver' && user.membershipStatus === 'active';
  const shape = user.frame_shape || 'circle';

  let sizeClass = 'w-12 h-12';
  if (size === 'sm') sizeClass = 'w-9 h-9';
  if (size === 'lg') sizeClass = 'w-16 h-16';
  if (size === 'xl') sizeClass = 'w-24 h-24 md:w-28 md:h-28';
  if (size === 'custom') sizeClass = customSizeClass;

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  // Base avatar boundary with custom glow and outline
  let ringStyle = '';
  if (isPlatinum) {
    ringStyle = 'animate-pulseGlow shadow-[0_0_20px_rgba(244,63,94,0.6)] border-rose-500/85';
  } else if (isGold) {
    ringStyle = 'shadow-[0_0_12px_rgba(245,158,11,0.5)] border-amber-400';
  } else if (isSilver) {
    ringStyle = 'border-slate-400/60 shadow-[0_0_8px_rgba(148,163,184,0.3)]';
  } else {
    ringStyle = 'border-zinc-800';
  }

  // Active Frame Image from storage
  const frameImageUrl = user.active_frame_url;

  return (
    <div className={`relative shrink-0 flex items-center justify-center`} style={{ padding: '4px' }}>
      {/* 1. Platinum Exclusive Rotating Energy Ring */}
      {isPlatinum && (
        <div className="absolute inset-0 z-0">
          <svg className="w-full h-full animate-rotateRing text-rose-500/40 opacity-75" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="8, 12"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(129, 140, 248, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="4, 15"
            />
          </svg>
        </div>
      )}

      {/* 2. Platinum Sparks / Lightning Particles */}
      {isPlatinum && (
        <>
          <Sparkles className="absolute -top-1 -left-1 text-rose-450 w-3.5 h-3.5 animate-bounce" />
          <Zap className="absolute -bottom-1 -right-1 text-cyan-400 w-3 h-3 animate-pulse" />
          <div className="absolute top-1/2 -right-2 text-[6px] text-fuchsia-400 animate-ping">✦</div>
        </>
      )}

      {/* 3. Gold subtle sparkles */}
      {isGold && (
        <Sparkles className="absolute -top-1 right-0 text-amber-400 w-3 h-3 opacity-80" />
      )}

      {/* Main Avatar Wrapper with proper outline mask */}
      <div className={`relative z-10 p-0.5 overflow-hidden border bg-zinc-950 ${shapeClass} ${sizeClass} ${ringStyle}`}>
        <img
          src={user.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
          alt={user.gamerName || 'Gamer'}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover select-none ${shapeClass}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.gamerName || 'pilot'}`;
          }}
        />

        {/* 4. Supabase Storage Active Image Frame overlay */}
        {frameImageUrl && (
          <img
            src={frameImageUrl}
            alt="custom frame"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20 scale-105"
            onError={(e) => {
              // Hide frame image if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Active Sticker display overlap */}
      {user.activeSticker && (
        <span 
          className="absolute bottom-0 right-0 z-25 text-base bg-zinc-950 border border-zinc-850 w-6 h-6 flex items-center justify-center rounded-full select-none shadow animate-pulse"
          title="Active profile sticker"
        >
          {user.activeSticker}
        </span>
      )}
    </div>
  );
};
