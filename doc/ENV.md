# ⚙️ ENV — GATTE_Bot

> **Regra #1:** Nunca commitar arquivos `.env` no repositório.
> **Regra #2:** Em produção, as variáveis devem ser gerenciadas pelo sistema de hospedagem (e.g., Docker, Kubernetes, Vercel).

---

## 🚀 Setup Rápido

Para configurar o ambiente de desenvolvimento local, copie o arquivo de exemplo:

```bash
# Copie o template e preencha os valores
cp .env.example .env
```

O arquivo `.env` já está no `.gitignore` e não deve ser versionado.

---

## 🗄️ Banco de Dados (PostgreSQL)

| Variável | Descrição | Padrão (dev) | Obrigatório |
|---|---|---|---|
| `DB_HOST` | Host do banco de dados | `localhost` | ✅ |
| `DB_PORT` | Porta do PostgreSQL | `5432` | ✅ |
| `DB_USER` | Usuário do banco | `postgres` | ✅ |
| `DB_PASSWORD` | Senha do banco | `postgres` | ✅ |
| `DB_NAME` | Nome do banco | `gatte_bot_db` | ✅ |

---

## 💾 Cache e Fila (Redis)

| Variável | Descrição | Padrão (dev) | Obrigatório |
|---|---|---|---|
| `REDIS_HOST` | Host do Redis | `localhost` | ✅ |
| `REDIS_PORT` | Porta do Redis | `6379` | ✅ |
| `REDIS_PASSWORD` | Senha do Redis (se houver) | ` ` | ⬜ |

---

## 🤖 APIs de Inteligência Artificial

| Variável | Descrição | Obrigatório |
|---|---|---|
| `OPENAI_API_KEY` | Chave de API da OpenAI (GPT-4, etc.) | ✅ |
| `GEMINI_API_KEY` | Chave de API do Google AI Studio (Gemini) | ✅ |

---

## 📱 API do WhatsApp (Meta)

| Variável | Descrição | Obrigatório |
|---|---|---|
| `META_APP_SECRET` | "Segredo do Aplicativo" do seu app na Meta | ✅ |
| `META_VERIFY_TOKEN` | Token de verificação do webhook (criado por você) | ✅ |
| `META_ACCESS_TOKEN` | Token de acesso da API do WhatsApp | ✅ |
| `META_PHONE_NUMBER_ID` | ID do número de telefone registrado no WhatsApp | ✅ |

---

## ⚙️ Aplicação

| Variável | Descrição | Padrão | Obrigatório |
|---|---|---|---|
| `NODE_ENV` | Ambiente de execução (`development` ou `production`) | `development` | ✅ |
| `PORT` | Porta em que o servidor Express irá rodar | `3000` | ✅ |
| `LOG_LEVEL` | Nível de log (`info`, `debug`, `warn`, `error`) | `info` | ⬜ |

---

## 📁 Exemplo de Arquivo `.env`

```env
# Variáveis do Banco de Dados (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=gatte_bot_db

# Variáveis do Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Chaves de API de IA
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GEMINI_API_KEY="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Credenciais da API da Meta (WhatsApp)
META_APP_SECRET="your_app_secret"
META_VERIFY_TOKEN="your_custom_verify_token"
META_ACCESS_TOKEN="your_whatsapp_access_token"
META_PHONE_NUMBER_ID="your_phone_number_id"

# Configurações da Aplicação
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

---

*GATTE_Bot · Guia de Variáveis de Ambiente v1.0 · 2024*
