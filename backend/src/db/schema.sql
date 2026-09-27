-- CRM Dashboard schema.
--
-- Multi-tenant: every row belongs to an organization, and the API filters on
-- organization_id on every read and write. A user therefore only ever sees
-- their own company's data, which is what lets several companies share one
-- database.
--
-- Idempotent: safe to run on every boot. It only creates what is missing, so it
-- will not drop anything. To start over, drop the database.

CREATE TABLE IF NOT EXISTS organizations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The company name, and the id sequences for its records. Defaults come from
-- the sequence name so callers rarely set them.
CREATE SEQUENCE IF NOT EXISTS customers_id_seq;
CREATE SEQUENCE IF NOT EXISTS leads_id_seq;
CREATE SEQUENCE IF NOT EXISTS deals_id_seq;
CREATE SEQUENCE IF NOT EXISTS notes_id_seq;
CREATE SEQUENCE IF NOT EXISTS followups_id_seq;

-- ===== Users and access =====

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  -- bcrypt hash. Never selected into a response.
  password_hash   TEXT NOT NULL,
  -- 'admin' bypasses permissions; 'rep' is limited to what permissions allow.
  role            TEXT NOT NULL DEFAULT 'rep' CHECK (role IN ('admin', 'rep')),
  -- Per-resource access: { customers: { view, create, edit, delete }, ... }
  permissions     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email is unique across the whole install, since it doubles as the login name.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
-- Always scope by organization.
CREATE INDEX IF NOT EXISTS users_org_idx ON users (organization_id);

-- ===== Customers =====

CREATE TABLE IF NOT EXISTS customers (
  id              TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  company         TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_org_idx ON customers (organization_id);

-- ===== Leads =====

CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  company         TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'New',
  source          TEXT NOT NULL DEFAULT 'Website',
  -- Display name, written by the server alongside owner_id so the two agree.
  assigned_rep    TEXT,
  -- Which user owns this lead. NULL means unassigned, which only admins can see.
  owner_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- DATE, not TIMESTAMPTZ: the API exposes this as `createdDate`, a plain day
  -- with no time and no timezone.
  created_at      DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS leads_org_idx ON leads (organization_id);
CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads (owner_id);

-- ===== Deals =====

CREATE TABLE IF NOT EXISTS deals (
  id              TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  customer        TEXT NOT NULL,
  owner           TEXT,
  owner_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  stage           TEXT NOT NULL DEFAULT 'Lead',
  value           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  -- DATE for the same reason as leads.created_at: the API calls it createdDate.
  created_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Date only; the UI sends and shows YYYY-MM-DD.
  expected_close  DATE
);

CREATE INDEX IF NOT EXISTS deals_org_idx ON deals (organization_id);
CREATE INDEX IF NOT EXISTS deals_owner_idx ON deals (owner_id);

-- ===== Notes: the activity timeline =====

CREATE TABLE IF NOT EXISTS notes (
  id              TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- 'customer' or 'deal', pointing at that table's id.
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('customer', 'deal')),
  entity_id       TEXT NOT NULL,
  body            TEXT NOT NULL,
  author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Kept denormalised so a note still reads correctly if the author is removed.
  author_name     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_org_idx ON notes (organization_id);
CREATE INDEX IF NOT EXISTS notes_entity_idx ON notes (entity_type, entity_id);

-- ===== Follow-ups: scheduled work =====

CREATE TABLE IF NOT EXISTS followups (
  id                TEXT PRIMARY KEY,
  organization_id   INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('customer', 'deal')),
  entity_id         TEXT NOT NULL,
  title             TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'task' CHECK (type IN ('call', 'email', 'meeting', 'task')),
  due_at            DATE NOT NULL,
  details           TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS followups_org_idx ON followups (organization_id);
CREATE INDEX IF NOT EXISTS followups_entity_idx ON followups (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS followups_due_idx ON followups (organization_id, due_at);
