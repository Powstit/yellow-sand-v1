-- Migration 003: Enquiries table
-- Stores buyer messages to dealers about specific vehicles
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS enquiries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID        NOT NULL REFERENCES vehicles(id)       ON DELETE CASCADE,
  buyer_id    UUID        NOT NULL REFERENCES profiles(id),
  dealer_id   UUID        NOT NULL REFERENCES dealer_profiles(id),
  message     TEXT        NOT NULL CHECK (length(message) >= 10),
  status      TEXT        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'read', 'replied')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_dealer_id   ON enquiries (dealer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_buyer_id    ON enquiries (buyer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_vehicle_id  ON enquiries (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status      ON enquiries (dealer_id, status);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- Buyers can create enquiries
CREATE POLICY "buyers_insert_enquiries" ON enquiries
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Buyers can view their own enquiries
CREATE POLICY "buyers_select_enquiries" ON enquiries
  FOR SELECT USING (buyer_id = auth.uid());

-- Dealers can view enquiries addressed to them
CREATE POLICY "dealers_select_enquiries" ON enquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dealer_profiles dp
      WHERE dp.id = dealer_id AND dp.user_id = auth.uid()
    )
  );

-- Dealers can mark enquiries as read/replied
CREATE POLICY "dealers_update_enquiries" ON enquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM dealer_profiles dp
      WHERE dp.id = dealer_id AND dp.user_id = auth.uid()
    )
  );

-- Admins can read everything
CREATE POLICY "admins_all_enquiries" ON enquiries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
