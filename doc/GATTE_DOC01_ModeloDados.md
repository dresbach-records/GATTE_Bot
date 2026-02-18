GATTE Tecnologia
Revenda LC
DOC 01 — Modelo de Dados
Estrutura Completa do Banco de Dados PostgreSQL
Versao 1.0  |  2025

1. Visao Geral do Modelo
O banco de dados do ChatBot GATTE e estruturado em PostgreSQL com 9 tabelas principais que cobrem todas as entidades do sistema: usuarios, conversas, mensagens, tickets, leads, agendamentos, servicos, certificados e contexto de sessao da IA.

-- Mapa de Relacionamentos
users          (1) ─────── (N) conversations
conversations  (1) ─────── (N) messages
conversations  (1) ─────── (1) session_context
users          (1) ─────── (N) tickets
users          (1) ─────── (N) leads
users          (1) ─────── (N) appointments
users          (1) ─────── (N) services
services       (1) ─────── (N) certificates

2. Tabelas do Banco de Dados
Tabela: users
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	Identificador unico do usuario (PK)
phone	VARCHAR(20)	SIM	Numero WhatsApp com DDI (+5511...)
name	VARCHAR(150)	NAO	Nome coletado pelo chatbot
email	VARCHAR(200)	NAO	E-mail coletado pelo chatbot
company	VARCHAR(200)	NAO	Empresa do cliente
is_client	BOOLEAN	SIM	True se cliente ativo da GATTE
login_token	VARCHAR(512)	NAO	Token para acesso autenticado
created_at	TIMESTAMP	SIM	Data de primeiro contato
updated_at	TIMESTAMP	SIM	Ultima atualizacao do registro

Tabela: conversations
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	Identificador unico da conversa (PK)
user_id	UUID	SIM	FK → users.id
status	ENUM	SIM	open | closed | transferred | waiting
mode	ENUM	SIM	menu | ai_free | human | flow
current_flow	VARCHAR(100)	NAO	Nome do fluxo ativo (ex: ticket_flow)
transferred_to	VARCHAR(100)	NAO	Atendente humano responsavel
started_at	TIMESTAMP	SIM	Inicio da conversa
closed_at	TIMESTAMP	NAO	Encerramento da conversa
total_messages	INTEGER	SIM	Contador de mensagens (default 0)

Tabela: messages
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	Identificador unico (PK)
conversation_id	UUID	SIM	FK → conversations.id
role	ENUM	SIM	user | assistant | system
content	TEXT	SIM	Conteudo da mensagem
tokens_used	INTEGER	NAO	Tokens consumidos nesta mensagem
is_in_context	BOOLEAN	SIM	True se ainda incluida no contexto da IA
intent_detected	VARCHAR(100)	NAO	Intencao classificada (ex: ticket_open)
created_at	TIMESTAMP	SIM	Timestamp da mensagem

Tabela: session_context
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	PK
conversation_id	UUID	SIM	FK → conversations.id (UNIQUE)
messages_json	JSONB	SIM	Ultimas N mensagens serializadas para IA
summary	TEXT	NAO	Resumo gerado pela IA de conversas antigas
ttl_expires_at	TIMESTAMP	SIM	Expiracao da sessao (padrao: +4 horas)
updated_at	TIMESTAMP	SIM	Ultima atualizacao do contexto

Tabela: tickets
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	PK
protocol	VARCHAR(20)	SIM	Numero de protocolo exibido ao cliente
user_id	UUID	SIM	FK → users.id
conversation_id	UUID	SIM	FK → conversations.id
title	VARCHAR(300)	SIM	Titulo resumido do problema
description	TEXT	SIM	Descricao completa coletada pelo bot
status	ENUM	SIM	open | in_progress | resolved | closed
priority	ENUM	SIM	low | medium | high | critical
category	VARCHAR(100)	NAO	Categoria tecnica do chamado
assigned_to	VARCHAR(150)	NAO	Tecnico responsavel
resolved_at	TIMESTAMP	NAO	Data de resolucao
created_at	TIMESTAMP	SIM	Data de abertura

