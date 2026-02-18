# 🔒 SEGURANÇA E LGPD — GATTE_Bot

> **Classificação:** Confidencial · Uso Interno
> **Atualizado:** 2024-07-26

---

## 🛡️ Visão Geral

Este documento descreve as práticas de segurança e conformidade com a Lei Geral de Proteção de Dados (LGPD) implementadas no **GATTE_Bot**. O objetivo é garantir a confidencialidade, integridade e disponibilidade dos dados processados, bem como os direitos dos titulares.

---

## 🔑 Autenticação e Autorização

### Validação de Webhook (WhatsApp)

A principal porta de entrada da aplicação é o webhook que recebe mensagens da API da Meta. A segurança desse endpoint é crucial.

- **Assinatura HMAC:** Toda requisição recebida da Meta *deve* ser validada usando a assinatura `X-Hub-Signature-254`. Um middleware é responsável por calcular o hash HMAC-SHA256 do corpo da requisição usando o `APP_SECRET` e compará-lo com a assinatura enviada no header. Requisições que falham nessa verificação são descartadas imediatamente com status `403 Forbidden`.

### Rate Limiting

Para prevenir ataques de negação de serviço (DoS) e abuso, a aplicação implementa um controle de taxa de requisições:

- **Limite por Usuário:** Cada número de telefone (usuário) pode enviar um máximo de **20 mensagens por minuto**. O controle é feito usando o Redis para armazenar um contador por usuário com tempo de expiração.
- **Resposta:** Ao exceder o limite, a aplicação retorna uma resposta `429 Too Many Requests`.

---

## 🛡️ Segurança dos Dados

### Dados em Trânsito

- **HTTPS/TLS:** Todas as comunicações externas, incluindo o webhook e as chamadas para as APIs de IA, são obrigatoriamente feitas sobre HTTPS com TLS 1.3 para garantir a criptografia dos dados em trânsito.

### Dados em Repouso

- **Criptografia do Banco de Dados:** O PostgreSQL é configurado para utilizar criptografia em nível de disco (AES-256).
- **Backups Criptografados:** Os backups diários do banco de dados são criptografados antes de serem armazenados em um local seguro (e.g., S3).

### Sanitização de Inputs

- **Prevenção de Injeção:** Todas as entradas de usuário (mensagens de texto) são tratadas como dados e nunca como código executável. As bibliotecas de acesso ao banco (e.g., `pg`) utilizam queries parametrizadas para prevenir SQL Injection.
- **Validação de Schema:** Zod é utilizado para validar o formato e o tipo de todos os dados de entrada, garantindo que apenas payloads válidos sejam processados.

---

## ⚖️ Conformidade com a LGPD

### Base Legal e Finalidade

O tratamento de dados pessoais segue as bases legais da LGPD, principalmente "execução de contrato" e "consentimento". Cada dado coletado tem uma finalidade explícita (e.g., número de telefone para comunicação, nome para personalização).

### Política de Retenção

| Dado | Retenção | Ação Após Prazo |
|---|---|---|
| **Mensagens** | 90 dias | Conteúdo anonimizado, metadados mantidos. |
| **Contexto da Sessão (Redis)** | 4 horas | Exclusão automática (TTL). |
| **Leads** | 2 anos | Anonimização dos dados identificáveis. |
| **Tickets e Auditoria** | 5 anos | Mantidos para conformidade legal e auditoria. |

### Direitos do Titular

A aplicação deve prever mecanismos para atender aos direitos dos titulares, conforme o Art. 18 da LGPD:

- **Acesso e Portabilidade:** Scripts para exportar os dados de um usuário específico em formato JSON.
- **Correção:** Endpoints para permitir a atualização de dados cadastrais.
- **Eliminação:** Scripts para realizar a exclusão (hard delete) ou anonimização dos dados, respeitando os prazos de retenção legal.

---

## 🔑 Gerenciamento de Segredos

A gestão de credenciais e chaves de API é um ponto crítico de segurança.

| Onde | O que armazenar |
|---|---|
| `.env` (local) | Credenciais para o ambiente de **desenvolvimento**. Este arquivo **NUNCA** deve ser versionado no Git. |
| **Variáveis de Ambiente (Servidor)** | Credenciais de **produção** e **staging**. Injetadas no ambiente de execução do container. |
| **Código/Repositório** | ❌ **NUNCA** armazenar segredos diretamente no código. |

**Boas Práticas:**

- **Rotação de Chaves:** As chaves de API (Meta, OpenAI, etc.) devem ser rotacionadas a cada **90 dias**.
- **Permissões Mínimas:** O usuário do banco de dados utilizado pela aplicação deve ter apenas as permissões estritamente necessárias (`SELECT`, `INSERT`, `UPDATE`), sem permissão para `DROP` ou alterar o schema em produção.

---

## ✅ Checklist de Segurança (Pré-Deploy)

- [ ] O `.env` **não** está incluído no build do Docker.
- [ ] As variáveis de ambiente de produção estão configuradas no orquestrador de containers.
- [ ] O middleware de validação de assinatura do webhook está ativo.
- [ ] O rate limiting está configurado e apontando para o Redis de produção.
- [ ] O SSL está forçado em todas as conexões de entrada e saída.
- [ ] As regras de retenção e anonimização estão implementadas e testadas.
- [ ] As dependências foram auditadas com `npm audit`.

---

*GATTE_Bot · Política de Segurança e LGPD v1.0 · Confidencial · 2024*
