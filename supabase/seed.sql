-- =============================================================
-- Yellow Sand — Development Seed Data
-- Run after migrations. Creates test users via Supabase Auth API,
-- not directly into auth.users (use supabase auth signup or dashboard).
-- This file seeds public tables assuming test user IDs.
-- =============================================================

-- Admin user profile (create via Supabase dashboard first, then update role)
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@yellowsand.dev';

-- Sample dealer profile (assumes dealer user exists)
-- INSERT INTO dealer_profiles (user_id, business_name, trade_license_number, location, description, verification_status)
-- VALUES (
--   '<dealer-user-id>',
--   'Emirates Premium Motors',
--   'DED-2024-001234',
--   'Dubai, UAE',
--   'Premium UAE dealer specializing in export-ready luxury and commercial vehicles.',
--   'approved'
-- );

-- Sample vehicles (replace dealer_id with actual dealer_profile id)
-- INSERT INTO vehicles (dealer_id, title, make, model, year, mileage, price_aed, condition, color, fuel_type, transmission, body_type, export_ready, status)
-- VALUES
--   ('<dealer-profile-id>', 'Toyota Land Cruiser GXR 2022', 'Toyota', 'Land Cruiser', 2022, 45000, 280000.00, 'excellent', 'White', 'petrol', 'automatic', 'SUV', true, 'active'),
--   ('<dealer-profile-id>', 'Nissan Patrol Titanium 2021', 'Nissan', 'Patrol', 2021, 62000, 220000.00, 'good', 'Silver', 'petrol', 'automatic', 'SUV', true, 'active'),
--   ('<dealer-profile-id>', 'Toyota Hilux Double Cab 2023', 'Toyota', 'Hilux', 2023, 18000, 145000.00, 'excellent', 'Black', 'diesel', 'manual', 'Pickup', true, 'active');

SELECT 'Seed file loaded. Create users via Supabase Auth, then uncomment and run inserts.' AS info;
