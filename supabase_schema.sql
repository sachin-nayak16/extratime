-- ─── EXTRA TIME — SUPABASE SCHEMA ────────────────────────────
-- Run this entire file in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)

-- 1. DAILY CONTENT
-- Stores each day's questions, riddle, matches, and WC Hero
create table if not exists daily_content (
  date           date primary key,
  quiz_questions jsonb,      -- array of {question, options, answer, difficulty, explanation}
  riddle         jsonb,      -- {riddle, answer, accepted, hint}
  matches        jsonb,      -- array of match objects with squads
  wc_hero        jsonb,      -- {name, firstName, display, confederation, country, ...}
  created_at     timestamptz default now()
);

-- 2. USER PROFILES
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  avatar_color text default '#e0f2fe',
  created_at   timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 3. DAILY SCORES
-- One row per user per game per day
create table if not exists daily_scores (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  date       date not null,
  game       text not null,   -- 'crossword', 'quiz', 'predictor', 'decode', 'heroes'
  score      int,
  metadata   jsonb,           -- extra data (guesses, time taken, etc.)
  updated_at timestamptz default now(),
  unique(user_id, date, game)
);

-- 4. LEADERBOARD
-- Daily total per user
create table if not exists leaderboard (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  date        date not null,
  total_score int default 0,
  updated_at  timestamptz default now(),
  unique(user_id, date)
);

-- 5. PREDICTIONS
-- Locked predictions per user per day
create table if not exists predictions (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  date        date not null,
  predictions jsonb not null,
  created_at  timestamptz default now(),
  unique(user_id, date)
);

-- 6. STREAKS
create table if not exists user_streaks (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  streak_days int default 0,
  last_played date,
  longest     int default 0,
  updated_at  timestamptz default now()
);

-- 7. VIEWS for leaderboard

-- Today's leaderboard
create or replace view leaderboard_view_today as
select
  p.username,
  p.avatar_color,
  l.total_score,
  coalesce(s.streak_days, 0) as streak_days
from leaderboard l
join profiles p on p.id = l.user_id
left join user_streaks s on s.user_id = l.user_id
where l.date = current_date
order by l.total_score desc;

-- All-time leaderboard (sum of all daily scores)
create or replace view leaderboard_alltime_view as
select
  p.username,
  p.avatar_color,
  sum(l.total_score) as total_score,
  coalesce(s.longest, 0) as streak_days
from leaderboard l
join profiles p on p.id = l.user_id
left join user_streaks s on s.user_id = l.user_id
group by p.username, p.avatar_color, s.longest
order by total_score desc;

-- 8. ROW LEVEL SECURITY
alter table daily_content  enable row level security;
alter table profiles       enable row level security;
alter table daily_scores   enable row level security;
alter table leaderboard    enable row level security;
alter table predictions    enable row level security;
alter table user_streaks   enable row level security;

-- Public can read daily content and leaderboard
create policy "Public can read daily content"
  on daily_content for select using (true);

create policy "Public can read leaderboard"
  on leaderboard for select using (true);

create policy "Public can read profiles"
  on profiles for select using (true);

create policy "Public can read streaks"
  on user_streaks for select using (true);

-- Users can only write their own data
create policy "Users manage own scores"
  on daily_scores for all using (auth.uid() = user_id);

create policy "Users manage own leaderboard"
  on leaderboard for all using (auth.uid() = user_id);

create policy "Users manage own predictions"
  on predictions for all using (auth.uid() = user_id);

create policy "Users manage own streaks"
  on user_streaks for all using (auth.uid() = user_id);

create policy "Users manage own profile"
  on profiles for all using (auth.uid() = id);
