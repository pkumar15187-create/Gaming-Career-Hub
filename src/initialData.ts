import { UserProfile, Team, Tournament, SponsorApplication, Notification, AdminSettings } from './types';

// Default QR Code placeholder (clean vector graphic or base64 or stable un-splash image)
export const DEFAULT_QR_CODE = "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=500&auto=format&fit=crop&q=60";

export const INITIAL_USERS: UserProfile[] = [
  {
    id: "user-1",
    username: "ApexViper",
    email: "viper@careerhub.gg",
    gamerName: "ApexViper",
    profilePhoto: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
    bio: "Professional Valorant Duelist. Formerly playing for Team Eclipse. Currently looking to get recruited by Tier 1 Esports organization.",
    favoriteGames: ["Valorant", "CS2"],
    country: "India",
    state: "Delhi",
    city: "New Delhi",
    social: {
      youtube: "https://youtube.com/c/ApexViperGaming",
      instagram: "https://instagram.com/apex_viper",
      discord: "ApexViper#1337"
    },
    skillRating: 4850,
    kdRatio: 1.62,
    winRate: 68.4,
    tournamentHistory: [
      { id: "t-1", tournamentName: "Valorant Radiant Cup 2026", date: "2026-04-12", rank: "1st Place", prizeWon: "₹50,000" },
      { id: "t-2", tournamentName: "CS2 Shanghai Legends", date: "2026-05-20", rank: "3rd Place", prizeWon: "₹15,000" }
    ],
    teamHistory: [
      { teamId: "team-1", teamName: "Viper Esports", role: "IGL", duration: "6 Months" },
      { teamId: "team-2", teamName: "Shadow Syndicate", role: "Entry Fragger", duration: "1 Year" }
    ],
    achievements: ["ach-mvp", "ach-clutch", "ach-radiant"],
    badges: ["Radiant MVP", "Elite Sharpshooter", "Tournament Winner"],
    highlightVideos: [
      "https://youtube.com/watch?v=demo1",
      "https://youtube.com/watch?v=demo2"
    ],
    isBanned: false,
    isFeatured: true,
    membership: "Gold",
    membershipStatus: "active",
    referralCode: "VIPER999",
    savedPlayers: ["user-3"]
  },
  {
    id: "user-2",
    username: "Zephyr",
    email: "zephyr@careerhub.gg",
    gamerName: "Zephyr_Pro",
    profilePhoto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    bio: "BGMI Assassin. Assault specialist. Looking for a squad to dominate the upcoming Battlegrounds Pro Series.",
    favoriteGames: ["BGMI", "Free Fire", "PUBG Mobile"],
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    social: {
      youtube: "https://youtube.com/c/ZephyrPro",
      discord: "Zephyr#4488"
    },
    skillRating: 4200,
    kdRatio: 4.82,
    winRate: 55.2,
    tournamentHistory: [
      { id: "t-3", tournamentName: "BGMI India Masters", date: "2026-03-05", rank: "2nd Place", prizeWon: "₹30,000" }
    ],
    teamHistory: [
      { teamId: "team-3", teamName: "Soul Eaters", role: "Assaulter", duration: "3 Months" }
    ],
    achievements: ["ach-slayer", "ach-streak"],
    badges: ["Slayer", "Streak Master"],
    highlightVideos: ["https://youtube.com/watch?v=demo3"],
    isBanned: false,
    isFeatured: true,
    membership: "Silver",
    membershipStatus: "active",
    referralCode: "ZEPH55",
    savedPlayers: []
  },
  {
    id: "user-3",
    username: "CyberQueen",
    email: "queen@careerhub.gg",
    gamerName: "ChronoGod",
    profilePhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "CODM Sniper. Trigger precision: 98%. Always in search of sponsor opportunities to take on global levels.",
    favoriteGames: ["COD Mobile"],
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    social: {
      instagram: "https://instagram.com/chronogod_codm",
      discord: "ChronoGod#9911"
    },
    skillRating: 4610,
    kdRatio: 2.15,
    winRate: 61.2,
    tournamentHistory: [
      { id: "t-4", tournamentName: "CODM Mayhem Championship", date: "2026-02-18", rank: "1st Place", prizeWon: "₹40,000" }
    ],
    teamHistory: [
      { teamId: "team-4", teamName: "Velocity Gaming", role: "Sniper", duration: "1.5 Years" }
    ],
    achievements: ["ach-unstoppable", "ach-sniper"],
    badges: ["Sniper God", "Champion Badge"],
    highlightVideos: ["https://youtube.com/watch?v=demo4"],
    isBanned: false,
    isFeatured: false,
    membership: "Free",
    membershipStatus: "none",
    referralCode: "CHRONO88",
    savedPlayers: ["user-1"]
  },
  {
    id: "user-4",
    username: "FrostBite",
    email: "frost@careerhub.gg",
    gamerName: "Frost_Bite",
    profilePhoto: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    bio: "GTA V Roleplay Creator and CS2 Support Player. Multi-genre specialist.",
    favoriteGames: ["CS2", "GTA V"],
    country: "India",
    state: "Tamil Nadu",
    city: "Chennai",
    social: {
      youtube: "https://youtube.com/c/FrostBiteCS",
      instagram: "https://instagram.com/frostbite_rp"
    },
    skillRating: 3800,
    kdRatio: 1.12,
    winRate: 51.5,
    tournamentHistory: [],
    teamHistory: [],
    achievements: [],
    badges: [],
    highlightVideos: [],
    isBanned: false,
    isFeatured: false,
    membership: "Free",
    membershipStatus: "none",
    referralCode: "FROST01",
    savedPlayers: []
  },
  {
    id: "user-5",
    username: "GamerBoy",
    email: "test@test.com",
    gamerName: "GamerBoy_Demo",
    profilePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Competitive mobile gamer seeking sponsors and tier-1 teams. Dedicated to grind Free Fire & PUBG.",
    favoriteGames: ["Free Fire", "BGMI"],
    country: "India",
    state: "Uttar Pradesh",
    city: "Noida",
    social: {
      youtube: "https://youtube.com/demo",
      instagram: "https://instagram.com/demo"
    },
    skillRating: 3200,
    kdRatio: 1.85,
    winRate: 46.5,
    tournamentHistory: [],
    teamHistory: [],
    achievements: [],
    badges: [],
    highlightVideos: [],
    isBanned: false,
    isFeatured: false,
    membership: "Free",
    membershipStatus: "none",
    referralCode: "DEMO777",
    savedPlayers: []
  }
];

