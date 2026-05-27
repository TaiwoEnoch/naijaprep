CREATE OR REPLACE FUNCTION calculate_user_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_avg_score NUMERIC; v_sessions INTEGER; v_streak INTEGER;
BEGIN
  SELECT AVG(score_pct), COUNT(*), COALESCE(MAX(u.streak_count), 0)
  INTO v_avg_score, v_sessions, v_streak
  FROM exam_sessions es
  JOIN users u ON u.id = p_user_id
  WHERE es.user_id = p_user_id AND es.status = 'completed'
    AND es.created_at > NOW() - INTERVAL '30 days';
  RETURN COALESCE(ROUND(
    (COALESCE(v_avg_score,0) * 0.6) +
    (LEAST(COALESCE(v_sessions,0), 50) * 0.3) +
    (LEAST(COALESCE(v_streak,0), 30) * 0.1)
  ), 0);
END; $$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION update_longest_streaks() RETURNS VOID AS $$
BEGIN
  UPDATE users SET longest_streak = GREATEST(longest_streak, streak_count)
  WHERE streak_count > longest_streak;
END; $$ LANGUAGE plpgsql;
