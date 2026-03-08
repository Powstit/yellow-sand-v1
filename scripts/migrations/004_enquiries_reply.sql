-- Migration 004: Add reply fields to enquiries table
-- Run in Supabase SQL Editor after migration 003

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS reply      TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
