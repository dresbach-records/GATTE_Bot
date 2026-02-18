# 📦 CHANGELOG — GATTE_Bot

> Todas as mudanças notáveis no projeto são documentadas aqui.
> O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).
> O versionamento segue o [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## 🚧 [Unreleased] - Em Desenvolvimento

### Adicionado

- Fluxo de conversa para agendamento de demonstrações.
- Integração com o Google Calendar para criar eventos de agendamento.
- Painel de administração (ainda em desenvolvimento) para visualizar tickets e conversas.

### Melhorias

- Otimização do tempo de resposta do modelo de IA.
- Refatoração do gerenciador de estado da conversa para usar Redis.

### Corrigido

- Corrigido bug que fazia o bot entrar em loop em determinadas condições.

---

## ✅ [1.0.0] - 2024-07-26 - Release Inicial

### Adicionado

#### Core da Aplicação
- Estrutura do projeto com Node.js, Express e TypeScript.
- Servidor Express configurado para receber e processar webhooks da API do WhatsApp.
- Middleware para validação de assinatura HMAC-SHA256 para segurança do webhook.
- Validação de payload com Zod para todas as requisições de entrada.
- Logger configurado para registrar eventos e erros da aplicação.

#### Integrações
- Conexão com a API do WhatsApp Business (Meta) para enviar e receber mensagens.
- Integração com modelos de linguagem da OpenAI e Google (Gemini) para processamento de linguagem natural.

#### Banco de Dados (PostgreSQL)
- Schema inicial do banco de dados com tabelas para `users`, `conversations`, `messages`, e `tickets`.
- Configuração de migrações com `node-pg-migrate`.

#### Cache (Redis)
- Configuração do Redis para gerenciamento de estado da conversa e rate limiting.

#### Conteinerização
- `Dockerfile` para desenvolvimento e produção.
- `docker-compose.yml` para orquestrar os serviços (app, db, redis) no ambiente de desenvolvimento.
- `docker-compose.prod.yml` para deploy em produção.

#### Documentação
- `README.md`: Visão geral do projeto e instruções de uso.
- `doc/ARCHITECTURE.md`: Detalhes sobre a arquitetura do sistema.
- `doc/API.md`: Documentação dos endpoints da API (webhook, health check).
- `doc/DATABASE.md`: Schema e detalhes do banco de dados.
- `doc/SECURITY.md`: Políticas de segurança e conformidade com a LGPD.
- `doc/ENV.md`: Guia de variáveis de ambiente.
- `doc/CONTRIBUTING.md`: Guia para contribuidores.
- `doc/DEPLOYMENT.md`: Instruções para deploy com Docker.
- `doc/CHANGELOG.md`: Este arquivo, para rastrear mudanças.

---

*GATTE_Bot · Histórico de Versões v1.0 · 2024*
