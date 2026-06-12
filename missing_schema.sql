-- ====================================================================
-- Gaming Career Hub - Missing Tables & Storage Migration Script
-- ====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. TEAMS TABLE
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

-- 2. TEAM MEMBERS TABLE
create table if not exists public.team_members (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    role text not null default 'Member',
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(team_id, user_id)
);

-- 3. TOURNAMENTS TABLE
create table if not exists public.tournaments (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    game text not null,
    prize_pool text not null,
    status text not null default 'upcoming',
    registration_type text not null default 'team',
    max_teams integer default 16,
    rules text[] default '{}'::text[],
    schedule jsonb default '[]'::jsonb,
    winners jsonb default '[]'::jsonb,
    bracket jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TOURNAMENT REGISTRATIONS TABLE
create table if not exists public.tournament_registrations (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid not null references public.tournaments(id) on delete cascade,
    team_id uuid references public.teams(id) on delete cascade,
    user_id uuid references public.users(id) on delete cascade,
    status text not null default 'pending',
    contact_email text not null,
    registered_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. PAYMENTS TABLE
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    plan text not null,
    amount decimal(10,2) not null,
    transaction_id text not null unique,
    status text not null default 'pending',
    screenshot_url text,
    coupon_applied text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. MEMBERSHIPS TABLE
create table if not exists public.memberships (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    plan text not null,
    start_date timestamp with time zone default timezone('utc'::text, now()) not null,
    expiry_date timestamp with time zone not null
);

-- 7. MESSAGES TABLE
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references public.users(id) on delete cascade,
    receiver_id uuid references public.users(id) on delete cascade,
    team_id uuid references public.teams(id) on delete cascade,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. NOTIFICATIONS TABLE
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    content text not null,
    type text not null default 'info',
    read boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. ACHIEVEMENTS TABLE
create table if not exists public.achievements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    achievement_name text not null,
    unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, achievement_name)
);

-- 10. REFERRALS TABLE
create table if not exists public.referrals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    referred_user uuid not null references public.users(id) on delete cascade unique,
    reward_claimed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. SPONSOR APPLICATIONS TABLE
create table if not exists public.sponsor_applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    company_name text not null,
    pitch text not null,
    monthly_reach text,
    media_kit_stats text,
    contact_email text not null,
    status text not null default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. ADMIN SETTINGS
