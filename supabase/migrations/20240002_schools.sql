CREATE TABLE schools (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  state         VARCHAR(50) NOT NULL,
  lga           VARCHAR(100),
  contact_name  VARCHAR(100),
  contact_phone VARCHAR(15),
  plan          VARCHAR(20) DEFAULT 'free',
  student_limit INTEGER DEFAULT 50,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
