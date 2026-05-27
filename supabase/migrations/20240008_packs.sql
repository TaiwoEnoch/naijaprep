CREATE TABLE offline_packs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id     UUID NOT NULL REFERENCES subjects(id),
  exam_type      VARCHAR(10) NOT NULL,
  version        INTEGER DEFAULT 1,
  size_bytes     BIGINT,
  question_count INTEGER,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_pack_downloads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id       UUID NOT NULL REFERENCES offline_packs(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);
