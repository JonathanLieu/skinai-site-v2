// scripts/setup-db.js — run once: node scripts/setup-db.js
// OR paste the SQL below into Supabase → SQL Editor → Run

const SQL = `
-- Waitlist table (with tier + Stripe customer ID)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wl_email    ON waitlist (email);
CREATE INDEX IF NOT EXISTS idx_wl_tier     ON waitlist (tier);
CREATE INDEX IF NOT EXISTS idx_wl_created  ON waitlist (created_at DESC);

-- RLS: anyone can insert, nobody can read without service key
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_insert" ON waitlist;
CREATE POLICY "allow_insert" ON waitlist FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "block_select" ON waitlist;
CREATE POLICY "block_select" ON waitlist FOR SELECT TO anon USING (false);
`;

console.log('Paste this SQL into Supabase → SQL Editor → New query → Run:\n');
console.log('─'.repeat(60));
console.log(SQL);
console.log('─'.repeat(60));
console.log('\nOr run: node scripts/setup-db.js to print it anytime.');
