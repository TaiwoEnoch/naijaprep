CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone            VARCHAR(15) UNIQUE NOT NULL,
  first_name       VARCHAR(50) NOT NULL,
  last_name        VARCHAR(50),
  pin_hash         TEXT NOT NULL,
  plan             VARCHAR(20) DEFAULT 'free'
                     CHECK (plan IN ('free','student','school')),
  plan_expires_at  TIMESTAMPTZ,
  exam_types       TEXT[] DEFAULT '{}',
  target_score     INTEGER DEFAULT 280,
  exam_date        DATE,
  state            VARCHAR(50),
  school_id        UUID REFERENCES schools(id),
  role             VARCHAR(20) DEFAULT 'student'
                     CHECK (role IN ('student','teacher','admin')),
  avatar_url       TEXT,
  streak_count     INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_active_date DATE,
  predicted_score  INTEGER DEFAULT 0,
  readiness_pct    INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_subjects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id         UUID NOT NULL,
  exam_type          VARCHAR(10) NOT NULL,
  avg_score          INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  last_practiced_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject_id, exam_type)
);
