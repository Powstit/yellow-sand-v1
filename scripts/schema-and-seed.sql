-- =============================================================
-- Yellow Sand — Schema + Seed (run this in Supabase SQL editor
-- or via scripts/setup-db.mjs)
-- =============================================================

-- ----------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('buyer', 'dealer', 'admin')) DEFAULT 'buyer',
  full_name   TEXT,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  country     TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- DEALER PROFILES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealer_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name        TEXT NOT NULL,
  trade_license_number TEXT,
  location             TEXT NOT NULL DEFAULT 'Dubai, UAE',
  description          TEXT,
  verification_status  TEXT NOT NULL DEFAULT 'approved'
                       CHECK (verification_status IN ('pending','approved','rejected','suspended')),
  rating               DECIMAL(3,2) NOT NULL DEFAULT 4.80,
  total_transactions   INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS dealer_profiles_updated_at ON dealer_profiles;
CREATE TRIGGER dealer_profiles_updated_at
  BEFORE UPDATE ON dealer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- VEHICLES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id     UUID NOT NULL REFERENCES dealer_profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  make          TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          SMALLINT NOT NULL CHECK (year >= 1990 AND year <= 2030),
  mileage       INTEGER NOT NULL CHECK (mileage >= 0),
  price_aed     DECIMAL(12,2) NOT NULL CHECK (price_aed > 0),
  description   TEXT,
  condition     TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent','good','fair')),
  color         TEXT,
  fuel_type     TEXT CHECK (fuel_type IN ('petrol','diesel','hybrid','electric')),
  transmission  TEXT CHECK (transmission IN ('automatic','manual')),
  body_type     TEXT,
  vin           TEXT,
  export_ready  BOOLEAN NOT NULL DEFAULT false,
  location      TEXT NOT NULL DEFAULT 'Dubai, UAE',
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('draft','pending_review','active','sold','suspended')),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(title,'') || ' ' || COALESCE(make,'') || ' ' ||
      COALESCE(model,'') || ' ' || COALESCE(color,'') || ' ' || COALESCE(body_type,'')
    )
  ) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicles_search_idx  ON vehicles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS vehicles_status_idx  ON vehicles (status);
CREATE INDEX IF NOT EXISTS vehicles_dealer_idx  ON vehicles (dealer_id);
CREATE INDEX IF NOT EXISTS vehicles_make_idx    ON vehicles (make);

DROP TRIGGER IF EXISTS vehicles_updated_at ON vehicles;
CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- VEHICLE IMAGES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_images_vehicle_idx ON vehicle_images (vehicle_id);

-- ----------------------------------------------------------------
-- INSPECTION REPORTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id         UUID UNIQUE NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspector_name     TEXT,
  inspection_date    DATE,
  overall_rating     TEXT CHECK (overall_rating IN ('pass','conditional','fail')),
  engine_condition   TEXT CHECK (engine_condition IN ('excellent','good','fair','poor')),
  body_condition     TEXT CHECK (body_condition IN ('excellent','good','fair','poor')),
  interior_condition TEXT CHECK (interior_condition IN ('excellent','good','fair','poor')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TRANSACTIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number         TEXT UNIQUE NOT NULL,
  vehicle_id               UUID NOT NULL REFERENCES vehicles(id),
  buyer_id                 UUID NOT NULL REFERENCES profiles(id),
  dealer_id                UUID NOT NULL REFERENCES dealer_profiles(id),
  status                   TEXT NOT NULL DEFAULT 'pending_payment'
                           CHECK (status IN (
                             'pending_payment','funded','inspection_pending',
                             'inspection_complete','documentation_pending',
                             'documentation_verified','shipping_pending',
                             'in_transit','delivered','completed',
                             'disputed','cancelled','refunded'
                           )),
  vehicle_price_aed        DECIMAL(12,2) NOT NULL,
  platform_fee_aed         DECIMAL(12,2) NOT NULL,
  shipping_cost_aed        DECIMAL(12,2),
  total_amount_aed         DECIMAL(12,2) NOT NULL,
  buyer_currency           TEXT NOT NULL DEFAULT 'NGN',
  destination_country      TEXT NOT NULL DEFAULT 'NG',
  stripe_payment_intent_id TEXT UNIQUE,
  escrow_id                TEXT UNIQUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_buyer_idx  ON transactions (buyer_id);
CREATE INDEX IF NOT EXISTS transactions_dealer_idx ON transactions (dealer_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions (status);

CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.reference_number := 'YS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_reference ON transactions;
CREATE TRIGGER transactions_reference
  BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION generate_transaction_reference();

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- TRANSACTION MILESTONES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
                   'payment_received','inspection_verified','documentation_verified',
                   'shipping_confirmed','delivery_confirmed','funds_released'
                 )),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed','failed')),
  completed_by   UUID REFERENCES profiles(id),
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  document_url   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, milestone_type)
);

