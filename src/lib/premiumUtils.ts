import { UserProfile, AdminSettings } from '../types';

/**
 * Resolves the public URL for a given Legendary Platinum Theme asset from Supabase storage.
 */
export function getThemePackAssetUrl(assetPath: string): string {
  const supabaseUrl = 'https://phrqxbbzxjibqsrxjubs.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/platinum_profile_themes/${assetPath}`;
}

export const PLATINUM_DEFAULTS = {
  background: 'https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/profile_backgrounds/platinum_void_energy_background.svg',
  particleOverlay: 'https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/overlays/platinum_particle_overlay.svg',
  electricOverlay: 'https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/overlays/electric_sweep_overlay.svg',
  banner: 'https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/banners/platinum_legendary_profile_cover.svg',
  profileCard: 'https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/profile_cards/platinum_profile_card_template.svg',
  hudCards: [
    "https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/hud_stats/xp_hud_card.svg",
    "https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/hud_stats/rank_hud_card.svg",
    "https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/hud_stats/trophy_hud_card.svg",
    "https://phrqxbbzxjibqsrxjubs.supabase.co/storage/v1/object/public/platinum_profile_themes/hud_stats/followers_hud_card.svg"
  ]
};

/**
 * Helper to check if a user is authorized for premium features (e.g. customized frames, banners, stickers).
 */
export function canUsePremiumFeatureSync(user: UserProfile, featureType?: string): boolean {
  if (!user) return false;
  if (
    user.email === 'pkumar15187@gmail.com' ||
    user.membership?.toLowerCase() === 'admin' ||
    user.role?.toLowerCase() === 'admin'
  ) {
    return true;
  }
  const isPlatinum = user.membership?.toLowerCase() === 'platinum' && (user.membershipStatus?.toLowerCase() === 'active' || user.membershipStatus === 'none' || !user.membershipStatus);
  if (!isPlatinum) return false;

  const expiry = user.membershipExpires || (user as any).expiry_date;
  if (expiry) {
    const expiryDate = new Date(expiry);
    const now = new Date();
    if (now > expiryDate) {
      return false; // membership expired
    }
  }
  return true;
}

/**
 * Returns the Tailwind styling classes for a gamer's active profile frame.
 */
export function getUserProfileFrameClass(user: UserProfile, adminSettings?: AdminSettings): string {
  if (!canUsePremiumFeatureSync(user)) {
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
  if (!canUsePremiumFeatureSync(user)) return 'border-zinc-800/80';
  
  if (user.membership === 'Platinum') {
    if (user.platinum_theme_enabled) {
      return 'border-cyan-400/50 shadow-[0_0_35px_rgba(34,211,238,0.25)] ring-1 ring-cyan-500/30';
    }
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
export interface BannerStyle {
  backgroundImage?: string;
  className: string;
}

/**
 * Returns the profile header banner styling matching the user's active customization.
 */
export function getUserProfileBannerStyle(user: UserProfile, adminSettings?: AdminSettings): BannerStyle {
  const defaultGamingBanner = "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80";
  
  // Base configuration
  const bannerUrl = user.active_banner_url || '';
  let className = "relative overflow-hidden";
  
  // Add styling border based on membership
  if (user.membership === 'Platinum') {
    className += " border-b-2 border-rose-500/50 shadow-[0_4px_25px_rgba(244,63,94,0.35)]";
  } else if (user.membership === 'Gold') {
    className += " border-b border-amber-400/30 shadow-[0_4px_15px_rgba(245,158,11,0.22)]";
  } else if (user.membership === 'Silver') {
    className += " border-b border-zinc-500/20";
  } else {
    className += " border-b border-zinc-800/40";
  }

  // If Platinum and has theme enabled, fall back to default Cover artwork if no bannerUrl is active
  const isPlatinum = canUsePremiumFeatureSync(user);
  if (isPlatinum && user.platinum_theme_enabled) {
    const defaultCoverUrl = PLATINUM_DEFAULTS.banner;
    return {
      backgroundImage: `url("${bannerUrl || defaultCoverUrl}")`,
      className
    };
  }

  // 1. Explicitly uploaded custom image
  if (bannerUrl && canUsePremiumFeatureSync(user)) {
    return {
      backgroundImage: `url("${bannerUrl}")`,
      className
    };
  }

  // 2. Selectable admin custom standard backdrop (using selected_banner or activeBanner ID)
  const bannerId = user.selected_banner || user.activeBanner;
  if (bannerId && adminSettings?.profileBanners && canUsePremiumFeatureSync(user)) {
    const customBanner = adminSettings.profileBanners.find(b => b.id === bannerId);
    if (customBanner) {
      if (customBanner.style.indexOf('/') !== -1 || customBanner.style.startsWith('data:')) {
        return {
          backgroundImage: `url("${customBanner.style}")`,
          className
        };
      }
      return {
        className: `${className} ${customBanner.style}`
      };
    }
  }

  // 3. Defaults based on tier
  if (user.membership === 'Gold') {
    return {
      className: `${className} bg-gradient-to-r from-amber-600/30 via-yellow-700/20 to-amber-900/30`
    };
  } else if (user.membership === 'Platinum') {
    return {
      className: `${className} bg-gradient-to-r from-indigo-900/40 via-rose-800/30 to-violet-950/40`
    };
  }

  // Default black gaming background banner style
  return {
    backgroundImage: `url("${defaultGamingBanner}")`,
    className
  };
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

/**
 * Returns special styling classes for a gamer's name based on their membership tier.
 */
export function getUserNameColorClass(user: UserProfile): string {
  if (user.membershipStatus !== 'active') return 'text-white';
  
  if (user.membership === 'Silver') {
    return 'text-slate-300 font-semibold';
  } else if (user.membership === 'Gold') {
    return 'text-amber-400 font-bold';
  } else if (user.membership === 'Platinum') {
    return 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-300 via-indigo-400 to-rose-500 font-extrabold animate-pulse';
  }
  
  return 'text-white';
}

/**
 * Returns true if user gets VIP label everywhere (Platinum VIP).
 */
export function isUserVIP(user: UserProfile): boolean {
  return canUsePremiumFeatureSync(user);
}
