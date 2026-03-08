-- Migration 005: Vehicle reservation system
-- Run in Supabase SQL Editor

-- ── 1. Add 'reserved' to vehicles status ──────────────────────────────────────

-- Drop existing constraint (if it was an explicit CHECK)
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;

-- Re-add with 'reserved' included
ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check
  CHECK (status IN ('draft', 'pending_review', 'active', 'reserved', 'sold', 'suspended'));

-- ── 2. Create reservations table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservations (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id                  UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  buyer_id                    UUID        NOT NULL REFERENCES profiles(id),
  dealer_id                   UUID        NOT NULL REFERENCES dealer_profiles(id),
  status                      TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'converted')),
  deposit_amount_gbp          NUMERIC(10,2) NOT NULL,
  deposit_amount_aed          NUMERIC(10,2),          -- approx at time of reservation
  stripe_checkout_session_id  TEXT        UNIQUE,
  stripe_payment_intent_id    TEXT,
  expires_at                  TIMESTAMPTZ,            -- set to created_at + 48h when status → active
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle_id ON reservations (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_buyer_id   ON reservations (buyer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status     ON reservations (status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations (expires_at) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_checkout_session
  ON reservations (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- ── 3. Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own reservations
CREATE POLICY "buyers_select_reservations" ON reservations
  FOR SELECT USING (buyer_id = auth.uid());

-- Dealers can view reservations on their vehicles
CREATE POLICY "dealers_select_reservations" ON reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dealer_profiles dp
      WHERE dp.id = dealer_id AND dp.user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "admins_all_reservations" ON reservations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── 4. Cron job: expire stale reservations (requires pg_cron extension) ───────
-- Enable pg_cron in Supabase Dashboard → Database → Extensions → pg_cron
-- Then run:
--
-- SELECT cron.schedule(
--   'expire-reservations',
--   '*/15 * * * *',   -- every 15 minutes
--   $$
--     UPDATE reservations
--       SET status = 'expired', updated_at = NOW()
--     WHERE status = 'active'
--       AND expires_at < NOW();
--
--     UPDATE vehicles v
--       SET status = 'active', updated_at = NOW()
--     FROM reservations r
--     WHERE r.vehicle_id = v.id
--       AND r.status = 'expired'
--       AND v.status = 'reserved'
--       AND r.expires_at < NOW() - INTERVAL '15 minutes';
--   $$
-- );