-- ----------------------------------------------------------------
-- DISPUTES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disputes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID UNIQUE NOT NULL REFERENCES transactions(id),
  claimant_id    UUID NOT NULL REFERENCES profiles(id),
  reason         TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','under_review','resolved','closed')),
  resolution     TEXT,
  resolved_by    UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);

-- ----------------------------------------------------------------
-- SAVED VEHICLES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_vehicles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS saved_vehicles_user_idx ON saved_vehicles (user_id);

-- ----------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  body                   TEXT NOT NULL,
  type                   TEXT NOT NULL DEFAULT 'general',
  read                   BOOLEAN NOT NULL DEFAULT false,
  related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  related_vehicle_id     UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_vehicles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- Vehicles: public can read active listings
DROP POLICY IF EXISTS "vehicles_public_select" ON vehicles;
CREATE POLICY "vehicles_public_select"
  ON vehicles FOR SELECT
  USING (status = 'active');

-- Vehicle images: public read
DROP POLICY IF EXISTS "vehicle_images_public_select" ON vehicle_images;
CREATE POLICY "vehicle_images_public_select"
  ON vehicle_images FOR SELECT USING (true);

-- Inspection reports: public read
DROP POLICY IF EXISTS "inspection_reports_public_select" ON inspection_reports;
CREATE POLICY "inspection_reports_public_select"
  ON inspection_reports FOR SELECT USING (true);

-- Dealer profiles: public read
DROP POLICY IF EXISTS "dealer_profiles_public_select" ON dealer_profiles;
CREATE POLICY "dealer_profiles_public_select"
  ON dealer_profiles FOR SELECT USING (true);

-- Profiles: own record
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (id = auth.uid());

-- Transactions: buyer or dealer participant
DROP POLICY IF EXISTS "transactions_select_participant" ON transactions;
CREATE POLICY "transactions_select_participant"
  ON transactions FOR SELECT
  USING (
    buyer_id = auth.uid() OR
    dealer_id IN (SELECT id FROM dealer_profiles WHERE user_id = auth.uid())
  );

-- Saved vehicles: own records
DROP POLICY IF EXISTS "saved_vehicles_select_own" ON saved_vehicles;
CREATE POLICY "saved_vehicles_select_own"
  ON saved_vehicles FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_vehicles_insert_own" ON saved_vehicles;
CREATE POLICY "saved_vehicles_insert_own"
  ON saved_vehicles FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_vehicles_delete_own" ON saved_vehicles;
CREATE POLICY "saved_vehicles_delete_own"
  ON saved_vehicles FOR DELETE USING (user_id = auth.uid());

-- ----------------------------------------------------------------
-- DEMO SEED DATA
-- Creates auth users, profiles, dealer, and 12 vehicles
-- ----------------------------------------------------------------

-- Demo dealer auth user (password: Demo1234!)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  aud, role, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'dealer@yellowsand.dev',
  crypt('Demo1234!', gen_salt('bf')),
  NOW(),
  '{"role": "dealer", "full_name": "Ahmed Al Mansoori"}'::jsonb,
  NOW(), NOW(),
  'authenticated', 'authenticated', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Demo buyer auth user (password: Demo1234!)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  aud, role, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'buyer@yellowsand.dev',
  crypt('Demo1234!', gen_salt('bf')),
  NOW(),
  '{"role": "buyer", "full_name": "Chidi Okafor"}'::jsonb,
  NOW(), NOW(),
  'authenticated', 'authenticated', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Dealer profile
INSERT INTO profiles (id, email, role, full_name, country, is_active)
VALUES ('a0000000-0000-0000-0000-000000000001', 'dealer@yellowsand.dev', 'dealer', 'Ahmed Al Mansoori', 'AE', true)
ON CONFLICT (id) DO UPDATE SET role = 'dealer', full_name = 'Ahmed Al Mansoori';

-- Buyer profile
INSERT INTO profiles (id, email, role, full_name, country, is_active)
VALUES ('a0000000-0000-0000-0000-000000000002', 'buyer@yellowsand.dev', 'buyer', 'Chidi Okafor', 'NG', true)
ON CONFLICT (id) DO UPDATE SET role = 'buyer', full_name = 'Chidi Okafor';

-- Dealer profile record
INSERT INTO dealer_profiles (id, user_id, business_name, trade_license_number, location, description, verification_status, rating, total_transactions)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Emirates Premium Motors',
  'DED-2024-001234',
  'Dubai, UAE',
  'Leading UAE exporter of premium and commercial vehicles. Serving buyers across West Africa since 2015.',
  'approved',
  4.90,
  148
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 12 DEMO VEHICLES
-- ----------------------------------------------------------------
INSERT INTO vehicles (id, dealer_id, title, make, model, year, mileage, price_aed, description, condition, color, fuel_type, transmission, body_type, export_ready, location, status)
VALUES

