CREATE TABLE user_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id    UUID NOT NULL REFERENCES subjects(id),
  topic_id      UUID REFERENCES topics(id),
  correct_count INTEGER DEFAULT 0,
  total_count   INTEGER DEFAULT 0,
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject_id, topic_id)
);
