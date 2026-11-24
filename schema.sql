-- Derin Numeroloji Veritabanı Şeması

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS saved_people (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  birth_day VARCHAR(10),
  birth_month VARCHAR(10),
  birth_year VARCHAR(10),
  birth_time VARCHAR(20),
  birth_place VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_saved_people_user_id ON saved_people(user_id);

CREATE TABLE IF NOT EXISTS analysis_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id VARCHAR(64) NOT NULL,
  module_name VARCHAR(255) NOT NULL,
  input_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_ref VARCHAR(64) UNIQUE NOT NULL,
  plan_id VARCHAR(32) NOT NULL,
  plan_name VARCHAR(128) NOT NULL,
  amount_tl INTEGER NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  shopier_order_no VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  admin_notes TEXT,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by INTEGER REFERENCES users(id),
  CONSTRAINT chk_payment_orders_status CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected'))
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_shopier ON payment_orders(shopier_order_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_order_per_user ON payment_orders(user_id) WHERE status IN ('draft', 'pending_review');
CREATE UNIQUE INDEX IF NOT EXISTS idx_approved_shopier_order_no ON payment_orders(shopier_order_no) WHERE status = 'approved' AND shopier_order_no IS NOT NULL AND shopier_order_no != '';

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES payment_orders(id),
  plan_id VARCHAR(32) NOT NULL,
  plan_name VARCHAR(128) NOT NULL,
  pdf_credits INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active ON subscriptions(user_id, expires_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_order_id_unique ON subscriptions(order_id) WHERE order_id IS NOT NULL;

-- Immutable attempt ledger: ready consumes one credit, pending reserves one.
-- No history FK: deleting history must not delete archived reports.
CREATE TABLE IF NOT EXISTS pdf_reports (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  analysis_id INTEGER NOT NULL,
  analysis_name TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'failed', 'expired')),
  is_sample BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  file_key TEXT,
  file_sha256 TEXT,
  file_bytes INTEGER,
  error_code TEXT,
  CHECK (status <> 'ready' OR (file_key IS NOT NULL AND file_sha256 IS NOT NULL AND file_bytes > 0))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_one_live_analysis
  ON pdf_reports(user_id, analysis_id) WHERE status IN ('pending', 'ready');
CREATE INDEX IF NOT EXISTS idx_pdf_period ON pdf_reports(subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_pdf_owner ON pdf_reports(user_id, created_at DESC);

ALTER TABLE pdf_reports ADD COLUMN IF NOT EXISTS calculation_snapshot JSONB;
ALTER TABLE pdf_reports ADD COLUMN IF NOT EXISTS interpretation_snapshot JSONB;
ALTER TABLE pdf_reports ADD COLUMN IF NOT EXISTS generation_metrics JSONB;
