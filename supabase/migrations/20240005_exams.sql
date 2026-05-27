CREATE TABLE exam_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id         UUID REFERENCES subjects(id),
  exam_type          VARCHAR(10) NOT NULL,
  mode               VARCHAR(20) NOT NULL
                       CHECK (mode IN ('practice','mock','topic','speed')),
  status             VARCHAR(20) DEFAULT 'active'
                       CHECK (status IN ('active','completed','abandoned')),
  total_questions    INTEGER NOT NULL,
  time_limit_seconds INTEGER NOT NULL,
  server_start_time  TIMESTAMPTZ DEFAULT NOW(),
  submitted_at       TIMESTAMPTZ,
  score              INTEGER,
  score_pct          INTEGER,
  time_taken_seconds INTEGER,
  integrity_flags    INTEGER DEFAULT 0,
  is_personal_best   BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id           UUID NOT NULL REFERENCES questions(id),
  chosen_option         CHAR(1) CHECK (chosen_option IN ('A','B','C','D')),
  is_correct            BOOLEAN,
  is_flagged            BOOLEAN DEFAULT false,
  time_on_question_secs INTEGER,
  answered_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);
