GATTE Tecnologia
Revenda LC
DOC 04 — Seguranca e LGPD
Privacidade, Armazenamento, Logs e Conformidade Legal
Versao 1.0  |  2025  |  USO RESTRITO INTERNO

1. Dados Pessoais Processados
O ChatBot da GATTE processa dados pessoais de clientes e potenciais clientes via WhatsApp. E obrigatorio definir a base legal e finalidade de cada dado conforme a LGPD (Lei 13.709/2018).

Dado Pessoal	Classificacao	Base Legal LGPD	Finalidade
Numero de telefone	Pessoal	Execucao de contrato	Identificacao e comunicacao
Nome completo	Pessoal	Consentimento	Personalizacao do atendimento
Endereco de e-mail	Pessoal	Consentimento	Envio de confirmacoes e leads
CNPJ / Razao social	Empresarial	Execucao de contrato	Vinculacao de servicos contratados
Historico de conversa	Pessoal	Interesse legitimo	Continuidade e contexto do atendimento
Descricao de problemas	Pessoal	Execucao de contrato	Abertura e resolucao de chamados
Dados de servicos	Pessoal/contratual	Execucao de contrato	Consulta e suporte ao cliente
Dados de certificado	Pessoal sensivel	Obrigacao legal	Emissao e controle de validade

2. Politica de Armazenamento Seguro

Em Repouso (at rest)	Em Transito (in transit)	Chaves e Segredos
PostgreSQL: criptografia AES-256 em disco
Backups criptografados antes do upload
Volume criptografado na VPS (LUKS)
Logs sem dados pessoais em texto claro	TLS 1.3 obrigatorio em todas as conexoes
HTTPS com certificado valido (Let's Encrypt)
Evolution API via conexao interna (sem internet)
API de IA via HTTPS com autenticacao por token	NUNCA armazenar chaves em codigo-fonte
Usar variaveis de ambiente (.env) no servidor
Rotacao de API keys a cada 90 dias
HashiCorp Vault ou similar para segredos criticos

3. Politica de Logs
Logs sao essenciais para auditoria e debugging, mas nao devem conter dados pessoais em texto claro.

Tipo de Log	Retencao	O que DEVE e NAO DEVE conter
Log de acesso (HTTP)	30 dias	DEVE: IP, endpoint, status, timestamp. NAO: corpo da requisicao com dados pessoais
Log de intencoes	60 dias	DEVE: conversation_id, intencao, handler acionado. NAO: conteudo da mensagem
Log de erros	90 dias	DEVE: stack trace, timestamp, servico. NAO: tokens de API ou dados do usuario
Log de auditoria	5 anos	DEVE: user_id, acao realizada, timestamp. Para compliance e investigacoes
Log de tickets	5 anos	DEVE: protocol, status changes, assigned_to. Historico completo de chamados

4. Direitos do Titular (LGPD)
O sistema deve ser capaz de atender as solicitacoes dos titulares de dados conforme o Art. 18 da LGPD:

Direito	Prazo de Atendimento	Como implementar no sistema
Confirmacao de tratamento	Imediato	Endpoint GET /privacy/my-data retorna lista de dados
Acesso aos dados	15 dias	Exportar todos os registros do usuario em JSON/PDF
Correcao de dados	15 dias	Endpoint PATCH /users/:id com autenticacao
Anonimizacao	15 dias	Script que substitui dados pessoais por hashes
Eliminacao completa	15 dias	Hard delete respeitando retencoes legais obrigatorias
Portabilidade	15 dias	Exportacao em formato estruturado (JSON ou CSV)
Revogacao de consentimento	Imediato	Flag consent_revoked = true + parar processamento

5. Controles de Seguranca da Aplicacao
Checklist de seguranca obrigatoria antes de ir para producao:

	Controle	Detalhe de implementacao
✔	Autenticacao do webhook WhatsApp	Verificar assinatura HMAC-SHA256 do header X-Hub-Signature
✔	Rate limiting por numero de telefone	Maximo 20 mensagens/minuto por usuario (Redis)
✔	Sanitizacao de inputs	Remover HTML, SQL injection e caracteres especiais
✔	Validacao de tamanho de mensagem	Rejeitar mensagens acima de 4.000 caracteres
✔	Controle de acesso por role	Separar: usuario anonimo / cliente logado / admin
✔	Monitoramento de anomalias	Alertar se um numero enviar 100+ msgs/hora
✔	Backup diario automatico	Backup PostgreSQL criptografado para S3 ou equivalente
✔	Atualizacoes de dependencias	Rodar npm audit semanalmente em CI/CD
✔	Varredura de vulnerabilidades	OWASP ZAP ou Snyk antes de cada release
✔	Politica de senhas de BD	Senha forte + usuario dedicado sem permissao de DROP

6. Aviso de Privacidade — Texto para o WhatsApp
Este texto deve ser exibido ao usuario na primeira interacao ou quando ele perguntar sobre privacidade:

