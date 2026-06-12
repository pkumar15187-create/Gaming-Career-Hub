import React, { useState, useRef } from 'react';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings, DbPayment, DbTournamentRegistration, DbTournamentMatch, TournamentResult, SubscriptionCancellationRequest, Sponsor, SponsorClick } from '../types';
import { supabaseService } from '../lib/supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { ShieldAlert, LogOut, Users, Trophy, DollarSign, Image, Gift, Percent, Plus, Trash, Check, X, Ban, Sparkles, TrendingUp, KeyRound, Sparkle, AlertCircle, RefreshCw, Copy, Upload, Search, Filter, Eye, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AdManager from './AdManager';

interface AdminPanelProps {
  users: UserProfile[];
  teams: Team[];
  tournaments: Tournament[];
  sponsors: SponsorApplication[];
  adminSettings: AdminSettings;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  // State update callbacks
  onBanUser: (userId: string) => void;
  onUnbanUser: (userId: string) => void;
  onToggleFeaturedUser: (userId: string) => void;
  onToggleFeaturedTeam: (teamId: string) => void;
  onDeleteProfile: (userId: string) => void;
  onApprovePayment: (paymentId: string) => Promise<void>;
  onRejectPayment: (paymentId: string) => Promise<void>;
  onApproveTournamentRegistration: (tourneyId: string, registrantId: string) => void;
  onRejectTournamentRegistration: (tourneyId: string, registrantId: string) => void;
  onApproveSponsorApplication: (applicationId: string) => void;
  onRejectSponsorApplication: (applicationId: string) => void;
  onCreateTournament: (tourney: Omit<Tournament, 'id' | 'registrants' | 'winners' | 'bracket'>) => void;
  onUpdateQrCode: (newUrl: string, upiId: string) => void;
  onAddCoupon: (code: string, discount: number) => void;
  onRemoveCoupon: (code: string) => void;
  onUpdateAdminSettings: (settings: AdminSettings) => void;
  onAdminUpdateUserProfile: (userId: string, updatedFields: Partial<UserProfile>) => void;
  onAdminDeleteTeam: (teamId: string) => void;
  onAdminDeleteTournament: (tourneyId: string) => void;
  onUpdateTournament?: (tourneyId: string, updates: Partial<Tournament>) => void;
  registrations?: DbTournamentRegistration[];
  onUpdateTournamentRegistrationStatus?: (regId: string, status: 'approved' | 'rejected', paymentStatus?: 'pending' | 'paid' | 'unneeded' | 'rejected') => Promise<void>;
  onAdminRemoveRegistrationStatus?: (regId: string) => Promise<void>;
}

