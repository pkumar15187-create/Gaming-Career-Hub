import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings, ProfileComment, DbPayment, DbTournamentRegistration, DbTournamentMatch, DiamondTransaction, WithdrawalRequest, TournamentResult } from '../types';
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

export const getFallbackUserProfile = (userId: string): UserProfile => ({
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
  referralCode: 'REFR' + Math.floor(Math.random() * 100),
  savedPlayers: [],
  stickers: [],
  comments: [],
  xp: 0,
  level: 1,
  diamonds: 0,
  topup_diamonds: 0,
  winning_diamonds: 0,
  locked_withdraw_diamonds: 0
});

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
            referralCode: p.referral_code || 'DEMO777',
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
            referralCode: prof.referral_code || 'DEMO777',
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
              referralCode: prof.referral_code || 'DEMO777',
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

    if (req.status === 'paid') {
      throw new Error("Withdrawal request is already paid out!");
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
  }
};

// Simple comments persistence wrapper inside local store user records to avoid extreme multi-table joins overhead
function addLocalCommentSupport(userId: string, updatedFields: Partial<UserProfile>) {
  if (updatedFields.comments) {
    const list = loadData<any[]>('gh_comments_log_' + userId, []);
    saveData('gh_comments_log_' + userId, updatedFields.comments);
  }
}
