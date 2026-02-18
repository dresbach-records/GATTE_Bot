GATTE WhatsApp AI Bot – Roadmap Técnico
🔴 PRIORIDADE CRÍTICA (Bloqueadores)
1️⃣ Corrigir sistema de migration

 Ajustar migrate.ts para logar erro real (message + stack)

 Validar conexão PostgreSQL antes de executar DDL

 Garantir encerramento correto do pool

 Implementar versionamento de schema (schema_version)

 Criar tabela migrations

2️⃣ Validar DATABASE_URL

 Verificar variável .env

 Adicionar validação obrigatória no bootstrap

 Falhar aplicação se variável estiver ausente

 Logar conexão inicial

3️⃣ Hardening do Orchestrator

 Implementar estado STATE_ERROR

 Implementar estado STATE_TIMEOUT

 Implementar watchdog de sessão inativa

 Logar todas transições de estado

 Registrar intenção detectada

🟠 PRIORIDADE ALTA (Produção)
4️⃣ Middleware de Validação

 Validar payload do webhook WhatsApp

 Sanitizar entrada antes de processar

 Rate limiting por número

 Proteção contra spam

5️⃣ Melhorar Logger

 Adicionar request_id único

 Adicionar correlation_id por conversa

 Log estruturado JSON

 Masking automático de telefone

 Masking automático de CNPJ

6️⃣ Segurança

 Confirmar AES-256-GCM funcionando

 Garantir que dados sensíveis não são logados

 Adicionar rotação de chave

 Configurar TLS obrigatório

 Implementar sanitização de SQL

7️⃣ Prompt Governance

 Fixar temperature do classificador (0.2)

 Fixar temperature do responder (0.4)

 Adicionar política explícita de recusa

 Adicionar proteção contra jailbreak

 Implementar limite de tokens por requisição

🟡 PRIORIDADE MÉDIA (Escalabilidade)
8️⃣ Observabilidade

 Métrica de intenções mais frequentes

 Métrica de escalonamento humano

 Métrica de erro por fluxo

 Métrica de timeout

 Log de custo estimado de tokens

9️⃣ Jobs e Manutenção

 Job para limpar sessões inativas

 Job para anonimização automática

 Job para expirar certificados

 Job para reprocessar falhas

🔵 PRIORIDADE ESTRUTURAL (Arquitetura)
🔟 API Formal

 Criar documentação OpenAPI

 Documentar endpoints

 Documentar webhook

 Documentar payload padrão

1️⃣1️⃣ Infraestrutura

 Criar Dockerfile

 Criar docker-compose (Postgres + Bot)

 Configurar Nginx reverse proxy

 Configurar SSL

 Implementar CI/CD

1️⃣2️⃣ Escalabilidade futura

 Introduzir Redis para cache

 Introduzir fila (BullMQ / RabbitMQ)

 Separar orquestrador em microserviço

 Criar painel admin

🟢 PRIORIDADE EVOLUTIVA (Produto)
1️⃣3️⃣ Dashboard Admin

 Visualizar tickets

 Visualizar leads

 Visualizar sessões ativas

 Forçar reset de conversa

 Forçar escalonamento humano

1️⃣4️⃣ Inteligência

 Embeddings para FAQ

 Base vetorial

 Memória longa

 Aprendizado supervisionado de intenção

🧪 TESTES
1️⃣5️⃣ Testes Automatizados

 Teste unitário do Orchestrator

 Teste da máquina de estados

 Teste de classificação de intenção

 Teste de fallback

 Teste de erro de banco

 Teste de fluxo completo

🚀 CHECKLIST PRODUÇÃO

 Variáveis de ambiente seguras

 Logs estruturados

 Banco com backup automático

 TLS ativo

 Health check endpoint

 Monitoramento ativo

 Rate limiting ativo

 Error boundary global

📊 NÍVEL ATUAL DO PROJETO

Arquitetura: Alta
Governança IA: Alta
Segurança: Boa
Observabilidade: Média
Infraestrutura: Incompleta
Pronto para produção: Parcial