-- 1. Toyota Land Cruiser
('c0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001',
 'Toyota Land Cruiser GXR V8 2022',
 'Toyota', 'Land Cruiser', 2022, 38000, 285000.00,
 'Full-option GXR V8 with sunroof, leather seats, and factory fitted accessories. Single owner, agency maintained. Export-ready with full documentation.',
 'excellent', 'Pearl White', 'petrol', 'automatic', 'SUV', true, 'Dubai, UAE', 'active'),

-- 2. Toyota Hilux
('c0000000-0000-0000-0000-000000000002',
 'b0000000-0000-0000-0000-000000000001',
 'Toyota Hilux Double Cab 2023',
 'Toyota', 'Hilux', 2023, 15000, 148000.00,
 'Brand new shape Hilux with low mileage. Diesel engine, hard cover, bed liner. Perfect for commercial use. Fully export-ready.',
 'excellent', 'Graphite', 'diesel', 'manual', 'Pickup', true, 'Sharjah, UAE', 'active'),

-- 3. Nissan Patrol
('c0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000001',
 'Nissan Patrol Titanium 2021',
 'Nissan', 'Patrol', 2021, 61000, 218000.00,
 'Top-spec Titanium with 7 seats, premium leather, 360 camera, and BOSE audio. Well maintained with full service history.',
 'good', 'Midnight Black', 'petrol', 'automatic', 'SUV', true, 'Abu Dhabi, UAE', 'active'),

-- 4. Nissan Sunny
('c0000000-0000-0000-0000-000000000004',
 'b0000000-0000-0000-0000-000000000001',
 'Nissan Sunny 1.5L 2022',
 'Nissan', 'Sunny', 2022, 42000, 38500.00,
 'Economical 1.5L petrol sedan. Very popular in West Africa. Great fuel economy, comfortable interior, and low running costs.',
 'good', 'Silver', 'petrol', 'automatic', 'Sedan', true, 'Dubai, UAE', 'active'),

-- 5. Lexus LX570
('c0000000-0000-0000-0000-000000000005',
 'b0000000-0000-0000-0000-000000000001',
 'Lexus LX570 Platinum 2021',
 'Lexus', 'LX570', 2021, 52000, 420000.00,
 'Ultra-luxury LX570 with captain seats, Mark Levinson audio, and rear entertainment. Accident-free with complete service history from authorized dealer.',
 'excellent', 'Sonic Titanium', 'petrol', 'automatic', 'SUV', true, 'Dubai, UAE', 'active'),

-- 6. Lexus RX350
('c0000000-0000-0000-0000-000000000006',
 'b0000000-0000-0000-0000-000000000001',
 'Lexus RX350 F-Sport 2022',
 'Lexus', 'RX350', 2022, 29000, 192000.00,
 'F-Sport package with sport-tuned suspension, 20-inch wheels, and panoramic sunroof. Excellent condition, lady driven.',
 'excellent', 'Molten Pearl', 'petrol', 'automatic', 'SUV', true, 'Dubai, UAE', 'active'),

-- 7. Mitsubishi Pajero
('c0000000-0000-0000-0000-000000000007',
 'b0000000-0000-0000-0000-000000000001',
 'Mitsubishi Pajero GLS 2020',
 'Mitsubishi', 'Pajero', 2020, 78000, 98000.00,
 'Durable 7-seater 4x4 with full-time AWD. Highly reliable with parts widely available across Africa. Clean interior.',
 'good', 'Cool Silver', 'petrol', 'automatic', 'SUV', true, 'Ajman, UAE', 'active'),

-- 8. Toyota Prado
('c0000000-0000-0000-0000-000000000008',
 'b0000000-0000-0000-0000-000000000001',
 'Toyota Prado TXL 2021',
 'Toyota', 'Prado', 2021, 55000, 175000.00,
 'TXL with leather seats, navigation, rear camera, and power tailgate. 7 seats, diesel engine. In excellent export-ready condition.',
 'excellent', 'Attitude Black', 'diesel', 'automatic', 'SUV', true, 'Dubai, UAE', 'active'),

-- 9. Land Rover Defender
('c0000000-0000-0000-0000-000000000009',
 'b0000000-0000-0000-0000-000000000001',
 'Land Rover Defender 110 2022',
 'Land Rover', 'Defender', 2022, 31000, 310000.00,
 'New-generation Defender 110 with off-road pack, panoramic roof, and fixed side steps. Stunning in Gondwana Stone with black contrast roof.',
 'excellent', 'Gondwana Stone', 'petrol', 'automatic', 'SUV', true, 'Dubai, UAE', 'active'),

