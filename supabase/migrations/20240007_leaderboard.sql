CREATE TABLE leaderboard_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  rank        INTEGER,
  period      VARCHAR(20) NOT NULL CHECK (period IN ('week','month','all_time')),
  scope       VARCHAR(20) NOT NULL CHECK (scope IN ('national','state','school')),
  state       VARCHAR(50),
  school_id   UUID REFERENCES schools(id),
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period, scope)
);
