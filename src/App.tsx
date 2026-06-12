import React, { useState, useEffect } from 'react';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings, DbTournamentRegistration, FeaturedItem } from './types';
import {
  INITIAL_USERS,
  INITIAL_TEAMS,
  INITIAL_TOURNAMENTS,
  INITIAL_SPONSORS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ADMIN_SETTINGS,
  loadData,
  saveData
} from './initialData';

// Component imports
import Toast, { ToastMessage } from './components/Toast';
import GamerProfiles from './components/GamerProfiles';
import TeamFinder from './components/TeamFinder';
import Tournaments from './components/Tournaments';
import Leaderboard from './components/Leaderboard';
import Achievements from './components/Achievements';
import SponsorZone from './components/SponsorZone';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import AdSenseSlot from './components/AdSenseSlot';
import FeaturedPromotion from './components/FeaturedPromotion';
import SEOManager from './components/SEOManager';
import DownloadApp from './components/DownloadApp';
import { supabaseService, setSupabaseServiceToastHandler, getFallbackUserProfile } from './lib/supabaseService';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';


import {
  Gamepad2,
  Trophy,
  Users,
  Award,
  Sparkles,
  LogIn,
  LogOut,
  User,
  Settings,
  Bell,
  Heart,
  ChevronRight,
  TrendingUp,
  MapPin,
  Compass,
  Laptop,
  CheckCircle2,
  Mail,
  Zap,
  Info,
  Menu,
  X,
  Plus,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- Persistent Storage State ---
  const [users, setUsers] = useState<UserProfile[]>(() => loadData('gh_users', INITIAL_USERS));
  const [teams, setTeams] = useState<Team[]>(() => loadData('gh_teams', INITIAL_TEAMS));
  const [tournaments, setTournaments] = useState<Tournament[]>(() => loadData('gh_tournaments', INITIAL_TOURNAMENTS));
  const [sponsors, setSponsors] = useState<SponsorApplication[]>(() => loadData('gh_sponsors', INITIAL_SPONSORS));
  const [notifications, setNotifications] = useState<Notification[]>(() => loadData('gh_notifications', INITIAL_NOTIFICATIONS));
  const [adminSettings, setAdminSettings] = useState<AdminSettings[]>(() => loadData('gh_admin_settings', [INITIAL_ADMIN_SETTINGS])) as any;
  const [registrations, setRegistrations] = useState<DbTournamentRegistration[]>(() => loadData('gh_tournament_registrations', []));
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);

  // Since we load adminSettings as array or single object safely
  const actualAdminSettings: AdminSettings = Array.isArray(adminSettings) ? adminSettings[0] || INITIAL_ADMIN_SETTINGS : adminSettings || INITIAL_ADMIN_SETTINGS;

  // Current session gamer
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (isSupabaseConfigured) {
      return null; // Ensure we do not load stale localStorage profiles when Supabase is active
    }
    const saved = localStorage.getItem('gh_current_user_id');
    return saved || null;
  });

  const currentUser = currentUserId
    ? (users.find(u => u.id === currentUserId) || getFallbackUserProfile(currentUserId))
    : null;

  // Session checks loading flag
  const [isSessionChecking, setIsSessionChecking] = useState<boolean>(true);

  // Toast Alerts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    // Avoid showing duplicate toaster notifications
    if (toasts.some(t => t.text === text)) {
      return;
    }
    const id = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    setToasts(prev => {
      if (prev.some(t => t.text === text)) {
        return prev;
      }
      return [...prev, { id, text, type }];
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Auth processing/state variables
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [lastSignupAttempt, setLastSignupAttempt] = useState<number>(0);

  // --- Router & Path Listening State ---
  const [activeSection, setActiveSection] = useState<string>('home');
  const [presetSponsorGamerName, setPresetSponsorGamerName] = useState<string>(''); // prefab prefill sponsor zone

  const [dashboardInitialTab, setDashboardInitialTab] = useState<string>('profile');
  const [dashboardInitialConversationUserId, setDashboardInitialConversationUserId] = useState<string | null>(null);

  const handleMessageGamer = (targetUserId: string) => {
    setDashboardInitialTab('messages');
    setDashboardInitialConversationUserId(targetUserId);
    setActiveSection('dashboard');
  };


  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Register Sw safely with deduplication
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          const hasRegistered = regs.some(r => r.active && r.active.scriptURL.includes('sw.js'));
          if (!hasRegistered) {
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            console.log('[PWA SW] Successful service worker registration scope: ', reg.scope);
          } else {
            console.log('[PWA SW] Service worker already alive. Skipped registration to prevent conflicts.');
          }
        } catch (err) {
          console.error('[PWA SW] registration failed: ', err);
        }
      };
      
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    const splashTime = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => clearTimeout(splashTime);
  }, []);

  // Register the centralized supabase service toast callback to allow displaying DB sync toasts
  useEffect(() => {
    setSupabaseServiceToastHandler(addToast);
  }, []);

  // Browser title & SEO Meta management & Supabase initial sync
  useEffect(() => {
    document.title = "Gaming Career Hub";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Gaming Career Hub - esports career profiles, teams, tournaments, leaderboards, sponsorships and premium gamer tools.");
    }

    async function syncSupabaseDatabase() {
      try {
        setIsSessionChecking(true);
        const [loadedUsers, loadedTeams, loadedTournaments, loadedSponsors, loadedNotifs, loadedSettings, loadedRegistrations, loadedFeatured] = await Promise.all([
          supabaseService.getUsers(),
          supabaseService.getTeams(),
          supabaseService.getTournaments(),
          supabaseService.getSponsors(),
          supabaseService.getNotifications(),
          supabaseService.getAdminSettings(),
          supabaseService.getTournamentRegistrations(),
          supabaseService.getFeaturedItems()
        ]);
        setUsers(loadedUsers);
        setTeams(loadedTeams);
        setTournaments(loadedTournaments);
        setSponsors(loadedSponsors);
        setNotifications(loadedNotifs);
        setAdminSettings([loadedSettings]);
        setRegistrations(loadedRegistrations);
        setFeaturedItems(loadedFeatured);

        if (isSupabaseConfigured && supabase) {
          // On app load call supabase.auth.getSession() to resolve starting session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error("getSession error on app load:", sessionError);
          }

          if (session && session.user) {
            const userId = session.user.id;
            const email = session.user.email || '';
            const username = email.split('@')[0] || 'gamer';

            await supabaseService.syncUserTables(userId, email, username);
            await supabaseService.revalidateAndSanitizeMembership(userId);
            const activeSessionUser = await supabaseService.getUserProfileById(userId);

            if (activeSessionUser) {
              setCurrentUserId(activeSessionUser.id);
              setUsers(prev => {
                if (!prev.some(u => u.id === activeSessionUser.id)) {
                  return [...prev, activeSessionUser];
                }
                return prev.map(u => u.id === activeSessionUser.id ? activeSessionUser : u);
              });
            }
          } else {
            setCurrentUserId(null);
          }
        }
      } catch (err) {
        console.error("Database sync warning:", err);
      } finally {
        setIsSessionChecking(false);
      }
    }

    syncSupabaseDatabase();

    // Add auth state listener: supabase.auth.onAuthStateChange()
    let subscription: any = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[Supabase Auth Listener] Event: ${event} for occupant identifier: ${session?.user?.id}`);
        
        if (session && session.user) {
          const userId = session.user.id;
          const email = session.user.email || '';
          const username = email.split('@')[0] || 'gamer';

          await supabaseService.syncUserTables(userId, email, username);
          await supabaseService.revalidateAndSanitizeMembership(userId);
          const activeSessionUser = await supabaseService.getUserProfileById(userId);

          if (activeSessionUser) {
            setCurrentUserId(activeSessionUser.id);
            setUsers(prev => {
              if (!prev.some(u => u.id === activeSessionUser.id)) {
                return [...prev, activeSessionUser];
              }
              return prev.map(u => u.id === activeSessionUser.id ? activeSessionUser : u);
            });

            // Redirect logged-in users to #dashboard
            if (window.location.hash !== '#dashboard' && window.location.hash !== '#admin-panel') {
              window.location.hash = '#dashboard';
              setActiveSection('dashboard');
            }
          }
        } else {
          setCurrentUserId(null);
        }
      });
      subscription = data?.subscription;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Sync state to LocalStorage (conditional on supabase not active)
  useEffect(() => { 
    if (!isSupabaseConfigured) {
      saveData('gh_users', users); 
    }
  }, [users]);

  useEffect(() => { 
    if (!isSupabaseConfigured) {
      saveData('gh_teams', teams); 
    }
  }, [teams]);

  useEffect(() => { 
    if (!isSupabaseConfigured) {
      saveData('gh_tournaments', tournaments); 
    }
  }, [tournaments]);

  useEffect(() => { 
    if (!isSupabaseConfigured) {
      saveData('gh_sponsors', sponsors); 
    }
  }, [sponsors]);

  useEffect(() => { 
    if (!isSupabaseConfigured) {
      saveData('gh_notifications', notifications); 
    }
  }, [notifications]);

  useEffect(() => { 
    if (!isSupabaseConfigured) {
      saveData('gh_admin_settings', actualAdminSettings); 
    }
  }, [actualAdminSettings]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (currentUserId) {
        localStorage.setItem('gh_current_user_id', currentUserId);
      } else {
        localStorage.removeItem('gh_current_user_id');
      }
    }
  }, [currentUserId]);

  // Premium membership expiration checker
  useEffect(() => {
    const now = new Date();
    let hasExpired = false;
    const checkedUsers = users.map(u => {
      if (u.membership !== 'Free' && u.membershipStatus === 'active' && u.membershipExpires) {
        const exp = new Date(u.membershipExpires);
        if (now > exp) {
          hasExpired = true;
          return {
            ...u,
            membership: 'Free' as const,
            membershipStatus: 'none' as const,
            membershipExpires: undefined,
            featuredUntil: undefined,
            isFeatured: false,
            activeSticker: undefined,
            activeFrame: undefined,
            activeBanner: undefined
          };
        }
      }
      return u;
    });
    if (hasExpired) {
      setUsers(checkedUsers);
      addToast("Subscription update: Expired credentials reverted to free status.", "warning");
    }
  }, []);

  // Hook Hash Change listener
  const usersRef = React.useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Capture Referral code on mount
  useEffect(() => {
    const captureReferralCode = () => {
      // 1. Check standard URL search parameters
      const urlParams = new URLSearchParams(window.location.search);
      let ref = urlParams.get('ref');
      
      // 2. Check hash route query parameters
      if (!ref) {
        const hash = window.location.hash;
        if (hash.includes('?')) {
          const hashParams = new URLSearchParams(hash.split('?')[1]);
          ref = hashParams.get('ref');
        } else if (hash.includes('ref=')) {
          const parts = hash.split('ref=');
          if (parts[1]) {
            ref = parts[1].split('&')[0];
          }
        }
      }
      
      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        console.log("[Referral Engine] Captured referral invitation code:", cleanRef);
        setReferredByCode(cleanRef);
        
        // Open register modal automatically to streamline user onboard experience
        setAuthType('register');
        setShowAuthModal(true);
      }
    };
    
    captureReferralCode();
    
    window.addEventListener('hashchange', captureReferralCode);
    return () => window.removeEventListener('hashchange', captureReferralCode);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin-panel') {
        setActiveSection('admin');
      } else if (hash.startsWith('#gamer/')) {
        // extract username and see if exists
        const uName = hash.split('#gamer/')[1];
        const exists = usersRef.current.find(u => u.username === uName);
        if (exists) {
          setActiveSection('directory');
          // Wait, GamerProfiles has an internal selectedGamer state, let's trigger it or display details.
          // For now, we direct the user to Gamer Directory where they see profiles properly.
        } else {
          setActiveSection('directory');
        }
      } else if (hash === '#home') {
        setActiveSection('home');
      } else if (hash === '#profiles') {
        setActiveSection('directory');
      } else if (hash === '#teams') {
        setActiveSection('teams');
      } else if (hash === '#tournaments') {
        setActiveSection('tournaments');
      } else if (hash === '#leaderboard') {
        setActiveSection('leaderboard');
      } else if (hash === '#achievements' || hash === '#badges') {
        setActiveSection('achievements');
      } else if (hash === '#sponsors') {
        setActiveSection('sponsors');
      } else if (hash === '#dashboard') {
        setActiveSection('dashboard');
      } else if (hash === '#download' || hash === '#download-app' || hash === '#app') {
        setActiveSection('download');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // run once initially
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Protected route validation once session resolution finishes
  useEffect(() => {
    if (!isSessionChecking && activeSection === 'dashboard' && !currentUserId) {
      addToast("Authentication Needed: Please sign in to verify operator dashboard configs.", "warning");
      setAuthType('login');
      setShowAuthModal(true);
      window.location.hash = '#home';
      setActiveSection('home');
    }
  }, [isSessionChecking, activeSection, currentUserId]);

  // --- Auth Dialog State ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState<'login' | 'register'>('login');

  // Login variables
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register variables
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regGamerTag, setRegGamerTag] = useState('');
  const [regCountry, setRegCountry] = useState('India');
  const [regState, setRegState] = useState('Delhi');
  const [regCity, setRegCity] = useState('New Delhi');
  const [regBio, setRegBio] = useState('');
  const [regScreenshot, setRegScreenshot] = useState('');
  const [referredByCode, setReferredByCode] = useState('');

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    if (!loginEmail || !loginPass) {
      addToast("Required parameters not provided!", "warning");
      return;
    }

    setIsLoggingIn(true);
    try {
      const { user, error } = await supabaseService.login(loginEmail, loginPass);
      if (error) {
        addToast(error.message, "error");
        return;
      }

      if (user) {
        if (user.isBanned) {
          addToast("Danger: This player account is currently BANNED for competitive cheating.", "error");
          return;
        }

        setUsers(prev => {
          const filtered = prev.filter(u => u.id !== user.id);
          return [...filtered, user];
        });

        setCurrentUserId(user.id);
        setShowAuthModal(false);
        setLoginEmail('');
        setLoginPass('');
        addToast(`Verification successful! Welcome back, ${user.gamerName}`, "success");
        
        if (user.username === 'Admin') {
          setActiveSection('admin');
          window.location.hash = '#admin-panel';
        } else {
          setActiveSection('dashboard');
          window.location.hash = '#dashboard';
        }
      }
    } catch (err: any) {
      console.error("Login warning:", err);
      addToast(err?.message || "Login failed.", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;

    // Cooldown check to prevent repeated rapid submissions
    const now = Date.now();
    if (now - lastSignupAttempt < 8000) {
      addToast("Dynamic registry cooldown active. Please wait 8 seconds before retrying.", "warning");
      return;
    }

    if (!regUser || !regEmail || !regGamerTag) {
      addToast("Mandatory identity info not filled!", "warning");
      return;
    }

    setLastSignupAttempt(now);
    setIsRegistering(true);

    try {
      const { user, error } = await supabaseService.signUp(regUser, regEmail, regPass || 'DefaultGamer@123');
      if (error) {
        const errMsg = error.message || '';
        if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("too many requests")) {
          addToast("Too many signup attempts. Please wait 30-60 minutes and try again.", "error");
        } else {
          addToast(errMsg, "error");
        }
        return;
      }

      if (user) {
        const updatedUser: UserProfile = {
          ...user,
          gamerName: regGamerTag,
          country: regCountry,
          state: regState,
          city: regCity,
          bio: regBio || user.bio,
          profilePhoto: regScreenshot || user.profilePhoto,
          referredBy: referredByCode ? referredByCode.trim().toUpperCase() : undefined
        };

        const finalUser = await supabaseService.updateProfile(user.id, updatedUser);

        // Capture referral track securely
        if (referredByCode) {
          const okRef = await supabaseService.registerReferral(user.id, referredByCode);
          if (okRef) {
            console.log("[Referral Engine] Referral linked successfully during register!");
          } else {
            console.warn("[Referral Engine] Referral code validation failed. Possibly invalid, duplicate or self-referral.");
          }
        }

        // Try logging the user in automatically back-to-back (vital if email verification is disabled)
        const loginRes = await supabaseService.login(regEmail, regPass || 'DefaultGamer@123');
        const loginUser = loginRes.user || finalUser;

        setUsers(prev => {
          const filtered = prev.filter(u => u.id !== loginUser.id);
          return [...filtered, loginUser];
        });
        setCurrentUserId(loginUser.id);
        setShowAuthModal(false);

        // Clear registration fields
        setRegUser('');
        setRegEmail('');
        setRegPass('');
        setRegGamerTag('');
        setRegBio('');
        setRegScreenshot('');
        setReferredByCode('');

        addToast(`Account created! Welcome standard pilot, ${loginUser.gamerName}!`, "success");
        setActiveSection('dashboard');
        window.location.hash = '#dashboard';
      }
    } catch (err: any) {
      console.error("Signup exception:", err);
      const errMsg = err?.message || "";
      if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("too many requests")) {
        addToast("Too many signup attempts. Please wait 30-60 minutes and try again.", "error");
      } else {
        addToast(errMsg || "Registration failed due to server error.", "error");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSignOut = async () => {
    await supabaseService.logout();
    setCurrentUserId(null);
    addToast("Logged out from game servers safely.", "info");
    setActiveSection('home');
    window.location.hash = '#home';
  };

  const handleAddComment = (targetUserId: string, commentText: string) => {
    if (!currentUser) return;
    const newCommentItem = {
      id: `comm-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      authorId: currentUser.id,
      authorGamerName: currentUser.gamerName,
      authorPhoto: currentUser.profilePhoto,
      authorMembership: currentUser.membership,
      text: commentText,
      createdAt: new Date().toISOString()
    };
    
    setUsers(prev => prev.map(u => {
      if (u.id === targetUserId) {
        return {
          ...u,
          comments: [...(u.comments || []), newCommentItem]
        };
      }
      return u;
    }));
    addToast("Commendation transmitted to gamer wall!", "success");
  };

  // --- Profile state updates ---
  const handleUpdateProfile = async (updatedFields: Partial<UserProfile>) => {
    if (!currentUserId) return;
    try {
      const nextUser = await supabaseService.updateProfile(currentUserId, updatedFields);
      setUsers(prev => prev.map(u => u.id === currentUserId ? nextUser : u));
    } catch (err: any) {
      console.error("Profile update rejected:", err);
      addToast(err.message || "Failed to update profile config.", "error");
    }
  };

  const handleUpdateAdminSettings = async (updated: AdminSettings) => {
    await supabaseService.updateAdminSettings(updated);
    setAdminSettings([updated]);
    addToast("Membership dynamic perks catalogs updated successfully!", "success");
  };

  const handleClaimAchievement = async (achId: string, badgeName: string) => {
    if (!currentUserId) return;
    
    // Calculate new achievements array
    const updatedAchs = currentUser 
      ? (currentUser.achievements.includes(achId) ? currentUser.achievements : [...currentUser.achievements, achId])
      : [achId];
    const updatedBadges = currentUser
      ? (currentUser.badges.includes(badgeName) ? currentUser.badges : [...currentUser.badges, badgeName])
      : [badgeName];

    await handleUpdateProfile({
      achievements: updatedAchs,
      badges: updatedBadges
    });

    // Add automatic custom unlock notification log
    const alertNotif = await supabaseService.addNotification({
      userId: currentUserId,
      title: "Medal badge Awarded!",
      message: `Sensational performance! You have unlocked and claimed the badge medal index: "${badgeName}". Check your portfolio card.`,
      type: 'success'
    });
    setNotifications(prev => [alertNotif, ...prev]);
  };

  const handleToggleSavePlayer = async (targetId: string) => {
    if (!currentUserId || !currentUser) return;
    const exists = currentUser.savedPlayers.includes(targetId);
    const nextSaved = exists 
      ? currentUser.savedPlayers.filter(id => id !== targetId)
      : [...currentUser.savedPlayers, targetId];

    await handleUpdateProfile({ savedPlayers: nextSaved });
    addToast(exists ? "Player removed from saved list." : "Player saved to your dynamic bookmarks!", "success");
  };

  // --- Team Finder State Updates ---
  const handleCreateTeam = async (teamData: any) => {
    if (!currentUserId) return;
    const team = await supabaseService.createTeam(teamData, currentUserId);
    setTeams(prev => [...prev, team]);
    addToast(`Squad Finder: "${team.name}" established successfully!`, "success");
  };

  const handleSendJoinRequest = (teamId: string, message: string) => {
    if (!currentUser) return;
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        if (t.pendingRequests.some(r => r.userId === currentUser.id)) return t;
        return {
          ...t,
          pendingRequests: [...t.pendingRequests, { userId: currentUser.id, gamerName: currentUser.gamerName, message }]
        };
      }
      return t;
    }));
    addToast("Recruiting join request dispatched to squad commander!", "success");
  };

  const handleAcceptJoinRequest = (teamId: string, applicantId: string) => {
    const teamObj = teams.find(t => t.id === teamId);
    const applicantUser = users.find(u => u.id === applicantId);
    if (!teamObj || !applicantUser) return;

    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const filteredReqs = t.pendingRequests.filter(r => r.userId !== applicantId);
        const memberExists = t.members.some(m => m.userId === applicantId);
        if (memberExists) return { ...t, pendingRequests: filteredReqs };

        return {
          ...t,
          pendingRequests: filteredReqs,
          members: [...t.members, { userId: applicantId, username: applicantUser.username, gamerName: applicantUser.gamerName, role: t.requiredRole }]
        };
      }
      return t;
    }));

    // Dispatch system notifications
    const systemNotif: Notification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      userId: applicantId,
      title: "Recruitment Approved!",
      message: `Outstanding! You have been accepted into the active roster of team: "${teamObj.name}". Assemble now on maps.`,
      type: 'team',
      date: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [systemNotif, ...prev]);
    addToast(`${applicantUser.gamerName} has been drafted into active roster!`, "success");
  };

  const handleRejectJoinRequest = (teamId: string, applicantId: string) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, pendingRequests: t.pendingRequests.filter(r => r.userId !== applicantId) } : t));
    addToast("Applicant screening parsed & rejected.", "info");
  };

  const handleLeaveTeam = (teamId: string) => {
    if (!currentUserId) return;
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          members: t.members.filter(m => m.userId !== currentUserId)
        };
      }
      return t;
    }));
    addToast("Squad contract dissolved.", "info");
  };

  // --- Tournament State Updates ---
  const parseEntryFeeDiamonds = (feeStr: string | undefined): number => {
    if (!feeStr) return 0;
    const normalized = feeStr.trim().toLowerCase();
    if (normalized === 'free' || normalized === '0' || normalized === 'free entry') return 0;
    const match = normalized.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const handleRegisterTournament = async (regData: {
    tournament_id: string;
    registration_type: 'solo' | 'team';
    team_id?: string | null;
    payment_status: 'pending' | 'paid' | 'unneeded' | 'rejected';
    transaction_id?: string | null;
    payment_screenshot_url?: string | null;
  }) => {
    if (!currentUser) {
      addToast("You must log in to register!", "warning");
      return;
    }

    const tourney = tournaments.find(t => t.id === regData.tournament_id);
    if (!tourney) {
      addToast("Tournament not found!", "error");
      return;
    }

    const entryFeeText = tourney.entry_fee || tourney.entryFee || 'Free';
    const feeDiamonds = parseEntryFeeDiamonds(entryFeeText);
    const isPaid = feeDiamonds > 0;

    // Fetch up-to-date registrations for this tournament
    let latestRegistrations = registrations;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('tournament_registrations').select('*').eq('tournament_id', regData.tournament_id);
        if (!error && data) {
          latestRegistrations = data.map((r: any) => ({
            id: r.id,
            tournament_id: r.tournament_id,
            user_id: r.user_id,
            team_id: r.team_id,
            registration_type: r.registration_type || 'solo',
            status: r.status || 'pending',
            payment_status: r.payment_status || 'unneeded',
            transaction_id: r.transaction_id,
            payment_screenshot_url: r.payment_screenshot_url,
            registered_at: r.registered_at
          }));
        }
      } catch (err) {
        console.error("Fresh fetch of registrations failed:", err);
      }
    }

    // 8. Duplicate Protection
    const alreadyRegistered = latestRegistrations.some(
      r => r.tournament_id === regData.tournament_id &&
           r.user_id === currentUser.id &&
           (r.status === 'registered' || r.status === 'approved')
    );
    if (alreadyRegistered) {
      addToast("You are already registered.", "warning");
      return;
    }

    // Capacity checking using live counter (approved or registered)
    const activeRegs = latestRegistrations.filter(r => r.tournament_id === regData.tournament_id && (r.status === 'registered' || r.status === 'approved'));
    const current_registered_players = activeRegs.length;
    const max_slots = tourney.max_teams || tourney.max_players || 16;

    if (current_registered_players >= max_slots) {
      addToast("Seats Full", "error");
      return;
    }

    // 4. Automatic Seat Allocation
    const occupiedSeats = activeRegs
      .map(r => {
        if (r.payment_screenshot_url?.startsWith('seat:')) {
          const match = r.payment_screenshot_url.match(/seat:(\d+)/);
          return match ? parseInt(match[1], 10) : null;
        }
        return (r as any).seat_number || null;
      })
      .filter((s): s is number => s !== null && !isNaN(s));

    let seatNumber = 1;
    while (occupiedSeats.includes(seatNumber)) {
      seatNumber++;
    }

    // Handle Diamond deduction if paid (strictly Top-up check as requested)
    if (isPaid) {
      const topup = currentUser.topup_diamonds !== undefined && currentUser.topup_diamonds !== null ? currentUser.topup_diamonds : 0;
      if (topup < feeDiamonds) {
        addToast("Not enough Diamonds.", "error");
        return;
      }

      const nextTopup = topup - feeDiamonds;
      const nextDiamonds = nextTopup + (currentUser.winning_diamonds || 0);

      try {
        await supabaseService.updateProfile(currentUser.id, {
          topup_diamonds: nextTopup,
          diamonds: nextDiamonds
        });

        // Record diamond transaction for the entry fee
        await supabaseService.createDiamondTransaction({
          user_id: currentUser.id,
          wallet_type: 'topup',
          transaction_type: 'tournament_entry',
          diamonds: feeDiamonds,
          bonus: 0,
          total_amount: -feeDiamonds,
          price_paid: 0,
          status: 'approved',
          transaction_id: `tourney-fee-${Date.now()}`,
          payment_screenshot_url: null,
          note: `Tournament Entry Fee for: ${tourney.title}`
        });

        setUsers(prev => prev.map(u => u.id === currentUser.id ? {
          ...u,
          topup_diamonds: nextTopup,
          diamonds: nextDiamonds
        } : u));
      } catch (err: any) {
        console.error("Failed to deduct diamonds:", err);
        addToast("Not enough Diamonds.", "error");
        return;
      }
    }

    const finalStatus = 'registered';
    const finalPaymentStatus = isPaid ? 'paid' : 'unneeded';
    const seatString = `seat:${seatNumber}`;

    try {
      const created = await supabaseService.createTournamentRegistration({
        tournament_id: regData.tournament_id,
        user_id: currentUser.id,
        team_id: regData.team_id || null,
        registration_type: regData.registration_type,
        status: finalStatus,
        payment_status: finalPaymentStatus,
        transaction_id: `seat-${seatNumber}-${Date.now()}`,
        payment_screenshot_url: seatString,
        seat_number: seatNumber,
        entry_fee_paid: isPaid ? feeDiamonds : 0
      });

      // Try updating tournament's current_registered_players count in Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const new_count = current_registered_players + 1;
          await supabase.from('tournaments').update({
            current_registered_players: new_count
          }).eq('id', tourney.id);
        } catch (dbErr) {
          // Gracefully omit if table does not have column
        }
      }

      setRegistrations(prev => [...prev, created]);
      addToast("Successfully Registered.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to process registration. Please try again.", "error");
    }
  };

  const handleCancelTournamentRegistration = async (tournamentId: string) => {
    if (!currentUser) return;

    const tourney = tournaments.find(t => t.id === tournamentId);
    if (!tourney) {
      addToast("Tournament not found!", "error");
      return;
    }

    // Find the registration for the current user
    const reg = registrations.find(r => r.tournament_id === tournamentId && r.user_id === currentUser.id && (r.status === 'registered' || r.status === 'approved'));
    if (!reg) {
      addToast("You are not registered for this tournament!", "warning");
      return;
    }

    const confirmCancel = window.confirm(
      "Important:\nIf you leave/cancel your tournament registration before the room starts, only 25% of the registration diamonds will be refunded.\nTo join again, you must pay the full registration fee once more."
    );
    if (!confirmCancel) return;

    const entryFeeText = tourney.entry_fee || tourney.entryFee || 'Free';
    const feeDiamonds = parseEntryFeeDiamonds(entryFeeText);
    const refundAmount = Math.floor(feeDiamonds * 0.25);

    try {
      const nowStr = new Date().toISOString();
      const updates = {
        status: 'exited' as any,
        cancelled_at: nowStr,
        refund_amount: refundAmount
      };

      // 1. Update registration in Supabase
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('tournament_registrations').update(updates).eq('id', reg.id);
        if (error) throw error;

        // Try updating tournament count
        try {
          const currentCount = registrations.filter(r => r.tournament_id === tournamentId && (r.status === 'registered' || r.status === 'approved')).length;
          const nextCount = Math.max(0, currentCount - 1);
          await supabase.from('tournaments').update({
            current_registered_players: nextCount
          }).eq('id', tournamentId);
        } catch (dbErr) {
          // Gracefully omit
        }
      }

      // Sync local storage
      const localRegs = loadData<DbTournamentRegistration[]>('gh_tournament_registrations', []);
      const updatedRegs = localRegs.map(r => {
        if (r.id === reg.id) {
          return {
            ...r,
            status: 'exited' as any,
            cancelled_at: nowStr,
            refund_amount: refundAmount
          };
        }
        return r;
      });
      saveData('gh_tournament_registrations', updatedRegs);

      // 2. Refund 25% to Top-up Diamonds if fee paid
      if (refundAmount > 0) {
        const currentTopup = currentUser.topup_diamonds !== undefined && currentUser.topup_diamonds !== null ? currentUser.topup_diamonds : 0;
        const nextTopup = currentTopup + refundAmount;
        const nextDiamonds = nextTopup + (currentUser.winning_diamonds || 0);

        await supabaseService.updateProfile(currentUser.id, {
          topup_diamonds: nextTopup,
          diamonds: nextDiamonds
        });

        // Record a transaction for the refund
        await supabaseService.createDiamondTransaction({
          user_id: currentUser.id,
          wallet_type: 'topup',
          transaction_type: 'tournament_refund',
          diamonds: refundAmount,
          bonus: 0,
          total_amount: refundAmount,
          price_paid: 0,
          status: 'approved',
          transaction_id: `tourney-refund-${Date.now()}`,
          payment_screenshot_url: null,
          note: `Refund 25% for Cancelled Registration: ${tourney.title}`
        });

        // Update local state for user
        setUsers(prev => prev.map(u => u.id === currentUser.id ? {
          ...u,
          topup_diamonds: nextTopup,
          diamonds: nextDiamonds
        } : u));

        addToast(`Registration cancelled. Refunded 💎 ${refundAmount} (25%) to Top-up Wallet.`, "success");
      } else {
        addToast("Registration cancelled successfully. No refund needed for Free tournament.", "success");
      }

      // Update local state for registrations
      setRegistrations(prev => prev.map(r => r.id === reg.id ? {
        ...r,
        status: 'exited' as any,
        cancelled_at: nowStr,
        refund_amount: refundAmount
      } : r));

    } catch (err) {
      console.error("Cancellation error:", err);
      addToast("Failed to cancel registration. Please try again.", "error");
    }
  };

  const handleAdminRemoveRegistration = async (regId: string) => {
    const reg = registrations.find(r => r.id === regId);
    if (!reg) {
      addToast("Registration record not found.", "warning");
      return;
    }

    try {
      // 1. Delete from Supabase
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('tournament_registrations').delete().eq('id', regId);
        if (error) throw error;

        // Update tournament counts
        try {
          const currentCount = registrations.filter(r => r.tournament_id === reg.tournament_id && (r.status === 'registered' || r.status === 'approved')).length;
          const nextCount = Math.max(0, currentCount - 1);
          await supabase.from('tournaments').update({
            current_registered_players: nextCount
          }).eq('id', reg.tournament_id);
        } catch (dbErr) {
          console.error("Count edit error:", dbErr);
        }
      }

      // Sync local storage fallback
      const localRegs = loadData<DbTournamentRegistration[]>('gh_tournament_registrations', []);
      const filteredRegs = localRegs.filter(r => r.id !== regId);
      saveData('gh_tournament_registrations', filteredRegs);

      // Update app registrations state
      setRegistrations(prev => prev.filter(r => r.id !== regId));
      addToast("Player removed successfully. Seat slot has been freed.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to remove player.", "error");
    }
  };

  const handleRegisterSolo = async (tourneyId: string, contactEmail: string) => {
    if (!currentUser) return;
    const registrant = {
      id: currentUser.id,
      name: currentUser.gamerName,
      logo: currentUser.profilePhoto,
      type: 'solo',
      status: 'pending',
      contactEmail
    };

    const nextTourneys = await supabaseService.registerForTournament(tourneyId, registrant);
    setTournaments(nextTourneys);
    addToast("Solo verification form logged. Admin desk will review shortly.", "success");
  };

  const handleRegisterTeam = async (tourneyId: string, teamId: string, contactEmail: string) => {
    const squadObj = teams.find(t => t.id === teamId);
    if (!squadObj) return;

    const registrant = {
      id: teamId,
      name: squadObj.name,
      logo: squadObj.logo,
      type: 'team',
      status: 'pending',
      contactEmail
    };

    const nextTourneys = await supabaseService.registerForTournament(tourneyId, registrant);
    setTournaments(nextTourneys);
    addToast(`Squad placement verified! Enlisted "${squadObj.name}" into pending review.`, "success");
  };

  // --- Sponsor State Updates ---
  const handleSponsorApplication = async (
    brandName: string,
    offerDetails: string,
    monthlyReach: string,
    pitch: string,
    contactEmail: string
  ) => {
    if (!currentUser) return;
    const appData = {
      userId: currentUser.id,
      gamerName: currentUser.gamerName,
      favoriteGame: currentUser.favoriteGames[0] || 'Valorant',
      brandName,
      pitch,
      monthlyReach,
      mediaKitStats: `${currentUser.favoriteGames.join(', ')}, ${currentUser.kdRatio} KD, ${currentUser.skillRating} MMR`,
      contactEmail
    };

    const newApp = await supabaseService.submitSponsorPitch(appData);
    setSponsors(prev => [newApp, ...prev]);

    // Dispatch alert notification to subscriber
    const alertNotif = await supabaseService.addNotification({
      userId: currentUser.id,
      title: "Sponsor Pitch Dispatched",
      message: `Your high-impact career proposal has been filed with ${brandName}. Track review indicators in the dashboard.`,
      type: 'sponsor'
    });
    setNotifications(prev => [alertNotif, ...prev]);
  };

  const handleMarkNotificationRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  // Upgrades desk payment screen screenshot confirmation
  const handleConfirmPayment = async (
    membership: 'Silver' | 'Gold' | 'Platinum',
    txId: string,
    screenshotUrl: string,
    amount: number,
    couponApplied?: string
  ) => {
    if (!currentUserId) return;
    try {
      // 1. Insert a row into public.payments table
      await supabaseService.submitPayment({
        userId: currentUserId,
        plan: membership,
        amount,
        transactionId: txId,
        screenshotUrl,
        couponApplied
      });

      // 2. Set current user states to pending
      const nextUser = await supabaseService.updateProfile(currentUserId, {
        membership,
        membershipStatus: 'pending',
        membershipTxId: txId,
        membershipScreenshot: screenshotUrl
      });

      setUsers(prev => prev.map(u => {
        if (u.id === currentUserId) {
          return nextUser;
        }
        return u;
      }));

      // 3. Show success toast notification
      addToast("Payment submitted. Waiting for admin approval.", "success");
    } catch (err) {
      console.error("Error submitting premium membership payment proof:", err);
      addToast("Failed to lock payment proof. Please try again.", "error");
    }
  };

  // --- Administrative master controls callbacks ---
  const handleBanUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: true } : u));
    addToast("Player registry tagged BANNED.", "warning");
  };

  const handleUnbanUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: false } : u));
    addToast("Player system bans dissolved.", "success");
  };

  const handleToggleFeaturedUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isFeatured: !u.isFeatured } : u));
    addToast("Player feature flag inverted.", "success");
  };

  const handleToggleFeaturedTeam = (teamId: string) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, isFeatured: !t.isFeatured } : t));
    addToast("Team feature list placement mutated.", "success");
  };

  const handleDeleteProfile = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    addToast("Profile destroyed from active databases.", "info");
  };

  const handleAdminUpdateUserProfile = async (userId: string, updatedFields: Partial<UserProfile>) => {
    try {
      await supabaseService.updateProfile(userId, updatedFields);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatedFields } : u));
      addToast("Player registry edited successfully.", "success");
    } catch (err: any) {
      console.error("Failed to update user profile:", err);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatedFields } : u));
      addToast("Player registry edited locally.", "info");
    }
  };

  const handleAdminDeleteTeam = (teamId: string) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    addToast("Esports squad disbanded successfully.", "info");
  };

  const handleAdminDeleteTournament = async (tourneyId: string) => {
    try {
      await supabaseService.deleteTournament(tourneyId);
      setTournaments(prev => prev.filter(t => t.id !== tourneyId));
      addToast("Tournament bracket deleted.", "info");
    } catch (err: any) {
      console.error("Failed to delete tournament:", err);
      addToast("Failed to delete tournament.", "error");
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      // 1. Approve inside Supabase & fallback LocalStorage
      const result = await supabaseService.approvePayment(paymentId);

      let targetUserId: string | null = null;
      let assignedTier: 'Silver' | 'Gold' | 'Platinum' = 'Gold';

      if (result) {
        targetUserId = result.userId;
        assignedTier = result.plan;
      } else {
        // Fallback search LocalStorage
        const localPayments = JSON.parse(localStorage.getItem('gh_payments') || '[]');
        const paymentItem = localPayments.find((p: any) => p.id === paymentId);
        if (paymentItem) {
          targetUserId = paymentItem.userId;
          assignedTier = paymentItem.plan;
        }
      }

      if (targetUserId) {
        // Send Notification
        const sysNotif = await supabaseService.addNotification({
          userId: targetUserId,
          title: `${assignedTier} Membership Approved!`,
          message: `Excellent! Transaction cleared. Dynamic user cosmetic catalogs, custom indicators, and profile-boosting cards are unlocked in your active pilot file.`,
          type: 'success'
        });
        setNotifications(prev => [sysNotif, ...prev]);
      }

      // 5. Premium unlock: After approval, refetch payments, memberships, users, current user profile
      const [loadedUsers, loadedRegistrations] = await Promise.all([
        supabaseService.getUsers(),
        supabaseService.getTournamentRegistrations()
      ]);
      setUsers(loadedUsers);
      setRegistrations(loadedRegistrations);

      // If the current logged-in user is the target, or if we have an active session, let's refresh current user profile
      if (currentUserId) {
        const activeProfile = await supabaseService.getUserProfileById(currentUserId);
        if (activeProfile) {
          setUsers(prev => prev.map(u => u.id === activeProfile.id ? activeProfile : u));
        }
      }

      addToast("Membership activated successfully", "success");
    } catch (err: any) {
      console.error("Failed approving payment at admin command level:", err);
      addToast(err.message || "Failed to approve payment record.", "error");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      // 1. Reject inside Supabase & fallback LocalStorage
      const result = await supabaseService.rejectPayment(paymentId);

      let targetUserId: string | null = null;

      if (result) {
        targetUserId = result.userId;
      } else {
        // Fallback search LocalStorage
        const localPayments = JSON.parse(localStorage.getItem('gh_payments') || '[]');
        const paymentItem = localPayments.find((p: any) => p.id === paymentId);
        if (paymentItem) {
          targetUserId = paymentItem.userId;
        }
      }

      if (targetUserId) {
        // Send Notification
        const sysNotif = await supabaseService.addNotification({
          userId: targetUserId,
          title: "Invoice Rejected",
          message: "Validation alert: Admin was unable to reconcile transaction screenshot references. Membership pass stays locked.",
          type: 'alert'
        });
        setNotifications(prev => [sysNotif, ...prev]);
      }

      // Sync users from DB
      const loadedUsers = await supabaseService.getUsers();
      setUsers(loadedUsers);

      addToast("Payment validation declined. Retracting upgrade.", "info");
    } catch (err) {
      console.error("Failed rejecting payment proof at admin command level:", err);
      addToast("Failed to decline payment record.", "error");
    }
  };

  const handleUpdateRegistrationStatus = async (regId: string, status: 'approved' | 'rejected', paymentStatus?: 'pending' | 'paid' | 'unneeded' | 'rejected') => {
    try {
      await supabaseService.updateTournamentRegistrationStatus(regId, status, paymentStatus);
      setRegistrations(prev => prev.map(r => {
        if (r.id === regId) {
          return {
            ...r,
            status,
            payment_status: paymentStatus || r.payment_status
          };
        }
        return r;
      }));
      addToast(`Registration status updated successfully to ${status}!`, "success");
    } catch (err) {
      console.error("Failed to update registration status:", err);
      addToast("Failed to update registration status.", "error");
    }
  };

  const handleApproveTournamentRegistration = (tourneyId: string, registrantId: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tourneyId) {
        return {
          ...t,
          registrants: t.registrants.map(r => r.id === registrantId ? { ...r, status: 'approved' } : r)
        };
      }
      return t;
    }));

    addToast("Roster signups approved for matches lobby!", "success");
  };

  const handleRejectTournamentRegistration = (tourneyId: string, registrantId: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tourneyId) {
        return {
          ...t,
          registrants: t.registrants.map(r => r.id === registrantId ? { ...r, status: 'rejected' } : r)
        };
      }
      return t;
    }));

    addToast("Enlistment rejected.", "info");
  };

  const handleApproveSponsorApplication = (appId: string) => {
    setSponsors(prev => prev.map(s => s.id === appId ? { ...s, status: 'approved' } : s));
    addToast("Brand contract connected!", "success");
  };

  const handleRejectSponsorApplication = (appId: string) => {
    setSponsors(prev => prev.map(s => s.id === appId ? { ...s, status: 'rejected' } : s));
    addToast("Brand application declined.", "info");
  };

  const handleCreateTournament = async (tourneyData: any) => {
    try {
      const newT = await supabaseService.createTournament(tourneyData);
      setTournaments(prev => [...prev, newT]);
      addToast("Tournament created successfully!", "success");
    } catch (err: any) {
      console.error("Failed to create tournament:", err);
      addToast("Failed to create tournament.", "error");
    }
  };

  const handleUpdateTournament = async (tourneyId: string, updates: Partial<Tournament>) => {
    try {
      await supabaseService.updateTournament(tourneyId, updates);
      setTournaments(prev => prev.map(t => t.id === tourneyId ? { ...t, ...updates } : t));
      addToast("Tournament updated successfully!", "success");
    } catch (err: any) {
      console.error("Failed to update tournament:", err);
      addToast("Failed to update tournament.", "error");
    }
  };

  const handleUpdateQrCode = async (newUrl: string, upiId: string) => {
    try {
      const updated = {
        ...actualAdminSettings,
        qrCodeUrl: newUrl,
        upiId: upiId
      };
      await supabaseService.updateAdminSettings(updated);
      setAdminSettings([updated]);
      addToast("Core dynamic UPI QR gateway settings saved to Database!", "success");
    } catch (err) {
      console.error("Failed to update QR Code/UPI ID settings:", err);
      addToast("Failed to save configuration settings to Database.", "error");
    }
  };

  const handleAddCoupon = async (code: string, discountPercent: number) => {
    try {
      const updated = {
        ...actualAdminSettings,
        activeCoupons: [...actualAdminSettings.activeCoupons, { code, discountPercent }]
      };
      await supabaseService.updateAdminSettings(updated);
      setAdminSettings([updated]);
    } catch (err) {
      console.error("Failed to add coupon:", err);
    }
  };

  const handleRemoveCoupon = async (code: string) => {
    try {
      const updated = {
        ...actualAdminSettings,
        activeCoupons: actualAdminSettings.activeCoupons.filter(c => c.code !== code)
      };
      await supabaseService.updateAdminSettings(updated);
      setAdminSettings([updated]);
    } catch (err) {
      console.error("Failed to remove coupon:", err);
    }
  };

  // --- Subcomponents list loaders handlers passing ---
  const activeUserTeams = teams.filter(t => t.creatorId === currentUserId || t.members.some(m => m.userId === currentUserId));
  const userTournamentsRegistered = tournaments.filter(t => t.registrants.some(r => r.id === currentUserId || activeUserTeams.some(ut => ut.id === r.id)));
  const userSponsorsPitches = sponsors.filter(s => s.userId === currentUserId);
  const userNotificationsInbox = notifications.filter(n => n.userId === currentUserId);
  const userSavedPlayersObjects = users.filter(u => currentUser?.savedPlayers.includes(u.id));

  // Switch routing helper index page views
  const handlePresetSelectGamerProfile = (uName: string) => {
    // navigate to directory hash
    window.location.hash = `#profiles`;
    // GamerProfiles.tsx handles directories click layout dynamically.
  };

  if (isSessionChecking) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#0b0c10] text-[#f3f4f6] cyber-grid">
        <div className="text-center space-y-4">
          <Gamepad2 className="w-12 h-12 text-rose-500 animate-spin mx-auto" />
          <h2 className="text-xl font-bold font-display tracking-widest uppercase">
            CALIBRATING <span className="text-rose-500">CAREER HUB SYSTEM</span>...
          </h2>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-wide">Syncing secure decentralized operator protocols</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10] text-[#f3f4f6] cyber-grid selection:bg-pink-500 selection:text-white pb-20 md:pb-0">
      {/* Premium Animated Launcher Splash Screen (PART 3) */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#07080a] text-center"
          >
            {/* Ambient backdrop glowing */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1),transparent_70%)] animate-pulse" />
            
            <div className="relative space-y-6 max-w-sm px-6">
              {/* Spinning gamepad shield */}
              <motion.div
                initial={{ scale: 0.8, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-600 p-0.5 flex items-center justify-center shadow-2xl shadow-rose-600/20"
              >
                <div className="w-full h-full rounded-[22px] bg-zinc-950 flex items-center justify-center">
                  <Gamepad2 className="w-12 h-12 text-rose-500 animate-bounce" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-2xl font-black tracking-widest text-white uppercase font-sans"
                >
                  GAMING <span className="text-rose-500">CAREER HUB</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 0.5 }}
                  className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest"
                >
                  CALIBRATING NATIVE ASSETS MATRIX
                </motion.p>
              </div>

              {/* Progress bar animation */}
              <div className="relative w-48 h-1 bg-zinc-900 rounded-full mx-auto overflow-hidden border border-zinc-850">
                <motion.div
                  initial={{ left: '-100%' }}
                  animate={{ left: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="absolute top-0 bottom-0 w-2/3 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                />
              </div>

              <span className="block text-[9px] text-zinc-650 font-mono">
                SECURE HANDSHAKE: LIVE • COMPILING CORE BUILD
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic SEO, OG metadata, and analytics engine manager */}
      <SEOManager
        activeSection={activeSection}
        users={users}
        teams={teams}
        tournaments={tournaments}
        sponsors={sponsors}
      />

      {/* Toast notifier container */}
      <Toast toasts={toasts} setToasts={setToasts} />

      {/* Futuristic Scanline */}
      <div className="relative overflow-hidden scanline min-h-screen flex flex-col justify-between">
        
        {/* Main Header navigation */}
        <header className="sticky top-0 z-40 bg-zinc-950/90 border-b border-zinc-900 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { window.location.hash = '#home'; setActiveSection('home'); }}>
            <Gamepad2 className="w-8 h-8 text-rose-500 animate-pulse" />
            <span className="font-extrabold text-lg md:text-xl font-display tracking-widest text-white">
              GAMING <span className="text-rose-500">CAREER HUB</span>
            </span>
          </div>

          {/* Desktop Links - Hidden in Admin Router public view */}
          <nav className="hidden lg:flex items-center gap-6 font-mono text-xs font-bold tracking-wide">
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    setDashboardInitialTab('profile');
                    setActiveSection('dashboard');
                    window.location.hash = '#dashboard';
                  }}
                  className={`hover:text-rose-400 font-mono text-xs font-bold uppercase transition-colors cursor-pointer border-none bg-transparent outline-none ${
                    activeSection === 'dashboard' && dashboardInitialTab === 'profile' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'
                  }`}
                >
                  My Dashboard
                </button>
                <button
                  onClick={() => {
                    setDashboardInitialTab('profile');
                    setActiveSection('dashboard');
                    window.location.hash = '#dashboard';
                  }}
                  className={`hover:text-rose-400 font-mono text-xs font-bold uppercase transition-colors cursor-pointer border-none bg-transparent outline-none ${
                    activeSection === 'dashboard' && dashboardInitialTab === 'profile' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'
                  }`}
                >
                  My Profile
                </button>
                <button
                  onClick={() => {
                    setDashboardInitialTab('messages');
                    setActiveSection('dashboard');
                    window.location.hash = '#dashboard';
                  }}
                  className={`hover:text-rose-400 font-mono text-xs font-bold uppercase transition-colors cursor-pointer border-none bg-transparent outline-none ${
                    activeSection === 'dashboard' && dashboardInitialTab === 'messages' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'
                  }`}
                >
                  Messages
                </button>
                <button
                  onClick={() => {
                    setDashboardInitialTab('notifications');
                    setActiveSection('dashboard');
                    window.location.hash = '#dashboard';
                  }}
                  className={`hover:text-rose-400 font-mono text-xs font-bold uppercase transition-colors cursor-pointer border-none bg-transparent outline-none ${
                    activeSection === 'dashboard' && dashboardInitialTab === 'notifications' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'
                  }`}
                >
                  Notifications
                </button>
                <button
                  onClick={handleSignOut}
                  className="hover:text-red-400 text-red-500 font-mono text-xs font-bold uppercase transition-colors cursor-pointer border-none bg-transparent outline-none"
                >
                  Logout
                </button>
                <a href="#download" className={`hover:text-rose-400 transition-colors flex items-center gap-1.5 text-[10px] bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/10 ${activeSection === 'download' ? 'text-rose-500 font-extrabold border-rose-500/35' : 'text-zinc-400'}`}>📲 NATIVE APP</a>
              </>
            ) : (
              <>
                <a href="#home" className={`hover:text-rose-400 transition-colors ${activeSection === 'home' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>HOME</a>
                <a href="#profiles" className={`hover:text-rose-400 transition-colors ${activeSection === 'directory' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>GAMER DIRECTORY</a>
                <a href="#teams" className={`hover:text-rose-400 transition-colors ${activeSection === 'teams' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>SQUAD FINDER</a>
                <a href="#tournaments" className={`hover:text-rose-400 transition-colors ${activeSection === 'tournaments' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>ARENA MEETUPS</a>
                <a href="#leaderboard" className={`hover:text-rose-400 transition-colors ${activeSection === 'leaderboard' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>GLOBAL STANDINGS</a>
                <a href="#badges" className={`hover:text-rose-400 transition-colors ${activeSection === 'achievements' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>BADGES CHEST</a>
                <a href="#sponsors" className={`hover:text-rose-400 transition-colors ${activeSection === 'sponsors' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>SPONSORS ZONE</a>
                <a href="#download" className={`hover:text-rose-400 transition-colors flex items-center gap-1.5 text-[10px] bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/10 ${activeSection === 'download' ? 'text-rose-500 font-extrabold border-rose-500/35' : 'text-zinc-400'}`}>📲 NATIVE APP</a>
              </>
            )}
          </nav>

          {/* Auth Button */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:border-zinc-700 transition-all">
                <img
                  src={currentUser.profilePhoto || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"}
                  alt={currentUser.gamerName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <div className="hidden sm:block text-left text-xs">
                  <p className="font-extrabold text-white font-sans">{currentUser.gamerName}</p>
                  <p className="text-[9px] text-zinc-500 font-mono uppercase leading-none mt-0.5">{currentUser.membership} Pass</p>
                </div>

                <div className="flex gap-2 pl-2 border-l border-zinc-800">
                  <button
                    onClick={() => { window.location.hash = '#dashboard'; setActiveSection('dashboard'); }}
                    className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-850"
                    title="User Dashboard"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-zinc-850"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAuthType('login'); setShowAuthModal(true); }}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 font-bold font-mono text-xs tracking-wider uppercase text-white px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all neon-glow-pink cursor-pointer"
              >
                <LogIn className="w-4 h-4 stroke-[2.5px]" />
                LOGIN PORTAL
              </button>
            )}
          </div>
        </header>

        {/* Content body wrapper layout */}
        <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-8">
          
          <AnimatePresence mode="wait">
            {activeSection === 'home' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-12"
              >
                {/* AdSense-ready homepage ad slot */}
                <AdSenseSlot slotType="home" className="w-full" />

                {/* Hero Banner with Futuristic graphics */}
                <div className="p-8 md:p-12 bg-zinc-900 border border-zinc-800/80 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-6 md:min-h-[400px]">
                  {/* Glowing background circles */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="space-y-3 max-w-2xl">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-500 bg-rose-500/15 border border-rose-500/25 px-3 py-1 rounded-full animate-bounce">
                      🚀 UNLEASH ESCORES CAREERS
                    </span>
                    <h1 className="text-4.5xl md:text-5.5xl font-black font-display text-white tracking-tight leading-none uppercase">
                      BUILD YOUR WORLD CLASS <span className="text-rose-500 neon-text-pink">GAMER PROFILE</span>
                    </h1>
                    <p className="text-zinc-400 text-sm md:text-base leading-relaxed pt-2">
                      Get drafted, recruit players, register for verified cash-prize arena tournaments, and pitch sponsor programs directly to global esports executives.
                    </p>
                  </div>

                  {/* Immediate actions */}
                  <div className="flex flex-wrap gap-4 pt-4 shrink-0">
                    <button
                      onClick={() => { window.location.hash = '#profiles'; setActiveSection('directory'); }}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-bold font-mono text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider transition-all neon-glow-pink"
                    >
                      EXPLORE DIRECTORY
                    </button>
                    {!currentUser && (
                      <button
                        onClick={() => { setAuthType('register'); setShowAuthModal(true); }}
                        className="bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-bold font-mono text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider transition-all"
                      >
                        CONSTRUCT PORTFOLIO ID
                      </button>
                    )}
                  </div>
                </div>

                {/* Core counters matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
                  <div className="bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl">
                    <p className="text-2xl font-black text-rose-500">₹10 Lakhs+</p>
                    <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-bold">Tournament Pool Pools</p>
                  </div>
                  <div className="bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl">
                    <p className="text-2xl font-black text-cyan-400">1,200+</p>
                    <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-bold">Active Tactical Gamers</p>
                  </div>
                  <div className="bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl">
                    <p className="text-2xl font-black text-amber-400">45+</p>
                    <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-bold">Verified Esports Squads</p>
                  </div>
                  <div className="bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl">
                    <p className="text-2xl font-black text-emerald-400">12+</p>
                    <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-bold">Verified Scouting Brands</p>
                  </div>
                </div>

                {/* Featured players / clans / tournaments Carousels */}
                <FeaturedPromotion
                  featuredItems={featuredItems}
                  users={users}
                  teams={teams}
                  tournaments={tournaments}
                  onNavigateToUser={(userId) => {
                    window.location.hash = '#profiles';
                    setActiveSection('directory');
                  }}
                  onNavigateToTeam={(teamId) => {
                    window.location.hash = '#teams';
                    setActiveSection('teams');
                  }}
                  onNavigateToTournament={(tourney) => {
                    window.location.hash = '#tournaments';
                    setActiveSection('tournaments');
                  }}
                />

                {/* Feature highlight cards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-extrabold text-white font-display flex items-center gap-2 italic pb-2 border-b border-zinc-900/80">
                    <Laptop className="w-5 h-5 text-rose-500" />
                    CORE CAREER TRACKS
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 bg-zinc-900/50 border border-zinc-805/85 rounded-2xl flex flex-col justify-between h-48 hover:border-zinc-700 transition-colors">
                      <div>
                        <h4 className="text-base font-extrabold text-white tracking-wide">1. Gamer Portfolio Sheet</h4>
                        <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed italic">"Display verified game ratios, badges milestones, and embed high-impact streaming videos."</p>
                      </div>
                      <a href="#profiles" className="text-rose-400 font-mono text-xs hover:underline flex items-center gap-0.5 mt-2">Discover Players <ChevronRight className="w-4 h-4" /></a>
                    </div>

                    <div className="p-5 bg-zinc-900/50 border border-zinc-805/85 rounded-2xl flex flex-col justify-between h-48 hover:border-zinc-700 transition-colors">
                      <div>
                        <h4 className="text-base font-extrabold text-white tracking-wide">2. Roster Recruitments</h4>
                        <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed italic font-sans">"Build professional squads, recruit specific active operators, and enlist into official challenger brackets tracker."</p>
                      </div>
                      <a href="#teams" className="text-rose-400 font-mono text-xs hover:underline flex items-center gap-0.5 mt-2">Find Squad <ChevronRight className="w-4 h-4" /></a>
                    </div>

                    <div className="p-5 bg-zinc-900/50 border border-zinc-805/85 rounded-2xl flex flex-col justify-between h-48 hover:border-zinc-700 transition-colors">
                      <div>
                        <h4 className="text-base font-extrabold text-white tracking-wide">3. Corporate Sponsorship</h4>
                        <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed italic">"Enlist to pitch specialized campaigns directly to brands such as Intel, RedBull, Asus ROG."</p>
                      </div>
                      <a href="#sponsors" className="text-rose-400 font-mono text-xs hover:underline flex items-center gap-0.5 mt-2">Connect Brands <ChevronRight className="w-4 h-4" /></a>
                    </div>
                  </div>
                </div>

                {/* Live Activity Ticker Feed Section */}
                <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2.5 py-1 rounded">
                      <Zap className="w-3.5 h-3.5 animate-pulse" />
                      LIVE FEED
                    </span>
                    <marquee className="text-xs text-zinc-400 font-mono italic flex-grow" scrollamount="4">
                      +++ APEXVIPER SIGNED UP FOR RADIANT ARENA TOURNAMENT... ZEPHYR_PRO SECURED PERIPHERAL BACKING WITH CORSAIR MECHANICAL LABS... VELOCITY ESPORTS RECRUITED FORWARD ASSAULTER... SQUAD CODES 'GAMER10' LOADED FOR LIFETIME PASS +++
                    </marquee>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'directory' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GamerProfiles
                  users={users}
                  currentUser={currentUser}
                  adminSettings={actualAdminSettings}
                  onToggleSave={handleToggleSavePlayer}
                  onNavigateToSponsors={(presetGamer) => {
                    setPresetSponsorGamerName(presetGamer);
                    window.location.hash = '#sponsors';
                    setActiveSection('sponsors');
                  }}
                  onAddComment={handleAddComment}
                  onMessageGamer={handleMessageGamer}
                  addToast={addToast}
                />
              </motion.div>
            )}

            {activeSection === 'teams' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <TeamFinder
                  teams={teams}
                  users={users}
                  currentUser={currentUser}
                  onCreateTeam={handleCreateTeam}
                  onSendJoinRequest={handleSendJoinRequest}
                  onAcceptJoinRequest={handleAcceptJoinRequest}
                  onRejectJoinRequest={handleRejectJoinRequest}
                  onLeaveTeam={handleLeaveTeam}
                  addToast={addToast}
                />
              </motion.div>
            )}

            {activeSection === 'tournaments' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Tournaments
                  tournaments={tournaments}
                  currentUser={currentUser}
                  userTeams={teams.filter(t => t.creatorId === currentUserId || t.members.some(m => m.userId === currentUserId))}
                  registrations={registrations}
                  onRegisterTournament={handleRegisterTournament}
                  onCancelRegistration={handleCancelTournamentRegistration}
                  addToast={addToast}
                  adminSettings={actualAdminSettings}
                  users={users}
                  allTeams={teams}
                />
              </motion.div>
            )}

            {activeSection === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Leaderboard
                  users={users}
                  teams={teams}
                  tournaments={tournaments}
                  adminSettings={actualAdminSettings}
                />
              </motion.div>
            )}

            {activeSection === 'achievements' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Achievements
                  currentUser={currentUser}
                  onClaimAchievement={handleClaimAchievement}
                  addToast={addToast}
                />
              </motion.div>
            )}

            {activeSection === 'sponsors' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SponsorZone
                  sponsors={sponsors}
                  users={users}
                  currentUser={currentUser}
                  onSubmitSponsorApplication={handleSponsorApplication}
                  presetGamerName={presetSponsorGamerName}
                  addToast={addToast}
                />
              </motion.div>
            )}

            {activeSection === 'download' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DownloadApp addToast={addToast} />
              </motion.div>
            )}

            {activeSection === 'dashboard' && currentUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <UserDashboard
                  currentUser={currentUser}
                  userTeams={activeUserTeams}
                  userTournaments={userTournamentsRegistered}
                  sponsorApplications={userSponsorsPitches}
                  notifications={userNotificationsInbox}
                  savedPlayersList={userSavedPlayersObjects}
                  adminSettings={actualAdminSettings}
                  onUpdateProfile={handleUpdateProfile}
                  onConfirmPayment={handleConfirmPayment}
                  onMarkNotificationRead={handleMarkNotificationRead}
                  onUnsavePlayer={handleToggleSavePlayer}
                  onSelectGamerProfile={handlePresetSelectGamerProfile}
                  users={users}
                  initialTab={dashboardInitialTab}
                  initialConversationUserId={dashboardInitialConversationUserId}
                  addToast={addToast}
                  registrations={registrations}
                  tournaments={tournaments}
                />
              </motion.div>
            )}

            {activeSection === 'admin' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AdminPanel
                  users={users}
                  teams={teams}
                  tournaments={tournaments}
                  sponsors={sponsors}
                  adminSettings={actualAdminSettings}
                  addToast={addToast}
                  onBanUser={handleBanUser}
                  onUnbanUser={handleUnbanUser}
                  onToggleFeaturedUser={handleToggleFeaturedUser}
                  onToggleFeaturedTeam={handleToggleFeaturedTeam}
                  onDeleteProfile={handleDeleteProfile}
                  onApprovePayment={handleApprovePayment}
                  onRejectPayment={handleRejectPayment}
                  onApproveTournamentRegistration={handleApproveTournamentRegistration}
                  onRejectTournamentRegistration={handleRejectTournamentRegistration}
                  onApproveSponsorApplication={handleApproveSponsorApplication}
                  onRejectSponsorApplication={handleRejectSponsorApplication}
                  onCreateTournament={handleCreateTournament}
                  onUpdateQrCode={handleUpdateQrCode}
                  onAddCoupon={handleAddCoupon}
                  onRemoveCoupon={handleRemoveCoupon}
                  onUpdateAdminSettings={handleUpdateAdminSettings}
                  onAdminUpdateUserProfile={handleAdminUpdateUserProfile}
                  onAdminDeleteTeam={handleAdminDeleteTeam}
                  onAdminDeleteTournament={handleAdminDeleteTournament}
                  registrations={registrations}
                  onUpdateTournamentRegistrationStatus={handleUpdateRegistrationStatus}
                  onUpdateTournament={handleUpdateTournament}
                  onAdminRemoveRegistrationStatus={handleAdminRemoveRegistration}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Global Footer */}
        <footer className="bg-zinc-950 border-t border-zinc-900 py-6 px-6 text-center text-xs text-zinc-500 font-mono space-y-4">
          {/* AdSense-ready platform footer slot */}
          <AdSenseSlot slotType="footer" className="w-full" />

          <p>© 2026 Gaming Career Hub. Built for competitive esports calibration. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            <span className="hover:text-zinc-300 cursor-pointer">Security Code Matrix Verified</span>
            <span>•</span>
            <span className="hover:text-zinc-300 cursor-pointer">Anti-cheat Enlistment active</span>
            <span>•</span>
            <a href="#admin-panel" onClick={() => { window.location.hash = '#admin-panel'; setActiveSection('admin'); }} className="text-zinc-400 hover:text-white transition-all underline">Admin Control Desk</a>
          </div>
          
          {/* AdSense-ready mobile sticky ad slot */}
          <AdSenseSlot slotType="mobile_sticky" className="w-full" />
        </footer>

        {/* Mobile Navigation Bar - Fixed layout bottom for viewing convenience */}
        <nav className="lg:hidden fixed bottom-1.5 left-4 right-4 z-40 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-xl shadow-black/80 backdrop-blur px-2.5 py-3 flex items-center justify-between text-[10px] font-mono font-bold">
          <button
            onClick={() => { window.location.hash = '#home'; setActiveSection('home'); }}
            className={`flex flex-col items-center gap-1.5 flex-1 ${activeSection === 'home' ? 'text-rose-500' : 'text-zinc-400'}`}
          >
            <Compass className="w-4 h-4" />
            <span>Portal</span>
          </button>
          
          <button
            onClick={() => { window.location.hash = '#profiles'; setActiveSection('directory'); }}
            className={`flex flex-col items-center gap-1.5 flex-1 ${activeSection === 'directory' ? 'text-rose-500' : 'text-zinc-400'}`}
          >
            <Users className="w-4 h-4" />
            <span>Players</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#teams'; setActiveSection('teams'); }}
            className={`flex flex-col items-center gap-1.5 flex-1 ${activeSection === 'teams' ? 'text-rose-500' : 'text-zinc-400'}`}
          >
            <Laptop className="w-4 h-4" />
            <span>Squads</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#tournaments'; setActiveSection('tournaments'); }}
            className={`flex flex-col items-center gap-1.5 flex-1 ${activeSection === 'tournaments' ? 'text-rose-500' : 'text-zinc-400'}`}
          >
            <Trophy className="w-4 h-4" />
            <span>Arena</span>
          </button>

          <button
            onClick={() => {
              if (currentUser) {
                window.location.hash = '#dashboard';
                setActiveSection('dashboard');
              } else {
                setAuthType('login');
                setShowAuthModal(true);
              }
            }}
            className={`flex flex-col items-center gap-1.5 flex-1 ${activeSection === 'dashboard' ? 'text-rose-500' : 'text-zinc-400'}`}
          >
            <User className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#download'; setActiveSection('download'); }}
            className={`flex flex-col items-center gap-1.5 flex-1 ${activeSection === 'download' ? 'text-rose-500' : 'text-zinc-400'}`}
          >
            <Smartphone className="w-4 h-4" />
            <span>App</span>
          </button>
        </nav>
      </div>

      {/* Auth Gate (Login/Register) Dialog Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => setShowAuthModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-90 w-full max-w-md bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 z-10 space-y-4 neon-glow-pink"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                <h3 className="text-xl font-bold font-display text-white italic tracking-wide">
                  {authType === 'login' ? "COMMAND GATE IP" : "CREATE PORTFOLIO SYSTEM ID"}
                </h3>
                <button onClick={() => setShowAuthModal(false)} className="text-zinc-400 hover:text-white pb-1">
                  ✕
                </button>
              </div>

              {authType === 'login' ? (
                // Login Form
                <form onSubmit={handleDemoLogin} className="space-y-4">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 text-[11px] text-zinc-500 font-mono">
                    💡 <strong>DEMO LOGIN CHECKS:</strong> You can use standard emails of our initial profiles (e.g. <code>viper@careerhub.gg</code>) with any password to try!
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Email / Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. viper@careerhub.gg"
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-4 py-2.5 outline-none font-mono"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Passphrase</label>
                    <input
                      type="password"
                      required
                      placeholder="Any password will pass"
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-4 py-2.5 outline-none font-mono"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className={`w-full text-white font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all ${
                      isLoggingIn ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 neon-glow-pink cursor-pointer'
                    }`}
                  >
                    {isLoggingIn ? 'AUTHENTICATING CORRIDORS...' : 'AUTHENTICATE REGISTRY'}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-zinc-400">
                      Looking to open an athlete file?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthType('register')}
                        className="text-rose-400 font-bold hover:underline"
                      >
                        Register details
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                // Signup Form
                <form onSubmit={handleDemoRegister} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. zephyr_champ"
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-3.5 py-2 focus:outline-none"
                      value={regUser}
                      onChange={(e) => setRegUser(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. test@gmail.com"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-3 py-2 outline-none"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-3 py-2 outline-none font-mono"
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Gamer Tag Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ShadowKilla"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-3 py-2 focus:outline-none"
                        value={regGamerTag}
                        onChange={(e) => setRegGamerTag(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Avatar Image URL</label>
                      <input
                        type="url"
                        placeholder="Optional"
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-3 py-2 outline-none"
                        value={regScreenshot}
                        onChange={(e) => setRegScreenshot(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Country</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white px-2.5 py-2 rounded-xl focus:outline-none"
                        value={regCountry}
                        onChange={(e) => setRegCountry(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">State</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white px-2.5 py-2 rounded-xl focus:outline-none"
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">City</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white px-2.5 py-2 rounded-xl focus:outline-none"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Bio Summary</label>
                    <textarea
                      placeholder="Explain your gaming specializations, roles, historical teams..."
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 text-white focus:outline-none focus:border-rose-500 rounded-xl"
                      rows={2}
                      value={regBio}
                      onChange={(e) => setRegBio(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">Referral Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. VIPER999"
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-rose-500 rounded-xl px-3.5 py-2 outline-none font-mono"
                      value={referredByCode}
                      onChange={(e) => setReferredByCode(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering}
                    className={`w-full text-white font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all ${
                      isRegistering ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 neon-glow-pink cursor-pointer'
                    }`}
                  >
                    {isRegistering ? 'CONSTRUCTING PROFILE...' : 'CONSTRUCT GAMER PROFILE'}
                  </button>

                  <div className="text-center pt-1.5">
                    <p className="text-xs text-zinc-400">
                      Already have an operator file?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthType('login')}
                        className="text-rose-400 font-bold hover:underline"
                      >
                        Login gateways
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom-Right Dev Debug Panel */}
      <div className="fixed bottom-4 right-4 z-50 bg-black/90 border border-zinc-805 rounded-xl p-3 shadow-xl max-w-xs font-mono text-[10px] text-zinc-400">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5 mb-1.5">
          <span className="font-bold text-rose-500 uppercase tracking-widest text-[9px]">DEV AUTHMETER</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span>Supabase Configured:</span>
            <span className={isSupabaseConfigured ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {isSupabaseConfigured ? "TRUE" : "FALSE"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Session Found:</span>
            <span className={currentUserId ? "text-emerald-450 font-bold" : "text-rose-500 font-bold"}>
              {currentUserId ? "TRUE" : "FALSE"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>User Email:</span>
            <span className="text-white truncate max-w-[125px]" title={currentUser?.email || "None"}>
              {currentUser?.email || "None"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Profile Loaded:</span>
            <span className={currentUser ? "text-emerald-450 font-bold" : "text-rose-500 font-bold"}>
              {currentUser ? "TRUE" : "FALSE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