create table if not exists public.admin_settings (
    id integer primary key default 1 check (id = 1),
    qr_code_url text not null,
    upi_id text,
    active_coupons jsonb default '[]'::jsonb,
    badges jsonb default '[]'::jsonb,
    sticker_packs jsonb default '[]'::jsonb,
    profile_frames jsonb default '[]'::jsonb,
    profile_banners jsonb default '[]'::jsonb,
    premium_rewards jsonb default '[]'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for optimal performance
create index if not exists idx_teams_owner_id on public.teams(owner_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_tourney_reg_tour_id on public.tournament_registrations(tournament_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_receiver_id on public.messages(receiver_id);
create index if not exists idx_messages_team_id on public.messages(team_id);
create index if not exists idx_notif_user_id on public.notifications(user_id);

-- Enable RLS
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

-- Basic Permissive Policies (Aligned with client-side/universal read & write layout)
create policy "Allow public read access to teams" on public.teams for select using (true);
create policy "Allow full actions on teams" on public.teams for all using (true) with check (true);

create policy "Allow select access to team members" on public.team_members for select using (true);
create policy "Allow full actions on team members" on public.team_members for all using (true) with check (true);

create policy "Allow public read to tournaments" on public.tournaments for select using (true);
create policy "Allow full actions on tournaments" on public.tournaments for all using (true) with check (true);

create policy "Everyone can view registrations" on public.tournament_registrations for select using (true);
create policy "Allow full actions on registrations" on public.tournament_registrations for all using (true) with check (true);

create policy "Allow select payments" on public.payments for select using (true);
create policy "Allow full actions on payments" on public.payments for all using (true) with check (true);

create policy "Allow select memberships" on public.memberships for select using (true);
create policy "Allow full actions on memberships" on public.memberships for all using (true) with check (true);

create policy "Allow select messages" on public.messages for select using (true);
create policy "Allow full actions on messages" on public.messages for all using (true) with check (true);

create policy "Allow select notifications" on public.notifications for select using (true);
create policy "Allow full actions on notifications" on public.notifications for all using (true) with check (true);

create policy "Allow select achievements" on public.achievements for select using (true);
create policy "Allow full actions on achievements" on public.achievements for all using (true) with check (true);

create policy "Allow select referrals" on public.referrals for select using (true);
create policy "Allow full actions on referrals" on public.referrals for all using (true) with check (true);

create policy "Allow select sponsor applications" on public.sponsor_applications for select using (true);
create policy "Allow full actions on sponsor applications" on public.sponsor_applications for all using (true) with check (true);

create policy "Allow select admin settings" on public.admin_settings for select using (true);
create policy "Allow full actions on admin settings" on public.admin_settings for all using (true) with check (true);

-- Realtime Configuration
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.teams;

-- Create missing storage buckets
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

-- Setup bucket storage policies
create policy "Allow public upload and download profile_photos" on storage.objects 
  for all using (bucket_id = 'profile_photos') with check (bucket_id = 'profile_photos');

create policy "Allow public upload and download team_logos" on storage.objects 
  for all using (bucket_id = 'team_logos') with check (bucket_id = 'team_logos');

create policy "Allow public upload and download payment_screenshots" on storage.objects 
  for all using (bucket_id = 'payment_screenshots') with check (bucket_id = 'payment_screenshots');

create policy "Allow public upload and download sponsor_documents" on storage.objects 
  for all using (bucket_id = 'sponsor_documents') with check (bucket_id = 'sponsor_documents');

create policy "Allow public upload and download payment_qr" on storage.objects 
  for all using (bucket_id = 'payment_qr') with check (bucket_id = 'payment_qr');

create policy "Allow public upload and download profile_banners" on storage.objects 
  for all using (bucket_id = 'profile_banners') with check (bucket_id = 'profile_banners');

create policy "Allow public upload and download premium_badges" on storage.objects 
  for all using (bucket_id = 'premium_badges') with check (bucket_id = 'premium_badges');

create policy "Allow public upload and download premium_frames" on storage.objects 
  for all using (bucket_id = 'premium_frames') with check (bucket_id = 'premium_frames');

create policy "Allow public upload and download premium_stickers" on storage.objects 
  for all using (bucket_id = 'premium_stickers') with check (bucket_id = 'premium_stickers');


-- ====================================================================
-- Phase 6.3 TOURNAMENT MATCHES TABLE
-- ====================================================================

create table if not exists public.tournament_matches (
    id uuid primary key default gen_random_uuid(),
    tournament_id text not null,
    round_number integer not null,
    match_number integer not null,
    player1_user_id uuid references public.users(id) on delete set null,
    player2_user_id uuid references public.users(id) on delete set null,
    team1_id uuid references public.teams(id) on delete set null,
    team2_id uuid references public.teams(id) on delete set null,
    winner_user_id uuid references public.users(id) on delete set null,
    winner_team_id uuid references public.teams(id) on delete set null,
    status text default 'pending' not null,
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tournament_matches enable row level security;

-- RLS Policies
drop policy if exists "Everyone can view tournament matches" on public.tournament_matches;
drop policy if exists "Allow full actions on tournament matches" on public.tournament_matches;

create policy "Everyone can view tournament matches" on public.tournament_matches
    for select using (true);

create policy "Allow full actions on tournament matches" on public.tournament_matches
    for all using (true) with check (true);


-- SPONSOR MARKETPLACE & ANALYTICS TABLES
create table if not exists public.sponsors (
    id uuid primary key default gen_random_uuid(),
    company_name text not null,
    logo_url text,
    website_url text,
    banner_url text,
    description text,
    active boolean default true,
    start_date date,
    end_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    views integer default 0
);

create table if not exists public.sponsor_clicks (
    id uuid primary key default gen_random_uuid(),
    sponsor_id uuid references public.sponsors(id) on delete cascade,
    user_id uuid references public.users(id) on delete set null,
    clicked_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sponsors enable row level security;
alter table public.sponsor_clicks enable row level security;

create policy "Allow select sponsors" on public.sponsors
    for select using (true);
create policy "Allow insert sponsors admin" on public.sponsors
    for insert with check (true);
create policy "Allow update sponsors admin" on public.sponsors
    for update using (true);
create policy "Allow delete sponsors admin" on public.sponsors
    for delete using (true);

create policy "Allow select sponsor_clicks" on public.sponsor_clicks
    for select using (true);
create policy "Allow insert sponsor_clicks" on public.sponsor_clicks
    for insert with check (true);