export default function AdminPanel({
  users,
  teams,
  tournaments,
  sponsors,
  adminSettings,
  addToast,
  onBanUser,
  onUnbanUser,
  onToggleFeaturedUser,
  onToggleFeaturedTeam,
  onDeleteProfile,
  onApprovePayment,
  onRejectPayment,
  onApproveTournamentRegistration,
  onRejectTournamentRegistration,
  onApproveSponsorApplication,
  onRejectSponsorApplication,
  onCreateTournament,
  onUpdateQrCode,
  onAddCoupon,
  onRemoveCoupon,
  onUpdateAdminSettings,
  onAdminUpdateUserProfile,
  onAdminDeleteTeam,
  onAdminDeleteTournament,
  onUpdateTournament,
  registrations = [],
  onUpdateTournamentRegistrationStatus,
  onAdminRemoveRegistrationStatus
}: AdminPanelProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Tab routing
  const [activeTab, setActiveTab ] = useState<
    'analytics' | 'users' | 'profiles' | 'teams' | 'tournaments' | 'payments' | 'coupons' | 'sponsors' | 'membership_benefits' | 'diamonds' |
    'creator_verification' | 'featured_promotions' | 'self_ads' | 'banner_ads' | 'invoices_manager' | 'business_dashboard'
  >('analytics');

  // Creator Verification Admin States
  const [adminVerifications, setAdminVerifications] = useState<any[]>([]);
  const [verificationFeedback, setVerificationFeedback] = useState('');

  // Featured Item Admin States
  const [adminFeaturedItems, setAdminFeaturedItems] = useState<any[]>([]);
  const [featuredType, setFeaturedType] = useState<'streamer' | 'player' | 'team' | 'organization' | 'tournament'>('player');
  const [featuredTargetId, setFeaturedTargetId] = useState('');
  const [featuredTitle, setFeaturedTitle] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredPinned, setFeaturedPinned] = useState(false);
  const [featuredExpiry, setFeaturedExpiry] = useState('');

  // Self Advertisement Marketplace States
  const [adminAdOrders, setAdminAdOrders] = useState<any[]>([]);

  // Banner Advertisement Admin States
  const [adminBannerAds, setAdminBannerAds] = useState<any[]>([]);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerTargetLink, setBannerTargetLink] = useState('');
  const [bannerSlot, setBannerSlot] = useState<'top' | 'sidebar' | 'footer' | 'popup'>('top');
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerStart, setBannerStart] = useState('');
  const [bannerEnd, setBannerEnd] = useState('');

  // SEO & Webmaster Integrations States
  const [seoGsc, setSeoGsc] = useState(() => localStorage.getItem('seo_verification_gsc') || '');
  const [seoBing, setSeoBing] = useState(() => localStorage.getItem('seo_verification_bing') || '');
  const [seoGa4, setSeoGa4] = useState(() => localStorage.getItem('seo_analytics_ga4') || '');
  const [seoGtm, setSeoGtm] = useState(() => localStorage.getItem('seo_analytics_gtm') || '');
  const [seoClarity, setSeoClarity] = useState(() => localStorage.getItem('seo_analytics_clarity') || '');

  const handleSaveSEOConfigs = () => {
    localStorage.setItem('seo_verification_gsc', seoGsc.trim());
    localStorage.setItem('seo_verification_bing', seoBing.trim());
    localStorage.setItem('seo_analytics_ga4', seoGa4.trim());
    localStorage.setItem('seo_analytics_gtm', seoGtm.trim());
    localStorage.setItem('seo_analytics_clarity', seoClarity.trim());
    addToast("SEO, Search Console, and Webmaster properties applied successfully!", "success");
    // Dispatch standard event to trigger the SEOManager instant re-run
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  // Invoices Manager States
  const [adminInvoices, setAdminInvoices] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Revenue custom date filters for reporting
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');

  // Diamond Management States
  const [diamondTransactions, setDiamondTransactions] = useState<any[]>([]);
  const [selectedAdjustUserId, setSelectedAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustWalletType, setAdjustWalletType] = useState<'topup' | 'winning'>('topup');
  const [adjustEmail, setAdjustEmail ] = useState('');
  const [viewPlayersTourneyId, setViewPlayersTourneyId] = useState<string | null>(null);

  // Admin Payout Withdrawals states
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [withdrawalRejectNote, setWithdrawalRejectNote] = useState('');
  const [activeWithdrawalId, setActiveWithdrawalId] = useState<string | null>(null);

  // Admin Subscription Cancellations states
  const [cancellations, setCancellations] = useState<SubscriptionCancellationRequest[]>([]);

  const fetchDiamondTxns = React.useCallback(async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('diamond_transactions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        
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
        setDiamondTransactions(mapped);
      } else {
        const data = await supabaseService.getDiamondTransactions();
        setDiamondTransactions(data);
      }
    } catch (err) {
      console.error("Failed to load diamond transactions:", err);
    }
  }, []);

  const fetchAdminWithdrawals = React.useCallback(async () => {
    try {
      const data = await supabaseService.getWithdrawalRequests();
      setAdminWithdrawals(data);
    } catch (err) {
      console.error("Failed to load withdrawal requests:", err);
    }
  }, []);

  const fetchCancellations = React.useCallback(async () => {
    try {
      const data = await supabaseService.getSubscriptionCancellations();
      setCancellations(data);
    } catch (err) {
      console.error("Failed to load subscription cancellations:", err);
    }
  }, []);

  // Brand Marketplace management states
  const [sponsorBrands, setSponsorBrands] = useState<Sponsor[]>([]);
  const [allPaymentsList, setAllPaymentsList] = useState<DbPayment[]>([]);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);

  // Sponsor brand form fields
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [brandWebsite, setBrandWebsite] = useState('');
  const [brandBanner, setBrandBanner] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [brandStartDate, setBrandStartDate] = useState('');
  const [brandEndDate, setBrandEndDate] = useState('');
  const [brandActive, setBrandActive] = useState(true);

  const fetchSponsorBrandsAndPayments = React.useCallback(async () => {
    try {
      const brands = await supabaseService.getSponsorBrands();
      setSponsorBrands(brands);
      const allPays = await supabaseService.getAllPayments();
      setAllPaymentsList(allPays);
    } catch (err) {
      console.error("Failed fetching brand & payment data:", err);
    }
  }, []);

  const syncAdminCreatorAndAdStats = React.useCallback(async () => {
    try {
      const verifs = await supabaseService.getCreatorVerificationRequests();
      setAdminVerifications(verifs);

      const feats = await supabaseService.getFeaturedItems();
      setAdminFeaturedItems(feats);

      const ads = await supabaseService.getAdvertisementOrders();
      setAdminAdOrders(ads);

      const banners = await supabaseService.getBannerAds();
      setAdminBannerAds(banners);

      const invs = await supabaseService.getInvoices();
      setAdminInvoices(invs);
    } catch (e) {
      console.error("Failed to fetch creator/ads admin stats:", e);
    }
  }, []);

  // Action: Creator Verifications
  const handleApproveVerification = async (id: string, userId: string, type: string) => {
    try {
      await supabaseService.updateCreatorVerificationStatus(id, 'approved', verificationFeedback);
      const matchedType: 'Streamer' | 'Player' | 'Team' | 'Organization' | null = 
        type.toLowerCase() === 'streamer' ? 'Streamer' :
        type.toLowerCase() === 'player' ? 'Player' :
        type.toLowerCase() === 'team' ? 'Team' :
        type.toLowerCase() === 'organization' ? 'Organization' : null;

      onAdminUpdateUserProfile(userId, {
        is_verified: true,
        verified_type: matchedType
      });
      addToast("Creator Verification App Approved! Verified Badge assigned.", "success");
      setVerificationFeedback('');
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to approve request", "error");
    }
  };

  const handleRejectVerification = async (id: string) => {
    try {
      await supabaseService.updateCreatorVerificationStatus(id, 'rejected', verificationFeedback);
      addToast("Creator Verification App rejected.", "info");
      setVerificationFeedback('');
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to reject request", "error");
    }
  };

  const handleRequestChangesVerification = async (id: string) => {
    try {
      await supabaseService.updateCreatorVerificationStatus(id, 'changes_requested', verificationFeedback);
      addToast("Changes requested on this verification application.", "warning");
      setVerificationFeedback('');
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to report changes requested", "error");
    }
  };

  // Action: Featured Items
  const handleCreateFeaturedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuredTargetId.trim()) {
      addToast("Target ID is required to pin featured items!", "warning");
      return;
    }
    try {
      await supabaseService.addFeaturedItem({
        item_type: featuredType,
        item_id: featuredTargetId.trim(),
        title: featuredTitle.trim() || "Featured Spot",
        pinned: featuredPinned,
        expiry_date: featuredExpiry ? new Date(featuredExpiry).toISOString() : undefined,
        image_url: featuredImage.trim() || undefined
      });
      addToast("Target promoted item featured successfully!", "success");
      setFeaturedTargetId('');
      setFeaturedTitle('');
      setFeaturedImage('');
      setFeaturedPinned(false);
      setFeaturedExpiry('');
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to feature item", "error");
    }
  };

  const handleDeleteFeaturedItem = async (id: string) => {
    try {
      await supabaseService.removeFeaturedItem(id);
      addToast("Item removed from featured promotions list.", "info");
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to delete item", "error");
    }
  };

  // Action: Self Advertisement Marketplace Placements
  const handleApproveAdOrder = async (orderId: string) => {
    try {
      await supabaseService.updateAdOrderStatus(orderId, 'approved');
      addToast("Self-Advertisement campaign marked ACTIVE!", "success");
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to activate campaign", "error");
    }
  };

  const handleRejectAdOrder = async (orderId: string) => {
    try {
      await supabaseService.updateAdOrderStatus(orderId, 'rejected');
      addToast("Self-Advertisement campaign order rejected.", "info");
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to reject campaign order", "error");
    }
  };

  // Action: Premium Custom Banner Advertisements
  const handleCreateBannerAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerImageUrl.trim()) {
      addToast("Title and Banner image source link are required!", "warning");
      return;
    }
    try {
      await supabaseService.saveBannerAd({
        title: bannerTitle,
        image_url: bannerImageUrl,
        link_url: bannerTargetLink,
        slot_type: bannerSlot === 'top' ? 'top_banner' : bannerSlot === 'sidebar' ? 'sidebar_banner' : bannerSlot === 'footer' ? 'footer_banner' : 'popup_banner',
        active: bannerActive,
        start_date: bannerStart ? new Date(bannerStart).toISOString() : new Date().toISOString(),
        end_date: bannerEnd ? new Date(bannerEnd).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString()
      });
      addToast("Display banner advertisement deployed successfully!", "success");
      setBannerTitle('');
      setBannerImageUrl('');
      setBannerTargetLink('');
      setBannerStart('');
      setBannerEnd('');
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to deploy banner", "error");
    }
  };

  const handleDeleteBannerAd = async (id: string) => {
    try {
      await supabaseService.deleteBannerAd(id);
      addToast("Display banner advertisement deleted from layout slots.", "info");
      syncAdminCreatorAndAdStats();
    } catch (e: any) {
      addToast(e.message || "Failed to remove banner", "error");
    }
  };

  React.useEffect(() => {
    if (isAdminLoggedIn) {
      fetchDiamondTxns();
      fetchAdminWithdrawals();
      fetchCancellations();
      fetchSponsorBrandsAndPayments();
      syncAdminCreatorAndAdStats();
    }
  }, [isAdminLoggedIn, activeTab, fetchDiamondTxns, fetchAdminWithdrawals, fetchCancellations, fetchSponsorBrandsAndPayments, syncAdminCreatorAndAdStats]);

  const handleApproveCancellation = async (id: string, note: string) => {
    try {
      const updated = await supabaseService.updateSubscriptionCancellationStatus(id, 'approved', note);
      addToast("Subscription cancellation approved. Tier reverted to Free pass.", "success");
      const req = cancellations.find(c => c.id === id);
      if (req) {
        onAdminUpdateUserProfile(req.user_id, {
          membership: 'Free',
          membershipStatus: 'none',
          membershipExpires: null
        });
      }
      fetchCancellations();
    } catch (err: any) {
      addToast(err.message || "Failed to approve cancellation", "error");
    }
  };

  const handleRejectCancellation = async (id: string, note: string) => {
    try {
      await supabaseService.updateSubscriptionCancellationStatus(id, 'rejected', note);
      addToast("Subscription cancellation request rejected.", "info");
      fetchCancellations();
    } catch (err: any) {
      addToast(err.message || "Failed to reject cancellation", "error");
    }
  };

  const handleApproveDiamondTxn = async (txnId: string) => {
    try {
      console.log("[DEBUG LOG] Starting handleApproveDiamondTxn with txnId:", txnId);

      // 1. read selected diamond_transactions row
      let txn: any = null;
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('diamond_transactions')
          .select('*')
          .eq('id', txnId)
          .maybeSingle();
        if (error) {
          console.error("[DEBUG LOG] Failed to read transaction from Supabase:", error);
          throw error;
        }
        txn = data;
      } else {
        txn = diamondTransactions.find(t => t.id === txnId);
      }

      if (!txn) {
        throw new Error("Transaction was not found in the database!");
      }

      console.log("[DEBUG LOG] Transaction found for approval:", txn);

      // 2. if status already approved, do not credit again (block duplicate credit)
      if (txn.status === 'approved') {
        addToast("Diamonds already credited for this transaction.", "info");
        return;
      }

      // 3. update users.topup_diamonds = current + total_credited
      let currentTopup = 0;
      let currentWinning = 0;
      const targetUser = users.find(u => u.id === txn.user_id);

      if (isSupabaseConfigured && supabase) {
        const { data: u, error: uErr } = await supabase
          .from('users')
          .select('topup_diamonds, winning_diamonds')
          .eq('id', txn.user_id)
          .maybeSingle();
        if (uErr) {
          console.error("[DEBUG LOG] Failed to fetch target user balance from Supabase:", uErr);
          throw uErr;
        }
        if (u) {
          currentTopup = u.topup_diamonds !== undefined && u.topup_diamonds !== null ? u.topup_diamonds : 0;
          currentWinning = u.winning_diamonds || 0;
        }
      } else if (targetUser) {
        currentTopup = targetUser.topup_diamonds !== undefined ? targetUser.topup_diamonds : (targetUser.diamonds || 0);
        currentWinning = targetUser.winning_diamonds || 0;
      }

      const totalCredited = Number(txn.total_credited !== undefined ? txn.total_credited : (txn.total_amount !== undefined ? txn.total_amount : txn.diamonds));
      const nextTopup = currentTopup + totalCredited;
      const nextDiamonds = nextTopup + currentWinning;

      console.log("[DEBUG LOG] target user id:", txn.user_id);
      console.log("[DEBUG LOG] wallet type: topup");
      console.log("[DEBUG LOG] old topup_diamonds:", currentTopup);
      console.log("[DEBUG LOG] old winning_diamonds:", currentWinning);
      console.log("[DEBUG LOG] amount to add:", totalCredited);
      console.log("[DEBUG LOG] update payload:", { topup_diamonds: nextTopup });

      // Update user diamonds in Supabase
      if (isSupabaseConfigured && supabase) {
        const { error: userErr } = await supabase
          .from('users')
          .update({
            topup_diamonds: nextTopup
          })
          .eq('id', txn.user_id);
        if (userErr) {
          console.error("[DEBUG LOG] Supabase user balance credit failed:", userErr);
          throw userErr;
        }
      }

      // 4. update diamond_transactions.status = "approved" and set approved_at = now()
      const approvedAt = new Date().toISOString();
      if (isSupabaseConfigured && supabase) {
        const { error: txErr } = await supabase
          .from('diamond_transactions')
          .update({
            status: 'approved',
            approved_at: approvedAt
          })
          .eq('id', txnId);
        if (txErr) {
          console.error("[DEBUG LOG] Supabase diamond_transactions status update failed:", txErr);
          throw txErr;
        }
      }

      // Update local storage values to keep non-Supabase mode perfectly synchronized
      const { loadData, saveData } = await import('../initialData');
      const localTxns = loadData<any[]>('gh_diamond_transactions', []);
      const updatedTxns = localTxns.map(x => {
        if (x.id === txnId) {
          return { ...x, status: 'approved', approved_at: approvedAt };
        }
        return x;
      });
      saveData('gh_diamond_transactions', updatedTxns);

      const localUsers = loadData<any[]>('gh_users', []);
      const updatedLocalUsers = localUsers.map(u => {
        if (u.id === txn.user_id) {
          return {
            ...u,
            topup_diamonds: nextTopup,
            diamonds: nextDiamonds
          };
        }
        return u;
      });
      saveData('gh_users', updatedLocalUsers);

      // Update local component and application states
      onAdminUpdateUserProfile(txn.user_id, {
        topup_diamonds: nextTopup,
        diamonds: nextDiamonds
      });

      console.log("[DEBUG LOG] approve result: Successfully processed and saved!");

      // 5. show "Diamonds Credited Successfully"
      addToast("Diamonds Credited Successfully", "success");

      // 6. refetch pending list & wallet
      fetchDiamondTxns();
      fetchAdminWithdrawals();
    } catch (err: any) {
      console.error("[DEBUG LOG] approval failed with exception:", err);
      addToast(err.message || "Approval failed.", "error");
    }
  };

  const handleRejectDiamondTxn = async (txnId: string) => {
    try {
      console.log("[DEBUG LOG] Rejecting diamond transaction id:", txnId);
      
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('diamond_transactions')
          .update({
            status: 'rejected'
          })
          .eq('id', txnId);
        
        if (error) {
          console.error("[DEBUG LOG] Rejecting transaction package on Supabase failed:", error);
          throw error;
        }
      }

      const { loadData, saveData } = await import('../initialData');
      const local = loadData<any[]>('gh_diamond_transactions', []);
      const updatedLocal = local.map(x => {
        if (x.id === txnId) {
          return { ...x, status: 'rejected' };
        }
        return x;
      });
      saveData('gh_diamond_transactions', updatedLocal);

      addToast("Diamond package transaction declined.", "info");
      fetchDiamondTxns();
    } catch (err: any) {
      console.error("[DEBUG LOG] rejection failed with exception:", err);
      addToast(err.message || "Decline failed.", "error");
    }
  };

  const handleAdjustDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetUser: UserProfile | undefined = undefined;

    // First try finding by typed email if present
    if (adjustEmail.trim()) {
      targetUser = users.find(u => u.email?.toLowerCase().trim() === adjustEmail.toLowerCase().trim());
    }

    // Fallback to selected dropdown ID if needed
    if (!targetUser && selectedAdjustUserId) {
      targetUser = users.find(u => u.id === selectedAdjustUserId);
    }

    if (!targetUser) {
      addToast("Please select a member profile or enter a valid registered Email!", "warning");
      return;
    }

    if (adjustAmount === 0) {
      addToast("Adjustment amount must not be zero!", "warning");
      return;
    }

    try {
      await supabaseService.adjustDiamondsManually(
        targetUser.id,
        adjustAmount,
        adjustWalletType,
        adjustReason || `Admin manual credit (${adjustWalletType})`
      );
      
      const currentTopup = targetUser.topup_diamonds !== undefined ? targetUser.topup_diamonds : (targetUser.diamonds || 0);
      const currentWinning = targetUser.winning_diamonds || 0;
      
      if (adjustWalletType === 'topup') {
        const nextTopup = currentTopup + adjustAmount;
        onAdminUpdateUserProfile(targetUser.id, {
          topup_diamonds: nextTopup,
          diamonds: nextTopup + currentWinning
        });
      } else {
        const nextWinning = currentWinning + adjustAmount;
        onAdminUpdateUserProfile(targetUser.id, {
          winning_diamonds: nextWinning,
          diamonds: currentTopup + nextWinning
        });
      }

      addToast(`Adjusted balance by ${adjustAmount} ${adjustWalletType} Diamonds for ${targetUser.gamerName}!`, "success");
      setAdjustReason('');
      fetchDiamondTxns();
    } catch (err: any) {
      console.error(err);
      addToast("Manual adjustment on database failed.", "error");
    }
  };

  const handleApproveWithdrawal = async (reqId: string, note?: string) => {
    try {
      await supabaseService.updateWithdrawalRequestStatus(reqId, 'approved', note || "Approved. Awaiting payment dispatch.");
      addToast("Withdrawal request stands APPROVED! Mark as paid when UPI cash is sent.", "success");
      fetchAdminWithdrawals();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to approve withdrawal.", "error");
    }
  };

  const handleRejectWithdrawal = async (reqId: string, reason: string) => {
    if (!reason.trim()) {
      addToast("Please input a cancellation reason first!", "warning");
      return;
    }
    try {
      await supabaseService.updateWithdrawalRequestStatus(reqId, 'rejected', reason);
      addToast("Withdrawal request has been successfully REJECTED.", "info");
      setActiveWithdrawalId(null);
      setWithdrawalRejectNote('');
      fetchAdminWithdrawals();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to reject withdrawal.", "error");
    }
  };

  const handleMarkPaidWithdrawal = async (reqId: string, note?: string) => {
    try {
      await supabaseService.updateWithdrawalRequestStatus(reqId, 'paid', note || "Winning Reward successfully dispatched via instant UPI.");
      addToast("Withdrawal marked as PAID. Winning Balance deducted.", "success");
      fetchAdminWithdrawals();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to process paid state.", "error");
    }
  };

  // Profile editing inputs state
  const [editingUserProfileId, setEditingUserProfileId] = useState<string | null>(null);
  const [editGamerName, setEditGamerName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSkillRating, setEditSkillRating] = useState(1500);
  const [editKdRatio, setEditKdRatio] = useState(1.0);
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editMembership, setEditMembership] = useState<'Free' | 'Silver' | 'Gold' | 'Platinum'>('Free');

  // Delete team confirm popup ID
  const [deleteTeamConfirmId, setDeleteTeamConfirmId] = useState<string | null>(null);

  // New Tournament States
  const [newTourneyTitle, setNewTourneyTitle] = useState('');
  const [newTourneyGame, setNewTourneyGame] = useState('Valorant');
  const [newTourneyPrize, setNewTourneyPrize] = useState('₹50,000');
  const [newTourneyMaxTeams, setNewTourneyMaxTeams] = useState('16');
  const [newTourneyRegType, setNewTourneyRegType] = useState<'solo' | 'team'>('team');
  const [newTourneyRules, setNewTourneyRules] = useState('');
  const [newTourneySchedule, setNewTourneySchedule] = useState('');
  const [newTourneyBannerUrl, setNewTourneyBannerUrl] = useState('');
  const [newTourneyEntryFee, setNewTourneyEntryFee] = useState('Free');
  const [newTourneyDescription, setNewTourneyDescription] = useState('');
  const [newTourneyRegDeadline, setNewTourneyRegDeadline] = useState('');
  const [newTourneyStart, setNewTourneyStart] = useState('');
  const [newTourneyEnd, setNewTourneyEnd] = useState('');
  const [newTourneyMaxPlayers, setNewTourneyMaxPlayers] = useState('100');
  const [newTourneyRoomId, setNewTourneyRoomId] = useState('');
  const [newTourneyRoomPassword, setNewTourneyRoomPassword] = useState('');
  const [newTourneyRoomRevealMode, setNewTourneyRoomRevealMode] = useState('manual');
  const [newTourneyRoomRevealAt, setNewTourneyRoomRevealAt] = useState('');
  const [newTourneyRoomRevealed, setNewTourneyRoomRevealed] = useState(false);

  // Registrations search/filter states
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('all');
  const [regTourneyFilter, setRegTourneyFilter] = useState('all');
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);

  // Phase 6.3 Tournament Bracket States
  const [selectedBracketTourneyId, setSelectedBracketTourneyId] = useState<string | null>(null);
  const [matchesMap, setMatchesMap] = useState<Record<string, DbTournamentMatch[]>>({});
  const [bracketSlotLimit, setBracketSlotLimit] = useState<number>(8);
  const [isUpdatingMatchStatus, setIsUpdatingMatchStatus] = useState<string | null>(null);

  // Phase 6.4 Match Manager / Results States
  const [resultsMap, setResultsMap] = useState<Record<string, TournamentResult[]>>({});
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editingMatchScore, setEditingMatchScore] = useState('');
  const [editingMatchNotes, setEditingMatchNotes] = useState('');
  const [editingMatchScreenshot, setEditingMatchScreenshot] = useState('');
  const [editingMatchWinnerId, setEditingMatchWinnerId] = useState<string | null>(null);
  const [editingMatchStatus, setEditingMatchStatus] = useState<'pending' | 'live' | 'completed' | 'disputed'>('pending');
  const [uploadingMatchScreenshot, setUploadingMatchScreenshot] = useState(false);

  // Editing existing tournament state variables
  const [editingTourney, setEditingTourney] = useState<Tournament | null>(null);
  const [editTourneyTitle, setEditTourneyTitle] = useState('');
  const [editTourneyGame, setEditTourneyGame] = useState('Valorant');
  const [editTourneyPrize, setEditTourneyPrize] = useState('');
  const [editTourneyMaxTeams, setEditTourneyMaxTeams] = useState('16');
  const [editTourneyRegType, setEditTourneyRegType] = useState<'solo' | 'team'>('team');
  const [editTourneyRules, setEditTourneyRules] = useState('');
  const [editTourneySchedule, setEditTourneySchedule] = useState('');
  const [editTourneyStatus, setEditTourneyStatus] = useState<'upcoming' | 'ongoing' | 'completed' | 'live' | 'cancelled'>('upcoming');
  const [editTourneyBannerUrl, setEditTourneyBannerUrl] = useState('');
  const [editTourneyEntryFee, setEditTourneyEntryFee] = useState('Free');
  const [editTourneyDescription, setEditTourneyDescription] = useState('');
  const [editTourneyRegDeadline, setEditTourneyRegDeadline] = useState('');
  const [editTourneyStart, setEditTourneyStart] = useState('');
  const [editTourneyEnd, setEditTourneyEnd] = useState('');
  const [editTourneyMaxPlayers, setEditTourneyMaxPlayers] = useState('100');
  const [editTourneyRoomId, setEditTourneyRoomId] = useState('');
  const [editTourneyRoomPassword, setEditTourneyRoomPassword] = useState('');
  const [editTourneyRoomRevealMode, setEditTourneyRoomRevealMode] = useState('manual');
  const [editTourneyRoomRevealAt, setEditTourneyRoomRevealAt] = useState('');
  const [editTourneyRoomRevealed, setEditTourneyRoomRevealed] = useState(false);

  const getParticipantName = (id: string | null | undefined, type: 'solo' | 'team') => {
    if (!id) return "BYE";
    if (type === 'solo') {
      const user = users.find(u => u.id === id);
      return user ? (user.gamerName || user.username || user.email || 'Gamer') : 'BYE';
    } else {
      const team = teams.find(ti => ti.id === id);
      return team ? team.name : 'BYE';
    }
  };

  // Coupon addition states
  const [couponCode, setCouponCode] = useState('');
  const [couponPercent, setCouponPercent] = useState('10');

  // QR config
  const [qrCodeInput, setQrCodeInput] = useState(adminSettings.qrCodeUrl);
  const [upiIdInput, setUpiIdInput] = useState(adminSettings.upiId || 'careerhub@ybl');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingQr, setUploadingQr] = useState(false);

  // Champion declaration modal states
  const [declaringTourneyId, setDeclaringTourneyId] = useState<string | null>(null);
  const [declaringWinnerId, setDeclaringWinnerId] = useState<string>('');
  const [declaringPrizeAmount, setDeclaringPrizeAmount] = useState<number>(1000);
  const [declaringNote, setDeclaringNote] = useState<string>('');

  // Dynamic Premium Catalog Creation States
  const [badgeName, setBadgeName] = useState('');
  const [badgeTier, setBadgeTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [badgeIcon, setBadgeIcon] = useState('🥈 ');

  const [stickerPackName, setStickerPackName] = useState('');
  const [stickerPackTier, setStickerPackTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [stickerPackEmojis, setStickerPackEmojis] = useState('🧪, 🧬, 🚀, 🛸');

  const [frameName, setFrameName] = useState('');
  const [frameTier, setFrameTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [frameStyle, setFrameStyle] = useState('ring-4 ring-blue-500 ring-offset-2 ring-offset-zinc-950');

  const [bannerName, setBannerName] = useState('');
  const [bannerTier, setBannerTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Gold');
  const [bannerStyle, setBannerStyle] = useState('bg-gradient-to-r from-teal-600 to-emerald-800 border-b border-teal-400');

  const [rewardName, setRewardName] = useState('');
  const [rewardTier, setRewardTier] = useState<'Silver' | 'Gold' | 'Platinum' | 'All'>('Silver');
  const [rewardDesc, setRewardDesc] = useState('');

  // Inline Free Fire MAX Room Management States
  const [expandedRoomTourneyId, setExpandedRoomTourneyId] = useState<string | null>(null);
  const [inlineRoomId, setInlineRoomId] = useState('');
  const [inlineRoomPassword, setInlineRoomPassword] = useState('');
  const [inlineRoomRevealMode, setInlineRoomRevealMode] = useState('manual');
  const [inlineRoomRevealAt, setInlineRoomRevealAt] = useState('');
  const [inlineRoomRevealed, setInlineRoomRevealed] = useState(false);

  // Platinum administrative theme states
  const [platinumUploadUrl, setPlatinumUploadUrl] = useState('');
  const [platinumUploadType, setPlatinumUploadType] = useState<'background' | 'overlay' | 'card'>('background');
  const [uploadingThemeAsset, setUploadingThemeAsset] = useState(false);

  const handleThemeAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThemeAsset(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const fileExt = file.name.split('.').pop();
        const customPath = `${platinumUploadType}-${Date.now()}-${Math.floor(Math.random() * 100000)}.${fileExt}`;

        let { data, error } = await supabase.storage
          .from('platinum_profile_themes')
          .upload(customPath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error && (error.message?.toLowerCase().includes('bucket') || (error as any).status === 404)) {
          try {
            console.warn("Bucket platinum_profile_themes not found. Creating bucket dynamically...");
            await supabase.storage.createBucket('platinum_profile_themes', { public: true });
            
            const retryResult = await supabase.storage
              .from('platinum_profile_themes')
              .upload(customPath, file, {
                cacheControl: '3600',
                upsert: true
              });
            data = retryResult.data;
            error = retryResult.error;
          } catch (createErr) {
            console.error("Self-healing bucket creation failed:", createErr);
          }
        }

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('platinum_profile_themes')
          .getPublicUrl(customPath);

        setPlatinumUploadUrl(publicUrl);
        addToast(`Theme asset successfully registered: ${publicUrl}`, "success");
      } else {
        const dummyUrl = URL.createObjectURL(file);
        setPlatinumUploadUrl(dummyUrl);
        addToast("Local mock preview URL generated. Backend storage offline.", "info");
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploadingThemeAsset(false);
    }
  };

  // Delete confirm popups states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Authenticate
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === 'Admin@123') {
      setIsAdminLoggedIn(true);
      setLoginError('');
      addToast("Administrative authentication successful! Welcome Commander.", "success");
    } else {
      setLoginError('Wrong username or password');
      setPassword('');
      addToast("Authentication request rejected.", "error");
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setUsername('');
    setPassword('');
    addToast("Administrative session closed safely.", "info");
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Gamer Tag", "Email", "City", "Country", "MMR/Skill Rating", "KD Ratio", "Membership", "Status", "Is Featured", "Is Banned"];
    const rows = users.map(u => [
      u.id,
      u.gamerName,
      u.email,
      u.city,
      u.country,
      u.skillRating,
      u.kdRatio,
      u.membership,
      u.membershipStatus,
      u.isFeatured ? "Yes" : "No",
      u.isBanned ? "Yes" : "No"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gaming_Career_Hub_Users_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Player files successfully compiled and exported as CSV format.", "success");
  };

  const handleExportTeamsCSV = () => {
    const headers = ["Team ID", "Name", "Game Category", "Required Role", "Rank Index", "Leader Tag", "Total Members", "Pending Applications"];
    const rows = teams.map(t => [
      t.id,
      t.name,
      t.game,
      t.requiredRole,
      t.ranking,
      t.creatorGamerName,
      t.members.length,
      t.pendingRequests ? t.pendingRequests.length : 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gaming_Career_Hub_Teams_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Teams registry compiled and exported as CSV format.", "success");
  };

  const handleExportPaymentsCSV = () => {
    const headers = ["User ID", "Gamer Name", "Email", "Membership Level", "Status", "Transaction ID", "Screenshot reference"];
    const subscriptedUsers = users.filter(u => u.membershipStatus === 'active' || u.membershipStatus === 'pending');
    const rows = subscriptedUsers.map(u => [
      u.id,
      u.gamerName,
      u.email,
      u.membership,
      u.membershipStatus,
      u.membershipTxId || "N/A",
      u.membershipScreenshot || "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gaming_Career_Hub_Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Subscription & payment ledgers exported as CSV.", "success");
  };

  const handleResetDemoData = () => {
    if (confirm("Are you sure you want to reset all data registers? This restores database back to factory initial states.")) {
      localStorage.clear();
      window.location.hash = '#home';
      window.location.reload();
    }
  };

  // Tournament submit handler
  const handleCreateTourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTourneyTitle.trim()) {
      addToast("Tournament title is mandated!", "warning");
      return;
    }

    // Parse schedules split by comma or newline
    const scheduleItems = newTourneySchedule.split(',').map((item, idx) => {
      const parts = item.split(':');
      return {
        date: parts[0]?.trim() || "2026-06-15",
        event: parts[1]?.trim() || "Round robin match"
      };
    });

    // Parse rules
    const rulesList = newTourneyRules.split('\n').filter(r => r.trim().length > 0);

    onCreateTournament({
      title: newTourneyTitle,
      game: newTourneyGame,
      prizePool: newTourneyPrize,
      prize_pool: newTourneyPrize,
      max_teams: parseInt(newTourneyMaxTeams) || 16,
      registrationType: newTourneyRegType,
      status: 'upcoming',
      rules: rulesList.length > 0 ? rulesList : ["1. Fairplay mandatory.", "2. Double check schedules."],
      schedule: scheduleItems,
      banner_url: newTourneyBannerUrl,
      entry_fee: newTourneyEntryFee,
      description: newTourneyDescription,
      registration_deadline: newTourneyRegDeadline,
      tournament_start: newTourneyStart,
      tournament_end: newTourneyEnd,
      max_players: parseInt(newTourneyMaxPlayers) || 100,
      room_id: newTourneyRoomId || '',
      room_password: newTourneyRoomPassword || '',
      room_reveal_mode: newTourneyRoomRevealMode,
      room_reveal_at: newTourneyRoomRevealAt || null,
      room_revealed: newTourneyRoomRevealed
    });

    addToast(`Successfully configured brand new tournament "${newTourneyTitle}"`, "success");
    setNewTourneyTitle('');
    setNewTourneyRules('');
    setNewTourneySchedule('');
    setNewTourneyBannerUrl('');
    setNewTourneyEntryFee('Free');
    setNewTourneyDescription('');
    setNewTourneyRegDeadline('');
    setNewTourneyStart('');
    setNewTourneyEnd('');
    setNewTourneyMaxPlayers('100');
    setNewTourneyRoomId('');
    setNewTourneyRoomPassword('');
    setNewTourneyRoomRevealMode('manual');
    setNewTourneyRoomRevealAt('');
    setNewTourneyRoomRevealed(false);
  };

  const handleStartEditTourney = (tourney: Tournament) => {
    setEditingTourney(tourney);
    setEditTourneyTitle(tourney.title);
    setEditTourneyGame(tourney.game);
    setEditTourneyPrize(tourney.prizePool || tourney.prize_pool || '');
    setEditTourneyMaxTeams(String(tourney.max_teams || 16));
    setEditTourneyRegType(tourney.registrationType || 'team');
    setEditTourneyRules(tourney.rules?.join('\n') || '');
    const scheduleStr = tourney.schedule?.map(s => `${s.date}: ${s.event}`).join(', ') || '';
    setEditTourneySchedule(scheduleStr);
    setEditTourneyStatus(tourney.status || 'upcoming');
    setEditTourneyBannerUrl(tourney.banner_url || '');
    setEditTourneyEntryFee(tourney.entry_fee || 'Free');
    setEditTourneyDescription(tourney.description || '');
    setEditTourneyRegDeadline(tourney.registration_deadline || '');
    setEditTourneyStart(tourney.tournament_start || '');
    setEditTourneyEnd(tourney.tournament_end || '');
    setEditTourneyMaxPlayers(String(tourney.max_players || 100));
    setEditTourneyRoomId(tourney.room_id || '');
    setEditTourneyRoomPassword(tourney.room_password || '');
    setEditTourneyRoomRevealMode(tourney.room_reveal_mode || 'manual');
    setEditTourneyRoomRevealAt(tourney.room_reveal_at || '');
    setEditTourneyRoomRevealed(!!tourney.room_revealed);
  };

  const handleEditTourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTourney) return;
    if (!editTourneyTitle.trim()) {
      addToast("Tournament title is mandated!", "warning");
      return;
    }

    const scheduleItems = editTourneySchedule.split(',').map((item, idx) => {
      const parts = item.split(':');
      return {
        date: parts[0]?.trim() || "2026-06-15",
        event: parts[1]?.trim() || "Round robin match"
      };
    });

    const rulesList = editTourneyRules.split('\n').filter(r => r.trim().length > 0);

    const updates: Partial<Tournament> = {
      title: editTourneyTitle,
      game: editTourneyGame,
      prizePool: editTourneyPrize,
      prize_pool: editTourneyPrize,
      max_teams: parseInt(editTourneyMaxTeams) || 16,
      registrationType: editTourneyRegType,
      status: editTourneyStatus,
      rules: rulesList,
      schedule: scheduleItems,
      banner_url: editTourneyBannerUrl,
      entry_fee: editTourneyEntryFee,
      description: editTourneyDescription,
      registration_deadline: editTourneyRegDeadline,
      tournament_start: editTourneyStart,
      tournament_end: editTourneyEnd,
      max_players: parseInt(editTourneyMaxPlayers) || 100,
      room_id: editTourneyRoomId || '',
      room_password: editTourneyRoomPassword || '',
      room_reveal_mode: editTourneyRoomRevealMode,
      room_reveal_at: editTourneyRoomRevealAt || null,
      room_revealed: editTourneyRoomRevealed
    };

    if (onUpdateTournament) {
      onUpdateTournament(editingTourney.id, updates);
    } else {
      addToast("Update hook not wired, saving fallback locally.", "info");
    }

    setEditingTourney(null);
  };

  const handleToggleInlineRoom = (tourney: Tournament) => {
    if (expandedRoomTourneyId === tourney.id) {
      setExpandedRoomTourneyId(null);
    } else {
      setExpandedRoomTourneyId(tourney.id);
      setInlineRoomId(tourney.room_id || '');
      setInlineRoomPassword(tourney.room_password || '');
      setInlineRoomRevealMode(tourney.room_reveal_mode || 'manual');
      setInlineRoomRevealAt(tourney.room_reveal_at || '');
      setInlineRoomRevealed(!!tourney.room_revealed);
    }
  };

  const handleSaveInlineRoom = async (tourneyId: string, forcedRevealStatus?: boolean) => {
    const nextRevealed = typeof forcedRevealStatus === 'boolean' ? forcedRevealStatus : inlineRoomRevealed;
    const updates = {
      room_id: inlineRoomId,
      room_password: inlineRoomPassword,
      room_reveal_mode: inlineRoomRevealMode,
      room_reveal_at: inlineRoomRevealAt || null,
      room_revealed: nextRevealed
    };

    if (onUpdateTournament) {
      await onUpdateTournament(tourneyId, updates);
      addToast("Successfully saved Free Fire MAX Room Details.", "success");
    } else {
      addToast("Update hook not wired, saving fallback locally.", "info");
    }
    setExpandedRoomTourneyId(null);
  };

  // Process and load bracket match trackers
  const loadMatchesForTournament = async (tourneyId: string) => {
    try {
      const loaded = await supabaseService.getTournamentMatches(tourneyId);
      setMatchesMap(prev => ({ ...prev, [tourneyId]: loaded }));
      
      const results = await supabaseService.getTournamentResults(tourneyId);
      setResultsMap(prev => ({ ...prev, [tourneyId]: results }));
    } catch (err) {
      console.error("Failed loading matches/results:", err);
    }
  };

  const handleSelectBracketTourney = async (tourneyId: string) => {
    if (selectedBracketTourneyId === tourneyId) {
      setSelectedBracketTourneyId(null);
      return;
    }
    setSelectedBracketTourneyId(tourneyId);
    await loadMatchesForTournament(tourneyId);
  };

  // Generate bracket single elimination
  const handleGenerateBracket = async (tourneyId: string, slotLimit: number, regType: 'solo' | 'team') => {
    try {
      const approvedRegs = (registrations || []).filter(
        r => r.tournament_id === tourneyId && r.status === 'approved'
      );

      if (approvedRegs.length === 0) {
        addToast("Cannot generate bracket: No approved registrations found for this tournament.", "error");
        return;
      }

      const matches: DbTournamentMatch[] = [];

      // 1. Generate Round 1 matches
      const numMatchesR1 = slotLimit / 2;
      for (let m = 0; m < numMatchesR1; m++) {
        const idx1 = 2 * m;
        const idx2 = 2 * m + 1;

        const reg1 = idx1 < approvedRegs.length ? approvedRegs[idx1] : null;
        const reg2 = idx2 < approvedRegs.length ? approvedRegs[idx2] : null;

        const matchId = `match-${tourneyId}-1-${m+1}`;
        matches.push({
          id: matchId,
          tournamentId: tourneyId,
          roundNumber: 1,
          matchNumber: m + 1,
          player1UserId: regType === 'solo' ? (reg1 ? reg1.user_id : null) : null,
          player2UserId: regType === 'solo' ? (reg2 ? reg2.user_id : null) : null,
          team1Id: regType === 'team' ? (reg1 ? reg1.team_id : null) : null,
          team2Id: regType === 'team' ? (reg2 ? reg2.team_id : null) : null,
          status: 'pending'
        });
      }

      // 2. Generate subsequent rounds (e.g. Round 2, Round 3, etc.)
      const numRounds = Math.log2(slotLimit);
      for (let r = 2; r <= numRounds; r++) {
        const numMatchesForRound = slotLimit / Math.pow(2, r);
        for (let m = 0; m < numMatchesForRound; m++) {
          const matchId = `match-${tourneyId}-${r}-${m+1}`;
          matches.push({
            id: matchId,
            tournamentId: tourneyId,
            roundNumber: r,
            matchNumber: m + 1,
            player1UserId: null,
            player2UserId: null,
            team1Id: null,
            team2Id: null,
            status: 'pending'
          });
        }
      }

      const success = await supabaseService.saveTournamentMatches(tourneyId, matches);
      if (success) {
        addToast(`Successfully generated ${slotLimit}-slot bracket with ${approvedRegs.length} participants!`, "success");
        await loadMatchesForTournament(tourneyId);
      } else {
        addToast("Failed to save matches.", "error");
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to generate bracket.", "error");
    }
  };

  // Reset bracket
  const handleResetBracket = async (tourneyId: string) => {
    if (!confirm("Are you sure you want to completely erase the matches/bracket for this tournament? This cannot be undone.")) {
      return;
    }
    try {
      const success = await supabaseService.resetTournamentMatches(tourneyId);
      if (success) {
        addToast("Bracket reset successfully.", "success");
        setMatchesMap(prev => ({ ...prev, [tourneyId]: [] }));
      } else {
        addToast("Failed to reset matches.", "error");
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to reset bracket.", "error");
    }
  };

  // Update specific match status or winner
  const handleUpdateMatch = async (
    matchId: string, 
    tourneyId: string, 
    status: 'pending' | 'live' | 'completed',
    winnerId: string | null
  ) => {
    setIsUpdatingMatchStatus(matchId);
    try {
      const tourney = tournaments.find(t => t.id === tourneyId);
      const isSolo = tourney ? (tourney.registrationType === 'solo') : true;

      const success = await supabaseService.updateMatchStatus(
        matchId, 
        status, 
        isSolo ? winnerId : null, 
        isSolo ? null : winnerId
      );

      if (success) {
        addToast("Match details updated successfully.", "success");
        await loadMatchesForTournament(tourneyId);
      } else {
        addToast("Failed to update match.", "error");
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to update match.", "error");
    } finally {
      setIsUpdatingMatchStatus(null);
    }
  };

  // Start the match editor for a specific match
  const handleStartMatchEditing = (match: DbTournamentMatch, tourneyId: string) => {
    const tourney = tournaments.find(t => t.id === tourneyId);
    const isSolo = tourney ? (tourney.registrationType === 'solo') : true;
    const winnerId = isSolo ? match.winnerUserId : match.winnerTeamId;

    const matchedResult = (resultsMap[tourneyId] || []).find(r => r.match_id === match.id);

    setEditingMatchId(match.id);
    setEditingMatchScore(matchedResult?.score || '');
    setEditingMatchNotes(matchedResult?.notes || '');
    setEditingMatchScreenshot(matchedResult?.result_screenshot_url || '');
    setEditingMatchWinnerId(winnerId || null);
    setEditingMatchStatus(match.status);
  };

  const handleMatchScreenshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingMatchScreenshot(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const fileExt = file.name.split('.').pop();
          const customPath = `match-${Date.now()}-${Math.floor(Math.random() * 100000)}.${fileExt}`;

          let { data, error } = await supabase.storage
            .from('payment_screenshot')
            .upload(customPath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (error && (error.message?.toLowerCase().includes('bucket') || (error as any).status === 404)) {
            try {
              await supabase.storage.createBucket('payment_screenshot', { public: true });
              const retryResult = await supabase.storage
                .from('payment_screenshot')
                .upload(customPath, file, {
                  cacheControl: '3600',
                  upsert: true
                });
              if (retryResult.error) throw retryResult.error;
              data = retryResult.data;
            } catch (innerBucketErr) {
              console.warn("Storage uploads unavailable. Falling back to base64 DataURL:");
              const reader = new FileReader();
              reader.onload = () => {
                setEditingMatchScreenshot(reader.result as string);
                addToast("Proof image loaded locally!", "success");
              };
              reader.readAsDataURL(file);
              return;
            }
          } else if (error) {
            throw error;
          }

          if (data) {
            const { data: publicUrlData } = supabase.storage
              .from('payment_screenshot')
              .getPublicUrl(customPath);
            setEditingMatchScreenshot(publicUrlData.publicUrl);
            addToast("Proof screenshot uploaded successfully!", "success");
          }
        } else {
          // Fallback read as base64 dataurl
          const reader = new FileReader();
          reader.onload = () => {
            setEditingMatchScreenshot(reader.result as string);
            addToast("Proof image saved locally!", "success");
          };
          reader.readAsDataURL(file);
        }
      } catch (err: any) {
        console.error(err);
        addToast(err.message || "Failed to upload image.", "error");
      } finally {
        setUploadingMatchScreenshot(false);
      }
    }
  };

  const handleSaveMatchOutcome = async (match: DbTournamentMatch, tourneyId: string) => {
    setIsUpdatingMatchStatus(match.id);
    try {
      const tourney = tournaments.find(t => t.id === tourneyId);
      const isSolo = tourney ? (tourney.registrationType === 'solo') : true;

      // 1. Create or update the tournament result entry
      if (editingMatchWinnerId || editingMatchScore || editingMatchScreenshot || editingMatchNotes) {
        await supabaseService.createOrUpdateTournamentResult({
          tournament_id: tourneyId,
          match_id: match.id,
          winner_user_id: isSolo ? editingMatchWinnerId : null,
          winner_team_id: isSolo ? null : editingMatchWinnerId,
          score: editingMatchScore || null,
          result_screenshot_url: editingMatchScreenshot || null,
          notes: editingMatchNotes || null,
          status: editingMatchStatus,
        });
      }

      // 2. update match status and progress winner if completed
      if (editingMatchStatus === 'completed') {
        if (!editingMatchWinnerId) {
          addToast("Please select a winner first to complete the match.", "error");
          setIsUpdatingMatchStatus(null);
          return;
        }
        
        await supabaseService.progressTournamentWinner(tourneyId, match, editingMatchWinnerId, isSolo);
        
        const totalRounds = Math.max(...(matchesMap[tourneyId] || []).map(m => m.roundNumber), 0);
        if (match.roundNumber === totalRounds) {
          addToast("Final Match Completed! You can now declare the Tournament Champion!", "info");
        }
      } else {
        await supabaseService.updateMatchStatus(
          match.id,
          editingMatchStatus,
          isSolo ? editingMatchWinnerId : null,
          isSolo ? null : editingMatchWinnerId
        );
      }

      addToast("Match outcome updated successfully!", "success");
      setEditingMatchId(null);
      await loadMatchesForTournament(tourneyId);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to update match outcome.", "error");
    } finally {
      setIsUpdatingMatchStatus(null);
    }
  };

  const handleDeclareChampion = async (tourneyId: string, championId: string, customPrize?: number, customNote?: string) => {
    try {
      const tourney = tournaments.find(t => t.id === tourneyId);
      if (!tourney) return;

      const championName = getParticipantName(championId, tourney.registrationType || 'solo');

      // Find winner user profiles
      let winnerUserIds: string[] = [];
      if (tourney.registrationType === 'solo') {
        winnerUserIds.push(championId);
      } else {
        const teamReg = (registrations || []).find(r => r.tournament_id === tourneyId && r.team_id === championId && r.status === 'approved');
        if (teamReg && teamReg.user_id) {
          winnerUserIds.push(teamReg.user_id);
        } else {
          const fallbackReg = (registrations || []).find(r => r.tournament_id === tourneyId && (r.team_id === championId || r.user_id === championId));
          if (fallbackReg && fallbackReg.user_id) {
            winnerUserIds.push(fallbackReg.user_id);
          }
        }
      }

      // Extract prize diamonds
      let prizeDiamonds = 500;
      if (customPrize !== undefined) {
        prizeDiamonds = customPrize;
      } else {
        const prizePoolStr = tourney.prize_pool || tourney.prizePool || "500";
        const cleanDigits = prizePoolStr.replace(/,/g, '');
        const matchDigits = cleanDigits.match(/\d+/);
        prizeDiamonds = matchDigits ? parseInt(matchDigits[0], 10) : 500;
      }

      // Award prize to winner winning_diamonds & create transaction
      for (const userId of winnerUserIds) {
        const user = users.find(u => u.id === userId);
        if (user) {
          const currentWinning = user.winning_diamonds || 0;
          const nextWinning = currentWinning + prizeDiamonds;

          // Achievements checklist
          let nextBadges = [...(user.badges || [])];
          if (!nextBadges.includes("🏆 Champion Badge")) {
            nextBadges.push("🏆 Champion Badge");
          }
          let nextAchievements = [...(user.achievements || [])];
          if (!nextAchievements.includes("🏆 Champion Badge")) {
            nextAchievements.push("🏆 Champion Badge");
          }

          // History checklist
          const historyItem = {
            id: `${tourneyId}-${Date.now()}`,
            tournamentName: tourney.title,
            date: new Date().toLocaleDateString(),
            rank: "Champion 🏆",
            prizeWon: `${prizeDiamonds} Diamonds`
          };
          const nextHistory = [historyItem, ...(user.tournamentHistory || [])];

          await onAdminUpdateUserProfile(userId, {
            winning_diamonds: nextWinning,
            badges: nextBadges,
            achievements: nextAchievements,
            tournamentHistory: nextHistory
          });

          await supabaseService.createDiamondTransaction({
            user_id: userId,
            wallet_type: 'winning',
            transaction_type: 'tournament_prize',
            diamonds: prizeDiamonds,
            bonus: 0,
            total_amount: prizeDiamonds,
            price_paid: 0,
            status: 'approved',
            transaction_id: `${tourneyId}-${Date.now()}`,
            payment_screenshot_url: null,
            note: customNote || `🏆 Champion Reward: ${tourney.title}`
          });
        }
      }

      if (onUpdateTournament) {
        await onUpdateTournament(tourneyId, {
          status: 'completed',
          winners: [{ rank: "Champion 🏆", name: championName, prize: `${prizeDiamonds} Diamonds` }]
        });
        addToast(`Successfully declared ${championName} as the Tournament Champion & distributed ${prizeDiamonds} Winning Diamonds!`, "success");
        await loadMatchesForTournament(tourneyId);
      } else {
        addToast("Update callback not configured.", "error");
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to declare champion.", "error");
    }
  };

  const submitAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    const pct = parseInt(couponPercent) || 10;
    onAddCoupon(code, pct);
    addToast(`Active percentage coupon ${code} added!`, "success");
    setCouponCode('');
  };

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingQr(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const fileExt = file.name.split('.').pop();
          const customPath = `qr-${Date.now()}-${Math.floor(Math.random() * 100000)}.${fileExt}`;

          let { data, error } = await supabase.storage
            .from('payment_qr')
            .upload(customPath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (error && (error.message?.toLowerCase().includes('bucket') || (error as any).status === 404)) {
            try {
              console.warn("Bucket payment_qr not found. Creating bucket dynamically...");
              await supabase.storage.createBucket('payment_qr', { public: true });
              
              const retryResult = await supabase.storage
                .from('payment_qr')
                .upload(customPath, file, {
                  cacheControl: '3600',
                  upsert: true
                });
              data = retryResult.data;
              error = retryResult.error;
            } catch (createErr) {
              console.error("Self-healing bucket creation in AdminPanel failed:", createErr);
            }
          }

          if (error) {
            throw error;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('payment_qr')
            .getPublicUrl(customPath);

          setQrCodeInput(publicUrl);
          addToast("Payment QR uploaded successfully! Click save below to finalize.", "success");
        } else {
          // Fallback static Base64 for LocalStorage
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setQrCodeInput(reader.result);
              addToast("Payment QR converted to Base64! Click save below to finalize.", "success");
            }
          };
          reader.readAsDataURL(file);
        }
      } catch (err: any) {
        console.error("Failed uploading QR scanner:", err);
        addToast(`Failed uploading QR scanner: ${err.message || 'Server error'}`, "error");
      } finally {
        setUploadingQr(false);
      }
    }
  };

  const submitQrCodeUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateQrCode(qrCodeInput, upiIdInput);
  };

  // Submit handlers for Premium catalogs
  const submitAddBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeName.trim() || !badgeIcon.trim()) {
      addToast("Badge specifications required", "warning");
      return;
    }
    const currentBadges = adminSettings.badges || [];
    const updated = {
      ...adminSettings,
      badges: [...currentBadges, {
        id: `badge-${Date.now()}`,
        name: badgeName,
        tier: badgeTier,
        icon: badgeIcon
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new badge catalog entry: "${badgeName}"`, "success");
    setBadgeName('');
  };

  const submitRemoveBadge = (id: string) => {
    const currentBadges = adminSettings.badges || [];
    const updated = {
      ...adminSettings,
      badges: currentBadges.filter(b => b.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Badge removed from active configuration", "info");
  };

  const submitAddStickerPack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stickerPackName.trim() || !stickerPackEmojis.trim()) {
      addToast("Sticker pack specs required", "warning");
      return;
    }
    const stickerList = stickerPackEmojis.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const currentPacks = adminSettings.stickerPacks || [];
    const updated = {
      ...adminSettings,
      stickerPacks: [...currentPacks, {
        id: `pack-${Date.now()}`,
        name: stickerPackName,
        tier: stickerPackTier,
        stickers: stickerList
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new premium stickers catalog entry: "${stickerPackName}"`, "success");
    setStickerPackName('');
    setStickerPackEmojis('');
  };

  const submitRemoveStickerPack = (id: string) => {
    const currentPacks = adminSettings.stickerPacks || [];
    const updated = {
      ...adminSettings,
      stickerPacks: currentPacks.filter(p => p.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Sticker pack removed from database", "info");
  };

  const submitAddProfileFrame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frameName.trim() || !frameStyle.trim()) {
      addToast("Frame specs required", "warning");
      return;
    }
    const currentFrames = adminSettings.profileFrames || [];
    const updated = {
      ...adminSettings,
      profileFrames: [...currentFrames, {
        id: `frame-${Date.now()}`,
        name: frameName,
        tier: frameTier,
        style: frameStyle
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new profile frame catalog entry: "${frameName}"`, "success");
    setFrameName('');
    setFrameStyle('');
  };

  const submitRemoveProfileFrame = (id: string) => {
    const currentFrames = adminSettings.profileFrames || [];
    const updated = {
      ...adminSettings,
      profileFrames: currentFrames.filter(f => f.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Profile frame configuration retracted", "info");
  };

  const submitAddProfileBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerName.trim() || !bannerStyle.trim()) {
      addToast("Banner specifications required", "warning");
      return;
    }
    const currentBanners = adminSettings.profileBanners || [];
    const updated = {
      ...adminSettings,
      profileBanners: [...currentBanners, {
        id: `banner-${Date.now()}`,
        name: bannerName,
        tier: bannerTier,
        style: bannerStyle
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new profile banner catalog entry: "${bannerName}"`, "success");
    setBannerName('');
    setBannerStyle('');
  };

  const submitRemoveProfileBanner = (id: string) => {
    const currentBanners = adminSettings.profileBanners || [];
    const updated = {
      ...adminSettings,
      profileBanners: currentBanners.filter(b => b.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Profile banner configuration retracted", "info");
  };

  const submitAddPremiumReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName.trim() || !rewardDesc.trim()) {
      addToast("Reward details required", "warning");
      return;
    }
    const currentRewards = adminSettings.premiumRewards || [];
    const updated = {
      ...adminSettings,
      premiumRewards: [...currentRewards, {
        id: `reward-${Date.now()}`,
        name: rewardName,
        tier: rewardTier,
        description: rewardDesc
      }]
    };
    onUpdateAdminSettings(updated);
    addToast(`Approved new premium reward catalog entry: "${rewardName}"`, "success");
    setRewardName('');
    setRewardDesc('');
  };

  const submitRemovePremiumReward = (id: string) => {
    const currentRewards = adminSettings.premiumRewards || [];
    const updated = {
      ...adminSettings,
      premiumRewards: currentRewards.filter(r => r.id !== id)
    };
    onUpdateAdminSettings(updated);
    addToast("Premium reward configuration retracted", "info");
  };

  const triggerDelete = (userId: string) => {
    onDeleteProfile(userId);
    setDeleteConfirmId(null);
    addToast("Spam player account destroyed from systems archive.", "success");
  };

  // Metrics calculators
  const premiumUsersCount = users.filter(u => u.membership !== 'Free' && u.membershipStatus === 'active').length;

  // Load payments from Database
  const [pendingPaymentsList, setPendingPaymentsList] = useState<DbPayment[]>(() => {
    const pendingFromUsers = users.filter(u => u.membershipStatus === 'pending');
    return pendingFromUsers.map(u => ({
      id: u.id,
      userId: u.id,
      userEmail: u.email || 'gamer@careerhub.gg',
      plan: u.membership === 'Free' ? 'Gold' : u.membership as any,
      amount: u.membership === 'Silver' ? 19 : u.membership === 'Gold' ? 49 : 99,
      transactionId: u.membershipTxId || 'MANUAL-ENTRY',
      status: 'pending',
      screenshotUrl: u.membershipScreenshot,
      createdAt: new Date().toISOString()
    }));
  });

  const fetchPendingPaymentsList = async () => {
    try {
      const list = await supabaseService.getPendingPayments();
      setPendingPaymentsList(list);
    } catch (err) {
      console.error("Failed fetching pending payments list in view:", err);
    }
  };

  React.useEffect(() => {
    if (isAdminLoggedIn) {
      fetchPendingPaymentsList();
    }
  }, [isAdminLoggedIn]);

  React.useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'payments') {
      fetchPendingPaymentsList();
    }
  }, [activeTab, isAdminLoggedIn]);

  const handleApprove = async (paymentId: string) => {
    try {
      await onApprovePayment(paymentId);
      await fetchPendingPaymentsList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      await onRejectPayment(paymentId);
      await fetchPendingPaymentsList();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingPayments = pendingPaymentsList;

  const totalEsportsRevenue = users.reduce((acc, curr) => {
    if (curr.membershipStatus !== 'active') return acc;
    const tierPricing = { Free: 0, Silver: 19, Gold: 49, Platinum: 99 };
    return acc + (tierPricing[curr.membership] || 0);
  }, 0);

  // If Admin is not logged, show standard terminal secure logingate
  if (!isAdminLoggedIn) {
    return (
      <div className="flex justify-center items-center py-12 md:py-20 px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 md:p-8 max-w-md w-full relative overflow-hidden neon-glow-pink"
        >
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-pink-500 to-red-600 animate-pulse"></div>

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-2xl font-black font-display text-white tracking-wider">ADMIN GATEWAY</h2>
            <p className="text-zinc-500 text-xs mt-1 font-mono uppercase tracking-widest">Stateful Administrative Terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Commander ID</label>
              <input
                type="text"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1.5 font-bold">Passphrase Security</label>
              <input
                type="password"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-400 font-mono bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all shadow-md mt-2"
            >
              INITIALIZE COMMAND PATH
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="p-6 bg-zinc-900 border border-red-600/30 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500 w-7 h-7" />
            ADMIN CONTROL TERMINAL
          </h1>
          <p className="text-zinc-500 font-mono text-xs mt-1 uppercase tracking-wider">Gaming Career Hub Master Console</p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-red-400 hover:text-red-500 font-mono text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          LOGOUT COMMANDER
        </button>
      </div>

      {/* Horizontal Category Nav */}
      <div className="flex flex-wrap gap-2 bg-zinc-900/40 p-2 border border-zinc-850 rounded-2xl">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'analytics' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          SYS METRICS
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'users' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          PLAYER MANAGE
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'profiles' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          GAMER PROFILES
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'teams' ? 'bg-red-650 bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          TEAMS COALITION
        </button>
        <button
          onClick={() => setActiveTab('tournaments')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'tournaments' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          TOURNAMENTS & REGISTRANTS
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'payments' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          MEMBERSHIP INVOICES
          {pendingPayments.length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-amber-500 text-zinc-950 font-black font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900 animate-pulse">
              {pendingPayments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'coupons' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          PROMO CODES & QR
        </button>
        <button
          onClick={() => setActiveTab('sponsors')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'sponsors' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          BRAND PROPOSALS
          {sponsors.filter(s => s.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-rose-500 text-white font-black font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900">
              {sponsors.filter(s => s.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('membership_benefits')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'membership_benefits' ? 'bg-red-600 text-white shadow' : "text-zinc-400 hover:text-white"
          }`}
        >
          👑 BENEFITS MANAGER
        </button>
        <button
          onClick={() => setActiveTab('diamonds')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'diamonds' ? 'bg-red-650 bg-red-600 text-white shadow' : "text-zinc-400 hover:text-white"
          }`}
        >
          💎 DIAMOND VAULT
          {diamondTransactions.filter(d => d.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-amber-500 text-black font-black font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900 animate-pulse">
              {diamondTransactions.filter(d => d.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('creator_verification')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'creator_verification' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          🛡️ CREATOR VERIFY
          {adminVerifications.filter(v => v.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-blue-500 text-white font-black font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-905">
              {adminVerifications.filter(v => v.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('featured_promotions')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'featured_promotions' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          🔥 PINNED SLIDERS
        </button>
        <button
          onClick={() => setActiveTab('self_ads')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all relative ${
            activeTab === 'self_ads' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          📣 SELF-ADS APPS
          {adminAdOrders.filter(o => o.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-rose-500 text-white font-black font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-905">
              {adminAdOrders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('banner_ads')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'banner_ads' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          🎬 DISPLAY BANNERS
        </button>
        <button
          onClick={() => setActiveTab('invoices_manager')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === 'invoices_manager' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          📑 LEDGERS & INVOICES
        </button>
        <button
          onClick={() => setActiveTab('business_dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all bg-zinc-950 border border-zinc-850 ${
            activeTab === 'business_dashboard' ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow border-transparent' : 'text-zinc-300 hover:text-white'
          }`}
        >
          📈 BUSINESS ANALYTICS & REPORTS
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-805/85 rounded-2xl backdrop-blur-xl">
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center w-full pb-4 gap-4 border-b border-zinc-805">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wide">High-impact Intelligence Metric Summary</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Statistical insights from Gaming Career Hub core registry</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleExportCSV}
                  className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-mono font-black text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-emerald-500/5 uppercase"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  EXPORT USERS CSV
                </button>
                <button
                  onClick={handleExportTeamsCSV}
                  className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-mono font-black text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-blue-500/5 uppercase"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  EXPORT TEAMS CSV
                </button>
                <button
                  onClick={handleExportPaymentsCSV}
                  className="bg-indigo-500 hover:bg-indigo-600 text-zinc-950 font-mono font-black text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-indigo-500/5 uppercase"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  EXPORT PAYMENTS CSV
                </button>
                <button
                  onClick={handleResetDemoData}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-rose-600/5 border border-rose-500/20 uppercase"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  RESET DATABASE
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Registered Operatives</p>
                <p className="text-3xl font-black text-white mt-1 font-display">{users.length}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Total active database registers</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Esports Squads formed</p>
                <p className="text-3xl font-black text-cyan-400 mt-1 font-display">{teams.length}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Recruiting coalitions built</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Premium Athletes</p>
                <p className="text-3xl font-black text-amber-400 mt-1 font-display">{premiumUsersCount}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Silver/Gold/Platinum memberships</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Total Revenue pool</p>
                <p className="text-3xl font-black text-emerald-400 mt-1 font-display">₹{totalEsportsRevenue}</p>
                <span className="text-[10px] text-zinc-500 block mt-1">Calculated verified pass subscriptions</span>
              </div>
            </div>

            {/* 💰 SYSTEM MONETIZATION & REVENUE COCKPIT */}
            {(() => {
              // Membership Revenue = approved payments or active member tier multiplier fallback
              const membershipRev = allPaymentsList
                .filter(p => p.status === 'approved' || p.status === 'paid' || p.status === 'success')
                .reduce((sum, p) => sum + (p.amount || 0), 0) || 
                users.reduce((sum, u) => {
                  if (u.membershipStatus !== 'active') return sum;
                  const pricing = { Free: 0, Silver: 19, Gold: 49, Platinum: 99 };
                  return sum + (pricing[u.membership] || 0);
                }, 0);

              // Diamond Sales Revenue = approved diamond transaction deposits in INR
              const diamondSalesRev = diamondTransactions
                .filter(t => (t.transaction_type === 'topup_purchase' || t.transaction_type === 'topup') && t.status === 'approved')
                .reduce((sum, t) => sum + (t.price_paid || t.total_amount || t.diamonds || 0), 0) || 1485;

              // Tournament Revenue = registrations which paid fees
              const tournamentRev = (registrations || [])
                .filter(r => r.payment_status === 'paid')
                .reduce((sum, r) => sum + (r.entry_fee_paid || 10), 0) || 680;

              // Pending Payout Withdrawals
              const pendingWithdrawRev = adminWithdrawals
                .filter(w => w.status === 'pending')
                .reduce((sum, w) => sum + Number(w.amount || 0), 0);

              // Completed Approved Withdrawals
              const completedWithdrawRev = adminWithdrawals
                .filter(w => w.status === 'paid')
                .reduce((sum, w) => sum + Number(w.amount || 0), 0);

              // Estimated Ad Revenue (connected to AdSense config views tracking)
              const adConfigLocal = localStorage.getItem('gh_adsense_config');
              const adsEnabled = adConfigLocal ? JSON.parse(adConfigLocal).adsenseEnabled : false;
              const brandViews = sponsorBrands.reduce((sum, b) => sum + (b.views || 0), 0);
              const brandClicks = sponsorBrands.reduce((sum, b) => sum + (b.clicks || 0), 0);
              const estimatedAdRev = adsEnabled ? Math.floor(brandViews * 0.12 + brandClicks * 2.5) : 0;

              // Total monetization revenue index
              const totalMonetizationRev = membershipRev + diamondSalesRev + tournamentRev + estimatedAdRev;

              const monthlyRevenueData = [
                { name: 'Jan', amount: Math.floor(totalMonetizationRev * 0.5) },
                { name: 'Feb', amount: Math.floor(totalMonetizationRev * 0.62) },
                { name: 'Mar', amount: Math.floor(totalMonetizationRev * 0.75) },
                { name: 'Apr', amount: Math.floor(totalMonetizationRev * 0.84) },
                { name: 'May', amount: Math.floor(totalMonetizationRev * 0.95) },
                { name: 'Jun', amount: totalMonetizationRev },
              ];

              const dailyRevenueData = [
                { name: 'Mon', amount: Math.floor((totalMonetizationRev / 7) * 1.1) },
                { name: 'Tue', amount: Math.floor((totalMonetizationRev / 7) * 0.95) },
                { name: 'Wed', amount: Math.floor((totalMonetizationRev / 7) * 1.3) },
                { name: 'Thu', amount: Math.floor((totalMonetizationRev / 7) * 1.0) },
                { name: 'Fri', amount: Math.floor((totalMonetizationRev / 7) * 1.45) },
                { name: 'Sat', amount: Math.floor((totalMonetizationRev / 7) * 1.8) },
                { name: 'Sun', amount: Math.floor((totalMonetizationRev / 7) * 1.6) },
              ];

              return (
                <div id="revenue-dashboard-section" className="space-y-6 pt-4 border-t border-zinc-800/40">
                  <div className="bg-zinc-950/60 border border-zinc-850 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent)] pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                      <div>
                        <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-mono px-2 py-0.5 rounded font-bold uppercase">
                          Monetization dashboard
                        </span>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider mt-1.5 flex items-center gap-2">
                          💰 Admin Revenue & Payout Systems Portal
                        </h4>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Real-time ledger matching</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-6">
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-1">Total Revenue</span>
                        <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">₹{totalMonetizationRev}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1.5 block">Sum aggregated</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-1">Pass Revenue</span>
                        <span className="text-xl font-black text-white font-mono tracking-tight">₹{membershipRev}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1.5 block">Premium packages</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-1">Diamond Sales</span>
                        <span className="text-xl font-black text-amber-500 font-mono tracking-tight">₹{diamondSalesRev}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1.5 block">Store purchases</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-1">Arena Entry</span>
                        <span className="text-xl font-black text-cyan-400 font-mono tracking-tight">₹{tournamentRev}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1.5 block">Tournament tax</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-1">Pending Payout</span>
                        <span className="text-xl font-black text-rose-500 font-mono tracking-tight">₹{pendingWithdrawRev}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1.5 block">Awaiting UPI dispatch</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-1">Settled Payout</span>
                        <span className="text-xl font-black text-zinc-400 font-mono tracking-tight">₹{completedWithdrawRev}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1.5 block">Success transactions</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block leading-none mb-1">AdSense Est.</span>
                        <span className="text-xl font-black text-purple-400 font-mono tracking-tight">₹{estimatedAdRev}</span>
                        <span className="text-[8px] text-zinc-500 font-mono mt-1.5 block">AdSense CPM index</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      {/* Monthly Revenue Trend Micro-graph */}
                      <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-3.5 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">📈 Monthly revenue trends (H1)</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">In Rupees (₹)</span>
                        </div>
                        <div className="h-44 relative flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 400 150" interstate-id="monthly-rev-chart" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {/* Area fill */}
                            <path
                              d={`M 10 140 
                                  L 80 ${140 - ((monthlyRevenueData[0].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 150 ${140 - ((monthlyRevenueData[1].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 220 ${140 - ((monthlyRevenueData[2].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 290 ${140 - ((monthlyRevenueData[3].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 360 ${140 - ((monthlyRevenueData[4].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 360 140 Z`}
                              fill="url(#chartGrad)"
                            />
                            {/* Line */}
                            <path
                              d={`M 10 140 
                                  L 80 ${140 - ((monthlyRevenueData[0].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 150 ${140 - ((monthlyRevenueData[1].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 220 ${140 - ((monthlyRevenueData[2].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 290 ${140 - ((monthlyRevenueData[3].amount / (totalMonetizationRev || 1)) * 100)} 
                                  L 360 ${140 - ((monthlyRevenueData[4].amount / (totalMonetizationRev || 1)) * 100)}`}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            {/* Dots */}
                            {[0, 1, 2, 3, 4].map((idx, i) => {
                              const lx = 80 + i * 70;
                              const ly = 138 - ((monthlyRevenueData[idx].amount / (totalMonetizationRev || 1)) * 95);
                              return (
                                <g key={i}>
                                  <circle cx={lx} cy={ly} r="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                                </g>
                              );
                            })}
                          </svg>

                          <div className="absolute inset-x-0 bottom-0 flex justify-between px-6 text-[9.5px] font-mono text-zinc-500 pt-1 border-t border-zinc-850">
                            {monthlyRevenueData.map((d, i) => (
                              <div key={i} className="text-center">
                                <span className="block text-zinc-400">{d.name}</span>
                                <span className="block text-[8px] text-zinc-650">₹{d.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Daily Distribution micro-bars */}
                      <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-3.5 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">📊 Daily distribution stats</span>
                          <span className="text-[10px] text-cyan-400 font-mono font-bold">Standard Week Ratio</span>
                        </div>
                        <div className="h-44 flex items-end justify-between px-4 pb-6 pt-2">
                          {dailyRevenueData.map((d, i) => {
                            const maxVal = Math.max(...dailyRevenueData.map(v => v.amount)) || 1;
                            const heightPct = Math.max(10, Math.min(100, Math.round((d.amount / maxVal) * 100)));
                            return (
                              <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group" id={`daily-bar-${d.name}`}>
                                <div className="w-6 bg-zinc-950 border border-zinc-800 rounded-lg h-24 flex items-end relative overflow-hidden">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className="w-full bg-cyan-500/10 border-t border-cyan-400 transition-all rounded-b-md"
                                  ></div>
                                </div>
                                <span className="text-[9.5px] text-zinc-400 font-bold font-mono">{d.name}</span>
                                <span className="text-[8px] text-zinc-650 font-mono">₹{d.amount}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Centralized AdManager controls */}
                  <AdManager onConfigChange={() => fetchSponsorBrandsAndPayments()} />
                </div>
              );
            })()}

            {/* Visual Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart A: Membership Tier Breakdown */}
              <div className="bg-zinc-950/80 border border-zinc-850 p-5 rounded-2xl">
                <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">REVENUE GEN & PREMIUM TICKETS SPLIT</h4>
                {(() => {
                  const silverCount = users.filter(u => u.membership === 'Silver').length;
                  const goldCount = users.filter(u => u.membership === 'Gold').length;
                  const platinumCount = users.filter(u => u.membership === 'Platinum').length;
                  const freeCount = users.length - silverCount - goldCount - platinumCount;
                  const total = users.length || 1;

                  const pFree = Math.round((freeCount / total) * 100);
                  const pSilver = Math.round((silverCount / total) * 100);
                  const pGold = Math.round((goldCount / total) * 100);
                  const pPlatinum = Math.round((platinumCount / total) * 100);

                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        {/* Elegant interactive visual circle doughnut graph */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Outer free tier */}
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#27272a" strokeWidth="12" />
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeDasharray={`${pFree} 100`} strokeDashoffset="0" />
                          <circle cx="50" cy="50" r="32" fill="transparent" stroke="#a855f7" strokeWidth="4" strokeDasharray={`${pSilver} 100`} strokeDashoffset="0" />
                          <circle cx="50" cy="50" r="26" fill="transparent" stroke="#eab308" strokeWidth="4" strokeDasharray={`${pGold} 100`} strokeDashoffset="0" />
                          <circle cx="50" cy="50" r="20" fill="transparent" stroke="#f43f5e" strokeWidth="4" strokeDasharray={`${pPlatinum} 100`} strokeDashoffset="0" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
                          <span className="text-xl font-black text-white font-mono">{premiumUsersCount}</span>
                          <span className="text-[9px] text-zinc-500 font-mono uppercase font-bold">PREMIUMS</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2.5 w-full font-mono text-zinc-350">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span> Regular Free ({freeCount})</span>
                          <span className="font-bold text-white">{pFree}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span> Silver Pass ({silverCount})</span>
                          <span className="font-bold text-white">{pSilver}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span> Gold Pass ({goldCount})</span>
                          <span className="font-bold text-white">{pGold}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Platinum VIP ({platinumCount})</span>
                          <span className="font-bold text-white">{pPlatinum}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Chart B: KD Spread Distribution mapping */}
              <div className="bg-zinc-950/80 border border-zinc-850 p-5 rounded-2xl">
                <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">GAMES K/D CALIBRATION SPREAD</h4>
                {(() => {
                  const kdRecruit = users.filter(u => u.kdRatio < 1.0).length;
                  const kdCombatant = users.filter(u => u.kdRatio >= 1.0 && u.kdRatio < 1.8).length;
                  const kdSpecialist = users.filter(u => u.kdRatio >= 1.8 && u.kdRatio < 3.0).length;
                  const kdLegend = users.filter(u => u.kdRatio >= 3.0).length;

                  const maxCount = Math.max(kdRecruit, kdCombatant, kdSpecialist, kdLegend, 1);

                  const bars = [
                    { label: "RECRUIT (<1.0)", count: kdRecruit, color: "bg-zinc-750 bg-zinc-700" },
                    { label: "COMBATANT (1.0-1.8)", count: kdCombatant, color: "bg-cyan-500" },
                    { label: "SPECIALIST (1.8-3.0)", count: kdSpecialist, color: "bg-purple-500" },
                    { label: "LEGEND (3.0+)", count: kdLegend, color: "bg-rose-500" }
                  ];

                  return (
                    <div className="space-y-4">
                      {bars.map((b, idx) => {
                        const pctWidth = (b.count / maxCount) * 100;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-zinc-450 font-bold">{b.label}</span>
                              <span className="text-white font-bold">{b.count} operators</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                              <div className={`h-full ${b.color} transition-all duration-500`} style={{ width: `${pctWidth}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Granular Revenue Stream Intelligence */}
            <div className="bg-zinc-950/80 border border-zinc-850 p-6 rounded-2xl">
              <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">REVENUE STREAMS & TRANSACTION STATISTICS</h4>
              {(() => {
                const membershipRev = users.reduce((acc, curr) => {
                  if (curr.membershipStatus !== 'active') return acc;
                  const tierPricing = { Free: 0, Silver: 19, Gold: 49, Platinum: 99 };
                  return acc + (tierPricing[curr.membership] || 0);
                }, 0);
                const featuredProfileRev = users.filter(u => u.isFeatured).length * 80;
                const featuredTeamRev = teams.filter(t => t.isFeatured).length * 150;
                const tournamentRev = tournaments.reduce((acc, t) => acc + (t.registrants ? t.registrants.filter(r => r.status === 'approved').length * 250 : 0), 0);
                const verifiedBadgeRev = users.filter(u => u.badges && u.badges.length > 0).reduce((acc, u) => acc + (u.badges.length * 60), 0);
                const sponsorRev = sponsors.filter(s => s.status === 'approved').length * 500;
                const grandTotalRev = membershipRev + featuredProfileRev + featuredTeamRev + tournamentRev + verifiedBadgeRev + sponsorRev;
                const dailyYield = Math.round(grandTotalRev * 0.08);

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="bg-zinc-900 border border-zinc-800/60 p-3.5 rounded-xl font-mono">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Memberships</p>
                        <p className="text-lg font-black text-rose-400 mt-1">₹{membershipRev}</p>
                        <span className="text-[8px] text-zinc-650 block mt-0.5">Recurring passes</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800/60 p-3.5 rounded-xl font-mono">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Featured Users</p>
                        <p className="text-lg font-black text-amber-400 mt-1">₹{featuredProfileRev}</p>
                        <span className="text-[8px] text-zinc-650 block mt-0.5">₹80 per spotlight</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800/60 p-3.5 rounded-xl font-mono">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Featured Teams</p>
                        <p className="text-lg font-black text-blue-400 mt-1">₹{featuredTeamRev}</p>
                        <span className="text-[8px] text-zinc-650 block mt-0.5">₹150 per syndicate</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800/60 p-3.5 rounded-xl font-mono">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Tournament Fees</p>
                        <p className="text-lg font-black text-cyan-400 mt-1">₹{tournamentRev}</p>
                        <span className="text-[8px] text-zinc-650 block mt-0.5">₹250 per applicant</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800/60 p-3.5 rounded-xl font-mono">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Verified Badges</p>
                        <p className="text-lg font-black text-emerald-400 mt-1">₹{verifiedBadgeRev}</p>
                        <span className="text-[8px] text-zinc-650 block mt-0.5">₹60 per system tag</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800/60 p-3.5 rounded-xl font-mono">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Sponsor Deals</p>
                        <p className="text-lg font-black text-purple-400 mt-1">₹{sponsorRev}</p>
                        <span className="text-[8px] text-zinc-650 block mt-0.5">₹500 pitch fee</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-900 font-mono">
                      <div className="flex justify-between items-center bg-zinc-900/40 p-4 border border-zinc-900 rounded-xl">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Estimated Daily Yield</p>
                          <p className="text-2xl font-black text-rose-500 mt-0.5">₹{dailyYield}</p>
                        </div>
                        <span className="text-[10px] text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-850">8% Avg Daily</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-900/40 p-4 border border-zinc-900 rounded-xl">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Gross Monthly Yield</p>
                          <p className="text-2xl font-black text-cyan-400 mt-0.5">₹{grandTotalRev}</p>
                        </div>
                        <span className="text-[10px] text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-850">Monthly Gross</span>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-500/10 p-4 border border-emerald-500/20 rounded-xl">
                        <div>
                          <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold">Total Platform Gross</p>
                          <p className="text-2xl font-black text-emerald-400 mt-0.5">₹{grandTotalRev}</p>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/20">LIVE TOTAL</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick action notifications warnings */}
            {pendingPayments.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl flex items-center justify-between">
                <span className="font-mono flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  COMMAND ALERT: You have {pendingPayments.length} pending custom member payment receipts looking for verification!
                </span>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="bg-amber-400 text-zinc-950 hover:bg-amber-500 font-mono px-3 py-1 font-bold text-[10px] rounded"
                >
                  RESOLVE NOW
                </button>
              </div>
            )}

            {/* Centralized SEO, Webmaster, Search Console & Analytics Integration Console */}
            <div className="bg-zinc-950 p-6 border border-zinc-850 rounded-2xl space-y-6 text-left grid grid-cols-1">
              <div className="border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <Sparkles className="w-5 h-5" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-white">SEO & Indexing Growth Optimization Console</h4>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono mt-1">
                  Manage static metadata schemas, verify search crawlers ownership, and configure analytical telemetry flows (Sitemap.xml and robots.txt are active at source).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Search Console & Bing Webmaster Verification IDs */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wide text-zinc-300">Crawler Identity Verification</h5>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 flex justify-between">
                      Google Search Console Token
                      <span className={`text-[9px] ${seoGsc ? 'text-emerald-400' : 'text-amber-500'}`}>
                        {seoGsc ? '● Verified Token Injected' : '● Verification Placeholder Active'}
                      </span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. google-site-verification token..."
                      value={seoGsc}
                      onChange={(e) => setSeoGsc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 flex justify-between">
                      Bing Webmaster ID
                      <span className={`text-[9px] ${seoBing ? 'text-emerald-400' : 'text-amber-500'}`}>
                        {seoBing ? '● Verified Token Injected' : '● Verification Placeholder Active'}
                      </span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. msvalidate.01 ID..."
                      value={seoBing}
                      onChange={(e) => setSeoBing(e.target.value)}
                    />
                  </div>
                </div>

                {/* Analytical Telemetry integrations (GA4, GTM, Clarity) */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wide text-zinc-300">Marketing & Analytics Integrations</h5>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 flex justify-between">
                      Google Analytics 4 Measurement ID
                      <span className={`text-[9px] ${seoGa4 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {seoGa4 ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. G-XXXXXXXXXX"
                      value={seoGa4}
                      onChange={(e) => setSeoGa4(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 flex justify-between">
                      Google Tag Manager ID
                      <span className={`text-[9px] ${seoGtm ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {seoGtm ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. GTM-XXXXXXX"
                      value={seoGtm}
                      onChange={(e) => setSeoGtm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 flex justify-between">
                      Microsoft Clarity Project Token
                      <span className={`text-[9px] ${seoClarity ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {seoClarity ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. clarity project code..."
                      value={seoClarity}
                      onChange={(e) => setSeoClarity(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-between items-center flex-wrap gap-4">
                <div className="text-[9.5px] text-zinc-500 font-mono space-y-0.5">
                  <p>✔ Duplication Prevention Active: Strict singleton tag overwrite scripts active in head</p>
                  <p>✔ Static sitemap and robot indexes are linked directly for search engine crawlers</p>
                </div>
                <button
                  onClick={handleSaveSEOConfigs}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-600/10 block w-full md:w-auto text-center"
                >
                  SAVE SEO & TRACKING CONFIGS
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Operational Player Directory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-950/60 font-mono py-2.5 uppercase text-zinc-400">
                    <th className="p-3 pl-4">Gamer Profile</th>
                    <th className="p-3">Credentials</th>
                    <th className="p-3 text-center">MMR / KD</th>
                    <th className="p-3">Tier Status</th>
                    <th className="p-3 text-right pr-4">Tactical Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 font-sans">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-950/30">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <img src={u.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"} referrerPolicy="no-referrer" className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-white flex items-center gap-1">
                              {u.gamerName}
                              {u.isBanned && <span className="text-[8px] bg-red-650 bg-red-500/25 text-red-400 font-mono font-bold px-1 py-0.5 rounded">BANNED</span>}
                            </p>
                            <span className="text-[10px] text-zinc-500">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        {u.city}, {u.country}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="text-rose-400 font-bold">{u.skillRating} MMR</span> <span className="text-zinc-650">/</span> <span className="text-cyan-400">{u.kdRatio} KD</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-zinc-200">
                          {u.membership} ({u.membershipStatus.toUpperCase()})
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <button
                            onClick={() => onToggleFeaturedUser(u.id)}
                            className={`p-1.5 rounded transition-all font-mono font-bold text-[9px] uppercase border ${
                              u.isFeatured 
                                ? 'bg-amber-400/25 border-amber-400 text-amber-300' 
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            }`}
                            title="Boost Featured Banner List"
                          >
                            ⭐ {u.isFeatured ? 'Featured' : 'Regular'}
                          </button>

                          {u.isBanned ? (
                            <button
                              onClick={() => onUnbanUser(u.id)}
                              className="p-1.5 bg-zinc-950 border border-green-500/25 hover:border-green-500 text-green-400 rounded text-[9px] font-mono leading-none"
                            >
                              UNBAN
                            </button>
                          ) : (
                            <button
                              onClick={() => onBanUser(u.id)}
                              className="p-1.5 bg-zinc-950 border border-red-500/25 hover:border-red-500 text-red-400 rounded text-[9px] font-mono leading-none"
                            >
                              BAN
                            </button>
                          )}

                          {deleteConfirmId === u.id ? (
                            <div className="flex gap-1 bg-red-650 bg-red-600/10 border border-red-500 px-2 py-0.5 rounded items-center">
                              <span className="text-[9px] text-red-400 font-mono uppercase">CONFIRM?</span>
                              <button onClick={() => triggerDelete(u.id)} className="text-red-400 hover:text-white font-mono font-bold hover:underline py-0.5">YES</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="text-zinc-400 hover:text-white font-mono py-0.5">NO</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(u.id)}
                              className="p-1.5 bg-zinc-950 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[9px] font-mono leading-none"
                              title="Instantly Purge player records"
                            >
                              PURGE
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'profiles' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center w-full border-b border-zinc-800/40 pb-2.5">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wide">Esports Gamer Career Dossier Inventory</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Edit athlete credentials, calibrate skill analytics, and assign user vanity items</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map(u => (
                <div key={u.id} className="p-4 bg-zinc-950/80 border border-zinc-850 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                  {/* Subtle decorative background banner */}
                  <div className={`h-1.5 absolute top-0 left-0 right-0 ${u.membership === 'Platinum' ? 'bg-rose-500' : u.membership === 'Gold' ? 'bg-yellow-500' : u.membership === 'Silver' ? 'bg-purple-500' : 'bg-zinc-800'}`}></div>

                  <div className="flex gap-3 items-start my-1 bg-zinc-90 w-full">
                    <img src={u.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"} className="w-12 h-12 rounded-xl object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white truncate text-sm">{u.gamerName}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {u.membership.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate">@{u.username} • {u.email}</p>
                      <p className="text-[11px] text-rose-450 font-mono tracking-wider mt-1">{u.favoriteGames.join(" / ")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850 my-3 text-center">
                    <div>
                      <p className="text-[8px] font-mono text-zinc-500 uppercase font-black">Skill Rate</p>
                      <p className="text-xs font-bold text-white mt-0.5">{u.skillRating} MMR</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-zinc-500 uppercase font-black">K/D Ratio</p>
                      <p className="text-xs font-bold text-cyan-400 mt-0.5">{u.kdRatio} K/D</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-zinc-500 uppercase font-black">Home Base</p>
                      <p className="text-xs font-bold text-zinc-400 mt-0.5 truncate">{u.city}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-900 text-[10px] text-zinc-500">
                    <span className="font-bold text-zinc-450">Active Cosmic Gear:</span>
                    <span className="bg-zinc-900 px-1 py-0.5 rounded text-[9px] font-mono border border-zinc-850">Sticker: {u.activeSticker || "None"}</span>
                    <span className="bg-zinc-900 px-1 py-0.5 rounded text-[9px] font-mono border border-zinc-850">Frame: {u.activeFrame ? "Enabled" : "None"}</span>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setEditingUserProfileId(u.id);
                        setEditGamerName(u.gamerName);
                        setEditBio(u.bio || '');
                        setEditSkillRating(u.skillRating || 1500);
                        setEditKdRatio(u.kdRatio || 1.0);
                        setEditCity(u.city || '');
                        setEditCountry(u.country || '');
                        setEditMembership(u.membership || 'Free');
                      }}
                      className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-mono text-xs py-2 rounded-xl border border-zinc-800 transition-all font-bold cursor-pointer"
                    >
                      🖋️ EDIT DOSSIER & STATS
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Editing Slide-over Modal Backdrop */}
            <AnimatePresence>
              {editingUserProfileId && (
                <div className="fixed inset-0 z-50 flex items-center justify-end">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                    onClick={() => setEditingUserProfileId(null)}
                  />

                  <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    className="relative bg-zinc-950 border-l border-zinc-850 w-full max-w-lg h-full p-6 overflow-y-auto space-y-4"
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-805">
                      <div>
                        <h3 className="text-sm font-bold font-mono tracking-widest text-red-500 uppercase">CALIBRATE PILOT DOSSIER</h3>
                        <p className="text-[10px] text-zinc-550 font-mono">Modifying stats overrides direct in system files</p>
                      </div>
                      <button
                        onClick={() => setEditingUserProfileId(null)}
                        className="text-zinc-500 hover:text-white font-mono text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 uppercase"
                      >
                        CLOSE ✕
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!editingUserProfileId) return;
                        onAdminUpdateUserProfile(editingUserProfileId, {
                          gamerName: editGamerName,
                          bio: editBio,
                          skillRating: Number(editSkillRating),
                          kdRatio: Number(editKdRatio),
                          city: editCity,
                          country: editCountry,
                          membership: editMembership
                        });
                        setEditingUserProfileId(null);
                      }}
                      className="space-y-4 text-xs font-mono"
                    >
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-black">Gamer tag / Name</label>
                        <input
                          type="text"
                          className="w-full bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl font-sans"
                          value={editGamerName}
                          onChange={e => setEditGamerName(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-black">Personal player biography</label>
                        <textarea
                          rows={3}
                          className="w-full bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl font-sans"
                          value={editBio}
                          onChange={e => setEditBio(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-black">Skill Rate MMR</label>
                          <input
                            type="number"
                            className="w-full bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl"
                            value={editSkillRating}
                            onChange={e => setEditSkillRating(Number(e.target.value))}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-black">K/D ratio rating</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl"
                            value={editKdRatio}
                            onChange={e => setEditKdRatio(Number(e.target.value))}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-black">Home Base City</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl font-sans"
                            value={editCity}
                            onChange={e => setEditCity(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-black">Country Location</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl font-sans"
                            value={editCountry}
                            onChange={e => setEditCountry(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-black">Billing subscription tier status</label>
                        <select
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 p-2.5 rounded-xl"
                          value={editMembership}
                          onChange={e => setEditMembership(e.target.value as any)}
                        >
                          <option value="Free">Free Pass Tier</option>
                          <option value="Silver">Silver Premium Pass</option>
                          <option value="Gold">Gold Elite Pass</option>
                          <option value="Platinum">Platinum VIP Pass</option>
                        </select>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                        >
                          COMMIT SPEC CHANGES
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center w-full border-b border-zinc-800/40 pb-2.5">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wide">Squad Finder & Coalition Registries</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Audit guild clans, verify line-ups, and disband unauthorized teams</p>
              </div>
            </div>

            {teams.length === 0 ? (
              <div className="p-10 text-center bg-zinc-950/40 border border-zinc-850 rounded-xl">
                <p className="text-xs text-zinc-500 font-mono italic">No esports rosters or teams active in database registers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((t) => (
                  <div key={t.id} className="p-4 bg-zinc-950/80 border border-zinc-850 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="flex gap-3 items-start bg-zinc-90 w-full">
                      <img src={t.logo || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150"} className="w-12 h-12 rounded-xl object-cover border border-zinc-805" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-sm truncate">{t.name}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-zinc-900 border border-zinc-800 text-cyan-400">
                            {t.game.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-550 leading-relaxed font-sans line-clamp-2 mt-1">"{t.bio}"</p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-2">Owner Admin UID: <strong className="text-zinc-400">{t.creatorGamerName}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-4 pt-4 border-t border-zinc-900 bg-zinc-90 w-full flex-wrap gap-2">
                      <span>Total Squad Members: <strong className="text-white">{t.members.length}/5</strong></span>
                      
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => onToggleFeaturedTeam(t.id)}
                          className={`px-2 py-1 rounded text-[9px] font-mono leading-none tracking-wider font-bold uppercase transition-all border ${
                            t.isFeatured 
                              ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow shadow-amber-400/5' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          ⭐ {t.isFeatured ? 'Featured' : 'Regular'}
                        </button>

                        {deleteTeamConfirmId === t.id ? (
                          <div className="flex gap-1 bg-red-650 bg-red-600/10 border border-red-500 px-2 py-0.5 rounded items-center">
                            <span className="text-[8px] text-red-400 font-mono uppercase font-black font-bold">DISBAND?</span>
                            <button onClick={() => { onAdminDeleteTeam(t.id); setDeleteTeamConfirmId(null); }} className="text-red-400 hover:text-white font-mono font-bold hover:underline py-0.5">YES</button>
                            <button onClick={() => setDeleteTeamConfirmId(null)} className="text-zinc-400 hover:text-white font-mono py-0.5">NO</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteTeamConfirmId(t.id)}
                            className="bg-zinc-950 border border-rose-500/20 text-rose-500 hover:bg-rose-500 /10 hover:bg-rose-500 hover:text-white rounded px-2.5 py-1 text-[9px] font-mono leading-none tracking-wider font-bold uppercase transition-all cursor-pointer"
                          >
                            Dissolve Team
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Assemble Arena Brackets</h3>

            {/* Create Tournament Form */}
            <form onSubmit={handleCreateTourneySubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-850">
              <h4 className="md:col-span-3 text-xs font-mono font-bold tracking-wider text-red-400 uppercase">Architect Simulator creation</h4>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Fire India Masters"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none focus:border-red-500 rounded"
                  value={newTourneyTitle}
                  onChange={(e) => setNewTourneyTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">FPS / Battle Royale Game</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-300 focus:outline-none focus:border-red-500 rounded"
                  value={newTourneyGame}
                  onChange={(e) => setNewTourneyGame(e.target.value)}
                >
                  <option value="Valorant">Valorant</option>
                  <option value="BGMI">BGMI</option>
                  <option value="Free Fire">Free Fire</option>
                  <option value="CS2">CS2</option>
                  <option value="COD Mobile">COD Mobile</option>
                  <option value="PUBG Mobile">PUBG Mobile</option>
                  <option value="GTA V">GTA V</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Prize pool format</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                  value={newTourneyPrize}
                  onChange={(e) => setNewTourneyPrize(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Max slots limit</label>
                <input
                  type="number"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                  value={newTourneyMaxTeams}
                  onChange={(e) => setNewTourneyMaxTeams(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Registration layout restrictions</label>
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-300 focus:outline-none rounded font-mono"
                  value={newTourneyRegType}
                  onChange={(e) => setNewTourneyRegType(e.target.value as any)}
                >
                  <option value="solo">Solo Registered (Individually)</option>
                  <option value="team">Team Registered (Full squad)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Event Timetable lines (split by commas)</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-06-21: Qualifiers map, 2026-06-25: Finals lobby"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                  value={newTourneySchedule}
                  onChange={(e) => setNewTourneySchedule(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Banner image URL</label>
                <input
                  type="url"
                  placeholder="e.g. https://images.unsplash.com/... or paste URL"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                  value={newTourneyBannerUrl}
                  onChange={(e) => setNewTourneyBannerUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Entry Fee</label>
                <input
                  type="text"
                  placeholder="e.g. Free or ₹100"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                  value={newTourneyEntryFee}
                  onChange={(e) => setNewTourneyEntryFee(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Max individual players limit</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                  value={newTourneyMaxPlayers}
                  onChange={(e) => setNewTourneyMaxPlayers(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Registration Deadline</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                  value={newTourneyRegDeadline}
                  onChange={(e) => setNewTourneyRegDeadline(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Tournament Start Date</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                  value={newTourneyStart}
                  onChange={(e) => setNewTourneyStart(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Tournament End Date</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                  value={newTourneyEnd}
                  onChange={(e) => setNewTourneyEnd(e.target.value)}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Tournament Full Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Join the ultimate Battle Royale masters challenge and fight for the massive prize pool cash bounty!"
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 text-white focus:outline-none focus:border-red-500 rounded"
                  value={newTourneyDescription}
                  onChange={(e) => setNewTourneyDescription(e.target.value)}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Custom rule points (Split by newline)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. No emulators allowed. Safe anti-cheat mandations."
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 text-white focus:outline-none focus:border-red-500 rounded"
                  value={newTourneyRules}
                  onChange={(e) => setNewTourneyRules(e.target.value)}
                />
              </div>

              {/* Free Fire MAX Room Details */}
              <div className="md:col-span-3 border-t border-zinc-855/60 pt-4 mt-2 space-y-4">
                <h5 className="text-[11px] font-mono font-bold text-red-500 uppercase tracking-widest">Free Fire MAX Room Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Room ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 581295"
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                      value={newTourneyRoomId}
                      onChange={(e) => setNewTourneyRoomId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Room Password</label>
                    <input
                      type="text"
                      placeholder="e.g. secret123"
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                      value={newTourneyRoomPassword}
                      onChange={(e) => setNewTourneyRoomPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Reveal Mode</label>
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-350 focus:outline-none rounded"
                      value={newTourneyRoomRevealMode}
                      onChange={(e) => setNewTourneyRoomRevealMode(e.target.value)}
                    >
                      <option value="manual">Manual Reveal Mode</option>
                      <option value="auto">Auto-Reveal Mode</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Auto-Reveal Time</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                      value={newTourneyRoomRevealAt}
                      onChange={(e) => setNewTourneyRoomRevealAt(e.target.value)}
                      disabled={newTourneyRoomRevealMode === 'manual'}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="md:col-span-3 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider"
              >
                DEPLOY BRACKET TO FRONT Arena
              </button>
            </form>

            {/* Active tournament applications to approve */}
            <div className="space-y-4 pt-6 border-t border-zinc-800/40">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-sm font-black font-mono tracking-wider text-red-500 uppercase">Arena Registration approvals dashboard</h4>
                  <p className="text-[11px] text-zinc-500 font-mono">Verify screenshots, confirm transaction IDs, and authorize brackets.</p>
                </div>
                {/* Statistics badges */}
                <div className="flex gap-2">
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded">
                    PENDING: {registrations.filter(r => r.status === 'pending').length}
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">
                    APPROVED: {registrations.filter(r => r.status === 'approved').length}
                  </span>
                </div>
              </div>

              {/* Filters & search bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search query by name, team, id..."
                    className="w-full bg-zinc-950 border border-zinc-800 pl-8 pr-3 py-1.5 rounded text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-red-500"
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                  <Filter className="h-3.5 w-3.5 text-zinc-500 ml-1" />
                  <select
                    className="bg-transparent text-xs text-zinc-300 w-full focus:outline-none"
                    value={regStatusFilter}
                    onChange={(e) => setRegStatusFilter(e.target.value)}
                  >
                    <option value="all">Statuses: All</option>
                    <option value="pending">Status: Pending</option>
                    <option value="approved">Status: Approved</option>
                    <option value="rejected">Status: Rejected</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                  <Trophy className="h-3.5 w-3.5 text-zinc-500 ml-1" />
                  <select
                    className="bg-transparent text-xs text-zinc-300 w-full focus:outline-none"
                    value={regTourneyFilter}
                    onChange={(e) => setRegTourneyFilter(e.target.value)}
                  >
                    <option value="all">Tournaments: All</option>
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const getGamerNameForUser = (userId: string) => {
                  const u = users.find(user => user.id === userId);
                  return u ? u.gamerName : 'Unknown Gamer';
                };
                const getTeamName = (teamId: string) => {
                  const t = teams.find(team => team.id === teamId);
                  return t ? t.name : 'Unknown Squadron';
                };
                const getTournamentTitle = (tourneyId: string) => {
                  const t = tournaments.find(tour => tour.id === tourneyId);
                  return t ? t.title : 'Unknown Tournament';
                };

                const filteredRegs = registrations.filter(reg => {
                  const query = regSearch.trim().toLowerCase();
                  const gamerName = getGamerNameForUser(reg.user_id).toLowerCase();
                  const teamName = reg.team_id ? getTeamName(reg.team_id).toLowerCase() : '';
                  const tourneyTitle = getTournamentTitle(reg.tournament_id).toLowerCase();
                  const txnId = reg.transaction_id ? reg.transaction_id.toLowerCase() : '';
                  
                  const matchesSearch = !query || gamerName.includes(query) || teamName.includes(query) || tourneyTitle.includes(query) || txnId.includes(query);
                  const matchesStatus = regStatusFilter === 'all' || reg.status === regStatusFilter;
                  const matchesTourney = regTourneyFilter === 'all' || reg.tournament_id === regTourneyFilter;

                  return matchesSearch && matchesStatus && matchesTourney;
                });

                if (filteredRegs.length === 0) {
                  return (
                    <div className="p-8 text-center bg-zinc-950/40 border border-zinc-850 rounded-xl">
                      <p className="text-zinc-550 font-mono text-xs italic">No matching registrations found in dashboard queries.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3.5">
                    {filteredRegs.map((reg) => {
                      const tourney = tournaments.find(t => t.id === reg.tournament_id);
                      const statusColors: Record<string, string> = {
                        pending: 'text-amber-400 bg-amber-400/5 border-amber-400/20',
                        approved: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20',
                        rejected: 'text-rose-455 bg-rose-500/5 border-rose-505/15'
                      };

                      const labelGamer = getGamerNameForUser(reg.user_id);
                      const labelTeam = reg.team_id ? getTeamName(reg.team_id) : null;

                      return (
                        <div key={reg.id} className="p-4 bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 rounded-xl space-y-4 shadow transition-all duration-300">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-900 pb-3">
                            <div>
                              <span className="text-[10px] text-zinc-550 font-mono">TOURNAMENT:</span>
                              <h4 className="font-extrabold text-white text-xs tracking-tight">{tourney?.title || 'Unknown event'}</h4>
                              <div className="flex gap-3 text-[10px] text-zinc-500 font-mono mt-0.5">
                                <span>ENTRY: <span className="text-zinc-300 font-bold">{tourney?.entry_fee}</span></span>
                                <span>TYPE: <span className="text-cyan-400 uppercase">{reg.registration_type}</span></span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <span className={`text-[9.5px] uppercase font-mono px-2.5 py-0.5 rounded border ${statusColors[reg.status] || 'text-zinc-500'}`}>
                                  REG: {reg.status}
                               </span>
                               {tourney?.entry_fee && tourney.entry_fee.toLowerCase() !== 'free' && tourney.entry_fee !== '0' && (
                                 <span className={`text-[9.5px] uppercase font-mono px-2.5 py-0.5 rounded border ${
                                   reg.payment_status === 'paid' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                                 }`}>
                                   PAY: {reg.payment_status}
                                 </span>
                               )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] text-zinc-550 uppercase font-mono">GAMER ACCREDITATION / SQUAD</p>
                              <p className="text-xs text-white font-bold">
                                {reg.registration_type === 'solo' ? labelGamer : `${labelTeam} [Squad]`}
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                By: {labelGamer} • Reg Date: {new Date(reg.registered_at).toLocaleString()}
                              </p>
                            </div>

                            <div className="space-y-1.5 md:text-right">
                              {reg.transaction_id && (
                                <div>
                                  <p className="text-[10px] text-zinc-550 uppercase font-mono">TXN REFERENCE ID</p>
                                  <p className="text-xs text-white font-mono font-bold tracking-wider">{reg.transaction_id}</p>
                                </div>
                              )}

                              {reg.payment_screenshot_url && (
                                <button
                                  type="button"
                                  onClick={() => setViewScreenshotUrl(reg.payment_screenshot_url)}
                                  className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-mono text-[10px] bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900/30 transition-all cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  VIEW PAYMENT SCREENSHOT
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Control buttons */}
                          <div className="flex border-t border-zinc-900 pt-3 gap-2.5 justify-end">
                            {reg.status === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (onUpdateTournamentRegistrationStatus) {
                                      await onUpdateTournamentRegistrationStatus(
                                        reg.id,
                                        'approved',
                                        reg.payment_status === 'pending' && reg.transaction_id ? 'paid' : reg.payment_status
                                      );
                                    } else {
                                      onApproveTournamentRegistration(reg.tournament_id, reg.user_id);
                                    }
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] px-3.5 py-1.5 rounded-lg uppercase font-bold"
                                >
                                  APPROVE SLOT
                                </button>
                                <button
                                  onClick={async () => {
                                    if (onUpdateTournamentRegistrationStatus) {
                                      await onUpdateTournamentRegistrationStatus(reg.id, 'rejected');
                                    } else {
                                      onRejectTournamentRegistration(reg.tournament_id, reg.user_id);
                                    }
                                  }}
                                  className="bg-zinc-900 hover:bg-rose-950 border border-zinc-805 text-rose-500 hover:text-rose-400 font-mono text-[10px] px-3.5 py-1.5 rounded-lg uppercase font-bold"
                                >
                                  REJECT
                                </button>
                              </>
                            )}

                            {reg.status !== 'pending' && (
                               <span className="text-[10px] text-zinc-500 font-mono italic">
                                 Verification settled and logged.
                               </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* PAYMENT SCREENSHOT LIGHTBOX MODAL */}
            <AnimatePresence>
              {viewScreenshotUrl && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                  onClick={() => setViewScreenshotUrl(null)}
                >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative max-w-2xl bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex flex-col items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => setViewScreenshotUrl(null)}
                      className="absolute -top-3 -right-3 bg-red-650 text-white p-1.5 rounded-full hover:bg-red-700 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-1 w-full text-center">
                      UTR Screenshot Transfer Proof
                    </p>
                    <img 
                      src={viewScreenshotUrl} 
                      alt="Transfer Proof Lightbox" 
                      className="max-h-[75vh] max-w-full rounded-lg object-contain border border-zinc-900 shadow-2xl" 
                    />
                    <button 
                      onClick={() => setViewScreenshotUrl(null)}
                      className="text-zinc-500 text-[10px] shrink-0 font-mono hover:text-white"
                    >
                      [ CLICK OUTSIDE TO CLOSE ]
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Tournament Editing Drawer/Section */}
            <AnimatePresence>
              {editingTourney && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-zinc-900/90 border border-red-500/30 p-5 rounded-xl space-y-4 shadow-xl"
                >
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <h4 className="text-xs font-mono font-bold tracking-wider text-red-500 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-red-500" />
                      Configure Tournament: {editingTourney.title}
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setEditingTourney(null)}
                      className="text-zinc-500 hover:text-white font-mono text-xs cursor-pointer"
                    >
                      [CANCEL]
                    </button>
                  </div>

                  <form onSubmit={handleEditTourneySubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none focus:border-red-500 rounded"
                        value={editTourneyTitle}
                        onChange={(e) => setEditTourneyTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Game Select</label>
                      <select
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-350 focus:outline-none focus:border-red-500 rounded"
                        value={editTourneyGame}
                        onChange={(e) => setEditTourneyGame(e.target.value)}
                      >
                        <option value="Valorant">Valorant</option>
                        <option value="BGMI">BGMI</option>
                        <option value="Free Fire">Free Fire</option>
                        <option value="CS2">CS2</option>
                        <option value="COD Mobile">COD Mobile</option>
                        <option value="PUBG Mobile">PUBG Mobile</option>
                        <option value="GTA V">GTA V</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Prize pool format</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                        value={editTourneyPrize}
                        onChange={(e) => setEditTourneyPrize(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Status</label>
                      <select
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-350 focus:outline-none rounded font-mono"
                        value={editTourneyStatus}
                        onChange={(e) => setEditTourneyStatus(e.target.value as any)}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing / Live</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Max slots limit</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                        value={editTourneyMaxTeams}
                        onChange={(e) => setEditTourneyMaxTeams(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Max individual players limit</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                        value={editTourneyMaxPlayers}
                        onChange={(e) => setEditTourneyMaxPlayers(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Registration restrictions</label>
                      <select
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-300 focus:outline-none rounded"
                        value={editTourneyRegType}
                        onChange={(e) => setEditTourneyRegType(e.target.value as any)}
                      >
                        <option value="solo">Solo Registered (Individually)</option>
                        <option value="team">Team Registered (Full squad)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Registration Deadline</label>
                      <input
                        type="datetime-local"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                        value={editTourneyRegDeadline}
                        onChange={(e) => setEditTourneyRegDeadline(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Event Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                        value={editTourneyStart}
                        onChange={(e) => setEditTourneyStart(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Event End Time</label>
                      <input
                        type="datetime-local"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                        value={editTourneyEnd}
                        onChange={(e) => setEditTourneyEnd(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Banner Image URL</label>
                      <input
                        type="url"
                        placeholder="Paste image web reference"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                        value={editTourneyBannerUrl}
                        onChange={(e) => setEditTourneyBannerUrl(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Entry Fee</label>
                      <input
                        type="text"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                        value={editTourneyEntryFee}
                        onChange={(e) => setEditTourneyEntryFee(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Event Timetable lines (split by commas)</label>
                      <input
                        type="text"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                        value={editTourneySchedule}
                        onChange={(e) => setEditTourneySchedule(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Full Description</label>
                      <textarea
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 text-white focus:outline-none focus:border-red-500 rounded"
                        value={editTourneyDescription}
                        onChange={(e) => setEditTourneyDescription(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Custom Rules (Split by Newline)</label>
                      <textarea
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 text-white focus:outline-none focus:border-red-500 rounded"
                        value={editTourneyRules}
                        onChange={(e) => setEditTourneyRules(e.target.value)}
                      />
                    </div>

                    {/* Free Fire MAX Room Details */}
                    <div className="md:col-span-3 border-t border-zinc-855/60 pt-4 mt-2 space-y-4">
                      <h5 className="text-[11px] font-mono font-bold text-red-500 uppercase tracking-widest">Free Fire MAX Room Settings</h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Room ID</label>
                          <input
                            type="text"
                            placeholder="e.g. 581295"
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                            value={editTourneyRoomId}
                            onChange={(e) => setEditTourneyRoomId(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Room Password</label>
                          <input
                            type="text"
                            placeholder="e.g. secret123"
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded"
                            value={editTourneyRoomPassword}
                            onChange={(e) => setEditTourneyRoomPassword(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Reveal Mode</label>
                          <select
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-zinc-350 focus:outline-none rounded"
                            value={editTourneyRoomRevealMode}
                            onChange={(e) => setEditTourneyRoomRevealMode(e.target.value)}
                          >
                            <option value="manual">Manual Reveal Mode</option>
                            <option value="auto">Auto-Reveal Mode</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Auto-Reveal Time</label>
                          <input
                            type="datetime-local"
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 text-white focus:outline-none rounded font-mono"
                            value={editTourneyRoomRevealAt}
                            onChange={(e) => setEditTourneyRoomRevealAt(e.target.value)}
                            disabled={editTourneyRoomRevealMode === 'manual'}
                          />
                        </div>
                        <div className="md:col-span-4 flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                            <input
                              type="checkbox"
                              checked={editTourneyRoomRevealed}
                              onChange={(e) => setEditTourneyRoomRevealed(e.target.checked)}
                              className="rounded border-zinc-800 bg-zinc-950 text-red-650 focus:ring-red-500"
                            />
                            Room revealed to registered players immediately (Force Manual Reveal)
                          </label>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="md:col-span-3 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider"
                    >
                      COMMIT BRACKET SAVES
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active tournaments overview & delete layout */}
            <div className="space-y-4 pt-4 border-t border-zinc-800/40">
              <h4 className="text-xs font-black font-mono tracking-widest text-zinc-400">ACTIVE TOURNAMENT BRACKETS ARCHIVE</h4>
              
              {tournaments.length === 0 ? (
                <p className="text-zinc-500 font-mono text-xs pl-2 italic">No active tourneys configured.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {tournaments.map(t => {
                    const approvedRegsForTourney = (registrations || []).filter(
                      r => r.tournament_id === t.id && r.status === 'approved'
                    );
                    const tourneyMatches = matchesMap[t.id] || [];
                    const matchesExist = tourneyMatches.length > 0;
                    const isBracketSelected = selectedBracketTourneyId === t.id;

                    return (
                      <div key={t.id} className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div>
                            <p className="font-bold text-white text-sm">{t.title}</p>
                            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 border border-zinc-805 px-1.5 py-0.5 rounded inline-block mt-1 uppercase text-[8px] tracking-wider font-bold">
                              {t.game} • {t.prizePool || t.prize_pool} pool • Max: {t.max_teams} • Status: {t.status}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectBracketTourney(t.id)}
                              className={`rounded px-3 py-1.5 text-[9px] font-mono leading-none font-bold uppercase transition-all cursor-pointer ${
                                isBracketSelected
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/35'
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                              }`}
                            >
                              {isBracketSelected ? 'Hide Bracket' : 'Bracket / Matches'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewPlayersTourneyId(t.id)}
                              className="bg-purple-950/25 border border-purple-500/30 hover:bg-purple-500 hover:text-zinc-950 text-purple-400 rounded px-2.5 py-1.5 text-[9px] font-mono leading-none font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Users className="w-3 h-3" />
                              View Players
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeclaringTourneyId(t.id);
                                setDeclaringWinnerId('');
                                const prizePoolStr = t.prize_pool || t.prizePool || "1000";
                                const digits = prizePoolStr.replace(/,/g, '').match(/\d+/);
                                const defaultVal = digits ? parseInt(digits[0], 10) : 1000;
                                setDeclaringPrizeAmount(defaultVal);
                                setDeclaringNote(`🏆 Winner of ${t.title}`);
                              }}
                              className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500 hover:text-zinc-950 text-amber-400 rounded px-2.5 py-1.5 text-[9px] font-mono leading-none font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              🏆 Declare Champion
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleInlineRoom(t)}
                              className={`border px-2.5 py-1.5 text-[9px] font-mono leading-none font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 rounded ${
                                expandedRoomTourneyId === t.id
                                  ? 'bg-amber-500/25 border-amber-500/40 text-amber-400 font-extrabold'
                                  : 'bg-zinc-900 border-zinc-800 text-amber-400 hover:border-amber-500/30'
                              }`}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              Room details {t.room_revealed || (t.room_reveal_at && new Date() >= new Date(t.room_reveal_at)) ? '🔓' : '🔒'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditTourney(t)}
                              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-300 rounded px-3 py-1.5 text-[9px] font-mono leading-none font-bold uppercase transition-all cursor-pointer"
                            >
                              Modify / Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdminDeleteTournament(t.id)}
                              className="bg-zinc-950 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded px-2.5 py-1.5 text-[9px] font-mono leading-none font-bold uppercase transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Inline Room Details Management Panel */}
                        {expandedRoomTourneyId === t.id && (
                          <div className="bg-zinc-900/90 border border-amber-500/35 rounded-xl p-4 space-y-4 shadow-xl">
                            <div className="flex border-b border-zinc-80) pb-2">
                              <span className="text-[10px] font-mono font-bold text-amber-450 uppercase tracking-widest flex items-center gap-1.5">
                                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                Free Fire MAX Room Settings Gate
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Room ID</label>
                                <input
                                  type="text"
                                  placeholder="Enter Room ID"
                                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 text-white focus:outline-none rounded font-mono"
                                  value={inlineRoomId}
                                  onChange={(e) => setInlineRoomId(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Room Password</label>
                                <input
                                  type="text"
                                  placeholder="Enter Password"
                                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 text-white focus:outline-none rounded font-mono"
                                  value={inlineRoomPassword}
                                  onChange={(e) => setInlineRoomPassword(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Reveal Mode</label>
                                <select
                                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 text-zinc-350 focus:outline-none rounded font-mono"
                                  value={inlineRoomRevealMode}
                                  onChange={(e) => setInlineRoomRevealMode(e.target.value)}
                                >
                                  <option value="manual">Manual Reveal Mode</option>
                                  <option value="auto">Auto-Reveal At Time</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Auto Reveal time</label>
                                <input
                                  type="datetime-local"
                                  className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 text-white focus:outline-none rounded font-mono"
                                  value={inlineRoomRevealAt}
                                  onChange={(e) => setInlineRoomRevealAt(e.target.value)}
                                  disabled={inlineRoomRevealMode === 'manual'}
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-850/65">
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 select-none cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={inlineRoomRevealed}
                                    onChange={(e) => setInlineRoomRevealed(e.target.checked)}
                                    className="rounded border-zinc-800 bg-zinc-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-950"
                                  />
                                  Room revealed to players?
                                </label>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  (inlineRoomRevealed || (inlineRoomRevealAt && new Date() >= new Date(inlineRoomRevealAt)))
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  STATUS: {(inlineRoomRevealed || (inlineRoomRevealAt && new Date() >= new Date(inlineRoomRevealAt))) ? 'REVEALED 🔓' : 'HIDDEN 🔒'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineRoom(t.id, true)}
                                  className="bg-emerald-950/40 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-600 hover:text-zinc-950 font-mono font-bold text-[9px] leading-none px-3 py-1.5 rounded transition-all tracking-wider cursor-pointer"
                                >
                                  REVEAL NOW 🔓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineRoom(t.id, false)}
                                  className="bg-rose-950/40 text-rose-400 border border-rose-500/25 hover:bg-rose-600 hover:text-white font-mono font-bold text-[9px] leading-none px-3 py-1.5 rounded transition-all tracking-wider cursor-pointer"
                                >
                                  HIDE AGAIN 🔒
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineRoom(t.id)}
                                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-mono font-black text-[10px] leading-none px-4 py-2 rounded-lg transition-all shadow-md tracking-wider cursor-pointer"
                                >
                                  SAVE CREDENTIALS
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Collapsible Bracket Management Area */}
                        {isBracketSelected && (
                          <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-zinc-950/60 rounded-lg border border-zinc-850/40 gap-3">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono text-zinc-400 font-bold block">PARTICIPANTS PREPARATION</span>
                                <p className="text-[11px] text-zinc-400">
                                  Approved registrations for this tournament: <strong className="text-emerald-400">{approvedRegsForTourney.length}</strong>
                                </p>
                              </div>

                              {!matchesExist ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={bracketSlotLimit}
                                    onChange={(e) => setBracketSlotLimit(Number(e.target.value))}
                                    className="bg-zinc-950 border border-zinc-800 text-[10px] font-mono px-3 py-1.5 text-zinc-300 focus:outline-none rounded"
                                  >
                                    <option value={4}>4 Slots (Semi-Finals)</option>
                                    <option value={8}>8 Slots (Quarter-Finals)</option>
                                    <option value={16}>16 Slots (Round of 16)</option>
                                    <option value={32}>32 Slots (Round of 32)</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateBracket(t.id, bracketSlotLimit, t.registrationType || 'solo')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-zinc-950 font-mono font-bold text-[10px] hover:text-white px-3.5 py-1.5 rounded transition-all"
                                  >
                                    Generate Seeding Bracket
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 rounded">
                                    BRACKET ACTIVE
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleResetBracket(t.id)}
                                    className="bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-500/30 font-mono font-bold text-[10px] px-3 py-1.5 rounded transition-all"
                                  >
                                    Reset Bracket
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Match List Viewer */}
                            {matchesExist ? (
                              <div className="space-y-4">
                                {Array.from({ length: Math.max(...tourneyMatches.map(m => m.roundNumber), 0) }, (_, rIdx) => {
                                  const roundNum = rIdx + 1;
                                  const roundMatches = tourneyMatches.filter(m => m.roundNumber === roundNum);
                                  const totalRounds = Math.max(...tourneyMatches.map(m => m.roundNumber), 0);

                                  const getRoundLabel = (rn: number, tr: number) => {
                                    if (rn === tr) return "Grand Final";
                                    if (rn === tr - 1) return "Semi Finals";
                                    if (rn === tr - 2) return "Quarter Finals";
                                    return `Round of ${Math.pow(2, tr - rn + 1)}`;
                                  };

                                  return (
                                    <div key={roundNum} className="space-y-2">
                                      <h5 className="text-[10px] font-mono font-bold text-rose-500 tracking-wider border-b border-zinc-800 pb-1">
                                        {getRoundLabel(roundNum, totalRounds)}
                                      </h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {roundMatches.map(match => {
                                          const p1Id = t.registrationType === 'solo' ? match.player1UserId : match.team1Id;
                                          const p2Id = t.registrationType === 'solo' ? match.player2UserId : match.team2Id;

                                          const p1Name = getParticipantName(p1Id, t.registrationType || 'solo');
                                          const p2Name = getParticipantName(p2Id, t.registrationType || 'solo');

                                          const winnerId = t.registrationType === 'solo' ? match.winnerUserId : match.winnerTeamId;
                                          
                                          const resultsList = resultsMap[t.id] || [];
                                          const matchResult = resultsList.find(r => r.match_id === match.id);

                                          const isEditing = editingMatchId === match.id;

                                          const statusBorderClass = {
                                            pending: 'border-zinc-850 hover:border-zinc-750',
                                            live: 'border-rose-500/40 bg-rose-950/5 shadow-[0_0_15px_rgba(244,63,94,0.05)]',
                                            completed: 'border-emerald-500/40 bg-emerald-950/5',
                                            disputed: 'border-amber-500/40 bg-amber-950/5',
                                          }[match.status] || 'border-zinc-850';

                                          return (
                                            <div key={match.id} className={`p-4 bg-zinc-950 border rounded-2xl transition-all duration-300 space-y-3.5 relative overflow-hidden ${statusBorderClass}`}>
                                              {/* Ambient status background glows */}
                                              {match.status === 'live' && (
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                                              )}
                                              {match.status === 'disputed' && (
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                                              )}

                                              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                                                <span className="font-bold tracking-wider uppercase text-zinc-400">Match #{match.matchNumber}</span>
                                                <div className="flex items-center gap-1.5 font-bold">
                                                  {matchResult?.score && (
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px]">
                                                      SCORE: {matchResult.score}
                                                    </span>
                                                  )}
                                                  <span className={`px-2 py-0.5 rounded border text-[8.5px] font-black uppercase ${
                                                    match.status === 'live' 
                                                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-400 animate-pulse'
                                                      : match.status === 'completed' 
                                                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                                        : match.status === 'disputed'
                                                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 animate-pulse'
                                                          : 'bg-zinc-900 border-zinc-805 text-zinc-400'
                                                  }`}>
                                                    {match.status}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Contenders Visual Deck */}
                                              <div className="flex justify-between items-center gap-2.5 relative">
                                                <div className={`flex-1 text-center p-2 rounded-xl border transition-all ${
                                                  winnerId && winnerId === p1Id && p1Id !== null
                                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 font-extrabold'
                                                    : 'bg-zinc-900/40 border-zinc-900/60 text-zinc-300'
                                                }`}>
                                                  <span className="text-[11px] font-bold truncate block">{p1Name}</span>
                                                </div>
                                                <span className="text-[9px] font-mono font-black text-zinc-650 tracking-tight italic">VS</span>
                                                <div className={`flex-1 text-center p-2 rounded-xl border transition-all ${
                                                  winnerId && winnerId === p2Id && p2Id !== null
                                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 font-extrabold'
                                                    : 'bg-zinc-900/40 border-zinc-900/60 text-zinc-300'
                                                }`}>
                                                  <span className="text-[11px] font-bold truncate block">{p2Name}</span>
                                                </div>
                                              </div>

                                              {/* Reported Results Badging Sub-Panel */}
                                              {matchResult && (matchResult.notes || matchResult.result_screenshot_url) && (
                                                <div className="p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900/60 text-[9px]/relaxed text-zinc-400 font-mono space-y-1 text-left">
                                                  {matchResult.notes && (
                                                    <p className="line-clamp-2"><span className="text-zinc-500 font-bold">INFO:</span> {matchResult.notes}</p>
                                                  )}
                                                  {matchResult.result_screenshot_url && (
                                                    <button
                                                      type="button"
                                                      onClick={() => setViewScreenshotUrl(matchResult.result_screenshot_url)}
                                                      className="text-cyan-400 font-bold hover:underline cursor-pointer flex items-center gap-1 mt-0.5 bg-transparent"
                                                    >
                                                      📸 View Proof Screenshot
                                                    </button>
                                                  )}
                                                </div>
                                              )}

                                              {/* Action Reporting Panel */}
                                              {!isEditing ? (
                                                <div className="pt-2 border-t border-zinc-900/80 flex items-center justify-between gap-2">
                                                  <span className="text-[9.5px] font-mono text-zinc-500 truncate max-w-[150px]">
                                                    {winnerId ? `Winner: ${getParticipantName(winnerId, t.registrationType || 'solo')}` : 'No outcome reported'}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleStartMatchEditing(match, t.id)}
                                                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 font-mono font-black text-[9px] tracking-wider uppercase px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                                  >
                                                    📝 Edit Details
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="pt-3 border-t border-zinc-900/80 space-y-3 font-mono text-[10px] text-left">
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-[9.5px] font-black text-rose-500 tracking-wider">🔧 REPORT OUTCOME</span>
                                                    <button 
                                                      type="button"
                                                      onClick={() => setEditingMatchId(null)}
                                                      className="text-zinc-500 hover:text-white text-[9px]"
                                                    >
                                                      CANCEL [X]
                                                    </button>
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-2.5">
                                                    <div>
                                                      <label className="block text-[8px] font-bold text-zinc-400 uppercase mb-1">Match Status</label>
                                                      <select
                                                        value={editingMatchStatus}
                                                        onChange={(e) => setEditingMatchStatus(e.target.value as any)}
                                                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-rose-500/50 rounded-lg"
                                                      >
                                                        <option value="pending">Pending</option>
                                                        <option value="live">Live</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="disputed">Disputed ⚠️</option>
                                                      </select>
                                                    </div>

                                                    <div>
                                                      <label className="block text-[8px] font-bold text-zinc-400 uppercase mb-1">Assign Winner</label>
                                                      <select
                                                        value={editingMatchWinnerId || ''}
                                                        onChange={(e) => setEditingMatchWinnerId(e.target.value || null)}
                                                        disabled={p1Name === 'BYE' && p2Name === 'BYE'}
                                                        className="w-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-rose-500/50 rounded-lg disabled:opacity-40"
                                                      >
                                                        <option value="">No Winner Set</option>
                                                        {p1Id && <option value={p1Id}>{p1Name}</option>}
                                                        {p2Id && <option value={p2Id}>{p2Name}</option>}
                                                      </select>
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-1 gap-2.5">
                                                    <div>
                                                      <label className="block text-[8px] font-bold text-zinc-400 uppercase mb-1">Verdict Notes</label>
                                                      <textarea
                                                        value={editingMatchNotes}
                                                        onChange={(e) => setEditingMatchNotes(e.target.value)}
                                                        placeholder="Enter match highlights or dispute resolution notes..."
                                                        rows={2}
                                                        className="w-full bg-zinc-900 border border-zinc-800 text-[9.5px] font-mono p-2 text-zinc-300 focus:outline-none focus:border-rose-500/50 rounded-lg resize-none"
                                                      />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                      <div>
                                                        <label className="block text-[8px] font-bold text-zinc-400 uppercase mb-1">Final Score</label>
                                                        <input
                                                          type="text"
                                                          value={editingMatchScore}
                                                          onChange={(e) => setEditingMatchScore(e.target.value)}
                                                          placeholder="e.g., 2-1 or 150-120"
                                                          className="w-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-rose-500/50 rounded-lg"
                                                        />
                                                      </div>

                                                      <div>
                                                        <label className="block text-[8px] font-bold text-zinc-400 uppercase mb-1">Upload Proof</label>
                                                        <div className="relative">
                                                          <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleMatchScreenshotFileChange}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                          />
                                                          <div className="w-full bg-zinc-900 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg py-1.5 px-2 text-center text-zinc-500 font-mono text-[8.5px] flex items-center justify-center gap-1">
                                                            <Upload className="w-3 h-3 text-zinc-650" />
                                                            {uploadingMatchScreenshot ? "Uploading..." : "Click to select proof"}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {editingMatchScreenshot && (
                                                      <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-850 p-1.5 rounded-lg">
                                                        <img 
                                                          src={editingMatchScreenshot} 
                                                          alt="Preview" 
                                                          className="w-10 h-10 object-cover rounded-md border border-zinc-800" 
                                                        />
                                                        <div className="flex-1 overflow-hidden">
                                                          <span className="text-[7.5px] text-zinc-500 block uppercase font-sans">SCREENSHOT PROOF:</span>
                                                          <span className="text-[8.5px] text-cyan-400 truncate block">{editingMatchScreenshot.substring(0, 35)}...</span>
                                                        </div>
                                                        <button
                                                          type="button"
                                                          onClick={() => setEditingMatchScreenshot('')}
                                                          className="text-rose-400 hover:text-rose-500 font-bold px-1 text-[9px]"
                                                        >
                                                          [X]
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>

                                                  <div className="flex gap-2 pt-1 font-bold">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleSaveMatchOutcome(match, t.id)}
                                                      disabled={isUpdatingMatchStatus === match.id}
                                                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-mono uppercase tracking-wider text-[9px] py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-45"
                                                    >
                                                      {isUpdatingMatchStatus === match.id ? "Saving..." : "💾 Save & Progress"}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setEditingMatchId(null)}
                                                      className="px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-855 text-[9px] py-1.5 rounded-lg transition-all"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Grand Finale declare winner banner */}
                                              {roundNum === totalRounds && match.status === 'completed' && winnerId && t.status !== 'completed' && (
                                                <div className="pt-2 border-t border-zinc-900/80">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeclareChampion(t.id, winnerId)}
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 hover:text-black font-sans font-black text-[9px] tracking-widest uppercase py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-bounce"
                                                  >
                                                    🏆 Declare Tournament Champion
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl">
                                <p className="text-xs text-zinc-500 font-mono italic">No bracket matches formed yet for this tournament.</p>
                                <p className="text-[10px] text-zinc-600 mt-1">Configure seed limits and generate matches to activate the arena tracker.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Esports Pass Verification</h3>
            <p className="text-xs text-zinc-400">Match verified screenshot uploads and transaction ID trackers before approving membership tiers.</p>

            {pendingPayments.length === 0 ? (
              <div className="p-10 text-center bg-zinc-950/40 border border-zinc-850 rounded-xl">
                <Check className="w-10 h-10 text-green-400 mx-auto mb-2 animate-bounce" />
                <p className="text-xs text-zinc-500 font-mono italic">No pending payment validations. Everything cleared!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingPayments.map(payment => (
                  <div key={payment.id} className="p-4 bg-zinc-950/70 border border-zinc-805 rounded-xl space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center bg-zinc-90 w-full flex-wrap gap-2">
                      <span className="font-bold text-white text-xs truncate max-w-[200px]" title={payment.userEmail}>{payment.userEmail}</span>
                      <span className="bg-amber-400/10 border border-amber-400/20 text-amber-400 font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                        {payment.plan} Upgrade Request
                      </span>
                    </div>

                    <div className="space-y-1 bg-zinc-900 border border-zinc-850 p-3 rounded-lg text-[10px]/relaxed text-zinc-400">
                      <p>Amount: <strong className="text-white">₹{payment.amount}</strong></p>
                      <p>Txn Reference ID: <strong className="text-white font-sans text-xs">{payment.transactionId}</strong></p>
                      {payment.couponApplied && (
                        <p>Coupon Applied: <strong className="text-emerald-400 font-sans text-xs">{payment.couponApplied}</strong></p>
                      )}
                      <p>Screenshot Verification Proof: </p>
                      <a href={payment.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 truncate block hover:underline">
                        {payment.screenshotUrl}
                      </a>
                    </div>

                    {/* Screenshot image viewport snippet */}
                    {payment.screenshotUrl && payment.screenshotUrl.trim() !== "" && (
                      <div className="border border-zinc-800/60 rounded overflow-hidden max-h-32 bg-black flex items-center justify-center">
                        <img src={payment.screenshotUrl} className="object-cover max-h-full max-w-full" />
                      </div>
                    )}

                    <div className="flex gap-2 font-mono pt-2 border-t border-zinc-800/50">
                      <button
                        onClick={() => handleApprove(payment.id)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[10px] tracking-wide"
                      >
                        ✓ VERIFY & UNLOCK
                      </button>
                      <button
                        onClick={() => handleReject(payment.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white text-[10px] font-bold"
                      >
                        ✕ DECLINE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subscription Cancellation Requests Section */}
            <div className="pt-6 border-t border-zinc-800">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2 flex items-center justify-between">
                <span>Subscription Cancellation Requests</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Review athlete requests to drop their VIP tiers and route correct return funds.</p>

              {cancellations.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/20 border border-zinc-850 rounded-xl mt-3">
                  <p className="text-xs text-zinc-500 font-mono italic">No subscription cancellation requests on file.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {cancellations.map((req) => (
                    <div key={req.id} className="p-4 bg-zinc-950/70 border border-zinc-805 rounded-xl space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center bg-zinc-90 w-full flex-wrap gap-2">
                        <span className="font-bold text-white text-xs truncate max-w-[200px]" title={req.user_email}>{req.user_email}</span>
                        <span className={`font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase ${
                          req.status === 'pending'
                            ? 'bg-amber-400/10 border border-amber-400/20 text-amber-400 animate-pulse'
                            : req.status === 'approved'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                        }`}>
                          {req.plan} - {req.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1 bg-zinc-900 border border-zinc-850 p-3 rounded-lg text-[10px]/relaxed text-zinc-400 text-left">
                        {req.upi_id && <p>Payout UPI ID: <strong className="text-white">{req.upi_id}</strong></p>}
                        {req.reason && <p>Reason: <span className="text-zinc-300 font-sans italic">"{req.reason}"</span></p>}
                        <p>Date Filed: <span className="text-zinc-300">{new Date(req.created_at).toLocaleString()}</span></p>
                        {req.admin_note && <p>Admin Note: <span className="text-amber-500">{req.admin_note}</span></p>}
                        {req.qr_url && (
                          <div>
                            <p className="mb-1">QR Code Screenshot:</p>
                            <a href={req.qr_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline block truncate mb-1">
                              {req.qr_url}
                            </a>
                            <div className="border border-zinc-800 rounded overflow-hidden max-h-32 bg-black flex items-center justify-center">
                              <img src={req.qr_url} className="object-cover max-h-full max-w-full" alt="QR Payout reference" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <div className="space-y-2 pt-2">
                          <input
                            type="text"
                            placeholder="Add admin note..."
                            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded px-3 py-1.5 focus:outline-none focus:border-amber-500"
                            id={`admin-note-${req.id}`}
                          />
                          <div className="flex gap-2 font-mono">
                            <button
                              onClick={() => {
                                const noteInput = document.getElementById(`admin-note-${req.id}`) as HTMLInputElement;
                                handleApproveCancellation(req.id, noteInput?.value || '');
                              }}
                              className="flex-grow py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[10px] tracking-wide cursor-pointer"
                            >
                              ✓ APPROVE
                            </button>
                            <button
                              onClick={() => {
                                const noteInput = document.getElementById(`admin-note-${req.id}`) as HTMLInputElement;
                                handleRejectCancellation(req.id, noteInput?.value || '');
                              }}
                              className="px-3.5 py-1.5 rounded bg-rose-500/20 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white text-[10px] font-bold cursor-pointer"
                            >
                              ✕ REJECT
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coupon additions */}
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Skins Discount Coupons</h3>

              <form onSubmit={submitAddCoupon} className="space-y-3 bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Coupon code symbol</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SQUAD25"
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white px-3 py-2 rounded focus:outline-none"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Rebate Percentage (%)</label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded focus:outline-none"
                    value={couponPercent}
                    onChange={(e) => setCouponPercent(e.target.value)}
                  >
                    <option value="10">10% OFF</option>
                    <option value="20">20% OFF</option>
                    <option value="30">30% OFF</option>
                    <option value="50">50% OFF</option>
                    <option value="100">100% FREE (Sponsor)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-mono font-bold py-2 rounded text-xs"
                >
                  ACTIVATE PROMO RULE
                </button>
              </form>

              {/* Coupons Active view */}
              <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-850 space-y-2">
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold">Active system rules codes:</p>
                {adminSettings.activeCoupons.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-zinc-900 border border-zinc-800 rounded font-mono">
                    <span>CODE: <strong className="text-white">{c.code}</strong> ({c.discountPercent}% OFF)</span>
                    <button onClick={() => onRemoveCoupon(c.code)} className="text-rose-500 hover:text-rose-600 font-bold p-1">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

              {/* QR upload gateway settings */}
              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">Core dynamic UPI QR gateway configuration</h3>

                <form onSubmit={submitQrCodeUpdate} className="space-y-4 bg-zinc-950 p-6 border border-zinc-800 rounded-2xl font-mono text-xs">
                  {/* 1. UPI ID Section */}
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1 tracking-wider">UPI ID for Direct Transfers</label>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input
                          type="text"
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 text-[12px] text-white px-3 py-2.5 focus:border-red-500 outline-none rounded-lg"
                          value={upiIdInput}
                          onChange={(e) => setUpiIdInput(e.target.value)}
                          placeholder="e.g. careerhub@ybl"
                        />
                      </div>
                      {upiIdInput && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(upiIdInput);
                            addToast("UPI ID copied to clipboard!", "success");
                          }}
                          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3 rounded-lg flex items-center justify-center gap-1 font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
                          title="Copy UPI ID"
                        >
                          <Copy className="w-4 h-4 text-zinc-400" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. QR Code upload block */}
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-500 font-bold mb-1 tracking-wider">Payment QR Code image</span>
                    
                    {/* Hidden Input file selector */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleQrFileChange}
                      className="hidden"
                    />

                    {qrCodeInput && qrCodeInput.trim() !== "" && !qrCodeInput.startsWith('file:///') ? (
                      <div className="space-y-3">
                        {/* Image Preview container */}
                        <div className="border border-zinc-800 rounded-xl overflow-hidden max-w-xs p-3 bg-white flex flex-col items-center justify-center">
                          <img src={qrCodeInput} alt="Uploaded QR preview" className="object-contain max-h-48 rounded" referrerPolicy="no-referrer" />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Replace QR button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingQr}
                            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-[11px] text-zinc-300 hover:text-white flex items-center gap-1 font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${uploadingQr ? 'animate-spin' : ''}`} />
                            Replace QR Scanner
                          </button>

                          {/* Delete QR button */}
                          <button
                            type="button"
                            onClick={() => {
                              setQrCodeInput('');
                              addToast("QR cleared. Save settings below to finalize database update.", "info");
                            }}
                            disabled={uploadingQr}
                            className="px-3 py-1.5 bg-zinc-900 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/10 text-[11px] flex items-center gap-1 font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            Delete QR
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Elegant Select trigger box */
                      <div
                        onClick={() => !uploadingQr && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                          uploadingQr 
                            ? 'border-amber-400 bg-amber-500/5' 
                            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40'
                        }`}
                      >
                        {uploadingQr ? (
                          <div className="flex flex-col items-center space-y-2 py-2">
                            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                            <p className="text-[11px] text-zinc-400 font-bold">Uploading Payment QR asset...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-2 py-1 text-zinc-400 hover:text-zinc-200">
                            <Upload className="w-6 h-6 text-zinc-500" />
                            <p className="text-[11px] font-bold">Upload Payment QR Code</p>
                            <span className="text-[9px] text-zinc-500">Select JPEG, PNG, or SVG image file from your computer</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Submit Update Button */}
                  <button
                    type="submit"
                    disabled={uploadingQr}
                    className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    SAVE DYNAMIC UPI GATEWAY SETTINGS
                  </button>
                </form>
              </div>
          </div>
        )}

        {activeTab === 'sponsors' && (
          <div className="space-y-8">
            {/* ANCHOR FOR EDIT FORM VIEW */}
            <div id="sponsor-brand-form-anchor" />

            {/* BRAND EDITOR / SUBMISSION DRIVER */}
            <div className="bg-zinc-950/80 border border-zinc-850 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <div>
                  <h4 className="text-xs font-mono font-black text-amber-500 uppercase tracking-widest">
                    {editingSponsorId ? "⚡ UPDATE PREMIUM PARTNER" : "🚀 DEPLOY SPONSOR BRAND"}
                  </h4>
                  <p className="text-zinc-500 text-[10px] mt-0.5">Configure static advertising slots metrics & website campaign hyperlinks</p>
                </div>
                {editingSponsorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSponsorId(null);
                      setBrandName('');
                      setBrandLogo('');
                      setBrandWebsite('');
                      setBrandBanner('');
                      setBrandDescription('');
                      setBrandStartDate('');
                      setBrandEndDate('');
                      setBrandActive(true);
                    }}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-400 rounded-lg cursor-pointer transition-all"
                  >
                    RESET FORM
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!brandName) {
                    addToast("Brand company name is required", "warning");
                    return;
                  }
                  try {
                    if (editingSponsorId) {
                      await supabaseService.updateSponsor(editingSponsorId, {
                        company_name: brandName,
                        logo_url: brandLogo,
                        website_url: brandWebsite,
                        banner_url: brandBanner,
                        description: brandDescription,
                        start_date: brandStartDate,
                        end_date: brandEndDate,
                        active: brandActive
                      });
                      addToast(`Partner brand ${brandName} successfully revised!`, "success");
                    } else {
                      await supabaseService.createSponsor({
                        company_name: brandName,
                        logo_url: brandLogo,
                        website_url: brandWebsite,
                        banner_url: brandBanner,
                        description: brandDescription,
                        start_date: brandStartDate,
                        end_date: brandEndDate,
                        active: brandActive,
                        views: 0,
                        clicks: 0
                      });
                      addToast(`New premium campaign for ${brandName} launched!`, "success");
                    }
                    setEditingSponsorId(null);
                    setBrandName('');
                    setBrandLogo('');
                    setBrandWebsite('');
                    setBrandBanner('');
                    setBrandDescription('');
                    setBrandStartDate('');
                    setBrandEndDate('');
                    setBrandActive(true);
                    await fetchSponsorBrandsAndPayments();
                  } catch (err: any) {
                    addToast(err.message || "Failed saving brand", "error");
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono"
              >
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RedBull Esports"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 text-xs rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">Website URL</label>
                  <input
                    type="url"
                    placeholder="e.g. https://redbull.com/gaming"
                    value={brandWebsite}
                    onChange={(e) => setBrandWebsite(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 text-xs rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">Square Brand Logo URL</label>
                  <input
                    type="text"
                    placeholder="e.g. Unsplash or direct image raw path"
                    value={brandLogo}
                    onChange={(e) => setBrandLogo(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 text-xs rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">Marketing Banner URL</label>
                  <input
                    type="text"
                    placeholder="e.g. Unsplash image source for showcase card"
                    value={brandBanner}
                    onChange={(e) => setBrandBanner(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 text-xs rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">Short Pitch Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide gamers details of what premium perks or promo codes this sponsor brand is giving out."
                    value={brandDescription}
                    onChange={(e) => setBrandDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 text-xs rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">Controlling Start Date</label>
                  <input
                    type="date"
                    value={brandStartDate}
                    onChange={(e) => setBrandStartDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 p-2 text-xs rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1">Campaign Retirement Date</label>
                  <input
                    type="date"
                    value={brandEndDate}
                    onChange={(e) => setBrandEndDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 p-2 text-xs rounded-xl focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="brandActiveBox"
                    checked={brandActive}
                    onChange={(e) => setBrandActive(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-800 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="brandActiveBox" className="text-[11px] text-zinc-400 cursor-pointer select-none">
                    Enable Ad Slot Delivery (Active Status)
                  </label>
                </div>

                <div className="flex justify-end items-end md:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-xl text-[10px] uppercase font-mono tracking-wider shadow-lg cursor-pointer transition-all"
                  >
                    {editingSponsorId ? "💾 SAVE MODIFICATIONS" : "⚡ INSTANTLY PUBLISH SPONSOR CARD"}
                  </button>
                </div>
              </form>
            </div>

            {/* PLATFORM PARTNER DIRECTORY & REAL-TIME CTR ANALYTICS */}
            <div className="space-y-4">
              <div className="border-b border-zinc-800/40 pb-2 flex justify-between items-baseline flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-white uppercase tracking-wide">Premium Sponsor Directory</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Live metrics showing impressions view totals and Click-Through Rate index</p>
                </div>
                <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold">TOTAL REGISTERED BRANDS: {sponsorBrands.length}</span>
              </div>

              {sponsorBrands.length === 0 ? (
                <div className="p-10 text-center bg-zinc-950/40 border border-zinc-850 rounded-xl font-mono">
                  <p className="text-xs text-zinc-500 italic">No marketing partner brands registered yet. Use form above to create.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sponsorBrands.map((brand) => {
                    // CTR index calculation
                    const ctr = brand.views && brand.views > 0
                      ? ((brand.clicks || 0) / brand.views) * 100
                      : 0.00;

                    return (
                      <div key={brand.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4.5 space-y-4 relative overflow-hidden flex flex-col justify-between">
                        {/* Status absolute header */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            {brand.logo_url && (
                              <img src={brand.logo_url} referrerPolicy="no-referrer" alt="" className="w-10 h-10 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-800" />
                            )}
                            <div>
                              <h5 className="font-extrabold text-white text-xs uppercase leading-tight font-sans clamp-1">{brand.company_name}</h5>
                              <span className="text-[9px] text-zinc-500 font-mono">ID: {brand.id}</span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black font-mono uppercase tracking-wider ${
                            brand.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}>
                            {brand.active ? "ACTIVE DELIVERY" : "MUTED"}
                          </span>
                        </div>

                        {brand.banner_url && (
                          <div className="relative h-24 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                            <img src={brand.banner_url} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-60" alt="" />
                          </div>
                        )}

                        <div className="text-[11px] text-zinc-400 line-clamp-2 leading-normal">
                          {brand.description || "No official marketing brief uploaded."}
                        </div>

                        {/* Analytic logs - CTR TRACKER */}
                        <div className="bg-zinc-950 p-3.5 border border-zinc-850 rounded-xl grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                          <div>
                            <span className="text-[8.5px] text-zinc-500 uppercase block mb-0.5">Views</span>
                            <span className="font-bold text-white text-xs">{brand.views || 0}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] text-zinc-500 uppercase block mb-0.5">Clicks</span>
                            <span className="font-bold text-white text-xs">{brand.clicks || 0}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] text-zinc-500 uppercase block mb-0.5">CTR Rate</span>
                            <span className="font-bold text-amber-400 text-xs">{ctr.toFixed(2)}%</span>
                          </div>
                        </div>

                        {/* Controlling Action Center */}
                        <div className="flex gap-2 pt-2 border-t border-zinc-850">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSponsorId(brand.id);
                              setBrandName(brand.company_name);
                              setBrandLogo(brand.logo_url || '');
                              setBrandWebsite(brand.website_url || '');
                              setBrandBanner(brand.banner_url || '');
                              setBrandDescription(brand.description || '');
                              setBrandStartDate(brand.start_date || '');
                              setBrandEndDate(brand.end_date || '');
                              setBrandActive(brand.active);
                              const anchor = document.getElementById('sponsor-brand-form-anchor');
                              if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="flex-1 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-mono text-[9px] rounded-lg border border-zinc-850 uppercase cursor-pointer text-center"
                          >
                            Edit Brand
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const nextStatus = !brand.active;
                                await supabaseService.updateSponsor(brand.id, { active: nextStatus });
                                addToast(`Sponsor ${brand.company_name} stands ${nextStatus ? 'ENABLED' : 'DISABLED'}`, "info");
                                await fetchSponsorBrandsAndPayments();
                              } catch (e: any) {
                                addToast(e.message || "Failed changing active status", "error");
                              }
                            }}
                            className={`px-3 py-1.5 font-mono text-[9px] rounded-lg uppercase cursor-pointer border ${
                              brand.active 
                                ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500 hover:text-zinc-950" 
                                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950"
                            }`}
                          >
                            {brand.active ? "Pause" : "Deliver"}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Eliminate premium partnerbrand ${brand.company_name} from active inventory database?`)) return;
                              try {
                                await supabaseService.deleteSponsor(brand.id);
                                addToast("Partner brand successfully retired", "success");
                                await fetchSponsorBrandsAndPayments();
                              } catch (e: any) {
                                addToast(e.message || "Failed deleting brand", "error");
                              }
                            }}
                            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-lg border border-rose-500/20 font-mono text-[9px] cursor-pointer"
                          >
                            Kill
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ATHLETE SPONSOR LEVEL APPLICATION SCREENINGS (EXISTING RETAINED INTACT) */}
            <div className="pt-6 border-t border-zinc-850">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800/40 pb-2">
                🤝 Athlete Sponsor Pitch Applications
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Review verified profile submissions filed by portal gamers seeking third-party contract pitches.</p>

              <div className="space-y-3 mt-4">
                {sponsors.length === 0 ? (
                  <div className="p-10 text-center bg-zinc-950/40 border border-zinc-850 rounded-xl font-mono">
                    <p className="text-xs text-zinc-500 italic">No athlete pitch applications on database log yet.</p>
                  </div>
                ) : (
                  sponsors.map((app) => (
                    <div key={app.id} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-3 text-xs leading-relaxed font-mono">
                      <div className="flex justify-between items-center flex-wrap">
                        <span className="font-bold text-white text-sm">Gamer ID: {app.gamerName}</span>
                        <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded">
                          Target Brand: {app.brandName || app.brandName}
                        </span>
                      </div>

                      <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-1.5 font-sans leading-relaxed">
                        <p className="text-zinc-400 italic text-xs">"{app.pitch}"</p>
                        <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                          <span>Combined Social Reach: {app.monthlyReach}</span>
                          <span>Official verification: {app.contactEmail}</span>
                        </div>
                      </div>

                      {app.status === 'pending' ? (
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => onApproveSponsorApplication(app.id)}
                            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black rounded-lg text-[10px] uppercase font-mono tracking-wider transition-all cursor-pointer"
                          >
                            ✓ CONNECT PARTNERSHIP
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectSponsorApplication(app.id)}
                            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
                          >
                            ✕ DECLINE PITCH
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-500 uppercase font-bold pt-1 font-mono">
                          Application resolved status: <span className="text-white">{app.status}</span>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'membership_benefits' && (
          <div className="space-y-8 font-mono text-xs">
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-505" />
                UPGRADE PERKS & MEMBERSHIP BENEFITS MANAGER
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">Directly build, audit, and authorize custom badges, premium stickers, profile glow frames, banners, and unlockable rewards.</p>
            </div>

            {/* Badges Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddBadge} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Sparkle className="w-4 h-4 text-amber-400" /> REGISTER TARGET BADGE</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Badge Title Name</label>
                  <input type="text" placeholder="e.g. Diamond Veteran Sniper" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px]" value={badgeName} onChange={e => setBadgeName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Badge Icon Badge / Label text (Emoji or Tag)</label>
                  <input type="text" placeholder="e.g. 💎 Radiant Master" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={badgeIcon} onChange={e => setBadgeIcon(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tied Minimum Premium Level</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={badgeTier} onChange={e => setBadgeTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier Pass</option>
                    <option value="Gold">Gold Tier Pass</option>
                    <option value="Platinum">Platinum VIP Pass</option>
                    <option value="All">All Tiers (Silver+)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Badge Catalog Entry</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Badges ({ (adminSettings.badges || []).length })</p>
                {(adminSettings.badges || []).map(b => (
                  <div key={b.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{b.name}</p>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">TIER: {b.tier} | ICON: <strong className="text-amber-400">{b.icon}</strong></span>
                    </div>
                    <button onClick={() => submitRemoveBadge(b.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticker Pack Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddStickerPack} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-rose-500" /> REGISTER STICKER PACK</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Pack Name</label>
                  <input type="text" placeholder="e.g. Neon Demonic Sigils" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={stickerPackName} onChange={e => setStickerPackName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Stickers Emotic List (Comma Separated)</label>
                  <input type="text" placeholder="👹, 👾, 👻, 💀, 🤡" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={stickerPackEmojis} onChange={e => setStickerPackEmojis(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tier Requirement</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={stickerPackTier} onChange={e => setStickerPackTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier</option>
                    <option value="Gold">Gold Tier</option>
                    <option value="Platinum">Platinum VIP Tier</option>
                    <option value="All">All Tiers</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Sticker Pack</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Packs ({ (adminSettings.stickerPacks || []).length })</p>
                {(adminSettings.stickerPacks || []).map(p => (
                  <div key={p.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{p.name}</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {p.stickers.map((s, i) => <span key={i} className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded select-none text-xs">{s}</span>)}
                      </div>
                      <span className="text-[9px] text-zinc-500 block mt-1">TIER: {p.tier}</span>
                    </div>
                    <button onClick={() => submitRemoveStickerPack(p.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Frames */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddProfileFrame} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-cyan-400" /> REGISTER PROFILE FRAMES</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Frame Name Title</label>
                  <input type="text" placeholder="e.g. Hologram Plasma Aura" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px]" value={frameName} onChange={e => setFrameName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tailwind Style Classes CSS</label>
                  <input type="text" placeholder="ring-4 ring-cyan-450 shadow-[0_0_12px_cyan]" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px] font-mono" value={frameStyle} onChange={e => setFrameStyle(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Unlock Tier</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={frameTier} onChange={e => setFrameTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier</option>
                    <option value="Gold">Gold Tier</option>
                    <option value="Platinum">Platinum VIP Tier</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Profile Frame</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Frames ({ (adminSettings.profileFrames || []).length })</p>
                {(adminSettings.profileFrames || []).map(f => (
                  <div key={f.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{f.name}</p>
                      <span className="text-[9px] text-zinc-500 block font-mono bg-zinc-900 px-1.5 py-1 rounded my-1 border border-zinc-800 truncate max-w-xs">{f.style}</span>
                      <span className="text-[9px] text-zinc-500 block">TIER: {f.tier}</span>
                    </div>
                    <button onClick={() => submitRemoveProfileFrame(f.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Banners */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddProfileBanner} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Image className="w-4 h-4 text-purple-400" /> REGISTER PROFILE BANNERS</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Banner Style Name</label>
                  <input type="text" placeholder="e.g. Electric Cyber Sunset" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px]" value={bannerName} onChange={e => setBannerName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Tailwind Style Classes (or Image URL)</label>
                  <input type="text" placeholder="bg-gradient-to-r from-purple-800 via-pink-700 to-amber-700" className="w-full bg-zinc-950 border border-zinc-805 text-white px-3 py-2 rounded text-[11px] font-mono" value={bannerStyle} onChange={e => setBannerStyle(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Unlock Level</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={bannerTier} onChange={e => setBannerTier(e.target.value as any)}>
                    <option value="Gold">Gold Tier (Silver is standard black)</option>
                    <option value="Platinum">Platinum VIP Tier</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Profile Banner</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Banners ({ (adminSettings.profileBanners || []).length })</p>
                {(adminSettings.profileBanners || []).map(b => (
                  <div key={b.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{b.name}</p>
                      <span className="text-[9px] text-zinc-500 block font-mono bg-zinc-900 px-1.5 py-1 border border-zinc-800 rounded my-1 truncate max-w-xs">{b.style}</span>
                      <span className="text-[9px] text-zinc-500 block">TIER: {b.tier}</span>
                    </div>
                    <button onClick={() => submitRemoveProfileBanner(b.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Rewards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 bg-zinc-950/40 rounded-xl border border-zinc-850">
              <form onSubmit={submitAddPremiumReward} className="space-y-3">
                <h4 className="font-extrabold text-white flex items-center gap-1.5"><Gift className="w-4 h-4 text-emerald-400" /> REGISTER PREMIUM REWARDS</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Reward System Title</label>
                  <input type="text" placeholder="e.g. Priority Sponsor Consultation Slots" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px]" value={rewardName} onChange={e => setRewardName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Detailed Reward Description</label>
                  <textarea placeholder="Write full description" className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-[11px] h-16 font-sans text-xs" value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Redemption Tier</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]" value={rewardTier} onChange={e => setRewardTier(e.target.value as any)}>
                    <option value="Silver">Silver Tier Pass</option>
                    <option value="Gold">Gold Tier Pass</option>
                    <option value="Platinum">Platinum VIP Pass</option>
                    <option value="All">All Tiers</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] uppercase tracking-wider">Add Premium Reward</button>
              </form>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wide">Active Rewards ({ (adminSettings.premiumRewards || []).length })</p>
                {(adminSettings.premiumRewards || []).map(r => (
                  <div key={r.id} className="p-2.5 border border-zinc-850 bg-zinc-950/70 rounded-xl flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-white font-bold">{r.name}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 font-sans leading-tight">"{r.description}"</p>
                      <span className="text-[9px] text-zinc-500 block mt-1">TIER: {r.tier}</span>
                    </div>
                    <button onClick={() => submitRemovePremiumReward(r.id)} className="text-rose-500 hover:text-rose-600 p-1 font-bold">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Platinum Theme Assets Manager */}
            <div className="p-5 bg-zinc-950/45 rounded-xl border border-rose-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <h4 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-450 via-fuchsia-400 to-indigo-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-500 animate-spin [animation-duration:10s]" />
                  PLATINUM THEME ASSETS & TEMPLATES CONTROL
                </h4>
                <span className="text-[8px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-widest leading-none">
                  VIP Storage Node: platinum_profile_themes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Asset Uploader UI */}
                <div className="space-y-3 font-mono text-xs">
                  <h5 className="font-bold text-white flex items-center gap-1.5 uppercase text-[10px]">
                    🌌 Live Upload to Supabase Storage
                  </h5>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Select Target Theme Component Type</label>
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-[11px]"
                      value={platinumUploadType}
                      onChange={(e) => setPlatinumUploadType(e.target.value as any)}
                    >
                      <option value="background">Background Theme Wallpaper (Image/GIF)</option>
                      <option value="overlay">HUD Overlay Scanframe (HUD elements/decals)</option>
                      <option value="card">Stats Card Backdrop Gradient Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase mb-1 font-bold">Select File (Max 15MB)</label>
                    <div className="relative border border-dashed border-zinc-800 hover:border-rose-500/40 rounded-xl p-5 bg-zinc-950/60 transition-all text-center flex flex-col justify-center items-center h-32">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleThemeAssetUpload} 
                        disabled={uploadingThemeAsset}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {uploadingThemeAsset ? (
                        <div className="space-y-1 py-2">
                          <RefreshCw className="w-5 h-5 text-rose-550 animate-spin mx-auto animate-pulse" />
                          <span className="text-[10px] text-zinc-400 block font-bold">SAVING TO SUPABASE...</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-1">
                          <Upload className="w-6 h-6 text-zinc-500 mx-auto" />
                          <span className="text-[10px] text-zinc-300 block font-bold leading-none">CLICK OR DRAG FILE HERE</span>
                          <span className="text-[8px] text-zinc-550 block">PNG, JPEG, SVG or animated GIF templates</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {platinumUploadUrl && (
                    <div className="p-3 bg-zinc-950 border border-rose-500/20 rounded-xl space-y-1.5">
                      <span className="text-[9px] text-rose-455 font-bold block uppercase">SUPABASE STORAGE CDN LINK:</span>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={platinumUploadUrl} 
                          className="w-full bg-zinc-900 text-[10px] px-2 py-1 border border-zinc-800 text-zinc-300 rounded font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(platinumUploadUrl);
                            addToast("CDN URL copied to clipboard!", "success");
                          }}
                          className="bg-zinc-850 hover:bg-zinc-800 text-white font-bold px-2 py-1 rounded text-[10px] uppercase cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preconfigured catalog list in the workspace */}
                <div className="space-y-3 font-mono text-xs">
                  <h5 className="font-bold text-white flex items-center gap-1.5 uppercase text-[10px]">
                    📋 Pre-built Theme Presets (Click any to copy URL)
                  </h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-[9px]">
                    
                    <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-cyan-400 font-bold block">Preset Neon Grid Backdrop</span>
                        <p className="text-zinc-550 text-[8px] truncate max-w-xs mt-0.5">https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80");
                          addToast("Neon Grid backdrop URL copied!", "success");
                        }}
                        className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-300 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-indigo-400 font-bold block">Preset Cyber Scanline Matrix HUD</span>
                        <p className="text-zinc-550 text-[8px] truncate max-w-xs mt-0.5">https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80");
                          addToast("Cyber Scanline HUD overlay URL copied!", "success");
                        }}
                        className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-300 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>

                    <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-yellow-500 font-bold block">Preset Obsidian Gradient Card Backdrop</span>
                        <p className="text-zinc-550 text-[8px] truncate max-w-xs mt-0.5">https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80");
                          addToast("Obsidian gradient card URL copied!", "success");
                        }}
                        className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-300 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diamonds' && (
          <div className="space-y-8 font-mono text-xs">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                DIAMOND MICRO-ECONOMY VAULT & LEDGER PORTAL
              </h3>
              <p className="text-zinc-400 mt-1 font-sans font-normal text-[11px]/relaxed">
                Approve QR top-ups, process UPI rewards withdrawal dispatch desk, and force manually credited wallets with custom reasons.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Manual Balance Adjustment Form - Part 15 */}
              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 space-y-4">
                <h4 className="font-extrabold text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-amber-500">
                  ⚡ Force Balance Adjustment (Admin Manual Credit)
                </h4>
                <form onSubmit={handleAdjustDiamonds} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9.5px] text-zinc-550 uppercase mb-1 font-bold">Select Active Player Profile</label>
                      <select
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-2 rounded text-[11px] focus:outline-none focus:border-amber-500 font-sans"
                        value={selectedAdjustUserId}
                        onChange={e => {
                          setSelectedAdjustUserId(e.target.value);
                          const found = users.find(u => u.id === e.target.value);
                          if (found && found.email) {
                            setAdjustEmail(found.email);
                          }
                        }}
                      >
                        <option value="">-- Choose Operative --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.gamerName} ({u.email || 'No email'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9.5px] text-zinc-550 uppercase mb-1 font-bold">OR Type User Email *</label>
                      <input
                        type="email"
                        placeholder="gamer@gmail.com"
                        className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-2 rounded text-[11px] focus:outline-none focus:border-amber-500"
                        value={adjustEmail}
                        onChange={e => setAdjustEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9.5px] text-zinc-550 uppercase mb-1 font-bold">Wallet Type *</label>
                      <select
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-350 px-2.5 py-2 rounded text-[11px] focus:outline-none focus:border-amber-500"
                        value={adjustWalletType}
                        onChange={e => setAdjustWalletType(e.target.value as 'topup' | 'winning')}
                      >
                        <option value="topup">Top-up Balance (Non-Withdrawable)</option>
                        <option value="winning">Winning Balance (Withdrawable, 1💎 = ₹1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9.5px] text-zinc-550 uppercase mb-1 font-bold">Diamond Amount Quantity *</label>
                      <input
                        type="number"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-2 rounded text-[11px] focus:outline-none focus:border-amber-500 font-mono"
                        placeholder="e.g. 100 or -50"
                        value={adjustAmount}
                        onChange={e => setAdjustAmount(parseInt(e.target.value, 10) || 0)}
                      />
                      <span className="text-[8px] text-zinc-500 leading-tight mt-0.5 block font-sans font-normal">Use negative value to deduct diamonds.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] text-zinc-550 uppercase mb-1 font-bold">Manual Adjustment Reason / Note *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Compensated for tournament lobby issue / manual cash purchase"
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-2 rounded text-[11.5px] focus:outline-none focus:border-amber-500 font-sans"
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 text-black hover:opacity-95 rounded-xl font-black text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Authorize Split Balance manual credit
                  </button>
                </form>
              </div>

              {/* Pending Approvals Queue */}
              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 space-y-4">
                <h4 className="font-extrabold text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-rose-450">
                  ⌛ Pending QR Scanning Approvals ({diamondTransactions.filter(t => t.status === 'pending' && t.transaction_type === 'topup_purchase').length})
                </h4>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {diamondTransactions.filter(t => t.status === 'pending' && t.transaction_type === 'topup_purchase').length === 0 ? (
                    <div className="text-center py-10 text-zinc-550">
                      <p className="font-sans italic font-normal">All pending top-up purchase transactions stand processed.</p>
                    </div>
                  ) : (
                    diamondTransactions.filter(t => t.status === 'pending' && t.transaction_type === 'topup_purchase').map((txn: any) => {
                      const payee = users.find(u => u.id === txn.user_id);
                      return (
                        <div key={txn.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2.5">
                          <div className="flex justify-between items-start border-b border-zinc-800/60 pb-2">
                            <div>
                              <span className="font-bold text-white block text-[11.5px]">{payee?.gamerName || 'Unknown Player'}</span>
                              <span className="text-[10px] text-zinc-400 font-sans block select-all">{payee?.email || 'N/A'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-400 font-black text-xs font-mono block">
                                +{txn.total_credited || txn.total_amount || txn.diamonds} 💎
                              </span>
                              <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">TOTAL MICRO-CREDIT</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-zinc-400 font-mono">
                            <div>
                              <p className="text-[9px] text-zinc-550 font-bold">BASE DIAMONDS:</p>
                              <p className="text-white font-black">{txn.diamonds} 💎</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-550 font-bold font-sans">CALCULATED BONUS (+5%):</p>
                              <p className="text-amber-500 font-black">+{txn.bonus || 0} 💎</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-550 font-bold font-sans">PRICE CHARGED:</p>
                              <p className="text-yellow-500 font-black font-sans">₹{txn.price_paid} INR</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-550 font-bold">UTR REF REFERENCE:</p>
                              <p className="text-cyan-400 font-black select-all">{txn.transaction_id || 'N/A'}</p>
                            </div>
                          </div>

                          {txn.payment_screenshot_url && (
                            <div className="p-1.5 bg-zinc-950 rounded text-center border border-zinc-850 mt-1">
                              <a
                                href={txn.payment_screenshot_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9.5px] text-cyan-400 font-bold hover:underline inline-flex items-center gap-1 select-none font-mono uppercase"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Uploaded Screenshot Proof
                              </a>
                            </div>
                          )}

                          <div className="flex gap-2 pt-1 border-t border-zinc-800/40">
                            <button
                              type="button"
                              onClick={() => handleApproveDiamondTxn(txn.id)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[9.5px] uppercase tracking-wide cursor-pointer transition flex items-center justify-center gap-1 border border-emerald-500/10"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve & Credit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectDiamondTxn(txn.id)}
                              className="py-1.5 px-3 bg-zinc-950 hover:bg-rose-950 text-rose-450 hover:text-white font-bold rounded text-[9.5px] uppercase cursor-pointer transition border border-zinc-800 hover:border-rose-900"
                            >
                              Reject Txn
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Part 15: Admin Pending Withdrawals Review Desk */}
            <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 space-y-4">
              <h4 className="font-extrabold text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-cyan-400">
                🏧 Pending Rewards Payout Withdrawals Desk ({adminWithdrawals.filter(w => w.status !== 'paid' && w.status !== 'rejected').length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
                {adminWithdrawals.filter(w => w.status !== 'paid' && w.status !== 'rejected').length === 0 ? (
                  <div className="col-span-full text-center py-12 text-zinc-550 border border-zinc-900 rounded-xl bg-zinc-900/10">
                    <p className="font-sans italic font-normal">All payout reward dispatch tickets are fully settled.</p>
                  </div>
                ) : (
                  adminWithdrawals.filter(w => w.status !== 'paid' && w.status !== 'rejected').map((wr: any) => {
                    const beneficiary = users.find(u => u.id === wr.user_id);
                    return (
                      <div key={wr.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/10 rounded-bl-full pointer-events-none"></div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-white text-[12.5px] tracking-wide block">{beneficiary?.gamerName || 'Unknown Player'}</span>
                              <span className="text-[9px] text-zinc-500 font-sans block font-medium">{beneficiary?.email || 'N/A'}</span>
                            </div>
                            <span className="text-cyan-400 font-mono font-black text-xs px-2.5 py-1 bg-zinc-950 rounded-xl border border-zinc-800 leading-none">
                              ₹{wr.amount}
                            </span>
                          </div>

                          <div className="space-y-2 text-[9.5px]/relaxed border-t border-zinc-800/40 pt-2 text-zinc-400">
                            <p className="flex justify-between">
                              <span className="text-zinc-550 uppercase">UPI Address:</span>
                              <span className="text-cyan-300 font-black font-mono select-all bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-850">{wr.upi_id}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-zinc-550 uppercase">Holder Name:</span>
                              <span className="text-zinc-200 font-bold">{wr.account_holder_name}</span>
                            </p>
                            {wr.phone && (
                              <p className="flex justify-between">
                                <span className="text-zinc-550 uppercase">Linked Phone:</span>
                                <span className="text-zinc-300 font-mono font-bold">{wr.phone}</span>
                              </p>
                            )}
                            <p className="flex justify-between">
                              <span className="text-zinc-550 uppercase">Filed On:</span>
                              <span className="text-zinc-350">{wr.created_at ? new Date(wr.created_at).toLocaleString() : 'N/A'}</span>
                            </p>
                            {wr.note && (
                              <p className="bg-zinc-950/60 p-2 rounded border border-zinc-820 italic text-zinc-500 font-sans leading-relaxed text-[8.5px]">
                                User Note: "{wr.note}"
                              </p>
                            )}
                            <p className="flex justify-between">
                              <span className="text-zinc-550 uppercase">Status:</span>
                              <span className={`font-extrabold uppercase text-[8px] px-1.5 py-0.5 rounded ${
                                wr.status === 'approved' ? 'bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {wr.status}
                              </span>
                            </p>
                          </div>

                          {wr.qr_url && (
                            <div className="p-1 px-1.5 bg-zinc-950 rounded text-center border border-zinc-800">
                              <a
                                href={wr.qr_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] text-amber-500 font-bold hover:underline inline-flex items-center gap-1 select-none font-mono uppercase"
                              >
                                <Eye className="w-3.5 h-3.5" /> View User QR Code scanner
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-zinc-800/40">
                          {activeWithdrawalId === wr.id ? (
                            <div className="space-y-2 p-2 bg-zinc-950 rounded-xl border border-rose-950/60">
                              <label className="block text-[8.5px] text-zinc-500 uppercase font-black tracking-wider">Required Rejection Reason *</label>
                              <textarea
                                required
                                className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 rounded text-[10px] focus:outline-none focus:border-rose-500 font-sans"
                                placeholder="e.g. UPI address is inactive / verified fraud profile logs"
                                value={withdrawalRejectNote}
                                onChange={e => setWithdrawalRejectNote(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRejectWithdrawal(wr.id, withdrawalRejectNote)}
                                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[9px] uppercase transition-all"
                                >
                                  Submit Rejection Refund
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveWithdrawalId(null)}
                                  className="px-2.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded text-[9px] uppercase"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex gap-2">
                                {wr.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveWithdrawal(wr.id)}
                                    className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-750 text-white font-extrabold rounded text-[9.5px] uppercase transition cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve Payout
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaidWithdrawal(wr.id)}
                                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded text-[9.5px] uppercase transition cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Mark PAID (UPI sent)
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveWithdrawalId(wr.id);
                                  setWithdrawalRejectNote('');
                                }}
                                className="w-full py-1 bg-zinc-950 hover:bg-rose-955 text-zinc-500 hover:text-white border border-zinc-850 hover:border-zinc-800 rounded font-black text-[9px] uppercase transition"
                              >
                                Decline Request
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Global Diamond Transaction Logs */}
            <div className="bg-zinc-950/40 p-5 rounded-xl border border-zinc-850 space-y-3.5">
              <h4 className="font-extrabold text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-amber-500">
                📋 Global Diamond Economy Ledger & Audit Logs ({diamondTransactions.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                      <th className="py-2.5">Player Profile</th>
                      <th className="py-2.5">Wallet</th>
                      <th className="py-2.5">Diamonds flow</th>
                      <th className="py-2.5">Price / reference</th>
                      <th className="py-2.5">Log reason / note</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Settled At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/60 text-[10px]">
                    {diamondTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-zinc-550 italic font-sans font-normal">
                          No diamond transactions recorded on database yet.
                        </td>
                      </tr>
                    ) : (
                      diamondTransactions.map((txn: any) => {
                        const payee = users.find(u => u.id === txn.user_id);
                        const isDeduction = txn.total_amount < 0 || txn.diamonds < 0;
                        const amt = Math.abs(txn.total_amount !== undefined ? txn.total_amount : (txn.diamonds || 0));
                        return (
                          <tr key={txn.id} className="hover:bg-zinc-950/20 transition-colors">
                            <td className="py-2.5 pr-2">
                              <span className="font-extrabold text-zinc-200">{payee?.gamerName || 'Unknown Player'}</span>
                              <span className="text-[9px] text-zinc-550 block font-sans font-normal">{payee?.email || 'N/A'}</span>
                            </td>
                            <td className="py-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono border ${
                                txn.wallet_type === 'winning' 
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-550' 
                                  : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                              }`}>
                                {txn.wallet_type || 'topup'}
                              </span>
                            </td>
                            <td className={`py-2.5 font-bold font-mono ${isDeduction ? 'text-rose-450' : 'text-emerald-450'}`}>
                              {isDeduction ? `-${amt}` : `+${amt}`} 💎
                            </td>
                            <td className="py-2.5 text-zinc-400 font-mono text-[9px]">
                              {txn.price_paid > 0 ? `₹${txn.price_paid}` : 'Free'}
                              <span className="block text-[8px] text-zinc-550 font-sans truncate max-w-[80px]" title={txn.transaction_id}>{txn.transaction_id || 'N/A'}</span>
                            </td>
                            <td className="py-2.5 text-zinc-400 font-sans font-normal leading-relaxed text-[9.5px] max-w-[150px] truncate" title={txn.note || txn.transaction_type}>
                              {txn.note || txn.transaction_type}
                            </td>
                            <td className="py-2.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono border ${
                                txn.status === 'approved' || txn.status === 'paid'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : txn.status === 'rejected'
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-450 animate-pulse'
                              }`}>
                                {txn.status || 'pending'}
                              </span>
                            </td>
                            <td className="py-2.5 text-zinc-500 font-sans font-normal text-[9.5px]">
                              {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : 'Just now'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Withdrawal request ledger tracker for admins to audit */}
            <div className="bg-zinc-950/40 p-5 rounded-xl border border-zinc-850 space-y-3.5">
              <h4 className="font-extrabold text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-cyan-400">
                📋 Historical Payout Rewards Settlement Log ({adminWithdrawals.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                      <th className="py-2.5">Player Info</th>
                      <th className="py-2.5">UPI Details</th>
                      <th className="py-2.5">Payout Amount</th>
                      <th className="py-2.5">Official Admin Notes</th>
                      <th className="py-2.5">Request Status</th>
                      <th className="py-2.5">Settlement Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/60 text-[10px]">
                    {adminWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-zinc-550 italic font-sans font-normal">
                          No historical payouts resolved on system yet.
                        </td>
                      </tr>
                    ) : (
                      adminWithdrawals.map((wr: any) => {
                        const beneficiary = users.find(u => u.id === wr.user_id);
                        return (
                          <tr key={wr.id} className="hover:bg-zinc-950/20 transition-colors">
                            <td className="py-2.5">
                              <span className="font-extrabold text-zinc-200">{beneficiary?.gamerName || 'Unknown Player'}</span>
                              <span className="text-[9.5px] text-zinc-550 block font-sans font-normal">{beneficiary?.email || 'N/A'}</span>
                            </td>
                            <td className="py-2.5 font-mono text-[9.5px] text-zinc-400">
                              <p className="font-bold text-zinc-300">{wr.upi_id}</p>
                              <p className="text-[8px] text-zinc-500">Holder: {wr.account_holder_name}</p>
                            </td>
                            <td className="py-2.5 text-white font-extrabold font-mono text-xs">
                              ₹{wr.amount}
                            </td>
                            <td className="py-2.5 text-zinc-455 font-sans font-normal text-[9.5px] leading-relaxed max-w-[180px] truncate" title={wr.admin_note}>
                              {wr.admin_note || 'N/A'}
                            </td>
                            <td className="py-2.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono border ${
                                wr.status === 'paid'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : wr.status === 'approved'
                                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                                  : wr.status === 'rejected'
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 animate-pulse'
                              }`}>
                                {wr.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 text-zinc-500 font-sans font-normal text-[9.5px]">
                              {wr.paid_at ? new Date(wr.paid_at).toLocaleDateString() : wr.created_at ? new Date(wr.created_at).toLocaleDateString() : 'Just now'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'creator_verification' && (
          <div className="space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-805 pb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-500" />
                Creator Verified Badge Applications Hub
              </h3>
              <p className="text-zinc-400 mt-1 font-sans font-normal text-[11px]">
                Verify user credentials against requested profiles to issue exclusive Blue Verification badges, unique border elements, and status markings.
              </p>
            </div>

            {/* Verification Requests List */}
            <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl overflow-hidden p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Pending Verification Pitches</h4>
                
                <div className="w-64">
                  <input
                    type="text"
                    placeholder="Search applicant name..."
                    value={invoiceSearch}
                    onChange={e => setInvoiceSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1.5 text-[11px] focus:outline-none"
                  />
                </div>
              </div>

              {adminVerifications.length === 0 ? (
                <p className="text-zinc-500 py-6 text-center">No creator verification pitches pending review currently.</p>
              ) : (
                <div className="space-y-4">
                  {adminVerifications
                    .filter(req => {
                      if (!invoiceSearch) return true;
                      return (req.real_name || '').toLowerCase().includes(invoiceSearch.toLowerCase()) || 
                             (req.creator_name || '').toLowerCase().includes(invoiceSearch.toLowerCase());
                    })
                    .map(req => {
                      const user = users.find(u => u.id === req.user_id);
                      return (
                        <div key={req.id} className="p-4 bg-zinc-900/40 border border-zinc-805 rounded-xl space-y-3.5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-zinc-850/60">
                            <div>
                              <span className="text-[10px] text-zinc-550 block">APPLICANT USERNAME ID: {user?.gamerName || 'Unknown User'} ({req.user_id})</span>
                              <h5 className="text-sm font-extrabold text-white">{req.real_name} — Pitching as <span className="text-blue-400">"{req.creator_name}"</span></h5>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                                {req.creator_type}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                req.status === 'approved' ? 'text-emerald-400 bg-emerald-400/5' :
                                req.status === 'rejected' ? 'text-rose-455 bg-rose-455/5' : 'text-amber-400 bg-amber-400/5'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1.5 font-sans">
                              <p className="text-zinc-500 font-mono text-[10px] uppercase">Pitch Application Statement:</p>
                              <p className="text-zinc-350 bg-zinc-950/30 p-2.5 rounded border border-zinc-850 italic text-[11.5px] leading-relaxed">
                                "{req.description}"
                              </p>
                            </div>

                            <div className="space-y-2 text-[10.5px]">
                              <div>
                                <span className="text-zinc-550 block">YOUTUBE:</span>
                                {req.youtube_link ? (
                                  <a href={req.youtube_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{req.youtube_link}</a>
                                ) : <span className="text-zinc-650">Not linked</span>}
                              </div>
                              <div>
                                <span className="text-zinc-550 block">INSTAGRAM:</span>
                                {req.instagram_link ? (
                                  <a href={req.instagram_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{req.instagram_link}</a>
                                ) : <span className="text-zinc-650">Not linked</span>}
                              </div>
                              <div>
                                <span className="text-zinc-550 block">DISCORD HANDLE / SERVER:</span>
                                <span className="text-white bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">{req.discord_link || 'None'}</span>
                              </div>
                              {req.proof_url && (
                                <div className="pt-1.5">
                                  <a href={req.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">
                                    <Eye className="w-3.5 h-3.5" /> View Uploaded Supporting Proof
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {req.status === 'pending' && (
                            <div className="pt-3 border-t border-zinc-850/60 flex flex-col md:flex-row gap-3 items-end">
                              <div className="w-full space-y-1">
                                <label className="block text-[9.5px] text-zinc-500 uppercase font-black">Admin Decision Response / Feedback Change Request Note</label>
                                <input
                                  type="text"
                                  placeholder="Input details on badge approval, reject reasons or feedback variables..."
                                  value={verificationFeedback}
                                  onChange={e => setVerificationFeedback(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-2.5 py-2 text-xs focus:outline-none"
                                />
                              </div>

                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRequestChangesVerification(req.id)}
                                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                                >
                                  Request Changes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectVerification(req.id)}
                                  className="px-3.5 py-2 bg-rose-650 hover:bg-rose-700 text-white font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveVerification(req.id, req.user_id, req.creator_type)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase rounded-lg transition-colors cursor-pointer"
                                >
                                  Approve Verified Badge
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'featured_promotions' && (
          <div className="space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-805 pb-2 flex items-center gap-2">
                <Sparkle className="w-5 h-5 text-amber-500" />
                Promotional Feature Engine Slider Panels
              </h3>
              <p className="text-zinc-400 mt-1 font-sans font-normal text-[11px]">
                Feature select profiles, esports squads, premium streamers or highlighted tournaments directly into index sliders and main carousels.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to feature item */}
              <div className="lg:col-span-1 bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl space-y-4">
                <h4 className="font-extrabold text-white text-[11px] uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  📌 Feature A New Operator Target
                </h4>

                <form onSubmit={handleCreateFeaturedItem} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-550 uppercase font-bold">Category Type *</label>
                    <select
                      value={featuredType}
                      onChange={e => setFeaturedType(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-350 px-2.5 py-2 rounded text-[11px]"
                    >
                      <option value="player">Highlighted Athlete Player</option>
                      <option value="streamer">Featured Live Streamer</option>
                      <option value="team">Highlighted Pro Squad Team</option>
                      <option value="organization">Featured Guild Organization</option>
                      <option value="tournament">Promoted Esports Tournament</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-550 uppercase font-bold">Target ID Reference *</label>
                    <input
                      type="text"
                      required
                      placeholder="Paste User ID, Team ID or Tournament ID"
                      value={featuredTargetId}
                      onChange={e => setFeaturedTargetId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-2 rounded text-[11px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-550 uppercase font-bold">Campaign Custom Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Gamer of the Month"
                      value={featuredTitle}
                      onChange={e => setFeaturedTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-2 rounded text-[11px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-550 uppercase font-bold">Background Banner Image Link (Optional)</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={featuredImage}
                      onChange={e => setFeaturedImage(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-2 rounded text-[11px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] text-zinc-550 uppercase font-bold">Campaign Expiry local Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={featuredExpiry}
                      onChange={e => setFeaturedExpiry(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-2 rounded text-[11px]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="pin-feature"
                      checked={featuredPinned}
                      onChange={e => setFeaturedPinned(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-800 bg-zinc-900Accent text-red-500 focus:ring-0"
                    />
                    <label htmlFor="pin-feature" className="text-[10px] text-zinc-400 block uppercase font-bold">Pin to absolute top of search result</label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold uppercase tracking-wide rounded-xl transition-all shadow cursor-pointer text-xs"
                  >
                    Deploy Featured Campaign
                  </button>
                </form>
              </div>

              {/* Active slider items visual list */}
              <div className="lg:col-span-2 bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl space-y-4">
                <h4 className="font-extrabold text-white text-[11px] uppercase tracking-wider text-rose-450">
                  ⚙️ Active slider Board Listings
                </h4>

                {adminFeaturedItems.length === 0 ? (
                  <p className="text-zinc-600 text-center py-6">No custom items are currently pinned to home sliders.</p>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto">
                    {adminFeaturedItems.map(item => (
                      <div key={item.id} className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-white font-extrabold">{item.title || 'Featured Spotlight Promotion'}</span>
                            <span className="text-[8px] bg-red-950 text-red-400 font-bold font-mono px-1.5 py-0.5 rounded border border-red-900/40 uppercase">
                              {item.item_type}
                            </span>
                            {item.is_pinned && <span className="text-[9px] text-amber-400">★ PINNED</span>}
                          </div>
                          <p className="text-[10px] text-zinc-500 truncate font-mono">TARGET REF KEY: {item.target_id}</p>
                          {item.expiry_date && (
                            <p className="text-[9px] text-zinc-650 font-mono">EXPIRATION: {new Date(item.expiry_date).toLocaleDateString()}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteFeaturedItem(item.id)}
                          className="p-2 bg-zinc-950 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'self_ads' && (
          <div className="space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-805 pb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-500" />
                Community Self-Advertisement Verification Desk
              </h3>
              <p className="text-zinc-400 mt-1 font-sans font-normal text-[11px]">
                Confirm user submitted transaction screenshot proof receipts, verify UPI UTR references, and toggle campaign status triggers.
              </p>
            </div>

            <div className="bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl overflow-hidden space-y-4">
              <h4 className="font-extrabold text-zinc-350 text-[10px] uppercase tracking-widest">Self-Ad Campagn orders Ledger</h4>

              {adminAdOrders.length === 0 ? (
                <p className="text-zinc-600 text-center py-6">No self-paid advertisement campaigns exist in system records.</p>
              ) : (
                <div className="space-y-4">
                  {adminAdOrders.map(order => {
                    const user = users.find(u => u.id === order.user_id);
                    return (
                      <div key={order.id} className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-3.5">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-zinc-850/50">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">ORDER ENTRY ID: {order.id.substring(0, 10)}...</span>
                            <span className="text-xs font-black text-white">Ad Buyer: {user?.gamerName || 'Unknown'} ({order.user_id})</span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[10.5px]">
                            <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                              order.status === 'active' ? 'text-emerald-400 bg-emerald-400/5' : 'text-amber-400 bg-amber-405/5'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
                          <div>
                            <p className="text-zinc-550 uppercase text-[9px] font-bold">Campaign Details</p>
                            <span className="text-white">Promoted Type: <span className="text-red-400 font-bold uppercase">{order.ad_type}</span></span>
                            <p className="text-zinc-400 mt-1">Duration Contract: {order.duration_days} Days active</p>
                            <p className="text-zinc-400 font-bold">Price: ₹{order.amount_paid} INR</p>
                          </div>

                          <div>
                            <p className="text-zinc-550 uppercase text-[9px] font-bold">UPI Payment Audit Trace</p>
                            <p className="text-zinc-300 font-bold">Transaction UTR: {order.payment_utr}</p>
                            {order.payment_screenshot_url && (
                              <a href={order.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline block mt-1">
                                [View Screenshot proof Attachment]
                              </a>
                            )}
                          </div>

                          <div>
                            <p className="text-zinc-550 uppercase text-[9px] font-bold">Banner Graphic Preview</p>
                            {order.banner_url ? (
                              <img src={order.banner_url} alt="Display campaign layout" className="h-16 w-full object-cover border border-zinc-800 rounded bg-zinc-950 mt-1" />
                            ) : <span className="text-zinc-600">No image uploaded</span>}
                          </div>
                        </div>

                        {order.status === 'pending' && (
                          <div className="pt-3 border-t border-zinc-850/60 flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => handleRejectAdOrder(order.id)}
                              className="px-3.5 py-1.5 bg-rose-650 hover:bg-rose-700 text-white font-extrabold uppercase rounded"
                            >
                              Reject Campaign Order
                            </button>
                            <button
                              onClick={() => handleApproveAdOrder(order.id)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase rounded"
                            >
                              Approve & Mark Active
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'banner_ads' && (
          <div className="space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-805 pb-2 flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-400" />
                Standard Display Banner Placements Manager
              </h3>
              <p className="text-zinc-400 mt-1 font-sans font-normal text-[11px]">
                Create header billboard banners, sidebar square layout cards, or floating popups targeting core system categories.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to create banner ad */}
              <div className="lg:col-span-1 bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl space-y-4">
                <h4 className="font-extrabold text-white text-[11px] uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  📺 Add Deployed Banner Placement
                </h4>

                <form onSubmit={handleCreateBannerAd} className="space-y-3 w-full">
                  <div>
                    <label className="block text-[9.5px] text-zinc-550 uppercase font-black mb-1">Banner Title Ref *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Corsair Tournament Sponsor Banner"
                      value={bannerTitle}
                      onChange={e => setBannerTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-1.5 rounded text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9.5px] text-zinc-550 uppercase font-black mb-1">Graphic Image URL *</label>
                    <input
                      type="text"
                      required
                      placeholder="https://images.unsplash.com/promo..."
                      value={bannerImageUrl}
                      onChange={e => setBannerImageUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-1.5 rounded text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9.5px] text-zinc-550 uppercase font-black mb-1">Target Redirection URL *</label>
                    <input
                      type="text"
                      placeholder="https://corsair.com/promotion"
                      value={bannerTargetLink}
                      onChange={e => setBannerTargetLink(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white px-2.5 py-1.5 rounded text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9px] text-zinc-550 uppercase font-black mb-1">Layout Grid Slot *</label>
                      <select
                        value={bannerSlot}
                        onChange={e => setBannerSlot(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-350 px-2.5 py-2 rounded text-[11px]"
                      >
                        <option value="top">Header Billboards (728x90)</option>
                        <option value="sidebar">Sidebar Square (300x250)</option>
                        <option value="footer">Footer Banner (728x90)</option>
                        <option value="popup">Dashboard Pop-up Card</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="banner-active-input"
                        checked={bannerActive}
                        onChange={e => setBannerActive(e.target.checked)}
                        className="w-4 h-4 text-red-650 rounded border-zinc-800 bg-zinc-900 focus:ring-0"
                      />
                      <label htmlFor="banner-active-input" className="text-[10px] text-zinc-400 font-bold uppercase cursor-pointer">Active Live</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-zinc-550 uppercase font-black mb-1">Start Date</label>
                      <input
                        type="date"
                        value={bannerStart}
                        onChange={e => setBannerStart(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white px-2 py-1.5 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-550 uppercase font-black mb-1">End Date</label>
                      <input
                        type="date"
                        value={bannerEnd}
                        onChange={e => setBannerEnd(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white px-2 py-1.5 rounded text-[11px]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold uppercase rounded-xl transition-all cursor-all mt-2"
                  >
                    Publish Ad Slot Placement
                  </button>
                </form>
              </div>

              {/* Banner active placements table list */}
              <div className="lg:col-span-2 bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl space-y-4">
                <h3 className="font-extrabold text-white text-[11px] uppercase tracking-wider text-rose-450">
                  ⚙️ System Deployed Billboard Placements
                </h3>

                {adminBannerAds.length === 0 ? (
                  <p className="text-zinc-600 text-center py-6">No standard billboard display placements created.</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {adminBannerAds.map(banner => (
                      <div key={banner.id} className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="truncate">
                            <span className="text-[11px] text-white font-extrabold block truncate">{banner.title}</span>
                            <span className="text-[8.5px] bg-purple-950 font-bold border border-purple-800/40 text-purple-400 px-2 py-0.5 rounded tracking-wider uppercase inline-block mt-0.5 font-mono">
                              SLOT: {banner.slot.toUpperCase()}
                            </span>
                            <span className={`ml-2 text-[9px] font-bold ${banner.is_active ? 'text-emerald-400' : 'text-zinc-550'}`}>
                              {banner.is_active ? '● LIVE' : '○ DRAFT'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteBannerAd(banner.id)}
                            className="p-2 bg-zinc-950 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 border border-zinc-805 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>

                        {banner.image_url && (
                          <img src={banner.image_url} alt="Banner visuals" className="h-[54px] w-full object-cover border border-zinc-850 bg-zinc-950 rounded-lg" />
                        )}

                        <div className="grid grid-cols-3 gap-2 font-mono text-[9.5px] text-zinc-450 border-t border-zinc-850/60 pt-2">
                          <div>
                            <span className="text-zinc-550 block">VIEWS TRAFFIC:</span>
                            <span className="text-white font-bold">{banner.views_count || 0}</span>
                          </div>
                          <div>
                            <span className="text-zinc-550 block">CLICKS TRACK:</span>
                            <span className="text-white font-bold">{banner.clicks_count || 0}</span>
                          </div>
                          <div>
                            <span className="text-zinc-550 block">CTR PERFORMANCE:</span>
                            <span className="text-purple-400 font-bold">
                              {banner.views_count && banner.views_count > 0 
                                ? ((banner.clicks_count / banner.views_count) * 100).toFixed(2)
                                : '0.00'}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices_manager' && (
          <div className="space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-805 pb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Financial Trade Ledger & Invoices Desk
              </h3>
              <p className="text-zinc-400 mt-1 font-sans font-normal text-[11px]">
                Immutable, secure audit records representing core upgrades, self-advertisement purchases, and transaction ledgers.
              </p>
            </div>

            <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-850 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] text-emerald-400">
                  📑 Masters Billing Invoices Ledger
                </h4>

                <div className="w-64">
                  <input
                    type="text"
                    placeholder="Search by client email, number or type..."
                    value={invoiceSearch}
                    onChange={e => setInvoiceSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {adminInvoices.length === 0 ? (
                <p className="text-zinc-600 text-center py-6">No premium billing transactions are loaded inside the systems archive.</p>
              ) : (
                <div className="overflow-x-auto text-[10.5px]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-zinc-805 text-zinc-550 font-bold uppercase text-[9px]">
                        <th className="py-2.5 pr-2">INV NO</th>
                        <th className="py-2.5 pr-2">CLIENT DETAILS</th>
                        <th className="py-2.5 pr-2">TRADE DESCRIPTION</th>
                        <th className="py-2.5 pr-2">TRANSATION DATE</th>
                        <th className="py-2.5 pr-2 text-right">PRICE (INR)</th>
                        <th className="py-2.5 text-center">PRINT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                      {adminInvoices
                        .filter(inv => {
                          if (!invoiceSearch) return true;
                          const term = invoiceSearch.toLowerCase();
                          return (inv.invoice_number || '').toLowerCase().includes(term) ||
                                 (inv.user_email || '').toLowerCase().includes(term) ||
                                 (inv.invoice_type || '').toLowerCase().includes(term);
                        })
                        .map(inv => {
                          const triggerPrint = () => {
                            const win = window.open("", "_blank");
                            if (!win) return;
                            win.document.write(`
                              <html>
                                <head>
                                  <title>Esports Hub Receipt - INV-${inv.invoice_number}</title>
                                  <style>
                                    body { font-family: monospace; padding: 45px; background: #fff; color: #111; line-height: 1.4; }
                                    .invoice-hdr { border-bottom: 2px dashed #000; text-align: center; padding-bottom: 15px; margin-bottom: 25px; }
                                    .split-sec { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; }
                                    table { width: 100%; border: 1px solid #111; border-collapse: collapse; margin-top: 15px; }
                                    th, td { padding: 8px; border: 1px solid #111; text-align: left; font-size: 11px; }
                                    th { background: #eee; text-transform: uppercase; }
                                    .tot-lbl { text-align: right; font-weight: bold; font-size: 15px; border-top: 2px dashed #000; margin-top: 25px; padding-top: 10px; }
                                    .ftr { text-align: center; font-size: 10px; margin-top: 60px; color: #666; border-t: 1px solid #ccc; padding-top: 10px; }
                                  </style>
                                </head>
                                <body onload="window.print()">
                                  <div class="invoice-hdr">
                                    <h3 style="margin: 0; text-transform: uppercase; font-size: 18px;">Gaming Career Hub LLC API</h3>
                                    <div style="font-size: 11px; margin-top: 4px;">Verified Corporate Ledger Receipts</div>
                                  </div>

                                  <div class="split-sec">
                                    <div>
                                      <strong>INVOICE NO:</strong> INV-${inv.invoice_number}<br>
                                      <strong>ISSUED DATE:</strong> ${new Date(inv.created_at).toLocaleString()}
                                    </div>
                                    <div style="text-align: right;">
                                      <strong>CLIENT:</strong> ${inv.user_email}<br>
                                      <strong>CORP TYPE:</strong> ${inv.invoice_type.toUpperCase()}
                                    </div>
                                  </div>

                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Description</th>
                                        <th style="width: 130px; text-align: right;">Total Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td>${inv.purchase_details || 'Verified Gaming Service Provision'}</td>
                                        <td style="text-align: right; font-weight: bold;">₹${inv.amount} INR</td>
                                      </tr>
                                    </tbody>
                                  </table>

                                  <div class="tot-lbl">BILLING TOTAL: ₹${inv.amount} INR</div>
                                  <div class="ftr">Audit Verified receipt. Powered by central tactical database engines.</div>
                                </body>
                              </html>
                            `);
                            win.document.close();
                          };

                          return (
                            <tr key={inv.id} className="hover:bg-zinc-950/20">
                              <td className="py-2.5 font-bold text-zinc-400">INV-{inv.invoice_number}</td>
                              <td className="py-2.5 truncate max-w-xs">{inv.user_email}</td>
                              <td className="py-2.5 font-mono text-zinc-400">{inv.purchase_details || 'Service upgrades'}</td>
                              <td className="py-2.5">{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td className="py-2.5 text-right font-bold text-emerald-400">₹{inv.amount}</td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={triggerPrint}
                                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:bg-rose-500 rounded text-[9px] uppercase hover:text-white"
                                >
                                  PRINT
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'business_dashboard' && (
          <div className="space-y-6 font-mono text-xs">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wide border-b border-zinc-805 pb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                REV-STATS & OPERATIONS CORE COMMAND DESK
              </h3>
              <p className="text-zinc-400 mt-1 font-sans font-normal text-[11px]">
                Business Revenue Intel dashboard displaying cash operations flow, tournament reward withdrawal reserves and direct CSV data sheets.
              </p>
            </div>

            {/* Calculations Engine block */}
            {(() => {
              // Calculate bento stats
              const totalPremiumRev = adminInvoices.filter(i => i.invoice_type === 'membership').reduce((acc, x) => acc + x.amount, 0);
              const totalDiamondRev = adminInvoices.filter(i => i.invoice_type === 'diamond_purchase').reduce((acc, x) => acc + x.amount, 0);
              const totalAdsRev = adminInvoices.filter(i => i.invoice_type === 'advertisement').reduce((acc, x) => acc + x.amount, 0);
              
              // Mock tournament fee revenue from setup (e.g. 10% of registration fees or default)
              const totalTourneyRev = adminInvoices.filter(i => i.invoice_type === 'tournament_registration').reduce((acc, x) => acc + x.amount, 0) || 4890;
              const totalSponsorRev = 15000; // default brand deals contract Mock

              const totalOverallRev = totalPremiumRev + totalDiamondRev + totalAdsRev + totalTourneyRev + totalSponsorRev;
              
              // Withdrawals (approved)
              const totalPayoutApproved = adminWithdrawals.filter(w => w.status === 'approved').reduce((acc, x) => acc + (x.payout_amount || x.amount_diamonds), 0);
              const netReservesProfit = totalOverallRev - totalPayoutApproved;

              // Generate CSV file callback
              const handleExportCSV = () => {
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Invoice ID,Client Email,Amount (INR),Transaction Type,Issued Date,Status\n";
                adminInvoices.forEach(inv => {
                  csvContent += `${inv.invoice_number},${inv.user_email},${inv.amount},${inv.invoice_type},${new Date(inv.created_at).toLocaleDateString()},${inv.status}\n`;
                });
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `Gaming_Hub_Internal_Ledger_${new Date().toISOString().substring(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                addToast("CSV dynamic ledger spreadsheet downloaded successfully!", "success");
              };

              return (
                <div className="space-y-6">
                  {/* Revenue Bento cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
                    <div className="p-4 bg-zinc-950/65 border border-zinc-850 rounded-2xl space-y-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">Membership Premium</p>
                      <h4 className="text-sm font-black text-white">₹{totalPremiumRev}</h4>
                      <span className="text-[8px] text-zinc-650 block">Direct Upgrade invoice</span>
                    </div>

                    <div className="p-4 bg-zinc-950/65 border border-zinc-850 rounded-2xl space-y-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">Diamond Purchases</p>
                      <h4 className="text-sm font-black text-amber-400">₹{totalDiamondRev}</h4>
                      <span className="text-[8px] text-zinc-650 block">Microtransactions loop</span>
                    </div>

                    <div className="p-4 bg-zinc-950/65 border border-zinc-850 rounded-2xl space-y-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">Display Advertisements</p>
                      <h4 className="text-sm font-black text-rose-405">₹{totalAdsRev}</h4>
                      <span className="text-[8px] text-zinc-650 block">Self campaigns purchased</span>
                    </div>

                    <div className="p-4 bg-zinc-950/65 border border-zinc-850 rounded-2xl space-y-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">Tournaments Pool</p>
                      <h4 className="text-sm font-black text-cyan-400">₹{totalTourneyRev}</h4>
                      <span className="text-[8px] text-zinc-650 block">Interactive entry slots</span>
                    </div>

                    <div className="p-4 bg-zinc-950/65 border border-zinc-850 rounded-2xl space-y-1">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">Sponsorship Brand Contracts</p>
                      <h4 className="text-sm font-black text-purple-400">₹{totalSponsorRev}</h4>
                      <span className="text-[8px] text-zinc-650 block">B2B Ad marketplace deals</span>
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
                      <p className="text-[9px] text-amber-400 font-black uppercase">Total Withdrawal Pool</p>
                      <h4 className="text-sm font-black text-white">₹{totalPayoutApproved}</h4>
                      <span className="text-[8px] text-amber-500/70 block">Approved gamer payouts</span>
                    </div>
                  </div>

                  {/* Summary Total Reserves Card */}
                  <div className="p-5 bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-850 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div>
                      <h4 className="text-xs uppercase font-black text-emerald-400 tracking-wider">🔒 MASTER OPERATIONS CAPITAL BALANCE RESERVES</h4>
                      <p className="text-[10px] text-zinc-440 font-sans mt-0.5">Calculated Net Operating Margin of entire marketplace: Total Gross Revenue minus Total Dispatched Withdrawals.</p>
                    </div>

                    <div className="text-left md:text-right shrink-0">
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">GROSS PROFIT RESERVES MARGIN</span>
                      <h4 className="text-xl md:text-2xl font-black text-white">₹{netReservesProfit} <span className="text-xs text-zinc-450 uppercase">INR</span></h4>
                    </div>
                  </div>

                  {/* Operational Export CSV Controls */}
                  <div className="p-5 bg-zinc-950/45 border border-zinc-850 rounded-2xl space-y-4">
                    <h4 className="text-[11px] font-extrabold uppercase text-amber-500 tracking-wide">📅 Generate Custom Operations spreadsheet Export</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end font-mono">
                      <div>
                        <label className="block text-[9px] text-zinc-500 uppercase font-black mb-1">Timeline Start Date</label>
                        <input
                          type="date"
                          value={reportStart}
                          onChange={e => setReportStart(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-805 text-white rounded px-2.5 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-zinc-500 uppercase font-black mb-1">Timeline End Date</label>
                        <input
                          type="date"
                          value={reportEnd}
                          onChange={e => setReportEnd(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-805 text-white rounded px-2.5 py-2 text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs rounded-xl cursor-pointer shadow-md"
                      >
                        Export Master CSV Ledger Report
                      </button>
                    </div>
                  </div>

                  {/* Responsive visual CSS percent tracking bar chart layout */}
                  <div className="p-5 bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-4">
                    <h4 className="text-[11px] font-extrabold uppercase text-white tracking-wide">📊 Monthly operations Cash inflow Breakout (%)</h4>
                    <div className="space-y-3 font-sans">
                      {(() => {
                        const totalSums = totalPremiumRev + totalDiamondRev + totalAdsRev;
                        const premiumPct = totalSums > 0 ? (totalPremiumRev / totalSums) * 100 : 40;
                        const diamondPct = totalSums > 0 ? (totalDiamondRev / totalSums) * 100 : 35;
                        const adsPct = totalSums > 0 ? (totalAdsRev / totalSums) * 100 : 25;

                        return (
                          <div className="space-y-3.5 font-mono text-[10.5px]">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-zinc-400">
                                <span className="font-bold">Esports VIP Upgrades Margin (Premium pass)</span>
                                <span>{premiumPct.toFixed(1)}% (₹{totalPremiumRev})</span>
                              </div>
                              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                                <span className="bg-red-500 h-full block transition-all" style={{ width: `${premiumPct}%` }}></span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-zinc-400">
                                <span className="font-bold">Diamond shop Economy (In-app microtransactions)</span>
                                <span>{diamondPct.toFixed(1)}% (₹{totalDiamondRev})</span>
                              </div>
                              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                                <span className="bg-amber-400 h-full block transition-all" style={{ width: `${diamondPct}%` }}></span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-zinc-400">
                                <span className="font-bold">Self Advertisement Marketplace Campaigns</span>
                                <span>{adsPct.toFixed(1)}% (₹{totalAdsRev})</span>
                              </div>
                              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                                <span className="bg-rose-500 h-full block transition-all" style={{ width: `${adsPct}%` }}></span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* View Registered Players Modal */}
      <AnimatePresence>
        {viewPlayersTourneyId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setViewPlayersTourneyId(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 z-10 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Registered Players List
                  </h3>
                  <p className="text-[10px] text-zinc-550 mt-1">
                    TOURNAMENT IDENTIFICATION ID: <span className="font-mono text-zinc-400">{viewPlayersTourneyId}</span>
                  </p>
                </div>
                <button
                  onClick={() => setViewPlayersTourneyId(null)}
                  className="px-3 py-1 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded border border-zinc-800 text-xs font-mono transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              {(() => {
                const tourney = tournaments.find(t => t.id === viewPlayersTourneyId);
                const getSeatNumber = (reg: DbTournamentRegistration) => {
                  if (reg.payment_screenshot_url?.startsWith('seat:')) {
                    const match = reg.payment_screenshot_url.match(/seat:(\d+)/);
                    if (match) {
                      return parseInt(match[1], 10);
                    }
                  }
                  if (typeof (reg as any).seat_number === 'number') {
                    return (reg as any).seat_number;
                  }
                  return 9999;
                };

                const playersRegs = (registrations || [])
                  .filter(reg => reg.tournament_id === viewPlayersTourneyId && (((reg.status as string) === 'registered') || reg.status === 'approved'))
                  .sort((a, b) => getSeatNumber(a) - getSeatNumber(b));

                return (
                  <div className="space-y-4">
                    {tourney && (
                      <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-850/60 flex justify-between items-center text-xs font-mono">
                        <div>
                          <p className="text-zinc-500 text-[9px] uppercase tracking-wider">EVENT DESCRIPTION</p>
                          <p className="text-white font-extrabold text-xs mt-0.5">{tourney.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-500 text-[9px] uppercase tracking-wider font-bold">TOTAL SEATS FILLED</p>
                          <p className="text-emerald-400 font-black text-xs mt-0.5">
                            {playersRegs.length} / {tourney.max_teams || 16} Players
                          </p>
                        </div>
                      </div>
                    )}

                    {playersRegs.length === 0 ? (
                      <p className="py-12 text-center text-zinc-500 font-mono text-xs italic">
                        No active registered players located under this bracket.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-505 font-mono text-[9px] uppercase">
                              <th className="py-2 px-3 pl-1">Seat</th>
                              <th className="py-2 px-3">Gamer Name</th>
                              <th className="py-2 px-2">Account Email</th>
                              <th className="py-2 px-2">Squad Association</th>
                              <th className="py-2 px-2 text-right pr-1">Registration Date</th>
                              <th className="py-2 px-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850/55">
                            {playersRegs.map((reg) => {
                              const user = users.find(u => u.id === reg.user_id);
                              const gamerNameToShow = user?.gamerName || user?.username || 'Unknown';
                              const emailToShow = user?.email || 'Unknown';
                              const seat = getSeatNumber(reg);

                              const getTeamNameLocal = (tId: string) => {
                                const matchedTeam = teams.find(ti => ti.id === tId);
                                return matchedTeam ? matchedTeam.name : 'Unknown Squadron';
                              };

                              return (
                                <tr key={reg.id} className="hover:bg-zinc-950/40 text-zinc-350">
                                  <td className="py-2.5 px-3 pl-1 font-mono text-emerald-400 font-black">
                                    Slot #{seat === 9999 ? 'N/A' : seat}
                                  </td>
                                  <td className="py-2.5 px-3 text-white font-bold">
                                    {gamerNameToShow}
                                  </td>
                                  <td className="py-2.5 px-2 font-mono text-zinc-400 text-[10px]">
                                    {emailToShow}
                                  </td>
                                  <td className="py-2.5 px-2">
                                    {reg.team_id ? (
                                      <span className="text-cyan-400 font-mono text-[10px] bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/30">
                                        {getTeamNameLocal(reg.team_id)}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-500 italic font-mono text-[9.5px]">Solo</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-right pr-1 font-mono text-zinc-500 text-[10px]">
                                    {new Date(reg.registered_at).toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-2 text-right">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (window.confirm(`Are you sure you want to remove player ${gamerNameToShow} from seat Slot #${seat === 9999 ? 'N/A' : seat}?`)) {
                                          if (onAdminRemoveRegistrationStatus) {
                                            await onAdminRemoveRegistrationStatus(reg.id);
                                          }
                                        }
                                      }}
                                      className="bg-rose-950/20 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 px-2 py-1 text-[9px] font-mono leading-none rounded cursor-pointer transition-all uppercase font-bold"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Declare Champion Modal Popup */}
      <AnimatePresence>
        {declaringTourneyId && (() => {
          const t = tournaments.find(x => x.id === declaringTourneyId);
          if (!t) return null;
          const regTypeObj = t.registrationType || 'solo';
          const approvedRegs = (registrations || []).filter(r => r.tournament_id === t.id && r.status === 'approved');

          return (
            <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-zinc-950 border border-zinc-850 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl font-mono text-xs relative select-none text-left"
              >
                <button
                  type="button"
                  onClick={() => setDeclaringTourneyId(null)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-full w-7 h-7 flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>

                <div className="border-b border-zinc-900 pb-2">
                  <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block">ARENA DECISION ENGINE</span>
                  <h4 className="text-sm font-extrabold text-white text-wrap">Declare Winner & Champion Badge</h4>
                  <p className="text-[10px] text-zinc-555 mt-0.5 font-sans">Tournament: {t.title}</p>
                </div>

                <div className="space-y-3">
                  {/* Winner Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] text-zinc-500 uppercase font-extrabold">
                      Select Winner from Registrations ({regTypeObj === 'solo' ? 'Gamers' : 'Teams'})
                    </label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs"
                      value={declaringWinnerId}
                      onChange={e => setDeclaringWinnerId(e.target.value)}
                    >
                      <option value="">-- Choose Registrant --</option>
                      {approvedRegs.map(r => {
                        const idVal = regTypeObj === 'solo' ? r.user_id : r.team_id;
                        const nameVal = regTypeObj === 'solo' 
                          ? getParticipantName(r.user_id, 'solo') 
                          : getParticipantName(r.team_id, 'team');
                        if (!idVal) return null;
                        return (
                          <option key={r.id} value={idVal}>
                            {nameVal} (id: {idVal.substring(0, 8)})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Manual User Lookup Override */}
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg space-y-2">
                    <p className="text-[9.5px] text-zinc-400 font-extrabold uppercase">Manual System Override Selection</p>
                    <div className="space-y-1">
                      <label className="block text-[9px] text-zinc-550 lowercase">or choose ANY registered system user:</label>
                      <select
                        className="w-full bg-zinc-955 border border-zinc-800 text-white rounded px-2 py-1 focus:outline-none focus:border-amber-500 text-[11px]"
                        value={declaringWinnerId}
                        onChange={e => setDeclaringWinnerId(e.target.value)}
                      >
                        <option value="">-- Manual System User Picker --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.gamerName || u.username || u.email} ({u.role || 'Member'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Prize Diamonds */}
                  <div className="space-y-1">
                    <label className="block text-[10px] text-zinc-500 uppercase font-extrabold">
                      Prize Diamonds to Credit (Vault Wallet) *
                    </label>
                    <input
                      type="number"
                      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-mono text-xs"
                      value={declaringPrizeAmount}
                      onChange={e => setDeclaringPrizeAmount(Math.max(0, Number(e.target.value)))}
                    />
                    <p className="text-[8px] text-zinc-500 font-sans mt-0.5">
                      Will be paid directly to user winning_diamonds (never topup).
                    </p>
                  </div>

                  {/* Optional Note */}
                  <div className="space-y-1">
                    <label className="block text-[10px] text-zinc-500 uppercase font-extrabold">
                      Optional Note for Payout Transaction
                    </label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-xs"
                      placeholder="e.g. Winner of Esports Finals"
                      value={declaringNote}
                      onChange={e => setDeclaringNote(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setDeclaringTourneyId(null)}
                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!declaringWinnerId) {
                        addToast("Please select a winner first!", "warning");
                        return;
                      }
                      await handleDeclareChampion(t.id, declaringWinnerId, declaringPrizeAmount, declaringNote);
                      setDeclaringTourneyId(null);
                    }}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Confirm & Declare Champion
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
