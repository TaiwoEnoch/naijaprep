CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            VARCHAR(20) NOT NULL,
  billing_cycle   VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  amount_kobo     INTEGER NOT NULL,
  status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active','cancelled','expired')),
  paystack_sub_code VARCHAR(100),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  cancelled_at    TIMESTAMPTZ
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount_kobo     INTEGER NOT NULL,
  reference       VARCHAR(100) UNIQUE NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','success','failed')),
  paystack_data   JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
