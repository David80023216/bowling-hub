-- ============================================
-- BOWLING HUB - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  usbc_member_id TEXT,
  bowl_com_username TEXT,
  home_center TEXT,
  city TEXT,
  state TEXT,
  avatar_url TEXT,
  current_average NUMERIC(5,2) DEFAULT 0,
  high_game INTEGER DEFAULT 0,
  high_series INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAGUES
-- ============================================
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  center_name TEXT,
  lss_id TEXT,
  season TEXT,
  day_of_week TEXT,
  start_time TEXT,
  num_teams INTEGER,
  num_weeks INTEGER,
  current_week INTEGER DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAGUE MEMBERS (bowlers in a league)
-- ============================================
CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  bowler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_name TEXT,
  team_number INTEGER,
  league_average NUMERIC(5,2) DEFAULT 0,
  games_bowled INTEGER DEFAULT 0,
  total_pins INTEGER DEFAULT 0,
  handicap INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, bowler_id)
);

-- ============================================
-- SCORES (individual game scores)
-- ============================================
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bowler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_number INTEGER,
  game_number INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 300),
  series_id UUID,
  is_practice BOOLEAN DEFAULT false,
  lane_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERIES (group of games in one session)
-- ============================================
CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bowler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_pins INTEGER NOT NULL DEFAULT 0,
  num_games INTEGER NOT NULL DEFAULT 3,
  average NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HONOR SCORES
-- ============================================
CREATE TABLE public.honor_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bowler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('300_game', '299_game', '298_game', '800_series', '11_in_a_row', 'other')),
  score INTEGER NOT NULL,
  date DATE,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  center_name TEXT,
  certified BOOLEAN DEFAULT false,
  usbc_award_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STANDINGS (team standings per league)
-- ============================================
CREATE TABLE public.standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_number INTEGER,
  wins NUMERIC(5,1) DEFAULT 0,
  losses NUMERIC(5,1) DEFAULT 0,
  total_pins INTEGER DEFAULT 0,
  team_average NUMERIC(5,2) DEFAULT 0,
  handicap INTEGER DEFAULT 0,
  points_won NUMERIC(5,1) DEFAULT 0,
  points_lost NUMERIC(5,1) DEFAULT 0,
  position INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_name)
);

-- ============================================
-- SCHEDULE (weekly matchups)
-- ============================================
CREATE TABLE public.schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  date DATE,
  team_1 TEXT NOT NULL,
  team_1_number INTEGER,
  team_2 TEXT NOT NULL,
  team_2_number INTEGER,
  lanes TEXT,
  is_position_round BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHALLENGES (bowler vs bowler wagers)
-- ============================================
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('high_series', 'high_game', 'head_to_head', 'pins_over_average', 'total_pins')),
  wager_description TEXT NOT NULL,
  wager_amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'active', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  league_id UUID REFERENCES public.leagues(id),
  challenger_score INTEGER,
  challenged_score INTEGER,
  winner_id UUID REFERENCES public.profiles(id),
  terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SYNC LOG (track scraping history)
-- ============================================
CREATE TABLE public.sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Profiles: public read, own write
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Leagues: public read, creator can edit
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leagues are viewable by everyone" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Users can create leagues" ON public.leagues FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update league" ON public.leagues FOR UPDATE USING (auth.uid() = created_by);

-- League Members: public read
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "League members viewable by everyone" ON public.league_members FOR SELECT USING (true);
CREATE POLICY "Users can join leagues" ON public.league_members FOR INSERT WITH CHECK (auth.uid() = bowler_id);
CREATE POLICY "Users can update own membership" ON public.league_members FOR UPDATE USING (auth.uid() = bowler_id);

-- Scores: own read/write, league members can view
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scores" ON public.scores FOR SELECT USING (auth.uid() = bowler_id);
CREATE POLICY "Users can insert own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = bowler_id);
CREATE POLICY "Users can update own scores" ON public.scores FOR UPDATE USING (auth.uid() = bowler_id);
CREATE POLICY "Users can delete own scores" ON public.scores FOR DELETE USING (auth.uid() = bowler_id);

-- Series
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own series" ON public.series FOR SELECT USING (auth.uid() = bowler_id);
CREATE POLICY "Users can insert own series" ON public.series FOR INSERT WITH CHECK (auth.uid() = bowler_id);

-- Honor Scores: public read (these are achievements!)
ALTER TABLE public.honor_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Honor scores viewable by everyone" ON public.honor_scores FOR SELECT USING (true);
CREATE POLICY "Users can insert own honors" ON public.honor_scores FOR INSERT WITH CHECK (auth.uid() = bowler_id);
CREATE POLICY "Users can update own honors" ON public.honor_scores FOR UPDATE USING (auth.uid() = bowler_id);

-- Standings: public read
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Standings viewable by everyone" ON public.standings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert standings" ON public.standings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update standings" ON public.standings FOR UPDATE USING (true);

-- Schedule: public read
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedule viewable by everyone" ON public.schedule FOR SELECT USING (true);
CREATE POLICY "Anyone can insert schedule" ON public.schedule FOR INSERT WITH CHECK (true);

-- Challenges: participants can see
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own challenges" ON public.challenges FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);
CREATE POLICY "Users can view all active challenges" ON public.challenges FOR SELECT USING (status = 'active' OR status = 'completed');
CREATE POLICY "Users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Participants can update challenges" ON public.challenges FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- Sync Log: public read
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sync log viewable by everyone" ON public.sync_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sync log" ON public.sync_log FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON public.leagues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
