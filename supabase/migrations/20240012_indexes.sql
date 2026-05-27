-- Performance indexes — NEVER skip these (CONCURRENTLY removed to avoid Postgres transactional block errors during supabase db push)
CREATE INDEX idx_questions_subject_exam
  ON questions(subject_id, exam_type) WHERE is_active = true;
CREATE INDEX idx_questions_topic
  ON questions(topic_id) WHERE is_active = true;
CREATE INDEX idx_questions_difficulty
  ON questions(subject_id, difficulty) WHERE is_active = true;
CREATE INDEX idx_exam_sessions_user
  ON exam_sessions(user_id, created_at DESC);
CREATE INDEX idx_exam_sessions_status
  ON exam_sessions(user_id, status);
CREATE INDEX idx_exam_answers_session ON exam_answers(session_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_streak ON users(streak_count DESC);
CREATE INDEX idx_users_score ON users(predicted_score DESC);
CREATE INDEX idx_progress_user_subject ON user_progress(user_id, subject_id);
CREATE INDEX idx_leaderboard_rank
  ON leaderboard_snapshots(score DESC, period, scope);
CREATE INDEX idx_notifications_user
  ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_payments_reference ON payments(reference);
