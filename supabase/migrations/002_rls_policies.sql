-- =============================================================
-- Yellow Sand — Row Level Security Policies
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: check role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- =============================================================
-- PROFILES
-- =============================================================
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (auth_role() = 'admin');

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================
-- DEALER PROFILES
-- =============================================================
-- Public can see approved dealers
CREATE POLICY "dealer_profiles_select_approved"
  ON dealer_profiles FOR SELECT
  USING (verification_status = 'approved');

-- Admin can see all
CREATE POLICY "dealer_profiles_select_admin"
  ON dealer_profiles FOR SELECT
  USING (auth_role() = 'admin');

-- Dealer can see own (pending review etc.)
CREATE POLICY "dealer_profiles_select_own"
  ON dealer_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Dealer can insert/update own
CREATE POLICY "dealer_profiles_insert_own"
  ON dealer_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND auth_role() = 'dealer');

CREATE POLICY "dealer_profiles_update_own"
  ON dealer_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can update (for verification)
CREATE POLICY "dealer_profiles_update_admin"
  ON dealer_profiles FOR UPDATE
  USING (auth_role() = 'admin');

-- =============================================================
-- VEHICLES
-- =============================================================
-- Public can see active vehicles
CREATE POLICY "vehicles_select_active"
  ON vehicles FOR SELECT
  USING (status = 'active');

-- Dealer can see own vehicles (all statuses)
CREATE POLICY "vehicles_select_own"
  ON vehicles FOR SELECT
  USING (
    dealer_id IN (
      SELECT id FROM dealer_profiles WHERE user_id = auth.uid()
    )
  );

-- Admin can see all
CREATE POLICY "vehicles_select_admin"
  ON vehicles FOR SELECT
  USING (auth_role() = 'admin');

-- Dealer can create vehicles (must be approved dealer)
CREATE POLICY "vehicles_insert_dealer"
  ON vehicles FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealer_profiles
      WHERE user_id = auth.uid() AND verification_status = 'approved'
    )
  );

-- Dealer can update own vehicles
CREATE POLICY "vehicles_update_own"
  ON vehicles FOR UPDATE
  USING (
    dealer_id IN (
      SELECT id FROM dealer_profiles WHERE user_id = auth.uid()
    )
  );

-- Admin can update vehicles
CREATE POLICY "vehicles_update_admin"
  ON vehicles FOR UPDATE
  USING (auth_role() = 'admin');

-- =============================================================
-- VEHICLE IMAGES
-- =============================================================
CREATE POLICY "vehicle_images_select_active"
  ON vehicle_images FOR SELECT
  USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE status = 'active')
    OR
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN dealer_profiles dp ON v.dealer_id = dp.id
      WHERE dp.user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_images_insert_own"
  ON vehicle_images FOR INSERT
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN dealer_profiles dp ON v.dealer_id = dp.id
      WHERE dp.user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_images_delete_own"
  ON vehicle_images FOR DELETE
  USING (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN dealer_profiles dp ON v.dealer_id = dp.id
      WHERE dp.user_id = auth.uid()
    )
  );

-- =============================================================
-- INSPECTION REPORTS
-- =============================================================
CREATE POLICY "inspection_reports_select"
  ON inspection_reports FOR SELECT
  USING (
    vehicle_id IN (SELECT id FROM vehicles WHERE status = 'active')
    OR auth_role() IN ('dealer', 'admin')
  );

CREATE POLICY "inspection_reports_insert_dealer"
  ON inspection_reports FOR INSERT
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN dealer_profiles dp ON v.dealer_id = dp.id
      WHERE dp.user_id = auth.uid()
    )
  );

-- =============================================================
-- TRANSACTIONS
-- Buyers and dealers can only see their own. Admins see all.
-- Status updates only via service role (API routes with service key).
-- =============================================================
CREATE POLICY "transactions_select_buyer"
  ON transactions FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "transactions_select_dealer"
  ON transactions FOR SELECT
  USING (
    dealer_id IN (
      SELECT id FROM dealer_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_select_admin"
  ON transactions FOR SELECT
  USING (auth_role() = 'admin');

-- Only buyers can create transactions
CREATE POLICY "transactions_insert_buyer"
  ON transactions FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid() AND auth_role() = 'buyer'
  );

-- No direct UPDATE from client — all status changes go through API (service role)

-- =============================================================
-- TRANSACTION MILESTONES
-- =============================================================
CREATE POLICY "milestones_select_participant"
  ON transaction_milestones FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE buyer_id = auth.uid()
         OR dealer_id IN (SELECT id FROM dealer_profiles WHERE user_id = auth.uid())
    )
    OR auth_role() = 'admin'
  );

-- =============================================================
-- TRANSACTION EVENTS (Audit Log)
-- =============================================================
CREATE POLICY "events_select_participant"
  ON transaction_events FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE buyer_id = auth.uid()
         OR dealer_id IN (SELECT id FROM dealer_profiles WHERE user_id = auth.uid())
    )
    OR auth_role() = 'admin'
  );

-- =============================================================
-- DOCUMENTS
-- =============================================================
CREATE POLICY "documents_select_participant"
  ON documents FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE buyer_id = auth.uid()
         OR dealer_id IN (SELECT id FROM dealer_profiles WHERE user_id = auth.uid())
    )
    OR auth_role() = 'admin'
  );

CREATE POLICY "documents_insert_dealer"
  ON documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      auth_role() = 'dealer'
      OR auth_role() = 'admin'
    )
  );

-- =============================================================
-- DISPUTES
-- =============================================================
CREATE POLICY "disputes_select_participant"
  ON disputes FOR SELECT
  USING (
    raised_by = auth.uid()
    OR
    transaction_id IN (
      SELECT id FROM transactions
      WHERE dealer_id IN (SELECT id FROM dealer_profiles WHERE user_id = auth.uid())
    )
    OR auth_role() = 'admin'
  );

CREATE POLICY "disputes_insert_buyer"
  ON disputes FOR INSERT
  WITH CHECK (
    raised_by = auth.uid() AND auth_role() = 'buyer'
  );

-- Only admin can resolve
CREATE POLICY "disputes_update_admin"
  ON disputes FOR UPDATE
  USING (auth_role() = 'admin');

-- =============================================================
-- SAVED VEHICLES
-- =============================================================
CREATE POLICY "saved_vehicles_crud_own"
  ON saved_vehicles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================
-- NOTIFICATIONS
-- =============================================================
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND read = true); -- can only mark as read

-- Storage buckets (run these in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vehicles', 'vehicles', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
