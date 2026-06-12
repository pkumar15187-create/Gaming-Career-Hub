import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings, DbTournamentRegistration, DbTournamentMatch, TournamentResult, SubscriptionCancellationRequest } from '../types';
import { User, Shield, Trophy, Users, Heart, Award, Sparkles, Bell, CreditCard, Gift, Save, Send, Trash, Edit2, Gamepad2, Info, Check, Copy, MessageSquare, Receipt, Play, Eye, Star, X, MapPin, UserPlus, FileText, Rss, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserProfileFrameClass, getUserProfileBannerStyle, getUserTierBadgeIcon, getUserNameColorClass, isUserVIP, getThemePackAssetUrl, PLATINUM_DEFAULTS } from '../lib/premiumUtils';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { supabaseService } from '../lib/supabaseService';
import { GamerAvatar } from './GamerAvatar';
import { PremiumBanner } from './PremiumBanner';
import UploadField from './UploadField';

// Phase 5 Social subcomponents
import { MyFriendsPanel } from './dashboard/MyFriendsPanel';
import { FriendRequestsPanel } from './dashboard/FriendRequestsPanel';
import { RealtimeChatPanel } from './dashboard/RealtimeChatPanel';
import { MyPostsPanel } from './dashboard/MyPostsPanel';
import { ActivityFeedPanel } from './dashboard/ActivityFeedPanel';

interface UserDashboardProps {
  currentUser: UserProfile;
  userTeams: Team[];
  userTournaments: Tournament[];
  sponsorApplications: SponsorApplication[];
  notifications: Notification[];
  savedPlayersList: UserProfile[];
  adminSettings: AdminSettings;
  users: UserProfile[];
  onUpdateProfile: (updatedFields: Partial<UserProfile>) => void;
  onConfirmPayment: (membership: 'Silver' | 'Gold' | 'Platinum', txId: string, screenshotUrl: string, amount: number, couponApplied?: string) => void;
  onMarkNotificationRead: (notifId: string) => void;
  onUnsavePlayer: (savedUserId: string) => void;
  onSelectGamerProfile: (gamerUsername: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  initialTab?: string;
  initialConversationUserId?: string | null;
  registrations?: DbTournamentRegistration[];
  tournaments?: Tournament[];
}

interface DailyRewardClaimPanelProps {
  currentUser: UserProfile;
  onUpdateProfile: (fields: Partial<UserProfile>) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

function DailyRewardClaimPanel({ currentUser, onUpdateProfile, addToast }: DailyRewardClaimPanelProps) {
  const lastClaimRaw = currentUser.last_daily_reward_claimed_at || currentUser.lastDailyClaimed;
  const lastClaimTime = lastClaimRaw ? new Date(lastClaimRaw).getTime() : 0;
  
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!lastClaimTime) return 0;
      const difference = (lastClaimTime + 24 * 3605 * 1000) - Date.now(); // 24 hours (with slight tolerance)
      return difference > 0 ? difference : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastClaimTime]);

  const canClaimDaily = timeLeft === 0;

  const handleDailyClaim = () => {
    if (!canClaimDaily) return;
    
    // XP math
    const currentXp = currentUser.xp || 0;
    const newXp = currentXp + 350;
    const newLevel = Math.floor(newXp / 1000) + 1;
    const newCoins = (currentUser.coins || 0) + 50;
    const nowIso = new Date().toISOString();

    onUpdateProfile({
      xp: newXp,
      level: newLevel,
      coins: newCoins,
      lastDailyClaimed: nowIso,
      last_daily_reward_claimed_at: nowIso
    });

    addToast("Daily login supply capsule acquired! Awarded +350 XP and +50 gold coins.", "success");
  };

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <div className="space-y-3.5">
      {/* Coin Balance display */}
      <div className="flex justify-between items-center text-[10px] font-mono py-1.5 border-y border-zinc-850">
        <span className="text-zinc-400 font-bold">COIN BALANCE:</span>
        <span className="font-extrabold text-amber-400 flex items-center gap-1 font-mono">🪙 {currentUser.coins || 0} COINS</span>
      </div>

      {/* Claim Button or Countdown timer display */}
      {canClaimDaily ? (
        <button
          type="button"
          onClick={handleDailyClaim}
          className="w-full py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer select-none leading-none border bg-rose-500 text-white hover:bg-rose-650 border-rose-450 shadow shadow-rose-500/15"
        >
          🎁 Claim Daily supply reward
        </button>
      ) : (
        <div className="space-y-1.5">
          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all tracking-wider select-none leading-none border bg-zinc-950/40 text-zinc-500 border-zinc-850 cursor-not-allowed"
          >
            ✔ Daily Rewards Claimed
          </button>
          <div className="text-center text-[9px] font-mono text-zinc-400 tracking-wide animate-pulse">
            Next reward available in: <span className="text-rose-400 font-bold">{formatCountdown(timeLeft)}</span>
          </div>
        </div>
      )}
    </div>
  );
}


