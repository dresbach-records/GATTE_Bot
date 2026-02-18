GATTE Tecnologia
Revenda LC
DOC 01 — Modelo de Dados — V2
Especificacao SQL Completa, Relacionamentos e Constraints

Versao 2.0  |  2025

1. Diagrama de Relacionamentos (ERD)
Cada entidade abaixo e uma tabela PostgreSQL. As setas indicam chaves estrangeiras com cardinalidade.

┌─────────────┐      1:N      ┌──────────────────┐
│    users    │──────────────▶│  conversations   │
│  (PK: id)   │              │  (FK: user_id)   │
└─────────────┘              └──────────────────┘
       │                            │ 1:N
       │ 1:N                        ▼
       ▼                     ┌─────────────┐
┌─────────────┐              │   messages  │
│   tickets   │              │(FK: conv_id)│
│(FK: user_id)│              └─────────────┘
└─────────────┘                    │ 1:1
       │                           ▼
       │ 1:N              ┌──────────────────┐
┌─────────────┐           │  session_context │
│    leads    │           │  (FK: conv_id)   │
│(FK: user_id)│           └──────────────────┘
└─────────────┘
       │                  ┌──────────────────┐
       │ 1:N              │  appointments    │
┌─────────────┐ 1:N       │  (FK: user_id)   │
│  services   │───────────└──────────────────┘
│(FK: user_id)│
└─────────────┘
       │ 1:N
       ▼
┌─────────────────┐
│  certificates   │
│(FK: service_id) │
└─────────────────┘

2. Regras de Negocio do Modelo
Regra	Definicao
Um user pode ter N conversations	Historico completo preservado. Conversa nova a cada 4h de inatividade.
phone e chave unica em users	UNIQUE constraint. Mesmo numero nunca gera dois users.
Um user pode ser lead E cliente	is_client e um flag. Lead pode virar cliente sem perder historico.
Conversa aberta = exatamente 1 session_context	Relacao 1:1 com UNIQUE constraint em conversation_id.
Ticket sempre tem conversation_id	Rastreabilidade: cada chamado sabe qual conversa o gerou.
Certificado sempre ligado a service_id	Nao existe certificado sem servico associado.
appointments pode existir sem ticket	Demo agendada por captacao de lead nao gera ticket.
leads.user_id e nullable	Lead capturado antes de ser cadastrado como user.

3. DDL Completo — PostgreSQL
Abaixo o SQL real, pronto para execucao. Inclui tipos, constraints, chaves estrangeiras e indices.

Tabela: users (V2)
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20)  NOT NULL UNIQUE,  -- +5511999999999
  phone_hash   VARCHAR(64)  NOT NULL UNIQUE,  -- SHA-256 para logs
  name         VARCHAR(150),
  email        VARCHAR(200),
  email_masked VARCHAR(200),         -- ex: jo**@gmail.com
  company      VARCHAR(200),
  is_client    BOOLEAN NOT NULL DEFAULT false,
  login_token  VARCHAR(512),         -- JWT para acesso autenticado
  token_exp_at TIMESTAMP,
  consent      BOOLEAN NOT NULL DEFAULT false,
  consent_at   TIMESTAMP,
  lgpd_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone_hash ON users(phone_hash);
CREATE INDEX idx_users_is_client  ON users(is_client);

Tabela: conversations (V2)
CREATE TYPE conv_status AS ENUM ('open','closed','transferred','waiting','expired');
CREATE TYPE conv_mode   AS ENUM ('idle','menu','ai_free','flow','human');

CREATE TABLE conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         conv_status NOT NULL DEFAULT 'open',
  mode           conv_mode   NOT NULL DEFAULT 'idle',
  current_flow   VARCHAR(100),   -- ex: 'TICKET_FLOW', 'LEAD_FLOW'
  flow_step      SMALLINT DEFAULT 0, -- passo atual dentro do fluxo
  flow_data      JSONB,          -- dados coletados no fluxo atual
  last_intent    VARCHAR(100),   -- ultima intencao classificada
  transferred_to VARCHAR(150),   -- nome/id do atendente humano
  started_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  last_msg_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at      TIMESTAMP,
  total_messages INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_flow CHECK (flow_step >= 0 AND flow_step <= 20)
);

CREATE INDEX idx_conv_user_status ON conversations(user_id, status);
CREATE INDEX idx_conv_last_msg    ON conversations(last_msg_at);

Tabela: messages (V2)
CREATE TYPE msg_role AS ENUM ('user','assistant','system');

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            msg_role NOT NULL,
  content         TEXT NOT NULL,
  content_masked  TEXT,           -- versao com dados pessoais mascarados para logs
  tokens_input    INT,            -- tokens enviados nesta chamada
  tokens_output   INT,            -- tokens recebidos nesta chamada
  intent_detected VARCHAR(100),   -- intencao classificada para esta msg
  model_used      VARCHAR(80),    -- ex: claude-haiku / claude-sonnet
  latency_ms      INT,            -- tempo de resposta da API em ms
  is_in_context   BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_msg_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_msg_intent       ON messages(intent_detected);

