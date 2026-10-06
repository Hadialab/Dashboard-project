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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set by the server on every write, never by a client. Drives the "last
  -- updated" column in the tables and the stale-lead check on the dashboard.
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
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
  created_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set when this lead is converted. The lead is never deleted, so this records
  -- what it became and is what stops it being converted twice.
  converted_customer_id TEXT
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
  expected_close  DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deals_org_idx ON deals (organization_id);
CREATE INDEX IF NOT EXISTS deals_owner_idx ON deals (owner_id);

-- ===== Notes: the activity timeline =====

CREATE TABLE IF NOT EXISTS notes (
  id              TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- 'customer', 'deal' or 'lead', pointing at that table's id.
  entity_type     TEXT NOT NULL
                    CONSTRAINT notes_entity_type_allowed
                    CHECK (entity_type IN ('customer', 'deal', 'lead')),
  entity_id       TEXT NOT NULL,
  body            TEXT NOT NULL,
  -- 'note'   — something a person typed.
  -- 'event'  — written by the server when a record is created or a tracked
  --             field changes, so the timeline is not a blank page. Events are
  --             part of the record's history and cannot be deleted.
  kind            TEXT NOT NULL DEFAULT 'note'
                    CONSTRAINT notes_kind_allowed
                    CHECK (kind IN ('note', 'event')),
  author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Kept denormalised so a note still reads correctly if the author is removed.
  author_name     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_org_idx ON notes (organization_id);
CREATE INDEX IF NOT EXISTS notes_entity_idx ON notes (entity_type, entity_id);

-- ===== Password resets =====
--
-- One row per reset request, so a link can be issued more than once without the
-- earlier ones becoming invalid — a user who asked for a link and then lost the
-- first email is not stuck.
--
-- The token is stored hashed, not as issued. Everything else here is a
-- convenience; this is the security boundary. The plaintext token exists only in
-- the email the recipient receives, so a dump of this table — a leaked backup, an
-- over-broad analytics query, a compromised read replica — hands over no working
-- reset links. Hashing a 32-byte random value is exact, so there is no reason to
-- store it recoverably.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- sha256 hex of the token that was emailed. Indexed because every reset attempt
  -- looks a token up by this and nothing else.
  token_hash      TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  -- Set when the token is spent. A second attempt with the same token finds a
  -- non-null used_at and is refused, which is what makes it single-use.
  used_at         TIMESTAMPTZ
);

-- Every lookup is "this user's live tokens", and every lookup is "this token",
-- so both are indexed. The expiry index is for pruning rather than for reads —
-- nothing queries by expiry, because an expired row is filtered out by the same
-- predicate that filters out a used one.
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS password_reset_expiry_idx ON password_reset_tokens (expires_at);

