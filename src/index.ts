import express from 'express';
import { config } from '@/config';
import '@/services/whatsapp.service'; // Importa para inicializar o serviço
import { startJobs } from '@/services/jobs.service';
import { errorHandler, requestLogger } from '@/middleware';
import { logger } from '@/utils/logger';
import { pool } from '@/db/pool';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Server Principal
// ══════════════════════════════════════════════════════════

const app = express();

// ─── Parse e Middlewares ──────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// ─── Health check ─────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', version: '1.0.0', env: config.nodeEnv });
  } catch {
    res.status(503).json({ status: 'db_error' });
  }
});

// ─── Endpoint LGPD: solicitar exclusao de dados ───────────
app.post('/privacy/delete', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const { hashPhone } = await import('@/utils/security');
    const { query } = await import('@/db/pool');
    const { UserRepo } = await import('@/db/repositories');

    const hash = hashPhone(phone);
    const [user] = await query('SELECT id FROM users WHERE phone_hash=$1', [hash]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    await UserRepo.anonymize(user.id);
    res.json({ ok: true, message: 'Dados anonimizados conforme LGPD.' });
  } catch (err: any) {
    logger.error('Erro no endpoint LGPD delete', { error: err.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────
async function main() {
  // Verificar conexao com BD
  try {
    await pool.query('SELECT NOW()');
    logger.info('PostgreSQL conectado.');
  } catch (err: any) {
    logger.error('Falha ao conectar ao PostgreSQL', { error: err.message });
    process.exit(1);
  }

  // Iniciar cron jobs
  startJobs();

  // Iniciar servidor
  app.listen(config.port, () => {
    logger.info(`GATTE Bot rodando na porta ${config.port} [${config.nodeEnv}]`);
    logger.info(`Health:  GET  http://localhost:${config.port}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido, encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

main();
