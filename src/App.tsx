import React, { useState, useEffect } from 'react';
import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings } from './types';
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
  Plus
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

  // Since we load adminSettings as array or single object safely
  const actualAdminSettings: AdminSettings = Array.isArray(adminSettings) ? adminSettings[0] || INITIAL_ADMIN_SETTINGS : adminSettings || INITIAL_ADMIN_SETTINGS;

  // Current session gamer
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = localStorage.getItem('gh_current_user_id');
    return saved || null;
  });

  const currentUser = users.find(u => u.id === currentUserId) || null;

  // Toast Alerts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- Router & Path Listening State ---
  const [activeSection, setActiveSection] = useState<string>('home');
  const [presetSponsorGamerName, setPresetSponsorGamerName] = useState<string>(''); // prefab prefill sponsor zone

  // Sync state to LocalStorage
  useEffect(() => { saveData('gh_users', users); }, [users]);
  useEffect(() => { saveData('gh_teams', teams); }, [teams]);
  useEffect(() => { saveData('gh_tournaments', tournaments); }, [tournaments]);
  useEffect(() => { saveData('gh_sponsors', sponsors); }, [sponsors]);
  useEffect(() => { saveData('gh_notifications', notifications); }, [notifications]);
  useEffect(() => { saveData('gh_admin_settings', actualAdminSettings); }, [actualAdminSettings]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('gh_current_user_id', currentUserId);
    } else {
      localStorage.removeItem('gh_current_user_id');
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
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin-panel') {
        setActiveSection('admin');
      } else if (hash.startsWith('#gamer/')) {
        // extract username and see if exists
        const uName = hash.split('#gamer/')[1];
        const exists = users.find(u => u.username === uName);
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
      } else if (hash === '#achievements') {
        setActiveSection('achievements');
      } else if (hash === '#sponsors') {
        setActiveSection('sponsors');
      } else if (hash === '#dashboard') {
        setActiveSection('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // run once initially
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [users]);

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

  const handleDemoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
      addToast("Required parameters not provided!", "warning");
      return;
    }

    // Match users
    const matched = users.find(u => u.email === loginEmail || u.username === loginEmail);
    if (!matched) {
      addToast("Account profile registry not found! Please sign up first.", "error");
      return;
    }

    if (matched.isBanned) {
      addToast("Danger: This player account is currently BANNED for competitive cheating.", "error");
      return;
    }

    // Since it's a stateful client demo, we bypass encrypt check and log them in!
    setCurrentUserId(matched.id);
    setShowAuthModal(false);
    setLoginEmail('');
    setLoginPass('');
    addToast(`Verification successful! Welcome back, ${matched.gamerName}`, "success");
    setActiveSection('dashboard');
  };

  const handleDemoRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUser || !regEmail || !regGamerTag) {
      addToast("Mandatory identity info not filled!", "warning");
      return;
    }

    const exists = users.some(u => u.username === regUser || u.email === regEmail);
    if (exists) {
      addToast("Account username or email registered already!", "error");
      return;
    }

    // Construct profile
    const refCodeGenerated = `REG${Math.floor(100 + Math.random() * 900)}${regGamerTag.slice(0, 3).toUpperCase()}`;
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      username: regUser,
      email: regEmail,
      gamerName: regGamerTag,
      profilePhoto: regScreenshot || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
      bio: regBio || "Tactical gamer tracing career milestones on Gaming Career Hub.",
      favoriteGames: ["Valorant"],
      country: regCountry,
      state: regState,
      city: regCity,
      social: {},
      skillRating: 1500,
      kdRatio: 1.0,
      winRate: 50.0,
      tournamentHistory: [],
      teamHistory: [],
      achievements: [],
      badges: ["Recruit Apprentice"],
      highlightVideos: [],
      isBanned: false,
      isFeatured: false,
      membership: "Free",
      membershipStatus: "none",
      referralCode: refCodeGenerated,
      referredBy: referredByCode ? referredByCode.trim().toUpperCase() : undefined,
      savedPlayers: []
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    setShowAuthModal(false);
    
    // Clear registration fields
    setRegUser('');
    setRegEmail('');
    setRegPass('');
    setRegGamerTag('');
    setRegBio('');
    setRegScreenshot('');
    setReferredByCode('');

    addToast(`Account created! Welcome standard pilot, ${newUser.gamerName}!`, "success");
    setActiveSection('dashboard');
  };

  const handleSignOut = () => {
    setCurrentUserId(null);
    addToast("Logged out from game servers safely.", "info");
    setActiveSection('home');
  };

  const handleAddComment = (targetUserId: string, commentText: string) => {
    if (!currentUser) return;
    const newCommentItem = {
      id: `comm-${Date.now()}`,
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
  const handleUpdateProfile = (updatedFields: Partial<UserProfile>) => {
    if (!currentUserId) return;
    setUsers(prev => prev.map(u => u.id === currentUserId ? { ...u, ...updatedFields } : u));
  };

  const handleUpdateAdminSettings = (updated: AdminSettings) => {
    setAdminSettings([updated]);
    addToast("Membership dynamic perks catalogs updated successfully!", "success");
  };

  const handleClaimAchievement = (achId: string, badgeName: string) => {
    if (!currentUserId) return;
    setUsers(prev => prev.map(u => {
      if (u.id === currentUserId) {
        const achs = u.achievements.includes(achId) ? u.achievements : [...u.achievements, achId];
        const bdgs = u.badges.includes(badgeName) ? u.badges : [...u.badges, badgeName];
        return {
          ...u,
          achievements: achs,
          badges: bdgs
        };
      }
      return u;
    }));

    // Add automatic custom unlock notification log
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      userId: currentUserId,
      title: "Medal badge Awarded!",
      message: `Sensational performance! You have unlocked and claimed the badge medal index: "${badgeName}". Check your portfolio card.`,
      type: 'success',
      date: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [notif, ...prev]);
  };

  const handleToggleSavePlayer = (targetId: string) => {
    if (!currentUserId) return;
    setUsers(prev => prev.map(u => {
      if (u.id === currentUserId) {
        const exists = u.savedPlayers.includes(targetId);
        const nextSaved = exists 
          ? u.savedPlayers.filter(id => id !== targetId)
          : [...u.savedPlayers, targetId];
        addToast(exists ? "Player removed from saved list." : "Player saved to your dynamic bookmarks!", "success");
        return { ...u, savedPlayers: nextSaved };
      }
      return u;
    }));
  };

  // --- Team Finder State Updates ---
  const handleCreateTeam = (teamData: any) => {
    if (!currentUser) return;
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      ranking: Math.floor(20 + Math.random() * 80),
      creatorId: currentUser.id,
      creatorGamerName: currentUser.gamerName,
      members: [
        { userId: currentUser.id, username: currentUser.username, gamerName: currentUser.gamerName, role: "Squad Owner / Leader" }
      ],
      pendingRequests: [],
      pendingInvites: [],
      ...teamData
    };

    setTeams(prev => [...prev, newTeam]);
    addToast(`Squad "${newTeam.name}" has been constructed and is scouting!`, "success");
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
      id: `notif-${Date.now()}`,
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
  const handleRegisterSolo = (tourneyId: string, contactEmail: string) => {
    if (!currentUser) return;
    setTournaments(prev => prev.map(t => {
      if (t.id === tourneyId) {
        const exists = t.registrants.some(r => r.id === currentUser.id);
        if (exists) return t;

        return {
          ...t,
          registrants: [...t.registrants, {
            id: currentUser.id,
            name: currentUser.gamerName,
            logo: currentUser.profilePhoto,
            type: 'solo',
            status: 'pending',
            contactEmail,
            registeredAt: new Date().toISOString().split('T')[0]
          }]
        };
      }
      return t;
    }));

    addToast("Solo verification form logged. Admin desk will review shortly.", "success");
  };

  const handleRegisterTeam = (tourneyId: string, teamId: string, contactEmail: string) => {
    const squadObj = teams.find(t => t.id === teamId);
    if (!squadObj) return;

    setTournaments(prev => prev.map(t => {
      if (t.id === tourneyId) {
        const exists = t.registrants.some(r => r.id === teamId);
        if (exists) return t;

        return {
          ...t,
          registrants: [...t.registrants, {
            id: teamId,
            name: squadObj.name,
            logo: squadObj.logo,
            type: 'team',
            status: 'pending',
            contactEmail,
            registeredAt: new Date().toISOString().split('T')[0]
          }]
        };
      }
      return t;
    }));

    addToast(`Squad placement verified! Enlisted "${squadObj.name}" into pending review.`, "success");
  };

  // --- Sponsor State Updates ---
  const handleSponsorApplication = (
    brandName: string,
    offerDetails: string,
    monthlyReach: string,
    pitch: string,
    contactEmail: string
  ) => {
    if (!currentUser) return;
    const app: SponsorApplication = {
      id: `spons-${Date.now()}`,
      userId: currentUser.id,
      gamerName: currentUser.gamerName,
      favoriteGame: currentUser.favoriteGames[0] || 'Valorant',
      brandName,
      pitch,
      monthlyReach,
      mediaKitStats: `${currentUser.favoriteGames.join(', ')}, ${currentUser.kdRatio} KD, ${currentUser.skillRating} MMR`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      contactEmail
    };

    setSponsors(prev => [app, ...prev]);

    // Dispatch alert notification to subscriber
    const alertNotif: Notification = {
      id: `notif-${Date.now()}`,
      userId: currentUser.id,
      title: "Sponsor Pitch Dispatched",
      message: `Your high-impact career proposal has been filed with ${brandName}. Track review indicators in the dashboard.`,
      type: 'sponsor',
      date: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [alertNotif, ...prev]);
  };

  const handleMarkNotificationRead = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  // Upgrades desk payment screen screenshot confirmation
  const handleConfirmPayment = (membership: 'Silver' | 'Gold' | 'Platinum', txId: string, screenshotUrl: string) => {
    if (!currentUserId) return;
    setUsers(prev => prev.map(u => {
      if (u.id === currentUserId) {
        return {
          ...u,
          membership,
          membershipStatus: 'pending',
          membershipTxId: txId,
          membershipScreenshot: screenshotUrl
        };
      }
      return u;
    }));

    addToast("Pass verification log indexed! Upgraded tier will unlock upon Admin validation.", "success");
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

  const handleDeleteProfile = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    addToast("Profile destroyed from active databases.", "info");
  };

  const handleApprovePayment = (userId: string) => {
    let assignedTier: string = "Upgrade";
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const now = new Date();
        let durationDays = 30; // default Gold
        if (u.membership === 'Silver') durationDays = 7;
        else if (u.membership === 'Platinum') durationDays = 9999;

        const expiryDate = new Date();
        expiryDate.setDate(now.getDate() + durationDays);

        assignedTier = u.membership;

        return {
          ...u,
          membershipStatus: 'active',
          membershipExpires: expiryDate.toISOString(),
          featuredUntil: expiryDate.toISOString(),
          isFeatured: true
        };
      }
      return u;
    }));

    // Notify user
    const sysNotif: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      title: `${assignedTier} Membership Approved!`,
      message: `Excellent! Transaction cleared. Dynamic user cosmetic catalogs, custom indicators, and profile-boosting cards are unlocked in your active pilot file.`,
      type: 'success',
      date: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [sysNotif, ...prev]);
    addToast(`Payment approved! ${assignedTier} active benefits configured.`, "success");
  };

  const handleRejectPayment = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          membership: 'Free',
          membershipStatus: 'none',
          membershipTxId: undefined,
          membershipScreenshot: undefined
        };
      }
      return u;
    }));

    // Notify user
    const sysNotif: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      title: "Invoice Rejected",
      message: "Validation alert: Admin was unable to reconcile transaction screenshot references. Membership pass stays locked.",
      type: 'alert',
      date: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [sysNotif, ...prev]);
    addToast("Payment validation declined. Retracting upgrade.", "info");
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

  const handleCreateTournament = (tourneyData: any) => {
    const newT: Tournament = {
      id: `tourney-${Date.now()}`,
      registrants: [],
      winners: [],
      bracket: [],
      ...tourneyData
    };
    setTournaments(prev => [...prev, newT]);
  };

  const handleUpdateQrCode = (newUrl: string) => {
    setAdminSettings({
      ...actualAdminSettings,
      qrCodeUrl: newUrl
    } as any);
  };

  const handleAddCoupon = (code: string, discountPercent: number) => {
    setAdminSettings({
      ...actualAdminSettings,
      activeCoupons: [...actualAdminSettings.activeCoupons, { code, discountPercent }]
    } as any);
  };

  const handleRemoveCoupon = (code: string) => {
    setAdminSettings({
      ...actualAdminSettings,
      activeCoupons: actualAdminSettings.activeCoupons.filter(c => c.code !== code)
    } as any);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10] text-[#f3f4f6] cyber-grid selection:bg-pink-500 selection:text-white pb-20 md:pb-0">
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
            <a href="#home" className={`hover:text-rose-400 transition-colors ${activeSection === 'home' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>HOME</a>
            <a href="#profiles" className={`hover:text-rose-400 transition-colors ${activeSection === 'directory' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>GAMER DIRECTORY</a>
            <a href="#teams" className={`hover:text-rose-400 transition-colors ${activeSection === 'teams' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>SQUAD FINDER</a>
            <a href="#tournaments" className={`hover:text-rose-400 transition-colors ${activeSection === 'tournaments' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>ARENA MEETUPS</a>
            <a href="#leaderboard" className={`hover:text-rose-400 transition-colors ${activeSection === 'leaderboard' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>GLOBAL STANDINGS</a>
            <a href="#achievements" className={`hover:text-rose-400 transition-colors ${activeSection === 'achievements' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>BADGES CHEST</a>
            <a href="#sponsors" className={`hover:text-rose-400 transition-colors ${activeSection === 'sponsors' ? 'text-rose-500 font-extrabold' : 'text-zinc-400'}`}>SPONSORS ZONE</a>
          </nav>

          {/* Auth Button */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:border-zinc-700 transition-all">
                <img
                  src={currentUser.profilePhoto}
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
                  onRegisterSolo={handleRegisterSolo}
                  onRegisterTeam={handleRegisterTeam}
                  addToast={addToast}
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
                  addToast={addToast}
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
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Global Footer */}
        <footer className="bg-zinc-950 border-t border-zinc-900 py-6 px-6 text-center text-xs text-zinc-500 font-mono">
          <p>© 2026 Gaming Career Hub. Built for competitive esports calibration. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <span className="hover:text-zinc-300 cursor-pointer">Security Code Matrix Verified</span>
            <span>•</span>
            <span className="hover:text-zinc-300 cursor-pointer">Anti-cheat Enlistment active</span>
          </div>
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
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all neon-glow-pink"
                  >
                    AUTHENTICATE REGISTRY
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
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-xl text-xs font-mono tracking-widest uppercase transition-all neon-glow-pink cursor-pointer"
                  >
                    CONSTRUCT GAMER PROFILE
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
    </div>
  );
}
