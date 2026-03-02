-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- COURSES table
create table if not exists courses (
  id text primary key,
  name text not null,
  color text not null,
  created_at timestamptz default now()
);

-- TASKS table
create table if not exists tasks (
  id text primary key,
  text text not null,
  course text references courses(id) on delete set null,
  priority text not null default 'normal',
  due text,
  done boolean not null default false,
  created_at timestamptz default now()
);

-- Enable Realtime for both tables
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table courses;

-- Allow anonymous access (no auth needed — anyone with your URL can use it)
-- If you want to keep it private, you can add Supabase Auth later
alter table tasks enable row level security;
alter table courses enable row level security;

create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on courses for all using (true) with check (true);
