import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings, ProfileComment, DbPayment, DbTournamentRegistration, DbTournamentMatch, DiamondTransaction, WithdrawalRequest, TournamentResult, SubscriptionCancellationRequest, Sponsor, SponsorClick, Referral, PromoCode, PromoUsage, CreatorVerificationRequest, FeaturedItem, AdvertisementOrder, BannerAd, Invoice, AnalyticsEvent } from '../types';
import { INITIAL_USERS, INITIAL_TEAMS, INITIAL_TOURNAMENTS, INITIAL_SPONSORS, INITIAL_NOTIFICATIONS, INITIAL_ADMIN_SETTINGS, loadData, saveData } from '../initialData';

// Helper to generate IDs
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const mapEmailToDomain = (email: string): string => {
  const trimmed = email.trim();
  if (trimmed.toLowerCase().endsWith('@careerhub.gg')) {
    return trimmed;
  }
  const parts = trimmed.split('@');
  if (parts.length === 2) {
    const safeLocal = parts[0].replace(/[^a-zA-Z0-9._-]/g, '');
    const safeDomain = parts[1].replace(/[^a-zA-Z0-9.-]/g, '');
    return `${safeLocal}.${safeDomain}@careerhub.gg`.toLowerCase();
  }
  return `${trimmed}@careerhub.gg`.toLowerCase();
};

let toastCallback: ((text: string, type: 'success' | 'warning' | 'info' | 'error') => void) | null = null;

export const setSupabaseServiceToastHandler = (cb: typeof toastCallback) => {
  toastCallback = cb;
};

export const getOrGenerateReferralCode = (profReferralCode: string | undefined, userId: string, username_hint: string): string => {
  if (profReferralCode && profReferralCode !== 'DEMO777' && profReferralCode.trim() !== '') {
    return profReferralCode;
  }
  const base = (username_hint || 'GAMER').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
  const rand = Math.floor(10000 + Math.random() * 90000);
  const code = `${base}${rand}`;
  // Save asynchronously to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    supabase.from('gamer_profiles').update({ referral_code: code }).eq('user_id', userId).then(({ error }) => {
      if (error) console.error("Auto-save of generated referral code failed:", error);
    });
  }
  // Also save to localStorage
  try {
    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updated = localUsers.map(u => u.id === userId ? { ...u, referralCode: code } : u);
    saveData('gh_users', updated);
  } catch (err) {}
  
  return code;
};

export const getFallbackUserProfile = (userId: string): UserProfile => {
  const code = 'GMR' + userId.substring(0, 4).toUpperCase() + Math.floor(10000 + Math.random() * 90000);
  return {
    id: userId,
    username: 'gamer_' + userId.substring(0, 5),
    email: 'gamer@example.com',
    gamerName: 'Gamer Ready',
    profilePhoto: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80',
    bio: 'Customize profile in dashboard.',
    favoriteGames: [],
    country: 'India',
    state: '',
    city: '',
    social: {},
    skillRating: 1500,
    kdRatio: 1.0,
    winRate: 50.0,
    tournamentHistory: [],
    teamHistory: [],
    achievements: [],
    badges: [],
    highlightVideos: [],
    isBanned: false,
    isFeatured: false,
    membership: 'Free',
    membershipStatus: 'none',
    referralCode: code,
    savedPlayers: [],
    stickers: [],
    comments: [],
    xp: 0,
    level: 1,
    diamonds: 0,
    topup_diamonds: 0,
    winning_diamonds: 0,
    locked_withdraw_diamonds: 0
  };
};

