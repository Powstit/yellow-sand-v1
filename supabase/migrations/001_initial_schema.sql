-- =============================================================
-- Yellow Sand — Initial Schema
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search on vehicles

-- =============================================================
-- PROFILES
-- Extends Supabase auth.users. Created automatically via trigger.
-- =============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('buyer', 'dealer', 'admin')) DEFAULT 'buyer',
  full_name   TEXT,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  country     TEXT, -- 'NG' | 'GH' | 'AE' | etc.
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on auth.users INSERT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- DEALER PROFILES
-- =============================================================
CREATE TABLE dealer_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name           TEXT NOT NULL,
  trade_license_number    TEXT,
  trade_license_url       TEXT,
  location                TEXT NOT NULL DEFAULT 'Dubai, UAE',
  description             TEXT,
  website_url             TEXT,
  verification_status     TEXT NOT NULL DEFAULT 'pending'
                          CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason        TEXT,
  verified_at             TIMESTAMPTZ,
  verified_by             UUID REFERENCES profiles(id),
  rating                  DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_transactions      INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER dealer_profiles_updated_at
  BEFORE UPDATE ON dealer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- VEHICLES
-- =============================================================
CREATE TABLE vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id         UUID NOT NULL REFERENCES dealer_profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  make              TEXT NOT NULL,
  model             TEXT NOT NULL,
  year              SMALLINT NOT NULL CHECK (year >= 1990 AND year <= 2030),
  mileage           INTEGER NOT NULL CHECK (mileage >= 0),
  price_aed         DECIMAL(12,2) NOT NULL CHECK (price_aed > 0),
  description       TEXT,
  condition         TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair')),
  color             TEXT,
  fuel_type         TEXT CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric')),
  transmission      TEXT CHECK (transmission IN ('automatic', 'manual')),
  body_type         TEXT,
  vin               TEXT,
  export_ready      BOOLEAN NOT NULL DEFAULT false,
  shipping_port     TEXT DEFAULT 'Jebel Ali, Dubai',
  location          TEXT NOT NULL DEFAULT 'Dubai, UAE',
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'active', 'sold', 'suspended')),
  -- computed search vector
  search_vector     TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(make, '')  || ' ' ||
      COALESCE(model, '') || ' ' ||
      COALESCE(color, '') || ' ' ||
      COALESCE(body_type, '')
    )
  ) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vehicles_search_idx ON vehicles USING GIN (search_vector);
CREATE INDEX vehicles_status_idx ON vehicles (status);
CREATE INDEX vehicles_dealer_idx ON vehicles (dealer_id);
CREATE INDEX vehicles_price_idx ON vehicles (price_aed);
CREATE INDEX vehicles_year_idx ON vehicles (year);
CREATE INDEX vehicles_make_model_idx ON vehicles (make, model);

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- VEHICLE IMAGES
-- =============================================================
CREATE TABLE vehicle_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vehicle_images_vehicle_idx ON vehicle_images (vehicle_id);

-- =============================================================
-- INSPECTION REPORTS
-- =============================================================
CREATE TABLE inspection_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID UNIQUE NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspector_name      TEXT,
  inspection_date     DATE,
  overall_rating      TEXT CHECK (overall_rating IN ('pass', 'conditional', 'fail')),
  engine_condition    TEXT CHECK (engine_condition IN ('excellent', 'good', 'fair', 'poor')),
  body_condition      TEXT CHECK (body_condition IN ('excellent', 'good', 'fair', 'poor')),
  interior_condition  TEXT CHECK (interior_condition IN ('excellent', 'good', 'fair', 'poor')),
  notes               TEXT,
  report_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TRANSACTIONS
