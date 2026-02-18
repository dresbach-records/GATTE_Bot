import crypto from 'crypto';
import { config } from '@/config';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Security Utils
// ══════════════════════════════════════════════════════════

// ─── Hash de telefone (para logs e indices) ───
export function hashPhone(phone: string): string {
  return crypto
    .createHmac('sha256', config.security.saltSecret)
    .update(phone)
    .digest('hex');
}

// ─── Mascarar e-mail para exibicao ───
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.slice(0, 2) + '***';
  return `${masked}@${domain}`;
}

// ─── Sanitizacao de input ───
export function sanitizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/<[^>]*>/g, '')                  // remove HTML tags
    .replace(/['"`;\\]/g, '')                 // remove chars perigosos para SQL
    .replace(/\{.*?\}/g, '[...]')             // remove tentativas de prompt injection
    .slice(0, config.security.maxMsgLength);  // limita tamanho
}

// ─── Validadores ───
export const validate = {
  name:     (v: string) => v.trim().length >= 3 && v.trim().length <= 150,
  email:    (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  phone:    (v: string) => /^\+?\d{10,15}$/.test(v.replace(/\s/g, '')),
  minLength: (min: number) => (v: string) => v.trim().length >= min,
  option:   (opts: string[]) => (v: string) => opts.includes(v.trim()),
  protocol: (v: string) => /^BR-\d{8}-\d{4}$/.test(v.trim()),
};

// ─── Gerar protocolo de ticket ───
export function generateProtocol(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BR-${date}-${rand}`;
}

// ─── Verificar assinatura HMAC do webhook ───
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true; // dev mode
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', '')),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