Tabela: session_context (V2 — critica para IA)
CREATE TABLE session_context (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  -- ultimas N mensagens serializadas para envio a API de IA
  messages_json   JSONB NOT NULL DEFAULT '[]',
  -- resumo gerado pela IA quando historico excede N mensagens
  summary         TEXT,
  -- total de tokens consumidos na sessao atual
  total_tokens    INT NOT NULL DEFAULT 0,
  -- ultima intencao registrada (para retomada de sessao)
  last_intent     VARCHAR(100),
  -- fluxo ativo e passo (espelho de conversations para performance)
  current_flow    VARCHAR(100),
  step_index      SMALLINT NOT NULL DEFAULT 0,
  -- dados coletados no fluxo (cache rapido via Redis também)
  context_json    JSONB NOT NULL DEFAULT '{}',
  -- expiracao da sessao (4h padrao)
  ttl_expires_at  TIMESTAMP NOT NULL,
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ctx_ttl ON session_context(ttl_expires_at); -- job de limpeza

Tabela: tickets (V2)
CREATE TYPE ticket_status   AS ENUM ('open','in_progress','waiting_client','resolved','closed');
CREATE TYPE ticket_priority AS ENUM ('low','medium','high','critical');

CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol        VARCHAR(20) NOT NULL UNIQUE,  -- BR-YYYYMMDD-XXXX
  user_id         UUID NOT NULL REFERENCES users(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  title           VARCHAR(300) NOT NULL,
  description     TEXT NOT NULL,
  status          ticket_status   NOT NULL DEFAULT 'open',
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  category        VARCHAR(100),   -- LC_WEB | LC_ERP | CERT | PIX | TEF | OUTROS
  assigned_to     VARCHAR(150),
  internal_notes  TEXT,           -- visivel apenas para a equipe GATTE
  sla_due_at      TIMESTAMP,      -- prazo SLA baseado na prioridade
  resolved_at     TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_protocol    ON tickets(protocol);
CREATE INDEX idx_ticket_user_status ON tickets(user_id, status);
CREATE INDEX idx_ticket_sla         ON tickets(sla_due_at) WHERE status != 'closed';

Tabela: leads (V2)
CREATE TYPE lead_stage AS ENUM ('new','contacted','qualified','proposal','lost','converted');

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id), -- nullable: lead antes de cadastro
  name            VARCHAR(150) NOT NULL,
  company         VARCHAR(200),
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(200),
  interest        VARCHAR(200),
  stage           lead_stage NOT NULL DEFAULT 'new',
  source          VARCHAR(100) NOT NULL DEFAULT 'whatsapp_bot',
  score           SMALLINT DEFAULT 0, -- pontuacao de qualificacao 0-100
  notes           TEXT,
  crm_id          VARCHAR(100),       -- ID no CRM externo
  crm_synced_at   TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_stage     ON leads(stage);
CREATE INDEX idx_leads_crm_id    ON leads(crm_id);

Tabela: appointments (V2)
CREATE TYPE appt_type   AS ENUM ('demo','support','training','followup','renewal');
CREATE TYPE appt_status AS ENUM ('pending','confirmed','rescheduled','done','no_show','cancelled');

CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  ticket_id        UUID REFERENCES tickets(id), -- nullable
  type             appt_type   NOT NULL,
  scheduled_at     TIMESTAMP NOT NULL,
  duration_min     SMALLINT NOT NULL DEFAULT 30,
  assigned_to      VARCHAR(150),
  status           appt_status NOT NULL DEFAULT 'pending',
  meeting_link     VARCHAR(500),   -- Google Meet / Zoom
  notes            TEXT,
  calendar_evt_id  VARCHAR(200),  -- Google Calendar event ID
  reminder_sent_at TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appt_user_date ON appointments(user_id, scheduled_at);
CREATE INDEX idx_appt_status    ON appointments(status, scheduled_at);

Tabela: services + certificates (V2)
CREATE TYPE svc_plan   AS ENUM ('essencial','profissional','enterprise','trial');
CREATE TYPE svc_status AS ENUM ('active','suspended','cancelled','trial');
CREATE TYPE cert_type  AS ENUM ('e-CPF','e-CNPJ','e-NFe','e-CTe','e-CAdES');

CREATE TABLE services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  name           VARCHAR(200) NOT NULL,
  plan           svc_plan   NOT NULL,
  status         svc_status NOT NULL DEFAULT 'active',
  contracted_at  TIMESTAMP NOT NULL,
  expires_at     TIMESTAMP,
  monthly_value  NUMERIC(10,2),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE certificates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id),
  type           cert_type NOT NULL,
  issued_at      TIMESTAMP NOT NULL,
  expires_at     TIMESTAMP NOT NULL,
  days_to_expire INT GENERATED ALWAYS AS
                 (EXTRACT(DAY FROM expires_at - NOW())) STORED,
  status         VARCHAR(20) NOT NULL DEFAULT 'valid',
  alert_30d_sent BOOLEAN DEFAULT false,
  alert_07d_sent BOOLEAN DEFAULT false,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cert_expires ON certificates(expires_at, status);
CREATE INDEX idx_cert_user    ON certificates(user_id);

4. Jobs Automaticos
Job	Frequencia	O que faz
cleanup_expired_sessions	A cada 30min	DELETE FROM session_context WHERE ttl_expires_at < NOW()
cert_expiry_alert_30d	Diario 08h00	Notifica clientes com certificado vencendo em 30 dias
cert_expiry_alert_07d	Diario 08h00	Notifica clientes com certificado vencendo em 7 dias
sla_breach_alert	A cada hora	Notifica equipe de tickets proximos do prazo SLA
conv_expire_idle	A cada hora	Fecha conversas com last_msg_at > 4h (status = expired)
lgpd_data_cleanup	Mensal	Anonimiza registros com data de retencao vencida
backup_postgres	Diario 03h00	pg_dump criptografado para storage externo
