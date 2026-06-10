-- GAME PORTAL CAREER HUB - PHASE 5 SOCIAL & CHAT MIGRATION
-- This script contains table definitions, constraints, indexes, Row Level Security (RLS) policies, and Realtime setups.

-- 1. ENABLE ROW LEVEL SECURITY BY DEFAULT on all schema elements
-- If public.users and public.gamer_profiles are already created, we ensure they are clean.

-- A. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- B. FRIEND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id_status TEXT DEFAULT 'pending' CHECK (id_status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_friend_request_pair UNIQUE (sender_id, receiver_id),
    CONSTRAINT no_self_friend_request CHECK (sender_id <> receiver_id)
);

-- C. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    is_group BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- D. CONVERSATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_conv_member UNIQUE (conversation_id, user_id)
);

-- E. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- F. POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INT DEFAULT 0 NOT NULL,
    comments_count INT DEFAULT 0 NOT NULL,
    is_reported BOOLEAN DEFAULT false NOT NULL,
    report_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- G. POST LIKES TABLE
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_post_user_like UNIQUE (post_id, user_id)
);

-- H. POST COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_reported BOOLEAN DEFAULT false NOT NULL,
    report_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- I. RE-STRUCTURED/ENSURED NOTIFICATIONS TABLE WITH LINK_ID support
-- This will create or adapt the existing table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    link_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- J. CHAT REPORTS TABLE (For Admin Review Panel)
CREATE TABLE IF NOT EXISTS public.chat_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- 2. CREATE INDEXES FOR EXCELLENT PERFORMANCE
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE (read = false);

-- =======================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) FOR ALL NEW TABLES
-- =======================================================
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;

-- =======================================================
-- 4. ATTACH SECURITY POLICIES FOR SECURE PER-USER ISOLATION
-- =======================================================

-- Follows Security
CREATE POLICY "Users can view all follows" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can remove their own follows" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id);

-- Friend Requests Security
CREATE POLICY "Users can view relevant friend requests" ON public.friend_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert their own friend requests" ON public.friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update relevant friend requests" ON public.friend_requests
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete relevant friend requests" ON public.friend_requests
    FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Conversations Security
CREATE POLICY "Users can view conversations they are member of" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members cm 
            WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert conversations" ON public.conversations
    FOR INSERT WITH CHECK (true);

-- Conversation Members Security
CREATE POLICY "Users can view members of their conversations" ON public.conversation_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members cm 
            WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert member additions to conversations" ON public.conversation_members
    FOR INSERT WITH CHECK (true);

-- Chat Messages Security
CREATE POLICY "Users can view messages in member conversations" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages as themselves only" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of messages in member conversations" ON public.chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
        )
    );

-- Posts Security
CREATE POLICY "Anyone can read public posts" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.membership = 'Platinum' AND u.id IN (SELECT creatorId FROM public.teams LIMIT 1) -- representative admin check fallback
    ));

CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Post Likes Security
CREATE POLICY "Anyone can view post likes" ON public.post_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert post likes as themselves" ON public.post_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own post likes" ON public.post_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Post Comments Security
CREATE POLICY "Anyone can view post comments" ON public.post_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create comments as themselves" ON public.post_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.post_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Notifications Security
CREATE POLICY "Users can view only their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update only their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Chat Reports Security
CREATE POLICY "Users can submit chat reports" ON public.chat_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Only admins can view chat reports" ON public.chat_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.email = 'pkumar15187@gmail.com' -- Admin designated email or flag
        )
    );

-- =======================================================
-- 5. REALTIME PUBLICATION VIA CHANNEL SETUP
-- =======================================================
-- Ensure Realtime publications are turned on for chat_messages, notifications, posts and comments
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.follows;


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


-- =======================================================
-- PHASE 6.2 TOURNAMENT REGISTRATIONS MIGRATION
-- =======================================================
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    registration_type TEXT NOT NULL DEFAULT 'solo',
    status TEXT DEFAULT 'pending' NOT NULL,
    payment_status TEXT DEFAULT 'unneeded' NOT NULL,
    transaction_id TEXT,
    payment_screenshot_url TEXT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely ensure columns exist if table was already created in earlier trials
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'solo';
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unneeded';
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies
DROP POLICY IF EXISTS "Everyone can view registrations" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Allow full actions on registrations" ON public.tournament_registrations;

CREATE POLICY "Everyone can view registrations" ON public.tournament_registrations
    FOR SELECT USING (true);

CREATE POLICY "Allow full actions on registrations" ON public.tournament_registrations
    FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- Phase 6.3 TOURNAMENT MATCHES TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    player2_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    team1_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    team2_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    winner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    winner_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Everyone can view tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Allow full actions on tournament matches" ON public.tournament_matches;

CREATE POLICY "Everyone can view tournament matches" ON public.tournament_matches
    FOR SELECT USING (true);

CREATE POLICY "Allow full actions on tournament matches" ON public.tournament_matches
    FOR ALL USING (true) WITH CHECK (true);




