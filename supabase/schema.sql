-- ============================================================
-- DemocracyLive – Supabase schema
-- Run this in the Supabase SQL editor or via `supabase db push`
-- ============================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- polls
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS polls (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  short_id     TEXT        UNIQUE NOT NULL,
  question     TEXT        NOT NULL,
  yes_count    INTEGER     NOT NULL DEFAULT 0,
  no_count     INTEGER     NOT NULL DEFAULT 0,
  total_count  INTEGER     NOT NULL DEFAULT 0,
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_polls_short_id   ON polls(short_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);

-- ----------------------------------------------------------
-- votes  (one per poll × device_hash)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID        NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  choice      TEXT        NOT NULL CHECK (choice IN ('YES', 'NO')),
  device_hash TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The UNIQUE constraint implicitly creates a composite index on (poll_id, device_hash),
  -- which also covers the duplicate-vote lookup in the vote API route.
  UNIQUE(poll_id, device_hash)
);

-- Separate index on poll_id alone for aggregate queries (e.g. count votes per poll).
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);

-- ----------------------------------------------------------
-- poll_requests
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS poll_requests (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  question      TEXT        NOT NULL,
  ends_at       TIMESTAMPTZ,
  contact_email TEXT,
  contact_name  TEXT,
  status        TEXT        NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_requests_status     ON poll_requests(status);
CREATE INDEX IF NOT EXISTS idx_poll_requests_created_at ON poll_requests(created_at DESC);

-- ----------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------
ALTER TABLE polls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_requests ENABLE ROW LEVEL SECURITY;

-- polls: public read, authenticated (admin) write
CREATE POLICY "Polls are publicly readable"
  ON polls FOR SELECT USING (true);

CREATE POLICY "Only admins can insert polls"
  ON polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update polls"
  ON polls FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete polls"
  ON polls FOR DELETE USING (auth.role() = 'authenticated');

-- votes: managed exclusively via the service-role key (API route)
-- No public read/write; the service-role key bypasses RLS.
-- If you want to add per-row policies, add them here.

-- poll_requests: public insert, admin read/update
CREATE POLICY "Anyone can submit a poll request"
  ON poll_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view poll requests"
  ON poll_requests FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update poll requests"
  ON poll_requests FOR UPDATE USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------
-- Helper function – atomically increment vote counts
-- Called from the vote API route via supabase.rpc(...)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_vote_counts(
  p_poll_id UUID,
  p_yes_inc INTEGER,
  p_no_inc  INTEGER
)
RETURNS TABLE(yes_count INTEGER, no_count INTEGER, total_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE polls
  SET
    yes_count   = polls.yes_count   + p_yes_inc,
    no_count    = polls.no_count    + p_no_inc,
    total_count = polls.total_count + 1
  WHERE id = p_poll_id;

  RETURN QUERY
    SELECT polls.yes_count, polls.no_count, polls.total_count
    FROM polls
    WHERE id = p_poll_id;
END;
$$;
