CREATE TABLE subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  slug       VARCHAR(50) UNIQUE NOT NULL,
  icon       VARCHAR(50),
  exam_types TEXT[] NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE topics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  slug       VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(subject_id, slug)
);

CREATE TABLE questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id     UUID NOT NULL REFERENCES subjects(id),
  topic_id       UUID REFERENCES topics(id),
  exam_type      VARCHAR(10) NOT NULL CHECK (exam_type IN ('JAMB','WAEC','NECO')),
  year           INTEGER NOT NULL,
  question_text  TEXT NOT NULL,
  option_a       TEXT NOT NULL,
  option_b       TEXT NOT NULL,
  option_c       TEXT NOT NULL,
  option_d       TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  explanation    TEXT,
  difficulty     VARCHAR(10) DEFAULT 'medium'
                   CHECK (difficulty IN ('easy','medium','hard')),
  times_answered INTEGER DEFAULT 0,
  times_correct  INTEGER DEFAULT 0,
  image_url      TEXT,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