-- Central table — status is source of truth, mutated only by service role
-- =============================================================
CREATE TABLE transactions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number            TEXT UNIQUE NOT NULL,
  vehicle_id                  UUID NOT NULL REFERENCES vehicles(id),
  buyer_id                    UUID NOT NULL REFERENCES profiles(id),
  dealer_id                   UUID NOT NULL REFERENCES dealer_profiles(id),
  status                      TEXT NOT NULL DEFAULT 'pending_payment'
                              CHECK (status IN (
                                'pending_payment', 'funded', 'inspection_pending',
                                'inspection_complete', 'documentation_pending',
                                'documentation_verified', 'shipping_pending',
                                'in_transit', 'delivered', 'completed',
                                'disputed', 'cancelled', 'refunded'
                              )),
  vehicle_price_aed           DECIMAL(12,2) NOT NULL,
  platform_fee_aed            DECIMAL(12,2) NOT NULL,
  shipping_cost_aed           DECIMAL(12,2),
  total_amount_aed            DECIMAL(12,2) NOT NULL,
  buyer_currency              TEXT NOT NULL DEFAULT 'NGN',
  total_amount_buyer_currency DECIMAL(15,2),
  exchange_rate               DECIMAL(12,6),
  stripe_payment_intent_id    TEXT UNIQUE,
  stripe_charge_id            TEXT,
  trustin_escrow_id           TEXT UNIQUE,
  destination_country         TEXT NOT NULL,
  destination_port            TEXT,
  shipping_tracking_number    TEXT,
  estimated_delivery_date     DATE,
  notes                       TEXT,
  funded_at                   TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_buyer_idx ON transactions (buyer_id);
CREATE INDEX transactions_dealer_idx ON transactions (dealer_id);
CREATE INDEX transactions_vehicle_idx ON transactions (vehicle_id);
CREATE INDEX transactions_status_idx ON transactions (status);
CREATE INDEX transactions_created_idx ON transactions (created_at DESC);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate reference number
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.reference_number := 'YS-' ||
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_reference
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION generate_transaction_reference();

-- =============================================================
-- TRANSACTION MILESTONES
-- =============================================================
CREATE TABLE transaction_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  milestone_type  TEXT NOT NULL CHECK (milestone_type IN (
                    'payment_received',
                    'inspection_verified',
                    'documentation_verified',
                    'shipping_confirmed',
                    'delivery_confirmed',
                    'funds_released'
                  )),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  completed_by    UUID REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  document_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, milestone_type)
);

CREATE INDEX milestones_transaction_idx ON transaction_milestones (transaction_id);

-- =============================================================
-- TRANSACTION EVENTS (Immutable Audit Log)
-- =============================================================
CREATE TABLE transaction_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  actor_id        UUID REFERENCES profiles(id),
  actor_role      TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX events_transaction_idx ON transaction_events (transaction_id);
CREATE INDEX events_created_idx ON transaction_events (created_at DESC);

-- Prevent updates and deletes on audit log
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'transaction_events is immutable';
END;
$$;

CREATE TRIGGER transaction_events_immutable
  BEFORE UPDATE OR DELETE ON transaction_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- =============================================================
-- DOCUMENTS (Export Documentation)
-- =============================================================
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL CHECK (document_type IN (
                    'title_deed', 'export_certificate', 'customs_declaration',
                    'bill_of_lading', 'insurance', 'other'
                  )),
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  verified        BOOLEAN NOT NULL DEFAULT false,
  verified_by     UUID REFERENCES profiles(id),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX documents_transaction_idx ON documents (transaction_id);

-- =============================================================
-- DISPUTES
-- =============================================================
CREATE TABLE disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    UUID UNIQUE NOT NULL REFERENCES transactions(id),
  raised_by         UUID NOT NULL REFERENCES profiles(id),
  reason            TEXT NOT NULL CHECK (reason IN (
                      'vehicle_not_as_described', 'not_received', 'documentation_issue',
                      'shipping_delay', 'damage', 'other'
                    )),
  description       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'under_review', 'resolved_buyer', 'resolved_dealer', 'closed')),
  resolved_by       UUID REFERENCES profiles(id),
  resolution        TEXT CHECK (resolution IN ('refund_buyer', 'release_to_dealer', 'partial_refund')),
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

-- =============================================================
-- SAVED VEHICLES
-- =============================================================
CREATE TABLE saved_vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vehicle_id)
);

CREATE INDEX saved_vehicles_user_idx ON saved_vehicles (user_id);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================
CREATE TABLE notifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  body                    TEXT NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN (
                            'transaction_update', 'milestone_complete',
                            'dispute_opened', 'dispute_resolved',
                            'vehicle_approved', 'dealer_approved', 'general'
                          )),
  read                    BOOLEAN NOT NULL DEFAULT false,
  related_transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  related_vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_idx ON notifications (user_id);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read = false;
