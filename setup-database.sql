-- ============================================================
--  Bloom – Complete Database Setup
--  Run this once in Supabase SQL Editor to create all tables.
-- ============================================================

-- ── 1. TASKS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          uuid        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        text        NOT NULL,
  course      text,
  priority    text        NOT NULL DEFAULT 'normal',
  due         date,
  done        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.tasks;
CREATE POLICY "Allow all for owner" ON public.tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;


-- ── 2. COURSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id          uuid        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  color       text        NOT NULL DEFAULT '#f5c6c6',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.courses;
CREATE POLICY "Allow all for owner" ON public.courses
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;


-- ── 3. TIMETABLE SLOTS ───────────────────────────────────────
--  (the app calls this table "timetable_slots", not "timetable_classes")
CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id          uuid        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day         smallint    NOT NULL,          -- 1=Mon … 7=Sun
  start_time  text        NOT NULL,          -- "HH:MM"
  end_time    text        NOT NULL,          -- "HH:MM"
  subject     text        NOT NULL,
  room        text,
  color       text        NOT NULL DEFAULT '#c6daf5',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.timetable_slots;
CREATE POLICY "Allow all for owner" ON public.timetable_slots
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_slots;


-- ── 4. GRADE ENTRIES ─────────────────────────────────────────
--  (the app calls this table "grade_entries", not "grades")
CREATE TABLE IF NOT EXISTS public.grade_entries (
  id           uuid        PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name  text        NOT NULL,
  assessment   text        NOT NULL,
  grade        numeric     NOT NULL,
  weight       numeric     NOT NULL DEFAULT 100,
  exam_date    date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.grade_entries;
CREATE POLICY "Allow all for owner" ON public.grade_entries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_entries;


-- ── 5. BUDGET ENTRIES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_entries (
  id           uuid        PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text        NOT NULL,         -- 'income' | 'expense'
  category     text        NOT NULL,
  description  text        NOT NULL,
  amount       numeric     NOT NULL,
  date         date        NOT NULL,
  month        text        NOT NULL,         -- "YYYY-MM"
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.budget_entries;
CREATE POLICY "Allow all for owner" ON public.budget_entries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_entries;


-- ── 6. BUDGET GOALS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_goals (
  id              uuid        PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  target_amount   numeric     NOT NULL,
  current_amount  numeric     NOT NULL DEFAULT 0,
  deadline        date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.budget_goals;
CREATE POLICY "Allow all for owner" ON public.budget_goals
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_goals;


-- ── 7. RESOURCES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resources (
  id           uuid        PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  url          text,
  type         text        NOT NULL DEFAULT 'link',  -- link|book|paper|video|other
  course_name  text,
  notes        text,
  read         boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.resources;
CREATE POLICY "Allow all for owner" ON public.resources
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;


-- ── 8. GOALS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id             uuid        PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  description    text,
  current_value  numeric     NOT NULL DEFAULT 0,
  target_value   numeric     NOT NULL,
  unit           text        NOT NULL DEFAULT '%',
  deadline       date,
  color          text        NOT NULL DEFAULT '#c6daf5',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.goals;
CREATE POLICY "Allow all for owner" ON public.goals
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;


-- ── 9. WELLNESS LOGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wellness_logs (
  id             uuid        PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           date        NOT NULL,
  mood           text,
  sleep_hours    numeric,
  water_glasses  smallint,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)     -- upsert key used by the app
);

ALTER TABLE public.wellness_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for owner" ON public.wellness_logs;
CREATE POLICY "Allow all for owner" ON public.wellness_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.wellness_logs;