export const INITIAL_TEAMS: Team[] = [
  {
    id: "team-1",
    name: "Viper Esports",
    logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    bio: "Tier 2 Valorant Team looking for an initiator. Practicing 6 hours daily. Competing in upcoming challenger leagues.",
    game: "Valorant",
    requiredRole: "Initiator",
    ranking: 12,
    creatorId: "user-1",
    creatorGamerName: "ApexViper",
    members: [
      { userId: "user-1", username: "ApexViper", gamerName: "ApexViper", role: "IGL/Duelist" },
      { userId: "user-4", username: "FrostBite", gamerName: "Frost_Bite", role: "Controller" }
    ],
    pendingRequests: [
      { userId: "user-3", gamerName: "ChronoGod", message: "Hi! I am a very loyal Valorant coach/initiator player. Would love to join." }
    ],
    pendingInvites: []
  },
  {
    id: "team-2",
    name: "Godlike Assaulters",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80",
    bio: "BGMI aggressive squad aiming to enter global podiums. Sponsor backed partially. Daily scrims.",
    game: "BGMI",
    requiredRole: "Support/Sniper",
    ranking: 5,
    creatorId: "user-2",
    creatorGamerName: "Zephyr_Pro",
    members: [
      { userId: "user-2", username: "Zephyr", gamerName: "Zephyr_Pro", role: "IGL / Assaulter" }
    ],
    pendingRequests: [],
    pendingInvites: []
  }
];

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: "tourney-1",
    title: "Valorant Radiant Arena",
    game: "Valorant",
    prizePool: "₹2,50,000",
    rules: [
      "1. All teams must have 5 active players.",
      "2. Safe-play/Anti-cheat mandatory.",
      "3. Direct disqualification if caught scripting.",
      "4. Decisions of the career hub admin are final."
    ],
    schedule: [
      { date: "2026-06-15", event: "Qualifiers Round 1" },
      { date: "2026-06-18", event: "Quarterfinals" },
      { date: "2026-06-20", event: "Semifinals & Grand Finale" }
    ],
    registrationType: "team",
    status: "upcoming",
    maxTeams: 16,
    registrants: [
      { id: "team-1", name: "Viper Esports", logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80", type: "team", status: "approved", contactEmail: "viper@careerhub.gg", registeredAt: "2026-06-01" }
    ],
    winners: [],
    bracket: [
      {
        roundNumber: 1,
        roundName: "Semifinals",
        matches: [
          { id: "m-1", player1: "Viper Esports", player2: "Gods Array", score1: undefined, score2: undefined, winner: undefined, stageName: "Semifinal A" },
          { id: "m-2", player1: "Velocity Esports", player2: "Glitch Squad", score1: undefined, score2: undefined, winner: undefined, stageName: "Semifinal B" }
        ]
      },
      {
        roundNumber: 2,
        roundName: "Grand Finals",
        matches: [
          { id: "m-3", player1: "Winner Def Semifinal A", player2: "Winner Def Semifinal B", score1: undefined, score2: undefined, winner: undefined, stageName: "Grand Final" }
        ]
      }
    ]
  },
  {
    id: "tourney-2",
    title: "BGMI Clash of Titans",
    game: "BGMI",
    prizePool: "₹5,00,000",
    rules: [
      "1. Mobile only. No emulator allowed.",
      "2. Match points calculation based on standard ESP points table.",
      "3. Reporting must contain video evidence."
    ],
    schedule: [
      { date: "2026-06-25", event: "Group Stages Map 1 (Erangel)" },
      { date: "2026-06-26", event: "Group Stages Map 2 (Miramar)" },
      { date: "2026-06-28", event: "Grand Finals Map 3 & 4" }
    ],
    registrationType: "team",
    status: "upcoming",
    maxTeams: 20,
    registrants: [
      { id: "team-2", name: "Godlike Assaulters", logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80", type: "team", status: "pending", contactEmail: "zephyr@careerhub.gg", registeredAt: "2026-06-05" }
    ],
    winners: [],
    bracket: []
  },
  {
    id: "tourney-3",
    title: "CS2 Redline Invitational",
    game: "CS2",
    prizePool: "₹1,00,000",
    rules: [
      "1. Active VAC and anti-cheat checked.",
      "2. 5v5 Competitive ruleset on Active Duty maps.",
      "3. Pause requests limited to 2 minutes."
    ],
    schedule: [
      { date: "2026-05-10", event: "Round Robin Group" },
      { date: "2026-05-12", event: "Grand Finals (BO3)" }
    ],
    registrationType: "solo",
    status: "completed",
    maxTeams: 8,
    registrants: [
      { id: "user-1", name: "ApexViper", logo: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80", type: "solo", status: "approved", contactEmail: "viper@careerhub.gg", registeredAt: "2026-05-01" },
      { id: "user-4", name: "Frost_Bite", logo: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80", type: "solo", status: "approved", contactEmail: "frost@careerhub.gg", registeredAt: "2026-05-01" }
    ],
    winners: [
      { rank: "1st", name: "ApexViper", prize: "₹60,000" },
      { rank: "2nd", name: "Frost_Bite", prize: "₹30,000" },
      { rank: "3rd", name: "CyberSoldier", prize: "₹10,000" }
    ],
    bracket: [
      {
        roundNumber: 1,
        roundName: "Grand Finals",
        matches: [
          { id: "m-top-1", player1: "ApexViper", player2: "Frost_Bite", score1: 16, score2: 12, winner: "ApexViper", stageName: "Grand Finale" }
        ]
      }
    ]
  }
];

export const INITIAL_SPONSORS: SponsorApplication[] = [
  {
    id: "spons-1",
    userId: "user-1",
    gamerName: "ApexViper",
    favoriteGame: "Valorant",
    brandName: "RedBull Gaming",
    pitch: "I have an active audience of 50K YouTube subscribers and regular tournament podium finishes. Looking for monthly hydration sponsorship.",
    monthlyReach: "120,000 Impressions",
    mediaKitStats: "50k YT Subs, 12k Instagram Followers, 1.62 KD Ratio",
    status: "pending",
    createdAt: "2026-06-07T12:00:00Z",
    contactEmail: "viper@careerhub.gg"
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    userId: "user-1",
    title: "Sponsor Application Submitted",
    message: "Your sponsor application for RedBull Gaming has been submitted for verification. Admin will review your profile shortly.",
    type: "sponsor",
    date: "2026-06-07T12:05:00Z",
    read: false
  },
  {
    id: "notif-2",
    userId: "user-1",
    title: "Tournament Registered",
    message: "Woohoo! Viper Esports has successfully signed up for 'Valorant Radiant Arena'. Wait for Admin approval.",
    type: "tournament",
    date: "2026-06-06T15:30:00Z",
    read: true
  }
];

export const INITIAL_ADMIN_SETTINGS: AdminSettings = {
  qrCodeUrl: DEFAULT_QR_CODE,
  activeCoupons: [
    { code: "GAMER10", discountPercent: 10 },
    { code: "CHAMPION30", discountPercent: 30 },
    { code: "FIRST50", discountPercent: 50 }
  ],
  badges: [
    { id: "badge-silver", name: "Silver Challenger Badge", tier: "Silver", icon: "🥈 Silver Pro" },
    { id: "badge-gold", name: "Gold Mastery Badge", tier: "Gold", icon: "🥇 Gold Master" },
    { id: "badge-platinum", name: "Platinum VIP Overlord Badge", tier: "Platinum", icon: "👑 Platinum VIP" }
  ],
  stickerPacks: [
    { id: "pack-silver", name: "Silver Spark pack", tier: "Silver", stickers: ["🎯", "⚡", "💀", "🔥"] },
    { id: "pack-gold", name: "Gold Victory pack", tier: "Gold", stickers: ["🏆", "🌟", "👻", "💻", "💥", "🎮"] },
    { id: "pack-gold-chat", name: "Gold Chat icons", tier: "Gold", stickers: ["💬", "📣", "🤩", "😈"] },
    { id: "pack-platinum", name: "Platinum Animated VIP pack", tier: "Platinum", stickers: ["💎", "🚀", "🪐", "👽", "🔮", "💖", "🦄", "🦅"] }
  ],
  profileFrames: [
    { id: "frame-silver", name: "Silver Profile Halo", tier: "Silver", style: "ring-4 ring-zinc-400 ring-offset-2 ring-offset-zinc-950" },
    { id: "frame-gold", name: "Gold Sovereign Ring", tier: "Gold", style: "ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]" },
    { id: "frame-platinum", name: "Platinum Pulsing Void Ring", tier: "Platinum", style: "ring-4 ring-rose-500 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse" }
  ],
  profileBanners: [
    { id: "banner-gold-shimmer", name: "Gold Shimmering Horizon", tier: "Gold", style: "bg-gradient-to-r from-amber-600 via-yellow-700 to-amber-900 border-b border-amber-400/40" },
    { id: "banner-platinum-aurora", name: "Platinum Galactic Nebula", tier: "Platinum", style: "bg-gradient-to-r from-indigo-900 via-rose-800 to-violet-950 border-b-2 border-rose-500/60" }
  ],
  premiumRewards: [
    { id: "reward-s1", name: "7-Days Search Booster", tier: "Silver", description: "Brings gamer profile card into direct spotlight section for recruiting managers." },
    { id: "reward-g1", name: "Tournament Spot Pre-Approval", tier: "Gold", description: "Bypasses standard signup lines and secures placement priority." },
    { id: "reward-p1", name: "VIP Label everywhere", tier: "Platinum", description: "Displays a premium VIP crown tag beside user name across public indexes and leaderboards." }
  ]
};

// LocalStorage helpers to load & save state
export const loadData = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error("Error reading localStorage key: " + key, e);
    return defaultValue;
  }
};

export const saveData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Error writing localStorage key: " + key, e);
  }
};
