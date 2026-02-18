import dotenv from 'dotenv';
dotenv.config();

// ══════════════════════════════════════════════════════════
// GATTE BOT — Config Central
// ══════════════════════════════════════════════════════════

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Variavel de ambiente obrigatoria ausente: ${key}`);
  return val;
}

export const config = {
  // ─── Servidor ───
  port:    parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // ─── WhatsApp (Evolution API) ───
  whatsapp: {
    baseUrl:    required('EVOLUTION_API_URL'),       // ex: http://localhost:8080
    apiKey:     required('EVOLUTION_API_KEY'),
    instance:   required('EVOLUTION_INSTANCE'),      // nome da instancia
    webhookSecret: process.env.WEBHOOK_SECRET || '',
  },

  // ─── Banco de Dados ───
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'gatte_bot',
    user:     process.env.DB_USER     || 'gatte',
    password: required('DB_PASSWORD'),
    ssl:      process.env.DB_SSL === 'true',
    poolMax:  parseInt(process.env.DB_POOL_MAX || '20'),
  },

  // ─── Redis ───
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // ─── IA (Anthropic) ───
  ai: {
    apiKey:           required('ANTHROPIC_API_KEY'),
    classifierModel:  'claude-haiku-3-5-20251001',  // leve, classificacao
    responderModel:   'claude-sonnet-4-5',             // potente, resposta final
    maxTokensClassifier: 100,
    maxTokensResponder:  1500,
    maxContextTokens:    2000,
    maxContextMessages:  10,
    summarizeAfter:      20,
    sessionTTLHours:     4,
  },

  // ─── Seguranca ───
  security: {
    saltSecret:    required('SALT_SECRET'),          // para hash de telefone
    jwtSecret:     required('JWT_SECRET'),
    jwtExpiry:     '8h',
    rateLimitMsgs: 20,                               // msgs por minuto por user
    maxMsgLength:  4000,
  },

  // ─── CRM ───
  crm: {
    enabled: process.env.CRM_ENABLED === 'true',
    baseUrl:  process.env.CRM_URL || '',
    apiKey:   process.env.CRM_API_KEY || '',
  },

  // ─── GATTE Info (usada no system prompt) ───
  company: {
    name:          'GATTE Tecnologia',
    whatsappHuman: process.env.WHATSAPP_HUMAN || '+5500000000000',
    supportEmail:  process.env.SUPPORT_EMAIL  || 'suporte@gatte.com.br',
    privacyEmail:  process.env.PRIVACY_EMAIL  || 'privacidade@gatte.com.br',
  },
};

export const SLA_HOURS: Record<string, number> = {
  critical: 2,
  high:     8,
  medium:   24,
  low:      72,
};
