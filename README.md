# 🤖 GATTE_Bot

<div align="center">

**Orquestrador de Chatbots com IA para Atendimento Automatizado via WhatsApp**

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-24-2496ED?style=for-the-badge&logo=docker&logoColor=white)

*Backend robusto para orquestrar conversas de chatbot, gerenciar estado de usuário e integrar com serviços de IA.*

</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Stack Técnica](#️-stack-técnica)
- [Instalação](#-instalação)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Arquitetura e Fluxo](#-arquitetura-e-fluxo)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Documentação](#-documentação)
- [Licença](#-licença)

---

## 🧠 Visão Geral

O **GATTE_Bot** é um back-end projetado para servir como o cérebro de um sistema de atendimento via WhatsApp. Ele utiliza uma arquitetura modular em Node.js e Express para gerenciar fluxos de conversa, estado de usuário (via Redis) e persistência de dados (via PostgreSQL).

O sistema é construído para ser escalável e desacoplado, permitindo a fácil adição de novos fluxos, integrações com diferentes APIs de Inteligência Artificial (OpenAI, Gemini) e a orquestração de tarefas complexas de forma assíncrona.

### Funcionalidades Principais

- 🤖 **Orquestração de Fluxos:** Gerencia a conversa com base no estado atual do usuário.
- 🧠 **Múltiplas IAs:** Conecta-se a diferentes provedores de IA para processamento de linguagem natural.
- 🗄️ **Persistência de Dados:** Salva o histórico de tickets e interações em um banco de dados PostgreSQL.
- ⚡ **Gerenciamento de Estado:** Utiliza Redis para um acesso rápido e eficiente ao estado da sessão do usuário.
- 🐳 **Ambiente Containerizado:** Roda em um ambiente Docker, garantindo consistência entre desenvolvimento e produção.

---

## 🛠️ Stack Técnica

| Camada | Tecnologia | Propósito |
|---|---|---|
| **Aplicação** | Node.js 20, Express 4, TypeScript 5 | Base do servidor back-end |
| **Bancos de Dados** | PostgreSQL 16 | Persistência de tickets, usuários e logs |
| **Cache & Jobs** | Redis 7 | Gerenciamento de estado de sessão e filas de tarefas |
| **Validação** | Zod | Validação de schemas e tipos em tempo de execução |
| **IA & NLP** | OpenAI (GPT-4), Google (Gemini) | Processamento de linguagem e geração de respostas |
| **Integração** | Meta (WhatsApp Business API) | Envio e recebimento de mensagens |
| **Container** | Docker, Docker Compose | Orquestração e padronização do ambiente |
| **Migrações de DB** | `node-pg-migrate` | Versionamento e gerenciamento do schema do banco |

---

## ⚡ Instalação

### Pré-requisitos

Certifique-se de ter as seguintes ferramentas instaladas:

```bash
node --version       # v20 ou superior
npm --version        # v10 ou superior
docker --version     # Docker e Docker Compose
```

### Setup do Ambiente

Siga os passos abaixo para configurar e rodar o projeto localmente:

```bash
# 1. Clone o repositório
git clone https://github.com/dresbach-records/GATTE_Bot.git
cd GATTE_Bot

# 2. Instale as dependências do projeto
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# → Abra o arquivo .env e preencha com suas credenciais (PostgreSQL, Redis, APIs, etc.)

# 4. Inicie os serviços de infraestrutura (Postgres e Redis)
docker-compose up -d

# 5. Execute as migrações do banco de dados para criar as tabelas
npm run db:migrate

# 6. Inicie o servidor em modo de desenvolvimento
npm run dev
```

O servidor estará disponível em `http://localhost:3000` (ou na porta definida em seu arquivo `.env`).

---

## 📁 Estrutura do Projeto

A estrutura do projeto foi organizada para promover a modularidade e a separação de responsabilidades.

```
gatte_bot/
├── src/
│   ├── index.ts                 # Ponto de entrada da aplicação Express
│   ├── config/                # Configurações centralizadas (env vars)
│   ├── db/
│   │   ├── migrate.ts         # Script de migração
│   │   ├── pool.ts            # Pool de conexões com PostgreSQL
│   │   └── repositories.ts    # Lógica de acesso aos dados (CRUD)
│   ├── flows/
│   │   └── flow-manager.ts    # Orquestrador de estado e fluxos de conversa
│   ├── handlers/              # Handlers de rota do Express (controllers)
│   ├── middleware/            # Middlewares (autenticação, logging, erros)
│   ├── orchestrator.ts        # Orquestrador principal que conecta os serviços
│   ├── services/
│   │   ├── ai.service.ts      # Integração com as APIs de IA
│   │   ├── jobs.service.ts    # Gerenciamento de tarefas em background com Redis
│   │   └── whatsapp.service.ts# Comunicação com a API do WhatsApp
│   └── utils/
│       ├── logger.ts          # Configuração do logger (Winston)
│       └── security.ts        # Funções de hash, sanitização e validação
├── doc/                       # Documentação técnica e de arquitetura
├── .env.example               # Exemplo de variáveis de ambiente
├── docker-compose.yml         # Arquivo de orquestração de containers
└── tsconfig.json              # Configuração do compilador TypeScript
```

---

## 🔗 Arquitetura e Fluxo

1.  **Webhook:** A API do WhatsApp envia uma mensagem para o endpoint `/webhook`.
2.  **Middleware:** A requisição passa por middlewares de segurança e validação.
3.  **Orquestrador:** O `orchestrator.ts` recebe a mensagem.
4.  **Estado do Usuário:** O `flow-manager.ts` consulta o estado atual do usuário no Redis.
5.  **Execução do Fluxo:** Com base no estado, o `flow-manager` decide qual ação tomar:
    - Chamar o `ai.service.ts` para interpretar a intenção do usuário.
    - Chamar o `repositories.ts` para buscar ou salvar informações no PostgreSQL.
    - Executar uma lógica de negócio específica do fluxo.
6.  **Resposta:** O `whatsapp.service.ts` é acionado para enviar a resposta de volta ao usuário.

---

## 🚀 Scripts Disponíveis

- `npm run dev`: Inicia o servidor em modo de desenvolvimento com `ts-node-dev`.
- `npm run build`: Compila o projeto TypeScript para JavaScript.
- `npm run start`: Inicia o servidor em modo de produção a partir dos arquivos compilados.
- `npm run db:migrate`: Executa as migrações pendentes do banco de dados.

---

## 📚 Documentação

A documentação detalhada sobre a arquitetura, modelo de dados e decisões técnicas está disponível na pasta [`/doc`](./doc/).

| Arquivo | Descrição |
|---|---|
| [`GATTE_DOC01_ModeloDados.md`](./doc/GATTE_DOC01_ModeloDados.md) | Schema do banco de dados e lógica de persistência. |
| [`GATTE_DOC02_Orquestrador.md`](./doc/GATTE_DOC02_Orquestrador.md) | Detalhes sobre o funcionamento do orquestrador de fluxos. |
| [`GATTE_DOC03_PromptBase.md`](./doc/GATTE_DOC03_PromptBase.md) | Estratégias e exemplos de prompts para a IA. |
| [`GATTE_DOC04_SegurancaLGPD.md`](./doc/GATTE_DOC04_SegurancaLGPD.md) | Considerações sobre segurança e conformidade com a LGPD. |

---

## 🔒 Licença

Este projeto é de uso proprietário. A redistribuição e a modificação não autorizadas são estritamente proibidas.

---

<div align="center">

**GATTE_Bot** · Construído com Node.js, IA e 🤍

</div>
