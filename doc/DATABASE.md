# 🗄️ DATABASE — GATTE_Bot

> **SGBD:** PostgreSQL 16 · **Driver:** node-postgres (pg) + pg-pool
> **Host:** Docker (dev) / Cloud SQL (prod) · **Migrations:** node-pg-migrate

---

## 📋 Informações de Conexão

| Variável | Valor Padrão (dev) |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `DB_NAME` | `gatte_bot_db` |

---

## 🏗️ Diagrama do Schema

```
users (1) ──> (N) conversations
users (1) ──> (N) tickets
users (1) ──> (N) leads
users (1) ──> (N) appointments
users (1) ──> (N) services

conversations (1) ──> (N) messages
conversations (1) ──> (1) session_context

services (1) ──> (N) certificates
```

---

## 📄 Tabelas

### `users`
Armazena os usuários que interagem com o chatbot.

```sql
CREATE TABLE users (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(20)  UNIQUE NOT NULL,
  name        VARCHAR(150),
  email       VARCHAR(200),
  company     VARCHAR(200),
  is_client   BOOLEAN      DEFAULT false,
  login_token VARCHAR(512),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);
```

### `conversations`
Gerencia as sessões de conversa.

```sql
CREATE TYPE conversation_status AS ENUM ('open', 'closed', 'transferred', 'waiting');
CREATE TYPE conversation_mode AS ENUM ('menu', 'ai_free', 'human', 'flow');

CREATE TABLE conversations (
  id             UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         conversation_status NOT NULL DEFAULT 'open',
  mode           conversation_mode   NOT NULL DEFAULT 'menu',
  current_flow   VARCHAR(100),
  transferred_to VARCHAR(100),
  started_at     TIMESTAMPTZ         DEFAULT NOW(),
  closed_at      TIMESTAMPTZ,
  total_messages INT                 DEFAULT 0
);
```

### `messages`
Armazena cada mensagem trocada dentro de uma conversa.

```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE messages (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID          NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            message_role  NOT NULL,
  content         TEXT          NOT NULL,
  tokens_used     INT,
  is_in_context   BOOLEAN       DEFAULT true,
  intent_detected VARCHAR(100),
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);
```

### `session_context`
Cache do contexto da conversa para a IA.

```sql
CREATE TABLE session_context (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  messages_json   JSONB       NOT NULL,
  summary         TEXT,
  ttl_expires_at  TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `tickets`
Registra os chamados de suporte abertos via chatbot.

```sql
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE tickets (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol        VARCHAR(20)     UNIQUE NOT NULL,
  user_id         UUID            NOT NULL REFERENCES users(id),
  conversation_id UUID            NOT NULL REFERENCES conversations(id),
  title           VARCHAR(300)    NOT NULL,
  description     TEXT            NOT NULL,
  status          ticket_status   NOT NULL DEFAULT 'open',
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  category        VARCHAR(100),
  assigned_to     VARCHAR(150),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     DEFAULT NOW()
);
```

---

## ⚡ Índices

```sql
-- Buscas frequentes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_conversations_user_status ON conversations(user_id, status);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_tickets_protocol ON tickets(protocol);
CREATE INDEX idx_tickets_user_status ON tickets(user_id, status);

-- Limpeza de dados e jobs
CREATE INDEX idx_session_context_ttl ON session_context(ttl_expires_at);
CREATE INDEX idx_certificates_expires_status ON certificates(expires_at, status);
```

---

## 🔄 Migrations

Os comandos a seguir são utilizados para gerenciar a evolução do schema do banco de dados.

```bash
# Rodar todas as migrations pendentes
npm run db:migrate

# Criar um novo arquivo de migração
npm run db:migrate:create <nome_da_migration>

# Reverter a última migração executada
npm run db:migrate:undo
```

> ⚠️ **Atenção:** Em produção, as migrações devem ser executadas como parte do processo de CI/CD, nunca manualmente.

---

*GATTE_Bot · PostgreSQL 16 · Schema v1.0 · 2024*
