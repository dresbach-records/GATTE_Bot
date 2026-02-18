
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // App
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default('development'),

  // WhatsApp (Evolution API)
  WHATSAPP_BASE_URL: z.string().url(),
  WHATSAPP_API_KEY: z.string(),
  WHATSAPP_INSTANCE: z.string(),
  WHATSAPP_WEBHOOK_SECRET: z.string(),

  // Database (PostgreSQL)
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_DATABASE: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_SSL: z.string().transform(val => val === 'true').default('false'),
  DB_POOL_MAX: z.coerce.number().default(10),

  // AI (OpenAI)
  AI_API_KEY: z.string(),
  AI_MODEL_CLASSIFY: z.string().default('gpt-3.5-turbo'),
  AI_MODEL_CONTENT: z.string().default('gpt-4o'),
  AI_TEMPERATURE: z.coerce.number().default(0.7),
  AI_MAX_TOKENS: z.coerce.number().default(1000),

  // Microsoft Graph (Calendar)
  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
  MS_TENANT_ID: z.string().optional(),
  MS_USER_ID: z.string().optional(),

  // Security
  PHONE_CRYPTO_KEY: z.string().length(64), // 32 bytes em hex

  // Company Data
  COMPANY_NAME: z.string().default('GATTE Tecnologia'),
  COMPANY_SUPPORT_EMAIL: z.string().email().default('suporte@gatte.com.br'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors
  );
  throw new Error('Invalid environment variables.');
}

const env = parsedEnv.data;

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  whatsapp: {
    baseUrl: env.WHATSAPP_BASE_URL,
    apiKey: env.WHATSAPP_API_KEY,
    instance: env.WHATSAPP_INSTANCE,
    webhookSecret: env.WHATSAPP_WEBHOOK_SECRET,
  },
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_DATABASE,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL,
    poolMax: env.DB_POOL_MAX,
  },
  ai: {
    apiKey: env.AI_API_KEY,
    modelClassify: env.AI_MODEL_CLASSIFY,
    modelContent: env.AI_MODEL_CONTENT,
    temperature: env.AI_TEMPERATURE,
    maxTokens: env.AI_MAX_TOKENS,
  },
  ms: {
    clientId: env.MS_CLIENT_ID,
    clientSecret: env.MS_CLIENT_SECRET,
    tenantId: env.MS_TENANT_ID,
    userId: env.MS_USER_ID,
  },
  security: {
    phoneCryptoKey: env.PHONE_CRYPTO_KEY,
  },
  company: {
    name: env.COMPANY_NAME,
    supportEmail: env.COMPANY_SUPPORT_EMAIL,
  },
} as const;
