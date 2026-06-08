import { UserProfile, AdminSettings } from '../types';

/**
 * Returns the Tailwind styling classes for a gamer's active profile frame.
 */
export function getUserProfileFrameClass(user: UserProfile, adminSettings?: AdminSettings): string {
  if (user.membership === 'Free' || user.membershipStatus !== 'active') {
    return 'border-2 border-zinc-800';
  }
  
  const frameId = user.activeFrame;
  if (frameId && adminSettings?.profileFrames) {
    const customFrame = adminSettings.profileFrames.find(f => f.id === frameId);
    if (customFrame) return customFrame.style;
  }
  
  // Fallbacks
  if (user.membership === 'Silver') {
    return 'ring-4 ring-zinc-400 ring-offset-2 ring-offset-zinc-950';
  } else if (user.membership === 'Gold') {
    return 'ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
  } else if (user.membership === 'Platinum') {
    return 'ring-4 ring-rose-500 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse';
  }
  
  return 'border-2 border-zinc-800';
}

/**
 * Returns the class list for profile cards and detail panels when special glows are active.
 */
export function getUserCardGlowClass(user: UserProfile): string {
  if (user.membershipStatus !== 'active') return 'border-zinc-800/80';
  
  if (user.membership === 'Platinum') {
    return 'border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/20';
  }
  if (user.isFeatured) {
    return 'border-rose-500/30 neon-glow-pink';
  }
  return 'border-zinc-800/80';
}

/**
 * Returns the profile header banner styling matching the user's active customization.
 */
export function getUserProfileBannerStyle(user: UserProfile, adminSettings?: AdminSettings): string {
  if (user.membership === 'Free' || user.membership === 'Silver' || user.membershipStatus !== 'active') {
    return 'bg-zinc-950 border-b border-zinc-850 h-28';
  }
  
  const bannerId = user.activeBanner;
  if (bannerId && adminSettings?.profileBanners) {
    const customBanner = adminSettings.profileBanners.find(b => b.id === bannerId);
    if (customBanner) return `${customBanner.style} h-28`;
  }
  
  // Fallback defaults
  if (user.membership === 'Gold') {
    return 'bg-gradient-to-r from-amber-600/30 via-yellow-700/20 to-amber-900/30 border-b border-amber-400/30 h-28';
  } else if (user.membership === 'Platinum') {
    return 'bg-gradient-to-r from-indigo-900/40 via-rose-800/30 to-violet-950/40 border-b-2 border-rose-500/40 h-28';
  }
  
  return 'bg-zinc-950 border-b border-zinc-850 h-28';
}

/**
 * Returns active tier badge icon configured in catalogs or default emojis.
 */
export function getUserTierBadgeIcon(user: UserProfile, adminSettings?: AdminSettings): string {
  if (user.membership === 'Free' || user.membershipStatus !== 'active') return '';
  
  if (adminSettings?.badges) {
    // Try to find configured icon corresponding to tier
    const matchedBadge = adminSettings.badges.find(b => b.tier === user.membership);
    if (matchedBadge) return matchedBadge.icon;
  }
  
  // Fallbacks
  if (user.membership === 'Silver') return '🥈 Silver Pro';
  if (user.membership === 'Gold') return '🥇 Gold Master';
  if (user.membership === 'Platinum') return '👑 Platinum VIP';
  
  return '';
}
