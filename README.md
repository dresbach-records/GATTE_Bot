# GATTE Bot — ChatBot WhatsApp com IA

Chatbot corporativo para atendimento ao cliente da GATTE Tecnologia, construído com Node.js, TypeScript, PostgreSQL e Claude AI.

## Arquitetura

```
src/
├── index.ts              # Servidor Express + Webhook
├── orchestrator.ts       # Ponto único de entrada — roteamento determinista
├── config/
│   └── index.ts          # Configurações centrais (env vars)
├── types/
│   └── index.ts          # Enums INTENT, STATE + interfaces TypeScript
├── db/
│   ├── pool.ts           # Pool de conexões PostgreSQL
│   ├── migrate.ts        # DDL completo — cria todas as tabelas
│   └── repositories.ts   # UserRepo, ConvRepo, CtxRepo, TicketRepo, LeadRepo
├── services/
│   ├── ai.service.ts     # Classificador (Haiku) + Respondedor (Sonnet) + contexto
│   ├── whatsapp.service.ts # Envio de mensagens via Evolution API
│   └── jobs.service.ts   # Cron jobs automatizados
├── flows/
│   └── flow-manager.ts   # Fluxos estruturados: TICKET, LEAD, DEMO
├── handlers/
│   └── index.ts          # MenuHandler, AIHandler, TicketHandler, EscalateHandler
├── middleware/
│   └── index.ts          # Rate limiting, webhook validation, error handler
└── utils/
    ├── logger.ts          # Winston + masking LGPD automático
    └── security.ts        # Hash, sanitização, validadores, protocolo
```

## Stack

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express 4 |
| IA Classificador | Claude Haiku (rápido, barato) |
| IA Respondedor | Claude Sonnet (potente) |
| WhatsApp | Evolution API (gratuita) |
| Banco de dados | PostgreSQL 15 |
| Cache / Rate limit | Redis 7 |
| Cron jobs | node-cron |
| Logs | Winston + masking LGPD |

## Setup

### 1. Pré-requisitos
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Evolution API rodando

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Editar .env com seus valores reais
```

### 4. Criar banco de dados
```bash
psql -U postgres -c "CREATE DATABASE gatte_bot;"
psql -U postgres -c "CREATE USER gatte WITH PASSWORD 'sua_senha';"
psql -U postgres -c "GRANT ALL ON DATABASE gatte_bot TO gatte;"
```

### 5. Executar migration (cria todas as tabelas)
```bash
npm run db:migrate
```

### 6. Rodar em desenvolvimento
```bash
npm run dev
```

### 7. Build e produção
```bash
npm run build
npm start
```

## Fluxo de uma mensagem

```
Cliente envia mensagem no WhatsApp
         ↓
Evolution API → POST /webhook
         ↓
Middleware: validar assinatura HMAC + rate limit
         ↓
orchestrate(phone, message)
         ↓
UserRepo.findOrCreate() → ConvRepo.getOpenOrCreate()
         ↓
┌─ Fluxo ativo? → FlowManager.continue()
│
└─ IA: classifyIntent() [Haiku, ~100 tokens]
         ↓
   resolvePriority() → roteamento determinista
         ↓
   ┌─ HUMAN_REQUEST     → EscalateHandler
   ├─ CHECK_TICKET      → TicketHandler.queryStatus()
   ├─ OPEN_TICKET       → FlowManager.start(TICKET_FLOW)
   ├─ CAPTURE_LEAD      → FlowManager.start(LEAD_FLOW)
   ├─ MENU_OPEN         → MenuHandler.show()
   ├─ OUT_OF_SCOPE      → FallbackHandler
   └─ default           → AIHandler.generate() [Sonnet, ~1500 tokens]
```

## Cron Jobs

| Job | Frequência | Função |
|---|---|---|
| cleanup_sessions | 30min | Remove contextos expirados |
| expire_conversations | 1h | Fecha conversas ociosas >4h |
| cert_30d_alert | Diário 08h | Alerta certificado vencendo em 30 dias |
| cert_7d_alert | Diário 08h05 | Alerta urgente: 7 dias |
| sla_breach_alert | 1h | Notifica equipe sobre SLA crítico |
| lgpd_cleanup | Mensal 1º dia | Anonimiza dados vencidos |

## LGPD

- Consentimento registrado na primeira mensagem
- Hash SHA-256+salt para telefone nos logs
- Masking automático de e-mail, CPF, CNPJ nos logs
- Função de anonimização completa via `UserRepo.anonymize()`
- Endpoint `POST /privacy/delete` para solicitações LGPD
- Job mensal de limpeza automática

## Endpoints

| Método | Path | Descrição |
|---|---|---|
| GET | /health | Health check com status do BD |
| POST | /webhook | Recebe mensagens do WhatsApp |
| POST | /privacy/delete | Solicitação LGPD de exclusão |

## Variáveis de Ambiente

Ver `.env.example` para lista completa e documentada.
