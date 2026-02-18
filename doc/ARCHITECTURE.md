# 🏗️ ARQUITETURA — GATTE_Bot

> **Stack:** Node.js 20 · Express 4 · TypeScript 5 · PostgreSQL 16 · Redis 7 · Docker
> **Padrão:** Orquestrador de Fluxos · Orientado a Eventos · State-driven

---

## 📐 Diagrama de Camadas

```
┌──────────────────────────────────────────────────────────┐
│                  CLIENTE (Usuário WhatsApp)                │
└────────────────────────────┬─────────────────────────────┘
                             │ Mensagem (texto, áudio, etc.)
┌────────────────────────────▼─────────────────────────────┐
│               META (WhatsApp Business API)                 │
│     Recebe a mensagem e a encaminha para o Webhook         │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS (POST /webhook)
┌────────────────────────────▼─────────────────────────────┐
│                     GATTE_Bot (Express)                    │
│                                                          │
│  ┌──────────────────┐      ┌─────────────────────────┐   │
│  │    Middleware    │──────▶     Orquestrador.ts     │   │
│  │ (Auth, Validate) │      └───────────┬───────────┘   │
│  └──────────────────┘                  │               │
│                                        │               │
│  ┌──────────────────┐      ┌───────────▼───────────┐   │
│  │  Flow-Manager.ts │◀─────▶     AI.service.ts     │   │
│  │ (Gerencia Fluxo) │      │ (OpenAI, Gemini, etc.)  │   │
│  └─────────┬────────┘      └─────────────────────────┘   │
└────────────┼──────────────────────────┬─────────────────┘
             │                          │
   (Estado)  │                          │ (Persistência)
┌────────────▼───────────┐  ┌───────────▼──────────────────┐
│       Redis 7          │  │     PostgreSQL 16            │
│                        │  │                              │
│  - Sessão do Usuário   │  │  - Tickets de Atendimento    │
│  - Estado do Fluxo     │  │  - Histórico de Conversas    │
│  - Fila de Jobs        │  │  - Logs de Auditoria         │
└────────────────────────┘  └──────────────────────────────┘
```

---

## 🧩 Componentes Principais

| Componente | Responsabilidade |
|---|---|
| **Express Server** | Ponto de entrada da API, gerenciamento de rotas e middlewares. |
| **Orquestrador.ts** | Componente central que recebe os eventos e delega para os serviços corretos. |
| **Flow-Manager.ts** | Gerencia o estado da conversa e decide qual fluxo de chatbot deve ser executado. |
| **AI.service.ts** | Abstrai a comunicação com diferentes LLMs (GPT, Gemini) para processar texto. |
| **Whatsapp.service.ts** | Encapsula a lógica de envio e formatação de mensagens para a API do WhatsApp. |
| **Jobs.service.ts** | Lida com tarefas assíncronas (e.g., processamento de áudio, relatórios) usando Redis. |
| **PostgreSQL 16** | Fonte de verdade para dados persistentes como tickets e logs. |
| **Redis 7** | Armazena dados voláteis e de acesso rápido, como o estado da sessão do usuário. |
| **Zod** | Garante a validação e a tipagem correta dos dados que entram e saem da API. |
| **Docker** | Containeriza a aplicação e seus serviços (Postgres, Redis) para portabilidade. |

---

## 🔄 Fluxo de uma Mensagem

O fluxo de uma mensagem de entrada é orquestrado da seguinte forma:

1.  **Webhook Recebe Mensagem:** O endpoint `POST /webhook` recebe uma notificação da API do WhatsApp.
2.  **Validação:** Um middleware Zod valida se o corpo da requisição corresponde ao formato esperado pela Meta.
3.  **Orquestrador Acionado:** O `orchestrator.ts` é chamado e recebe os dados da mensagem.
4.  **Consulta de Estado:** O `orchestrator.ts` solicita ao `flow-manager.ts` o estado atual do usuário, que é buscado no Redis.
5.  **Decisão de Fluxo:** Com base no estado (ex: `AGUARDANDO_NOME`, `TRIAGEM_INICIAL`), o `flow-manager.ts` determina qual parte do fluxo de conversa deve ser executada.
6.  **Processamento de IA (se necessário):** Se o fluxo exigir interpretação de linguagem natural, o `ai.service.ts` é invocado para processar o texto da mensagem do usuário.
7.  **Execução da Lógica:** A lógica de negócio do fluxo é executada. Isso pode envolver:
    - Salvar dados no PostgreSQL (e.g., abrir um novo ticket).
    - Adicionar uma tarefa na fila do Redis (e.g., transcrever um áudio).
    - Alterar o estado do usuário no Redis para o próximo passo da conversa.
8.  **Envio da Resposta:** O `whatsapp.service.ts` formata e envia a mensagem de resposta para o usuário através da API do WhatsApp.

---

## 🏛️ Decisões Técnicas

### Por que usar Redis para Gerenciamento de Estado?

O estado de uma conversa de chatbot é volátil e precisa ser acessado rapidamente a cada mensagem. Usar um banco de dados em memória como o Redis é ideal para isso, pois oferece latência muito baixa em comparação com um banco de dados relacional. Isso garante que o bot possa responder instantaneamente, mesmo com um grande volume de usuários simultâneos.

### Por que um Orquestrador de Fluxos (`flow-manager.ts`)?

Centralizar a lógica de transição de estados em um único componente (`flow-manager`) torna o sistema mais organizado e fácil de manter. Em vez de espalhar a lógica de conversação por vários arquivos, temos um "mapa" claro de como a conversa evolui. Isso facilita a adição de novos fluxos e a depuração de fluxos existentes.

### Por que desacoplar o Serviço de IA (`ai.service.ts`)?

O mercado de IA está em constante evolução. Ao criar um serviço de abstração (`ai.service.ts`), podemos facilmente trocar o provedor de IA (de OpenAI para Gemini, por exemplo) ou até mesmo usar múltiplos provedores simultaneamente, sem a necessidade de alterar a lógica de negócio principal do chatbot. A interface permanece a mesma, enquanto a implementação pode ser substituída.

---

*GATTE_Bot · Arquitetura v1.0 · 2024*
