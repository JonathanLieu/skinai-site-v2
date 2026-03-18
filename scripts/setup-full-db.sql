-- Skin AI Waitlist Schema (Simplified)
-- Run this in the Supabase SQL Editor

-- 1. Waitlist table (with tier + Stripe customer ID)
CREATE TABLE IF NOT EXISTS waitlist (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email              TEXT UNIQUE NOT NULL,
  name               TEXT DEFAULT '',
  position           SERIAL,
  tier               TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  stripe_customer_id TEXT,
  source             TEXT DEFAULT 'website',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name               TEXT,
  email              TEXT NOT NULL,
  subject            TEXT,
  message            TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wl_email    ON waitlist (email);
CREATE INDEX IF NOT EXISTS idx_wl_tier     ON waitlist (tier);
CREATE INDEX IF NOT EXISTS idx_wl_created  ON waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_email    ON contact_messages (email);
CREATE INDEX IF NOT EXISTS idx_cm_created  ON contact_messages (created_at DESC);

-- RLS: anyone can insert, authenticated users (dashboard/admin) can read
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Waitlist Policies
DROP POLICY IF EXISTS "allow_insert" ON waitlist;
CREATE POLICY "allow_insert" ON waitlist FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "block_select" ON waitlist;
CREATE POLICY "block_select" ON waitlist FOR SELECT TO anon USING (false);
DROP POLICY IF EXISTS "allow_admin_select" ON waitlist;
CREATE POLICY "allow_admin_select" ON waitlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_postgres_select" ON waitlist FOR SELECT TO postgres USING (true);

-- Contact Message Policies
DROP POLICY IF EXISTS "allow_cm_insert" ON contact_messages;
CREATE POLICY "allow_cm_insert" ON contact_messages FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "allow_cm_admin_select" ON contact_messages;
CREATE POLICY "allow_cm_admin_select" ON contact_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "allow_cm_postgres_select" ON contact_messages;
CREATE POLICY "allow_cm_postgres_select" ON contact_messages FOR SELECT TO postgres USING (true);
