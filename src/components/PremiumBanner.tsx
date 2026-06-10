import React from 'react';
import { UserProfile, AdminSettings } from '../types';
import { getUserProfileBannerStyle } from '../lib/premiumUtils';

interface PremiumBannerProps {
  user: UserProfile;
  adminSettings?: AdminSettings;
  heightClass?: string;
  showVIPTag?: boolean;
  customBannerUrl?: string;
}

export const PremiumBanner: React.FC<PremiumBannerProps> = ({
  user,
  adminSettings,
  heightClass = 'h-32 md:h-40',
  showVIPTag = true,
  customBannerUrl,
}) => {
  const isPlatinum = user.membership === 'Platinum' && user.membershipStatus === 'active';
  const isGold = user.membership === 'Gold' && user.membershipStatus === 'active';
  
  const userWithOverride = customBannerUrl 
    ? { ...user, active_banner_url: customBannerUrl }
    : user;
    
  const bannerStyleInfo = getUserProfileBannerStyle(userWithOverride, adminSettings);

  return (
    <div 
      className={`relative w-full overflow-hidden bg-zinc-950 transition-all duration-500 group select-none ${heightClass} ${bannerStyleInfo.className} ${
        isPlatinum ? 'animate-platinumBorder border-b-2 electric_sweep_overlay' : ''
      }`}
      style={bannerStyleInfo.backgroundImage ? { 
        backgroundImage: bannerStyleInfo.backgroundImage, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      } : {}}
    >
      {/* 1. Platinum cyber grid moving backdrop overlay */}
      {isPlatinum && (
        <div className="absolute inset-0 cyber-grid-moving-platinum opacity-65 z-0 pointer-events-none"></div>
      )}

      {/* 2. Platinum Animated Glow Particles */}
      {isPlatinum && (
        <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
          {/* Particle 1 */}
          <div 
            className="absolute bottom-1 bg-rose-500/50 rounded-full blur-xs animate-float-particle-1" 
            style={{ left: '15%', width: '6px', height: '6px' }}
          ></div>
          {/* Particle 2 */}
          <div 
            className="absolute bottom-1 bg-indigo-500/40 rounded-full blur-xs animate-float-particle-2" 
            style={{ left: '45%', width: '8px', height: '8px' }}
          ></div>
          {/* Particle 3 */}
          <div 
            className="absolute bottom-1 bg-cyan-400/50 rounded-full blur-xs animate-float-particle-3" 
            style={{ left: '75%', width: '5px', height: '5px' }}
          ></div>
          {/* Scatter dots */}
          <div className="absolute top-4 left-1/3 text-[8px] text-rose-300 opacity-60 animate-pulse">✦</div>
          <div className="absolute top-10 right-1/4 text-[6px] text-cyan-300 opacity-50 animate-bounce">★</div>
        </div>
      )}

      {/* 3. Subtle Light Sweep effect for Gold & Platinum */}
      {(isPlatinum || isGold) && (
        <div className="absolute inset-y-0 -left-1/3 w-1/4 bg-gradient-to-r from-transparent via-white/5 to-transparent z-2 pointer-events-none animate-sweepLight"></div>
      )}

      {/* 4. Platinum VIP Cover Level Overlay Tag */}
      {isPlatinum && showVIPTag && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-rose-500/30 px-2.5 py-0.5 rounded-full select-none shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          <span className="text-[9px] font-mono font-bold tracking-widest text-rose-450 uppercase leading-none">PLATINUM LEVEL</span>
        </div>
      )}

      {/* 5. Gold badge indicator */}
      {isGold && showVIPTag && (
        <div className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-sm border border-amber-400/20 px-2 py-0.5 rounded font-mono text-[8px] text-amber-450 font-black leading-none tracking-wider select-none">
          GOLD CLASS
        </div>
      )}

      {/* 6. Dark bottom gradient overlay so text/avatar details are readable over banner */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent z-2"></div>
    </div>
  );
};
