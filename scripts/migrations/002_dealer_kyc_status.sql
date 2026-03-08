-- Migration 002: Dealer KYC / Escrow Onboarding
-- Changes verification_status values and adds trustin_kyc_id
-- Run in Supabase SQL Editor

-- Step 1: Convert column to TEXT so we can freely change values
ALTER TABLE dealer_profiles
  ALTER COLUMN verification_status TYPE TEXT;

-- Step 2: Migrate existing status values to new scheme
UPDATE dealer_profiles
SET verification_status =
  CASE verification_status
    WHEN 'approved'  THEN 'verified'
    WHEN 'pending'   THEN 'unverified'
    WHEN 'rejected'  THEN 'unverified'
    WHEN 'suspended' THEN 'suspended'
    ELSE 'unverified'
  END;

-- Step 3: Set default and add CHECK constraint
ALTER TABLE dealer_profiles
  ALTER COLUMN verification_status SET DEFAULT 'unverified';

ALTER TABLE dealer_profiles
  DROP CONSTRAINT IF EXISTS dealer_profiles_verification_status_check;

ALTER TABLE dealer_profiles
  ADD CONSTRAINT dealer_profiles_verification_status_check
  CHECK (verification_status IN ('unverified', 'kyc_pending', 'verified', 'suspended'));

-- Step 4: Add TrustIn KYC session ID column
ALTER TABLE dealer_profiles
  ADD COLUMN IF NOT EXISTS trustin_kyc_id TEXT;

-- Step 5: Index for webhook lookups (trustin_kyc_id)
CREATE INDEX IF NOT EXISTS idx_dealer_profiles_trustin_kyc_id
  ON dealer_profiles (trustin_kyc_id)
  WHERE trustin_kyc_id IS NOT NULL;

-- Step 6: Index for status filtering
CREATE INDEX IF NOT EXISTS idx_dealer_profiles_verification_status
  ON dealer_profiles (verification_status);
