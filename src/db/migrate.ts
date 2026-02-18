import { pool } from '@/db/pool';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Migration: DDL Completo
// Execute: ts-node src/db/migrate.ts
// ══════════════════════════════════════════════════════════

const DDL = `

-- ─── EXTENSOES ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE conv_status   AS ENUM ('open','closed','transferred','waiting','expired');
  CREATE TYPE conv_mode     AS ENUM ('idle','menu','ai_free','flow','human');
  CREATE TYPE msg_role      AS ENUM ('user','assistant','system');
  CREATE TYPE ticket_status AS ENUM ('open','in_progress','waiting_client','resolved','closed');
  CREATE TYPE ticket_prio   AS ENUM ('low','medium','high','critical');
  CREATE TYPE lead_stage    AS ENUM ('new','contacted','qualified','proposal','lost','converted');
  CREATE TYPE appt_type     AS ENUM ('demo','support','training','followup','renewal');
  CREATE TYPE appt_status   AS ENUM ('pending','confirmed','rescheduled','done','no_show','cancelled');
  CREATE TYPE svc_plan      AS ENUM ('essencial','profissional','enterprise','trial');
  CREATE TYPE svc_status    AS ENUM ('active','suspended','cancelled','trial');
  CREATE TYPE cert_type     AS ENUM ('e-CPF','e-CNPJ','e-NFe','e-CTe','e-CAdES');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20)  NOT NULL UNIQUE,
  phone_hash   VARCHAR(64)  NOT NULL UNIQUE,
  name         VARCHAR(150),
  email        VARCHAR(200),
  email_masked VARCHAR(200),
  company      VARCHAR(200),
  is_client    BOOLEAN NOT NULL DEFAULT false,
  login_token  VARCHAR(512),
  token_exp_at TIMESTAMP,
  consent      BOOLEAN NOT NULL DEFAULT false,
  consent_at   TIMESTAMP,
  lgpd_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);
CREATE INDEX IF NOT EXISTS idx_users_is_client  ON users(is_client);

-- ─── CONVERSATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         conv_status NOT NULL DEFAULT 'open',
  mode           conv_mode   NOT NULL DEFAULT 'idle',
  current_flow   VARCHAR(100),
  flow_step      SMALLINT NOT NULL DEFAULT 0,
  flow_data      JSONB NOT NULL DEFAULT '{}',
  last_intent    VARCHAR(100),
  transferred_to VARCHAR(150),
  started_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  last_msg_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at      TIMESTAMP,
  total_messages INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_flow_step CHECK (flow_step >= 0 AND flow_step <= 20)
);

CREATE INDEX IF NOT EXISTS idx_conv_user_status ON conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg    ON conversations(last_msg_at);

-- ─── MESSAGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            msg_role NOT NULL,
  content         TEXT NOT NULL,
  content_masked  TEXT,
  tokens_input    INT,
  tokens_output   INT,
  intent_detected VARCHAR(100),
  model_used      VARCHAR(80),
  latency_ms      INT,
  is_in_context   BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_intent       ON messages(intent_detected);

-- ─── SESSION CONTEXT ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_context (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  messages_json   JSONB NOT NULL DEFAULT '[]',
  summary         TEXT,
  total_tokens    INT NOT NULL DEFAULT 0,
  last_intent     VARCHAR(100),
  current_flow    VARCHAR(100),
  step_index      SMALLINT NOT NULL DEFAULT 0,
  context_json    JSONB NOT NULL DEFAULT '{}',
  ttl_expires_at  TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctx_ttl ON session_context(ttl_expires_at);

-- ─── TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol        VARCHAR(20) NOT NULL UNIQUE,
  user_id         UUID NOT NULL REFERENCES users(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  title           VARCHAR(300) NOT NULL,
  description     TEXT NOT NULL,
  status          ticket_status NOT NULL DEFAULT 'open',
  priority        ticket_prio   NOT NULL DEFAULT 'medium',
  category        VARCHAR(100),
  assigned_to     VARCHAR(150),
  internal_notes  TEXT,
  sla_due_at      TIMESTAMP,
  resolved_at     TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_protocol    ON tickets(protocol);
CREATE INDEX IF NOT EXISTS idx_ticket_user_status ON tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_sla         ON tickets(sla_due_at) WHERE status != 'closed';

-- ─── LEADS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  name          VARCHAR(150) NOT NULL,
  company       VARCHAR(200),
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(200),
  interest      VARCHAR(200),
  stage         lead_stage NOT NULL DEFAULT 'new',
  source        VARCHAR(100) NOT NULL DEFAULT 'whatsapp_bot',
  score         SMALLINT NOT NULL DEFAULT 0,
  notes         TEXT,
  crm_id        VARCHAR(100),
  crm_synced_at TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_stage  ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_crm_id ON leads(crm_id);

-- ─── APPOINTMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  ticket_id        UUID REFERENCES tickets(id),
  type             appt_type   NOT NULL,
  scheduled_at     TIMESTAMP NOT NULL,
  duration_min     SMALLINT NOT NULL DEFAULT 30,
  assigned_to      VARCHAR(150),
  status           appt_status NOT NULL DEFAULT 'pending',
  meeting_link     VARCHAR(500),
  notes            TEXT,
  calendar_evt_id  VARCHAR(200),
  reminder_sent_at TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appt_user_date ON appointments(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appt_status    ON appointments(status, scheduled_at);

-- ─── SERVICES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  name          VARCHAR(200) NOT NULL,
  plan          svc_plan   NOT NULL,
  status        svc_status NOT NULL DEFAULT 'active',
  contracted_at TIMESTAMP NOT NULL,
  expires_at    TIMESTAMP,
  monthly_value NUMERIC(10,2),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── CERTIFICATES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id),
  type           cert_type NOT NULL,
  issued_at      TIMESTAMP NOT NULL,
  expires_at     TIMESTAMP NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'valid',
  alert_30d_sent BOOLEAN NOT NULL DEFAULT false,
  alert_07d_sent BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_expires ON certificates(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_cert_user    ON certificates(user_id);

-- ─── AUDIT LOG ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  action     VARCHAR(100) NOT NULL,
  resource   VARCHAR(100),
  detail     JSONB,
  ip_hash    VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at DESC);

`;

async function migrate() {
  logger.info('Iniciando migration...');
  try {
    await pool.query(DDL);
    logger.info('Migration concluida com sucesso.');
  } catch (err: any) {
    logger.error('Erro na migration', { error: err.message });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
