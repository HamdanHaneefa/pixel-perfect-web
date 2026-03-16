-- Habits table: stores habit names per user
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  "order" integer not null default 0,
  created_at timestamptz default now()
);

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
