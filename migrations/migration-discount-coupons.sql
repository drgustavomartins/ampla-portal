-- Create discount_coupons table for scarcity-based sales (48h, 10% off, etc)
CREATE TABLE IF NOT EXISTS discount_coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  valid_until TEXT NOT NULL, -- ISO date string
  product_type VARCHAR(50) NOT NULL DEFAULT 'all', -- 'mentorship'|'immersion'|'hours_package'|'all'
  max_uses INTEGER DEFAULT -1, -- -1 = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active'|'expired'|'revoked'
  description TEXT -- optional note like "Aluno João Silva"
);

-- Create index on code for fast lookups during checkout
CREATE INDEX IF NOT EXISTS idx_discount_coupons_code ON discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_status ON discount_coupons(status);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_valid_until ON discount_coupons(valid_until);

-- Create table to track coupon usage per user
CREATE TABLE IF NOT EXISTS coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES discount_coupons(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  used_at TEXT NOT NULL,
  plan_key VARCHAR(50), -- which plan they purchased with this coupon
  amount_saved INTEGER -- how much they saved in centavos
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
