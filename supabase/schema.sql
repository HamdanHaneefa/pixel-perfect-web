-- Habits table: stores habit names per user
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  "order" integer not null default 0,
  goal integer not null default 0,
  created_at timestamptz default now()
);

-- Migration: add goal column if upgrading existing DB
-- alter table habits add column if not exists goal integer not null default 0;

-- NOTE: Default habits are seeded client-side in useHabitData.ts
-- when a new user logs in and has 0 habits.

-- Habit logs table: stores checkbox state per day
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  year integer not null,
  month integer not null,
  day integer not null,
  completed boolean not null default false,
  unique(habit_id, year, month, day)
);

-- Row Level Security: users can only see/edit their own data
alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Users can manage their own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own habit logs"
  on habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Daily todos table
create table if not exists todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  completed boolean not null default false,
  date date not null, -- YYYY-MM-DD
  created_at timestamptz default now()
);

alter table todos enable row level security;

create policy "Users can manage their own todos"
  on todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Future-day protection: backend blocks writes for future dates ──────────
-- Drop the permissive all-operations policy and replace with split policies
-- that enforce: INSERT/UPDATE only allowed for today or past days.

drop policy if exists "Users can manage their own habit logs" on habit_logs;

-- SELECT: can read all own logs (including future months for display)
create policy "Users can read their own habit logs"
  on habit_logs for select
  using (auth.uid() = user_id);

-- INSERT: only allowed if the date is today or in the past
create policy "Users can insert past/today habit logs"
  on habit_logs for insert
  with check (
    auth.uid() = user_id
    and make_date(year, month + 1, day) <= current_date
  );

-- UPDATE: only allowed if the date is today or in the past
create policy "Users can update past/today habit logs"
  on habit_logs for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and make_date(year, month + 1, day) <= current_date
  );

-- DELETE: allowed for own logs (no date restriction needed for deletes)
create policy "Users can delete their own habit logs"
  on habit_logs for delete
  using (auth.uid() = user_id);

-- ── Month-scoped habits migration ─────────────────────────────────────────
-- Add year and month columns to habits so each month has its own habit list
alter table habits add column if not exists year integer not null default 2026;
alter table habits add column if not exists month integer not null default 2;

-- Update the unique constraint / index if needed
-- Users can now have the same habit name in different months