-- ===== Sent email =====
--
-- A record of every send attempt, successful or not.
--
-- Without this, a failed send is invisible: `sendEmail` reports `{ sent: false }`
-- to the caller, the caller is a request that has already returned, and the
-- message is simply gone. "Did the reminder go out?" is the first question asked
-- of any notification feature, and it has to be answerable without log-diving.
--
-- Note what is *not* stored: the body. A CRM sends mail containing customer
-- names, phone numbers and deal values, and a table that accumulates every
-- message would accumulate all of it indefinitely, in a place with weaker
-- retention guarantees than the records it describes. The subject and recipient
-- are enough to answer the operational question.
CREATE TABLE IF NOT EXISTS sent_email (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  -- Null when the recipient was not a known user, which happens for a password
  -- reset on an unknown address — which is not recorded at all, deliberately (see
  -- the route), but also for a customer contact who is not in this app.
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Which template, so a broken template can be told apart from a broken address.
  template         TEXT NOT NULL,
  recipient        TEXT NOT NULL,
  subject          TEXT NOT NULL,
  status           TEXT NOT NULL
                     CONSTRAINT sent_email_status_allowed
                     CHECK (status IN ('sent', 'failed', 'skipped')),
  -- The provider's message id on success, or the reason on failure. One column
  -- rather than two, because exactly one is ever meaningful.
  detail           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "What has this company sent, newest first" is the only query worth optimising.
-- The others are investigations over a small table.
CREATE INDEX IF NOT EXISTS sent_email_org_idx ON sent_email (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sent_email_user_idx ON sent_email (user_id, created_at DESC);

-- ===== Tenant administration =====
--
-- Per-company configuration. The data model was already multi-tenant — every row
-- belongs to an organization and every read filters on it — what was missing is
-- the ability for a company to *configure* itself.

-- Company settings.
--
-- Nullable with defaults rather than NOT NULL with defaults, so a row written by
-- an older schema keeps working and `ALTER TABLE ADD COLUMN ... DEFAULT` does not
-- rewrite the table. `locale` and `timezone` are stored but not yet used to format
-- anything: they are here so an admin can set them once rather than every user
-- setting them individually later, and the UI says plainly that they do not change
-- anything yet rather than implying they do.
CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id  INTEGER PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  -- Shown in the app's own header and in outbound email. Denormalised from
  -- organizations.name rather than being the single source of truth, so this is a
  -- *display* name; the legal or billing name stays where it was.
  display_name     TEXT,
  -- A URL, not an upload. Branding that requires storing and serving a binary
  -- brings content-type sniffing, size limits and a CDN question; a URL does not,
  -- and it lets a company point at whatever they already host.
  logo_url         TEXT,
  website          TEXT,
  support_email    TEXT,
  -- What a new teammate gets unless an admin says otherwise, rather than every
  -- signup inventing its own defaults.
  default_role     TEXT NOT NULL DEFAULT 'rep' CHECK (default_role IN ('admin', 'rep')),
  default_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  locale           TEXT NOT NULL DEFAULT 'en-GB',
  timezone         TEXT NOT NULL DEFAULT 'UTC',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== API keys =====
--
-- For scripts and integrations: a machine calling the API as itself, with its own
-- scoped key that can be revoked without touching a person.
--
-- The secret is stored hashed, for the same reason password hashes are: this table
-- is the one an attacker with a read-only database dump wants, and a dump that
-- yielded usable API keys would be a full breach of every company in it. SHA-256
-- rather than bcrypt, because the key is 32 CSPRNG bytes and therefore not
-- guessable — there is nothing for a slow hash to protect against.
CREATE TABLE IF NOT EXISTS api_keys (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- The name is for the humans reading the list later. It is the first thing
  -- anyone asks when a key has to be revoked: which one was this?
  label            TEXT NOT NULL,
  key_prefix       TEXT NOT NULL,
  key_hash         TEXT NOT NULL UNIQUE,
  -- Narrower than a session token on purpose. Null means the keys in `scopes`;
  -- a key with no scopes array can reach nothing.
  scopes           TEXT[] NOT NULL DEFAULT '{}',
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name  TEXT,
  last_used_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys (organization_id, created_at DESC);

-- ===== Webhooks =====
--
-- Outbound notifications on real events, for systems that are not the CRM: a
-- Slack channel that says a deal closed, or a warehouse that wants the row.
--
-- The delivery attempt is recorded next to the subscription, in the same table,
-- because "did the webhook fire" is the first question asked of any integration
-- and an answerable one is worth more than a clean schema. The body is not stored:
-- the payload is reconstructible from the record, and an unbounded copy of every
-- event this company ever sent is exactly the kind of thing that never gets
-- pruned.
CREATE TABLE IF NOT EXISTS webhooks (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  target_url       TEXT NOT NULL,
  -- Empty means every event. Anything here narrows it.
  events           TEXT[] NOT NULL DEFAULT '{}',
  -- An HMAC secret, so the receiver can tell the payload came from this app and
  -- was not modified in transit.
  signing_secret   TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  -- The delivery attempts, newest last, capped per subscription. JSONB because
  -- the shape is small, varies by event, and is only ever read whole.
  last_deliveries  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhooks_org_idx ON webhooks (organization_id, created_at DESC);

-- ===== Follow-ups: scheduled work =====

CREATE TABLE IF NOT EXISTS followups (
  id                TEXT PRIMARY KEY,
  organization_id   INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type       TEXT NOT NULL
                      CONSTRAINT followups_entity_type_allowed
                      CHECK (entity_type IN ('customer', 'deal', 'lead')),
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

-- ===== Audit log: who changed what =====
--
-- Deliberately a separate table from notes rather than more note rows, even
-- though the two are shown together. They have different jobs and different
-- lifetimes:
--
--   notes         human prose on one record's timeline. A user can delete their
--                 own, and it is written for someone reading it.
--   audit_log     machine-queryable record of every mutation. Append-only, with
--                 before/after values rather than a sentence, and readable only
--                 by an admin.
--
-- An audit trail a user can delete is not an audit trail, and one that stores a
-- sentence instead of the values cannot answer "who changed this email address,
-- and what was it before" — which is the question an audit log exists to answer.
-- So the two stay paired in the UI and separate in storage.
--
-- `changes` holds full fidelity: every field that actually changed, with its old
-- and new value. Recording only the fields the timeline narrates would silently
-- omit a changed email or phone number, which is exactly the kind of change an
-- audit log is consulted about. The cost is a wider JSONB payload on a
-- row-per-mutation table, which is not a trade worth making.
CREATE TABLE IF NOT EXISTS audit_log (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Nullable rather than NOT NULL: a deleted account must not erase the fact
  -- that it did something. The name below keeps the row readable regardless.
  actor_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Denormalised for the same reason notes.author_name is: the log has to stay
  -- readable after the user is gone.
  actor_name       TEXT NOT NULL,
  action           TEXT NOT NULL
                     CONSTRAINT audit_log_action_allowed
                     CHECK (action IN ('create', 'update', 'delete', 'convert', 'permission_change', 'password_change')),
  entity_type      TEXT NOT NULL
                     CONSTRAINT audit_log_entity_type_allowed
                     CHECK (entity_type IN ('customer', 'lead', 'deal', 'user')),
  entity_id        TEXT NOT NULL,
  -- The record's display name at the time of the change, for the same reason
  -- actor_name is denormalised: a row that reads "Customer c001" forces whoever
  -- is reading the log to go and look every record up, and for a deleted record
  -- there is nothing left to look up. Nullable rather than NOT NULL, because a
  -- record with no usable name is a legitimate thing to have changed.
  entity_label     TEXT,
  -- { "field": { "from": ..., "to": ... } }. Empty on a delete is not an error;
  -- it is a row saying a record went away.
  changes          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every read is "this org's log, newest first", so that pair is the index.
CREATE INDEX IF NOT EXISTS audit_log_org_idx ON audit_log (organization_id, created_at DESC);
-- The filters the admin view offers.
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (organization_id, actor_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (organization_id, entity_type, entity_id);

-- ===== Upgrades for databases created before the columns above existed =====
--
-- Everything above is CREATE ... IF NOT EXISTS, which by design never touches a
-- table that already exists. These statements bring an older database up to
-- date, and are written to be safe on every boot.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE leads     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE deals     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE notes     ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'note';
ALTER TABLE leads     ADD COLUMN IF NOT EXISTS converted_customer_id TEXT;

-- audit_log itself needs this one for databases created before the column existed.
-- The CREATE TABLE above handles a fresh install; this brings an existing table up
-- to the same shape without touching its rows.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_label TEXT;

-- password_reset_tokens and sent_email were added after the original schema, so
-- a database created before them needs no ALTER: their CREATE TABLE statements
-- above are IF NOT EXISTS and will simply run for the first time. Nothing to add.

-- The original entity_type constraints were auto-named by Postgres. Swap them
-- for ones that also allow leads, but only when the old constraint is still in
-- place — otherwise a fresh database would be altered on every single boot.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'notes_entity_type_check' AND conrelid = 'notes'::regclass
  ) THEN
    ALTER TABLE notes DROP CONSTRAINT notes_entity_type_check;
    ALTER TABLE notes ADD CONSTRAINT notes_entity_type_allowed
      CHECK (entity_type IN ('customer', 'deal', 'lead'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'followups_entity_type_check' AND conrelid = 'followups'::regclass
  ) THEN
    ALTER TABLE followups DROP CONSTRAINT followups_entity_type_check;
    ALTER TABLE followups ADD CONSTRAINT followups_entity_type_allowed
      CHECK (entity_type IN ('customer', 'deal', 'lead'));
  END IF;

  -- The kind constraint is declared inline in the CREATE TABLE above, but that
  -- statement is a no-op against a pre-existing notes table, so an older
  -- database gets the column without the constraint. Add it once.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'notes_kind_allowed' AND conrelid = 'notes'::regclass
  ) THEN
    ALTER TABLE notes ADD CONSTRAINT notes_kind_allowed CHECK (kind IN ('note', 'event'));
  END IF;

  -- audit_log's action list grew when password changes became auditable. Unlike
  -- the two above this one is dropped and recreated unconditionally, because the
  -- CREATE TABLE is a no-op against an existing table and the constraint has to
  -- move regardless of whether it already exists. Dropping and re-adding within one
  -- transaction takes effect atomically, and the window in which the column has no
  -- constraint is not visible to another session.
  --
  -- Existing rows are unaffected: every value already allowed stays allowed.
  ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_allowed;
  ALTER TABLE audit_log
    ADD CONSTRAINT audit_log_action_allowed
    CHECK (action IN ('create', 'update', 'delete', 'convert', 'permission_change', 'password_change'));
END $$;

