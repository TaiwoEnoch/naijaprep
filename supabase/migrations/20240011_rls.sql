-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pack_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users own their data
CREATE POLICY "users_own" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "user_subjects_own" ON user_subjects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "exam_sessions_own" ON exam_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "exam_answers_own" ON exam_answers FOR ALL
  USING (session_id IN (SELECT id FROM exam_sessions WHERE user_id = auth.uid()));
CREATE POLICY "progress_own" ON user_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_own" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "payments_own" ON payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Public read for all authenticated users
CREATE POLICY "questions_read" ON questions FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);
CREATE POLICY "subjects_read" ON subjects FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);
CREATE POLICY "topics_read" ON topics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "packs_read" ON offline_packs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leaderboard_read" ON leaderboard_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');
