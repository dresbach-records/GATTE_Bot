Blueprint Arquitetural Oficial – Versão Produção
1️⃣ VISÃO DO SISTEMA

O GATTE WhatsApp AI Bot é um sistema de atendimento automatizado com:

Classificação de intenção

Orquestração determinística

Fluxos estruturados

Resposta generativa controlada

Persistência de contexto

Conformidade com LGPD

Escalonamento humano

Objetivo:
Reduzir carga operacional, padronizar atendimento e manter governança sobre IA.

2️⃣ ARQUITETURA MACRO
WhatsApp API
     ↓
Webhook Controller
     ↓
Middleware (Validação + Segurança)
     ↓
Orchestrator
     ↓
 ┌──────────────┬──────────────┬──────────────┐
 │ FlowManager  │ AI Service   │ Repositories │
 └──────────────┴──────────────┴──────────────┘
     ↓
PostgreSQL


Separação clara de responsabilidade.

3️⃣ CAMADAS DO SISTEMA
🔹 3.1 Camada de Entrada (Webhook Layer)

Responsável por:

Receber mensagens

Validar assinatura

Sanitizar payload

Identificar usuário

Falha aqui → requisição rejeitada.

🔹 3.2 Orchestrator (Núcleo)

Responsável por:

Recuperar contexto da conversa

Classificar intenção

Aplicar regra de prioridade

Verificar estado atual

Decidir:

Fluxo estruturado

Resposta IA

Escalonamento humano

Reset

Não contém lógica de negócio direta.
Somente decisão.

🔹 3.3 Flow Manager

Implementa máquina de estados formal.

Estados principais:

STATE_MENU

STATE_TICKET_FLOW

STATE_LEAD_FLOW

STATE_AGENDAMENTO

STATE_AI_FREE

STATE_ESCALATED

STATE_ERROR

STATE_TIMEOUT

Cada fluxo possui:

Step atual

Validação de entrada

Transição definida

Sem transição implícita.

🔹 3.4 AI Layer

Dividida em duas funções:

1. Classificador

Temperature baixa

Enum de intenções

Sem geração longa

Custo controlado

2. Respondedor

System prompt fixo

Anti-alucinação

Limite de tokens

Controle de escopo

Nunca gera lógica de fluxo.

🔹 3.5 Camada de Dados

PostgreSQL com:

users

conversations

messages

session_context

tickets

leads

appointments

services

certificates

Separação entre:

Histórico de mensagem

Contexto operacional

Dados de negócio

4️⃣ FLUXO DE EXECUÇÃO
Recebimento de mensagem:

Webhook recebe payload

Middleware valida

Usuário identificado ou criado

Recupera session_context

Orchestrator classifica intenção

Aplica regra de prioridade

Executa fluxo ou IA

Salva mensagem

Atualiza estado

Envia resposta

Tempo alvo: < 2s

5️⃣ REGRAS DE PRIORIDADE

Ordem:

Fluxo ativo em andamento

Comando explícito (menu estruturado)

Intenção classificada

Fallback IA livre

Escalonamento humano

Sem ambiguidade.

6️⃣ GESTÃO DE CONTEXTO

Últimas N mensagens (ex: 10)

session_context separado

Reset automático após timeout

Limite de tamanho JSON

Persistência por conversa

Evita explosão de tokens.

7️⃣ SEGURANÇA

Implementado em:

Sanitização de input

Masking automático

AES-256-GCM

Hash seguro

TLS obrigatório

Logs sem dados sensíveis

LGPD:

Retenção configurável

Anonimização

Direito à exclusão

8️⃣ LOGGING E OBSERVABILIDADE

Registrar:

intent_detected

previous_state

next_state

request_id

user_id (mascarado)

error_code

token_usage

Nunca registrar:

CPF

CNPJ

Certificado

Dados financeiros

9️⃣ INFRAESTRUTURA RECOMENDADA

Produção mínima:

Docker

PostgreSQL separado

Nginx reverse proxy

TLS 1.3

Backup criptografado

Monitoramento

CI/CD

Escalável para:

Redis

Fila assíncrona

Microserviço separado de IA

🔟 FAILSAFE

Se:

IA falhar

Banco falhar

Timeout ocorrer

Classificador retornar inválido

Sistema:

Loga erro

Envia mensagem padrão

Escala para humano

Marca estado como STATE_ERROR

Nunca deixa conversa pendurada.

1️⃣1️⃣ EXTENSÕES FUTURAS

Dashboard administrativo

Métrica de intenção

Base vetorial FAQ

Treinamento supervisionado

Multi-tenant

Integração direta com LC ERP

1️⃣2️⃣ NÍVEL ATUAL DO SISTEMA

Arquitetura: Alta
Governança IA: Alta
Segurança: Boa
Observabilidade: Média
Infraestrutura: Parcial
Pronto para produção: Sim, após hardening