-- 10. Land Rover Range Rover
('c0000000-0000-0000-0000-000000000010',
 'b0000000-0000-0000-0000-000000000001',
 'Land Rover Range Rover Vogue 2021',
 'Land Rover', 'Range Rover', 2021, 48000, 485000.00,
 'Flagship Range Rover Vogue SE with extended wheelbase, four-zone climate, massage seats, and air suspension. Impeccable condition.',
 'excellent', 'Fuji White', 'petrol', 'automatic', 'SUV', true, 'Dubai, UAE', 'active'),

-- 11. Toyota Corolla
('c0000000-0000-0000-0000-000000000011',
 'b0000000-0000-0000-0000-000000000001',
 'Toyota Corolla 2.0 XLi 2023',
 'Toyota', 'Corolla', 2023, 22000, 72000.00,
 'Latest generation Corolla with LED headlights, pre-collision system, and lane departure alert. Extremely fuel-efficient and easy to maintain.',
 'excellent', 'Super White', 'petrol', 'automatic', 'Sedan', true, 'Dubai, UAE', 'active'),

-- 12. Nissan X-Trail
('c0000000-0000-0000-0000-000000000012',
 'b0000000-0000-0000-0000-000000000001',
 'Nissan X-Trail 4x4 2022',
 'Nissan', 'X-Trail', 2022, 44000, 118000.00,
 'Family-sized 4x4 crossover with 7 seats, intelligent 4WD, and ProPilot assist. Great blend of comfort and capability.',
 'good', 'Gun Metallic', 'petrol', 'automatic', 'SUV', true, 'Sharjah, UAE', 'active')

ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- INSPECTION REPORTS for all 12 vehicles
-- ----------------------------------------------------------------
INSERT INTO inspection_reports (vehicle_id, inspector_name, inspection_date, overall_rating, engine_condition, body_condition, interior_condition, notes)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Emirates Inspection Bureau', '2024-10-15', 'pass', 'excellent', 'excellent', 'excellent', 'No issues found. All fluids topped, tyres at 90%.'),
  ('c0000000-0000-0000-0000-000000000002', 'Emirates Inspection Bureau', '2024-11-20', 'pass', 'excellent', 'excellent', 'excellent', 'Near-new condition. Factory warranty still valid.'),
  ('c0000000-0000-0000-0000-000000000003', 'Al Futtaim AutoPro', '2024-09-08', 'pass', 'excellent', 'good', 'excellent', 'Minor paint scuff on rear bumper. Engine and mechanicals excellent.'),
  ('c0000000-0000-0000-0000-000000000004', 'Al Futtaim AutoPro', '2024-10-01', 'pass', 'good', 'good', 'good', 'Well maintained city car. No mechanical issues.'),
  ('c0000000-0000-0000-0000-000000000005', 'Emirates Inspection Bureau', '2024-08-22', 'pass', 'excellent', 'excellent', 'excellent', 'Pristine example. Full Lexus service history verified.'),
  ('c0000000-0000-0000-0000-000000000006', 'Emirates Inspection Bureau', '2024-11-05', 'pass', 'excellent', 'excellent', 'excellent', 'Single owner, no accidents. Full F-Sport kit intact.'),
  ('c0000000-0000-0000-0000-000000000007', 'Al Futtaim AutoPro', '2024-07-18', 'pass', 'good', 'good', 'fair', 'Interior shows normal wear. Mechanically sound, no leaks.'),
  ('c0000000-0000-0000-0000-000000000008', 'Emirates Inspection Bureau', '2024-09-30', 'pass', 'excellent', 'excellent', 'excellent', 'Diesel engine in top shape. New tyres fitted Oct 2024.'),
  ('c0000000-0000-0000-0000-000000000009', 'Al Futtaim AutoPro', '2024-10-28', 'pass', 'excellent', 'excellent', 'excellent', 'Adventure-spec with no off-road damage. Showroom condition.'),
  ('c0000000-0000-0000-0000-000000000010', 'Emirates Inspection Bureau', '2024-08-14', 'pass', 'excellent', 'excellent', 'excellent', 'One of the finest examples we have inspected. VIP maintained.'),
  ('c0000000-0000-0000-0000-000000000011', 'Al Futtaim AutoPro', '2024-11-18', 'pass', 'excellent', 'excellent', 'excellent', 'Low mileage, new car smell. Toyota warranty valid until 2026.'),
  ('c0000000-0000-0000-0000-000000000012', 'Al Futtaim AutoPro', '2024-10-10', 'pass', 'excellent', 'good', 'good', 'ProPilot system tested and working. Minor stone chips on hood.')
ON CONFLICT (vehicle_id) DO NOTHING;

SELECT
  'Schema and seed complete.' AS status,
  COUNT(*) AS vehicle_count
FROM vehicles
WHERE status = 'active';