Tabela: leads
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	PK
user_id	UUID	NAO	FK → users.id (se ja cadastrado)
name	VARCHAR(150)	SIM	Nome do lead
company	VARCHAR(200)	NAO	Empresa do lead
phone	VARCHAR(20)	SIM	Telefone do lead
email	VARCHAR(200)	NAO	E-mail do lead
interest	VARCHAR(200)	NAO	Produto ou servico de interesse
stage	ENUM	SIM	new | contacted | qualified | lost | converted
source	VARCHAR(100)	SIM	Origem: whatsapp_bot | site | indicacao
notes	TEXT	NAO	Observacoes adicionais do chatbot
crm_id	VARCHAR(100)	NAO	ID no CRM externo (ex: Pipedrive)
created_at	TIMESTAMP	SIM	Data de captacao

Tabela: appointments
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	PK
user_id	UUID	SIM	FK → users.id
type	ENUM	SIM	demo | support | training | followup
scheduled_at	TIMESTAMP	SIM	Data e hora do agendamento
duration_min	INTEGER	SIM	Duracao prevista em minutos
assigned_to	VARCHAR(150)	NAO	Responsavel da GATTE
status	ENUM	SIM	pending | confirmed | done | cancelled
notes	TEXT	NAO	Observacoes do agendamento
calendar_event_id	VARCHAR(200)	NAO	ID do evento no Google Calendar
created_at	TIMESTAMP	SIM	Data de criacao

Tabela: services
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	PK
user_id	UUID	SIM	FK → users.id
name	VARCHAR(200)	SIM	Nome do servico (ex: LC Web Profissional)
plan	ENUM	SIM	essencial | profissional | enterprise
status	ENUM	SIM	active | suspended | cancelled | trial
contracted_at	TIMESTAMP	SIM	Data de contratacao
expires_at	TIMESTAMP	NAO	Data de expiracao (se aplicavel)
monthly_value	NUMERIC(10,2)	NAO	Valor mensal do servico
notes	TEXT	NAO	Observacoes do contrato

Tabela: certificates
Coluna	Tipo	Obrigatorio	Descricao
id	UUID	SIM	PK
service_id	UUID	SIM	FK → services.id
user_id	UUID	SIM	FK → users.id
type	ENUM	SIM	e-CPF | e-CNPJ | e-NFe | e-CT
issued_at	TIMESTAMP	SIM	Data de emissao
expires_at	TIMESTAMP	SIM	Data de vencimento
days_to_expire	INTEGER	SIM	Campo calculado: dias restantes
status	ENUM	SIM	valid | expired | revoked | pending
alert_sent	BOOLEAN	SIM	True se alerta de vencimento foi enviado


3. Indices e Performance
Os seguintes indices sao essenciais para performance em producao:

Indice	Justificativa
users(phone)	Busca por numero WhatsApp a cada mensagem recebida
conversations(user_id, status)	Buscar conversa aberta do usuario rapidamente
messages(conversation_id, created_at)	Carregar historico em ordem cronologica
tickets(protocol)	Consulta de chamado pelo numero de protocolo
tickets(user_id, status)	Listar chamados abertos do cliente
certificates(expires_at, status)	Job diario de alerta de vencimento
session_context(ttl_expires_at)	Limpeza automatica de sessoes expiradas

4. Regras de Retencao de Dados (LGPD)
Conforme a LGPD, os dados pessoais devem ter prazo definido de retencao:

Tabela	Retencao	Acao apos prazo
messages	90 dias	Deletar conteudo, manter metadados anonimizados
session_context	4 horas (TTL)	Deletar automaticamente via job
leads	2 anos	Anonimizar nome, email e telefone
users	5 anos	Anonimizar dados pessoais, manter UUID
tickets	5 anos	Manter integro para auditoria
