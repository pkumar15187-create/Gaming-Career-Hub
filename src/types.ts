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
  role?: string;

  // XP, Levels & Claim Daily rewards
  xp?: number;
  level?: number;
  lastDailyClaimed?: string;
  last_daily_reward_claimed_at?: string;
  coins?: number;
  diamonds?: number;
  topup_diamonds?: number;
  winning_diamonds?: number;
  locked_withdraw_diamonds?: number;

  // Local saves
  savedPlayers: string[]; // array of userIds

  // Database Premium properties
  premiumBadge?: string;
  premiumFrame?: string;
  premiumBanner?: string;

  active_banner_url?: string;
  selected_banner?: string;
  active_badge_url?: string;
  selected_badge?: string;
  active_frame_url?: string;
  selected_frame?: string;
  frame_shape?: 'circle' | 'square';
  unlocked_stickers?: string[];
  platinum_theme_enabled?: boolean;
  platinum_background_url?: string;
  platinum_overlay_url?: string;
  platinum_profile_card_url?: string;
  platinum_hud_assets?: any; // JSON string or parsed object
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
  isFeatured?: boolean;
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
  status: 'pending' | 'approved' | 'rejected' | 'registered';
  contactEmail: string;
  registeredAt: string;
}

export interface DbTournamentRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  team_id?: string | null;
  registration_type: 'solo' | 'team';
  status: 'pending' | 'approved' | 'rejected' | 'registered';
  payment_status: 'pending' | 'paid' | 'unneeded' | 'rejected';
  transaction_id?: string | null;
  payment_screenshot_url?: string | null;
  registered_at: string;
  seat_number?: number | null;
  entry_fee_paid?: number;
  cancelled_at?: string | null;
  refund_amount?: number;
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
  description?: string;
  game: string;
  banner_url?: string;
  prizePool: string; // Keep prizePool for fallback compatibility
  prize_pool?: string;
  entry_fee?: string;
  max_players?: number;
  max_teams: number;
  rules: string[];
  schedule: {
    date: string;
    event: string;
  }[];
  registrationType: 'solo' | 'team';
  status: 'upcoming' | 'ongoing' | 'completed' | 'live' | 'cancelled'; // Expand statuses
  registrants: TournamentRegistrant[];
  winners: {
    rank: string;
    name: string;
    prize: string;
  }[];
  bracket: TournamentRound[];
  registration_deadline?: string;
  tournament_start?: string;
  tournament_end?: string;
  created_at?: string;
  room_id?: string | null;
  room_password?: string | null;
  room_reveal_mode?: 'manual' | 'auto' | string | null;
  room_reveal_at?: string | null;
  room_revealed?: boolean;
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
  upiId?: string;
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

export interface DbPayment {
  id: string;
  userId: string;
  userEmail?: string;
  plan: 'Silver' | 'Gold' | 'Platinum';
  amount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  screenshotUrl?: string;
  couponApplied?: string;
  createdAt?: string;
}

export interface DbTournamentMatch {
  id: string;
  tournamentId: string;
  roundNumber: number;
  matchNumber: number;
  player1UserId?: string | null;
  player2UserId?: string | null;
  team1Id?: string | null;
  team2Id?: string | null;
  winnerUserId?: string | null;
  winnerTeamId?: string | null;
  status: 'pending' | 'live' | 'completed' | 'disputed';
  scheduledAt?: string | null;
  createdAt?: string;
  
  // Virtual UI/display fields
  player1Name?: string;
  player2Name?: string;
  team1Name?: string;
  team2Name?: string;
  winnerName?: string;
  score1?: number;
  score2?: number;
  screenshot_url?: string;
  notes?: string;
}

export interface TournamentResult {
  id: string;
  tournament_id: string;
  match_id: string;
  winner_user_id?: string | null;
  winner_team_id?: string | null;
  score?: string | null;
  result_screenshot_url?: string | null;
  notes?: string | null;
  status: 'pending' | 'live' | 'completed' | 'disputed';
  created_at?: string;
}

export interface DiamondTransaction {
  id: string;
  user_id: string;
  wallet_type: 'topup' | 'winning';
  transaction_type: 'topup_purchase' | 'manual_credit' | 'tournament_entry' | 'tournament_prize' | 'withdraw_request' | 'withdraw_paid' | 'adjustment' | 'tournament_refund';
  diamonds: number;
  bonus: number;
  total_amount: number;
  total_credited?: number;
  price_paid: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  transaction_id: string | null;
  payment_screenshot_url: string | null;
  note: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  upi_id: string;
  qr_url: string | null;
  account_holder_name: string;
  phone: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
}

