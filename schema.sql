-- ====================================================================
-- Gaming Career Hub - Complete Supabase Database Schema & Setup
-- ====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    email text not null unique,
    membership text not null default 'Free', -- 'Free', 'Silver', 'Gold', 'Platinum'
    xp integer default 0,
    level integer default 1,
    last_daily_reward_claimed_at timestamp with time zone,
    coins integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. GAMER PROFILES TABLE
create table if not exists public.gamer_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascadeUnique,
    gamer_name text not null,
    bio text,
    favorite_game text, -- main favorite game
    favorite_games text[] default '{}'::text[], -- list of games
    rank text default 'Unranked',
    profile_photo text,
    social_links jsonb default '{}'::jsonb, -- e.g. youtube, instagram, discord
    city text,
    state text,
    country text,
    skill_rating integer default 1500,
    kd_ratio numeric(4,2) default 1.00,
    win_rate numeric(5,2) default 50.00,
    badges text[] default '{}'::text[],
    stickers text[] default '{}'::text[],
    active_sticker text,
    active_frame text,
    active_banner text,
    active_banner_url text,
    selected_banner text,
    active_badge_url text,
    selected_badge text,
    active_frame_url text,
    selected_frame text,
    unlocked_stickers text[] default '{}'::text[],
    referral_code text unique,
    referred_by text,
    is_banned boolean default false,
    is_featured boolean default false,
    featured_until timestamp with time zone,
    membership_status text default 'none', -- 'active', 'pending', 'none'
    membership_expires timestamp with time zone,
    last_daily_claimed timestamp with time zone,
    saved_players uuid[] default '{}'::uuid[] -- list of user ids saved
);

-- 3. TEAMS TABLE
create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    team_name text not null,
    team_logo text,
    owner_id uuid not null references public.users(id) on delete cascade,
    game text not null,
    required_role text,
    description text,
    ranking integer default 0,
    is_featured boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TEAM MEMBERS TABLE
create table if not exists public.team_members (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    role text not null default 'Member', -- 'Leader', 'IGL', 'Sniper', 'Assaulter', 'Member', etc.
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(team_id, user_id)
);

-- 5. TOURNAMENTS TABLE
create table if not exists public.tournaments (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    game text not null,
    prize_pool text not null,
    status text not null default 'upcoming', -- 'upcoming', 'ongoing', 'completed'
    registration_type text not null default 'team', -- 'solo' or 'team'
    max_teams integer default 16,
    rules text[] default '{}'::text[],
    schedule jsonb default '[]'::jsonb, -- list of items like {date, event}
    winners jsonb default '[]'::jsonb, -- list of items like {rank, name, prize}
    bracket jsonb default '[]'::jsonb, -- bracket nodes / match layouts
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. TOURNAMENT REGISTRATIONS TABLE
create table if not exists public.tournament_registrations (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid not null references public.tournaments(id) on delete cascade,
    team_id uuid references public.teams(id) on delete cascade, -- null if solo
    user_id uuid references public.users(id) on delete cascade, -- null if squad
    status text not null default 'pending', -- 'pending', 'approved', 'rejected'
    contact_email text not null,
    registered_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. PAYMENTS TABLE
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    plan text not null, -- 'Silver', 'Gold', 'Platinum'
    amount decimal(10,2) not null,
    transaction_id text not null unique,
    status text not null default 'pending', -- 'pending', 'approved', 'rejected'
    screenshot_url text,
    coupon_applied text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. MEMBERSHIPS TABLE
create table if not exists public.memberships (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    plan text not null, -- 'Silver', 'Gold', 'Platinum'
    start_date timestamp with time zone default timezone('utc'::text, now()) not null,
    expiry_date timestamp with time zone not null
);

-- 9. MESSAGES TABLE (Realtime chat system)
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references public.users(id) on delete cascade,
    receiver_id uuid references public.users(id) on delete cascade, -- null if team chat / global chat
    team_id uuid references public.teams(id) on delete cascade, -- set if squad chat
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. NOTIFICATIONS TABLE
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    content text not null,
    type text not null default 'info', -- 'info', 'success', 'alert', 'sponsor', 'team', 'tournament'
    read boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. ACHIEVEMENTS TABLE
create table if not exists public.achievements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    achievement_name text not null, -- ach-mvp, ach-clutch, ach-radiant, etc.
    unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, achievement_name)
);

-- 12. REFERRALS TABLE
create table if not exists public.referrals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade, -- referrer code owner
    referred_user uuid not null references public.users(id) on delete cascade unique, -- user who joined
    reward_claimed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. SPONSOR APPLICATIONS TABLE
create table if not exists public.sponsor_applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    company_name text not null, -- brand name like 'RedBull Gaming', 'Monster'
    pitch text not null,
    monthly_reach text,
    media_kit_stats text,
    contact_email text not null,
    status text not null default 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. ADMIN SETTINGS (A single-row configuration registry)
