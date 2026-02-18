GATTE Tecnologia
Revenda LC
DOC 04 — Seguranca e LGPD — V2
Criptografia Tecnica, Masking, Anonimizacao e Compliance
USO RESTRITO INTERNO
Versao 2.0  |  2025

1. Estrategia Completa de Criptografia

Dado	Tecnica	Algoritmo	Detalhe de implementacao
Telefone (phone)	Hash unidirecional	SHA-256 + salt	phone_hash = SHA256(phone + SALT_SECRET). Usado nos logs. phone real fica separado.
E-mail do usuario	Mascarado	Truncamento	jo***@gmail.com — exibido ao usuario e logs. Original criptografado.
CNPJ / CPF	Mascarado	Truncamento	12.***.***/0001-** — nunca exibido completo em logs.
Senha / token JWT	Hash + assimetrico	bcrypt + RS256	Senhas: bcrypt cost=12. Tokens JWT: RSA 2048 bits. Expiracao: 8h.
Dados em repouso (BD)	Criptografia de disco	AES-256	Volume criptografado via LUKS (Linux) ou equivalente cloud.
Backups	Criptografados antes upload	AES-256-GCM	Chave de backup separada da chave de producao. Rotacao anual.
Dados em transito	TLS	TLS 1.3	HSTS habilitado. Certificado renovado automaticamente (Let's Encrypt).
API Keys (IA, CRM)	Cofre de segredos	—	Nunca em .env em repositorio. Usar AWS Secrets Manager ou Vault.
Conteudo das mensagens	Sem criptografia extra	—	Protegidas pelo ciframento do volume. Mascaradas nos logs (ver Bloco 3).

2. Politica de Masking nos Logs
Logs nunca devem conter dados pessoais em texto claro. O middleware de masking e aplicado ANTES de qualquer escrita em disco ou servico de logs.

// log-masker.ts — middleware aplicado a todo log do sistema
const MASKING_RULES = [
  // Telefone: +5511999999999 → +55119****9999
  { pattern: /(\+\d{2}\d{2})(\d{5})(\d{4})/, replace: '$1*****$3' },
  // E-mail: usuario@dominio.com → us***@dominio.com
  { pattern: /([a-z]{2})[a-z0-9._%+-]*(@[a-z0-9.-]+\.[a-z]+)/i, replace: '$1***$2' },
  // CNPJ: 12.345.678/0001-90 → 12.***.***/**-**
  { pattern: /(\d{2})\.\d{3}\.\d{3}\/\d{4}-(\d{2})/, replace: '$1.***.***/****-$2' },
  // CPF: 123.456.789-00 → ***.456.***-**
  { pattern: /\d{3}(\.(\d{3}))\.\d{3}-(\d{2})/, replace: '***.$2.***-**' },
  // Numeros de cartao: qualquer sequencia 16 digitos
  { pattern: /\b(\d{4})\d{8}(\d{4})\b/, replace: '$1 **** **** $2' },
];

export function maskLog(message: string): string {
  return MASKING_RULES.reduce((msg, rule) =>
    msg.replace(rule.pattern, rule.replace), message);
}

// Uso no logger:
logger.info(maskLog(`Mensagem recebida de ${phone}: ${content}`));

3. Politica de Anonimizacao (Exclusao LGPD)
Quando um titular solicita exclusao ou apos vencimento do prazo de retencao, o sistema executa anonimizacao — nao hard delete — preservando integridade referencial.

// lgpd-anonymizer.ts
async function anonymizeUser(userId: string): Promise<void> {

  // 1. Anonimizar dados pessoais do usuario
  await db.query(`
    UPDATE users SET
      name         = 'ANONIMIZADO',
      email        = NULL,
      email_masked = NULL,
      phone        = 'ANONIMIZADO_' || id::text,
      phone_hash   = SHA256('DELETED_' || id::text),
      login_token  = NULL,
      lgpd_deleted = true,
      updated_at   = NOW()
    WHERE id = $1`, [userId]);

  // 2. Apagar conteudo das mensagens (manter estrutura para metricas)
  await db.query(`
    UPDATE messages SET
      content        = '[REMOVIDO POR LGPD]',
      content_masked = '[REMOVIDO POR LGPD]'
    WHERE conversation_id IN (
      SELECT id FROM conversations WHERE user_id = $1
    )`, [userId]);

  // 3. Anonimizar leads vinculados
  await db.query(`UPDATE leads SET name='ANONIMIZADO', email=NULL,
    phone='ANONIMIZADO' WHERE user_id = $1`, [userId]);

  // 4. Registrar acao no log de auditoria
  await AuditLog.record({ action:'LGPD_ANONYMIZE', userId, at:new Date() });
}

4. Politica Completa de Logs
Tipo de Log	Retencao	Campos permitidos e proibidos
Log de acesso HTTP	30 dias	✔ IP (hasheado), endpoint, status HTTP, latencia. ✖ Body, query params com dados pessoais.
Log de intencao	60 dias	✔ conversation_id (UUID), intent, handler, timestamp. ✖ Conteudo da mensagem.
Log de erros	90 dias	✔ Stack trace, servico, timestamp, error_code. ✖ Tokens de API, dados do usuario.
Log de auditoria	5 anos	✔ user_id, acao, recurso afetado, timestamp, IP hasheado. Imutavel (append-only).
Log de tickets	5 anos	✔ protocol, status_history, assigned_to. ✔ Pode conter descricao (dado contratual).
Log de custo de tokens	90 dias	✔ conversation_id, model, tokens_in, tokens_out, custo_usd. ✖ Conteudo.
Log de performance	30 dias	✔ endpoint, latencia_ms, p95, p99. Para alertas de SLA de resposta da IA.

5. Checklist de Seguranca — Producao
	Controle	Como validar / implementar
✔	Webhook HMAC-SHA256	Validar header X-Hub-Signature a cada requisicao. Rejeitar se invalido.
✔	Rate limit por telefone	Redis: 20 msgs/min por numero. Blacklist apos 5 violacoes em 1h.
✔	Sanitizacao de inputs	Strips de HTML, SQL injection, LLM prompt injection, caracteres nulos.
✔	Tamanho maximo de msg	Rejeitar mensagens > 4.000 chars. Evitar prompt stuffing.
✔	RBAC (controle por role	Anonimo / cliente_logado / operador / admin. Nunca assumir role.
✔	Varredura de dependencias	npm audit --audit-level=high no CI/CD. Bloquear build se critical.
✔	Rotacao de segredos	API keys, JWT secrets: rotacao a cada 90 dias. Vault ou SSM.
✔	Backup diario criptografado	pg_dump | gpg --encrypt → S3/Wasabi. Testar restore mensalmente.
✔	Monitoramento de anomalias	Alertar se: >100 msgs/h por numero, latencia IA >5s, erro rate >5%.
✔	Headers de seguranca HTTP	HSTS, X-Frame-Options, X-Content-Type, CSP no painel admin.
✔	Logs sem dados pessoais	Validar com teste de regressao: nenhum log pode conter CPF/telefone claro.
✔	Consentimento registrado	users.consent = true + users.consent_at antes de qualquer processamento.

6. Mapa de Risco LGPD
Risco	Probabilidade	Impacto	Mitigacao
Vazamento do banco de dados	Baixa	Critico	Criptografia AES-256 em repouso + backup fora da VPS principal.
Acesso indevido a dados de outro cliente	Media	Critico	Isolamento estrito por user_id em todas as queries. Code review obrigatorio.
Retencao alem do prazo legal	Media	Alto	Job mensal automatico de anonimizacao com log de auditoria.
Logs com dados pessoais	Alta	Medio	Middleware de masking obrigatorio antes de qualquer log. Teste de regressao.
Falta de consentimento registrado	Baixa	Alto	Fluxo obrigatorio de aceite na primeira mensagem. Bloqueio sem consent.
API de IA processando dados sem DPA	Media	Alto	Assinar DPA com Anthropic/OpenAI. Verificar clausula de treinamento OFF.