export default function UserDashboard({
  currentUser: rawCurrentUser,
  userTeams,
  userTournaments,
  sponsorApplications,
  notifications,
  savedPlayersList,
  adminSettings,
  users,
  onUpdateProfile,
  onConfirmPayment,
  onMarkNotificationRead,
  onUnsavePlayer,
  onSelectGamerProfile,
  addToast,
  initialTab,
  initialConversationUserId,
  registrations = [],
  tournaments = []
}: UserDashboardProps) {
  const currentUser = useMemo(() => {
    if (!rawCurrentUser) return null;
    const isExpired = rawCurrentUser?.membershipExpires ? (new Date(rawCurrentUser.membershipExpires) < new Date()) : false;
    return {
      ...rawCurrentUser,
      membership: (rawCurrentUser.membership && rawCurrentUser.membership !== 'Free' && !isExpired) ? rawCurrentUser.membership : 'Free',
      membershipStatus: (rawCurrentUser.membership && rawCurrentUser.membership !== 'Free' && !isExpired) ? (rawCurrentUser.membershipStatus || 'active') : 'none'
    } as typeof rawCurrentUser;
  }, [rawCurrentUser]);

   const [activeTab, setActiveTab ] = useState<'profile' | 'teams' | 'tournaments' | 'payments' | 'membership' | 'badges' | 'messages' | 'notifications' | 'favorites' | 'platinum_theme' | 'friends' | 'friend_requests' | 'posts' | 'feed' | 'diamonds' | 'verification' | 'advertisement' | 'invoices'>('profile');
  const [showPlatinumPreview, setShowPlatinumPreview] = useState(false);
  const isPlatinum = 
    (currentUser?.membership?.toLowerCase() === 'platinum' && currentUser?.membershipStatus?.toLowerCase() === 'active') || 
    currentUser?.membership?.toLowerCase() === 'admin' || 
    currentUser?.role?.toLowerCase() === 'admin' || 
    currentUser?.email === 'pkumar15187@gmail.com';

  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(initialConversationUserId || null);

  // User Diamond economy state and synchronization
  const [userDiamondTransactions, setUserDiamondTransactions] = useState<any[]>([]);
  const [selectedDiamondPackage, setSelectedDiamondPackage] = useState<{ name: string; diamonds: number; price: number; description: string } | null>(null);
  const [diamondTxId, setDiamondTxId] = useState('');
  const [diamondScreenshotUrl, setDiamondScreenshotUrl] = useState('');
  const [debugStatus, setDebugStatus] = useState('');

  // Tournament Dashboard Extra States
  const [dashboardMatches, setDashboardMatches] = useState<DbTournamentMatch[]>([]);
  const [dashboardResults, setDashboardResults] = useState<any[]>([]);
  const [allTeamsList, setAllTeamsList] = useState<Team[]>([]);
  const [isLoadingDashboardMatches, setIsLoadingDashboardMatches] = useState(false);
  const [tourneySubTab, setTourneySubTab] = useState<'slots' | 'matches' | 'results' | 'history'>('slots');

  // Additional emergency patch state variables
  const [userWithdrawals, setUserWithdrawals] = useState<any[]>([]);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isCustomTopupOpen, setIsCustomTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(100);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [withdrawHolderName, setWithdrawHolderName] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawQrUrl, setWithdrawQrUrl] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Subscription Cancellation States
  const [isCancelSubOpen, setIsCancelSubOpen] = useState(false);
  const [cancelUpiId, setCancelUpiId] = useState('');
  const [cancelQrUrl, setCancelQrUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancelSub, setIsSubmittingCancelSub] = useState(false);
  const [userCancellationRequests, setUserCancellationRequests] = useState<SubscriptionCancellationRequest[]>([]);

  // --- Creator Verification, Ad Marketplace, and Invoices ---
  const [verificationRealName, setVerificationRealName] = useState('');
  const [verificationCreatorName, setVerificationCreatorName] = useState('');
  const [verificationYoutube, setVerificationYoutube] = useState('');
  const [verificationInstagram, setVerificationInstagram] = useState('');
  const [verificationDiscord, setVerificationDiscord] = useState('');
  const [verificationUid, setVerificationUid] = useState('');
  const [verificationDescription, setVerificationDescription] = useState('');
  const [verificationProofUrl, setVerificationProofUrl] = useState('');
  const [verificationType, setVerificationType] = useState<'Streamer' | 'Player' | 'Team' | 'Organization'>('Streamer');
  const [myVerificationsList, setMyVerificationsList] = useState<any[]>([]);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  const [adOrderType, setAdOrderType] = useState<'profile' | 'team' | 'tournament'>('profile');
  const [adOrderTargetId, setAdOrderTargetId] = useState('');
  const [adOrderBannerUrl, setAdOrderBannerUrl] = useState('');
  const [adOrderPlan, setAdOrderPlan] = useState<'1_day' | '7_days' | '30_days'>('1_day');
  const [adOrderTxId, setAdOrderTxId] = useState('');
  const [adOrderScreenshotUrl, setAdOrderScreenshotUrl] = useState('');
  const [myAdOrders, setMyAdOrders] = useState<any[]>([]);
  const [isSubmittingAdOrder, setIsSubmittingAdOrder] = useState(false);

  const [myInvoices, setMyInvoices] = useState<any[]>([]);

  const getParticipantGlobalName = (id: string | null | undefined, type: 'solo' | 'team') => {
    if (!id) return "BYE";
    if (type === 'solo') {
      const user = users?.find(u => u.id === id);
      return user ? (user.gamerName || user.username || user.email || 'Gamer') : 'BYE';
    } else {
      const team = allTeamsList.find(ti => ti.id === id) || userTeams.find(ti => ti.id === id);
      return team ? team.name : 'BYE';
    }
  };

  const fetchDashboardMatchesAndResults = async () => {
    if (!currentUser?.id) return;
    setIsLoadingDashboardMatches(true);
    try {
      let matchesList: DbTournamentMatch[] = [];
      let resultsList: any[] = [];
      let teamsList: Team[] = [];
      
      teamsList = await supabaseService.getTeams();
      
      if (isSupabaseConfigured && supabase) {
        const { data: matchesData } = await supabase.from('tournament_matches').select('*');
        matchesList = matchesData || [];
        
        const { data: resultsData } = await supabase.from('tournament_results').select('*');
        resultsList = resultsData || [];
      } else {
        const myTeamIds = userTeams.map(ut => ut.id);
        const myRegs = registrations?.filter(r => r.user_id === currentUser?.id || (r.team_id && myTeamIds.includes(r.team_id))) || [];
        const uniqueTourneyIds = Array.from(new Set(myRegs.map(r => r.tournament_id)));
        
        for (const tId of uniqueTourneyIds) {
          try {
            const tMatches = await supabaseService.getTournamentMatches(tId);
            matchesList.push(...tMatches);
            const tResults = await supabaseService.getTournamentResults(tId);
            resultsList.push(...tResults);
          } catch (innerErr) {
            console.error(`Error loading details for tournament ${tId}:`, innerErr);
          }
        }
      }
      
      setDashboardMatches(matchesList);
      setDashboardResults(resultsList);
      setAllTeamsList(teamsList);
    } catch (err) {
      console.error("Failed to load dashboard matches/results:", err);
    } finally {
      setIsLoadingDashboardMatches(false);
    }
  };

  const fetchUserDiamondTransactions = async () => {
    try {
      if (!currentUser?.id) return;
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('diamond_transactions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        // Match the mapping shape returned by supabaseService
        const mapped = (data || []).map((d: any) => ({
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
        setUserDiamondTransactions(mapped);
      } else {
        const allTx = await supabaseService.getDiamondTransactions();
        const filtered = allTx.filter((t: any) => t.user_id === currentUser.id);
        setUserDiamondTransactions(filtered);
      }
    } catch (err) {
      console.error("Failed to load user diamond transactions in dashboard:", err);
    }
  };

  const fetchUserWithdrawals = async () => {
    try {
      if (!currentUser?.id) return;
      const allW = await supabaseService.getWithdrawalRequests();
      const filtered = allW.filter((w: any) => w.user_id === currentUser.id);
      setUserWithdrawals(filtered);
    } catch (err) {
      console.error("Failed to load user withdrawals:", err);
    }
  };

  const [userReferrals, setUserReferrals] = useState<any[]>([]);
  const [isReferralsLoading, setIsReferralsLoading] = useState(false);

  const fetchUserReferrals = async () => {
    if (!currentUser?.id) return;
    setIsReferralsLoading(true);
    try {
      const allRef = await supabaseService.getReferrals();
      const filtered = allRef.filter((r: any) => r.referrer_user_id === currentUser.id || r.referred_user_id === currentUser.id);
      setUserReferrals(filtered);
    } catch (err) {
      console.error("Failed to fetch referrals:", err);
    } finally {
      setIsReferralsLoading(false);
    }
  };

  const fetchUserCancellationRequests = async () => {
    try {
      if (!currentUser?.id) return;
      const allC = await supabaseService.getSubscriptionCancellations();
      const filtered = allC.filter((c: any) => c.user_id === currentUser.id);
      setUserCancellationRequests(filtered);
    } catch (err) {
      console.error("Failed to load user cancellations:", err);
    }
  };

  const fetchUserVerifications = async () => {
    if (!currentUser?.id) return;
    try {
      const all = await supabaseService.getCreatorVerificationRequests();
      const filtered = all.filter(x => x.user_id === currentUser.id);
      setMyVerificationsList(filtered);
    } catch (e) {
      console.error("Failed to load user verifications:", e);
    }
  };

  const fetchUserAdOrders = async () => {
    if (!currentUser?.id) return;
    try {
      const all = await supabaseService.getAdvertisementOrders();
      const filtered = all.filter(x => x.user_id === currentUser.id);
      setMyAdOrders(filtered);
    } catch (e) {
      console.error("Failed to load user ad orders:", e);
    }
  };

  const fetchUserInvoices = async () => {
    if (!currentUser?.id) return;
    try {
      const all = await supabaseService.getInvoices();
      const filtered = all.filter(x => x.user_id === currentUser.id);
      setMyInvoices(filtered);
    } catch (e) {
      console.error("Failed to load user invoices:", e);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    if (!verificationRealName.trim() || !verificationCreatorName.trim() || !verificationDescription.trim()) {
      addToast("Real name, creator name, and application statement description are required!", "warning");
      return;
    }

    setIsSubmittingVerification(true);
    try {
      await supabaseService.submitCreatorVerificationRequest({
        user_id: currentUser.id,
        real_name: verificationRealName,
        creator_name: verificationCreatorName,
        type: verificationType,
        youtube_link: verificationYoutube || undefined,
        instagram_link: verificationInstagram || undefined,
        discord_link: verificationDiscord || undefined,
        uid: verificationUid || undefined,
        description_text: verificationDescription,
        proof_url: verificationProofUrl || "Not Provided",
      });

      addToast("Creator Verification Application submitted successfully! Admin will review details.", "success");
      
      // Clear forms
      setVerificationRealName('');
      setVerificationCreatorName('');
      setVerificationYoutube('');
      setVerificationInstagram('');
      setVerificationDiscord('');
      setVerificationUid('');
      setVerificationDescription('');
      setVerificationProofUrl('');

      fetchUserVerifications();
    } catch (err: any) {
      addToast(err.message || "Failed to submit verification request", "error");
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleAdOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    if (!adOrderBannerUrl.trim()) {
      addToast("Ad Banner Image URL / Proof is required!", "warning");
      return;
    }
    if (!adOrderTxId.trim()) {
      addToast("UPI Payment Transaction UTR is required!", "warning");
      return;
    }

    setIsSubmittingAdOrder(true);
    try {
      // Calculate amount based on plan
      let amount = 199;
      let duration = 1;
      if (adOrderPlan === '7_days') {
        amount = 899;
        duration = 7;
      } else if (adOrderPlan === '30_days') {
        amount = 2999;
        duration = 30;
      }

      // Create direct ad order
      const order = await supabaseService.createAdvertisementOrder({
        user_id: currentUser.id,
        ad_type: adOrderType,
        target_id: adOrderTargetId.trim() || currentUser.id,
        banner_url: adOrderBannerUrl,
        plan: adOrderPlan,
        amount: amount,
        payment_screenshot_url: adOrderScreenshotUrl || "",
        transaction_id: adOrderTxId
      });

      // Submit automatic invoice
      await supabaseService.createInvoice({
        user_id: currentUser.id,
        amount: amount,
        status: 'unpaid',
        description: `Self Advertisement Banner (Plan: ${adOrderPlan.toUpperCase()}, Type: ${adOrderType.toUpperCase()}, Promote ID: ${adOrderTargetId.trim() || currentUser.id}). UTR: ${adOrderTxId}`,
        item_type: 'advertisement_purchase',
        billing_name: currentUser.gamerName,
        billing_email: currentUser.email || ''
      });

      addToast("Self-Advertisement order & invoice generated successfully! Admin approval pending.", "success");

      // Reset
      setAdOrderBannerUrl('');
      setAdOrderTxId('');
      setAdOrderScreenshotUrl('');
      setAdOrderTargetId('');

      fetchUserAdOrders();
    } catch (err: any) {
      addToast(err.message || "Failed to order self-advertisement banner.", "error");
    } finally {
      setIsSubmittingAdOrder(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diamonds' && currentUser?.id) {
      fetchUserDiamondTransactions();
      fetchUserWithdrawals();
    }
    if (activeTab === 'referrals' && currentUser?.id) {
      fetchUserReferrals();
      fetchUserDiamondTransactions();
    }
    if (activeTab === 'membership' && currentUser?.id) {
      fetchUserCancellationRequests();
    }
    if (activeTab === 'tournaments' && currentUser?.id) {
      fetchDashboardMatchesAndResults();
    }
    if (activeTab === 'verification' && currentUser?.id) {
      fetchUserVerifications();
    }
    if (activeTab === 'advertisement' && currentUser?.id) {
      fetchUserAdOrders();
    }
    if (activeTab === 'invoices' && currentUser?.id) {
      fetchUserInvoices();
    }
  }, [activeTab, currentUser?.id]);

  const handleCancelSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!cancelUpiId.trim() && !cancelQrUrl) {
      alert("Please provide at least one payout return credential (UPI ID or QR code image upload) to route your return!");
      return;
    }

    setIsSubmittingCancelSub(true);
    try {
      await supabaseService.createSubscriptionCancellation({
        user_id: currentUser.id,
        user_email: currentUser.email || '',
        plan: currentUser.membership,
        upi_id: cancelUpiId,
        qr_url: cancelQrUrl || null,
        reason: cancelReason
      });
      addToast("Subscription Cancellation request submitted. Admin will process shortly.", "success");
      setIsCancelSubOpen(false);
      setCancelUpiId('');
      setCancelQrUrl('');
      setCancelReason('');
      fetchUserCancellationRequests();
    } catch (err: any) {
      addToast(err.message || "Failed to submit subscription cancellation", "error");
    } finally {
      setIsSubmittingCancelSub(false);
    }
  };

  const handleApplyDiamondCoupon = async () => {
    let basePrice = 0;
    if (isCustomTopupOpen) {
      basePrice = topupAmount;
    } else if (selectedDiamondPackage) {
      basePrice = selectedDiamondPackage.price;
    } else {
      addToast("Please select a package first!", "warning");
      return;
    }

    const code = diamondCouponCode.trim().toUpperCase();
    if (!code) {
      addToast("Please input a valid promo or coupon code.", "warning");
      return;
    }

    const res = await supabaseService.validatePromoCode(code, currentUser?.id || '', 'diamond_purchase', basePrice);
    if (res.isValid) {
      const original = basePrice;
      const discount = res.discountAmount;
      const final = res.finalAmount;
      setDiamondDiscountSummary({
        original,
        discount,
        final,
        savings: discount
      });
      addToast(res.message, "success");
    } else {
      setDiamondDiscountSummary(null);
      addToast(res.message, "error");
    }
  };

  const submitDiamondTopup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebugStatus('');
    try {
      // 1. Get current auth user using supabase.auth.getUser()
      let user: any = null;
      if (isSupabaseConfigured && supabase) {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error("Auth error:", authError);
          user = currentUser;
        } else {
          user = authUser;
        }
      } else {
        user = currentUser;
      }

      // 2. Validate user exists
      if (!user || !user.id) {
        addToast("Diamond request failed: User is not authenticated.", "error");
        setDebugStatus("User validation failed: Not authenticated.");
        return;
      }

      // Determine diamonds counts
      let diamonds = 0;
      if (isCustomTopupOpen) {
        diamonds = topupAmount;
      } else if (selectedDiamondPackage) {
        diamonds = selectedDiamondPackage.diamonds;
      }

      // 3. Validate diamonds > 0
      if (diamonds <= 0) {
        addToast("Diamond request failed: Please choose a valid package or custom top-up amount.", "warning");
        setDebugStatus("Validation failed: diamonds count <= 0.");
        return;
      }

      // 4. Validate transaction_id/UTR exists
      const transactionId = diamondTxId ? diamondTxId.trim() : "";
      if (!transactionId) {
        addToast("Diamond request failed: UTR transaction reference ID is required.", "warning");
        setDebugStatus("Validation failed: transaction ID reference missing.");
        return;
      }

      // 5. Validate payment screenshot URL exists if upload is required
      // Since screenshots are optional in the database and forms, keep as is unless upload is required.
      const paymentScreenshotUrl = diamondScreenshotUrl ? diamondScreenshotUrl.trim() : null;

      // 6. Calculate
      const basePrice = isCustomTopupOpen ? topupAmount : (selectedDiamondPackage ? selectedDiamondPackage.price : diamonds);
      let price_paid = basePrice;
      let executedCouponCode: string | undefined = undefined;

      if (diamondCouponCode.trim()) {
        const promoRes = await supabaseService.executePromoUsage(diamondCouponCode.trim(), user.id, 'diamond_purchase', basePrice);
        if (promoRes.status === 'success') {
          price_paid = promoRes.finalAmount;
          executedCouponCode = diamondCouponCode.trim().toUpperCase();
        }
      }

      const bonus = diamonds >= 100 ? Math.floor(diamonds * 0.05) : 0;
      const total_credited = diamonds + bonus;

      console.log("Diamond insert attempted");
      setDebugStatus("Diamond insert attempted");

      // Clear any fake local storage records as requested
      if (isSupabaseConfigured) {
        localStorage.removeItem('gh_diamond_transactions');
      }

      const topupNote = executedCouponCode ? `Diamond top-up request (Coupon: ${executedCouponCode})` : "Diamond top-up request";

      // 7. Insert to Supabase table
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("diamond_transactions")
          .insert({
            user_id: user.id,
            wallet_type: "topup",
            transaction_type: "topup_purchase",
            diamonds: diamonds,
            bonus: bonus,
            total_credited: total_credited,
            price_paid: price_paid,
            transaction_id: transactionId,
            payment_screenshot_url: paymentScreenshotUrl,
            status: "pending",
            note: topupNote
          });

        if (error) {
          console.error("Diamond insert failed", error);
          addToast("Diamond request failed: " + error.message, "error");
          setDebugStatus(`Diamond insert failed: ${error.message}`);
          return;
        }
      } else {
        // Fallback for offline mode if Supabase is unconfigured, but we still update local
        await supabaseService.createDiamondTransaction({
          user_id: user.id,
          wallet_type: "topup",
          transaction_type: "topup_purchase",
          diamonds: diamonds,
          bonus: bonus,
          total_credited: total_credited,
          total_amount: total_credited,
          price_paid: price_paid,
          status: "pending",
          transaction_id: transactionId,
          payment_screenshot_url: paymentScreenshotUrl,
          note: topupNote
        });
      }

      // Generate invoice for diamond purchase
      try {
        await supabaseService.createInvoice({
          user_id: user.id,
          amount: price_paid,
          status: 'unpaid',
          description: `Diamonds packages purchased (Quantity: ${diamonds} + Info bonus ${bonus}). Coupon: ${executedCouponCode || 'None'}. UTR: ${transactionId}`,
          item_type: 'diamond_purchase',
          billing_name: user.gamerName,
          billing_email: user.email || ''
        });
      } catch (e) {
        console.error("Discount/Invoice system error: ", e);
      }

      // 8. Success actions
      addToast("Diamond request submitted successfully.", "success");
      setDebugStatus("Diamond insert attempted: Diamond request submitted successfully.");

      // Clear form states
      setDiamondTxId('');
      setDiamondScreenshotUrl('');
      setDiamondCouponCode('');
      setDiamondDiscountSummary(null);
      setIsCustomTopupOpen(false);
      setSelectedDiamondPackage(null);

      // Refetch history logs
      fetchUserDiamondTransactions();
    } catch (err: any) {
      console.error("Diamond insert failed", err);
      addToast("Diamond request failed: " + (err.message || err), "error");
      setDebugStatus(`Diamond insert failed: ${err.message || err}`);
    }
  };

  const handlePurchaseDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitDiamondTopup(e);
  };

  const handlePurchaseCustomDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitDiamondTopup(e);
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    // Check balances
    const winningBalance = currentUser.winning_diamonds || 0;
    const lockedBalance = currentUser.locked_withdraw_diamonds || 0;
    const availableBalance = winningBalance - lockedBalance;
    
    if (withdrawAmount < 100) {
      addToast("Minimum withdrawal is 100 winning diamonds.", "error");
      return;
    }
    if (withdrawAmount > availableBalance) {
      addToast(`Insufficient available winning balance. Requested: ${withdrawAmount}, Available: ${availableBalance}`, "error");
      return;
    }
    if (!withdrawUpiId.trim()) {
      addToast("UPI ID is required.", "warning");
      return;
    }
    if (!withdrawHolderName.trim()) {
      addToast("Account Holder Name is required.", "warning");
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      await supabaseService.createWithdrawalRequest({
        user_id: currentUser.id,
        amount: withdrawAmount,
        upi_id: withdrawUpiId,
        qr_url: withdrawQrUrl || null,
        account_holder_name: withdrawHolderName,
        phone: withdrawPhone || null,
        note: withdrawNote || null
      });

      addToast(`Withdrawal request of ${withdrawAmount} Diamonds (₹${withdrawAmount}) submitted successfully.`, "success");
      
      // Clear and close
      setWithdrawAmount(100);
      setWithdrawUpiId('');
      setWithdrawHolderName('');
      setWithdrawPhone('');
      setWithdrawNote('');
      setWithdrawQrUrl('');
      setIsWithdrawOpen(false);

      // Refresh
      fetchUserWithdrawals();
      fetchUserDiamondTransactions();
      
      if (onUpdateProfile) {
        onUpdateProfile({
          locked_withdraw_diamonds: (currentUser?.locked_withdraw_diamonds || 0) + withdrawAmount
        });
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to submit withdrawal request.", "error");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('1500');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [zoomedQrUrl, setZoomedQrUrl] = useState<string | null>(null);

  const handleTransferTopupToWinning = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseInt(transferAmount) || 0;
    if (amountVal < 1500) {
      addToast("Minimum transfer is 1500 Diamonds.", "warning");
      return;
    }
    const currentTopup = currentUser.topup_diamonds || 0;
    if (currentTopup < amountVal) {
      addToast(`Insufficient Top-up balance. You only have ${currentTopup} Diamonds.`, "error");
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      await supabaseService.transferTopupToWinning(currentUser.id, amountVal);
      addToast(`Transfer of ${amountVal} Top-up Diamonds to Winning Vault was successful!`, "success");
      
      // Update local profile state
      if (onUpdateProfile) {
        onUpdateProfile({
          topup_diamonds: currentTopup - amountVal,
          winning_diamonds: (currentUser.winning_diamonds || 0) + amountVal
        });
      }
      
      setIsTransferOpen(false);
      setTransferAmount('1500');
      fetchUserDiamondTransactions();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to complete transfer.", "error");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Support parent transition hooks
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
    if (initialConversationUserId) {
      setChatTargetUserId(initialConversationUserId);
    }
  }, [initialTab, initialConversationUserId]);



  // Platinum theme configuration states
  const [platinumThemeEnabled, setPlatinumThemeEnabled] = useState(currentUser.platinum_theme_enabled ?? false);
  const [platinumBackgroundUrl, setPlatinumBackgroundUrl] = useState(currentUser.platinum_background_url || PLATINUM_DEFAULTS.background);
  const [platinumOverlayUrl, setPlatinumOverlayUrl] = useState(currentUser.platinum_overlay_url || PLATINUM_DEFAULTS.particleOverlay);
  const [platinumProfileCardUrl, setPlatinumProfileCardUrl] = useState(currentUser.platinum_profile_card_url || PLATINUM_DEFAULTS.profileCard);
  const [platinumBannerUrl, setPlatinumBannerUrl] = useState(currentUser.active_banner_url || PLATINUM_DEFAULTS.banner);
  const [selectedBanner, setSelectedBanner] = useState(currentUser.selected_banner || '');

  // Supabase storage bucket file loaded states
  const [backgroundAssets, setBackgroundAssets] = useState<string[]>([]);
  const [overlayAssets, setOverlayAssets] = useState<string[]>([]);
  const [bannerAssets, setBannerAssets] = useState<string[]>([]);
  const [profileCardAssets, setProfileCardAssets] = useState<string[]>([]);
  const [hudAssets, setHudAssets] = useState<string[]>([]);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  // Parse list of active HUD card URLs from JSON string
  const [selectedHudCards, setSelectedHudCards] = useState<string[]>(() => {
    try {
      if (!currentUser.platinum_hud_assets) return PLATINUM_DEFAULTS.hudCards;
      const parsed = typeof currentUser.platinum_hud_assets === 'string'
        ? JSON.parse(currentUser.platinum_hud_assets)
        : currentUser.platinum_hud_assets;
      return parsed.selected_hud_cards || PLATINUM_DEFAULTS.hudCards;
    } catch {
      return PLATINUM_DEFAULTS.hudCards;
    }
  });

  // Pre-parse initial HUD assets
  const initialHudAssets = (() => {
    if (!currentUser.platinum_hud_assets) {
      return { 
        xp: PLATINUM_DEFAULTS.hudCards[0], 
        rank: PLATINUM_DEFAULTS.hudCards[1], 
        trophies: PLATINUM_DEFAULTS.hudCards[2], 
        followers: PLATINUM_DEFAULTS.hudCards[3] 
      };
    }
    try {
      const parsed = typeof currentUser.platinum_hud_assets === 'string'
        ? JSON.parse(currentUser.platinum_hud_assets)
        : currentUser.platinum_hud_assets;
      return {
        xp: parsed.xp || PLATINUM_DEFAULTS.hudCards[0],
        rank: parsed.rank || PLATINUM_DEFAULTS.hudCards[1],
        trophies: parsed.trophies || PLATINUM_DEFAULTS.hudCards[2],
        followers: parsed.followers || PLATINUM_DEFAULTS.hudCards[3],
      };
    } catch {
      return { 
        xp: PLATINUM_DEFAULTS.hudCards[0], 
        rank: PLATINUM_DEFAULTS.hudCards[1], 
        trophies: PLATINUM_DEFAULTS.hudCards[2], 
        followers: PLATINUM_DEFAULTS.hudCards[3] 
      };
    }
  })();

  const [platinumHudXp, setPlatinumHudXp] = useState(initialHudAssets.xp);
  const [platinumHudRank, setPlatinumHudRank] = useState(initialHudAssets.rank);
  const [platinumHudTrophies, setPlatinumHudTrophies] = useState(initialHudAssets.trophies);
  const [platinumHudFollowers, setPlatinumHudFollowers] = useState(initialHudAssets.followers);

  // Sync state with incoming currentUser updates (especially after login, refetches etc.)
  useEffect(() => {
    setPlatinumThemeEnabled(currentUser.platinum_theme_enabled ?? false);
    setPlatinumBackgroundUrl(currentUser.platinum_background_url || PLATINUM_DEFAULTS.background);
    setPlatinumOverlayUrl(currentUser.platinum_overlay_url || PLATINUM_DEFAULTS.particleOverlay);
    setPlatinumProfileCardUrl(currentUser.platinum_profile_card_url || PLATINUM_DEFAULTS.profileCard);
    setPlatinumBannerUrl(currentUser.active_banner_url || PLATINUM_DEFAULTS.banner);
    setSelectedBanner(currentUser.selected_banner || '');
    
    if (currentUser.platinum_hud_assets) {
      try {
        const parsed = typeof currentUser.platinum_hud_assets === 'string'
          ? JSON.parse(currentUser.platinum_hud_assets)
          : currentUser.platinum_hud_assets;
        setPlatinumHudXp(parsed.xp || PLATINUM_DEFAULTS.hudCards[0]);
        setPlatinumHudRank(parsed.rank || PLATINUM_DEFAULTS.hudCards[1]);
        setPlatinumHudTrophies(parsed.trophies || PLATINUM_DEFAULTS.hudCards[2]);
        setPlatinumHudFollowers(parsed.followers || PLATINUM_DEFAULTS.hudCards[3]);
        setSelectedHudCards(parsed.selected_hud_cards || PLATINUM_DEFAULTS.hudCards);
      } catch (e) {
        console.warn("Failed parsing hud assets", e);
        setPlatinumHudXp(PLATINUM_DEFAULTS.hudCards[0]);
        setPlatinumHudRank(PLATINUM_DEFAULTS.hudCards[1]);
        setPlatinumHudTrophies(PLATINUM_DEFAULTS.hudCards[2]);
        setPlatinumHudFollowers(PLATINUM_DEFAULTS.hudCards[3]);
        setSelectedHudCards(PLATINUM_DEFAULTS.hudCards);
      }
    } else {
      setPlatinumHudXp(PLATINUM_DEFAULTS.hudCards[0]);
      setPlatinumHudRank(PLATINUM_DEFAULTS.hudCards[1]);
      setPlatinumHudTrophies(PLATINUM_DEFAULTS.hudCards[2]);
      setPlatinumHudFollowers(PLATINUM_DEFAULTS.hudCards[3]);
      setSelectedHudCards(PLATINUM_DEFAULTS.hudCards);
    }
  }, [
    currentUser?.id,
    currentUser?.platinum_theme_enabled,
    currentUser?.platinum_background_url,
    currentUser?.platinum_overlay_url,
    currentUser?.platinum_profile_card_url,
    currentUser?.active_banner_url,
    currentUser?.selected_banner,
    currentUser?.platinum_hud_assets
  ]);

  // Load Supabase storage assets recursively
  const loadSupabaseAssets = async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.log("Supabase is not configured. Using high fidelity default files.");
      return;
    }
    setIsLoadingStorage(true);
    try {
      const getUrls = async (folder: string): Promise<string[]> => {
        const { data, error } = await supabase.storage
          .from("platinum_profile_themes")
          .list(folder);

        if (error) {
          console.warn(`Error listing folder ${folder} from Supabase:`, error);
          return [];
        }

        const files = (data || []).filter(item => item.name !== '.emptyFolderPlaceholder' && !item.name.startsWith('.'));
        return files.map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from("platinum_profile_themes")
            .getPublicUrl(`${folder}/${file.name}`);
          return publicUrl;
        });
      };

      const [bgItems, overlayItems, bannerItems, cardItems, hudItems] = await Promise.all([
        getUrls("profile_backgrounds"),
        getUrls("overlays"),
        getUrls("banners"),
        getUrls("profile_cards"),
        getUrls("hud_stats")
      ]);

      // Part G: Debug logs
      console.log("Loaded background assets count:", bgItems.length);
      console.log("Loaded overlay assets count:", overlayItems.length);
      console.log("Loaded banner assets count:", bannerItems.length);
      console.log("Loaded profile card assets count:", cardItems.length);
      console.log("Loaded HUD assets count:", hudItems.length);

      setBackgroundAssets(bgItems);
      setOverlayAssets(overlayItems);
      setBannerAssets(bannerItems);
      setProfileCardAssets(cardItems);
      setHudAssets(hudItems);
    } catch (err) {
      console.error("Failed to load custom Platinum storage profiles assets.", err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'platinum_theme') {
      loadSupabaseAssets();
    }
  }, [activeTab]);

  // Edit profile form states
  const [avatarPhoto, setAvatarPhoto] = useState(currentUser.profilePhoto || '');
  const [gamerName, setGamerName] = useState(currentUser.gamerName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [country, setCountry] = useState(currentUser.country || 'India');
  const [state, setState] = useState(currentUser.state || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [youtube, setYoutube] = useState(currentUser.social?.youtube || '');
  const [instagram, setInstagram] = useState(currentUser.social?.instagram || '');
  const [discord, setDiscord] = useState(currentUser.social?.discord || '');
  const [favGames, setFavGames ] = useState<string[]>(currentUser.favoriteGames || []);

  // Premium customizer selections
  const [activeSticker, setActiveSticker] = useState(currentUser.activeSticker || '');
  const [activeFrame, setActiveFrame] = useState(currentUser.activeFrame || '');
  const [activeBanner, setActiveBanner] = useState(currentUser.activeBanner || '');

  // Stats edit states
  const [kdRatio, setKdRatio] = useState((currentUser.kdRatio ?? 1.0).toString());
  const [winRate, setWinRate] = useState((currentUser.winRate ?? 50.0).toString());
  const [skillRating, setSkillRating] = useState((currentUser.skillRating ?? 1500).toString());

  // Membership form states
  const [selectedPremiumTier, setSelectedPremiumTier] = useState<'Silver' | 'Gold' | 'Platinum' | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [flatDeduction, setFlatDeduction] = useState(0);
  const [discountSummary, setDiscountSummary] = useState<{
    original: number;
    discount: number;
    final: number;
    savings: number;
  } | null>(null);

  // Diamond purchase coupon states
  const [diamondCouponCode, setDiamondCouponCode] = useState('');
  const [diamondDiscountSummary, setDiamondDiscountSummary] = useState<{
    original: number;
    discount: number;
    final: number;
    savings: number;
  } | null>(null);

  // Tournament coupon states
  const [tournamentCouponCode, setTournamentCouponCode] = useState('');
  const [tournamentDiscountSummary, setTournamentDiscountSummary] = useState<{
    original: number;
    discount: number;
    final: number;
    savings: number;
  } | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshotInput, setScreenshotInput] = useState('');

  // Predefined games list
  const gamesList = ["Free Fire", "BGMI", "PUBG Mobile", "COD Mobile", "Valorant", "CS2", "GTA V"];

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gamerName.trim()) {
      addToast("Gamer Name cannot be empty!", "error");
      return;
    }

    const isSettingPremium = (activeSticker && activeSticker !== currentUser.activeSticker) ||
                             (activeFrame && activeFrame !== currentUser.activeFrame) ||
                             (activeBanner && activeBanner !== currentUser.activeBanner);

    if (isSettingPremium && !isPlatinum) {
      addToast("Upgrade to Platinum Membership to unlock this feature.", "error");
      return;
    }

    onUpdateProfile({
      gamerName,
      bio,
      country,
      state,
      city,
      social: { youtube, instagram, discord },
      favoriteGames: favGames,
      kdRatio: parseFloat(kdRatio) || 1.0,
      winRate: parseFloat(winRate) || 50.0,
      skillRating: parseInt(skillRating) || 1000,
      profilePhoto: avatarPhoto,
      activeSticker,
      activeFrame,
      activeBanner
    });

    addToast("Gamer portfolio parameters updated successfully!", "success");
  };

  const handleGameToggle = (game: string) => {
    if (favGames.includes(game)) {
      setFavGames(prev => prev.filter(g => g !== game));
    } else {
      setFavGames(prev => [...prev, game]);
    }
  };

  // Membership Pricing
  const premiumTiers = {
    Silver: { price: 19, badge: "🥈 Silver badge", perks: ["Silver profile frame", "Silver name color", "Featured profile for 7 days"] },
    Gold: { price: 49, badge: "🥇 Gold badge", perks: ["Gold profile frame", "Gold name color", "Premium banner", "Featured profile for 30 days", "Gold glow effect"] },
    Platinum: { price: 99, badge: "👑 Platinum VIP badge", perks: ["Animated profile frame", "Animated premium banner", "VIP label everywhere", "Featured profile while active", "Platinum glow effect"] }
  };

  const handleApplyCoupon = async () => {
    if (!selectedPremiumTier) {
      addToast("Select a premium tier first so we can apply coupon context!", "warning");
      return;
    }
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      addToast("Please input a valid promo or coupon code.", "warning");
      return;
    }
    
    const basePrice = premiumTiers[selectedPremiumTier].price;
    const res = await supabaseService.validatePromoCode(code, currentUser?.id || '', 'membership', basePrice);
    
    if (res.isValid) {
      setAppliedDiscount(res.promo?.discount_type === 'percentage' ? res.promo.discount_value : 0);
      setFlatDeduction(res.promo?.discount_type === 'flat' ? res.promo.discount_value : 0);
      
      const original = basePrice;
      const discount = res.discountAmount;
      const final = res.finalAmount;
      setDiscountSummary({
        original,
        discount,
        final,
        savings: discount
      });
      
      addToast(res.message, "success");
    } else {
      setAppliedDiscount(0);
      setFlatDeduction(0);
      setDiscountSummary(null);
      addToast(res.message, "error");
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPremiumTier) return;
    if (!transactionId.trim()) {
      addToast("Transaction reference ID is mandated!", "warning");
      return;
    }

    // fallback screenshot if plain text
    const finalScreenshot = screenshotInput.trim() || "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=500&auto=format&fit=crop&q=60";

    const basePrice = premiumTiers[selectedPremiumTier].price;
    let finalAmount = basePrice;
    let finalCoupon: string | undefined = undefined;

    if (couponCode.trim()) {
      const execRes = await supabaseService.executePromoUsage(couponCode.trim(), currentUser?.id || '', 'membership', basePrice);
      if (execRes.status === 'success') {
        finalAmount = execRes.finalAmount;
        finalCoupon = couponCode.trim().toUpperCase();
        console.log(`[Coupon Engine] Promo code executed successfully! Paid: ₹${finalAmount}`);
      } else {
        console.warn("[Coupon Engine] Promo code execution failed. Defaulting to full billing amount.");
      }
    }

    onConfirmPayment(
      selectedPremiumTier,
      transactionId,
      finalScreenshot,
      finalAmount,
      finalCoupon
    );

    // Generate Invoice record for Membership upgrade
    try {
      await supabaseService.createInvoice({
        user_id: currentUser?.id || 'anonymous',
        amount: finalAmount,
        status: 'unpaid',
        description: `Esports Premium Tier: ${selectedPremiumTier} Upgrade. Coupon: ${finalCoupon || 'None'}. UTR: ${transactionId}`,
        item_type: 'membership',
        billing_name: currentUser?.gamerName || 'Esports Athlete',
        billing_email: currentUser?.email || ''
      });
    } catch (e) {
      console.error("Invoice generation failed for membership", e);
    }

    // reset states
    setCouponCode('');
    setAppliedDiscount(0);
    setFlatDeduction(0);
    setDiscountSummary(null);

    addToast("Payment proof uploaded successfully! Awaiting verification approval from Gaming Admin.", "success");
    setTransactionId('');
    setScreenshotInput('');
    setSelectedPremiumTier(null);
    setAppliedDiscount(0);
    setCouponCode('');
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(currentUser.referralCode);
    addToast("Referral code copied! Share with squadmates to unlock premium discounts.", "success");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 bg-zinc-900/60 p-5 border border-zinc-800 rounded-2xl backdrop-blur-xl space-y-4">
        {/* User Card with Premium Overlapping Banner */}
        <div 
          className={`relative overflow-hidden rounded-xl border pb-4 text-center transition-all ${
            (isPlatinum && currentUser.platinum_theme_enabled) || activeTab === 'platinum_theme'
              ? 'platinum-profile-theme electric_sweep_overlay border-rose-500/45 shadow-[0_0_25px_rgba(244,63,94,0.18)] bg-cover bg-center'
              : 'border-zinc-800/80 bg-zinc-950/20'
          }`}
          style={(isPlatinum && currentUser.platinum_theme_enabled) || activeTab === 'platinum_theme' ? {
            backgroundImage: `url("${activeTab === 'platinum_theme' ? platinumBackgroundUrl : (currentUser.platinum_background_url || PLATINUM_DEFAULTS.background)}")`
          } : {}}
        >
          {((isPlatinum && currentUser.platinum_theme_enabled) || activeTab === 'platinum_theme') && (
            <img 
              src={activeTab === 'platinum_theme' ? platinumOverlayUrl : (currentUser.platinum_overlay_url || PLATINUM_DEFAULTS.particleOverlay)} 
              alt="Overlay effect" 
              className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none z-0 mix-blend-screen"
              referrerPolicy="no-referrer"
            />
          )}
          <PremiumBanner 
            user={currentUser} 
            adminSettings={adminSettings} 
            heightClass="h-24" 
            customBannerUrl={activeTab === 'platinum_theme' ? platinumBannerUrl : undefined} 
          />

          {/* Avatar overlapping */}
          <div className="flex flex-col items-center -mt-9 relative z-20">
            <GamerAvatar user={currentUser} adminSettings={adminSettings} size="lg" />

            <h3 className="text-base font-black font-display mt-2 flex items-center justify-center gap-1 flex-wrap px-2">
              <span className={getUserNameColorClass(currentUser)}>
                {currentUser.gamerName}
              </span>
              {isUserVIP(currentUser) && (
                <span className="text-[8px] bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-1;py-0.5 rounded font-mono font-extrabold shadow shadow-rose-500/10 animate-pulse">VIP</span>
              )}
              {getUserTierBadgeIcon(currentUser, adminSettings) && (
                <span className="text-xs" title={getUserTierBadgeIcon(currentUser, adminSettings)}>
                  {getUserTierBadgeIcon(currentUser, adminSettings).split(' ')[0]}
                </span>
              )}
            </h3>
            
            <span className="text-zinc-500 font-mono text-[9px] uppercase flex flex-col gap-0.5 mt-0.5 font-bold">
              {currentUser.membership === 'Free' ? (
                <span>Free Pilot Profile</span>
              ) : (
                <span className="text-amber-400 font-bold tracking-widest leading-none">{currentUser.membership} MEMBER</span>
              )}
              {currentUser.membership !== 'Free' && currentUser.membershipStatus === 'active' && currentUser.membershipExpires && (
                <span className="text-[8px] text-zinc-650 font-normal lowercase font-mono">expires: {new Date(currentUser.membershipExpires).toLocaleDateString()}</span>
              )}
            </span>

            {currentUser.membershipStatus === 'pending' && (
              <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold uppercase tracking-wide px-2 py-0.5 mt-1.5 rounded-full">
                ⚡ Pending Review
              </span>
            )}

            {/* Dashboard Platinum Preview button - visible for active Platinum or when in theme customizer tab */}
            {((currentUser.membership === 'Platinum' && currentUser.membershipStatus === 'active') || activeTab === 'platinum_theme') && (
              <button
                onClick={() => setShowPlatinumPreview(true)}
                className="mt-3.5 mx-auto py-1.5 px-3 bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest shadow-lg shadow-rose-950/20 flex items-center justify-center gap-1 transition-all animate-pulseGlow border border-rose-500/30 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                Preview Platinum Profile
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Athlete Progression, Completion, and Rewards panel */}
        <div className="py-3 border-b border-zinc-800/40 space-y-3">
          {/* Level Progress */}
          {(() => {
            const level = currentUser.level || 5;
            const xp = currentUser.xp || 1500;
            const xpInCurrentLevel = xp % 1000;
            const pct = Math.round((xpInCurrentLevel / 1000) * 100);

            // Completion calculation
            const fieldsCompleteness = [
              currentUser.profilePhoto,
              currentUser.bio,
              currentUser.favoriteGames && currentUser.favoriteGames.length > 0,
              currentUser.country,
              currentUser.city,
              currentUser.state,
              currentUser.social.youtube || currentUser.social.instagram || currentUser.social.discord,
              currentUser.skillRating > 0,
              currentUser.kdRatio > 0,
              currentUser.winRate > 0
            ];
            const completedCount = fieldsCompleteness.filter(Boolean).length;
            const completionScore = Math.round((completedCount / fieldsCompleteness.length) * 100);

            // Daily reward limit checking
            const canClaimDaily = !currentUser.lastDailyClaimed || 
              (Date.now() - new Date(currentUser.lastDailyClaimed).getTime()) > (24 * 3600 * 1000);

            const handleDailyClaim = () => {
              const newXp = (currentUser.xp || 1500) + 350;
              const newLevel = Math.floor(newXp / 1000) + 1;
              onUpdateProfile({
                xp: newXp,
                level: newLevel,
                lastDailyClaimed: new Date().toISOString()
              });
              addToast("Daily login supply capsule acquired! Awarded +350 XP and aligned gamer levels.", "success");
            };

            return (
              <div className="space-y-3.5">
                {/* Level / XP display */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400 font-bold font-mono">GAMER LEVEL: <span className="text-white">Lvl {level}</span></span>
                    <span className="text-zinc-500 font-mono">{xpInCurrentLevel}/1000 XP</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-805">
                    <span className="h-full bg-cyan-400 block transition-all" style={{ width: `${pct}%` }}></span>
                  </div>
                </div>

                {/* Profile completeness meter */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400 font-bold font-mono">PORTFOLIO SYNC SCORE:</span>
                    <span className="font-bold text-emerald-400 font-mono">{completionScore}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-805">
                    <span className="h-full bg-emerald-500 block transition-all" style={{ width: `${completionScore}%` }}></span>
                  </div>
                </div>

                {/* Interactive Daily Reward & Live Countdown Panel */}
                <DailyRewardClaimPanel 
                  currentUser={currentUser}
                  onUpdateProfile={onUpdateProfile}
                  addToast={addToast}
                />
              </div>
            );
          })()}
        </div>

        {/* Vertical menu navigation */}
        <div className="flex flex-col gap-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'profile' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <User className="w-4 h-4 shrink-0 text-rose-400" />
            Edit Profile
          </button>

          <button
            onClick={() => setActiveTab('platinum_theme')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'platinum_theme' ? 'bg-gradient-to-r from-rose-950/45 to-zinc-900 text-rose-400 border-l-2 border-rose-500 font-black shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-rose-500 animate-spin [animation-duration:8s]" />
            👑 Platinum Theme Settings
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'teams' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-cyan-400" />
            My Teams ({userTeams.length})
          </button>

          <button
            onClick={() => setActiveTab('tournaments')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'tournaments' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0 text-amber-500" />
            My Tournaments ({userTournaments.length})
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'payments' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0 text-indigo-400" />
            My Payments
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'verification' ? 'bg-zinc-800 text-blue-400 border-l-2 border-blue-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0 text-blue-500" />
            Creator badge verification
          </button>

          <button
            onClick={() => setActiveTab('advertisement')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'advertisement' ? 'bg-zinc-800 text-rose-455 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-rose-450" />
            Self Advertisement Marketplace
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'invoices' ? 'bg-zinc-800 text-emerald-450 border-l-2 border-emerald-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
            My Invoice Ledger
          </button>

          <button
            onClick={() => setActiveTab('membership')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'membership' ? 'bg-zinc-800 text-amber-500 border-l-2 border-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-amber-500" />
            My Premium Membership
          </button>

          <button
            onClick={() => setActiveTab('diamonds')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'diamonds' ? 'bg-zinc-800 text-amber-500 border-l-2 border-amber-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 text-cyan-400 animate-pulse" />
            <span>Diamond Shop & Perks</span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'referrals' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-rose-450" />
            <span>Affiliate & Referrals Program</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'badges' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Award className="w-4 h-4 shrink-0 text-yellow-500" />
            My Badges ({currentUser.badges?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'messages' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 text-cyan-400" />
            Tactical Chat Centre
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'friends' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-emerald-400" />
            My Friends Network
          </button>

          <button
            onClick={() => setActiveTab('friend_requests')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'friend_requests' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <UserPlus className="w-4 h-4 shrink-0 text-amber-500" />
            Friend Requests Area
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'posts' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-indigo-400" />
            My Publications & Posts
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'feed' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-black animate-pulse bg-rose-950/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Rss className="w-4 h-4 shrink-0 text-rose-400" />
            Community Activity Feed
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start relative ${
              activeTab === 'notifications' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-500 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0 text-rose-500" />
            My Notifications
            {notifications.some(n => !n.read) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-3 right-4 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-2.5 transition-all justify-start ${
              activeTab === 'favorites' ? 'bg-zinc-800 text-rose-450 border-l-2 border-rose-505 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
            }`}
          >
            <Heart className="w-4 h-4 shrink-0 text-rose-300" />
            Saved Gamers ({savedPlayersList.length})
          </button>

        </div>
      </div>

      {/* Main Form Fields View */}
      <div className="lg:col-span-3 bg-zinc-900/60 p-6 border border-zinc-805/85 rounded-2xl backdrop-blur-xl">
        <h2 className="text-xl font-extrabold text-white tracking-wide border-b border-zinc-800/40 pb-3 uppercase flex items-center gap-2 font-display">
          {activeTab === 'profile' && "Gamer Calibration Hub"}
          {activeTab === 'platinum_theme' && "👑 Platinum Legendary Theme Pack"}
          {activeTab === 'teams' && "My Squadron Command"}
          {activeTab === 'tournaments' && "Registered Tournaments Track"}
          {activeTab === 'payments' && "My Billing & Payments Desk"}
          {activeTab === 'verification' && "🛡️ Creator Badge Verification Desk"}
          {activeTab === 'advertisement' && "📢 Self-Advertisement Promotion Desk"}
          {activeTab === 'invoices' && "📑 My Invoice Ledger & Receipts"}
          {activeTab === 'membership' && "Esports Premium Upgrades Desk"}
          {activeTab === 'diamonds' && "💎 Diamond Shop & Economy Portal"}
          {activeTab === 'referrals' && "🤝 Affiliate Partnerships & Referrals Desk"}
          {activeTab === 'badges' && "My Certification Badges Chest"}
          {activeTab === 'messages' && "Tactical Chat Command Comms"}
          {activeTab === 'friends' && "My Friends Network"}
          {activeTab === 'friend_requests' && "Friend Requests Desk"}
          {activeTab === 'posts' && "My Publications & Posts"}
          {activeTab === 'feed' && "Community Tactical Activity Feed"}
          {activeTab === 'favorites' && "Starred Operatives List"}
        </h2>


        {/* Warning banner for default/incomplete profile */}
        {(!currentUser.bio || !currentUser.profilePhoto || (currentUser.favoriteGames || []).length === 0) && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold text-rose-400">Complete Your Gamer Profile</h4>
              <p className="text-xs text-zinc-400">Your profile is currently incomplete. Add a bio, select favorite games, and set a profile photo to unlock full networking benefits.</p>
            </div>
            {activeTab !== 'profile' && (
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs uppercase font-extrabold rounded-lg tracking-wider transition-all"
              >
                Complete your gamer profile
              </button>
            )}
          </div>
        )}

        {/* Tab content conditional routing */}
        <div className="mt-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Photo Upload Zone */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-800/20 pb-5">
                <div className="md:col-span-1 flex flex-col items-center justify-center p-2 bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <img 
                    src={avatarPhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                    alt="avatar" 
                    className="w-16 h-16 rounded-2xl object-cover border border-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[9px] font-mono mt-1.5 text-zinc-550 uppercase">Identity Faceplate</span>
                </div>
                <div className="md:col-span-2">
                  <UploadField 
                    id="user-avatar-upload"
                    bucketName="profile_photos"
                    label="Gamer Identity Avatar Photo"
                    value={avatarPhoto}
                    onChange={(url) => setAvatarPhoto(url)}
                    placeholder="Drop portfolio image here, or select"
                  />
                </div>
              </div>

              {/* Core Gaming Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Gamer Identity Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    value={gamerName}
                    onChange={(e) => setGamerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Competitive Skill Rating (MMR)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    value={skillRating}
                    onChange={(e) => setSkillRating(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">K/D Killing Ratio (Ratio)</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    value={kdRatio}
                    onChange={(e) => setKdRatio(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Global Win Percentage (%)</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    value={winRate}
                    onChange={(e) => setWinRate(e.target.value)}
                  />
                </div>
              </div>

              {/* Location parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-800/50 pt-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Country *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">State / Province</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">City / Node</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Bio block */}
              <div className="border-t border-zinc-800/50 pt-4">
                <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Pilot Narrative / Career Overview Biography *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Pitch your esports focus, career accomplishments, schedules..."
                  className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              {/* Favorite Games checkboxes */}
              <div className="border-t border-zinc-800/50 pt-4 space-y-2">
                <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-black">Favorite Games Supported *</label>
                <div className="flex flex-wrap gap-2">
                  {gamesList.map((game) => {
                    const isChecked = favGames.includes(game);
                    return (
                      <button
                        key={game}
                        type="button"
                        onClick={() => handleGameToggle(game)}
                        className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${
                          isChecked 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500 font-bold' 
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700/80'
                        }`}
                      >
                        {game}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Social URLs and Discord tag */}
              <div className="border-t border-zinc-800/50 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">YouTube URL</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Instagram Handle</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/..."
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Discord Tag</label>
                  <input
                    type="text"
                    placeholder="Username#0000"
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                  />
                </div>
              </div>

              {/* Premium Perks & Customizer Desk */}
              <div className="border-t border-zinc-800/80 pt-6 mt-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold font-display text-white tracking-wide uppercase">PREMIUM CUSTOMIZATION DESK</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">Calibrate active avatar frames, signature badges, stickers & cover graphics</p>
                  </div>
                </div>

                {!isPlatinum ? (
                  <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-3">
                    <Lock className="w-8 h-8 text-rose-500 mx-auto animate-pulse" />
                    <div>
                      <h5 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Premium Cosmetics Terminal Locked</h5>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 font-sans leading-relaxed">
                        Upgrade to Platinum Membership to unlock this feature.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('membership')}
                      className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-[9px] uppercase rounded-lg shadow-md tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>👑 Upgrade To Platinum</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      const isTierAllowed = (itemTier: 'Silver' | 'Gold' | 'Platinum' | 'All') => {
                        if (currentUser.membership === 'Platinum') return true;
                        if (currentUser.membership === 'Gold') return itemTier === 'Gold' || itemTier === 'Silver' || itemTier === 'All';
                        if (currentUser.membership === 'Silver') return itemTier === 'Silver' || itemTier === 'All';
                        return false;
                      };

                      const unlockedBadges = (adminSettings.badges || []).filter(b => isTierAllowed(b.tier));
                      const unlockedPacks = (adminSettings.stickerPacks || []).filter(p => isTierAllowed(p.tier));
                      const unlockedFrames = (adminSettings.profileFrames || []).filter(f => isTierAllowed(f.tier));
                      const unlockedBanners = (adminSettings.profileBanners || []).filter(b => isTierAllowed(b.tier));
                      const unlockedRewards = (adminSettings.premiumRewards || []).filter(r => isTierAllowed(r.tier));

                      return (
                        <div className="space-y-6">
                          {/* Profile Frame Selector */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black font-bold">Avatar Glow Border Selector ({unlockedFrames.length} unlocked)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <button
                                type="button"
                                onClick={() => setActiveFrame('')}
                                className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                  activeFrame === '' 
                                    ? 'border-rose-500 text-rose-400' 
                                    : 'border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full border border-zinc-800 mx-auto mb-1 flex items-center justify-center text-xs font-bold bg-zinc-900 select-none">✕</div>
                                <span className="text-[10px] font-mono block">No Frame</span>
                              </button>

                              {unlockedFrames.map((frame) => (
                                <button
                                  key={frame.id}
                                  type="button"
                                  onClick={() => setActiveFrame(frame.id)}
                                  className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                    activeFrame === frame.id 
                                      ? 'border-rose-500 text-rose-450' 
                                      : 'border-zinc-850 text-zinc-440 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="relative w-10 h-10 mx-auto mb-1 flex items-center justify-center">
                                    <img
                                      src={currentUser.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                                      className={`w-8 h-8 rounded-full object-cover ${frame.style}`}
                                      alt="preview"
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono block truncate" title={frame.name}>{frame.name}</span>
                                  <span className="text-[8px] opacity-60 font-mono block uppercase">{frame.tier}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Profile Banner Selector */}
                          {currentUser.membership !== 'Silver' && (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black font-semibold">Cover Banner Design Selector ({unlockedBanners.length} unlocked)</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setActiveBanner('')}
                                  className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                    activeBanner === '' 
                                      ? 'border-rose-500 text-rose-400 font-bold' 
                                      : 'border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="h-8 rounded-lg bg-zinc-900 border border-zinc-800 w-full mb-1"></div>
                                  <span className="text-[10px] font-mono block">Standard Black Banner</span>
                                </button>

                                {unlockedBanners.map((banner) => (
                                  <button
                                    key={banner.id}
                                    type="button"
                                    onClick={() => setActiveBanner(banner.id)}
                                    className={`p-3 rounded-xl border text-center transition-all bg-zinc-950/60 ${
                                      activeBanner === banner.id 
                                        ? 'border-rose-500 text-rose-400 font-bold' 
                                        : 'border-zinc-850 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                  >
                                    <div className={`h-8 rounded-lg w-full mb-1 ${banner.style}`}></div>
                                    <span className="text-[10px] font-mono block truncate" title={banner.name}>{banner.name}</span>
                                    <span className="text-[8px] opacity-60 font-mono block uppercase">{banner.tier}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Premium Sticker Selector */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black font-bold">Signature Profile Sticker ({unlockedPacks.length} packs unlocked)</label>
                            <p className="text-[9px] text-zinc-500 font-sans">Click on any unlocked emoji sticker below to activate it hovering near your gamer tag card across rosters!</p>
                            
                            <div className="space-y-3">
                              {unlockedPacks.map((pack) => (
                                <div key={pack.id} className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-1.5">
                                  <p className="text-[9px] font-mono text-zinc-400 uppercase font-bold">{pack.name} <span className="opacity-50 text-[8px]">({pack.tier})</span></p>
                                  <div className="flex gap-2 flex-wrap">
                                    {pack.stickers.map((sticker) => {
                                      const isSelected = activeSticker === sticker;
                                      return (
                                        <button
                                          key={sticker}
                                          type="button"
                                          onClick={() => setActiveSticker(isSelected ? '' : sticker)}
                                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all bg-zinc-900 border ${
                                            isSelected 
                                              ? 'border-rose-500 bg-rose-500/10 scale-110 ring-2 ring-rose-500/10' 
                                              : 'border-zinc-800 text-zinc-450 hover:border-zinc-700 hover:text-white'
                                          }`}
                                        >
                                          {sticker}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                              {activeSticker && (
                                <button
                                  type="button"
                                  onClick={() => setActiveSticker('')}
                                  className="text-[10px] font-mono text-rose-500 hover:text-rose-650 bg-zinc-950 border border-zinc-850 px-2.5 py-1 rounded"
                                >
                                  ✕ Defuse Active Sticker
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Dynamically Unlocked Badges & System rewards Display */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Unlocked Badges Panel */}
                            <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                              <h5 className="text-[10px] font-mono tracking-wider font-extrabold text-cyan-400 uppercase">UNLOCKED CERTIFICATION BADGES</h5>
                              {unlockedBadges.length === 0 ? (
                                <p className="text-[10px] text-zinc-600 italic pl-1 font-mono">No static tier badges configured.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {unlockedBadges.map((badge) => (
                                    <div key={badge.id} className="text-[10px] font-mono flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-805">
                                      <span className="text-zinc-300">{badge.name}</span>
                                      <span className="font-extrabold text-amber-400">{badge.icon}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Unlocked Rewards List */}
                            <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 font-mono text-xs">
                              <h5 className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-400 uppercase">UNLOCKED STATIONS REWARDS</h5>
                              {unlockedRewards.length === 0 ? (
                                <p className="text-[10px] text-zinc-650 italic pl-1 font-mono">No custom tier rewards defined in administration dashboard.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 font-sans text-[11px] leading-tight">
                                  {unlockedRewards.map((reward) => (
                                    <div key={reward.id} className="text-[10px] p-2.5 bg-zinc-900 rounded border border-zinc-805 space-y-1 text-zinc-400">
                                      <p className="font-bold text-white flex items-center gap-1 font-mono">✓ {reward.name}</p>
                                      <p className="text-[9px] text-zinc-400 leading-normal">"{reward.description}"</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Save Trigger */}
              <div className="pt-4 border-t border-zinc-800/40">
                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-xs tracking-wider uppercase px-6 py-3 rounded-xl flex items-center gap-1.5 transition-all neon-glow-pink cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Calibration Files
                </button>
              </div>
            </form>
          )}
          {activeTab === 'platinum_theme' && (
            <div className="space-y-6">
              {!isPlatinum ? (
                <div className="p-10 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-4 max-w-lg mx-auto my-12 shadow-2xl">
                  <div className="w-16 h-16 rounded-full bg-rose-955/35 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 animate-pulse">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest">👑 Platinum legendary Customizer Locked</h4>
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                      Upgrade to Platinum Membership to unlock this feature.
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                      Platinum Members unlock the Legendary Space Plasma Theme, Animated Particle Overlays, VIP HUD dashboards, Custom Profile backdrops, and exclusive visual card frameworks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('membership')}
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-mono font-black text-[10px] uppercase rounded-xl tracking-widest transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse cursor-pointer inline-block"
                  >
                    🚀 Upgrade To Platinum VIP Membership
                  </button>
                </div>
              ) : (
                <>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!isPlatinum) {
                        addToast("Upgrade to Platinum Membership to unlock this feature.", "error");
                        return;
                      }
                  
                  // PART G: Save logs
                  console.log("Submitting Platinum configurations update request with fields:");
                  console.log("platinum_theme_enabled:", platinumThemeEnabled);
                  console.log("platinum_background_url:", platinumBackgroundUrl);
                  console.log("platinum_overlay_url:", platinumOverlayUrl);
                  console.log("platinum_profile_card_url:", platinumProfileCardUrl);
                  console.log("active_banner_url:", platinumBannerUrl);
                  console.log("selected_banner:", selectedBanner);

                  onUpdateProfile({
                    platinum_theme_enabled: platinumThemeEnabled,
                    platinum_background_url: platinumBackgroundUrl,
                    platinum_overlay_url: platinumOverlayUrl,
                    platinum_profile_card_url: platinumProfileCardUrl,
                    active_banner_url: platinumBannerUrl,
                    selected_banner: selectedBanner,
                    platinum_hud_assets: JSON.stringify({
                      xp: platinumHudXp,
                      rank: platinumHudRank,
                      trophies: platinumHudTrophies,
                      followers: platinumHudFollowers,
                      selected_hud_cards: selectedHudCards
                    })
                  });
                  // PART D: Immediate UI Sync success notification
                  addToast("Platinum theme saved successfully.", "success");
                }} 
                className="space-y-6"
              >
                {/* Theme Enable/Disable Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-white block">Legendary Platinum Theme Activation</label>
                    <span className="text-[10px] text-zinc-500 font-mono">When toggled on, your profile displays customized layouts, glows, and overlays.</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPlatinumThemeEnabled(true);
                        setPlatinumBackgroundUrl(PLATINUM_DEFAULTS.background);
                        setPlatinumOverlayUrl(PLATINUM_DEFAULTS.particleOverlay);
                        setPlatinumProfileCardUrl(PLATINUM_DEFAULTS.profileCard);
                        setPlatinumHudXp(PLATINUM_DEFAULTS.hudCards[0]);
                        setPlatinumHudRank(PLATINUM_DEFAULTS.hudCards[1]);
                        setPlatinumHudTrophies(PLATINUM_DEFAULTS.hudCards[2]);
                        setPlatinumHudFollowers(PLATINUM_DEFAULTS.hudCards[3]);
                        setSelectedHudCards(PLATINUM_DEFAULTS.hudCards);
                        
                        if (currentUser.membership === 'Platinum') {
                          onUpdateProfile({
                            platinum_theme_enabled: true,
                            platinum_background_url: PLATINUM_DEFAULTS.background,
                            platinum_overlay_url: PLATINUM_DEFAULTS.particleOverlay,
                            platinum_profile_card_url: PLATINUM_DEFAULTS.profileCard,
                            active_banner_url: PLATINUM_DEFAULTS.banner,
                            platinum_hud_assets: JSON.stringify({
                              xp: PLATINUM_DEFAULTS.hudCards[0],
                              rank: PLATINUM_DEFAULTS.hudCards[1],
                              trophies: PLATINUM_DEFAULTS.hudCards[2],
                              followers: PLATINUM_DEFAULTS.hudCards[3],
                              selected_hud_cards: PLATINUM_DEFAULTS.hudCards
                            })
                          });
                          addToast("Successfully applied & written default Platinum Pack URLs to Supabase! ✨", "success");
                        } else {
                          addToast("Simulated default config loading locally! ✨", "info");
                        }
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-mono font-black text-[9px] uppercase rounded-lg tracking-widest transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    >
                      ✨ Apply Default Platinum Theme
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatinumThemeEnabled(!platinumThemeEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        platinumThemeEnabled ? 'bg-rose-500' : 'bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          platinumThemeEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Dynamic Asset Selection Galleries */}
                <div className="space-y-6">
                  
                  {/* Category 1: Background Canvas */}
                  <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <label className="block text-[10px] font-mono tracking-wider font-extrabold text-cyan-400 uppercase">
                        🌌 1. Animated Background Canvas
                      </label>
                      <span className="text-[8px] text-zinc-550 font-mono">profile_backgrounds folder</span>
                    </div>
                    {isLoadingStorage ? (
                      <div className="text-[10px] font-mono text-zinc-500 animate-pulse">Loading gallery files recursively from Supabase Storage...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(backgroundAssets.length > 0 ? backgroundAssets : [
                          PLATINUM_DEFAULTS.background,
                          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
                          "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800&auto=format&fit=crop&q=80",
                          "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80"
                        ]).map((url, idx) => {
                          const fileName = url.split('/').pop() || `background_${idx + 1}`;
                          const isSelected = platinumBackgroundUrl === url;
                          return (
                            <div 
                              key={idx} 
                              className={`relative border rounded-xl overflow-hidden bg-zinc-950 p-2 transition-all group flex flex-col justify-between ${
                                isSelected 
                                  ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30' 
                                  : 'border-zinc-850 hover:border-zinc-700'
                              }`}
                            >
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-900 bg-zinc-950 relative">
                                <img src={url} alt={fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                              </div>
                              <div className="mt-1.5 text-[8px] font-mono text-zinc-400 truncate" title={fileName}>
                                {fileName}
                              </div>
                              <button
                                type="button"
                                onClick={() => setPlatinumBackgroundUrl(url)}
                                className={`mt-2 w-full py-1 text-[8px] font-mono uppercase font-black rounded transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                              >
                                {isSelected ? "👑 Selected" : "Select"}
                              </button>
                              
                              {currentUser.membership !== 'Platinum' && (
                                <div className="absolute top-2 right-2 bg-black/80 px-1 py-0.5 rounded border border-zinc-800 text-[8px]" title="Simulation preview active">
                                  🔒
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Category 2: Cyber overlays */}
                  <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <label className="block text-[10px] font-mono tracking-wider font-extrabold text-indigo-400 uppercase">
                        💫 2. Cyber Overlays Frame
                      </label>
                      <span className="text-[8px] text-zinc-550 font-mono">overlays folder</span>
                    </div>
                    {isLoadingStorage ? (
                      <div className="text-[10px] font-mono text-zinc-500 animate-pulse">Loading gallery files recursively from Supabase Storage...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(overlayAssets.length > 0 ? overlayAssets : [
                          PLATINUM_DEFAULTS.particleOverlay,
                          PLATINUM_DEFAULTS.electricOverlay,
                          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
                          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80"
                        ]).map((url, idx) => {
                          const fileName = url.split('/').pop() || `overlay_${idx + 1}`;
                          const isSelected = platinumOverlayUrl === url;
                          return (
                            <div 
                              key={idx} 
                              className={`relative border rounded-xl overflow-hidden bg-zinc-950 p-2 transition-all group flex flex-col justify-between ${
                                isSelected 
                                  ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30' 
                                  : 'border-zinc-850 hover:border-zinc-700'
                              }`}
                            >
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-900 bg-zinc-950 relative">
                                <img src={url} alt={fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                              </div>
                              <div className="mt-1.5 text-[8px] font-mono text-zinc-400 truncate" title={fileName}>
                                {fileName}
                              </div>
                              <button
                                type="button"
                                onClick={() => setPlatinumOverlayUrl(url)}
                                className={`mt-2 w-full py-1 text-[8px] font-mono uppercase font-black rounded transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                              >
                                {isSelected ? "👑 Selected" : "Select"}
                              </button>
                              
                              {currentUser.membership !== 'Platinum' && (
                                <div className="absolute top-2 right-2 bg-black/80 px-1 py-0.5 rounded border border-zinc-800 text-[8px]" title="Simulation preview active">
                                  🔒
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Category 3: Banners */}
                  <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <label className="block text-[10px] font-mono tracking-wider font-extrabold text-amber-500 uppercase">
                        🚩 3. Profile Banner Artwork
                      </label>
                      <span className="text-[8px] text-zinc-550 font-mono">banners folder</span>
                    </div>
                    {isLoadingStorage ? (
                      <div className="text-[10px] font-mono text-zinc-500 animate-pulse">Loading gallery files recursively from Supabase Storage...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(bannerAssets.length > 0 ? bannerAssets : [
                          PLATINUM_DEFAULTS.banner,
                          "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80"
                        ]).map((url, idx) => {
                          const fileName = url.split('/').pop() || `banner_${idx + 1}`;
                          const isSelected = platinumBannerUrl === url;
                          return (
                            <div 
                              key={idx} 
                              className={`relative border rounded-xl overflow-hidden bg-zinc-950 p-2 transition-all group flex flex-col justify-between ${
                                isSelected 
                                  ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30' 
                                  : 'border-zinc-850 hover:border-zinc-700'
                              }`}
                            >
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-900 bg-zinc-950 relative">
                                <img src={url} alt={fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                              </div>
                              <div className="mt-1.5 text-[8px] font-mono text-zinc-400 truncate" title={fileName}>
                                {fileName}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPlatinumBannerUrl(url);
                                  setSelectedBanner(fileName);
                                }}
                                className={`mt-2 w-full py-1 text-[8px] font-mono uppercase font-black rounded transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                              >
                                {isSelected ? "👑 Selected" : "Select"}
                              </button>
                              
                              {currentUser.membership !== 'Platinum' && (
                                <div className="absolute top-2 right-2 bg-black/80 px-1 py-0.5 rounded border border-zinc-800 text-[8px]" title="Simulation preview active">
                                  🔒
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Category 4: Stats Card Background */}
                  <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <label className="block text-[10px] font-mono tracking-wider font-extrabold text-yellow-500 uppercase">
                        💳 4. Stats Card Background
                      </label>
                      <span className="text-[8px] text-zinc-550 font-mono">profile_cards folder</span>
                    </div>
                    {isLoadingStorage ? (
                      <div className="text-[10px] font-mono text-zinc-500 animate-pulse">Loading gallery files recursively from Supabase Storage...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(profileCardAssets.length > 0 ? profileCardAssets : [
                          PLATINUM_DEFAULTS.profileCard,
                          "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80",
                          "https://images.unsplash.com/photo-1618005198143-e5283464303b?w=500&auto=format&fit=crop&q=80"
                        ]).map((url, idx) => {
                          const fileName = url.split('/').pop() || `card_${idx + 1}`;
                          const isSelected = platinumProfileCardUrl === url;
                          return (
                            <div 
                              key={idx} 
                              className={`relative border rounded-xl overflow-hidden bg-zinc-950 p-2 transition-all group flex flex-col justify-between ${
                                isSelected 
                                  ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/30' 
                                  : 'border-zinc-850 hover:border-zinc-700'
                              }`}
                            >
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-900 bg-zinc-950 relative">
                                <img src={url} alt={fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                              </div>
                              <div className="mt-1.5 text-[8px] font-mono text-zinc-400 truncate" title={fileName}>
                                {fileName}
                              </div>
                              <button
                                type="button"
                                onClick={() => setPlatinumProfileCardUrl(url)}
                                className={`mt-2 w-full py-1 text-[8px] font-mono uppercase font-black rounded transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                              >
                                {isSelected ? "👑 Selected" : "Select"}
                              </button>
                              
                              {currentUser.membership !== 'Platinum' && (
                                <div className="absolute top-2 right-2 bg-black/80 px-1 py-0.5 rounded border border-zinc-800 text-[8px]" title="Simulation preview active">
                                  🔒
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Category 5: HUD Cards */}
                  <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <label className="block text-[10px] font-mono tracking-wider font-extrabold text-emerald-400 uppercase">
                        🏆 5. Multiple Selected HUD Cards (Click to toggling multiple backgrounds)
                      </label>
                      <span className="text-[8px] text-zinc-550 font-mono">hud_stats folder</span>
                    </div>
                    {isLoadingStorage ? (
                      <div className="text-[10px] font-mono text-zinc-500 animate-pulse">Loading gallery files recursively from Supabase Storage...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(hudAssets.length > 0 ? hudAssets : PLATINUM_DEFAULTS.hudCards).map((url, idx) => {
                          const fileName = url.split('/').pop() || `hud_${idx + 1}`;
                          const isSelected = selectedHudCards.includes(url);
                          const handleToggleHud = () => {
                            if (isSelected) {
                              setSelectedHudCards(selectedHudCards.filter((u) => u !== url));
                            } else {
                              setSelectedHudCards([...selectedHudCards, url]);
                            }
                          };
                          return (
                            <div 
                              key={idx} 
                              className={`relative border rounded-xl overflow-hidden bg-zinc-950 p-2 transition-all group flex flex-col justify-between ${
                                isSelected 
                                  ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/30' 
                                  : 'border-zinc-850 hover:border-zinc-700'
                              }`}
                            >
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-zinc-900 bg-zinc-950 relative flex items-center justify-center p-2">
                                <img src={url} alt={fileName} className="w-auto h-full object-contain group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                              </div>
                              <div className="mt-1.5 text-[8px] font-mono text-zinc-400 truncate" title={fileName}>
                                {fileName}
                              </div>
                              <button
                                type="button"
                                onClick={handleToggleHud}
                                className={`mt-2 w-full py-1 text-[8px] font-mono uppercase font-black rounded transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-500 text-white animate-pulse'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                              >
                                {isSelected ? "✓ Selected" : "Select"}
                              </button>
                              
                              {currentUser.membership !== 'Platinum' && (
                                <div className="absolute top-2 right-2 bg-black/80 px-1 py-0.5 rounded border border-zinc-800 text-[8px]" title="Simulation preview active">
                                  🔒
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Customizable HUD Metric Parameters card */}
                <div className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-4">
                  <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                    <label className="block text-[10px] font-mono tracking-wider font-extrabold text-rose-450 uppercase leading-none">6. Customizable HUD Metric Badges (Text overrides)</label>
                    <span className="text-[8px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold leading-none uppercase">Live Overrides Node</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[10px]">
                    {/* XP Override */}
                    <div className="space-y-1">
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">XP OVERRIDE</span>
                      <input 
                        type="text" 
                        value={platinumHudXp} 
                        onChange={(e) => setPlatinumHudXp(e.target.value)} 
                        placeholder="e.g. 98,750 XP"
                        className="w-full bg-zinc-950 border border-zinc-805 rounded px-2.5 py-1.5 text-zinc-200 font-sans tracking-wide"
                      />
                    </div>
                    
                    {/* Rank Keyword Override */}
                    <div className="space-y-1">
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">RANK BADGE TITLE</span>
                      <input 
                        type="text" 
                        value={platinumHudRank} 
                        onChange={(e) => setPlatinumHudRank(e.target.value)} 
                        placeholder="e.g. CHAMPION"
                        className="w-full bg-zinc-950 border border-zinc-805 rounded px-2.5 py-1.5 text-zinc-200 font-sans tracking-wide"
                      />
                    </div>

                    {/* Trophies Count */}
                    <div className="space-y-1">
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">TROPHIES SECURED</span>
                      <input 
                        type="text" 
                        value={platinumHudTrophies} 
                        onChange={(e) => setPlatinumHudTrophies(e.target.value)} 
                        placeholder="e.g. 48 GOLD"
                        className="w-full bg-zinc-950 border border-zinc-805 rounded px-2.5 py-1.5 text-zinc-200 font-sans tracking-wide"
                      />
                    </div>

                    {/* Followers Count */}
                    <div className="space-y-1">
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">FOLLOWERS COUNT</span>
                      <input 
                        type="text" 
                        value={platinumHudFollowers} 
                        onChange={(e) => setPlatinumHudFollowers(e.target.value)} 
                        placeholder="e.g. 154,200"
                        className="w-full bg-zinc-950 border border-zinc-805 rounded px-2.5 py-1.5 text-zinc-200 font-sans tracking-wide"
                      />
                    </div>
                  </div>
                </div>

                {/* ACTIVE LIVE PREVIEW (Satisfies dashboard settings with real-time preview requirement) */}
                <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-850/80 space-y-2">
                  <h5 className="text-[10px] font-mono tracking-widest font-extrabold text-emerald-400 uppercase">ACTIVE REAL-TIME WORKSPACE CONFIGURATION PREVIEW</h5>
                  
                  <div className="platinum-profile-theme electric_sweep_overlay border rounded-xl p-5 relative overflow-hidden bg-cover bg-center" style={{
                    backgroundImage: `url("${platinumBackgroundUrl}")`,
                  }}>
                    {/* Overlay URL fallback */}
                    {platinumThemeEnabled && (
                      <img 
                        src={platinumOverlayUrl || getThemePackAssetUrl('overlays/platinum_particle_overlay.svg')} 
                        alt="theme overlay" 
                        className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none z-0 mix-blend-screen"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    <div className="absolute inset-0 cyber-grid-moving-platinum opacity-15 z-0 pointer-events-none"></div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3.5 mb-4 relative z-20 text-center sm:text-left">
                      <div className="shrink-0 relative">
                        {/* Rotating Energy ring element indicator */}
                        <div className="absolute inset-x-0 inset-y-0 p-1">
                          <svg className="w-16 h-16 animate-rotateRing text-rose-500" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="12, 10" />
                          </svg>
                        </div>
                        <img 
                          src={currentUser.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"} 
                          className="w-14 h-14 rounded-full border border-rose-500 object-cover relative z-10 m-1" 
                          alt="avatar preview"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-extrabold tracking-wide flex items-center justify-center sm:justify-start gap-1">
                          <span className="platinum-name-glow text-lg uppercase font-black">{currentUser.gamerName || 'GAMER'}</span>
                          <span className="text-[8px] bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-2 py-0.5 rounded font-mono font-extrabold animate-pulse">VIP</span>
                        </h3>
                        <p className="text-[9px] text-zinc-500 font-mono tracking-widest mt-0.5">PLATINUM LEVEL PREVIEW MODE</p>
                      </div>
                    </div>

                    {/* Overridden stats grid cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4 relative z-15">
                      <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.05] p-2 rounded-lg text-center" style={{ backgroundImage: `url("${platinumProfileCardUrl}")`, backgroundSize: 'cover' }}>
                        <span className="text-[8px] text-zinc-400 font-mono block">SKILL LEVEL</span>
                        <span className="text-sm font-black text-rose-400">{(currentUser.skillRating || 1500)}</span>
                      </div>
                      <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.05] p-2 rounded-lg text-center" style={{ backgroundImage: `url("${platinumProfileCardUrl}")`, backgroundSize: 'cover' }}>
                        <span className="text-[8px] text-indigo-300 font-mono block">RANK OVERRIDE</span>
                        <span className="text-[10px] font-black text-amber-400 block truncate font-mono uppercase">{platinumHudRank || 'TACTICAL ELITE'}</span>
                      </div>
                      <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.05] p-2 rounded-lg text-center" style={{ backgroundImage: `url("${platinumProfileCardUrl}")`, backgroundSize: 'cover' }}>
                        <span className="text-[8px] text-zinc-400 font-mono block">TROPHIES</span>
                        <span className="text-xs font-black font-mono text-cyan-400 uppercase">{platinumHudTrophies || '12 SECURED'}</span>
                      </div>
                      <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.05] p-2 rounded-lg text-center" style={{ backgroundImage: `url("${platinumProfileCardUrl}")`, backgroundSize: 'cover' }}>
                        <span className="text-[8px] text-zinc-550 font-mono block">FOLLOWERS</span>
                        <span className="text-xs font-black font-mono text-fuchsia-400 block truncate">{platinumHudFollowers || '3,750'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Settings Trigger */}
                <div className="pt-4 border-t border-zinc-800/40 flex items-center justify-between">
                  <p className="text-[9px] text-zinc-500 font-mono">Changes sync directly to the Supabase Postgres relational database network.</p>
                  {currentUser.membership !== 'Platinum' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('membership')}
                      className="bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-mono font-bold text-xs tracking-wider uppercase px-6 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse cursor-pointer"
                    >
                      👑 Upgrade to Enable Saving
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-mono font-bold text-xs tracking-wider uppercase px-6 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      Save Platinum Configs
                    </button>
                  )}
                </div>

              </form>
              </>
              )}
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Directly command your formed squads or exit teams you have registered with as recruits.</p>
              
              {userTeams.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">No active squad affiliations detected.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userTeams.map(team => (
                    <div key={team.id} className="p-4 bg-zinc-950/70 border border-zinc-805 rounded-xl space-y-3">
                      <div className="flex gap-3 items-center">
                        <img src={team.logo || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150"} alt={team.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="text-sm font-extrabold text-white">{team.name}</h4>
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/20 uppercase font-bold">{team.game}</span>
                        </div>
                      </div>
                      <p className="text-zinc-500 text-xs lines-clamp-2">"{team.bio}"</p>
                      <div className="flex justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2 font-mono">
                        <span>COMMANDER: {team.creatorGamerName}</span>
                        <span>ROSTER SIZE: {team.members.length} / 5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tournaments' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-base font-black font-mono text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                    Tournament Control Room
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">Monitor your active matchups, slots, scores, and battle history logs.</p>
                </div>
              </div>

              {/* Tournament Section Sub tabs */}
              <div className="flex flex-wrap gap-2 border-b border-zinc-800/80 pb-3 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => setTourneySubTab('slots')}
                  className={`px-3 py-2 rounded-lg border uppercase tracking-wider transition-all cursor-pointer font-bold ${
                    tourneySubTab === 'slots' 
                      ? 'bg-rose-500/10 border-rose-500/35 text-rose-400 font-black' 
                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white'
                  }`}
                >
                  Slots Registered
                </button>
                <button
                  type="button"
                  onClick={() => setTourneySubTab('matches')}
                  className={`px-3 py-2 rounded-lg border uppercase tracking-wider transition-all cursor-pointer font-bold flex items-center gap-1 ${
                    tourneySubTab === 'matches' 
                      ? 'bg-rose-500/10 border-rose-500/35 text-rose-400 font-black' 
                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white'
                  }`}
                >
                  ⚔ My Active Matches
                </button>
                <button
                  type="button"
                  onClick={() => setTourneySubTab('results')}
                  className={`px-3 py-2 rounded-lg border uppercase tracking-wider transition-all cursor-pointer font-bold flex items-center gap-1 ${
                    tourneySubTab === 'results' 
                      ? 'bg-rose-500/10 border-rose-500/35 text-rose-400 font-black' 
                      : 'bg-zinc-900 border-zinc-900 text-zinc-500 hover:text-white'
                  }`}
                >
                  📊 Completed Results
                </button>
                <button
                  type="button"
                  onClick={() => setTourneySubTab('history')}
                  className={`px-3 py-2 rounded-lg border uppercase tracking-wider transition-all cursor-pointer font-bold flex items-center gap-1 ${
                    tourneySubTab === 'history' 
                      ? 'bg-rose-500/10 border-rose-500/35 text-rose-400 font-black' 
                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white'
                  }`}
                >
                  📜 Tournament History
                </button>
              </div>

              {tourneySubTab === 'slots' && (
                <div className="space-y-4">
                  {(() => {
                    const myTeamIds = userTeams.map(ut => ut.id);
                    const myRegistrations = registrations.filter(r => r.user_id === currentUser?.id || (r.team_id && myTeamIds.includes(r.team_id)));

                    if (myRegistrations.length === 0) {
                      return (
                        <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-850">
                          <Trophy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <p className="text-xs font-mono text-zinc-500">No active tournament slots found.</p>
                          <p className="text-[10px] text-zinc-650 font-mono mt-1">Visit the "Arena Tournaments" page to purchase entry or enroll!</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 gap-3.5">
                        {myRegistrations.map(reg => {
                          const t = tournaments?.find(tour => tour.id === reg.tournament_id);
                          if (!t) return null;

                          const statusColors: Record<string, string> = {
                            pending: 'text-amber-400 bg-amber-400/5 border-amber-500/20',
                            approved: 'text-emerald-400 bg-emerald-400/5 border-emerald-500/20',
                            rejected: 'text-rose-450 bg-rose-500/5 border-rose-505/15'
                          };

                          const paymentColors: Record<string, string> = {
                            pending: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5',
                            paid: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
                            unneeded: 'text-zinc-500 border-zinc-800 bg-zinc-900/40',
                            rejected: 'text-red-400 border-red-500/10 bg-red-500/5'
                          };

                          return (
                            <div key={reg.id} className="p-4 bg-zinc-950/80 border border-zinc-855 hover:border-zinc-750 transition-all duration-300 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
                              <div className="space-y-1">
                                <span className="text-[9px] font-mono font-bold tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-md uppercase">
                                  {t.game}
                                </span>
                                <h4 className="text-sm font-extrabold text-white tracking-tight mt-1">{t.title}</h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500 font-mono pt-1">
                                  <span>FORMAT: <span className="text-zinc-300">{reg.registration_type.toUpperCase()}</span></span>
                                  {reg.team_id && (
                                    <span>
                                      TEAM ID: <span className="text-zinc-305">{reg.team_id.substring(0, 8)}</span>
                                    </span>
                                  )}
                                  <span className="text-zinc-700">•</span>
                                  <span>FILED: {new Date(reg.registered_at).toLocaleDateString()}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 self-stretch md:self-auto justify-between md:justify-end border-t border-zinc-900 md:border-0 pt-3 md:pt-0">
                                {/* Payment Status */}
                                {t.entry_fee && t.entry_fee.toLowerCase() !== 'free' && t.entry_fee !== '0' && (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-mono text-zinc-500 uppercase mb-0.5">PAYMENT</span>
                                    <span className={`text-[9px] uppercase font-mono px-2.5 py-1 rounded-md border font-extrabold flex items-center gap-1 leading-none ${paymentColors[reg.payment_status] || 'text-zinc-500'}`}>
                                      {reg.payment_status}
                                    </span>
                                    {reg.transaction_id && (
                                      <span className="text-[8px] font-mono text-zinc-505 mt-1 block">TxID: {reg.transaction_id}</span>
                                    )}
                                  </div>
                                )}

                                {/* Registration Status */}
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] font-mono text-zinc-500 uppercase mb-0.5">SLOT STATUS</span>
                                  <span className={`text-[9.5px] uppercase font-mono px-3 py-1 rounded-md border font-black tracking-wider leading-none ${statusColors[reg.status] || 'text-zinc-500'}`}>
                                    {reg.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {tourneySubTab === 'matches' && (
                <div className="space-y-4">
                  {isLoadingDashboardMatches ? (
                    <p className="text-xs text-zinc-500 font-mono italic animate-pulse">Loading active arena list...</p>
                  ) : (() => {
                    const myTeamIds = userTeams.map(ut => ut.id);
                    const activeMatchups = dashboardMatches.filter(m => {
                      const isMySolo = m.player1UserId === currentUser?.id || m.player2UserId === currentUser?.id;
                      const isMyTeam = (m.team1Id && myTeamIds.includes(m.team1Id)) || (m.team2Id && myTeamIds.includes(m.team2Id));
                      return (isMySolo || isMyTeam) && (m.status === 'live' || m.status === 'pending');
                    });

                    if (activeMatchups.length === 0) {
                      return (
                        <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-850">
                          <Gamepad2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <p className="text-xs font-mono text-zinc-500">No active or upcoming matches scheduled.</p>
                          <p className="text-[10px] text-zinc-650 font-mono mt-1">When brackets lock and matches begin, your opponent matchups will list here!</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeMatchups.map(m => {
                          const tourney = tournaments?.find(t => t.id === m.tournament_id);
                          const isSolo = tourney?.registrationType === 'solo';

                          const p1Id = isSolo ? m.player1UserId : m.team1Id;
                          const p2Id = isSolo ? m.player2UserId : m.team2Id;

                          const p1Name = getParticipantGlobalName(p1Id, tourney?.registrationType || 'solo');
                          const p2Name = getParticipantGlobalName(p2Id, tourney?.registrationType || 'solo');

                          return (
                            <div key={m.id} className="p-4 bg-zinc-950 border border-zinc-850/60 rounded-2xl space-y-3.5 relative overflow-hidden shadow-md">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                              <div className="flex justify-between items-center text-[9px] font-mono leading-none">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider">{tourney?.title || "CODM Tournament"}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  m.status === 'live' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-450 animate-pulse' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                                }`}>
                                  {m.status}
                                </span>
                              </div>

                              <p className="text-xs font-mono font-bold text-zinc-400">Match #{m.matchNumber} - Round {m.roundNumber}</p>

                              <div className="flex items-center justify-between gap-2.5 py-1">
                                <span className={`flex-1 text-center py-2 px-3 rounded-lg border text-xs font-bold leading-tight truncate ${
                                  p1Id === currentUser?.id ? 'bg-rose-500/5 border-rose-500/25 text-rose-455 font-extrabold' : 'bg-zinc-900 border-zinc-850 text-zinc-300'
                                }`}>
                                  {p1Name}
                                </span>
                                <span className="text-[10px] font-mono font-black text-zinc-550">VS</span>
                                <span className={`flex-1 text-center py-2 px-3 rounded-lg border text-xs font-bold leading-tight truncate ${
                                  p2Id === currentUser?.id ? 'bg-rose-500/5 border-rose-500/25 text-rose-455 font-extrabold' : 'bg-zinc-900 border-zinc-850 text-zinc-300'
                                }`}>
                                  {p2Name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {tourneySubTab === 'results' && (
                <div className="space-y-4">
                  {isLoadingDashboardMatches ? (
                    <p className="text-xs text-zinc-500 font-mono italic animate-pulse">Loading completed results list...</p>
                  ) : (() => {
                    const myTeamIds = userTeams.map(ut => ut.id);
                    const completedMatchups = dashboardMatches.filter(m => {
                      const isMySolo = m.player1UserId === currentUser?.id || m.player2UserId === currentUser?.id;
                      const isMyTeam = (m.team1Id && myTeamIds.includes(m.team1Id)) || (m.team2Id && myTeamIds.includes(m.team2Id));
                      return (isMySolo || isMyTeam) && (m.status === 'completed' || m.status === 'disputed');
                    });

                    if (completedMatchups.length === 0) {
                      return (
                        <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-850">
                          <Eye className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <p className="text-xs font-mono text-zinc-500">No completed match results found.</p>
                          <p className="text-[10px] text-zinc-650 font-mono mt-1">Your past tournament results, verified scores, and screenshots will list here!</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {completedMatchups.map(m => {
                          const tourney = tournaments?.find(t => t.id === m.tournament_id);
                          const isSolo = tourney?.registrationType === 'solo';

                          const p1Id = isSolo ? m.player1UserId : m.team1Id;
                          const p2Id = isSolo ? m.player2UserId : m.team2Id;

                          const p1Name = getParticipantGlobalName(p1Id, tourney?.registrationType || 'solo');
                          const p2Name = getParticipantGlobalName(p2Id, tourney?.registrationType || 'solo');

                          const winnerId = isSolo ? m.winnerUserId : m.winnerTeamId;
                          const winnerName = getParticipantGlobalName(winnerId, tourney?.registrationType || 'solo');

                          const result = dashboardResults.find(r => r.match_id === m.id);

                          return (
                            <div key={m.id} className="p-4 bg-zinc-950 border border-zinc-855 rounded-2xl space-y-3 shadow-md relative overflow-hidden">
                              <div className="flex justify-between items-center text-[9px] font-mono leading-none">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider">{tourney?.title}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  m.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/25 text-amber-500'
                                }`}>
                                  {m.status}
                                </span>
                              </div>

                              <p className="text-xs font-mono font-bold text-zinc-400">Match #{m.matchNumber} - Round {m.roundNumber}</p>

                              <div className="flex items-center justify-between gap-2.5 py-1">
                                <span className={`flex-1 text-center py-1 px-2.5 rounded-lg border text-xs leading-tight truncate ${
                                  winnerId && winnerId === p1Id ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-bold' : 'bg-zinc-900 border-zinc-850 text-zinc-300'
                                }`}>
                                  {p1Name}
                                </span>
                                <span className="text-[10px] font-mono font-black text-zinc-550">VS</span>
                                <span className={`flex-1 text-center py-1 px-2.5 rounded-lg border text-xs leading-tight truncate ${
                                  winnerId && winnerId === p2Id ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-bold' : 'bg-zinc-900 border-zinc-850 text-zinc-300'
                                }`}>
                                  {p2Name}
                                </span>
                              </div>

                              <div className="border-t border-zinc-900 pt-2.5 space-y-1.5 text-[10px] font-mono text-zinc-400">
                                <div className="flex justify-between items-center font-bold text-[10.5px]">
                                  <span>🏆 WINNER:</span>
                                  <span className="text-emerald-400 font-extrabold">{winnerName}</span>
                                </div>
                                {result?.score && (
                                  <div className="flex justify-between items-center">
                                    <span>SCORE:</span>
                                    <span className="text-amber-400 font-bold">{result.score}</span>
                                  </div>
                                )}
                                {result?.result_screenshot_url && (
                                  <div className="pt-1.5 space-y-1">
                                    <span className="text-[8px] text-zinc-500 block uppercase">Screenshot Proof:</span>
                                    <a 
                                      href={result.result_screenshot_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      referrerPolicy="no-referrer"
                                      className="block w-full overflow-hidden rounded-lg border border-zinc-900 hover:border-amber-500/40"
                                    >
                                      <img 
                                        src={result.result_screenshot_url} 
                                        alt="Proof" 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-16 object-cover" 
                                      />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {tourneySubTab === 'history' && (
                <div className="space-y-6">
                  {/* Part 1: Official Placements & Achievements */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-900">
                      <span className="text-sm">🏆</span>
                      <h4 className="text-xs font-black font-mono text-amber-500 uppercase tracking-wider">Hall of Champions & Placement Log</h4>
                    </div>
                    {currentUser.tournamentHistory && currentUser.tournamentHistory.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {currentUser.tournamentHistory.map((hist: any) => {
                          const isChamp = hist.rank?.toLowerCase().includes("champion") || hist.rank?.includes("🏆");
                          return (
                            <div 
                              key={hist.id} 
                              className={`p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between h-28 border ${
                                isChamp 
                                  ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)] shadow-amber-500/10' 
                                  : 'bg-zinc-950 border-zinc-900'
                              }`}
                            >
                              {isChamp && (
                                <div className="absolute top-2 right-2 bg-amber-500 text-black text-[7.5px] font-black font-mono uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                                  <span>🏆 Champion Badge</span>
                                </div>
                              )}
                              
                              <div className="space-y-1 pr-14">
                                <span className="text-[8px] font-mono text-zinc-500 uppercase block">{hist.date}</span>
                                <h5 className="text-xs font-bold text-white uppercase truncate" title={hist.tournamentName}>
                                  {hist.tournamentName}
                                </h5>
                              </div>

                              <div className="flex justify-between items-end pt-2 border-t border-zinc-900">
                                <div>
                                  <span className="text-[8px] font-mono text-zinc-550 block uppercase">PLACEMENT</span>
                                  <span className={`text-xs font-black font-display uppercase ${isChamp ? 'text-amber-400' : 'text-zinc-300'}`}>
                                    {hist.rank || "Participant"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-mono text-zinc-550 block uppercase">PRIZE WON</span>
                                  <span className="text-xs font-black font-mono text-cyan-400">
                                    💎 {hist.prizeWon || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-zinc-950/30 rounded-2xl border border-zinc-900 border-dashed">
                        <p className="text-[10px] text-zinc-500 font-mono italic">No official champion titles or placements logged yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Part 2: Participation log */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-900">
                      <span className="text-sm">⚔</span>
                      <h4 className="text-xs font-black font-mono text-zinc-400 uppercase tracking-wider">Historical Enrolled Arenas</h4>
                    </div>
                    {(() => {
                      // Match tournaments from user registrations
                      const myTeamIds = userTeams.map(ut => ut.id);
                      const myRegIds = registrations
                        .filter(r => r.user_id === currentUser?.id || (r.team_id && myTeamIds.includes(r.team_id)))
                        .map(r => r.tournament_id);
                      
                      const uniqueTourneyIds = Array.from(new Set(myRegIds));
                      const enrolledTourneys = tournaments?.filter(t => uniqueTourneyIds.includes(t.id)) || [];

                      if (enrolledTourneys.length === 0) {
                        return (
                          <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-850">
                            <Trophy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-xs font-mono text-zinc-500">No past tournament participation records found.</p>
                            <p className="text-[10px] text-zinc-650 font-mono mt-1">Enroll in upcoming events to begin your competitive legacy!</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 gap-3">
                          {enrolledTourneys.map(t => (
                            <div key={t.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-900/30 px-2 py-0.5 rounded uppercase">
                                  {t.game}
                                </span>
                                <h4 className="text-sm font-black text-white mt-1 uppercase">{t.title}</h4>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Tournament Prize: <strong className="text-amber-400">{t.prize_pool || "₹10,000"}</strong></p>
                              </div>
                              <div className="flex flex-col items-end shrink-0 text-right">
                                <span className="text-[9px] font-mono text-zinc-500 uppercase">STATUS</span>
                                <span className={`text-[10px] font-bold uppercase ${
                                  t.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                                }`}>
                                  {t.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Track and review your transaction logs and invoice verification status.</p>
              {currentUser.membershipStatus === 'none' && !currentUser.membershipTxId ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">No invoices generated yet. Access the "My Premium Membership" upgrader desk to complete payments.</p>
                </div>
              ) : (
                <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">INVOICE PREVIEW</span>
                      <h4 className="text-sm font-extrabold text-white">Esports VIP Upgrade — {currentUser.membership} Pass</h4>
                    </div>
                    <span className={`text-[10px] uppercase font-mono px-3 py-1 rounded border font-black ${
                      currentUser.membershipStatus === 'pending' ? 'text-amber-400 bg-amber-400/5 border-amber-400/20' : 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                    }`}>
                      {currentUser.membershipStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <p className="text-zinc-500">TRANSACTION UTR REF:</p>
                      <p className="text-white font-bold">{currentUser.membershipTxId || 'Not Provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-zinc-500">TRANSACTED TIER:</p>
                      <p className="text-white font-bold">{currentUser.membership}</p>
                    </div>
                  </div>

                  {currentUser.membershipScreenshot && (
                    <div className="border-t border-zinc-850 pt-3 space-y-2">
                       <p className="text-[10px] text-zinc-500 uppercase font-mono">TRANSFERS SCREENSHOT PROOF:</p>
                       <img src={currentUser.membershipScreenshot} alt="UTR Screenshot proof" className="max-w-xs h-32 rounded-lg object-cover border border-zinc-800" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              <p className="text-xs text-zinc-400">Apply for exclusive badges, verified esports profiles, and dedicated visual markers across the directory.</p>

              {/* Status Alert Badge */}
              {myVerificationsList.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Active Application Records</h4>
                  <div className="space-y-3">
                    {myVerificationsList.map(req => (
                      <div key={req.id} className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase">{req.creator_name}</span>
                            <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-0.5 rounded uppercase">
                              {req.creator_type}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans italic">"{req.description}"</p>
                          {req.youtube_link && <p className="text-[10px] text-zinc-500 font-mono">YouTube: {req.youtube_link}</p>}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="text-zinc-500 uppercase">STATUS:</span>
                          <span className={`px-2 py-1 rounded font-extrabold uppercase ${
                            req.status === 'approved' ? 'text-emerald-400 bg-emerald-400/5' : 
                            req.status === 'rejected' ? 'text-rose-400 bg-rose-400/5' : 'text-amber-400 bg-amber-400/5'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {currentUser.is_verified ? (
                <div className="p-5 text-center bg-blue-950/15 border border-blue-900/30 rounded-2xl space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-extrabold text-white">Your Creator Profile is Officially Verified!</h4>
                  <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                    You have unlocked your special Blue Verification Badge, custom profile overlay accent, and elevated ranking metrics visibility globally.
                  </p>
                </div>
              ) : (
                <div className="p-5 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400">Creator Verification Pitch Form</h3>
                  <form onSubmit={handleVerificationSubmit} className="space-y-4 font-mono text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 block uppercase">Your Legal Real Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Priyanshu Kumar"
                          value={verificationRealName}
                          onChange={(e) => setVerificationRealName(e.target.value)}
                          className="w-full bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 focus:border-zinc-700 text-zinc-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 block uppercase">Gamer/Team/Brand Handle *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Zephyr Esports"
                          value={verificationCreatorName}
                          onChange={(e) => setVerificationCreatorName(e.target.value)}
                          className="w-full bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 focus:border-zinc-700 text-zinc-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 block uppercase">Verification Badge Tier *</label>
                        <select
                          value={verificationType}
                          onChange={(e) => setVerificationType(e.target.value as any)}
                          className="w-full bg-zinc-950/85 p-2.5 rounded-xl border border-zinc-800 text-zinc-300"
                        >
                          <option value="Streamer">Verified Streamer Badge</option>
                          <option value="Player">Verified Esports Athlete</option>
                          <option value="Team">Verified Pro Esports Squad</option>
                          <option value="Organization">Verified Guild / Org</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 block uppercase">UID / Game ID (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. UID-881518"
                          value={verificationUid}
                          onChange={(e) => setVerificationUid(e.target.value)}
                          className="w-full bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 text-zinc-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 block uppercase">YouTube channel (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://youtube.com/@handle"
                          value={verificationYoutube}
                          onChange={(e) => setVerificationYoutube(e.target.value)}
                          className="w-full bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 text-zinc-200 text-[11px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 block uppercase">Instagram profile (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://instagram.com/handle"
                          value={verificationInstagram}
                          onChange={(e) => setVerificationInstagram(e.target.value)}
                          className="w-full bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 text-zinc-200 text-[11px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 block uppercase">Discord Server / ID (Optional)</label>
                        <input
                          type="text"
                          placeholder="discord.gg/invite"
                          value={verificationDiscord}
                          onChange={(e) => setVerificationDiscord(e.target.value)}
                          className="w-full bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 text-zinc-200 text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-500 block uppercase">Application statement *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Detail your professional records, active subscriber handles, team achievements, or corporate sponsors affiliations description..."
                        value={verificationDescription}
                        onChange={(e) => setVerificationDescription(e.target.value)}
                        className="w-full bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 text-zinc-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <UploadField
                        id="verification-proof-upload"
                        bucketName="sponsor_documents"
                        label="Identity Proof, Stats Screenshot, or Dashboard Uploader"
                        value={verificationProofUrl}
                        onChange={(url) => {
                          setVerificationProofUrl(url);
                          addToast("Proof document uploaded successfully!", "success");
                        }}
                      />
                      {verificationProofUrl && (
                        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Proof document registered: {verificationProofUrl.substring(0, 50)}...
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingVerification}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 font-bold uppercase tracking-wider text-white transition-all rounded-xl cursor-all shadow-lg"
                    >
                      {isSubmittingVerification ? 'Broadcasting Pitch Details...' : 'Submit Esports verification Form'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'advertisement' && (
            <div className="space-y-6">
              <p className="text-xs text-zinc-400">Launch premium advertising campaigns across the primary directory. Display high CTR display banners targeting thousands of weekly players.</p>

              {/* Purchase form */}
              <div className="p-5 bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-rose-500">Self Advertisement Package Selector</h3>
                
                <form onSubmit={handleAdOrderSubmit} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      onClick={() => setAdOrderPlan('1_day')}
                      className={`p-4 border rounded-xl text-center cursor-pointer transition-all ${
                        adOrderPlan === '1_day' ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/30'
                      }`}
                    >
                      <span className="text-[9px] bg-amber-500 text-zinc-950 font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">BASIC</span>
                      <p className="text-sm font-black text-white mt-1.5">1-Day Plan</p>
                      <p className="text-xs text-zinc-400 font-bold mt-1">₹199 INR</p>
                    </div>

                    <div
                      onClick={() => setAdOrderPlan('7_days')}
                      className={`p-4 border rounded-xl text-center cursor-pointer transition-all ${
                        adOrderPlan === '7_days' ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/30'
                      }`}
                    >
                      <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">TRACTION</span>
                      <p className="text-sm font-black text-white mt-1.5">7-Day Plan</p>
                      <p className="text-xs text-zinc-400 font-bold mt-1">₹899 INR</p>
                    </div>

                    <div
                      onClick={() => setAdOrderPlan('30_days')}
                      className={`p-4 border rounded-xl text-center cursor-pointer transition-all ${
                        adOrderPlan === '30_days' ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/30'
                      }`}
                    >
                      <span className="text-[9px] bg-cyan-400 text-black font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">ENTERPRISE</span>
                      <p className="text-sm font-black text-white mt-1.5">30-Day Plan</p>
                      <p className="text-xs text-zinc-400 font-bold mt-1">₹2,999 INR</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-zinc-500 block uppercase">Promoted Item Target *</label>
                      <select
                        value={adOrderType}
                        onChange={(e) => setAdOrderType(e.target.value as any)}
                        className="w-full bg-zinc-950/85 p-2.5 rounded-xl border border-zinc-800 text-zinc-300"
                      >
                        <option value="profile">Your Player Profile</option>
                        <option value="team">Custom Team Squad</option>
                        <option value="tournament">An Arena Tournament</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-zinc-500 block uppercase">Promoted Target ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="Paste profile, squad, or tournament ID"
                        value={adOrderTargetId}
                        onChange={(e) => setAdOrderTargetId(e.target.value)}
                        className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <UploadField
                      id="ad-banner-link"
                      bucketName="profile_banners"
                      label="Ad Banner Graphic Image (728x90 Header or 300x250 square)"
                      value={adOrderBannerUrl}
                      onChange={(url) => {
                        setAdOrderBannerUrl(url);
                        addToast("Banner graphic registered!", "success");
                      }}
                    />
                    {adOrderBannerUrl && (
                      <p className="text-[10px] text-zinc-400 truncate">Registered Image: {adOrderBannerUrl}</p>
                    )}
                  </div>

                  {/* Payment instructions */}
                  <div className="p-4 bg-zinc-950/75 border border-zinc-900 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="md:col-span-1 flex flex-col items-center">
                      <div 
                        className="p-1 bg-white rounded-lg inline-block cursor-zoom-in hover:scale-105 transition-transform"
                        onClick={() => setZoomedQrUrl("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=pkumar15187@okaxis&pn=GamingHub&am=199")}
                        title="Click to zoom QR Code"
                      >
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=pkumar15187@okaxis&pn=GamingHub&am=199" 
                          alt="Gamer Hub UPI Payment QR" 
                          className="w-24 h-24 object-cover" 
                        />
                      </div>
                      <span className="text-[8px] text-zinc-500 uppercase mt-1 font-mono">Scan or tap to zoom</span>
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <h5 className="text-xs font-bold text-white uppercase">Direct VIP Subscription payment</h5>
                      <p className="text-[10px] text-zinc-400">
                        Transfer the amount corresponding to your chosen plan to secure instant coverage. Click or tap code on left to zoom to fullscreen scanning mode.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-zinc-500 block uppercase">Merchant Transaction UTR ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UPI SESS REF: 518151815..."
                        value={adOrderTxId}
                        onChange={(e) => setAdOrderTxId(e.target.value)}
                        className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-300"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <UploadField
                        id="ad-payment-receipt"
                        bucketName="payment_screenshots"
                        label="Payment Screenshot Proof (Optional)"
                        value={adOrderScreenshotUrl}
                        onChange={(url) => {
                          setAdOrderScreenshotUrl(url);
                          addToast("Ad Payment Screenshot upload complete!", "success");
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAdOrder}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-800 font-black uppercase text-white tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/15"
                  >
                    {isSubmittingAdOrder ? 'Transmitting campaign Order...' : 'Generate promotion Campaign Order'}
                  </button>
                </form>
              </div>

              {/* Submitted placements list */}
              {myAdOrders.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">My Advertising Campaigns Trace</h4>
                  <div className="space-y-3">
                    {myAdOrders.map(order => (
                      <div key={order.id} className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60 font-mono text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-extrabold uppercase">Campaign ID #{order.id.slice(0, 8)}</span>
                            <span className="text-[10px] text-rose-400 uppercase bg-rose-950/50 px-2 py-0.5 rounded">
                              {order.ad_type}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                            order.status === 'active' ? 'text-emerald-450 bg-emerald-950/20' : 'text-amber-400 bg-amber-950/20'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                          <div>
                            <p className="text-zinc-500 uppercase text-[9px]">Duration</p>
                            <p className="text-white font-bold">{order.duration_days} Days active</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 uppercase text-[9px]">Views Count</p>
                            <p className="text-white font-bold">{order.views_count || 0}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 uppercase text-[9px]">Clicks Track</p>
                            <p className="text-white font-bold">{order.clicks_count || 0}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 uppercase text-[9px]">CTR Performance</p>
                            <p className="text-rose-400 font-bold">
                              {order.views_count && order.views_count > 0 
                                ? ((order.clicks_count / order.views_count) * 100).toFixed(2)
                                : '0.00'}%
                            </p>
                          </div>
                        </div>

                        {order.status === 'active' && order.expiry_date && (
                          <p className="text-[10px] text-zinc-500 font-mono">
                            PROMOTION ENDS ON: <span className="text-white">{new Date(order.expiry_date).toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <p className="text-xs text-zinc-400">All financial trade transactions generate secure, immutable ledger invoices. Track and download official receipts below.</p>

              {myInvoices.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/25 border border-zinc-850 rounded-2xl">
                  <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs font-mono text-zinc-500">No invoices found. Complete premium purchases, purchase diamonds, or place advertisements to create ledgers.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Official invoice Receipts Ledger</h4>
                  <div className="space-y-3">
                    {myInvoices.map(invoice => {
                      const printInvoice = () => {
                        const win = window.open("", "_blank");
                        if (!win) {
                          alert("Popups are blocked by your browser layout. Please enable them to view or print the generated PDF document receipt in a new workspace.");
                          return;
                        }
                        win.document.write(`
                          <html>
                            <head>
                              <title>Receipt Invoice INV-${invoice.invoice_number}</title>
                              <style>
                                body { font-family: 'Courier New', monospace; background-color: #ffffff; color: #111111; padding: 40px; margin: 0; line-height: 1.5; }
                                .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; }
                                .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin-top: 0; }
                                .meta-section { display: flex; justify-content: space-between; margin: 30px 0; font-size: 13px; }
                                .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                .details-table th, .details-table td { border: 1px solid #777; padding: 10px; font-size: 12px; text-align: left; }
                                .details-table th { background-color: #f1f1f1; text-transform: uppercase; }
                                .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 30px; border-top: 2px dashed #000; padding-top: 15px; }
                                .footer { text-align: center; margin-top: 80px; font-size: 11px; color: #555; border-top: 1px solid #ccc; padding-top: 15px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div class="title">Esports Gaming Career Hub LLC</div>
                                <div style="font-size: 12px; color: #555; margin-top: 5px;">Gamer Calibration Command, Uttar Pradesh, Republic of India</div>
                              </div>

                              <div class="meta-section">
                                <div>
                                  <strong>INVOICE NO:</strong> INV-${invoice.invoice_number}<br>
                                  <strong>DATE ISSUED:</strong> ${new Date(invoice.created_at).toLocaleString()}<br>
                                  <strong>STATUS:</strong> ${invoice.status.toUpperCase()}
                                </div>
                                <div style="text-align: right;">
                                  <strong>CLIENT EMAIL:</strong> ${invoice.user_email}<br>
                                  <strong>PAYMENT TYPE:</strong> ${invoice.invoice_type.toUpperCase()}<br>
                                  <strong>SYSTEM ID:</strong> ${invoice.user_id}
                                </div>
                              </div>

                              <table class="details-table">
                                <thead>
                                  <tr>
                                    <th>Description / Line Item Details</th>
                                    <th style="width: 150px; text-align: right;">Total Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>${invoice.purchase_details || 'Generic Esports premium microtransaction'}</td>
                                    <td style="text-align: right; font-weight: bold;">₹${invoice.amount} INR</td>
                                  </tr>
                                </tbody>
                              </table>

                              <div class="total">
                                BILLING TOTAL: ₹${invoice.amount} INR
                              </div>

                              <div class="footer">
                                In case of any dispute, contact pkumar15187@gmail.com with merchant references.<br>
                                Thank you for backing global tactical network systems!
                              </div>

                              <script>
                                window.onload = function() { window.print(); }
                              </script>
                            </body>
                          </html>
                        `);
                        win.document.close();
                      };

                      return (
                        <div key={invoice.id} className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center justify-between gap-4 font-mono">
                          <div className="space-y-1 text-xs">
                            <span className="text-[10px] text-zinc-500 block uppercase">INVOICE NO: INV-{invoice.invoice_number}</span>
                            <span className="text-white font-extrabold block">{invoice.purchase_details || 'Premium Service Microtransaction'}</span>
                            <span className="text-[10px] text-zinc-500">Issued On: {new Date(invoice.created_at).toLocaleString()}</span>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0 font-mono">
                            <span className="text-xs font-black text-emerald-400">₹{invoice.amount} INR</span>
                            <button
                              onClick={printInvoice}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-rose-500 hover:text-white border border-zinc-800 hover:border-rose-500 font-extrabold text-[9px] uppercase tracking-wide rounded transition-all"
                            >
                              Print / PDF
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 font-sans">Behold your unlocked operator badges and certified reward multipliers.</p>
              {(() => {
                const unlockedBadges = adminSettings.badges?.filter(b => 
                  b.tier === 'All' || b.tier === currentUser.membership || 
                  (currentUser.membership === 'Gold' && b.tier === 'Silver') || 
                  (currentUser.membership === 'Platinum' && (b.tier === 'Silver' || b.tier === 'Gold'))
                ) || [];

                const unlockedRewards = adminSettings.premiumRewards?.filter(r => 
                  r.tier === 'All' || r.tier === currentUser.membership ||
                  (currentUser.membership === 'Gold' && r.tier === 'Silver') ||
                  (currentUser.membership === 'Platinum' && (r.tier === 'Silver' || r.tier === 'Gold'))
                ) || [];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Unlocked Badges Panel */}
                    <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                      <h5 className="text-[10px] font-mono tracking-wider font-extrabold text-cyan-400 uppercase">UNLOCKED CERTIFICATION BADGES</h5>
                      {unlockedBadges.length === 0 ? (
                        <p className="text-[10px] text-zinc-650 italic pl-1 font-mono">No active badges awarded yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {unlockedBadges.map((badge) => (
                            <div key={badge.id} className="text-[10px] font-mono flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-805">
                              <span className="text-zinc-350">{badge.name}</span>
                              <span className="font-extrabold text-amber-400 text-sm">{badge.icon}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unlocked Rewards List */}
                    <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 font-mono text-xs">
                      <h5 className="text-[10px] font-mono tracking-wider font-extrabold text-emerald-400 uppercase">UNLOCKED STATIONS REWARDS</h5>
                      {unlockedRewards.length === 0 ? (
                        <p className="text-[10px] text-zinc-650 italic pl-1 font-mono">No rewards unlocked for current pass.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 font-sans text-[11px] leading-tight">
                          {unlockedRewards.map((reward) => (
                            <div key={reward.id} className="text-[10px] p-2.5 bg-zinc-900 rounded border border-zinc-805 space-y-1 text-zinc-400">
                              <p className="font-bold text-white flex items-center gap-1 font-mono">✓ {reward.name}</p>
                              <p className="text-[9px] text-zinc-400 leading-normal">"{reward.description}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              <RealtimeChatPanel
                currentUser={currentUser}
                adminSettings={adminSettings}
                userTeams={userTeams}
                users={users}
                initialConversationUserId={chatTargetUserId}
                addToast={addToast}
              />
              
              {/* Profile commendations (Vouches log) as a gorgeous collapsible docket */}
              <div className="pt-4 border-t border-zinc-900/40">
                <details className="bg-zinc-950/25 border border-zinc-900 rounded-2xl overflow-hidden group">
                  <summary className="p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-950/40 select-none font-mono text-xs text-zinc-400 font-bold uppercase">
                    <span>🛡️ Profile Vouches & Endorsements Wall ({(currentUser.comments || []).length})</span>
                    <span className="text-zinc-650 group-open:rotate-180 transition-all">▼</span>
                  </summary>
                  <div className="p-4 border-t border-zinc-900 bg-zinc-950/45 space-y-3 max-h-[350px] overflow-y-auto">
                    {!(currentUser.comments) || currentUser.comments.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-650 italic pl-1 text-center">Your commendation wall is currently empty. Request other operators to vouch on your directory listing!</p>
                    ) : (
                      currentUser.comments.map(c => (
                        <div key={c.id} className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-2">
                          <div className="flex items-center gap-2">
                            <img src={c.authorPhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"} alt={c.authorGamerName} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover" />
                            <div>
                              <p className="text-xs font-bold text-white font-sans">{c.authorGamerName}</p>
                              <span className="text-[8px] text-zinc-500 font-mono font-bold uppercase">{c.authorMembership} Pass member • {new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-350 leading-normal pl-7 italic">"{c.text}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <MyFriendsPanel
              currentUser={currentUser}
              adminSettings={adminSettings}
              users={users}
              onSelectFriend={(friendId) => {
                setChatTargetUserId(friendId);
                setActiveTab('messages');
              }}
              onViewProfile={onSelectGamerProfile}
              addToast={addToast}
            />
          )}

          {activeTab === 'friend_requests' && (
            <FriendRequestsPanel
              currentUser={currentUser}
              adminSettings={adminSettings}
              users={users}
              addToast={addToast}
            />
          )}

          {activeTab === 'posts' && (
            <MyPostsPanel
              currentUser={currentUser}
              addToast={addToast}
            />
          )}

          {activeTab === 'feed' && (
            <ActivityFeedPanel
              currentUser={currentUser}
              adminSettings={adminSettings}
              users={users}
              onSelectGamerProfile={onSelectGamerProfile}
              addToast={addToast}
            />
          )}


          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">Inbox empty. No intelligence feeds received.</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && onMarkNotificationRead(notif.id)}
                    className={`p-3.5 border rounded-xl flex items-start gap-3 transition-colors ${
                      notif.read ? 'bg-zinc-950/20 border-zinc-855 text-zinc-400' : 'bg-zinc-950/90 border-rose-500/30 text-white cursor-pointer hover:border-rose-500/50'
                    }`}
                  >
                    <div className="mt-0.5">
                      <Bell className={`w-4 h-4 ${notif.read ? 'text-zinc-650' : 'text-rose-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold font-sans">{notif.title}</h4>
                      <p className="text-xs text-zinc-400 mt-1">{notif.message}</p>
                    </div>

                    {!notif.read && (
                      <span className="text-[9px] uppercase font-mono font-extrabold text-rose-400">Unread</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Review other gamers you saved from the directory list for future squad enlistments.</p>

              {savedPlayersList.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <p className="text-xs font-mono text-zinc-500">No players saved. Check out Gamer Directory to discover team mates.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedPlayersList.map(gp => (
                    <div key={gp.id} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={gp.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"} alt={gp.gamerName} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="text-xs font-bold text-white leading-none">{gp.gamerName}</h4>
                          <span className="text-[9px] text-zinc-500 font-mono mt-1 block">{gp.city}, {gp.country}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onSelectGamerProfile(gp.username)}
                          className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 px-2.5 py-1 text-[10px] font-mono rounded"
                        >
                          View Card
                        </button>
                        <button
                          onClick={() => onUnsavePlayer(gp.id)}
                          className="text-rose-500 p-1.5 hover:bg-rose-500/10 rounded"
                          title="Remove"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'diamonds' && (
            <div className="space-y-6">
              {/* Dynamic Balance indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex items-center gap-3">
                  <span className="text-2xl">💳</span>
                  <div>
                    <span className="text-[9px] font-mono text-zinc-550 uppercase block">TOP-UP WALLET</span>
                    <span className="text-sm font-black font-mono text-cyan-400">
                      💎 {currentUser.topup_diamonds !== undefined ? currentUser.topup_diamonds : 0}
                    </span>
                    <span className="text-[8px] text-zinc-500 block">For Tournament Entries (Non-Cash)</span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <span className="text-[9px] font-mono text-zinc-550 uppercase block">WINNING VAULT</span>
                    <span className="text-sm font-black font-mono text-amber-500">
                      💎 {currentUser.winning_diamonds || 0}
                    </span>
                    <span className="text-[8px] text-zinc-500 block">From Prizes (Gross Wallet Credit)</span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex items-center gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <span className="text-[9px] font-mono text-rose-500 uppercase block">LOCKED WITHDRAWAL</span>
                    <span className="text-sm font-black font-mono text-rose-400">
                      💎 {currentUser.locked_withdraw_diamonds || 0}
                    </span>
                    <span className="text-[8px] text-zinc-550 block">In Payout Queue (Pending Review)</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <span className="text-[9px] font-mono text-emerald-400 uppercase block">AVAILABLE FOR PAYOUT</span>
                    <span className="text-sm font-black font-mono text-emerald-400">
                      💎 {Math.max(0, (currentUser.winning_diamonds || 0) - (currentUser.locked_withdraw_diamonds || 0))}
                    </span>
                    <span className="text-[8px] text-emerald-600 block">Instant Withdrawal (Rate: 1💎=₹1)</span>
                  </div>
                </div>
              </div>

              {/* Wallet Actions Panel */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsWithdrawOpen(false);
                    setIsCustomTopupOpen(false);
                    setIsTransferOpen(false);
                    setSelectedDiamondPackage(null);
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all border border-zinc-800 flex items-center gap-1.5"
                >
                  🛒 Buy Packages
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsWithdrawOpen(false);
                    setIsCustomTopupOpen(true);
                    setIsTransferOpen(false);
                    setSelectedDiamondPackage(null);
                  }}
                  className="px-4 py-2 bg-cyan-500 text-black hover:opacity-95 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  ⚡ Custom Top-up
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTopupOpen(false);
                    setIsWithdrawOpen(true);
                    setIsTransferOpen(false);
                    setSelectedDiamondPackage(null);
                  }}
                  className="px-4 py-2 bg-amber-500 text-black hover:opacity-95 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  🏧 Withdraw Winnings
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTopupOpen(false);
                    setIsWithdrawOpen(false);
                    setIsTransferOpen(!isTransferOpen);
                    setSelectedDiamondPackage(null);
                  }}
                  className={`px-4 py-2 ${isTransferOpen ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-500 text-black'} hover:opacity-95 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5`}
                >
                  🔄 Convert Top-up → Winning
                </button>
              </div>

              {/* Topup to Winning Balance Transfer Form section */}
              {isTransferOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <div>
                      <span className="text-[9px] text-fuchsia-500 font-mono font-bold uppercase block tracking-wider">BALANCE CONVERSION VAULT</span>
                      <h4 className="text-sm font-extrabold text-white">Transfer Top-up Diamonds to Winning Vault</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTransferOpen(false)}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Close Form
                    </button>
                  </div>

                  <form onSubmit={handleTransferTopupToWinning} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-zinc-550 uppercase font-mono font-extrabold">
                          Transfer Amount (Min 1500 💎) *
                        </label>
                        <input
                          type="number"
                          min="1500"
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-fuchsia-500 font-mono"
                          value={transferAmount}
                          onChange={e => setTransferAmount(e.target.value)}
                        />
                      </div>
                      
                      <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg flex flex-col justify-center text-xs space-y-1">
                        <div className="flex justify-between font-mono">
                          <span className="text-zinc-500">Available Top-up:</span>
                          <span className="text-cyan-400 font-bold">💎 {currentUser.topup_diamonds || 0}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span className="text-zinc-500">Min Required:</span>
                          <span className="text-rose-400 font-bold">💎 1500</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-500 leading-normal">
                      💡 <strong>Conversion Policy:</strong> Transferring Top-up balance to the Winning Vault allows you to merge balances. However, please ensure your balance meets the minimum 1500 diamonds mark. To prevent balance manipulation, once transfer is completed, it is finalized instantly.
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                      <button
                        type="button"
                        onClick={() => setIsTransferOpen(false)}
                        className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingTransfer}
                        className="px-4 py-1.5 bg-fuchsia-500 hover:bg-fuchsia-600 text-black font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {isSubmittingTransfer ? "Executing..." : "Confirm & Transfer"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Withdrawal Request Form section */}
              {isWithdrawOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <div>
                      <span className="text-[9px] text-amber-500 font-mono font-bold uppercase block tracking-wider">SECURED DISPATCH</span>
                      <h4 className="text-sm font-extrabold text-white">Withdraw Winning Balance to UPI</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWithdrawOpen(false)}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Close Form
                    </button>
                  </div>

                  {/* Balance warnings */}
                  {((currentUser.winning_diamonds || 0) - (currentUser.locked_withdraw_diamonds || 0)) < 100 ? (
                    <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl font-sans font-medium">
                      ⚠️ Minimum withdrawal is 100 diamonds. Your available balance is only <strong>{Math.max(0, (currentUser.winning_diamonds || 0) - (currentUser.locked_withdraw_diamonds || 0))}</strong> winning diamonds.
                    </div>
                  ) : null}

                  <form onSubmit={handleWithdrawalSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          Withdraw Amount (Diamonds/₹) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono"
                          value={withdrawAmount}
                          onChange={e => setWithdrawAmount(Number(e.target.value))}
                        />
                        <span className="text-[9px] text-zinc-500 block mt-1">₹1 = 1 Winning Diamond. Value: ₹{withdrawAmount}</span>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          UPI ID Address *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. pay@okaxis or phonepe@upi"
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                          value={withdrawUpiId}
                          onChange={e => setWithdrawUpiId(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          Account Holder Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Confirm legal name on UPI profile"
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                          value={withdrawHolderName}
                          onChange={e => setWithdrawHolderName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          Phone Number (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Primary contact phone"
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                          value={withdrawPhone}
                          onChange={e => setWithdrawPhone(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          Add a Note for Admin Dispatch (Optional)
                        </label>
                        <textarea
                          placeholder="Describe specific payout queries"
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 h-16 resize-none"
                          value={withdrawNote}
                          onChange={e => setWithdrawNote(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          QR PAYMENT RECEIVING IMAGE (Optional)
                        </label>
                        <UploadField
                          id="withdraw-qr-upload"
                          bucketName="payment_screenshots"
                          label="UPLOAD UPI QR"
                          value={withdrawQrUrl}
                          onChange={(url) => {
                            setWithdrawQrUrl(url);
                            addToast("Personal UPI QR code uploaded successfully!", "success");
                          }}
                          placeholder="Upload your receiving QR for faster processing"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingWithdraw || ((currentUser.winning_diamonds || 0) - (currentUser.locked_withdraw_diamonds || 0)) < 100}
                        className={`w-full py-2.5 bg-amber-500 text-black hover:opacity-90 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          isSubmittingWithdraw || ((currentUser.winning_diamonds || 0) - (currentUser.locked_withdraw_diamonds || 0)) < 100 ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmittingWithdraw ? 'Processing Dispatch...' : `Submit Withdrawal Request for ₹${withdrawAmount}`}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Custom Top-up Request Form */}
              {isCustomTopupOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <div>
                      <span className="text-[9px] text-cyan-400 font-mono font-bold uppercase block tracking-wider">VAULT SECURED</span>
                      <h4 className="text-sm font-extrabold text-white">Custom Diamond Top-up</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomTopupOpen(false)}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Close Form
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          How many diamonds do you want? *
                        </label>
                        <input
                          type="number"
                          min="10"
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                          value={topupAmount}
                          onChange={e => setTopupAmount(Math.max(10, Number(e.target.value)))}
                        />
                      </div>

                      {/* Display calculations */}
                      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-550">Rate:</span>
                          <span className="text-white">₹1 / Diamond</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-550">Base Diamonds:</span>
                          <span className="text-white">💎 {topupAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-550">Bonus Eligible ({">= 100"}):</span>
                          <span className={`${topupAmount >= 100 ? 'text-emerald-450 font-bold' : 'text-zinc-650'}`}>
                            {topupAmount >= 100 ? '+5% Bonus (💎 ' + Math.floor(topupAmount * 0.05) + ')' : 'No (Requires 100+)'}
                          </span>
                        </div>
                        <div className="border-t border-zinc-800 my-2 pt-2 flex justify-between font-black">
                          <span className="text-zinc-400">Total Diamonds Credited:</span>
                          <span className="text-cyan-400">💎 {topupAmount + (topupAmount >= 100 ? Math.floor(topupAmount * 0.05) : 0)}</span>
                        </div>
                        <div className="flex justify-between font-black text-white">
                          <span>Total Cash To Pay:</span>
                          <span className="text-yellow-500">₹{topupAmount * 1} INR</span>
                        </div>
                      </div>

                      {/* QR payment receiver */}
                      {/* QR payment receiver */}
                      <div className="p-5 bg-zinc-900/30 border border-zinc-850 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest block mb-1">
                          SCAN QR CODE TO INSTANTLY PAY
                        </span>
                        
                        <div 
                          className="p-3 bg-white rounded-2xl shadow-xl border-4 border-zinc-950/80 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-zoom-in group relative"
                          onClick={() => setZoomedQrUrl(adminSettings.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${adminSettings.upiId || 'pkumar15187@okaxis'}&pn=EsportsHub&am=${topupAmount * 1}`)}
                          title="Click to Zoom QR"
                        >
                          <img
                            src={adminSettings.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${adminSettings.upiId || 'pkumar15187@okaxis'}&pn=EsportsHub&am=${topupAmount * 1}`}
                            alt="Payment QR"
                            className="w-36 h-36 object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <span className="text-[10px] text-white bg-black/70 px-2.5 py-1 rounded-full font-mono uppercase tracking-wider font-bold">🔍 Click to zoom</span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-[10px] text-amber-500 font-bold font-mono tracking-wider">
                            Pay exactly <span className="text-white text-xs font-black px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded font-mono">₹{topupAmount * 1} INR</span>
                          </p>
                          <p className="text-[8.5px] text-zinc-500 mt-1.5 leading-normal">
                             Click the QR image to expand & zoom to full size. Scan with any UPI app.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Verification form details */}
                    <form onSubmit={handlePurchaseCustomDiamonds} className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold">
                          UTR Transaction Reference ID *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="12-digit UPI reference ID"
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                          value={diamondTxId}
                          onChange={e => setDiamondTxId(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold">
                          Screenshot Proof of Payment
                        </label>
                        <UploadField
                          id="custom-diamond-ss"
                          bucketName="payment_screenshots"
                          label="SCREENSHOT PROOF"
                          value={diamondScreenshotUrl}
                          onChange={(url) => {
                            setDiamondScreenshotUrl(url);
                            addToast("Screenshot proof uploaded successfully!", "success");
                          }}
                          placeholder="Click/Drag proof screenshot"
                        />
                        {diamondScreenshotUrl && (
                          <div className="text-[10px] text-emerald-450 font-bold flex items-center gap-1.5 mt-1">
                            ✓ Screen attachment verified. Ready to submit.
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-cyan-500 text-black hover:opacity-90 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Submit Custom Top-up Verification
                      </button>
                      {debugStatus && (
                        <div id="custom-topup-debug-tag" className="p-2 border border-zinc-700 bg-zinc-900/60 text-cyan-400 text-[10px] rounded font-mono text-center select-all">
                          ℹ️ {debugStatus}
                        </div>
                      )}
                    </form>
                  </div>
                </motion.div>
              )}

              {/* Package Selector Cards Grid (Only visible if withdraw / custom state is closed) */}
              {!isWithdrawOpen && !isCustomTopupOpen && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-white text-xs uppercase font-mono tracking-wider">
                    🛒 SELECT PREMADE TARGET DIAMOND PACKAGE
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        name: "Rookie Supply Box",
                        diamonds: 10,
                        price: 10,
                        description: "Acquire basic reserves. Perfect for entry-level bracket enrollment fees."
                      },
                      {
                        name: "Veteran Armor Case",
                        diamonds: 50,
                        price: 50,
                        description: "Most popular choice. Includes 50 standard Diamonds! Perfect for multiple tournament registrations."
                      },
                      {
                        name: "Legendary Trove Chest",
                        diamonds: 100,
                        price: 100,
                        description: "Max value! Includes 100 standard Diamonds + 5% Bonus (5 Bonus Diamonds)!"
                      }
                    ].map((pkg) => {
                      const isSelected = selectedDiamondPackage?.name === pkg.name;
                      return (
                        <button
                          key={pkg.name}
                          type="button"
                          onClick={() => {
                            setSelectedDiamondPackage(pkg);
                            setIsWithdrawOpen(false);
                            setIsCustomTopupOpen(false);
                          }}
                          className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all relative ${
                            isSelected
                              ? 'bg-zinc-950 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500'
                              : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-950/60'
                          }`}
                        >
                          {pkg.name.includes("Veteran") && (
                            <span className="absolute -top-2.5 right-3 bg-amber-500 text-black font-bold uppercase font-mono text-[8px] px-2 py-0.5 rounded-full select-none">
                              RECOMMENDED
                            </span>
                          )}
                          {pkg.name.includes("Legendary") && (
                            <span className="absolute -top-2.5 right-3 bg-rose-500 text-white font-bold uppercase font-mono text-[8px] px-2 py-0.5 rounded-full select-none">
                              MAX PERKS
                            </span>
                          )}

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-white text-sm tracking-wide">
                                {pkg.name}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-zinc-400 font-sans leading-relaxed">
                              {pkg.description}
                            </p>
                          </div>

                          <div className="flex justify-between items-end mt-4 pt-3 border-t border-zinc-900/60 w-full">
                            <span className="text-xs font-black text-cyan-400 flex items-center gap-1 font-mono">
                              💎 {pkg.diamonds}
                            </span>
                            <span className="text-xs font-black text-white font-mono bg-zinc-900/80 border border-zinc-800 px-2 py-1 rounded">
                              ₹{pkg.price}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standard checkout flow for pre-made packages */}
              <AnimatePresence>
                {selectedDiamondPackage && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="p-5 bg-zinc-950 rounded-2xl border border-zinc-850 font-mono text-xs space-y-4"
                  >
                    <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
                      <div>
                        <span className="text-[10px] text-zinc-550 uppercase font-mono">ACTIVE DEPOSIT</span>
                        <h4 className="text-sm font-extrabold text-white">
                          Checkout — {selectedDiamondPackage.name} (+{selectedDiamondPackage.diamonds} 💎)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDiamondPackage(null)}
                        className="text-[10px] text-rose-450 hover:underline bg-zinc-900 px-2 py-1 rounded border border-zinc-800"
                      >
                        Cancel Checkout
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-850 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest block mb-1">
                          SCAN QR CODE TO INSTANTLY PAY
                        </span>
                        
                        <div 
                          className="p-3 bg-white rounded-2xl shadow-xl border-4 border-zinc-950/80 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-zoom-in group relative"
                          onClick={() => setZoomedQrUrl(adminSettings.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${adminSettings.upiId || 'pkumar15187@okaxis'}&pn=EsportsHub&am=${selectedDiamondPackage.price}`)}
                          title="Click to Zoom QR"
                        >
                          <img
                            src={adminSettings.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${adminSettings.upiId || 'pkumar15187@okaxis'}&pn=EsportsHub&am=${selectedDiamondPackage.price}`}
                            alt="Payment QR"
                            className="w-36 h-36 object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <span className="text-[10px] text-white bg-black/70 px-2.5 py-1 rounded-full font-mono uppercase tracking-wider font-bold">🔍 Click to zoom</span>
                          </div>
                        </div>
                        
                        <div>
                          {diamondDiscountSummary ? (
                            <div className="space-y-1 font-mono text-center">
                              <p className="text-[10px] text-zinc-500 line-through">
                                Original: ₹{diamondDiscountSummary.original} INR
                              </p>
                              <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                                Pay: ₹{diamondDiscountSummary.final} INR
                              </p>
                              <p className="text-[9px] text-emerald-500/80 font-bold">
                                (Saved ₹{diamondDiscountSummary.savings} INR!)
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-amber-500 font-bold font-mono tracking-wider">
                              Pay exactly <span className="text-white text-xs font-black px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded font-sans font-extrabold">₹{selectedDiamondPackage.price} INR</span>
                            </p>
                          )}
                          <p className="text-[8.5px] text-zinc-500 mt-1.5 leading-normal">
                             Click the QR image to expand & zoom to full size. Scan with any UPI app.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handlePurchaseDiamonds} className="space-y-4">
                        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">
                          SUBMIT UPI VERIFICATION PROOF
                        </span>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-zinc-500 uppercase font-bold">
                            Transaction Reference UTR ID *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="12-digit UPI reference ID"
                            className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded px-3 py-2 text-[11px] focus:outline-none focus:border-cyan-500"
                            value={diamondTxId}
                            onChange={e => setDiamondTxId(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] text-zinc-500 uppercase font-bold">
                            Payment Screenshot Upload
                          </label>
                          <UploadField
                            id="diamond-ss-upload"
                            bucketName="payment_screenshots"
                            label="SCREENSHOT PROOF"
                            value={diamondScreenshotUrl}
                            onChange={(url) => {
                              setDiamondScreenshotUrl(url);
                              addToast("Screenshot proof uploaded successfully!", "success");
                            }}
                            placeholder="Drag & drop screenshot here, or click to browse"
                          />
                          {diamondScreenshotUrl && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-450 mt-1">
                              <Check className="w-4 h-4 shrink-0" /> Proof Attached. Click button below to complete.
                            </div>
                          )}
                        </div>

                        {/* Coupons support for diamonds bundle */}
                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                          <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">Apply Diamond Discount Code</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. GAMER10, DIA50"
                              className="flex-grow bg-zinc-950 border border-zinc-800 text-xs px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500 rounded"
                              value={diamondCouponCode}
                              onChange={(e) => setDiamondCouponCode(e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={handleApplyDiamondCoupon}
                              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1 text-xs font-mono text-zinc-350 rounded font-bold"
                            >
                              Apply
                            </button>
                          </div>
                          {diamondDiscountSummary && (
                            <p className="text-[10px] text-emerald-450 font-mono">Current coupon active: ₹{diamondDiscountSummary.savings} INR off verified!</p>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-cyan-500 text-black hover:opacity-90 rounded font-black text-[10.5px] uppercase tracking-wider transition-all"
                        >
                          Complete Verification & File Request
                        </button>
                        {debugStatus && (
                          <div id="pkg-topup-debug-tag" className="p-2 border border-zinc-700 bg-zinc-900/60 text-cyan-400 text-[10px] rounded font-mono text-center select-all mt-2">
                            ℹ️ {debugStatus}
                          </div>
                        )}
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transactions History Table */}
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 text-xs">
                <h4 className="font-extrabold text-white text-xs uppercase font-mono tracking-wider border-b border-zinc-900 pb-2 flex items-center gap-1.5 mb-3">
                  📋 Your Diamond Ledger History ({userDiamondTransactions.length})
                </h4>

                {userDiamondTransactions.length === 0 ? (
                  <div className="py-8 text-center text-zinc-550 italic font-sans font-normal">
                    No diamond micro-transactions filed on your account yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono">
                      <thead>
                        <tr className="border-b border-zinc-900 text-[9.5px] text-zinc-500 font-bold uppercase tracking-widest">
                          <th className="py-2.5">Date</th>
                          <th className="py-2.5">wallet</th>
                          <th className="py-2.5">action</th>
                          <th className="py-2.5">Diamonds Added/Used</th>
                          <th className="py-2.5">Receipt Ref</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 font-medium text-[10px]/relaxed">
                        {userDiamondTransactions.map((txn: any) => (
                          <tr key={txn.id} className="hover:bg-zinc-950/40">
                            <td className="py-2 text-zinc-400 font-sans">
                              {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : 'Just now'}
                            </td>
                            <td className="py-2 uppercase">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono border ${
                                txn.wallet_type === 'winning' 
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-550' 
                                  : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                              }`}>
                                {txn.wallet_type || 'topup'}
                              </span>
                            </td>
                            <td className="py-2 text-zinc-400 text-[9px] max-w-[120px] truncate" title={txn.note || txn.transaction_type}>
                              {txn.note || txn.transaction_type}
                            </td>
                            <td className={`py-2 font-extrabold ${txn.total_amount < 0 ? 'text-rose-450' : 'text-emerald-450'}`}>
                              {txn.total_amount > 0 ? `+${txn.total_amount}` : txn.total_amount} 💎
                            </td>
                            <td className="py-2 text-zinc-500 font-mono text-[9px] truncate max-w-[100px]" title={txn.transaction_id}>
                              {txn.transaction_id || 'N/A'}
                            </td>
                            <td className="py-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono border ${
                                txn.status === 'approved' || txn.status === 'paid'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : txn.status === 'rejected'
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 animate-pulse'
                              }`}>
                                {txn.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Withdrawal Requests History tracker to satisfy real feedback */}
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 text-xs">
                <h4 className="font-extrabold text-white text-xs uppercase font-mono tracking-wider border-b border-zinc-900 pb-2 flex items-center gap-1.5 mb-3">
                  🏧 Your UPI Payout Dispatch Log ({userWithdrawals.length})
                </h4>

                {userWithdrawals.length === 0 ? (
                  <div className="py-8 text-center text-zinc-550 italic font-sans font-normal">
                    No reward payouts filed by you yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono">
                      <thead>
                        <tr className="border-b border-zinc-900 text-[9.5px] text-zinc-500 font-bold uppercase tracking-widest">
                          <th className="py-2.5">Date Filed</th>
                          <th className="py-2.5">Amount (₹)</th>
                          <th className="py-2.5">UPI ID Address</th>
                          <th className="py-2.5">Account Holder</th>
                          <th className="py-2.5">Admin Note</th>
                          <th className="py-2.5">Payout Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 font-medium text-[10px]/relaxed">
                        {userWithdrawals.map((wr: any) => (
                          <tr key={wr.id} className="hover:bg-zinc-950/40">
                            <td className="py-2 text-zinc-400 font-sans">
                              {wr.created_at ? new Date(wr.created_at).toLocaleDateString() : 'Just now'}
                            </td>
                            <td className="py-2 text-white font-extrabold font-mono font-sans">₹{wr.amount}</td>
                            <td className="py-2 text-zinc-300 font-mono text-[9.5px]">{wr.upi_id}</td>
                            <td className="py-2 text-zinc-400">{wr.account_holder_name}</td>
                            <td className="py-2 text-zinc-555 italic max-w-[150px] truncate" title={wr.admin_note}>
                              {wr.admin_note || 'Waiting review...'}
                            </td>
                            <td className="py-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono border ${
                                wr.status === 'paid'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : wr.status === 'approved'
                                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                  : wr.status === 'rejected'
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 animate-pulse'
                              }`}>
                                {wr.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-6">
              {/* Top Banner introducing the referral deal */}
              <div className="p-6 bg-gradient-to-r from-rose-950/20 via-zinc-900 to-zinc-950 rounded-2xl border border-rose-500/20 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 blur-3xl rounded-full"></div>
                <div className="max-w-xl space-y-2">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-rose-450 font-bold bg-rose-950/45 px-2.5 py-1 rounded border border-rose-500/20">
                    SQUADRON GROWTH INITIATIVE
                  </span>
                  <h3 className="text-2xl font-black text-white font-display tracking-tight uppercase">
                    EXPAND THE HQ. MULTIPLY THE PERKS.
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Invite new pilots to clear recruit calibration. When they activate their first premium membership subscription, you receive <strong className="text-white">+50 Winning Diamonds</strong> and they get a registration bonus of <strong className="text-white">+20 Top-up Diamonds</strong>!
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl relative overflow-hidden">
                  <span className="text-[10px] font-mono text-zinc-550 uppercase block tracking-wider">YOUR EXCLUSIVE INVITE CODE</span>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-2xl font-black font-mono text-rose-450 tracking-wider">
                      {currentUser.referralCode || 'NOT_FOUND'}
                    </span>
                    <button
                      onClick={() => {
                        if (currentUser.referralCode) {
                          navigator.clipboard.writeText(currentUser.referralCode);
                          addToast("Affiliate referral code copied to clipboard!", "success");
                        }
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs font-mono transition-all uppercase"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl">
                  <span className="text-[10px] font-mono text-zinc-550 uppercase block tracking-wider">TOTAL ACTIVE RECRUITS</span>
                  <div className="text-3xl font-black font-mono text-white mt-1">
                    {userReferrals.filter(r => r.referrer_user_id === currentUser.id).length}
                  </div>
                  <span className="text-[9px] text-zinc-550 block mt-0.5">Successful premium converted accounts</span>
                </div>

                <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl">
                  <span className="text-[10px] font-mono text-zinc-550 uppercase block tracking-wider">TOTAL DIAMONDS EARNED</span>
                  <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                    💎 {userReferrals.filter(r => r.referrer_user_id === currentUser.id && r.reward_status === 'rewarded').length * 50}
                  </div>
                  <span className="text-[9px] text-zinc-550 block mt-0.5">Credited straight to your Winning wallet</span>
                </div>
              </div>

              {/* Share Invite Link panel */}
              <div className="p-5 bg-zinc-950/80 border border-zinc-850 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
                  <span>🔗</span> PERSONAL INVITATION LINK
                </h4>
                <div className="flex flex-col md:flex-row items-stretch gap-2.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}?ref=${currentUser.referralCode}`}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-350 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}?ref=${currentUser.referralCode}`;
                      navigator.clipboard.writeText(link);
                      addToast("Your unique invitation link copied to clipboard!", "success");
                    }}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Referrals & Reward tables */}
              <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
                  <h4 className="text-xs font-black uppercase text-white tracking-widest font-mono">
                    📋 RECRUITS TRACKING LEDGER ({userReferrals.filter(r => r.referrer_user_id === currentUser.id).length})
                  </h4>
                </div>

                {isReferralsLoading ? (
                  <div className="p-6 text-center text-zinc-550 font-mono text-xs">
                    Synthesizing affiliate referral network nodes...
                  </div>
                ) : userReferrals.filter(r => r.referrer_user_id === currentUser.id).length === 0 ? (
                  <div className="py-8 text-center text-zinc-550 font-mono text-xs">
                    No records found yet. Share your code or link above to begin.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-[10px] font-mono text-zinc-550 uppercase">
                          <th className="pb-2.5">Recruit Athlete</th>
                          <th className="pb-2.5">Invitation Date</th>
                          <th className="pb-2.5">Commission Reward</th>
                          <th className="pb-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userReferrals.filter(r => r.referrer_user_id === currentUser.id).map((ref: any) => (
                          <tr key={ref.id} className="border-b border-zinc-900 text-xs font-mono text-zinc-300">
                            <td className="py-3 font-bold text-white">{ref.referredName || 'recruit_' + ref.referred_user_id.slice(0, 5)}</td>
                            <td className="py-3 text-zinc-450">{new Date(ref.created_at).toLocaleDateString()}</td>
                            <td className="py-3 text-rose-450 font-bold">+50 Winning Diamonds</td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${
                                ref.reward_status === 'rewarded'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                              }`}>
                                {ref.reward_status === 'rewarded' ? 'SUCCESS CONVERTED' : 'PENDING PURCHASE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'membership' && (

            <div className="space-y-6">
              {/* Dynamic Active Membership Status indicators */}
              <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-850/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent blur-xl pointer-events-none"></div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">ATHLETE MEMBERSHIP LEDGER</span>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <h3 className="text-xl font-black text-white font-display tracking-wide uppercase">
                      {currentUser.membership === 'Free' ? 'FREE PASS ACCESS' : `${currentUser.membership} VIP PASS`}
                    </h3>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-black block leading-none uppercase ${
                      currentUser.membershipStatus === 'active' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                        : currentUser.membershipStatus === 'pending'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}>
                      {currentUser.membershipStatus.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-[11px] font-sans">
                    {currentUser.membership === 'Free'
                      ? "Upgrade using our UPI QR scanner below to unlock personalized headers, custom frames, decals and double active badge XP multipliers."
                      : currentUser.membershipStatus === 'pending'
                      ? `Your ₹${currentUser.membership === 'Silver' ? 49 : currentUser.membership === 'Gold' ? 99 : 199} subscription is pending verification on Transaction ID UTR: "${currentUser.membershipTxId || 'Pending'}".`
                      : `Membership Active. Expiry Indicator: Lifetime Unlimited Support. Premium border frames and cover panels enabled.`}
                  </p>
                  {currentUser.membership !== 'Free' && (
                    <div className="mt-3 flex items-center gap-2">
                      {userCancellationRequests.some(r => r.status === 'pending') ? (
                        <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-xl font-mono flex items-center gap-1.5 animate-pulse">
                          <span>⏰</span>
                          <span>Cancellation Pending Admin Verification</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsCancelSubOpen(true)}
                          className="bg-rose-500/10 border border-rose-500/30 text-rose-450 px-3.5 py-1.5 rounded-xl text-[10px] font-mono leading-none tracking-wider uppercase font-black hover:bg-rose-500/20 transition-all select-none cursor-pointer"
                        >
                          ❌ Cancel Subscription
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto font-mono text-center">
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-805 min-w-[70px]">
                    <p className="text-[8px] text-zinc-500 uppercase font-black">My Badges</p>
                    <p className="text-sm font-black text-white mt-0.5">{currentUser.badges?.length || 1}</p>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 min-w-[70px]">
                    <p className="text-[8px] text-zinc-500 uppercase font-black">Stickers</p>
                    <p className="text-sm font-black text-rose-400 mt-0.5">{currentUser.membership !== 'Free' ? 8 : 0}</p>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-805 min-w-[70px]">
                    <p className="text-[8px] text-zinc-500 uppercase font-black">Frames</p>
                    <p className="text-sm font-black text-cyan-400 mt-0.5">{currentUser.membership !== 'Free' ? 3 : 0}</p>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 min-w-[70px]">
                    <p className="text-[8px] text-zinc-500 uppercase font-black">XP Multi</p>
                    <p className="text-sm font-black text-emerald-400 mt-0.5">
                      {currentUser.membership === 'Free' ? '1.0x' : currentUser.membership === 'Silver' ? '1.5x' : currentUser.membership === 'Gold' ? '2.0x' : '3x'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 7-Day Premium Trial Offer section */}
              {!currentUser.trial_used && currentUser.membership === 'Free' && (
                <div className="p-5 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded font-black uppercase">GOLD & PLATINUM 7-DAY TRIAL PASS DECK</span>
                    <h4 className="text-xs font-black font-mono text-white uppercase mt-1">Acquire VIP Access for 7 Days</h4>
                    <p className="text-zinc-400 text-[10px] font-sans">
                      Deducting 5 Top-up Diamonds (₹5 equivalent) activates a full 7-day premium suite. Fully compatible with life-sized banners, tags, and decal stickers!
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        const topup = currentUser.topup_diamonds || 0;
                        if (topup < 5) {
                          alert("Requires 5 Top-up Diamonds in your wallet! Please go to the Diamond tab and buy at least 5 diamonds first.");
                          return;
                        }
                        if (confirm("Initiate 7-day trial of Gold tier for 5 Top-up Diamonds?")) {
                          try {
                            const updated = await supabaseService.claimTrial(currentUser.id, 'Gold');
                            onUpdateProfile(updated);
                            alert("Success! 7-day Gold trial active.");
                          } catch (err: any) {
                            alert(err.message || "Failed to start trial.");
                          }
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500/30 px-3.5 py-2 rounded-xl text-[9px] font-mono font-black uppercase transition-all select-none cursor-pointer"
                    >
                      ⚡ Gold Trial (₹5)
                    </button>
                    <button
                      onClick={async () => {
                        const topup = currentUser.topup_diamonds || 0;
                        if (topup < 5) {
                          alert("Requires 5 Top-up Diamonds in your wallet! Please go to the Diamond tab and buy at least 5 diamonds first.");
                          return;
                        }
                        if (confirm("Initiate 7-day trial of Platinum tier for 5 topup diamonds?")) {
                          try {
                            const updated = await supabaseService.claimTrial(currentUser.id, 'Platinum');
                            onUpdateProfile(updated);
                            alert("Success! 7-day Platinum trial active.");
                          } catch (err: any) {
                            alert(err.message || "Failed to start trial.");
                          }
                        }
                      }}
                      className="bg-cyan-600 hover:bg-cyan-750 text-white border border-cyan-500/30 px-3.5 py-2 rounded-xl text-[9px] font-mono font-black uppercase transition-all select-none cursor-pointer"
                    >
                      💎 Platinum Trial (₹5)
                    </button>
                  </div>
                </div>
              )}

              {/* Premium membership pricing cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(premiumTiers).map(([tier, details]) => {
                  const isCurrent = currentUser.membership === tier && currentUser.membershipStatus === 'active';
                  const borderClass = isCurrent ? 'border-amber-500 bg-amber-500/5 neon-glow-blue' : 'border-zinc-800 bg-zinc-950/60';

                  return (
                    <div key={tier} className={`p-5 rounded-2xl border flex flex-col justify-between ${borderClass}`}>
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-extrabold text-sm text-white font-mono uppercase tracking-wide">{tier} PASS</h4>
                          {isCurrent && (
                            <span className="text-[9px] bg-amber-500/20 border border-amber-505 text-amber-400 font-mono px-2 py-0.5 rounded-full font-bold">
                              ACTIVE TIER
                            </span>
                          )}
                        </div>

                        <p className="text-2xl font-black text-white mt-3 font-display">
                          ₹{details.price} <span className="text-xs text-zinc-500 font-sans font-normal">/ lifetime</span>
                        </p>

                        <ul className="text-xs text-zinc-400 space-y-2 mt-4">
                          {details.perks.map((perk, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 select-none text-[11px] font-sans">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              {perk}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-zinc-800/40 mt-4">
                        <button
                          disabled={currentUser.membership === tier && currentUser.membershipStatus === 'active'}
                          onClick={() => setSelectedPremiumTier(tier as any)}
                          className={`w-full py-2 rounded-xl text-xs font-mono font-bold select-none transition-all ${
                            isCurrent 
                              ? 'bg-zinc-800/40 text-zinc-400 cursor-not-allowed'
                              : 'bg-amber-400 text-zinc-950 hover:bg-amber-500 cursor-pointer'
                          }`}
                        >
                          {isCurrent ? "Active Membership" : "Calibrate Upgrade"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* QR payment details panel */}
              {selectedPremiumTier && (
                <div className="p-6 bg-zinc-950 rounded-2xl border border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="text-center space-y-4 max-w-xs mx-auto">
                    <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-black">Scan QR scanner to upgrade</p>
                    <div 
                      className="p-3 bg-white w-48 h-48 mx-auto rounded-2xl flex items-center justify-center border-4 border-zinc-950/80 shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-200 cursor-zoom-in group relative"
                      onClick={() => {
                        if (adminSettings.qrCodeUrl && adminSettings.qrCodeUrl.trim() !== "" && !adminSettings.qrCodeUrl.startsWith('file:///')) {
                          setZoomedQrUrl(adminSettings.qrCodeUrl);
                        }
                      }}
                      title="Click to Zoom QR"
                    >
                      {adminSettings.qrCodeUrl && adminSettings.qrCodeUrl.trim() !== "" && !adminSettings.qrCodeUrl.startsWith('file:///') ? (
                        <>
                          <img src={adminSettings.qrCodeUrl} alt="Payment scanner" className="max-w-full max-h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <span className="text-[10px] text-white bg-black/70 px-2.5 py-1 rounded-full font-mono uppercase tracking-wider font-bold">🔍 Click to zoom</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-rose-600 font-mono text-[11px] uppercase text-center p-4 font-bold">
                          Payment QR not configured. Please contact admin.
                        </p>
                      )}
                    </div>
                    <div>
                      {discountSummary ? (
                        <div className="space-y-1 font-mono text-center">
                          <p className="text-[10px] text-zinc-500 line-through">
                            Original: ₹{discountSummary.original} INR
                          </p>
                          <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                            Pay: ₹{discountSummary.final} INR
                          </p>
                          <p className="text-[9px] text-emerald-500/80 font-bold">
                            (Saved ₹{discountSummary.savings} INR!)
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-500 font-bold font-mono tracking-wider">
                          Pay ₹{premiumTiers[selectedPremiumTier].price} INR
                        </p>
                      )}
                      <p className="text-[8.5px] text-zinc-500 mt-1.5 leading-normal">
                        Click the QR image to expand & zoom to full size. Scan with any UPI app.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <h3 className="font-extrabold text-white text-base font-display flex items-center gap-1.5">
                      <Shield className="text-amber-400 w-5 h-5" />
                      Verification Proof Registry
                    </h3>

                    {/* Coupons support */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">Activate Discount Coupon</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. GAMER10, CHAMPION30"
                          className="flex-grow bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none focus:border-amber-500 rounded"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-mono text-zinc-300 rounded font-bold"
                        >
                          Apply
                        </button>
                      </div>
                      {appliedDiscount > 0 && (
                        <p className="text-[10px] text-emerald-400 font-mono">Current coupon active: {appliedDiscount}% deduction verified!</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1 font-bold">Transaction Reference ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="UTR / Txn ID (12 Digit String)"
                        className="w-full bg-zinc-950 border border-zinc-805 text-xs text-white focus:border-amber-500 rounded px-3 py-2.5 outline-none font-mono"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>

                    <div>
                      <UploadField 
                        id="payment-screenshot-upload"
                        bucketName="payment_screenshots"
                        label="Screenshot proof of payment (Optional)"
                        value={screenshotInput}
                        onChange={(url) => setScreenshotInput(url)}
                        placeholder="Drop screenshot of payment here, or select"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all shadow-md"
                    >
                      SUBMIT TRANSFERS LOG FOR REVIEW
                    </button>
                  </form>
                </div>
              )}

              {/* Referral engine details */}
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-white font-mono flex items-center gap-1">
                    <Gift className="w-4 h-4 text-rose-500" />
                    SQUAD REFERRAL COMMISSION
                  </h4>
                  <p className="text-zinc-500 text-xs mt-1">Get custom bonus rebates when other players update using your personalized code.</p>
                </div>

                <div className="flex gap-2 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-800">
                  <span className="font-mono font-bold text-zinc-300">{currentUser.referralCode}</span>
                  <button onClick={copyReferralCode} className="text-rose-400 hover:text-rose-500">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cancel Subscription Request Form section */}
              {isCancelSubOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-zinc-950 border border-rose-900/40 rounded-2xl space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <div>
                      <span className="text-[9px] text-rose-500 font-mono font-bold uppercase block tracking-wider">CANCELLATION REQUEST PROTOCOL</span>
                      <h4 className="text-sm font-extrabold text-white">Cancel Your Premium VIP Membership</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCancelSubOpen(false)}
                      className="text-xs text-zinc-500 hover:text-white font-mono bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded cursor-pointer"
                    >
                      Close Form
                    </button>
                  </div>

                  <div className="p-3.5 bg-rose-955/10 border border-rose-905_20 text-rose-350 text-xs rounded-xl font-sans leading-normal">
                    ⚠️ <strong>Important Note:</strong> Cancelling your membership will revert your account to the Free pass tier. Premium badge multipliers, decals, and visual custom frames will be locked immediately upon approval.
                  </div>

                  <form onSubmit={handleCancelSubscriptionSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          UPI ID Address (If applicable)
                        </label>
                        <input
                          type="text"
                          placeholder="yourname@upi"
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono"
                          value={cancelUpiId}
                          onChange={e => setCancelUpiId(e.target.value)}
                        />
                        <span className="text-[9.5px] text-zinc-500 block mt-1">UPI address to route any refunds or validation logs.</span>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          Reason for Cancellation (Optional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Let us know how we can improve..."
                          className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                          value={cancelReason}
                          onChange={e => setCancelReason(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 flex flex-col justify-between">
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono font-extrabold mb-1">
                          Payout UPI QR Image Upload
                        </span>
                        <UploadField
                          id="cancellation-qr-code-upload"
                          bucketName="payment_screenshots"
                          label="Upload UPI Payout QR Code"
                          value={cancelQrUrl}
                          onChange={(url) => setCancelQrUrl(url)}
                          placeholder="Drag QR image here, or select"
                        />
                        <span className="text-[9.5px] text-zinc-400 block mt-1">
                          * Note: At least one of UPI ID OR QR Image Upload is <strong className="text-amber-400 italic">strictly required</strong> to submit cancellation.
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingCancelSub}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-2.5 rounded-xl text-xs font-mono tracking-widest uppercase transition-all shadow-md disabled:opacity-40 cursor-pointer"
                      >
                        {isSubmittingCancelSub ? "SUBMITTING PROTOCOL..." : "CONFIRM & SUBMIT CANCELLATION"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 10. Dashboard Preview Modal: Preview Platinum Profile */}
      <AnimatePresence>
        {showPlatinumPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setShowPlatinumPreview(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className={`relative max-w-lg w-full max-h-[90vh] overflow-y-auto border shadow-[0_0_50px_rgba(244,63,94,0.35)] rounded-2xl p-6 z-50 scrollbar-thin bg-cover bg-center ${
                ((isPlatinum && currentUser.platinum_theme_enabled) || activeTab === 'platinum_theme')
                  ? 'border-rose-500/50'
                  : 'bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 border-rose-500/40'
              }`}
              style={((isPlatinum && currentUser.platinum_theme_enabled) || activeTab === 'platinum_theme') ? {
                backgroundImage: `url("${activeTab === 'platinum_theme' ? platinumBackgroundUrl : (currentUser.platinum_background_url || PLATINUM_DEFAULTS.background)}")`
              } : {}}
            >
              {/* Platinum Exclusive Cyberpunk Light Rays */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-2xl">
                <div className="absolute -top-32 -left-32 w-80 h-80 bg-rose-500/15 rounded-full blur-[100px] opacity-75"></div>
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] opacity-60"></div>
                {((isPlatinum && currentUser.platinum_theme_enabled) || activeTab === 'platinum_theme') && (
                  <img 
                    src={activeTab === 'platinum_theme' ? platinumOverlayUrl : (currentUser.platinum_overlay_url || PLATINUM_DEFAULTS.particleOverlay)} 
                    alt="Overlay effect" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none z-0 mix-blend-screen"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute top-1/4 left-10 w-2 h-2 bg-rose-400/40 rounded-full animate-ping"></div>
                <div className="absolute bottom-1/3 right-12 w-1.5 h-1.5 bg-cyan-400/30 rounded-full animate-pulse"></div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowPlatinumPreview(false)}
                className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black border border-white/10 p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content Box */}
              <div className="relative z-10">
                {/* Banner */}
                <div className="relative -mx-6 -mt-6 mb-6 overflow-hidden">
                  <PremiumBanner 
                    user={currentUser} 
                    adminSettings={adminSettings} 
                    heightClass="h-32 md:h-36" 
                    customBannerUrl={activeTab === 'platinum_theme' ? platinumBannerUrl : undefined} 
                  />
                </div>

                {/* Avatar and name overlapping */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3.5 -mt-14 mb-4 relative z-20 text-center sm:text-left px-2">
                  <div className="shrink-0">
                    <GamerAvatar user={currentUser} adminSettings={adminSettings} size="xl" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                      <h3 className="text-xl md:text-2xl font-black font-display tracking-wide flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                        <span className={getUserNameColorClass(currentUser)}>
                          {currentUser.gamerName}
                        </span>
                        {isUserVIP(currentUser) && (
                          <span className="text-[9px] bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-2 py-0.5 rounded font-mono font-extrabold shadow shadow-rose-500/20 animate-pulse">VIP</span>
                        )}
                        {getUserTierBadgeIcon(currentUser, adminSettings) && (
                          <span className="text-xs shrink-0" title={getUserTierBadgeIcon(currentUser, adminSettings)}>
                            {getUserTierBadgeIcon(currentUser, adminSettings).split(' ')[0]}
                          </span>
                        )}
                      </h3>
                      <span className="text-[9px] bg-rose-500/15 border border-rose-500/25 text-rose-450 font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded">
                        👑 PLATINUM VIP
                      </span>
                    </div>

                    <p className="text-xs text-rose-450 font-mono tracking-widest mt-1 uppercase">
                      {(currentUser.favoriteGames || []).join(" / ") || "GENERAL APEX GAMER"}
                    </p>
                    <p className="text-zinc-400 text-xs flex items-center justify-center sm:justify-start gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      {currentUser.city || 'Delhi'}, {currentUser.state || 'Delhi'}, {currentUser.country || 'India'}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Stats card grid */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold font-mono tracking-widest text-rose-450 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      LEGENDARY PERFORMANCE MATRIX
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest">SKILL</p>
                        <p className="text-base font-black font-display text-rose-400 mt-0.5">{currentUser.skillRating || 1750}</p>
                        <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-tight block">🔥 Top 0.2%</span>
                      </div>

                      <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest">LEVEL</p>
                        <p className="text-base font-black font-display text-indigo-400 mt-0.5">Lv {Math.floor((currentUser.skillRating || 1750) / 100)}</p>
                        <span className="text-[8px] font-mono text-indigo-300 block">XP: {(currentUser.skillRating || 1750) * 4 + 250}</span>
                      </div>

                      <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest">RANK</p>
                        <p className="text-xs font-black font-display text-amber-500 mt-1 uppercase tracking-wider truncate">
                          {(currentUser.skillRating || 1750) > 1700 ? "GRANDMASTER" : "TACTICAL ELITE"}
                        </p>
                        <span className="text-[8px] font-mono text-amber-500 uppercase tracking-tight block">★ Tier-S</span>
                      </div>

                      <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest">K/D RATIO</p>
                        <p className="text-base font-black font-display text-cyan-400 mt-0.5">{(currentUser.kdRatio || 1.85).toFixed(2)}</p>
                        <span className="text-[8px] font-mono text-zinc-400 block">win rate: {currentUser.winRate || 58}%</span>
                      </div>

                      <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest">TEAM COMMAND</p>
                        <p className="text-xs font-black font-display text-emerald-400 mt-1 truncate">
                          {userTeams && userTeams.length > 0 ? userTeams[0].name : "SQUAD DELTA"}
                        </p>
                        <span className="text-[8px] font-mono text-zinc-500 block">role: leader (1)</span>
                      </div>

                      <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] p-3 rounded-xl shadow-lg relative overflow-hidden">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest font-bold">FOLLOWERS</p>
                        <p className="text-base font-black font-display text-fuchsia-400 mt-0.5">
                          {Number(((currentUser.skillRating || 1750) - 1000) * 3).toLocaleString()}
                        </p>
                        <span className="text-[8px] font-mono text-fuchsia-300 block">Active fans</span>
                      </div>
                    </div>
                  </div>

                  {/* Sticker showcase */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold font-mono tracking-widest text-cyan-400 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-cyan-400 animate-spin [animation-duration:6s]" />
                      PLATINUM STICKER COLLECTION
                    </h4>
                    <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl flex items-center gap-2.5 overflow-x-auto">
                      {currentUser.unlocked_stickers && currentUser.unlocked_stickers.length > 0 ? (
                        currentUser.unlocked_stickers.map((sticker, index) => (
                          <div key={index} className="flex flex-col items-center shrink-0 bg-black/40 border border-zinc-850 rounded-lg p-2.5 w-15 h-15 justify-center">
                            <span className="text-2xl animate-bounce">{sticker}</span>
                            <span className="text-[8px] text-zinc-500 font-mono truncate">My Unlocked</span>
                          </div>
                        ))
                      ) : null}
                      
                      {[
                        { emoji: "🔥", name: "Ignition", style: "animate-pulse" },
                        { emoji: "⚡", name: "Precision", style: "animate-bounce" },
                        { emoji: "👑", name: "Crown", style: "animate-pulse" },
                        { emoji: "👾", name: "Matrix", style: "animate-spin [animation-duration:8s]" }
                      ].map((sticker, idx) => (
                        <div key={idx} className="flex flex-col items-center shrink-0 bg-white/[0.02] border border-white/[0.04] rounded-xl p-2 w-16 h-16 justify-center text-center">
                          <span className={`text-2xl select-none filter drop-shadow-[0_0_8px_rgba(244,63,94,0.4)] ${sticker.style}`}>{sticker.emoji}</span>
                          <span className="text-[7.5px] font-mono text-rose-400 font-bold mt-1 tracking-tight truncate leading-none">{sticker.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* About Bio detail showcase */}
                  <div className="space-y-1 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl">
                    <p className="text-[8px] text-zinc-500 font-mono tracking-wider uppercase font-bold">OPERATOR PROFILE BIO</p>
                    <p className="text-xs text-zinc-300 leading-normal pl-0.5 italic">
                      "{currentUser.bio || "No custom bio configured yet."}"
                    </p>
                  </div>

                  {/* Helpful guidance */}
                  <div className="text-center py-1">
                    <p className="text-[9px] text-zinc-500 font-mono">This is exactly how other esports managers and sponsors see your legendary character card.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoomable QR code Lightbox */}
      <AnimatePresence>
        {zoomedQrUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedQrUrl(null)}
            className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-6 text-center shadow-2xl relative select-none"
            >
              <button
                type="button"
                onClick={() => setZoomedQrUrl(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Close Lightbox"
                id="close-qr-lightbox-btn"
              >
                ✕
              </button>
              
              <div className="space-y-1">
                <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase font-black">PAYMENT RECEIVER QR</span>
                <h4 className="text-sm font-black text-white">Interactive Zoomed View</h4>
              </div>

              <div className="bg-white p-4 rounded-2xl mx-auto shadow-2xl max-w-[260px] max-h-[260px] flex items-center justify-center border-4 border-zinc-900">
                <img
                  src={zoomedQrUrl}
                  alt="Zoomed Payment QR"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1 bg-zinc-900/40 p-3.5 border border-zinc-850 rounded-xl">
                <p className="text-[10px] text-amber-500 font-bold font-mono uppercase tracking-wider">
                  SCAN WITH ANY UPI APP
                </p>
                <p className="text-[9px] text-zinc-400 leading-normal">
                  You can use Google Pay, PhonePe, Paytm, or any banking app to scan this QR.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setZoomedQrUrl(null)}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-mono font-bold transition-all border border-zinc-800 cursor-pointer"
              >
                Dismiss Zoom
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