create table if not exists public.admin_settings (
    id integer primary key default 1 check (id = 1), -- force single row
    qr_code_url text not null,
    upi_id text,
    active_coupons jsonb default '[]'::jsonb, -- structured like [{code, discountPercent}]
    badges jsonb default '[]'::jsonb,
    sticker_packs jsonb default '[]'::jsonb,
    profile_frames jsonb default '[]'::jsonb,
    profile_banners jsonb default '[]'::jsonb,
    premium_rewards jsonb default '[]'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ====================================================================
-- INDEX DESIGN FOR HIGH-PERFORMANCE QUERIES
-- ====================================================================
create index if not exists idx_gamer_profiles_user_id on public.gamer_profiles(user_id);
create index if not exists idx_teams_owner_id on public.teams(owner_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_tourney_reg_tourney_id on public.tournament_registrations(tournament_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);
create index if not exists idx_messages_team_id on public.messages(team_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS everywhere
alter table public.users enable row level security;
alter table public.gamer_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.payments enable row level security;
alter table public.memberships enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.achievements enable row level security;
alter table public.referrals enable row level security;
alter table public.sponsor_applications enable row level security;
alter table public.admin_settings enable row level security;

-- 1. Users policies
create policy "Allow public read access to users" on public.users 
    for select using (true);
create policy "Allow individual user profile updates or inserts" on public.users 
    for all using (true) with check (true);

-- 2. Gamer profiles policies
create policy "Allow public read access to gamer_profiles" on public.gamer_profiles 
    for select using (true);
create policy "Allow users to handle their own gamer_profile" on public.gamer_profiles 
    for all using (true) with check (true);

-- 3. Teams policies
create policy "Allow public read access to teams" on public.teams 
    for select using (true);
create policy "Allow authorized actions on teams" on public.teams 
    for all using (true) with check (true);

-- 4. Team members policies
create policy "Allow select access to team members" on public.team_members 
    for select using (true);
create policy "Allow full member actions" on public.team_members 
    for all using (true) with check (true);

-- 5. Tournaments policies
create policy "Allow public read to tournaments" on public.tournaments 
    for select using (true);
create policy "Admin manages tournaments" on public.tournaments 
    for all using (true) with check (true);

-- 6. Tournament registrations policies
create policy "Everyone can view registrations" on public.tournament_registrations 
    for select using (true);
create policy "Manage registrations" on public.tournament_registrations 
    for all using (true) with check (true);

-- 7. Payments policies
create policy "Select payments" on public.payments 
    for select using (true);
create policy "Insert/Modify payments" on public.payments 
    for all using (true) with check (true);

-- 8. Memberships policies
create policy "Select memberships" on public.memberships 
    for select using (true);
create policy "Manage memberships" on public.memberships 
    for all using (true) with check (true);

-- 9. Messages policies
create policy "Select messages" on public.messages 
    for select using (true);
create policy "Insert messages" on public.messages 
    for all using (true) with check (true);

-- 10. Notifications policies
create policy "Select notifications" on public.notifications 
    for select using (true);
create policy "Manage notifications" on public.notifications 
    for all using (true) with check (true);

-- 11. Achievements policies
create policy "Select achievements" on public.achievements 
    for select using (true);
create policy "Manage achievements" on public.achievements 
    for all using (true) with check (true);

-- 12. Referrals policies
create policy "Select referrals" on public.referrals 
    for select using (true);
create policy "Manage referrals" on public.referrals 
    for all using (true) with check (true);

-- 13. Sponsor applications policies
create policy "Select sponsor applications" on public.sponsor_applications 
    for select using (true);
create policy "Manage sponsor applications" on public.sponsor_applications 
    for all using (true) with check (true);

-- 14. Admin settings policies
create policy "Select admin settings" on public.admin_settings 
    for select using (true);
create policy "Manage admin settings" on public.admin_settings 
    for all using (true) with check (true);

-- ====================================================================
-- REALTIME SUBSCRIPTIONS CONFIGURATION
-- ====================================================================

begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.gamer_profiles;

-- ====================================================================
-- STORAGE BUCKETS SETUP
-- ====================================================================

-- Create buckets inside storage schema (standard Supabase Storage API handles metadata automatically)
insert into storage.buckets (id, name, public) 
values 
  ('profile_photos', 'profile_photos', true),
  ('team_logos', 'team_logos', true),
  ('payment_screenshots', 'payment_screenshots', true),
  ('sponsor_documents', 'sponsor_documents', true),
  ('payment_qr', 'payment_qr', true),
  ('profile_banners', 'profile_banners', true),
  ('premium_badges', 'premium_badges', true),
  ('premium_frames', 'premium_frames', true),
  ('premium_stickers', 'premium_stickers', true)
on conflict (id) do nothing;

-- Create security policies for buckets to allow quick, safe uploads and downloads
create policy "Authenticated upload access profile_photos" on storage.objects 
  for insert with check (bucket_id = 'profile_photos');
create policy "Public download access profile_photos" on storage.objects 
  for select using (bucket_id = 'profile_photos');

create policy "Authenticated upload access team_logos" on storage.objects 
  for insert with check (bucket_id = 'team_logos');
create policy "Public download access team_logos" on storage.objects 
  for select using (bucket_id = 'team_logos');

create policy "Authenticated upload access payment_screenshots" on storage.objects 
  for insert with check (bucket_id = 'payment_screenshots');
create policy "Public download access payment_screenshots" on storage.objects 
  for select using (bucket_id = 'payment_screenshots');

create policy "Authenticated upload access sponsor_documents" on storage.objects 
  for insert with check (bucket_id = 'sponsor_documents');
create policy "Public download access sponsor_documents" on storage.objects 
  for select using (bucket_id = 'sponsor_documents');

create policy "Authenticated upload access payment_qr" on storage.objects 
  for insert with check (bucket_id = 'payment_qr');
create policy "Public download access payment_qr" on storage.objects 
  for select using (bucket_id = 'payment_qr');

create policy "Authenticated update access payment_qr" on storage.objects 
  for update with check (bucket_id = 'payment_qr');
create policy "Authenticated delete access payment_qr" on storage.objects 
  for delete using (bucket_id = 'payment_qr');

-- Premium assets buckets policies
create policy "Authenticated upload access profile_banners" on storage.objects 
  for insert with check (bucket_id = 'profile_banners');
create policy "Public download access profile_banners" on storage.objects 
  for select using (bucket_id = 'profile_banners');
create policy "Authenticated delete access profile_banners" on storage.objects 
  for delete using (bucket_id = 'profile_banners');

create policy "Authenticated upload access premium_badges" on storage.objects 
  for insert with check (bucket_id = 'premium_badges');
create policy "Public download access premium_badges" on storage.objects 
  for select using (bucket_id = 'premium_badges');
create policy "Authenticated delete access premium_badges" on storage.objects 
  for delete using (bucket_id = 'premium_badges');

create policy "Authenticated upload access premium_frames" on storage.objects 
  for insert with check (bucket_id = 'premium_frames');
create policy "Public download access premium_frames" on storage.objects 
  for select using (bucket_id = 'premium_frames');
create policy "Authenticated delete access premium_frames" on storage.objects 
  for delete using (bucket_id = 'premium_frames');

create policy "Authenticated upload access premium_stickers" on storage.objects 
  for insert with check (bucket_id = 'premium_stickers');
create policy "Public download access premium_stickers" on storage.objects 
  for select using (bucket_id = 'premium_stickers');
create policy "Authenticated delete access premium_stickers" on storage.objects 
  for delete using (bucket_id = 'premium_stickers');


-- CRITICAL FIX: Ensure Daily Reward columns exist on users
alter table public.users
add column if not exists last_daily_reward_claimed_at timestamptz;

alter table public.users
add column if not exists coins integer default 0;


-- CRITICAL FIX: Ensure Tournament management columns exist on tournaments
alter table public.tournaments
add column if not exists description text,
add column if not exists banner_url text,
add column if not exists entry_fee text default 'Free',
add column if not exists max_players integer default 100,
add column if not exists registration_deadline timestamp with time zone,
add column if not exists tournament_start timestamp with time zone,
add column if not exists tournament_end timestamp with time zone;


-- DIAMOND ECONOMY PATCH
alter table public.users
add column if not exists diamonds integer default 0,
add column if not exists topup_diamonds integer default 0,
add column if not exists winning_diamonds integer default 0;

create table if not exists public.diamond_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    wallet_type text not null default 'topup', -- 'topup', 'winning'
    transaction_type text not null default 'topup_purchase', -- 'topup_purchase', 'manual_credit', 'tournament_entry', 'tournament_prize', 'withdraw_request', 'withdraw_paid', 'adjustment'
    diamonds integer not null,
    bonus integer default 0,
    total_credited integer not null,
    price_paid numeric(10,2) not null,
    status text not null default 'pending', -- 'pending', 'approved', 'rejected', 'paid'
    transaction_id text,
    payment_screenshot_url text,
    note text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_diamond_transactions_user_id on public.diamond_transactions(user_id);
alter table public.diamond_transactions enable row level security;
create policy "Allow read access to diamond_transactions" on public.diamond_transactions
    for select using (true);
create policy "Allow write access to own diamond_transactions" on public.diamond_transactions
    for insert with check (true);
create policy "Allow update access to diamond_transactions is admin check" on public.diamond_transactions
    for update using (true);