export const supabaseService = {
  // ==========================================
  // AUTHENTICATION & SESSION MANAGEMENT
  // ==========================================

  // Centralized robust auth user synchronization with Database tables
  async ensureUserAndProfile(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn("No active Supabase session user in ensureUserAndProfile:", authError);
        return;
      }
      await this.syncUserTables(user.id, user.email || '', (user.email || '').split('@')[0]);
    } catch (err: any) {
      console.error("ensureUserAndProfile exception:", err);
    }
  },

  async syncUserTables(id: string, email: string, username_hint: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const username = username_hint || email.split('@')[0] || 'gamer';
    
    // 1. Ensure public.users row exists
    try {
      const { data: existingUser, error: selectUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (selectUserError) {
        console.error("[RLS/DB Error] Select from public.users failed:", selectUserError.message);
      }

      if (!existingUser) {
        const { error: insertUserError } = await supabase
          .from('users')
          .insert([{
            id,
            email,
            username,
            membership: 'Free',
            xp: 0,
            level: 1
          }]);

        if (insertUserError) {
          console.error("[RLS/DB Block] Unable to insert public.users row:", insertUserError.message);
          if (toastCallback) {
            toastCallback(`Synchronization block: ${insertUserError.message}`, "error");
          }
        } else {
          console.log("Successfully created public.users row for user:", id);
        }
      }
    } catch (err: any) {
      console.error("Unexpected crash on public.users sync:", err.message || err);
    }

    // 2. Ensure public.gamer_profiles row exists
    try {
      const { data: existingProfile, error: selectProfileError } = await supabase
        .from('gamer_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();

      if (selectProfileError) {
        console.error("[RLS/DB Error] Select from public.gamer_profiles failed:", selectProfileError.message);
      }

      if (!existingProfile) {
        const { error: insertProfileError } = await supabase
          .from('gamer_profiles')
          .insert([{
            user_id: id,
            gamer_name: username,
            bio: 'Customize profile in dashboard.',
            favorite_game: '',
            rank: 'Unranked',
            profile_photo: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
            social_links: {}
          }]);

        if (insertProfileError) {
          console.error("[RLS/DB Block] Unable to insert public.gamer_profiles row:", insertProfileError.message);
          if (toastCallback) {
            toastCallback(`Synchronization block: ${insertProfileError.message}`, "error");
          }
        } else {
          console.log("Successfully created public.gamer_profiles row for user:", id);
        }
      }
    } catch (err: any) {
      console.error("Unexpected crash on public.gamer_profiles sync:", err.message || err);
    }
  },

  // Ensure user and gamer profile rows exist to avoid "Gamer profile match credentials not found" or "Gamer profile not found" crashes.
  async ensureUserProfileExists(userId?: string, email?: string, username_hint?: string): Promise<void> {
    await this.ensureUserAndProfile();
  },

  async signUp(username: string, email: string, password: string): Promise<{ user: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: new Error("Supabase is not configured.") };
    }
    try {
      const cleanEmail = email.trim();
      const cleanUsername = username.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { username: cleanUsername, gamer_name: cleanUsername }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Build rows in users and gamer_profiles
        await this.syncUserTables(data.user.id, cleanEmail, cleanUsername);
        
        // Fetch the created profile
        const userObj = await this.getUserProfileById(data.user.id);
        return { user: userObj, error: null };
      }
      return { user: null, error: new Error("User structure was not returned on creation.") };
    } catch (err: any) {
      console.error("Supabase user registration sync error:", err);
      return { user: null, error: err };
    }
  },

  async login(usernameOrEmail: string, password?: string): Promise<{ user: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: new Error("Supabase is not configured.") };
    }
    try {
      const cleanEmail = usernameOrEmail.trim();

      // Standard Supabase Auth SignIn
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password || 'DefaultGamer@123'
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Verify/Ensure user & profile rows exist
        await this.syncUserTables(data.user.id, data.user.email || cleanEmail, (data.user.email || cleanEmail).split('@')[0]);
        
        // Fetch complete user profile
        const userObj = await this.getUserProfileById(data.user.id);
        return { user: userObj, error: null };
      }
      return { user: null, error: new Error("User block was empty on login session check.") };
    } catch (err: any) {
      console.error("Supabase login error:", err);
      return { user: null, error: err };
    }
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  },

  async getCurrentSessionUser(): Promise<UserProfile | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          // Verify/Ensure user & profile row
          await this.syncUserTables(session.user.id, session.user.email || '', (session.user.email || '').split('@')[0]);
          const profile = await this.getUserProfileById(session.user.id);
          return profile;
        }
      } catch (err) {
        console.error("Error fetching current session user:", err);
      }
    }
    return null;
  },

  // ==========================================
  // USERS & PROFILE CRUDS
  // ==========================================

  async getUsers(): Promise<UserProfile[]> {
    // Auto-expire check before reading users
    await this.checkAndExpireMemberships().catch(err => console.error("Auto expiry run failed:", err));

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        const { data: profilesData, error: profilesError } = await supabase.from('gamer_profiles').select('*');

        if (usersError || profilesError) throw usersError || profilesError;

        // Map Supabase postgres schema records list into UI-compatible UserProfile list
        return (usersData || []).map((u: any) => {
          const p = (profilesData || []).find((prof: any) => prof.user_id === u.id) || {};
          return {
            id: u.id,
            username: u.username,
            email: u.email,
            gamerName: p.gamer_name || u.username,
            profilePhoto: p.profile_photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
            bio: p.bio || '',
            favoriteGames: p.favorite_games || (p.favorite_game ? [p.favorite_game] : []),
            country: p.country || 'India',
            state: p.state || '',
            city: p.city || '',
            social: p.social_links || {},
            skillRating: p.skill_rating || 1500,
            kdRatio: Number(p.kd_ratio || 1.0),
            winRate: Number(p.win_rate || 50.0),
            tournamentHistory: [], // Dynamic loaded or linked
            teamHistory: [],
            achievements: p.badges || [], // simple mapping
            badges: p.badges || [],
            highlightVideos: [],
            isBanned: p.is_banned || false,
            isFeatured: p.is_featured || false,
            membership: u.membership || 'Free',
            membershipStatus: p.membership_status || 'none',
            referralCode: getOrGenerateReferralCode(p.referral_code, u.id, u.username),
            savedPlayers: p.saved_players || [],
            xp: u.xp || 0,
            level: u.level || 1,
            last_daily_reward_claimed_at: u.last_daily_reward_claimed_at || null,
            coins: u.coins || 0,
            diamonds: (u.topup_diamonds || 0) + (u.winning_diamonds || 0),
            topup_diamonds: u.topup_diamonds || 0,
            winning_diamonds: u.winning_diamonds || 0,
            locked_withdraw_diamonds: u.locked_withdraw_diamonds || 0,
            stickers: p.stickers || [],
            activeSticker: p.active_sticker,
            activeFrame: p.active_frame,
            activeBanner: p.active_banner,
            membershipExpires: p.membership_expires,
            featuredUntil: p.featured_until,
            referredBy: p.referred_by,
            premiumBadge: u.premium_badge || '',
            premiumFrame: u.premium_frame || '',
            premiumBanner: u.premium_banner || '',
            membershipTxId: p.membership_tx_id || '',
            membershipScreenshot: p.membership_screenshot || '',
            active_banner_url: p.active_banner_url || '',
            selected_banner: p.selected_banner || '',
            active_badge_url: p.active_badge_url || '',
            selected_badge: p.selected_badge || '',
            active_frame_url: p.active_frame_url || '',
            selected_frame: p.selected_frame || '',
            frame_shape: p.frame_shape || 'circle',
            unlocked_stickers: p.unlocked_stickers || [],
            platinum_theme_enabled: p.platinum_theme_enabled || false,
            platinum_background_url: p.platinum_background_url || '',
            platinum_overlay_url: p.platinum_overlay_url || '',
            platinum_profile_card_url: p.platinum_profile_card_url || '',
            platinum_hud_assets: p.platinum_hud_assets || null
          } as UserProfile;
        });
      } catch (err) {
        console.error("Failed to query live users from Supabase. Falling back to local data.", err);
      }
    }

    return loadData<UserProfile[]>('gh_users', INITIAL_USERS);
  },

  async getUserProfileById(userId: string): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: u, error: uError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        if (u) {
          const { data: p, error: pError } = await supabase.from('gamer_profiles').select('*').eq('user_id', userId).maybeSingle();
          const prof = p || {};
          return {
            id: u.id,
            username: u.username,
            email: u.email,
            gamerName: prof.gamer_name || u.username,
            profilePhoto: prof.profile_photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
            bio: prof.bio || '',
            favoriteGames: prof.favorite_games || (prof.favorite_game ? [prof.favorite_game] : []),
            country: prof.country || 'India',
            state: prof.state || '',
            city: prof.city || '',
            social: prof.social_links || {},
            skillRating: prof.skill_rating || 1500,
            kdRatio: Number(prof.kd_ratio || 1.0),
            winRate: Number(prof.win_rate || 50.0),
            tournamentHistory: [],
            teamHistory: [],
            achievements: prof.badges || [],
            badges: prof.badges || [],
            highlightVideos: [],
            isBanned: prof.is_banned || false,
            isFeatured: prof.is_featured || false,
            membership: u.membership || 'Free',
            membershipStatus: prof.membership_status || 'none',
            referralCode: getOrGenerateReferralCode(prof.referral_code, userId, u.username),
            savedPlayers: prof.saved_players || [],
            xp: u.xp || 0,
            level: u.level || 1,
            last_daily_reward_claimed_at: u.last_daily_reward_claimed_at || null,
            coins: u.coins || 0,
            diamonds: (u.topup_diamonds !== undefined && u.topup_diamonds !== null ? Number(u.topup_diamonds) : 0) + (u.winning_diamonds !== undefined && u.winning_diamonds !== null ? Number(u.winning_diamonds) : 0),
            topup_diamonds: u.topup_diamonds !== undefined && u.topup_diamonds !== null ? u.topup_diamonds : 0,
            winning_diamonds: u.winning_diamonds !== undefined && u.winning_diamonds !== null ? u.winning_diamonds : 0,
            locked_withdraw_diamonds: u.locked_withdraw_diamonds !== undefined && u.locked_withdraw_diamonds !== null ? u.locked_withdraw_diamonds : 0,
            stickers: prof.stickers || [],
            activeSticker: prof.active_sticker,
            activeFrame: prof.active_frame,
            activeBanner: prof.active_banner,
            membershipExpires: prof.membership_expires,
            featuredUntil: prof.featured_until,
            referredBy: prof.referred_by,
            premiumBadge: u.premium_badge || '',
            premiumFrame: u.premium_frame || '',
            premiumBanner: u.premium_banner || '',
            membershipTxId: prof.membership_tx_id || '',
            membershipScreenshot: prof.membership_screenshot || '',
            active_banner_url: prof.active_banner_url || '',
            selected_banner: prof.selected_banner || '',
            active_badge_url: prof.active_badge_url || '',
            selected_badge: prof.selected_badge || '',
            active_frame_url: prof.active_frame_url || '',
            selected_frame: prof.selected_frame || '',
            frame_shape: prof.frame_shape || 'circle',
            unlocked_stickers: prof.unlocked_stickers || [],
            platinum_theme_enabled: prof.platinum_theme_enabled || false,
            platinum_background_url: prof.platinum_background_url || '',
            platinum_overlay_url: prof.platinum_overlay_url || '',
            platinum_profile_card_url: prof.platinum_profile_card_url || '',
            platinum_hud_assets: prof.platinum_hud_assets || null
          } as UserProfile;
        } else {
          // If the profile is completely missing, recover/heal it on the fly!
          await this.ensureUserAndProfile();
          const { data: uRetry } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
          if (uRetry) {
            const { data: pRetry } = await supabase.from('gamer_profiles').select('*').eq('user_id', userId).maybeSingle();
            const prof = pRetry || {};
            return {
              id: uRetry.id,
              username: uRetry.username,
              email: uRetry.email,
              gamerName: prof.gamer_name || uRetry.username,
              profilePhoto: prof.profile_photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${uRetry.username}`,
              bio: prof.bio || '',
              favoriteGames: prof.favorite_games || (prof.favorite_game ? [prof.favorite_game] : []),
              country: prof.country || 'India',
              state: prof.state || '',
              city: prof.city || '',
              social: prof.social_links || {},
              skillRating: prof.skill_rating || 1500,
              kdRatio: Number(prof.kd_ratio || 1.0),
              winRate: Number(prof.win_rate || 50.0),
              tournamentHistory: [],
              teamHistory: [],
              achievements: prof.badges || [],
              badges: prof.badges || [],
              highlightVideos: [],
              isBanned: prof.is_banned || false,
              isFeatured: prof.is_featured || false,
              membership: uRetry.membership || 'Free',
              membershipStatus: prof.membership_status || 'none',
              referralCode: getOrGenerateReferralCode(prof.referral_code, userId, uRetry.username),
              savedPlayers: prof.saved_players || [],
              xp: uRetry.xp || 0,
              level: uRetry.level || 1,
              last_daily_reward_claimed_at: uRetry.last_daily_reward_claimed_at || null,
              coins: uRetry.coins || 0,
              diamonds: (uRetry.topup_diamonds !== undefined && uRetry.topup_diamonds !== null ? Number(uRetry.topup_diamonds) : 0) + (uRetry.winning_diamonds !== undefined && uRetry.winning_diamonds !== null ? Number(uRetry.winning_diamonds) : 0),
              topup_diamonds: uRetry.topup_diamonds !== undefined && uRetry.topup_diamonds !== null ? uRetry.topup_diamonds : 0,
              winning_diamonds: uRetry.winning_diamonds !== undefined && uRetry.winning_diamonds !== null ? uRetry.winning_diamonds : 0,
              locked_withdraw_diamonds: uRetry.locked_withdraw_diamonds !== undefined && uRetry.locked_withdraw_diamonds !== null ? uRetry.locked_withdraw_diamonds : 0,
              stickers: prof.stickers || [],
              activeSticker: prof.active_sticker,
              activeFrame: prof.active_frame,
              activeBanner: prof.active_banner,
              membershipExpires: prof.membership_expires,
              featuredUntil: prof.featured_until,
              referredBy: prof.referred_by,
              premiumBadge: uRetry.premium_badge || '',
              premiumFrame: uRetry.premium_frame || '',
              premiumBanner: uRetry.premium_banner || '',
              membershipTxId: prof.membership_tx_id || '',
              membershipScreenshot: prof.membership_screenshot || '',
              active_banner_url: prof.active_banner_url || '',
              selected_banner: prof.selected_banner || '',
              active_badge_url: prof.active_badge_url || '',
              selected_badge: prof.selected_badge || '',
              active_frame_url: prof.active_frame_url || '',
              selected_frame: prof.selected_frame || '',
              frame_shape: prof.frame_shape || 'circle',
              unlocked_stickers: prof.unlocked_stickers || []
            } as UserProfile;
          }
        }
      } catch (err) {
        console.error("Error fetching single user from Supabase:", err);
      }
    }

    const list = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const found = list.find(u => u.id === userId);
    if (found) return found;

    return getFallbackUserProfile(userId);
  },

  async verifyUserPremiumMembership(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      // 6. Admin accounts may bypass this restriction only if role = 'admin'.
      // We check if u.membership is 'Admin' or email is pkumar15187@gmail.com or role = 'admin'
      const { data: u, error: uError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (u) {
        if (
          u.email === 'pkumar15187@gmail.com' ||
          u.membership === 'Admin' ||
          u.role === 'admin'
        ) {
          console.log("[Membership Verification] Admin bypass activated for user:", u.email);
          return true;
        }
      }

      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error("[RLS/DB Error] Failed to read from memberships table:", error.message);
        return false;
      }

      if (!memberships || memberships.length === 0) {
        return false;
      }

      const now = new Date();
      // Condition matching:
      // - membership_status = 'active'
      // - membership_tier = 'silver', 'gold', 'platinum'
      // - current_date <= expires_at (if expiry exists)
      const hasActivePremium = memberships.some(m => {
        const tier = (m.membership_tier !== undefined ? m.membership_tier : m.plan || m.plan_name || '').toLowerCase();
        if (tier !== 'silver' && tier !== 'gold' && tier !== 'platinum') return false;

        const status = (m.membership_status !== undefined ? m.membership_status : m.status || 'active').toLowerCase();
        if (status !== 'active') return false;

        const expiry = m.expires_at !== undefined ? m.expires_at : m.expiry_date;
        if (expiry) {
          const expiryDate = new Date(expiry);
          if (now > expiryDate) return false;
        }

        return true;
      });

      return hasActivePremium;
    } catch (err) {
      console.error("[Membership Verification] Unexpected exception in verification:", err);
      return false;
    }
  },

  async canUsePremiumFeature(userId: string, featureType?: string): Promise<boolean> {
    if (!userId) return false;
    if (isSupabaseConfigured && supabase) {
      return await this.verifyUserPremiumMembership(userId);
    }
    // Fallback/local mode
    const list = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const found = list.find(u => u.id === userId);
    if (!found) return false;
    if (
      found.email === 'pkumar15187@gmail.com' ||
      (found.membership as string) === 'Admin' ||
      found.role === 'admin'
    ) {
      return true;
    }
    return found.membership !== 'Free' && found.membershipStatus === 'active';
  },

  async revalidateAndSanitizeMembership(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const isPremium = await this.verifyUserPremiumMembership(userId);
      if (!isPremium) {
        console.warn(`[Membership Sanitizer] User ${userId} active features are cleared because premium check failed.`);
        
        // Remove premium/platinum customizer settings from Database
        await supabase.from('gamer_profiles').update({
          platinum_theme_enabled: false,
          active_frame_url: null,
          selected_frame: null,
          active_banner_url: null,
          selected_banner: null,
          active_badge_url: null,
          selected_badge: null
        }).eq('user_id', userId);

        await supabase.from('users').update({
          membership: 'Free'
        }).eq('id', userId);

        return false;
      }
      return true;
    } catch (err: any) {
      console.error("[Membership Sanitizer] Exception on automatic sanitization:", err.message || err);
      return false;
    }
  },

  async updateProfile(userId: string, updatedFields: Partial<UserProfile>): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Prevent bypass (Pre-verify membership from Supabase before saving premium configs)
        const premiumKeys = [
          'platinum_theme_enabled',
          'platinum_background_url',
          'platinum_overlay_url',
          'platinum_profile_card_url',
          'platinum_hud_assets',
          'premiumBadge',
          'premiumFrame',
          'premiumBanner',
          'active_banner_url',
          'selected_banner',
          'active_badge_url',
          'selected_badge',
          'active_frame_url',
          'selected_frame',
          'activeSticker',
          'activeFrame',
          'activeBanner'
        ];

        let attemptsPremiumSet = false;
        for (const key of premiumKeys) {
          if (updatedFields[key as keyof UserProfile] !== undefined) {
            const val = updatedFields[key as keyof UserProfile];
            // If setting value to true or non-empty/non-false, it's an activation attempt
            if (val && val !== 'none' && val !== 'false' && val !== '') {
              attemptsPremiumSet = true;
              break;
            }
          }
        }

        if (attemptsPremiumSet) {
          const isPremium = await this.verifyUserPremiumMembership(userId);
          if (!isPremium) {
            throw new Error("Upgrade to Platinum Membership to unlock this feature.");
          }
        }

        // Separate updates between users core row and profiles detailed row
        const userUpdates: any = {};
        if (updatedFields.membership !== undefined) userUpdates.membership = updatedFields.membership;
        if (updatedFields.xp !== undefined) userUpdates.xp = updatedFields.xp;
        if (updatedFields.level !== undefined) userUpdates.level = updatedFields.level;
        if (updatedFields.premiumBadge !== undefined) userUpdates.premium_badge = updatedFields.premiumBadge;
        if (updatedFields.premiumFrame !== undefined) userUpdates.premium_frame = updatedFields.premiumFrame;
        if (updatedFields.premiumBanner !== undefined) userUpdates.premium_banner = updatedFields.premiumBanner;
        if (updatedFields.last_daily_reward_claimed_at !== undefined) userUpdates.last_daily_reward_claimed_at = updatedFields.last_daily_reward_claimed_at;
        if (updatedFields.coins !== undefined) userUpdates.coins = updatedFields.coins;
        if (updatedFields.topup_diamonds !== undefined) userUpdates.topup_diamonds = updatedFields.topup_diamonds;
        if (updatedFields.winning_diamonds !== undefined) userUpdates.winning_diamonds = updatedFields.winning_diamonds;
        if (updatedFields.locked_withdraw_diamonds !== undefined) userUpdates.locked_withdraw_diamonds = updatedFields.locked_withdraw_diamonds;

        if (Object.keys(userUpdates).length > 0) {
          await supabase.from('users').update(userUpdates).eq('id', userId);
        }

        const profileUpdates: any = {};
        if (updatedFields.gamerName !== undefined) profileUpdates.gamer_name = updatedFields.gamerName;
        if (updatedFields.bio !== undefined) profileUpdates.bio = updatedFields.bio;
        if (updatedFields.profilePhoto !== undefined) profileUpdates.profile_photo = updatedFields.profilePhoto;
        if (updatedFields.favoriteGames !== undefined) {
          profileUpdates.favorite_games = updatedFields.favoriteGames;
          if (updatedFields.favoriteGames.length > 0) {
            profileUpdates.favorite_game = updatedFields.favoriteGames[0];
          }
        }
        if (updatedFields.country !== undefined) profileUpdates.country = updatedFields.country;
        if (updatedFields.state !== undefined) profileUpdates.state = updatedFields.state;
        if (updatedFields.city !== undefined) profileUpdates.city = updatedFields.city;
        if (updatedFields.social !== undefined) profileUpdates.social_links = updatedFields.social;
        if (updatedFields.skillRating !== undefined) profileUpdates.skill_rating = updatedFields.skillRating;
        if (updatedFields.kdRatio !== undefined) profileUpdates.kd_ratio = updatedFields.kdRatio;
        if (updatedFields.winRate !== undefined) profileUpdates.win_rate = updatedFields.winRate;
        if (updatedFields.badges !== undefined) profileUpdates.badges = updatedFields.badges;
        if (updatedFields.stickers !== undefined) profileUpdates.stickers = updatedFields.stickers;
        if (updatedFields.activeSticker !== undefined) profileUpdates.active_sticker = updatedFields.activeSticker;
        if (updatedFields.activeFrame !== undefined) profileUpdates.active_frame = updatedFields.activeFrame;
        if (updatedFields.activeBanner !== undefined) profileUpdates.active_banner = updatedFields.activeBanner;
        if (updatedFields.active_banner_url !== undefined) profileUpdates.active_banner_url = updatedFields.active_banner_url;
        if (updatedFields.selected_banner !== undefined) profileUpdates.selected_banner = updatedFields.selected_banner;
        if (updatedFields.active_badge_url !== undefined) profileUpdates.active_badge_url = updatedFields.active_badge_url;
        if (updatedFields.selected_badge !== undefined) profileUpdates.selected_badge = updatedFields.selected_badge;
        if (updatedFields.active_frame_url !== undefined) profileUpdates.active_frame_url = updatedFields.active_frame_url;
        if (updatedFields.selected_frame !== undefined) profileUpdates.selected_frame = updatedFields.selected_frame;
        if (updatedFields.frame_shape !== undefined) profileUpdates.frame_shape = updatedFields.frame_shape;
        if (updatedFields.unlocked_stickers !== undefined) profileUpdates.unlocked_stickers = updatedFields.unlocked_stickers;
        if (updatedFields.membershipStatus !== undefined) profileUpdates.membership_status = updatedFields.membershipStatus;
        if (updatedFields.savedPlayers !== undefined) profileUpdates.saved_players = updatedFields.savedPlayers;
        if (updatedFields.membershipExpires !== undefined) profileUpdates.membership_expires = updatedFields.membershipExpires;
        if (updatedFields.featuredUntil !== undefined) profileUpdates.featured_until = updatedFields.featuredUntil;
        if (updatedFields.referredBy !== undefined) profileUpdates.referred_by = updatedFields.referredBy;
        if (updatedFields.isFeatured !== undefined) profileUpdates.is_featured = updatedFields.isFeatured;
        if (updatedFields.platinum_theme_enabled !== undefined) profileUpdates.platinum_theme_enabled = updatedFields.platinum_theme_enabled;
        if (updatedFields.platinum_background_url !== undefined) profileUpdates.platinum_background_url = updatedFields.platinum_background_url;
        if (updatedFields.platinum_overlay_url !== undefined) profileUpdates.platinum_overlay_url = updatedFields.platinum_overlay_url;
        if (updatedFields.platinum_profile_card_url !== undefined) profileUpdates.platinum_profile_card_url = updatedFields.platinum_profile_card_url;
        if (updatedFields.platinum_hud_assets !== undefined) profileUpdates.platinum_hud_assets = updatedFields.platinum_hud_assets;

        if (Object.keys(profileUpdates).length > 0) {
          await supabase.from('gamer_profiles').update(profileUpdates).eq('user_id', userId);
        }

        addLocalCommentSupport(userId, updatedFields);

        // Fetch freshly merged user profile directly from database to avoid partial/empty sync out of database
        const freshProfile = await this.getUserProfileById(userId);
        if (freshProfile) {
          // Sync database mapped properties back to local storage
          const users = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
          const updatedList = users.map(u => u.id === userId ? freshProfile : u);
          saveData('gh_users', updatedList);
          
          console.log("Successfully synchronised profiles. Theme status: ", freshProfile.platinum_theme_enabled);
          return freshProfile;
        }
      } catch (err) {
        console.error("Failed to commit profile updates to Supabase.", err);
      }
    }

    // Always fallback sync to localStorage to maintain cohesive visual updates
    const users = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updatedList = users.map(u => {
      if (u.id === userId) {
        return { ...u, ...updatedFields };
      }
      return u;
    });
    saveData('gh_users', updatedList);
    return updatedList.find(u => u.id === userId)!;
  },

  // ==========================================
  // TEAMS & SQUADS OPERATIONS
  // ==========================================

  async getTeams(): Promise<Team[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: teamsData, error: teamError } = await supabase.from('teams').select('*');
        const { data: membersData, error: memError } = await supabase.from('team_members').select('*');

        if (teamError || memError) throw teamError || memError;

        // Map into UI standard Team objects
        const usersList = await this.getUsers();

        return (teamsData || []).map((t: any) => {
          const ownerUser = usersList.find(u => u.id === t.owner_id);
          const rawMembers = (membersData || []).filter((m: any) => m.team_id === t.id);

          const matchedMembers = rawMembers.map((rm: any) => {
            const gu = usersList.find(u => u.id === rm.user_id);
            return {
              userId: rm.user_id,
              username: gu?.username || 'Unknown',
              gamerName: gu?.gamerName || 'Unknown Gamer',
              role: rm.role
            };
          });

          return {
            id: t.id,
            name: t.team_name,
            logo: t.team_logo || '',
            bio: t.description || '',
            game: t.game,
            requiredRole: t.required_role || 'Open',
            ranking: t.ranking || 0,
            creatorId: t.owner_id,
            creatorGamerName: ownerUser?.gamerName || 'Owner',
            isFeatured: t.is_featured || false,
            members: matchedMembers.length > 0 ? matchedMembers : [{
              userId: t.owner_id,
              username: ownerUser?.username || 'Owner',
              gamerName: ownerUser?.gamerName || 'Owner',
              role: 'Leader'
            }],
            pendingRequests: [], // we will utilize local fallback/mock synchronization for transient listings if needed
            pendingInvites: []
          } as Team;
        });
      } catch (err) {
        console.error("Supabase team listing failed. Loading local fallback roster database.", err);
      }
    }

    return loadData<Team[]>('gh_teams', INITIAL_TEAMS);
  },

  async createTeam(teamData: Omit<Team, 'id' | 'ranking' | 'creatorId' | 'creatorGamerName' | 'members' | 'pendingRequests' | 'pendingInvites'>, ownerId: string): Promise<Team> {
    const defaultLogo = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80";
    
    if (isSupabaseConfigured && supabase) {
      try {
        const teamId = generateUUID();
        const { error: insertTeamError } = await supabase.from('teams').insert([{
          id: teamId,
          team_name: teamData.name,
          team_logo: teamData.logo || defaultLogo,
          description: teamData.bio,
          game: teamData.game,
          required_role: teamData.requiredRole,
          owner_id: ownerId,
          ranking: 10
        }]);

        if (insertTeamError) throw insertTeamError;

        await supabase.from('team_members').insert([{
          team_id: teamId,
          user_id: ownerId,
          role: 'Leader/IGL'
        }]);

        const usersList = await this.getUsers();
        const me = usersList.find(u => u.id === ownerId);

        const newTeam: Team = {
          id: teamId,
          name: teamData.name,
          logo: teamData.logo || defaultLogo,
          bio: teamData.bio,
          game: teamData.game,
          requiredRole: teamData.requiredRole,
          ranking: 10,
          creatorId: ownerId,
          creatorGamerName: me?.gamerName || me?.username || 'Gamer',
          members: [{
            userId: ownerId,
            username: me?.username || 'Owner',
            gamerName: me?.gamerName || 'Owner',
            role: 'Leader/IGL'
          }],
          pendingRequests: [],
          pendingInvites: []
        };

        // Cache local sync
        const currentLocal = loadData<Team[]>('gh_teams', INITIAL_TEAMS);
        currentLocal.push(newTeam);
        saveData('gh_teams', currentLocal);

        return newTeam;
      } catch (err) {
        console.error("Commissions on Supabase team write failed.", err);
      }
    }

    // LocalStorage Fallback Flow
    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const me = localUsers.find(u => u.id === ownerId);
    const newTeam: Team = {
      id: generateUUID(),
      name: teamData.name,
      logo: teamData.logo || defaultLogo,
      bio: teamData.bio,
      game: teamData.game,
      requiredRole: teamData.requiredRole,
      ranking: 15,
      creatorId: ownerId,
      creatorGamerName: me?.gamerName || me?.username || 'Owner',
      members: [{
        userId: ownerId,
        username: me?.username || 'Owner',
        gamerName: me?.gamerName || 'Owner',
        role: 'Leader/IGL'
      }],
      pendingRequests: [],
      pendingInvites: []
    };

    const currentLocal = loadData<Team[]>('gh_teams', INITIAL_TEAMS);
    currentLocal.push(newTeam);
    saveData('gh_teams', currentLocal);
    return newTeam;
  },

  async deleteTeam(teamId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('teams').delete().eq('id', teamId);
      } catch (err) {
        console.error("Deletion on Supabase failed.", err);
      }
    }

    const currentLocal = loadData<Team[]>('gh_teams', INITIAL_TEAMS);
    const filtered = currentLocal.filter(t => t.id !== teamId);
    saveData('gh_teams', filtered);
  },

  // ==========================================
  // TOURNAMENTS & REGISTRATION OPERATIONS
  // ==========================================

  async getTournaments(): Promise<Tournament[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('tournaments').select('*');
        if (error) throw error;
 
        if (data && data.length > 0) {
          // Map into TS Interface
          return data.map((t: any) => ({
            id: t.id,
            title: t.title,
            game: t.game,
            prizePool: t.prize_pool,
            description: t.description || '',
            banner_url: t.banner_url || '',
            entry_fee: t.entry_fee || 'Free',
            max_players: t.max_players || 100,
            registration_deadline: t.registration_deadline || '',
            tournament_start: t.tournament_start || '',
            tournament_end: t.tournament_end || '',
            created_at: t.created_at || '',
            rules: t.rules || [],
            schedule: typeof t.schedule === 'string' ? JSON.parse(t.schedule) : t.schedule || [],
            registrationType: t.registration_type,
            status: t.status,
            max_teams: t.max_teams || 16,
            registrants: typeof t.registrants === 'string' ? JSON.parse(t.registrants) : t.registrants || [],
            winners: typeof t.winners === 'string' ? JSON.parse(t.winners) : t.winners || [],
            bracket: typeof t.bracket === 'string' ? JSON.parse(t.bracket) : t.bracket || [],
            room_id: t.room_id || null,
            room_password: t.room_password || null,
            room_reveal_mode: t.room_reveal_mode || 'manual',
            room_reveal_at: t.room_reveal_at || null,
            room_revealed: t.room_revealed !== undefined ? t.room_revealed : false
          }));
        }
      } catch (err) {
        console.error("Supabase tournament query failed.", err);
      }
    }
 
    return loadData<Tournament[]>('gh_tournaments', INITIAL_TOURNAMENTS);
  },
 
  async createTournament(tourney: any): Promise<Tournament> {
    const id = tourney.id || `tourney-${Date.now()}`;
    const newT: Tournament = {
      id,
      title: tourney.title,
      game: tourney.game,
      prizePool: tourney.prizePool || tourney.prize_pool || 'Free',
      prize_pool: tourney.prizePool || tourney.prize_pool || 'Free',
      rules: tourney.rules || [],
      schedule: tourney.schedule || [],
      registrationType: tourney.registrationType || 'team',
      status: tourney.status || 'upcoming',
      max_teams: tourney.maxTeams || tourney.max_teams || 16,
      registrants: tourney.registrants || [],
      winners: tourney.winners || [],
      bracket: tourney.bracket || [],
      description: tourney.description || '',
      banner_url: tourney.banner_url || '',
      entry_fee: tourney.entry_fee || 'Free',
      max_players: tourney.max_players || 100,
      registration_deadline: tourney.registration_deadline || '',
      tournament_start: tourney.tournament_start || '',
      tournament_end: tourney.tournament_end || '',
      created_at: new Date().toISOString(),
      room_id: tourney.room_id || null,
      room_password: tourney.room_password || null,
      room_reveal_mode: tourney.room_reveal_mode || 'manual',
      room_reveal_at: tourney.room_reveal_at || null,
      room_revealed: tourney.room_revealed || false
    };
 
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('tournaments').insert({
          id: id.startsWith('tourney-') ? undefined : id,
          title: newT.title,
          game: newT.game,
          prize_pool: newT.prizePool,
          rules: newT.rules,
          schedule: newT.schedule,
          registration_type: newT.registrationType,
          status: newT.status,
          max_teams: newT.max_teams,
          registrants: newT.registrants,
          winners: newT.winners,
          bracket: newT.bracket,
          description: newT.description,
          banner_url: newT.banner_url,
          entry_fee: newT.entry_fee,
          max_players: newT.max_players,
          registration_deadline: newT.registration_deadline || null,
          tournament_start: newT.tournament_start || null,
          tournament_end: newT.tournament_end || null,
          room_id: newT.room_id,
          room_password: newT.room_password,
          room_reveal_mode: newT.room_reveal_mode,
          room_reveal_at: newT.room_reveal_at,
          room_revealed: newT.room_revealed
        });
        if (error) throw error;
      } catch (err) {
        console.error("Created tournament writing to Supabase failed:", err);
      }
    }
 
    const currentLocal = loadData<Tournament[]>('gh_tournaments', INITIAL_TOURNAMENTS);
    saveData('gh_tournaments', [...currentLocal, newT]);
    return newT;
  },
 
  async updateTournament(tourneyId: string, updates: any): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.game !== undefined) dbUpdates.game = updates.game;
        if (updates.prizePool !== undefined) dbUpdates.prize_pool = updates.prizePool;
        if (updates.prize_pool !== undefined) dbUpdates.prize_pool = updates.prize_pool;
        if (updates.rules !== undefined) dbUpdates.rules = updates.rules;
        if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
        if (updates.registrationType !== undefined) dbUpdates.registration_type = updates.registrationType;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.maxTeams !== undefined) dbUpdates.max_teams = updates.maxTeams;
        if (updates.max_teams !== undefined) dbUpdates.max_teams = updates.max_teams;
        if (updates.registrants !== undefined) dbUpdates.registrants = updates.registrants;
        if (updates.winners !== undefined) dbUpdates.winners = updates.winners;
        if (updates.bracket !== undefined) dbUpdates.bracket = updates.bracket;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.banner_url !== undefined) dbUpdates.banner_url = updates.banner_url;
        if (updates.entry_fee !== undefined) dbUpdates.entry_fee = updates.entry_fee;
        if (updates.max_players !== undefined) dbUpdates.max_players = updates.max_players;
        if (updates.registration_deadline !== undefined) dbUpdates.registration_deadline = updates.registration_deadline;
        if (updates.tournament_start !== undefined) dbUpdates.tournament_start = updates.tournament_start;
        if (updates.tournament_end !== undefined) dbUpdates.tournament_end = updates.tournament_end;
        if (updates.room_id !== undefined) dbUpdates.room_id = updates.room_id;
        if (updates.room_password !== undefined) dbUpdates.room_password = updates.room_password;
        if (updates.room_reveal_mode !== undefined) dbUpdates.room_reveal_mode = updates.room_reveal_mode;
        if (updates.room_reveal_at !== undefined) dbUpdates.room_reveal_at = updates.room_reveal_at;
        if (updates.room_revealed !== undefined) dbUpdates.room_revealed = updates.room_revealed;
 
        const { error } = await supabase.from('tournaments').update(dbUpdates).eq('id', tourneyId);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase tournament update failed:", err);
      }
    }
 
    const currentLocal = loadData<Tournament[]>('gh_tournaments', INITIAL_TOURNAMENTS);
    const updated = currentLocal.map(t => {
      if (t.id === tourneyId) {
        return { ...t, ...updates };
      }
      return t;
    });
    saveData('gh_tournaments', updated);
  },

  async registerForTournament(tourneyId: string, registrant: any): Promise<Tournament[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Query current tournament raw registries
        const { data, error } = await supabase.from('tournaments').select('registrants').eq('id', tourneyId).single();
        if (!error && data) {
          const arr = Array.isArray(data.registrants) ? data.registrants : [];
          const updatedRegs = [...arr, {
            id: registrant.id,
            name: registrant.name,
            logo: registrant.logo,
            type: registrant.type,
            status: registrant.status || 'approved',
            contactEmail: registrant.contactEmail || '',
            registeredAt: new Date().toISOString()
          }];

          await supabase.from('tournaments').update({ registrants: updatedRegs }).eq('id', tourneyId);
        }
      } catch (err) {
        console.error("Tournament registration Supabase writing failed.", err);
      }
    }

    // Always fallback synchronize to localStorage
    const list = loadData<Tournament[]>('gh_tournaments', INITIAL_TOURNAMENTS);
    const updated = list.map(t => {
      if (t.id === tourneyId) {
        return {
          ...t,
          registrants: [...t.registrants, {
            id: registrant.id,
            name: registrant.name,
            logo: registrant.logo,
            type: registrant.type,
            status: registrant.status || 'approved',
            contactEmail: registrant.contactEmail || '',
            registeredAt: new Date().toISOString()
          }]
        };
      }
      return t;
    });
    saveData('gh_tournaments', updated);
    return updated;
  },

  async getTournamentRegistrations(): Promise<DbTournamentRegistration[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('tournament_registrations').select('*');
        if (error) throw error;
        if (data) {
          return data.map((r: any) => ({
            id: r.id,
            tournament_id: r.tournament_id,
            user_id: r.user_id,
            team_id: r.team_id,
            registration_type: r.registration_type || 'solo',
            status: r.status || 'pending',
            payment_status: r.payment_status || 'unneeded',
            transaction_id: r.transaction_id,
            payment_screenshot_url: r.payment_screenshot_url,
            registered_at: r.registered_at,
            seat_number: r.seat_number,
            entry_fee_paid: r.entry_fee_paid || 0,
            cancelled_at: r.cancelled_at || null,
            refund_amount: r.refund_amount || 0
          }));
        }
      } catch (err) {
        console.error("Supabase query tournament_registrations failed.", err);
      }
    }
    return loadData<DbTournamentRegistration[]>('gh_tournament_registrations', []);
  },

  async createTournamentRegistration(reg: Omit<DbTournamentRegistration, 'id' | 'registered_at'>): Promise<DbTournamentRegistration> {
    const id = `reg-${Date.now()}`;
    const newReg: DbTournamentRegistration = {
      id,
      tournament_id: reg.tournament_id,
      user_id: reg.user_id,
      team_id: reg.team_id || null,
      registration_type: reg.registration_type,
      status: reg.status || 'pending',
      payment_status: reg.payment_status || 'unneeded',
      transaction_id: reg.transaction_id || null,
      payment_screenshot_url: reg.payment_screenshot_url || null,
      registered_at: new Date().toISOString(),
      seat_number: reg.seat_number !== undefined ? reg.seat_number : null,
      entry_fee_paid: reg.entry_fee_paid !== undefined ? reg.entry_fee_paid : 0,
      cancelled_at: reg.cancelled_at || null,
      refund_amount: reg.refund_amount !== undefined ? reg.refund_amount : 0
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('tournament_registrations').insert({
          id: id.startsWith('reg-') ? undefined : id,
          tournament_id: newReg.tournament_id,
          user_id: newReg.user_id,
          team_id: newReg.team_id || null,
          registration_type: newReg.registration_type,
          status: newReg.status,
          payment_status: newReg.payment_status,
          transaction_id: newReg.transaction_id,
          payment_screenshot_url: newReg.payment_screenshot_url,
          seat_number: newReg.seat_number,
          entry_fee_paid: newReg.entry_fee_paid,
          cancelled_at: newReg.cancelled_at,
          refund_amount: newReg.refund_amount
        });
        if (error) throw error;
      } catch (err) {
        console.error("Created tournament registration writing to Supabase failed:", err);
      }
    }

    const currentLocal = loadData<DbTournamentRegistration[]>('gh_tournament_registrations', []);
    saveData('gh_tournament_registrations', [...currentLocal, newReg]);
    return newReg;
  },

  async updateTournamentRegistration(regId: string, updates: Partial<DbTournamentRegistration>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.payment_status !== undefined) dbUpdates.payment_status = updates.payment_status;
        if (updates.seat_number !== undefined) dbUpdates.seat_number = updates.seat_number;
        if (updates.entry_fee_paid !== undefined) dbUpdates.entry_fee_paid = updates.entry_fee_paid;
        if (updates.cancelled_at !== undefined) dbUpdates.cancelled_at = updates.cancelled_at;
        if (updates.refund_amount !== undefined) dbUpdates.refund_amount = updates.refund_amount;
        if (updates.transaction_id !== undefined) dbUpdates.transaction_id = updates.transaction_id;
        if (updates.payment_screenshot_url !== undefined) dbUpdates.payment_screenshot_url = updates.payment_screenshot_url;

        const { error } = await supabase.from('tournament_registrations').update(dbUpdates).eq('id', regId);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase update registration failed:", err);
      }
    }

    const currentLocal = loadData<DbTournamentRegistration[]>('gh_tournament_registrations', []);
    const updated = currentLocal.map(r => {
      if (r.id === regId) {
        return {
          ...r,
          ...updates
        };
      }
      return r;
    });
    saveData('gh_tournament_registrations', updated);
  },

  async updateTournamentRegistrationStatus(regId: string, status: 'pending' | 'approved' | 'rejected', paymentStatus?: 'pending' | 'paid' | 'unneeded' | 'rejected'): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: any = { status };
        if (paymentStatus) {
          dbUpdates.payment_status = paymentStatus;
        }
        const { error } = await supabase.from('tournament_registrations').update(dbUpdates).eq('id', regId);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase update registration failed:", err);
      }
    }

    const currentLocal = loadData<DbTournamentRegistration[]>('gh_tournament_registrations', []);
    const updated = currentLocal.map(r => {
      if (r.id === regId) {
        return {
          ...r,
          status,
          payment_status: paymentStatus || r.payment_status
        };
      }
      return r;
    });
    saveData('gh_tournament_registrations', updated);
  },

  async deleteTournament(tourneyId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('tournaments').delete().eq('id', tourneyId);
      } catch (err) {
        console.error("Tournament deletion on Supabase failed.", err);
      }
    }

    const currentLocal = loadData<Tournament[]>('gh_tournaments', INITIAL_TOURNAMENTS);
    const filtered = currentLocal.filter(t => t.id !== tourneyId);
    saveData('gh_tournaments', filtered);
  },

  // ==========================================
  // SPONSOR APPLICATIONS operations
  // ==========================================

  async getSponsors(): Promise<SponsorApplication[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('sponsor_applications').select('*');
        if (error) throw error;
        
        const usersList = await this.getUsers();

        return (data || []).map((sa: any) => {
          const userObj = usersList.find(u => u.id === sa.user_id);
          return {
            id: sa.id,
            userId: sa.user_id,
            gamerName: userObj?.gamerName || 'Unknown Gamer',
            favoriteGame: userObj?.favoriteGames?.[0] || 'Valorant',
            brandName: sa.company_name,
            pitch: sa.pitch,
            monthlyReach: sa.monthly_reach,
            mediaKitStats: sa.media_kit_stats || 'N/A',
            status: sa.status,
            createdAt: sa.created_at,
            contactEmail: sa.contact_email
          } as SponsorApplication;
        });
      } catch (err) {
        console.error("Supabase sponsor list fetch failure.", err);
      }
    }

    return loadData<SponsorApplication[]>('gh_sponsors', INITIAL_SPONSORS);
  },

  async submitSponsorPitch(pitchData: Omit<SponsorApplication, 'id' | 'createdAt' | 'status'>): Promise<SponsorApplication> {
    if (isSupabaseConfigured && supabase) {
      try {
        const id = generateUUID();
        const { error } = await supabase.from('sponsor_applications').insert([{
          id,
          user_id: pitchData.userId,
          company_name: pitchData.brandName,
          pitch: pitchData.pitch,
          monthly_reach: pitchData.monthlyReach,
          media_kit_stats: pitchData.mediaKitStats,
          contact_email: pitchData.contactEmail,
          status: 'pending'
        }]);

        if (!error) {
          const completed: SponsorApplication = {
            ...pitchData,
            id,
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          // Cache update
          const list = loadData<SponsorApplication[]>('gh_sponsors', INITIAL_SPONSORS);
          list.push(completed);
          saveData('gh_sponsors', list);

          return completed;
        }
      } catch (err) {
        console.error("Sponsor application insert failed on Supabase.", err);
      }
    }

    const completed: SponsorApplication = {
      ...pitchData,
      id: generateUUID(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const list = loadData<SponsorApplication[]>('gh_sponsors', INITIAL_SPONSORS);
    list.push(completed);
    saveData('gh_sponsors', list);
    return completed;
  },

  // ==========================================
  // NOTIFICATIONS OPERATIONS
  // ==========================================

  async getNotifications(): Promise<Notification[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('notifications').select('*');
        if (error) throw error;

        return (data || []).map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.content,
          type: n.type as any,
          date: n.created_at,
          read: n.read
        }));
      } catch (err) {
        console.error("Fails querying notifications from Supabase.", err);
      }
    }

    return loadData<Notification[]>('gh_notifications', INITIAL_NOTIFICATIONS);
  },

  async addNotification(notif: Omit<Notification, 'id' | 'date' | 'read'>): Promise<Notification> {
    if (isSupabaseConfigured && supabase) {
      try {
        const id = generateUUID();
        const { error } = await supabase.from('notifications').insert([{
          id,
          user_id: notif.userId,
          title: notif.title,
          content: notif.message,
          type: notif.type,
          read: false
        }]);

        if (!error) {
          const fullNotif: Notification = {
            ...notif,
            id,
            date: new Date().toISOString(),
            read: false
          };

          const list = loadData<Notification[]>('gh_notifications', INITIAL_NOTIFICATIONS);
          list.unshift(fullNotif);
          saveData('gh_notifications', list);

          return fullNotif;
        }
      } catch (err) {
        console.error("Notifications creation failed in Supabase.", err);
      }
    }

    const fullNotif: Notification = {
      ...notif,
      id: generateUUID(),
      date: new Date().toISOString(),
      read: false
    };

    const list = loadData<Notification[]>('gh_notifications', INITIAL_NOTIFICATIONS);
    list.unshift(fullNotif);
    saveData('gh_notifications', list);
    return fullNotif;
  },

  // ==========================================
  // ADMIN MASTER CONTROLS / SETTINGS
  // ==========================================

  async getAdminSettings(): Promise<AdminSettings> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('admin_settings').select('*').eq('id', 1).single();
        if (!error && data) {
          return {
            qrCodeUrl: data.qr_code_url,
            upiId: data.upi_id || "careerhub@ybl",
            activeCoupons: typeof data.active_coupons === 'string' ? JSON.parse(data.active_coupons) : data.active_coupons || [],
            badges: typeof data.badges === 'string' ? JSON.parse(data.badges) : data.badges || [],
            stickerPacks: typeof data.sticker_packs === 'string' ? JSON.parse(data.sticker_packs) : data.sticker_packs || [],
            profileFrames: typeof data.profile_frames === 'string' ? JSON.parse(data.profile_frames) : data.profile_frames || [],
            profileBanners: typeof data.profile_banners === 'string' ? JSON.parse(data.profile_banners) : data.profile_banners || [],
            premiumRewards: typeof data.premium_rewards === 'string' ? JSON.parse(data.premium_rewards) : data.premium_rewards || []
          };
        }
      } catch (err) {
        console.error("Supabase admin settings retrieval failed.", err);
      }
    }

    // fallback
    const arraySettings = loadData<AdminSettings[]>('gh_admin_settings', [INITIAL_ADMIN_SETTINGS]);
    return Array.isArray(arraySettings) ? arraySettings[0] || INITIAL_ADMIN_SETTINGS : arraySettings || INITIAL_ADMIN_SETTINGS;
  },

  async updateAdminSettings(settings: AdminSettings): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('admin_settings').upsert({
          id: 1,
          qr_code_url: settings.qrCodeUrl,
          upi_id: settings.upiId,
          active_coupons: settings.activeCoupons,
          badges: settings.badges,
          sticker_packs: settings.stickerPacks,
          profile_frames: settings.profileFrames,
          profile_banners: settings.profileBanners,
          premium_rewards: settings.premiumRewards
        }, { onConflict: 'id' });

        if (error) throw error;
      } catch (err) {
        console.error("Save admin settings directly on Supabase failed.", err);
      }
    }

    saveData('gh_admin_settings', [settings]);
  },

  // Submit a membership payment
  async submitPayment(paymentData: {
    userId: string;
    plan: 'Silver' | 'Gold' | 'Platinum';
    amount: number;
    transactionId: string;
    screenshotUrl?: string;
    couponApplied?: string;
  }): Promise<DbPayment> {
    const id = generateUUID();
    const created_at = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('payments').insert([{
          id,
          user_id: paymentData.userId,
          plan: paymentData.plan,
          amount: paymentData.amount,
          transaction_id: paymentData.transactionId,
          status: 'pending',
          screenshot_url: paymentData.screenshotUrl || '',
          coupon_applied: paymentData.couponApplied || ''
        }]);
        if (error) throw error;
      } catch (err) {
        console.error("Failed inserting payment record in Supabase:", err);
      }
    }

    const newPayment: DbPayment = {
      id,
      userId: paymentData.userId,
      plan: paymentData.plan,
      amount: paymentData.amount,
      transactionId: paymentData.transactionId,
      status: 'pending',
      screenshotUrl: paymentData.screenshotUrl,
      couponApplied: paymentData.couponApplied,
      createdAt: created_at
    };

    // fallback sync to LocalStorage
    const localPayments = loadData<DbPayment[]>('gh_payments', []);
    localPayments.push(newPayment);
    saveData('gh_payments', localPayments);

    return newPayment;
  },

  // Retrieve all payments logs
  async getAllPayments(): Promise<DbPayment[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            plan: p.plan,
            amount: p.amount !== undefined ? Number(p.amount) : (p.plan === 'Silver' ? 19 : p.plan === 'Gold' ? 49 : 99),
            transactionId: p.transaction_id || '',
            status: p.status,
            screenshotUrl: p.screenshot_url || '',
            createdAt: p.created_at
          }));
        }
      } catch (err) {
        console.error("Failed fetching all payments from Supabase, loading local:", err);
      }
    }
    return loadData<DbPayment[]>('gh_payments', []);
  },

  // Retrieve pending payment logs
  async getPendingPayments(): Promise<DbPayment[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;

        if (paymentsData && paymentsData.length > 0) {
          // Fetch users emails to merge
          const userIds = paymentsData.map((p: any) => p.user_id);
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds);

          const emailMap: Record<string, string> = {};
          if (!usersError && usersData) {
            usersData.forEach((u: any) => {
              emailMap[u.id] = u.email;
            });
          }

          return paymentsData.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            userEmail: emailMap[row.user_id] || 'unresolved-gamer@careerhub.gg',
            plan: row.plan as any,
            amount: Number(row.amount),
            transactionId: row.transaction_id,
            status: row.status as any,
            screenshotUrl: row.screenshot_url,
            couponApplied: row.coupon_applied,
            createdAt: row.created_at
          }));
        }
        return [];
      } catch (err) {
        console.error("Failed querying pending payments from Supabase:", err);
      }
    }

    // fallback
    const localPayments = loadData<DbPayment[]>('gh_payments', []);
    const pending = localPayments.filter(p => p.status === 'pending');
    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    return pending.map(p => {
      const uObj = localUsers.find(u => u.id === p.userId);
      return {
        ...p,
        userEmail: uObj?.email || 'unresolved-gamer@careerhub.gg'
      };
    });
  },

  // Approve a payment
  async approvePayment(paymentId: string): Promise<{ userId: string; plan: 'Silver' | 'Gold' | 'Platinum' } | null> {
    const checkAndHandleRlsError = (err: any): void => {
      if (!err) return;
      const errMsg = String(err.message || '').toLowerCase();
      const errCode = String(err.code || '');
      if (
        errCode === '42501' ||
        errMsg.includes('policy') ||
        errMsg.includes('permission') ||
        errMsg.includes('security') ||
        errMsg.includes('privilege') ||
        errMsg.includes('row-level') ||
        errMsg.includes('rls') ||
        errMsg.includes('insufficient privilege') ||
        errMsg.includes('security policy')
      ) {
        throw new Error("Membership activation blocked by database policy.");
      }
    };

    let paymentDetails: DbPayment | null = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .maybeSingle();
        if (error) {
          checkAndHandleRlsError(error);
          throw error;
        }
        if (data) {
          const planVal = data.plan || data.membership_plan || data.plan_name;
          const userIdVal = data.user_id || data.userId;
          paymentDetails = {
            id: data.id,
            userId: userIdVal,
            plan: planVal as any,
            amount: Number(data.amount || 0),
            transactionId: data.transaction_id || data.transactionId,
            status: data.status as any,
            screenshotUrl: data.screenshot_url || data.screenshotUrl,
            couponApplied: data.coupon_applied || data.couponApplied,
            createdAt: data.created_at || data.createdAt
          };
        }
      } catch (err: any) {
        checkAndHandleRlsError(err);
        throw err;
      }
    }

    if (!paymentDetails) {
      const localPayments = loadData<DbPayment[]>('gh_payments', []);
      const found = localPayments.find(p => p.id === paymentId);
      if (found) paymentDetails = found;
    }

    if (!paymentDetails) {
      console.error("Payment registration with ID not found:", paymentId);
      return null;
    }

    const userId = paymentDetails.userId;
    if (!userId) {
      throw new Error("Payment user ID missing. Cannot activate membership.");
    }

    if (paymentDetails.status === 'approved') {
      console.warn("Payment already approved. Preventing duplicate rewards.");
      const rawPlanName = paymentDetails.plan || (paymentDetails as any).membership_plan || (paymentDetails as any).plan_name || 'Gold';
      return { userId, plan: rawPlanName as any };
    }

    const rawPlan = paymentDetails.plan || (paymentDetails as any).membership_plan || (paymentDetails as any).plan_name;
    if (!rawPlan) {
      throw new Error("Payment plan missing. Cannot activate membership.");
    }

    let finalPlan: 'Silver' | 'Gold' | 'Platinum';
    const normalizedPlan = String(rawPlan).trim().toLowerCase();
    if (normalizedPlan === 'silver') {
      finalPlan = 'Silver';
    } else if (normalizedPlan === 'gold') {
      finalPlan = 'Gold';
    } else if (normalizedPlan === 'platinum') {
      finalPlan = 'Platinum';
    } else {
      finalPlan = (rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1)) as any;
    }

    console.log("[Dev Debug] Payment Object:", paymentDetails);
    console.log("[Dev Debug] Payment User ID:", userId);
    console.log("[Dev Debug] Payment Plan:", finalPlan);

    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 30);
    const expiryStr = expiry.toISOString();

    let paymentUpdateResult: any = 'local only fallback';
    let membershipUpsertResult: any = 'local only fallback';
    let usersUpdateResult: any = 'local only fallback';

    if (isSupabaseConfigured && supabase) {
      // Step A: Update payments
      try {
        const { data: dataA, error: errorA } = await supabase
          .from('payments')
          .update({ status: 'approved', approved_at: now.toISOString() })
          .eq('id', paymentId)
          .select();

        if (errorA) {
          if (errorA.code === '42703' || errorA.message.includes('column "approved_at" does not exist')) {
            const { data: retryDataA, error: retryErrorA } = await supabase
              .from('payments')
              .update({ status: 'approved' })
              .eq('id', paymentId)
              .select();
            if (retryErrorA) {
              throw retryErrorA;
            }
            paymentUpdateResult = retryDataA || "Payment status updated (no approved_at)";
          } else {
            throw errorA;
          }
        } else {
          paymentUpdateResult = dataA || "Payment status updated with approved_at";
        }
        console.log("[Dev Debug] Payment Update Result:", paymentUpdateResult);
      } catch (errA: any) {
        checkAndHandleRlsError(errA);
        throw new Error(`Payment status update failed: ${errA.message || errA}`);
      }

      // Step B: Upsert memberships
      try {
        const { data: extM, error: extMError } = await supabase
          .from('memberships')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (extMError) {
          throw extMError;
        }

        if (extM) {
          const { data: upData, error: upError } = await supabase
            .from('memberships')
            .update({
              plan: finalPlan,
              start_date: now.toISOString(),
              expiry_date: expiryStr,
              status: 'active'
            })
            .eq('user_id', userId)
            .select();

          if (upError) {
            if (upError.code === '42703' || upError.message.includes('status')) {
              const { data: retryUpData, error: retryUpError } = await supabase
                .from('memberships')
                .update({
                  plan: finalPlan,
                  start_date: now.toISOString(),
                  expiry_date: expiryStr
                })
                .eq('user_id', userId)
                .select();
              if (retryUpError) {
                throw retryUpError;
              }
              membershipUpsertResult = retryUpData || "Membership updated (no status column)";
            } else {
              throw upError;
            }
          } else {
            membershipUpsertResult = upData || "Membership updated with status active";
          }
        } else {
          const { data: insData, error: insError } = await supabase
            .from('memberships')
            .insert([{
              user_id: userId,
              plan: finalPlan,
              start_date: now.toISOString(),
              expiry_date: expiryStr,
              status: 'active'
            }])
            .select();

          if (insError) {
            if (insError.code === '42703' || insError.message.includes('status')) {
              const { data: retryInsData, error: retryInsError } = await supabase
                .from('memberships')
                .insert([{
                  user_id: userId,
                  plan: finalPlan,
                  start_date: now.toISOString(),
                  expiry_date: expiryStr
                }])
                .select();
              if (retryInsError) {
                throw retryInsError;
              }
              membershipUpsertResult = retryInsData || "Membership inserted (no status column)";
            } else {
              throw insError;
            }
          } else {
            membershipUpsertResult = insData || "Membership inserted with status active";
          }
        }
        console.log("[Dev Debug] Membership Upsert Result:", membershipUpsertResult);
      } catch (errB: any) {
        checkAndHandleRlsError(errB);
        throw new Error(`Membership activation failed: ${errB.message || errB}`);
      }

      // Step C: Update users
      let rewardedDiamonds = 0;
      if (finalPlan === 'Silver') rewardedDiamonds = 5;
      else if (finalPlan === 'Gold') rewardedDiamonds = 20;
      else if (finalPlan === 'Platinum') rewardedDiamonds = 50;

      let currentTopup = 0;
      try {
        const { data: uData, error: uErr } = await supabase.from('users').select('topup_diamonds, winning_diamonds').eq('id', userId).maybeSingle();
        if (!uErr && uData) {
          currentTopup = uData.topup_diamonds || 0;
        }
      } catch (err) {}

      const nextTopup = currentTopup + rewardedDiamonds;

      try {
        const { data: upUserData, error: upUserError } = await supabase
          .from('users')
          .update({
            membership: finalPlan,
            topup_diamonds: nextTopup,
            updated_at: now.toISOString()
          })
          .eq('id', userId)
          .select();

        if (upUserError) {
          if (upUserError.code === '42703' || upUserError.message.includes('updated_at')) {
            const { data: retryUserData, error: retryUserError } = await supabase
              .from('users')
              .update({
                membership: finalPlan,
                topup_diamonds: nextTopup
              })
              .eq('id', userId)
              .select();
            if (retryUserError) {
              throw retryUserError;
            }
            usersUpdateResult = retryUserData || "User updated (no updated_at)";
          } else {
            throw upUserError;
          }
        } else {
          usersUpdateResult = upUserData || "User updated with updated_at";
        }
        console.log("[Dev Debug] Users Update Result:", usersUpdateResult);
      } catch (errC: any) {
        checkAndHandleRlsError(errC);
        throw new Error(`User membership update failed: ${errC.message || errC}`);
      }

      // 4. Update status in gamer_profiles (Non-blocking)
      try {
        await supabase.from('gamer_profiles').update({
          membership_status: 'active',
          membership_expires: expiryStr,
          is_featured: true,
          featured_until: expiryStr
        }).eq('user_id', userId);
      } catch (gpErr) {
        console.error("Non-blocking profile sync warning:", gpErr);
      }
    }

    // fallback update localStorage log
    const localPayments = loadData<DbPayment[]>('gh_payments', []);
    const updatedPayments = localPayments.map(p => p.id === paymentId ? { ...p, status: 'approved' as const } : p);
    saveData('gh_payments', updatedPayments);

    const rewardedDiamonds = finalPlan === 'Silver' ? 5 : finalPlan === 'Gold' ? 20 : finalPlan === 'Platinum' ? 50 : 0;
    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updatedUsers = localUsers.map(u => {
      if (u.id === userId) {
        const nextLocalTopup = (u.topup_diamonds || 0) + rewardedDiamonds;
        const nextLocalWinning = u.winning_diamonds || 0;
        return {
          ...u,
          membership: finalPlan,
          membershipStatus: 'active' as const,
          membershipExpires: expiryStr,
          isFeatured: true,
          featuredUntil: expiryStr,
          topup_diamonds: nextLocalTopup,
          winning_diamonds: nextLocalWinning,
          diamonds: nextLocalTopup + nextLocalWinning
        };
      }
      return u;
    });
    saveData('gh_users', updatedUsers);

    // Activates membership, then check if this user was referred and award points securely
    await this.processReferralRewardsOnMembership(userId).catch(err => {
      console.error("Non-blocking referral rewarder error:", err);
    });

    return { userId, plan: finalPlan };
  },

  // Reject a payment
  async rejectPayment(paymentId: string): Promise<{ userId: string; plan: string } | null> {
    let paymentDetails: DbPayment | null = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle();
        if (!error && data) {
          paymentDetails = {
            id: data.id,
            userId: data.user_id,
            plan: data.plan as any,
            amount: Number(data.amount),
            transactionId: data.transaction_id,
            status: data.status as any,
            screenshotUrl: data.screenshot_url,
            couponApplied: data.coupon_applied,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.error("Error fetching payment row in rejectPayment:", err);
      }
    }

    if (!paymentDetails) {
      const localPayments = loadData<DbPayment[]>('gh_payments', []);
      const found = localPayments.find(p => p.id === paymentId);
      if (found) paymentDetails = found;
    }

    if (!paymentDetails) {
      console.error("Payment registration with ID not found:", paymentId);
      return null;
    }

    const userId = paymentDetails.userId;

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Update status in payments table to 'rejected'
        await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId);

        // 2. Update status in gamer_profiles
        await supabase.from('gamer_profiles').update({
          membership_status: 'none'
        }).eq('user_id', userId);

      } catch (err) {
        console.error("Failed saving payment rejection to Supabase:", err);
      }
    }

    // fallback update localStorage log
    const localPayments = loadData<DbPayment[]>('gh_payments', []);
    const updatedPayments = localPayments.map(p => p.id === paymentId ? { ...p, status: 'rejected' as const } : p);
    saveData('gh_payments', updatedPayments);

    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updatedUsers = localUsers.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          membershipStatus: 'none' as const
        };
      }
      return u;
    });
    saveData('gh_users', updatedUsers);

    return { userId, plan: paymentDetails.plan };
  },

  // Check and expire membership plans automatically, reverting them to Free tier
  async checkAndExpireMemberships(): Promise<void> {
    const now = new Date();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: expiredProfiles, error } = await supabase
          .from('gamer_profiles')
          .select('user_id, gamer_name, membership_expires')
          .eq('membership_status', 'active')
          .lt('membership_expires', now.toISOString());

        if (!error && expiredProfiles && expiredProfiles.length > 0) {
          for (const item of expiredProfiles) {
            const uid = item.user_id;
            await supabase.from('users').update({ membership: 'Free' }).eq('id', uid);
            await supabase.from('gamer_profiles').update({
              membership_status: 'none',
              membership_expires: null,
              is_featured: false,
              featured_until: null,
              active_frame: null,
              active_banner: null,
              active_sticker: null
            }).eq('user_id', uid);

            await this.addNotification({
              userId: uid,
              title: "Membership Expired ⚠️",
              message: "Your premium membership plan has expired. Revert to Free tier has been initiated. Subscribe to unlock elite dynamic headers!",
              type: 'alert'
            });
          }
        }
      } catch (err) {
        console.error("Error sweep expiring memberships:", err);
      }
    }

    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    let dirty = false;
    const updatedUsers = localUsers.map(u => {
      if (u.membership !== 'Free' && u.membershipExpires) {
        const expiryDate = new Date(u.membershipExpires);
        if (expiryDate < now) {
          dirty = true;
          return {
            ...u,
            membership: 'Free' as any,
            membershipStatus: 'none' as const,
            membershipExpires: undefined,
            isFeatured: false,
            featuredUntil: undefined,
            activeFrame: undefined,
            activeBanner: undefined,
            activeSticker: undefined
          };
        }
      }
      return u;
    });

    if (dirty) {
      saveData('gh_users', updatedUsers);
    }
  },

  // Retrieve tournament matches
  async getTournamentMatches(tournamentId: string): Promise<DbTournamentMatch[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true });

        if (error) throw error;

        if (data) {
          return data.map((m: any) => ({
            id: m.id,
            tournamentId: m.tournament_id,
            roundNumber: m.round_number,
            matchNumber: m.match_number,
            player1UserId: m.player1_user_id,
            player2UserId: m.player2_user_id,
            team1Id: m.team1_id,
            team2Id: m.team2_id,
            winnerUserId: m.winner_user_id,
            winnerTeamId: m.winner_team_id,
            status: m.status || 'pending',
            scheduledAt: m.scheduled_at,
            createdAt: m.created_at
          }));
        }
      } catch (err) {
        console.error("Supabase query tournament_matches failed.", err);
      }
    }

    const localMatches = loadData<DbTournamentMatch[]>('gh_tournament_matches', []);
    return localMatches
      .filter(m => m.tournamentId === tournamentId)
      .sort((a, b) => a.roundNumber !== b.roundNumber ? a.roundNumber - b.roundNumber : a.matchNumber - b.matchNumber);
  },

  // Save/Generate tournament matches
  async saveTournamentMatches(tournamentId: string, matches: DbTournamentMatch[]): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Delete existing matches for safety
        await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);

        // 2. Insert new matches
        const dbPayload = matches.map(m => {
          // generate clean standard UUID if the ID is just local fallback template string format
          const cleanId = (m.id && m.id.includes('-') && m.id.split('-').length === 5)
            ? m.id
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });

          return {
            id: cleanId,
            tournament_id: m.tournamentId,
            round_number: m.roundNumber,
            match_number: m.matchNumber,
            player1_user_id: m.player1UserId || null,
            player2_user_id: m.player2UserId || null,
            team1_id: m.team1Id || null,
            team2_id: m.team2Id || null,
            winner_user_id: m.winnerUserId || null,
            winner_team_id: m.winnerTeamId || null,
            status: m.status || 'pending',
            scheduled_at: m.scheduledAt || null
          };
        });

        const { error } = await supabase.from('tournament_matches').insert(dbPayload);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to save matches in Supabase:", err);
      }
    }

    // fallback save localStorage
    const localMatches = loadData<DbTournamentMatch[]>('gh_tournament_matches', []);
    const remaining = localMatches.filter(m => m.tournamentId !== tournamentId);
    saveData('gh_tournament_matches', [...remaining, ...matches]);
    return true;
  },

  // Update specific match details inside a bracket
  async updateMatchStatus(
    matchId: string, 
    status: DbTournamentMatch['status'], 
    winnerUserId?: string | null, 
    winnerTeamId?: string | null
  ): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('tournament_matches')
          .update({
            status,
            winner_user_id: winnerUserId || null,
            winner_team_id: winnerTeamId || null
          })
          .eq('id', matchId);

        if (error) throw error;
      } catch (err) {
        console.error("Failed to update match status in Supabase:", err);
      }
    }

    // fallback localStorage
    const localMatches = loadData<DbTournamentMatch[]>('gh_tournament_matches', []);
    const idx = localMatches.findIndex(m => m.id === matchId);
    if (idx !== -1) {
      localMatches[idx] = {
        ...localMatches[idx],
        status,
        winnerUserId,
        winnerTeamId
      };
      saveData('gh_tournament_matches', localMatches);
    }
    return true;
  },

  // Reset all matches for a tournament
  async resetTournamentMatches(tournamentId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('tournament_matches')
          .delete()
          .eq('tournament_id', tournamentId);

        if (error) throw error;
      } catch (err) {
        console.error("Failed to delete tournament matches in Supabase:", err);
      }
    }

    const localMatches = loadData<DbTournamentMatch[]>('gh_tournament_matches', []);
    const remaining = localMatches.filter(m => m.tournamentId !== tournamentId);
    saveData('gh_tournament_matches', remaining);
    return true;
  },

  // Tournament Results
  async getTournamentResults(tournamentId: string): Promise<TournamentResult[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tournament_results')
          .select('*')
          .eq('tournament_id', tournamentId);
        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            tournament_id: r.tournament_id,
            match_id: r.match_id,
            winner_user_id: r.winner_user_id,
            winner_team_id: r.winner_team_id,
            score: r.score,
            result_screenshot_url: r.result_screenshot_url,
            notes: r.notes,
            status: r.status || 'pending',
            created_at: r.created_at
          }));
        }
      } catch (err) {
        console.error("Supabase tournament_results fetch failed:", err);
      }
    }
    const local = loadData<TournamentResult[]>('gh_tournament_results', []);
    return local.filter(r => r.tournament_id === tournamentId);
  },

  async createOrUpdateTournamentResult(result: Omit<TournamentResult, 'id'> & { id?: string }): Promise<TournamentResult> {
    const id = result.id || 'res-' + generateUUID();
    const newResult: TournamentResult = {
      id,
      tournament_id: result.tournament_id,
      match_id: result.match_id,
      winner_user_id: result.winner_user_id || null,
      winner_team_id: result.winner_team_id || null,
      score: result.score || null,
      result_screenshot_url: result.result_screenshot_url || null,
      notes: result.notes || null,
      status: result.status || 'pending',
      created_at: result.created_at || new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('tournament_results')
          .upsert({
            id: newResult.id,
            tournament_id: newResult.tournament_id,
            match_id: newResult.match_id,
            winner_user_id: newResult.winner_user_id,
            winner_team_id: newResult.winner_team_id,
            score: newResult.score,
            result_screenshot_url: newResult.result_screenshot_url,
            notes: newResult.notes,
            status: newResult.status,
            created_at: newResult.created_at
          });
        if (error) console.warn("Supabase upsert tournament_results error:", error.message);
      } catch (err) {
        console.error("Supabase upsert tournament_results exception:", err);
      }
    }

    const localResult = loadData<TournamentResult[]>('gh_tournament_results', []);
    const existingIdx = localResult.findIndex(r => r.match_id === result.match_id || r.id === id);
    if (existingIdx !== -1) {
      localResult[existingIdx] = { ...localResult[existingIdx], ...newResult };
    } else {
      localResult.push(newResult);
    }
    saveData('gh_tournament_results', localResult);

    return newResult;
  },

  async progressTournamentWinner(
    tournamentId: string,
    completedMatch: DbTournamentMatch,
    winnerId: string,
    isSolo: boolean
  ): Promise<boolean> {
    const winnerUserId = isSolo ? winnerId : null;
    const winnerTeamId = isSolo ? null : winnerId;

    // Update match status to completed
    await this.updateMatchStatus(completedMatch.id, 'completed', winnerUserId, winnerTeamId);

    // Identify next round progression placement
    const nextRound = completedMatch.roundNumber + 1;
    const nextMatchNum = Math.ceil(completedMatch.matchNumber / 2);

    const allMatches = await this.getTournamentMatches(tournamentId);
    const nextMatch = allMatches.find(m => m.roundNumber === nextRound && m.matchNumber === nextMatchNum);

    if (nextMatch) {
      const isOddMatch = completedMatch.matchNumber % 2 !== 0;
      const updates: Partial<DbTournamentMatch> = {};

      if (isSolo) {
        if (isOddMatch) {
          updates.player1UserId = winnerId;
        } else {
          updates.player2UserId = winnerId;
        }
      } else {
        if (isOddMatch) {
          updates.team1Id = winnerId;
        } else {
          updates.team2Id = winnerId;
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const dbUpdates: any = {};
          if (updates.player1UserId !== undefined) dbUpdates.player1_user_id = updates.player1UserId;
          if (updates.player2UserId !== undefined) dbUpdates.player2_user_id = updates.player2UserId;
          if (updates.team1Id !== undefined) dbUpdates.team1_id = updates.team1Id;
          if (updates.team2Id !== undefined) dbUpdates.team2_id = updates.team2Id;

          const { error } = await supabase
            .from('tournament_matches')
            .update(dbUpdates)
            .eq('id', nextMatch.id);
          if (error) throw error;
        } catch (err) {
          console.error("Failed to progress winner in next match in Supabase:", err);
        }
      }

      const localMatches = loadData<DbTournamentMatch[]>('gh_tournament_matches', []);
      const idx = localMatches.findIndex(m => m.id === nextMatch.id);
      if (idx !== -1) {
        localMatches[idx] = {
          ...localMatches[idx],
          ...updates
        };
        saveData('gh_tournament_matches', localMatches);
      }
    }
    return true;
  },

  async getDiamondTransactions(): Promise<DiamondTransaction[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        console.log("[DEBUG LOG] Fetching all diamond transactions from Supabase...");
        const { data, error } = await supabase
          .from('diamond_transactions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("[DEBUG LOG] Supabase fetch pending/all diamond_transactions error details:", error);
          throw error;
        }
        
        if (data) {
          console.log("[DEBUG LOG] Successfully fetched diamond transactions from Supabase count:", data.length);
          return data.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            wallet_type: d.wallet_type || 'topup',
            transaction_type: d.transaction_type || 'topup_purchase',
            diamonds: Number(d.diamonds || 0),
            bonus: Number(d.bonus || 0),
            total_amount: Number(d.total_credited !== undefined ? d.total_credited : (d.total_amount !== undefined ? d.total_amount : d.diamonds)),
            total_credited: Number(d.total_credited !== undefined ? d.total_credited : d.diamonds),
            price_paid: Number(d.price_paid || 0),
            status: d.status,
            transaction_id: d.transaction_id,
            payment_screenshot_url: d.payment_screenshot_url,
            note: d.note || null,
            approved_at: d.approved_at,
            created_at: d.created_at
          }));
        }
      } catch (err) {
        console.error("Supabase diamond_transactions failed to fetch:", err);
      }
    }
    console.log("[DEBUG LOG] Falling back to local storage fetch for diamond transactions...");
    const localData = loadData<DiamondTransaction[]>('gh_diamond_transactions', []);
    return localData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createDiamondTransaction(tx: Omit<DiamondTransaction, 'id' | 'approved_at' | 'created_at'> & { approved_at?: string | null }): Promise<DiamondTransaction> {
    const id = generateUUID();
    const wallet_type = tx.wallet_type || 'topup';
    const transaction_type = tx.transaction_type || 'topup_purchase';
    const total_amount = tx.total_amount !== undefined ? tx.total_amount : (tx.diamonds + (tx.bonus || 0));
    const approved_at = tx.approved_at || (tx.status === 'approved' ? new Date().toISOString() : null);
    
    const newTx: DiamondTransaction = {
      id,
      user_id: tx.user_id,
      wallet_type,
      transaction_type,
      diamonds: tx.diamonds,
      bonus: tx.bonus || 0,
      total_amount,
      total_credited: total_amount,
      price_paid: tx.price_paid || 0,
      status: tx.status || 'pending',
      transaction_id: tx.transaction_id || null,
      payment_screenshot_url: tx.payment_screenshot_url || null,
      note: tx.note || null,
      approved_at,
      created_at: new Date().toISOString()
    };

    console.log("[DEBUG LOG] createDiamondTransaction payload build:", newTx);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id,
          user_id: tx.user_id,
          wallet_type,
          transaction_type,
          diamonds: tx.diamonds,
          bonus: tx.bonus || 0,
          total_credited: total_amount,
          price_paid: tx.price_paid || 0,
          status: tx.status || 'pending',
          transaction_id: tx.transaction_id || null,
          payment_screenshot_url: tx.payment_screenshot_url || null,
          note: tx.note || null,
          approved_at
        };
        console.log("[DEBUG LOG] Supabase insert payload:", payload);

        const { data, error } = await supabase
          .from('diamond_transactions')
          .insert(payload)
          .select();

        if (error) {
          console.error("[DEBUG LOG] Supabase insert failed error details:", error);
          throw new Error(`Diamond request save failed: [${error.message}]`);
        }

        console.log("[DEBUG LOG] Supabase insert result success:", data);
      } catch (err: any) {
        console.error("Supabase failed to insert diamond_transaction:", err);
        throw err;
      }
    }

    const current = loadData<DiamondTransaction[]>('gh_diamond_transactions', []);
    saveData('gh_diamond_transactions', [...current, newTx]);
    return newTx;
  },

  async updateDiamondTransactionStatus(txId: string, status: 'approved' | 'rejected' | 'paid'): Promise<void> {
    let transaction: DiamondTransaction | null = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('diamond_transactions').select('*').eq('id', txId).maybeSingle();
        if (error) throw error;
        if (data) {
          transaction = {
            id: data.id,
            user_id: data.user_id,
            wallet_type: data.wallet_type || 'topup',
            transaction_type: data.transaction_type || 'topup_purchase',
            diamonds: Number(data.diamonds || 0),
            bonus: Number(data.bonus || 0),
            total_amount: Number(data.total_amount !== undefined ? data.total_amount : (data.total_credited !== undefined ? data.total_credited : data.diamonds)),
            price_paid: Number(data.price_paid || 0),
            status: data.status,
            transaction_id: data.transaction_id,
            payment_screenshot_url: data.payment_screenshot_url,
            note: data.note || null,
            approved_at: data.approved_at,
            created_at: data.created_at
          };
        }
      } catch (err) {
        console.error("Failed to query transaction status from Supabase:", err);
        throw err;
      }
    }

    if (!transaction) {
      const local = loadData<DiamondTransaction[]>('gh_diamond_transactions', []);
      const item = local.find(x => x.id === txId);
      if (item) {
        transaction = item;
      }
    }

    if (!transaction) {
      throw new Error("Transaction was not found!");
    }

    if (transaction.status !== 'pending') {
      throw new Error("Transaction is already processed!");
    }

    const approvedAt = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      try {
        console.log("[DEBUG LOG] approving diamond request id:", txId);
        console.log("[DEBUG LOG] request user_id:", transaction.user_id);
        console.log("[DEBUG LOG] diamonds:", transaction.diamonds);
        console.log("[DEBUG LOG] bonus:", transaction.bonus);
        console.log("[DEBUG LOG] total_credited:", transaction.total_amount);

        const { error: txErr } = await supabase
          .from('diamond_transactions')
          .update({ status, approved_at: approvedAt })
          .eq('id', txId);
        
        if (txErr) throw txErr;

        if (status === 'approved') {
          const { data: u, error: uErr } = await supabase.from('users').select('topup_diamonds, winning_diamonds').eq('id', transaction.user_id).maybeSingle();
          if (uErr) {
            console.error("[DEBUG LOG] Supabase select user error:", uErr);
            throw uErr;
          }
          let currentTopup = 0;
          let currentWinning = 0;
          if (u) {
            currentTopup = u.topup_diamonds !== undefined && u.topup_diamonds !== null ? u.topup_diamonds : 0;
            currentWinning = u.winning_diamonds || 0;
          }

          let nextTopup = currentTopup;
          let nextWinning = currentWinning;

          if (transaction.wallet_type === 'topup') {
            nextTopup += transaction.total_amount;
          } else {
            nextWinning += transaction.total_amount;
          }

          console.log("[DEBUG LOG] target user id:", transaction.user_id);
          console.log("[DEBUG LOG] wallet type:", transaction.wallet_type);
          console.log("[DEBUG LOG] old topup_diamonds:", currentTopup);
          console.log("[DEBUG LOG] old winning_diamonds:", currentWinning);
          console.log("[DEBUG LOG] amount to add:", transaction.total_amount);
          console.log("[DEBUG LOG] update payload:", { topup_diamonds: nextTopup, winning_diamonds: nextWinning });

          const { data: updateRes, error: updateErr } = await supabase.from('users').update({
            topup_diamonds: nextTopup,
            winning_diamonds: nextWinning
          }).eq('id', transaction.user_id).select();

          if (updateErr) {
            console.error("[DEBUG LOG] Supabase update user error:", updateErr);
            throw updateErr;
          }
          console.log("[DEBUG LOG] Supabase update result:", updateRes);
        }
      } catch (err: any) {
        console.error("Supabase failed updating transaction status:", err);
        throw err;
      }
    }

    const local = loadData<DiamondTransaction[]>('gh_diamond_transactions', []);
    const updatedLocal = local.map(x => {
      if (x.id === txId) {
        return { ...x, status, approved_at: approvedAt };
      }
      return x;
    });
    saveData('gh_diamond_transactions', updatedLocal);

    if (status === 'approved') {
      const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
      const updatedUsers = localUsers.map(u => {
        if (u.id === transaction!.user_id) {
          const legacyDiamonds = u.diamonds || 0;
          const currentTopup = u.topup_diamonds !== undefined ? u.topup_diamonds : legacyDiamonds;
          const currentWinning = u.winning_diamonds || 0;

          let nextTopup = currentTopup;
          let nextWinning = currentWinning;

          if (transaction!.wallet_type === 'topup') {
            nextTopup += transaction!.total_amount;
          } else {
            nextWinning += transaction!.total_amount;
          }

          return {
            ...u,
            topup_diamonds: nextTopup,
            winning_diamonds: nextWinning,
            diamonds: nextTopup + nextWinning
          };
        }
        return u;
      });
      saveData('gh_users', updatedUsers);
    }
  },

  async adjustDiamondsManually(userId: string, amount: number, wallet_type: 'topup' | 'winning' = 'topup', reason: string = 'Manual Adjustment'): Promise<void> {
    let currentTopup = 0;
    let currentWinning = 0;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: u, error: uErr } = await supabase.from('users').select('topup_diamonds, winning_diamonds').eq('id', userId).maybeSingle();
        if (uErr) {
          console.error("[DEBUG LOG] failed to read user for manual adjustment:", uErr);
          throw uErr;
        }
        if (u) {
          currentTopup = u.topup_diamonds !== undefined && u.topup_diamonds !== null ? u.topup_diamonds : 0;
          currentWinning = u.winning_diamonds || 0;
        }
      } catch (err) {
        console.error("Supabase failed to read user current balances:", err);
        throw err;
      }
    } else {
      const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
      const u = localUsers.find(x => x.id === userId);
      if (u) {
        currentTopup = u.topup_diamonds !== undefined ? u.topup_diamonds : 0;
        currentWinning = u.winning_diamonds || 0;
      }
    }

    let nextTopup = currentTopup;
    let nextWinning = currentWinning;

    if (wallet_type === 'topup') {
      nextTopup += amount;
    } else {
      nextWinning += amount;
    }

    const nextLegacy = nextTopup + nextWinning;

    console.log("[DEBUG LOG] target user id:", userId);
    console.log("[DEBUG LOG] wallet type:", wallet_type);
    console.log("[DEBUG LOG] old topup_diamonds:", currentTopup);
    console.log("[DEBUG LOG] old winning_diamonds:", currentWinning);
    console.log("[DEBUG LOG] amount to add:", amount);
    console.log("[DEBUG LOG] update payload:", { topup_diamonds: nextTopup, winning_diamonds: nextWinning });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: adjustErr } = await supabase.from('users').update({
          topup_diamonds: nextTopup,
          winning_diamonds: nextWinning
        }).eq('id', userId);
        
        if (adjustErr) {
          console.error("[DEBUG LOG] Supabase manual adjustment error:", adjustErr);
          throw adjustErr;
        }
      } catch (err: any) {
        console.error("Supabase manual adjustment failed:", err);
        throw err;
      }
    }

    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updatedUsers = localUsers.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          topup_diamonds: nextTopup,
          winning_diamonds: nextWinning,
          diamonds: nextLegacy
        };
      }
      return u;
    });
    saveData('gh_users', updatedUsers);

    await this.createDiamondTransaction({
      user_id: userId,
      wallet_type,
      transaction_type: 'manual_credit',
      diamonds: amount,
      bonus: 0,
      total_amount: amount,
      price_paid: 0,
      status: 'approved',
      transaction_id: `manual-${Date.now()}`,
      payment_screenshot_url: null,
      note: reason || 'Admin Manual Balance Adjustment'
    });

    console.log("[DEBUG LOG] manual credit result success: wallet_type =", wallet_type, "new topup =", nextTopup, "new winning =", nextWinning, "new legacy =", nextLegacy);
  },

  async getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('withdrawal_requests').select('*');
        if (error) throw error;
        if (data) {
          return data.map((w: any) => ({
            id: w.id,
            user_id: w.user_id,
            amount: Number(w.amount),
            upi_id: w.upi_id,
            qr_url: w.qr_url,
            account_holder_name: w.account_holder_name,
            phone: w.phone,
            note: w.note,
            status: w.status,
            admin_note: w.admin_note,
            created_at: w.created_at,
            approved_at: w.approved_at,
            paid_at: w.paid_at
          }));
        }
      } catch (err) {
        console.error("Supabase failed fetching withdrawal requests:", err);
      }
    }
    return loadData<WithdrawalRequest[]>('gh_withdrawal_requests', []);
  },

  async createWithdrawalRequest(req: Omit<WithdrawalRequest, 'id' | 'status' | 'approved_at' | 'paid_at' | 'created_at' | 'admin_note'>): Promise<WithdrawalRequest> {
    const id = `wr-${Date.now()}`;
    const newReq: WithdrawalRequest = {
      ...req,
      id,
      status: 'pending',
      admin_note: null,
      created_at: new Date().toISOString(),
      approved_at: null,
      paid_at: null
    };

    let currentWinning = 0;
    let currentLocked = 0;
    let currentTopup = 0;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: u, error: uErr } = await supabase.from('users').select('topup_diamonds, winning_diamonds, locked_withdraw_diamonds').eq('id', req.user_id).maybeSingle();
        if (!uErr && u) {
          currentTopup = u.topup_diamonds || 0;
          currentWinning = u.winning_diamonds || 0;
          currentLocked = u.locked_withdraw_diamonds || 0;
        }
      } catch (err) {
        console.error("Failed to fetch user in createWithdrawalRequest:", err);
      }
    } else {
      const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
      const u = localUsers.find(x => x.id === req.user_id);
      if (u) {
        currentTopup = u.topup_diamonds || 0;
        currentWinning = u.winning_diamonds || 0;
        currentLocked = u.locked_withdraw_diamonds || 0;
      }
    }

    const available = currentWinning - currentLocked;
    if (req.amount > available) {
      throw new Error(`Insufficient available winning balance! Required: ${req.amount}, Available: ${available}`);
    }

    const nextLocked = currentLocked + req.amount;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('withdrawal_requests').insert({
          id,
          user_id: req.user_id,
          amount: req.amount,
          upi_id: req.upi_id,
          qr_url: req.qr_url,
          account_holder_name: req.account_holder_name,
          phone: req.phone,
          note: req.note,
          status: 'pending'
        });

        await supabase.from('users').update({
          locked_withdraw_diamonds: nextLocked
        }).eq('id', req.user_id);
      } catch (err) {
        console.error("Supabase failed to insert withdrawal request or update locked balance:", err);
      }
    }

    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updatedUsers = localUsers.map(u => {
      if (u.id === req.user_id) {
        return {
          ...u,
          locked_withdraw_diamonds: nextLocked,
          diamonds: currentTopup + (u.winning_diamonds || 0)
        };
      }
      return u;
    });
    saveData('gh_users', updatedUsers);

    const current = loadData<WithdrawalRequest[]>('gh_withdrawal_requests', []);
    saveData('gh_withdrawal_requests', [...current, newReq]);

    await this.createDiamondTransaction({
      user_id: req.user_id,
      wallet_type: 'winning',
      transaction_type: 'withdraw_request',
      diamonds: req.amount,
      bonus: 0,
      total_amount: -req.amount,
      price_paid: 0,
      status: 'pending',
      transaction_id: id,
      payment_screenshot_url: null,
      note: `Filed withdrawal request for ₹${req.amount}`
    });

    return newReq;
  },

  async updateWithdrawalRequestStatus(reqId: string, status: 'approved' | 'rejected' | 'paid', adminNote: string | null = null): Promise<void> {
    let req: WithdrawalRequest | null = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('withdrawal_requests').select('*').eq('id', reqId).maybeSingle();
        if (!error && data) {
          req = {
            id: data.id,
            user_id: data.user_id,
            amount: Number(data.amount),
            upi_id: data.upi_id,
            qr_url: data.qr_url,
            account_holder_name: data.account_holder_name,
            phone: data.phone,
            note: data.note,
            status: data.status,
            admin_note: data.admin_note,
            created_at: data.created_at,
            approved_at: data.approved_at,
            paid_at: data.paid_at
          };
        }
      } catch (err) {}
    }

    if (!req) {
      const local = loadData<WithdrawalRequest[]>('gh_withdrawal_requests', []);
      const item = local.find(x => x.id === reqId);
      if (item) req = item;
    }

    if (!req) {
      throw new Error("Withdrawal request not found!");
    }

    if (req.status === 'paid' || req.status === 'rejected') {
      throw new Error("Withdrawal request is already paid or rejected!");
    }

    const nowStr = new Date().toISOString();
    const updates: any = { status, admin_note: adminNote };
    if (status === 'approved') updates.approved_at = nowStr;
    if (status === 'paid') updates.paid_at = nowStr;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('withdrawal_requests').update(updates).eq('id', reqId);

        if (status === 'paid') {
          const { data: u, error: uErr } = await supabase.from('users').select('topup_diamonds, winning_diamonds, locked_withdraw_diamonds').eq('id', req.user_id).maybeSingle();
          if (!uErr && u) {
            const currentWinning = u.winning_diamonds || 0;
            const currentLocked = u.locked_withdraw_diamonds || 0;
            const nextWinning = Math.max(0, currentWinning - req!.amount);
            const nextLocked = Math.max(0, currentLocked - req!.amount);

            await supabase.from('users').update({
              winning_diamonds: nextWinning,
              locked_withdraw_diamonds: nextLocked
            }).eq('id', req!.user_id);
          }
        } else if (status === 'rejected') {
          const { data: u, error: uErr } = await supabase.from('users').select('locked_withdraw_diamonds').eq('id', req.user_id).maybeSingle();
          if (!uErr && u) {
            const currentLocked = u.locked_withdraw_diamonds || 0;
            const nextLocked = Math.max(0, currentLocked - req!.amount);

            await supabase.from('users').update({
              locked_withdraw_diamonds: nextLocked
            }).eq('id', req!.user_id);
          }
        }
      } catch (err) {
        console.error("Supabase update withdrawal status failed:", err);
      }
    }

    const local = loadData<WithdrawalRequest[]>('gh_withdrawal_requests', []);
    const updatedLocal = local.map(x => {
      if (x.id === reqId) {
        return {
          ...x,
          status,
          admin_note: adminNote,
          approved_at: status === 'approved' ? nowStr : x.approved_at,
          paid_at: status === 'paid' ? nowStr : x.paid_at
        };
      }
      return x;
    });
    saveData('gh_withdrawal_requests', updatedLocal);

    if (status === 'paid') {
      const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
      const updatedUsers = localUsers.map(u => {
        if (u.id === req!.user_id) {
          const legacyDiamonds = u.diamonds || 0;
          const currentTopup = u.topup_diamonds !== undefined ? u.topup_diamonds : legacyDiamonds;
          const currentWinning = u.winning_diamonds || 0;
          const currentLocked = u.locked_withdraw_diamonds || 0;
          const nextWinning = Math.max(0, currentWinning - req!.amount);
          const nextLocked = Math.max(0, currentLocked - req!.amount);
          
          return {
            ...u,
            winning_diamonds: nextWinning,
            locked_withdraw_diamonds: nextLocked,
            diamonds: currentTopup + nextWinning
          };
        }
        return u;
      });
      saveData('gh_users', updatedUsers);

      await this.createDiamondTransaction({
        user_id: req!.user_id,
        wallet_type: 'winning',
        transaction_type: 'withdraw_paid',
        diamonds: req!.amount,
        bonus: 0,
        total_amount: -req!.amount,
        price_paid: 0,
        status: 'approved',
        transaction_id: req!.id,
        payment_screenshot_url: null,
        note: `Withdrawal successfully paid to UPI: ${req!.upi_id}`
      });
    } else if (status === 'rejected') {
      const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
      const updatedUsers = localUsers.map(u => {
        if (u.id === req!.user_id) {
          const currentLocked = u.locked_withdraw_diamonds || 0;
          const nextLocked = Math.max(0, currentLocked - req!.amount);
          return {
            ...u,
            locked_withdraw_diamonds: nextLocked
          };
        }
        return u;
      });
      saveData('gh_users', updatedUsers);
      // No refund transaction is added per Part 3 specification
    }
  },

  async transferTopupToWinning(userId: string, amount: number): Promise<void> {
    if (amount < 1500) {
      throw new Error("Minimum transfer is 1500 Diamonds.");
    }

    let topup = 0;
    let winning = 0;

    if (isSupabaseConfigured && supabase) {
      const { data: u, error } = await supabase
        .from('users')
        .select('topup_diamonds, winning_diamonds')
        .eq('id', userId)
        .maybeSingle();
      if (!error && u) {
        topup = u.topup_diamonds || 0;
        winning = u.winning_diamonds || 0;
      }
    } else {
      const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
      const user = localUsers.find(x => x.id === userId);
      if (user) {
        topup = user.topup_diamonds || 0;
        winning = user.winning_diamonds || 0;
      }
    }

    if (topup < amount) {
      throw new Error(`Insufficient Top-up balance to transfer. Available: ${topup}, Required: ${amount}`);
    }

    const nextTopup = topup - amount;
    const nextWinning = winning + amount;

    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').update({
        topup_diamonds: nextTopup,
        winning_diamonds: nextWinning
      }).eq('id', userId);
    }

    // fallback localStorage
    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updatedUsers = localUsers.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          topup_diamonds: nextTopup,
          winning_diamonds: nextWinning,
          diamonds: nextTopup + nextWinning
        };
      }
      return u;
    });
    saveData('gh_users', updatedUsers);

    // Insert transaction
    await this.createDiamondTransaction({
      user_id: userId,
      wallet_type: 'topup',
      transaction_type: 'topup_to_winning',
      diamonds: amount,
      bonus: 0,
      total_amount: -amount,
      price_paid: 0,
      status: 'approved',
      transaction_id: `transfer-${Date.now()}`,
      payment_screenshot_url: null,
      note: `Transferred ${amount} Top-up Diamonds to Winning Vault`
    });

    await this.createDiamondTransaction({
      user_id: userId,
      wallet_type: 'winning',
      transaction_type: 'topup_to_winning',
      diamonds: amount,
      bonus: 0,
      total_amount: amount,
      price_paid: 0,
      status: 'approved',
      transaction_id: `transfer-${Date.now()}-win`,
      payment_screenshot_url: null,
      note: `Received ${amount} Diamonds from Top-up Transfer`
    });
  },

  async claimTrial(userId: string, plan: 'Gold' | 'Platinum'): Promise<UserProfile> {
    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const u = localUsers.find(x => x.id === userId);
    if (!u) {
      throw new Error("User profile not found.");
    }
    if (u.trial_used) {
      throw new Error("You have already used your 7-day premium trial.");
    }

    const topup = u.topup_diamonds || 0;
    if (topup < 5) {
      throw new Error("7-day trial requires 5 Top-up Diamonds in your wallet. Please buy 5 diamonds or more first.");
    }

    const nextTopup = topup - 5;
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const trial_start = now.toISOString();
    const trial_end = expiryDate.toISOString();

    const updatedProfile: Partial<UserProfile> = {
      membership: plan,
      membershipStatus: 'active',
      membershipExpires: trial_end,
      topup_diamonds: nextTopup,
      trial_used: true,
      trial_start,
      trial_end
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('users').update({
          topup_diamonds: nextTopup,
          membership: plan
        }).eq('id', userId);

        await supabase.from('gamer_profiles').update({
          membership_status: 'active',
          membership_expires: trial_end,
          trial_used: true,
          trial_start,
          trial_end
        }).eq('user_id', userId);
      } catch (err) {
        console.error("Supabase claimTrial failed:", err);
      }
    }

    const updatedUsers = localUsers.map(x => {
      if (x.id === userId) {
        return {
          ...x,
          ...updatedProfile,
          diamonds: nextTopup + (x.winning_diamonds || 0)
        };
      }
      return x;
    });
    saveData('gh_users', updatedUsers);

    await this.createDiamondTransaction({
      user_id: userId,
      wallet_type: 'topup',
      transaction_type: 'topup_purchase',
      diamonds: 5,
      bonus: 0,
      total_amount: -5,
      price_paid: 5,
      status: 'approved',
      transaction_id: `trial-${plan.toLowerCase()}-${Date.now()}`,
      payment_screenshot_url: null,
      note: `Activated 7-Day trial of ${plan} Membership (Cost: 5 Diamonds)`
    });

    const refreshed = updatedUsers.find(x => x.id === userId)!;
    return refreshed;
  },

  async claimTrialWithPaymentProof(userId: string, plan: 'Gold' | 'Platinum', transactionId: string, screenshotUrl: string | null): Promise<void> {
    const newPayment: DbPayment = {
      id: `p-${Date.now()}`,
      userId,
      userEmail: '',
      plan: plan,
      amount: 5,
      transactionId,
      status: 'pending',
      screenshotUrl: screenshotUrl || undefined,
      couponApplied: '7-DAY-TRIAL',
      createdAt: new Date().toISOString()
    };

    const currentPays = loadData<DbPayment[]>('gh_payments_log', []);
    saveData('gh_payments_log', [...currentPays, newPayment]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('payments').insert({
          id: newPayment.id,
          user_id: userId,
          plan: plan,
          amount: 5,
          transaction_id: transactionId,
          status: 'pending',
          screenshot_url: screenshotUrl,
          coupon_applied: '7-DAY-TRIAL'
        });
      } catch (err) {
        console.error("Supabase insert pending trial payment failed:", err);
      }
    }
  },

  async getSubscriptionCancellations(): Promise<SubscriptionCancellationRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('subscription_cancellations').select('*');
        if (!error && data) {
          return data.map((x: any) => ({
            id: x.id,
            user_id: x.user_id,
            user_email: x.user_email || '',
            plan: x.plan || 'Silver',
            upi_id: x.upi_id || '',
            qr_url: x.qr_url,
            reason: x.reason || '',
            status: x.status || 'pending',
            admin_note: x.admin_note || '',
            created_at: x.created_at
          }));
        }
      } catch (e) {}
    }
    return loadData<SubscriptionCancellationRequest[]>('gh_subscription_cancellations', []);
  },

  async createSubscriptionCancellation(req: Omit<SubscriptionCancellationRequest, 'id' | 'status' | 'created_at' | 'admin_note'>): Promise<SubscriptionCancellationRequest> {
    const id = `sc-${Date.now()}`;
    const newReq: SubscriptionCancellationRequest = {
      ...req,
      id,
      status: 'pending',
      admin_note: null,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('subscription_cancellations').insert({
          id,
          user_id: req.user_id,
          user_email: req.user_email,
          plan: req.plan,
          upi_id: req.upi_id,
          qr_url: req.qr_url,
          reason: req.reason,
          status: 'pending'
        });
      } catch (err) {
        console.error("Supabase subscription cancellation insertion failed:", err);
      }
    }

    const currentLocal = loadData<SubscriptionCancellationRequest[]>('gh_subscription_cancellations', []);
    saveData('gh_subscription_cancellations', [...currentLocal, newReq]);

    return newReq;
  },

  async updateSubscriptionCancellationStatus(reqId: string, status: 'approved' | 'rejected', adminNote: string | null): Promise<void> {
    const local = loadData<SubscriptionCancellationRequest[]>('gh_subscription_cancellations', []);
    const requestItem = local.find(x => x.id === reqId);
    if (!requestItem) {
      throw new Error("Cancellation request not found.");
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('subscription_cancellations').update({
          status,
          admin_note: adminNote
        }).eq('id', reqId);
      } catch (e) {
        console.error("Supabase failed to update subscription cancellation status:", e);
      }
    }

    const updatedLocal = local.map(x => {
      if (x.id === reqId) {
        return { ...x, status, admin_note: adminNote };
      }
      return x;
    });
    saveData('gh_subscription_cancellations', updatedLocal);

    if (status === 'approved') {
      await this.updateProfile(requestItem.user_id, {
        membership: 'Free',
        membershipStatus: 'none',
        membershipExpires: undefined,
        isFeatured: false,
        featuredUntil: undefined,
        activeFrame: undefined,
        activeBanner: undefined,
        activeSticker: undefined
      });

      await this.addNotification({
        userId: requestItem.user_id,
        title: "Subscription Cancelled ❌",
        message: "Your premium subscription has been cancelled per request. Premium status is revoked. Keep gaming!",
        type: 'alert'
      });
    }
  },

  // ==========================================
  // SPONSOR MARKETPLACE & ANALYTICS METHODS
  // ==========================================
  async getSponsorBrands(): Promise<Sponsor[]> {
    const defaultSponsors: Sponsor[] = [
      {
        id: "sp-1",
        company_name: "Intel Core Esports Division",
        logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80",
        website_url: "https://www.intel.com",
        banner_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
        description: "Empowering athletes with high-end desktop gaming processor rigs.",
        active: true,
        start_date: "2026-01-01",
        end_date: "2026-12-31",
        created_at: new Date().toISOString(),
        views: 1420,
        clicks: 185
      },
      {
        id: "sp-2",
        company_name: "RedBull Gaming Academy",
        logo_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80",
        website_url: "https://www.redbull.com",
        banner_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
        description: "Fueling gaming performance across verified global bootcamps.",
        active: true,
        start_date: "2026-02-01",
        end_date: "2026-11-30",
        created_at: new Date().toISOString(),
        views: 950,
        clicks: 120
      },
      {
        id: "sp-3",
        company_name: "Asus ROG Elite Labs",
        logo_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80",
        website_url: "https://rog.asus.com",
        banner_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
        description: "Extreme gaming notebooks, mechanics, and peripherals designed for esports elites.",
        active: true,
        start_date: "2026-03-01",
        end_date: "2026-12-25",
        created_at: new Date().toISOString(),
        views: 820,
        clicks: 98
      }
    ];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('sponsors').select('*');
        if (!error && data && data.length > 0) {
          return data.map((s: any) => ({
            id: s.id,
            company_name: s.company_name,
            logo_url: s.logo_url || '',
            website_url: s.website_url || '',
            banner_url: s.banner_url || '',
            description: s.description || '',
            active: s.active !== undefined ? s.active : true,
            start_date: s.start_date || '',
            end_date: s.end_date || '',
            created_at: s.created_at || '',
            views: s.views || 0,
            clicks: s.clicks || 0
          }));
        }
      } catch (err) {
        console.error("Failed to load sponsors from Supabase, loading local:", err);
      }
    }

    const local = loadData<Sponsor[]>('gh_sponsors_marketplace', []);
    if (local.length === 0) {
      saveData('gh_sponsors_marketplace', defaultSponsors);
      return defaultSponsors;
    }
    return local;
  },

  async createSponsor(sponsor: Omit<Sponsor, 'id' | 'created_at'>): Promise<Sponsor> {
    const id = `sp-${Date.now()}`;
    const newSponsor: Sponsor = {
      ...sponsor,
      id,
      created_at: new Date().toISOString(),
      views: 0,
      clicks: 0
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('sponsors').insert({
          id,
          company_name: sponsor.company_name,
          logo_url: sponsor.logo_url,
          website_url: sponsor.website_url,
          banner_url: sponsor.banner_url,
          description: sponsor.description,
          active: sponsor.active,
          start_date: sponsor.start_date || null,
          end_date: sponsor.end_date || null,
          views: 0
        });
      } catch (err) {
        console.error("Failed to insert sponsor to Supabase:", err);
      }
    }

    const local = loadData<Sponsor[]>('gh_sponsors_marketplace', []);
    saveData('gh_sponsors_marketplace', [...local, newSponsor]);
    return newSponsor;
  },

  async updateSponsor(sponsorId: string, updates: Partial<Sponsor>): Promise<Sponsor> {
    const local = loadData<Sponsor[]>('gh_sponsors_marketplace', []);
    const existing = local.find(s => s.id === sponsorId);
    if (!existing) {
      throw new Error(`Sponsor with ID ${sponsorId} not found.`);
    }

    const updated: Sponsor = {
      ...existing,
      ...updates
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.company_name !== undefined) dbUpdates.company_name = updates.company_name;
        if (updates.logo_url !== undefined) dbUpdates.logo_url = updates.logo_url;
        if (updates.website_url !== undefined) dbUpdates.website_url = updates.website_url;
        if (updates.banner_url !== undefined) dbUpdates.banner_url = updates.banner_url;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.active !== undefined) dbUpdates.active = updates.active;
        if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date || null;
        if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date || null;
        if (updates.views !== undefined) dbUpdates.views = updates.views;
        if (updates.clicks !== undefined) dbUpdates.clicks = updates.clicks;

        await supabase.from('sponsors').update(dbUpdates).eq('id', sponsorId);
      } catch (err) {
        console.error("Failed to update sponsor in Supabase:", err);
      }
    }

    const updatedLocal = local.map(s => {
      if (s.id === sponsorId) return updated;
      return s;
    });
    saveData('gh_sponsors_marketplace', updatedLocal);
    return updated;
  },

  async deleteSponsor(sponsorId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('sponsors').delete().eq('id', sponsorId);
      } catch (err) {
        console.error("Failed to delete sponsor from Supabase:", err);
      }
    }

    const local = loadData<Sponsor[]>('gh_sponsors_marketplace', []);
    const filtered = local.filter(s => s.id !== sponsorId);
    saveData('gh_sponsors_marketplace', filtered);
  },

  async recordSponsorView(sponsorId: string): Promise<void> {
    const local = loadData<Sponsor[]>('gh_sponsors_marketplace', []);
    const existing = local.find(s => s.id === sponsorId);
    if (existing) {
      existing.views = (existing.views || 0) + 1;
      saveData('gh_sponsors_marketplace', local);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('sponsors').update({ views: existing.views }).eq('id', sponsorId);
        } catch (e) {}
      }
    }
  },

  async recordSponsorClick(sponsorId: string, userId: string | null): Promise<void> {
    const local = loadData<Sponsor[]>('gh_sponsors_marketplace', []);
    const existing = local.find(s => s.id === sponsorId);
    if (existing) {
      existing.clicks = (existing.clicks || 0) + 1;
      saveData('gh_sponsors_marketplace', local);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('sponsors').update({ clicks: existing.clicks }).eq('id', sponsorId);
          await supabase.from('sponsor_clicks').insert({
            sponsor_id: sponsorId,
            user_id: userId,
            clicked_at: new Date().toISOString()
          });
        } catch (e) {
          console.error("Failed to record sponsor click in Supabase:", e);
        }
      }
    }

    const clicksLocal = loadData<SponsorClick[]>('gh_sponsor_clicks', []);
    clicksLocal.push({
      id: `clk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sponsor_id: sponsorId,
      user_id: userId,
      clicked_at: new Date().toISOString()
    });
    saveData('gh_sponsor_clicks', clicksLocal);
  },

  async getSponsorClicks(): Promise<SponsorClick[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('sponsor_clicks').select('*');
        if (!error && data) {
          return data;
        }
      } catch (err) {}
    }
    return loadData<SponsorClick[]>('gh_sponsor_clicks', []);
  },

  async registerReferral(referredUserId: string, referralCode: string): Promise<boolean> {
    if (!referralCode) return false;
    const cleanCode = referralCode.trim().toUpperCase();
    
    // Find who owns the code
    let referrer: UserProfile | null = null;
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof, error } = await supabase
          .from('gamer_profiles')
          .select('user_id')
          .eq('referral_code', cleanCode)
          .maybeSingle();
        if (prof && prof.user_id) {
          referrer = await this.getUserProfileById(prof.user_id);
        }
      } catch (err) {
        console.error("Error finding referrer in DB:", err);
      }
    }
    
    if (!referrer) {
      const users = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
      const found = users.find(u => u.referralCode?.toUpperCase() === cleanCode);
      if (found) referrer = found;
    }
    
    if (!referrer) {
      console.warn("Referrer code not found in any profile.");
      return false;
    }
    
    // Prevent self-referral
    if (referrer.id === referredUserId) {
      console.warn("Self-referral is forbidden.");
      return false;
    }
    
    // Check if duplicate referral already registered for this referred user
    let alreadyReferred = false;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_user_id', referredUserId)
          .maybeSingle();
        if (data) alreadyReferred = true;
      } catch (e) {
        console.error("Error checking referrals duplicate in DB:", e);
      }
    } else {
      const referrals = loadData<any[]>('gh_referrals', []);
      alreadyReferred = referrals.some(r => r.referred_user_id === referredUserId);
    }
    
    if (alreadyReferred) {
      console.warn("Referral already registered for this user.");
      return false;
    }
    
    // Link new user's profile
    await this.updateProfile(referredUserId, {
      referredBy: referrer.id,
      referredByCode: cleanCode,
      referred_by_code: cleanCode
    });
    
    // Create referral log
    const refId = generateUUID();
    const newRef = {
      id: refId,
      referrer_user_id: referrer.id,
      referred_user_id: referredUserId,
      referral_code: cleanCode,
      reward_status: 'pending' as const,
      inviter_reward_diamonds: 50,
      referred_reward_diamonds: 20,
      created_at: new Date().toISOString()
    };
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('referrals')
          .insert([newRef]);
        if (error) {
          console.error("Failed to insert referral row in DB:", error);
        }
      } catch (err) {
        console.error("Database referral log insert failed:", err);
      }
    }
    
    // Save to local storage anyway for synchronization
    const referrals = loadData<any[]>('gh_referrals', []);
    referrals.push(newRef);
    saveData('gh_referrals', referrals);
    
    return true;
  },

  async processReferralRewardsOnMembership(userId: string): Promise<void> {
    console.log(`[Referral Rewarder] Checking referral status for user id: ${userId}`);
    let pendingRef: Referral | null = null;
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('referrals')
          .select('*')
          .eq('referred_user_id', userId)
          .eq('reward_status', 'pending')
          .maybeSingle();
        if (data) {
          pendingRef = {
            id: data.id,
            referrer_user_id: data.referrer_user_id,
            referred_user_id: data.referred_user_id,
            referral_code: data.referral_code,
            reward_status: data.reward_status,
            inviter_reward_diamonds: Number(data.inviter_reward_diamonds || 50),
            referred_reward_diamonds: Number(data.referred_reward_diamonds || 20),
            created_at: data.created_at,
            rewarded_at: data.rewarded_at
          };
        }
      } catch (err) {
        console.error("Error finding pending referral in database:", err);
      }
    }
    
    if (!pendingRef) {
      const refs = loadData<Referral[]>('gh_referrals', []);
      const ref = refs.find(r => r.referred_user_id === userId && r.reward_status === 'pending');
      if (ref) pendingRef = ref;
    }
    
    if (!pendingRef) {
      console.log(`[Referral Rewarder] User ${userId} is not part of a pending referral.`);
      return;
    }
    
    const referrerId = pendingRef.referrer_user_id;
    const inviterBonus = pendingRef.inviter_reward_diamonds || 50;
    const referredBonus = pendingRef.referred_reward_diamonds || 20;
    
    console.log(`[Referral Rewarder] Referral found! Inviter: ${referrerId} (+${inviterBonus} winning), New User: ${userId} (+${referredBonus} topup)`);
    
    const rewardedAt = new Date().toISOString();
    
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('referrals')
          .update({
            reward_status: 'rewarded',
            rewarded_at: rewardedAt
          })
          .eq('id', pendingRef.id);
        
        const { data: refUser } = await supabase.from('users').select('winning_diamonds').eq('id', referrerId).maybeSingle();
        const currentRefWin = refUser ? Number(refUser.winning_diamonds || 0) : 0;
        await supabase.from('users').update({ winning_diamonds: currentRefWin + inviterBonus }).eq('id', referrerId);
        
        const { data: refdUser } = await supabase.from('users').select('topup_diamonds').eq('id', userId).maybeSingle();
        const currentRefdTop = refdUser ? Number(refdUser.topup_diamonds || 0) : 0;
        await supabase.from('users').update({ topup_diamonds: currentRefdTop + referredBonus }).eq('id', userId);
      } catch (err) {
        console.error("[Referral Rewarder] Error updating reward state in database:", err);
      }
    }
    
    const localUsers = loadData<UserProfile[]>('gh_users', INITIAL_USERS);
    const updatedUsers = localUsers.map(u => {
      if (u.id === referrerId) {
        const nextWin = (u.winning_diamonds || 0) + inviterBonus;
        return {
          ...u,
          winning_diamonds: nextWin,
          diamonds: (u.topup_diamonds || 0) + nextWin
        };
      }
      if (u.id === userId) {
        const nextTop = (u.topup_diamonds || 0) + referredBonus;
        return {
          ...u,
          topup_diamonds: nextTop,
          diamonds: nextTop + (u.winning_diamonds || 0)
        };
      }
      return u;
    });
    saveData('gh_users', updatedUsers);
    
    const localRefs = loadData<Referral[]>('gh_referrals', []);
    const updatedRefs = localRefs.map(r => r.id === pendingRef!.id ? { ...r, reward_status: 'rewarded' as const, rewarded_at: rewardedAt } : r);
    saveData('gh_referrals', updatedRefs);
    
    await this.createDiamondTransaction({
      user_id: referrerId,
      wallet_type: 'winning',
      transaction_type: 'referral_reward' as any,
      diamonds: inviterBonus,
      bonus: 0,
      total_amount: 0,
      price_paid: 0,
      status: 'approved',
      transaction_id: 'REF-INV-' + pendingRef.id.slice(0, 8).toUpperCase(),
      payment_screenshot_url: null,
      note: 'Referral reward for inviting user profile ' + userId
    });
    
    await this.createDiamondTransaction({
      user_id: userId,
      wallet_type: 'topup',
      transaction_type: 'referral_signup_bonus' as any,
      diamonds: referredBonus,
      bonus: 0,
      total_amount: 0,
      price_paid: 0,
      status: 'approved',
      transaction_id: 'REF-NEW-' + pendingRef.id.slice(0, 8).toUpperCase(),
      payment_screenshot_url: null,
      note: 'Referral signup reward using code ' + pendingRef.referral_code
    });
    
    console.log("[Referral Rewarder] Diamond transactions logged and balances successfully credited!");
  },

  async validatePromoCode(
    code: string,
    userId: string,
    context: 'membership' | 'diamond_purchase' | 'tournament_entry',
    originalAmount: number
  ): Promise<{ isValid: boolean; message: string; discountAmount: number; finalAmount: number; promo?: PromoCode }> {
    const cleanCode = code.trim().toUpperCase();
    let promos: PromoCode[] = [];
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('promo_codes').select('*');
        if (data) {
          promos = data.map(d => ({
            id: d.id,
            code: d.code,
            discount_type: d.discount_type,
            discount_value: Number(d.discount_value),
            applies_to: d.applies_to,
            usage_limit: Number(d.usage_limit || 0),
            used_count: Number(d.used_count || 0),
            active: d.active,
            start_date: d.start_date,
            end_date: d.end_date,
            created_at: d.created_at
          }));
        }
      } catch (err) {
        console.error("Error reading db promo codes:", err);
      }
    }
    
    const localPromos = loadData<PromoCode[]>('gh_promo_codes', []);
    if (promos.length === 0) {
      promos = localPromos;
    }
    
    const promo = promos.find(p => p.code.toUpperCase() === cleanCode);
    if (!promo) {
      return { isValid: false, message: "Invalid promo code.", discountAmount: 0, finalAmount: originalAmount };
    }
    
    if (!promo.active) {
      return { isValid: false, message: "This promo code is currently inactive.", discountAmount: 0, finalAmount: originalAmount };
    }
    
    const nowStr = new Date().toISOString().split('T')[0];
    if (promo.start_date && nowStr < promo.start_date) {
      return { isValid: false, message: "This promo campaign has not started yet.", discountAmount: 0, finalAmount: originalAmount };
    }
    if (promo.end_date && nowStr > promo.end_date) {
      return { isValid: false, message: "This promo code has expired.", discountAmount: 0, finalAmount: originalAmount };
    }
    
    if (promo.used_count >= promo.usage_limit) {
      return { isValid: false, message: "Usage limit reached for this promo code.", discountAmount: 0, finalAmount: originalAmount };
    }
    
    if (promo.applies_to !== 'all' && promo.applies_to !== context) {
      return { isValid: false, message: `This promo cannot be applied to ${context.replace('_', ' ')}.`, discountAmount: 0, finalAmount: originalAmount };
    }
    
    let discount = 0;
    if (promo.discount_type === 'flat') {
      discount = promo.discount_value;
    } else {
      discount = Math.floor((originalAmount * promo.discount_value) / 100);
    }
    
    if (discount < 0) discount = 0;
    const finalAmount = Math.max(0, originalAmount - discount);
    
    return {
      isValid: true,
      message: `Success! Applicable discount of ₹${discount} is verified.`,
      discountAmount: discount,
      finalAmount,
      promo
    };
  },

  async executePromoUsage(
    code: string,
    userId: string,
    context: 'membership' | 'diamond_purchase' | 'tournament_entry',
    originalAmount: number
  ): Promise<{ status: 'success' | 'failed'; discountAmount: number; finalAmount: number }> {
    const valResult = await this.validatePromoCode(code, userId, context, originalAmount);
    if (!valResult.isValid || !valResult.promo) {
      return { status: 'failed', discountAmount: 0, finalAmount: originalAmount };
    }
    
    const promo = valResult.promo;
    const nextUsedCount = promo.used_count + 1;
    
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('promo_codes')
          .update({ used_count: nextUsedCount })
          .eq('id', promo.id);
      } catch (err) {
        console.error("DB fail updating promo count:", err);
      }
    }
    
    const localPromos = loadData<PromoCode[]>('gh_promo_codes', []);
    const updatedLocalPromos = localPromos.map(p => p.id === promo.id ? { ...p, used_count: nextUsedCount } : p);
    saveData('gh_promo_codes', updatedLocalPromos);
    
    const usageId = generateUUID();
    const newUsage: PromoUsage = {
      id: usageId,
      promo_code_id: promo.id,
      user_id: userId,
      context,
      discount_amount: valResult.discountAmount,
      original_amount: originalAmount,
      final_amount: valResult.finalAmount,
      created_at: new Date().toISOString(),
      promo_code: promo.code
    };
    
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('promo_usage')
          .insert([newUsage]);
      } catch (err) {
        console.error("DB fail inserting promo usage log:", err);
      }
    }
    
    const usages = loadData<PromoUsage[]>('gh_promo_usage', []);
    usages.push(newUsage);
    saveData('gh_promo_usage', usages);
    
    return {
      status: 'success',
      discountAmount: valResult.discountAmount,
      finalAmount: valResult.finalAmount
    };
  },

  async getPromoCodes(): Promise<PromoCode[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('promo_codes').select('*');
        if (!error && data) {
          return data.map(d => ({
            id: d.id,
            code: d.code,
            discount_type: d.discount_type,
            discount_value: Number(d.discount_value),
            applies_to: d.applies_to,
            usage_limit: Number(d.usage_limit || 0),
            used_count: Number(d.used_count || 0),
            active: d.active,
            start_date: d.start_date,
            end_date: d.end_date,
            created_at: d.created_at
          }));
        }
      } catch (err) {
        console.error("DB query promo codes failed:", err);
      }
    }
    return loadData<PromoCode[]>('gh_promo_codes', []);
  },

  async createPromoCode(promo: Omit<PromoCode, 'id' | 'used_count' | 'created_at'>): Promise<PromoCode> {
    const newPromo: PromoCode = {
      id: generateUUID(),
      ...promo,
      used_count: 0,
      created_at: new Date().toISOString()
    };
    
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('promo_codes').insert([newPromo]);
      } catch (err) {
        console.error("DB error inserting promo code:", err);
      }
    }
    
    const list = loadData<PromoCode[]>('gh_promo_codes', []);
    list.push(newPromo);
    saveData('gh_promo_codes', list);
    return newPromo;
  },

  async updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('promo_codes').update(updates).eq('id', id);
      } catch (err) {
        console.error("DB error updating promo code:", err);
      }
    }
    
    const list = loadData<PromoCode[]>('gh_promo_codes', []);
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveData('gh_promo_codes', list);
    }
  },

  async deletePromoCode(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('promo_codes').delete().eq('id', id);
      } catch (err) {
        console.error("DB error deleting promo code:", err);
      }
    }
    
    const list = loadData<PromoCode[]>('gh_promo_codes', []);
    const filtered = list.filter(p => p.id !== id);
    saveData('gh_promo_codes', filtered);
  },

  async getPromoUsageList(): Promise<PromoUsage[]> {
    let list: PromoUsage[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('promo_usage').select('*');
        if (!error && data) {
          list = data.map(d => ({
            id: d.id,
            promo_code_id: d.promo_code_id,
            user_id: d.user_id,
            context: d.context,
            discount_amount: Number(d.discount_amount),
            original_amount: Number(d.original_amount),
            final_amount: Number(d.final_amount),
            created_at: d.created_at
          }));
        }
      } catch (err) {
        console.error("DB error listing promo usages:", err);
      }
    }
    
    if (list.length === 0) {
      list = loadData<PromoUsage[]>('gh_promo_usage', []);
    }
    
    const usersList = await this.getUsers();
    const promosList = await this.getPromoCodes();
    
    return list.map(item => {
      const u = usersList.find(x => x.id === item.user_id);
      const p = promosList.find(x => x.id === item.promo_code_id);
      return {
        ...item,
        promo_code: p ? p.code : item.promo_code || 'PROMO',
        gamer_name: u ? u.gamerName : 'Unknown Gamer',
        user_email: u ? u.email : 'unknown@domain.com'
      };
    });
  },

  async getReferrals(): Promise<Referral[]> {
    let list: Referral[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('referrals').select('*');
        if (!error && data) {
          list = data.map(d => ({
            id: d.id,
            referrer_user_id: d.referrer_user_id,
            referred_user_id: d.referred_user_id,
            referral_code: d.referral_code,
            reward_status: d.reward_status,
            inviter_reward_diamonds: Number(d.inviter_reward_diamonds),
            referred_reward_diamonds: Number(d.referred_reward_diamonds),
            created_at: d.created_at,
            rewarded_at: d.rewarded_at
          }));
        }
      } catch (err) {
        console.error("DB error reading referrals list:", err);
      }
    }
    
    if (list.length === 0) {
      list = loadData<Referral[]>('gh_referrals', []);
    }
    
    const usersList = await this.getUsers();
    
    return list.map(item => {
      const inviter = usersList.find(u => u.id === item.referrer_user_id);
      const referred = usersList.find(u => u.id === item.referred_user_id);
      return {
        ...item,
        referrerName: inviter ? inviter.gamerName : 'Unknown Admin',
        referredName: referred ? referred.gamerName : 'Unknown Athlete'
      };
    });
  },

  async getCreatorVerificationRequests(): Promise<CreatorVerificationRequest[]> {
    let list: CreatorVerificationRequest[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('creator_verification_requests').select('*');
        if (!error && data) {
          list = data.map(d => ({
            id: d.id,
            user_id: d.user_id,
            real_name: d.real_name,
            creator_name: d.creator_name,
            youtube_link: d.youtube_link,
            instagram_link: d.instagram_link,
            discord_link: d.discord_link,
            uid: d.uid,
            description_text: d.description_text,
            proof_url: d.proof_url,
            status: d.status,
            admin_notes: d.admin_notes,
            created_at: d.created_at,
            updated_at: d.updated_at,
            type: d.type
          }));
        }
      } catch (err) {
        console.error("DB error reading verifications:", err);
      }
    }
    if (list.length === 0) {
      list = loadData<CreatorVerificationRequest[]>('gh_creator_verification_requests', []);
    }
    const usersList = await this.getUsers();
    return list.map(item => {
      const u = usersList.find(x => x.id === item.user_id);
      return {
        ...item,
        gamer_name: u ? u.gamerName : 'Unknown Gamer',
        user_email: u ? u.email : 'unknown@domain.com'
      };
    });
  },

  async submitCreatorVerificationRequest(req: Omit<CreatorVerificationRequest, 'id' | 'created_at' | 'status'>): Promise<CreatorVerificationRequest> {
    const newReq: CreatorVerificationRequest = {
      ...req,
      id: 'ver_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('creator_verification_requests').insert({
          id: newReq.id,
          user_id: newReq.user_id,
          real_name: newReq.real_name,
          creator_name: newReq.creator_name,
          youtube_link: newReq.youtube_link,
          instagram_link: newReq.instagram_link,
          discord_link: newReq.discord_link,
          uid: newReq.uid,
          description_text: newReq.description_text,
          proof_url: newReq.proof_url,
          status: newReq.status,
          type: newReq.type
        });
      } catch (err) {
        console.error("DB error saving verification request:", err);
      }
    }
    
    const list = loadData<CreatorVerificationRequest[]>('gh_creator_verification_requests', []);
    const filteredList = list.filter(r => !(r.user_id === req.user_id && r.status === 'pending'));
    filteredList.push(newReq);
    saveData('gh_creator_verification_requests', filteredList);
    
    await this.trackAnalyticsEvent('user_active', req.user_id, newReq.id, `Verification request submitted: ${req.type}`);
    
    return newReq;
  },

  async updateCreatorVerificationStatus(id: string, status: CreatorVerificationRequest['status'], adminNotes?: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('creator_verification_requests').update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        }).eq('id', id);
      } catch (err) {
        console.error("DB error updating verification:", err);
      }
    }

    const list = loadData<CreatorVerificationRequest[]>('gh_creator_verification_requests', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx].status = status;
      list[idx].admin_notes = adminNotes;
      list[idx].updated_at = new Date().toISOString();
      saveData('gh_creator_verification_requests', list);

      if (status === 'approved') {
        const reqObj = list[idx];
        await this.updateUserVerificationFlag(reqObj.user_id, true, reqObj.type);
      } else if (status === 'rejected' || status === 'changes_requested') {
        const reqObj = list[idx];
        await this.updateUserVerificationFlag(reqObj.user_id, false, null);
      }
    }
  },

  async updateUserVerificationFlag(userId: string, isVerified: boolean, verifiedType: CreatorVerificationRequest['type'] | null): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('users').update({
          is_verified: isVerified,
          verified_type: verifiedType
        }).eq('id', userId);
      } catch (err) {
        console.error("DB error updating user details:", err);
      }
    }

    const users = await this.getUsers();
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      users[userIdx].is_verified = isVerified;
      users[userIdx].verified_type = verifiedType;
      saveData('gh_users_list', users);
      const savedUser = localStorage.getItem('gh_current_user');
      if (savedUser) {
        try {
          const cu = JSON.parse(savedUser) as UserProfile;
          if (cu.id === userId) {
            cu.is_verified = isVerified;
            cu.verified_type = verifiedType;
            localStorage.setItem('gh_current_user', JSON.stringify(cu));
          }
        } catch (e) {}
      }
    }
  },

  async getFeaturedItems(): Promise<FeaturedItem[]> {
    let list: FeaturedItem[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('featured_items').select('*');
        if (!error && data) {
          list = data;
        }
      } catch (err) {
        console.error("DB error reading featured items:", err);
      }
    }
    if (list.length === 0) {
      list = loadData<FeaturedItem[]>('gh_featured_items', []);
    }
    return list;
  },

  async addFeaturedItem(item: Omit<FeaturedItem, 'id' | 'created_at'>): Promise<FeaturedItem> {
    const newItem: FeaturedItem = {
      ...item,
      id: 'feat_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('featured_items').insert(newItem);
      } catch (err) {
        console.error("DB error creating featured item:", err);
      }
    }

    const list = loadData<FeaturedItem[]>('gh_featured_items', []);
    const filtered = list.filter(x => !(x.item_type === item.item_type && x.item_id === item.item_id));
    filtered.push(newItem);
    saveData('gh_featured_items', filtered);
    return newItem;
  },

  async removeFeaturedItem(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('featured_items').delete().eq('id', id);
      } catch (err) {
        console.error("DB error removing featured item:", err);
      }
    }
    const list = loadData<FeaturedItem[]>('gh_featured_items', []);
    const filtered = list.filter(item => item.id !== id);
    saveData('gh_featured_items', filtered);
  },

  async getAdvertisementOrders(): Promise<AdvertisementOrder[]> {
    let list: AdvertisementOrder[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('advertisement_orders').select('*');
        if (!error && data) {
          list = data;
        }
      } catch (err) {
        console.error("DB error reading ads:", err);
      }
    }
    if (list.length === 0) {
      list = loadData<AdvertisementOrder[]>('gh_advertisement_orders', []);
    }
    const usersList = await this.getUsers();
    return list.map(item => {
      const u = usersList.find(x => x.id === item.user_id);
      return {
        ...item,
        gamer_name: u ? u.gamerName : 'Unknown Advertiser',
        user_email: u ? u.email : 'billing@industry.org'
      };
    });
  },

  async createAdvertisementOrder(order: Omit<AdvertisementOrder, 'id' | 'created_at' | 'status' | 'views' | 'clicks'>): Promise<AdvertisementOrder> {
    const newOrder: AdvertisementOrder = {
      ...order,
      id: 'ad_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      status: 'pending',
      views: 0,
      clicks: 0
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('advertisement_orders').insert({
          id: newOrder.id,
          user_id: newOrder.user_id,
          ad_type: newOrder.ad_type,
          target_id: newOrder.target_id,
          banner_url: newOrder.banner_url,
          plan: newOrder.plan,
          amount: newOrder.amount,
          transaction_id: newOrder.transaction_id,
          payment_screenshot_url: newOrder.payment_screenshot_url,
          status: newOrder.status,
          views: 0,
          clicks: 0
        });
      } catch (err) {
        console.error("DB error saving ad order:", err);
      }
    }

    const list = loadData<AdvertisementOrder[]>('gh_advertisement_orders', []);
    list.push(newOrder);
    saveData('gh_advertisement_orders', list);
    return newOrder;
  },

  async updateAdOrderStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const list = loadData<AdvertisementOrder[]>('gh_advertisement_orders', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      const days = list[idx].plan === '1_day' ? 1 : list[idx].plan === '7_days' ? 7 : 30;
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + days);

      list[idx].status = status;
      if (status === 'approved') {
        list[idx].start_date = start.toISOString();
        list[idx].end_date = end.toISOString();
        list[idx].approved_at = new Date().toISOString();

        await this.createInvoice({
          user_id: list[idx].user_id,
          amount: list[idx].amount,
          status: 'paid',
          description: `Self Ad Campaign (${list[idx].plan.replace('_', ' ')}) for ${list[idx].ad_type}`,
          item_type: 'advertisement_purchase',
          billing_name: list[idx].gamer_name || 'Advertiser Partner',
          billing_email: list[idx].user_email || 'partner@esports.com'
        });

        await this.trackAnalyticsEvent('ad_view', list[idx].user_id, id, `Ad campaign became active: ${list[idx].ad_type}`);
      }
      saveData('gh_advertisement_orders', list);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('advertisement_orders').update({
            status,
            start_date: status === 'approved' ? start.toISOString() : null,
            end_date: status === 'approved' ? end.toISOString() : null,
            approved_at: status === 'approved' ? new Date().toISOString() : null
          }).eq('id', id);
        } catch (err) {
          console.error("DB error updating ad order status:", err);
        }
      }
    }
  },

  async incrementAdViews(id: string): Promise<void> {
    const list = loadData<AdvertisementOrder[]>('gh_advertisement_orders', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx].views = (list[idx].views || 0) + 1;
      saveData('gh_advertisement_orders', list);
    }
  },

  async incrementAdClicks(id: string): Promise<void> {
    const list = loadData<AdvertisementOrder[]>('gh_advertisement_orders', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx].clicks = (list[idx].clicks || 0) + 1;
      saveData('gh_advertisement_orders', list);
      await this.trackAnalyticsEvent('ad_click', list[idx].user_id, id, `Self ad clicked: ${list[idx].ad_type}`);
    }
  },

  async getBannerAds(): Promise<BannerAd[]> {
    let list: BannerAd[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('banner_ads').select('*');
        if (!error && data) {
          list = data;
        }
      } catch (err) {
        console.error("DB error reading banners:", err);
      }
    }
    if (list.length === 0) {
      list = loadData<BannerAd[]>('gh_banner_ads', []);
    }
    if (list.length === 0) {
      list = [
        {
          id: 'b_top_default',
          slot_type: 'top_banner',
          title: 'Join the Ultimate Championship Cup 2026',
          image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
          link_url: '#/tournaments',
          active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          views: 1250,
          clicks: 145,
          ctr: 11.6,
          created_at: new Date().toISOString()
        },
        {
          id: 'b_side_default',
          slot_type: 'sidebar_banner',
          title: 'Upgrade to Platinum Legendary Rank',
          image_url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&auto=format&fit=crop&q=80',
          link_url: '#/membership',
          active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 60*24*60*60*1000).toISOString(),
          views: 940,
          clicks: 86,
          ctr: 9.1,
          created_at: new Date().toISOString()
        }
      ];
      saveData('gh_banner_ads', list);
    }
    return list.map(item => ({
      ...item,
      ctr: item.views > 0 ? parseFloat(((item.clicks / item.views) * 100).toFixed(1)) : 0
    }));
  },

  async saveBannerAd(ad: Omit<BannerAd, 'views' | 'clicks' | 'ctr' | 'created_at' | 'id'> & { id?: string }): Promise<BannerAd> {
    const list = loadData<BannerAd[]>('gh_banner_ads', []);
    const existingIdx = ad.id ? list.findIndex(x => x.id === ad.id) : -1;
    
    let resolvedAd: BannerAd;
    if (existingIdx !== -1) {
      resolvedAd = {
        ...list[existingIdx],
        ...ad,
        id: ad.id!
      };
      list[existingIdx] = resolvedAd;
    } else {
      resolvedAd = {
        ...ad,
        id: ad.id || 'b_' + Math.random().toString(36).substr(2, 9),
        views: 0,
        clicks: 0,
        ctr: 0,
        created_at: new Date().toISOString()
      };
      list.push(resolvedAd);
    }
    saveData('gh_banner_ads', list);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('banner_ads').upsert(resolvedAd);
      } catch (err) {
        console.error("DB error saving banner ad:", err);
      }
    }
    return resolvedAd;
  },

  async deleteBannerAd(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('banner_ads').delete().eq('id', id);
      } catch (err) {
        console.error("DB error deleting banner:", err);
      }
    }
    const list = loadData<BannerAd[]>('gh_banner_ads', []);
    const filtered = list.filter(item => item.id !== id);
    saveData('gh_banner_ads', filtered);
  },

  async incrementBannerViews(id: string): Promise<void> {
    const list = loadData<BannerAd[]>('gh_banner_ads', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx].views = (list[idx].views || 0) + 1;
      saveData('gh_banner_ads', list);
    }
  },

  async incrementBannerClicks(id: string): Promise<void> {
    const list = loadData<BannerAd[]>('gh_banner_ads', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx].clicks = (list[idx].clicks || 0) + 1;
      saveData('gh_banner_ads', list);
      await this.trackAnalyticsEvent('ad_click', null, id, `Banner ad clicked: ${list[idx].title}`);
    }
  },

  async getInvoices(): Promise<Invoice[]> {
    let list: Invoice[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('invoices').select('*');
        if (!error && data) {
          list = data;
        }
      } catch (err) {
        console.error("DB error fetching invoices:", err);
      }
    }
    if (list.length === 0) {
      list = loadData<Invoice[]>('gh_invoices', []);
    }
    if (list.length === 0) {
      list = [
        {
          id: 'inv_101',
          invoice_number: 'INV-2026-0001',
          user_id: 'sample_u1',
          amount: 99,
          status: 'paid',
          description: 'Silver Membership Upgrade - Recurring Month 1',
          item_type: 'membership',
          billing_name: 'Alex Rigger',
          billing_email: 'alex.rig@gmail.com',
          created_at: new Date(Date.now() - 5*24*60*60*1000).toISOString()
        },
        {
          id: 'inv_102',
          invoice_number: 'INV-2026-0002',
          user_id: 'sample_u2',
          amount: 450,
          status: 'paid',
          description: 'Diamond purchase (Bundle Sparkle +500 diamonds)',
          item_type: 'diamond_purchase',
          billing_name: 'Damon S',
          billing_email: 'damons@esports.com',
          created_at: new Date(Date.now() - 2*24*60*60*1000).toISOString()
        }
      ];
      saveData('gh_invoices', list);
    }
    return list;
  },

  async createInvoice(invoice: Omit<Invoice, 'id' | 'invoice_number' | 'created_at'>): Promise<Invoice> {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNum = `INV-${new Date().getFullYear()}-${suffix}`;
    
    const newInvoice: Invoice = {
      ...invoice,
      id: 'inv_' + Math.random().toString(36).substr(2, 9),
      invoice_number: invoiceNum,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('invoices').insert(newInvoice);
      } catch (err) {
        console.error("DB error entering invoice:", err);
      }
    }

    const list = loadData<Invoice[]>('gh_invoices', []);
    const isDup = list.some(x => x.user_id === invoice.user_id && x.amount === invoice.amount && x.description === invoice.description && (Date.now() - new Date(x.created_at).getTime() < 120000));
    if (!isDup) {
      list.push(newInvoice);
      saveData('gh_invoices', list);
    }
    return newInvoice;
  },

  async getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
    let list: AnalyticsEvent[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('analytics_events').select('*');
        if (!error && data) {
          list = data;
        }
      } catch (err) {
        console.error("DB error loading analytics:", err);
      }
    }
    if (list.length === 0) {
      list = loadData<AnalyticsEvent[]>('gh_analytics_events', []);
    }
    if (list.length === 0) {
      const start = Date.now();
      list = [
        { id: 'ev_1', event_type: 'user_active', user_id: 'u1', created_at: new Date(start - 1000000).toISOString() },
        { id: 'ev_2', event_type: 'user_new', user_id: 'u2', created_at: new Date(start - 2000000).toISOString() },
        { id: 'ev_3', event_type: 'user_returning', user_id: 'u3', created_at: new Date(start - 3000000).toISOString() }
      ];
      saveData('gh_analytics_events', list);
    }
    return list;
  },

  async trackAnalyticsEvent(
    eventType: AnalyticsEvent['event_type'],
    userId?: string | null,
    targetId?: string | null,
    metadata?: string | null
  ): Promise<void> {
    const newEvent: AnalyticsEvent = {
      id: 'evt_' + Math.random().toString(36).substr(2, 9),
      event_type: eventType,
      user_id: userId || null,
      target_id: targetId || null,
      metadata: metadata || null,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('analytics_events').insert(newEvent);
      } catch (e) {}
    }

    const list = loadData<AnalyticsEvent[]>('gh_analytics_events', []);
    list.push(newEvent);
    saveData('gh_analytics_events', list);
  }
};

// Simple comments persistence wrapper inside local store user records to avoid extreme multi-table joins overhead
function addLocalCommentSupport(userId: string, updatedFields: Partial<UserProfile>) {
  if (updatedFields.comments) {
    const list = loadData<any[]>('gh_comments_log_' + userId, []);
    saveData('gh_comments_log_' + userId, updatedFields.comments);
  }
}
