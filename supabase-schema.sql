-- ================================================================
-- TO BLOOM — Complete Supabase Schema
-- Run the entire file in your Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS guards
-- ================================================================

-- ── Extend existing tables ───────────────────────────────────────
ALTER TABLE tasks   ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS user_id text;

-- ── Drop old open policies ────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all" ON tasks;
DROP POLICY IF EXISTS "Allow all" ON courses;

-- ── New tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timetable_slots (
  id         text PRIMARY KEY,
  user_id    text NOT NULL,
  day        smallint NOT NULL CHECK (day BETWEEN 0 AND 6), -- 0=Mon
  start_time text NOT NULL,   -- "09:00"
  end_time   text NOT NULL,   -- "10:30"
  subject    text NOT NULL,
  room       text,
  color      text NOT NULL DEFAULT '#f5c6c6',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grade_entries (
  id          text PRIMARY KEY,
  user_id     text NOT NULL,
  course_name text NOT NULL,
  assessment  text NOT NULL,
  grade       numeric NOT NULL CHECK (grade BETWEEN 0 AND 100),
  weight      numeric NOT NULL DEFAULT 100 CHECK (weight BETWEEN 0 AND 100),
  exam_date   text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_entries (
  id          text PRIMARY KEY,
  user_id     text NOT NULL,
  type        text NOT NULL CHECK (type IN ('income','expense')),
  category    text NOT NULL,
  description text NOT NULL,
  amount      numeric NOT NULL CHECK (amount >= 0),
  date        text NOT NULL,
  month       text NOT NULL,   -- "YYYY-MM"
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_goals (
  id             text PRIMARY KEY,
  user_id        text NOT NULL,
  name           text NOT NULL,
  target_amount  numeric NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0,
  deadline       text,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id          text PRIMARY KEY,
  user_id     text NOT NULL,
  title       text NOT NULL,
  url         text,
  type        text NOT NULL CHECK (type IN ('link','book','paper','video','other')),
  course_name text,
  notes       text,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id            text PRIMARY KEY,
  user_id       text NOT NULL,
  title         text NOT NULL,
  description   text,
  target_value  numeric NOT NULL DEFAULT 100,
  current_value numeric NOT NULL DEFAULT 0,
  unit          text DEFAULT '%',
  deadline      text,
  color         text NOT NULL DEFAULT '#f5c6c6',
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wellness_logs (
  id            text PRIMARY KEY,
  user_id       text NOT NULL,
  date          text NOT NULL,   -- "YYYY-MM-DD"
  mood          smallint CHECK (mood BETWEEN 1 AND 5),
  sleep_hours   numeric CHECK (sleep_hours BETWEEN 0 AND 24),
  water_glasses smallint CHECK (water_glasses >= 0),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

-- ── Realtime (wrapped in DO to ignore duplicates) ─────────────────
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE timetable_slots; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE grade_entries;   EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE budget_entries;  EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE budget_goals;    EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE resources;       EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE goals;           EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE wellness_logs;   EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ── RLS helper ────────────────────────────────────────────────────
-- Authenticated users own rows where user_id = auth.uid()
-- Guest users (no session) own rows where user_id LIKE 'guest-%'
CREATE OR REPLACE FUNCTION is_own_row(row_uid text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    (auth.uid() IS NOT NULL AND auth.uid()::text = row_uid)
    OR
    (auth.uid() IS NULL AND row_uid LIKE 'guest-%')
  );
END; $$;

-- ── Enable RLS ────────────────────────────────────────────────────
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_logs   ENABLE ROW LEVEL SECURITY;

-- ── Policies ─────────────────────────────────────────────────────
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tasks','courses','timetable_slots','grade_entries',
    'budget_entries','budget_goals','resources','goals','wellness_logs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "user_own" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "user_own" ON %I FOR ALL USING (is_own_row(user_id)) WITH CHECK (is_own_row(user_id))',
      t
    );
  END LOOP;
END $$;
