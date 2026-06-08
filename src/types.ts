export type MembershipType = 'Free' | 'Silver' | 'Gold' | 'Platinum';

export interface SocialLinks {
  youtube?: string;
  instagram?: string;
  discord?: string;
}

export interface TournamentHistoryItem {
  id: string;
  tournamentName: string;
  date: string;
  rank: string;
  prizeWon: string;
}

export interface TeamHistoryItem {
  teamId: string;
  teamName: string;
  role: string;
  duration: string;
}

export interface UserProfile {
  id: string;
  username: string; // login username
  email: string;
  gamerName: string;
  profilePhoto: string;
  bio: string;
  favoriteGames: string[];
  country: string;
  state: string;
  city: string;
  social: SocialLinks;
  skillRating: number; // 0-5000 or similar
  kdRatio: number; // e.g. 2.45
  winRate: number; // e.g. 58.5
  tournamentHistory: TournamentHistoryItem[];
  teamHistory: TeamHistoryItem[];
  achievements: string[]; // List of achievement IDs / codes
  badges: string[]; // List of custom rank/achievement badges
  highlightVideos: string[]; // URLs or titles
  isBanned: boolean;
  isFeatured: boolean;
  
  // Membership credentials
  membership: MembershipType;
  membershipStatus: 'active' | 'pending' | 'none';
  membershipTxId?: string;
  membershipScreenshot?: string;
  referredBy?: string;
  referralCode: string;
  
  // Premium System additions
  stickers?: string[]; // array of stickers the user can place (e.g. emojis or stickers)
  activeSticker?: string; // a sticker shown next to the avatar
  activeFrame?: string; // name/id or Tailwind style of the frame
  activeBanner?: string; // Tailwind class background or image URL
  featuredUntil?: string; // date of feature expiry
  membershipExpires?: string; // date of membership expiry (7 days for Silver, 30 days for Gold, etc)

  // Comments & endorses
  comments?: ProfileComment[];

  // Local saves
  savedPlayers: string[]; // array of userIds
}

export interface ProfileComment {
  id: string;
  authorId: string;
  authorGamerName: string;
  authorPhoto: string;
  authorMembership: MembershipType;
  text: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  bio: string;
  game: string;
  requiredRole: string;
  ranking: number;
  creatorId: string;
  creatorGamerName: string;
  members: {
    userId: string;
    username: string;
    gamerName: string;
    role: string;
  }[];
  pendingRequests: {
    userId: string;
    gamerName: string;
    message: string;
  }[];
  pendingInvites: string[]; // array of userIds
}

export interface TournamentRegistrant {
  id: string; // user or team id
  name: string; // gamer name or team name
  logo: string; // photo or logo
  type: 'solo' | 'team';
  status: 'pending' | 'approved' | 'rejected';
  contactEmail: string;
  registeredAt: string;
}

export interface TournamentMatch {
  id: string;
  player1: string;
  player2: string;
  score1?: number;
  score2?: number;
  winner?: string;
  stageName: string; // e.g., "Quarterfinals", "Semifinals", "Finals"
}

export interface TournamentRound {
  roundNumber: number;
  roundName: string;
  matches: TournamentMatch[];
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  prizePool: string;
  rules: string[];
  schedule: {
    date: string;
    event: string;
  }[];
  registrationType: 'solo' | 'team';
  status: 'upcoming' | 'ongoing' | 'completed';
  registrants: TournamentRegistrant[];
  winners: {
    rank: string;
    name: string;
    prize: string;
  }[];
  bracket: TournamentRound[];
  maxTeams: number;
}

export interface SponsorApplication {
  id: string;
  userId: string;
  gamerName: string;
  favoriteGame: string;
  brandName: string;
  pitch: string;
  monthlyReach: string;
  mediaKitStats: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  contactEmail: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'sponsor' | 'team' | 'tournament';
  date: string;
  read: boolean;
}

export interface PremiumBadge {
  id: string;
  name: string;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'All';
  icon: string; // emoji or short text
}

export interface StickerPack {
  id: string;
  name: string;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'All';
  stickers: string[]; // list of emojis or symbols
}

export interface ProfileFrame {
  id: string;
  name: string;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'All';
  style: string; // Tailwind ring configuration or CSS classes
}

export interface ProfileBanner {
  id: string;
  name: string;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'All';
  style: string; // Tailwind background gradient or style classes
}

export interface PremiumReward {
  id: string;
  name: string;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'All';
  description: string;
}

export interface AdminSettings {
  qrCodeUrl: string;
  activeCoupons: {
    code: string;
    discountPercent: number; // e.g. 20 for 20%
  }[];
  badges?: PremiumBadge[];
  stickerPacks?: StickerPack[];
  profileFrames?: ProfileFrame[];
  profileBanners?: ProfileBanner[];
  premiumRewards?: PremiumReward[];
}
