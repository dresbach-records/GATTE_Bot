import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '@/config';
import { verifyWebhookSignature } from '@/utils/security';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Middlewares
// ══════════════════════════════════════════════════════════

const redis = new Redis(config.redis.url);
redis.connect().catch(err => logger.warn('Redis nao conectado (rate limit desabilitado)', { error: err.message }));

// ─── RATE LIMITER por numero de telefone ─────────────────
export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = extractPhone(req.body);
    if (!phone) return next();

    const key   = `rl:${phone}:${Math.floor(Date.now() / 60000)}`; // janela de 1min
    const count = await redis.incr(key);
    await redis.expire(key, 90); // TTL de 90s para limpeza

    if (count === 1) {
      // Primeira msg na janela: verificar blacklist
      const blocked = await redis.get(`blacklist:${phone}`);
      if (blocked) {
        logger.warn('Numero em blacklist tentou enviar mensagem');
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
    }

    if (count > config.security.rateLimitMsgs) {
      // Adicionar a blacklist apos 5 violacoes em 1h
      const violations = await redis.incr(`violations:${phone}`);
      await redis.expire(`violations:${phone}`, 3600);
      if (violations >= 5) {
        await redis.set(`blacklist:${phone}`, '1', 'EX', 3600);
        logger.warn('Numero adicionado a blacklist por excesso de requisicoes');
      }
      return res.status(429).json({ error: 'Too many messages. Try again later.' });
    }
  } catch (err: any) {
    // Se Redis cair, nao bloqueia o sistema
    logger.warn('Rate limiter falhou (Redis?), prosseguindo sem limite');
  }

  next();
}

// ─── WEBHOOK SIGNATURE VALIDATOR ─────────────────────────
export function webhookValidator(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string || '';
  const payload   = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, config.whatsapp.webhookSecret)) {
    logger.warn('Webhook com assinatura invalida rejeitado');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// ─── ERROR HANDLER GLOBAL ─────────────────────────────────
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error('Erro nao tratado', { error: err.message, stack: err.stack?.slice(0, 500) });
  res.status(500).json({ error: 'Internal server error' });
}

// ─── REQUEST LOGGER ───────────────────────────────────────
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', {
      method:  req.method,
      path:    req.path,
      status:  res.statusCode,
      ms:      Date.now() - start,
    });
  });
  next();
}

// ─── HELPER ───────────────────────────────────────────────
function extractPhone(body: any): string | null {
  return body?.data?.key?.remoteJid?.split('@')[0]
    || body?.data?.from
    || null;
}
