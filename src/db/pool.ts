import { Pool, PoolClient } from 'pg';
import { config } from '@/config';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Database Pool
// ══════════════════════════════════════════════════════════

const pool = new Pool({
  host:     config.db.host,
  port:     config.db.port,
  database: config.db.database,
  user:     config.db.user,
  password: config.db.password,
  max:      config.db.poolMax,
  idleTimeoutMillis:    30_000,
  connectionTimeoutMillis: 5_000,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  logger.error('Erro inesperado no pool do PostgreSQL', { error: err.message });
});

// ─── Query helper com logging de latencia ───
export async function query<T = any>(
  sql: string,
  params: any[] = [],
  label?: string
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await pool.query(sql, params);
    const ms = Date.now() - start;
    if (ms > 1000) {
      logger.warn(`Query lenta (${ms}ms)`, { label, sql: sql.slice(0, 80) });
    }
    return result.rows as T[];
  } catch (err: any) {
    logger.error('Erro na query', { label, error: err.message, sql: sql.slice(0, 80) });
    throw err;
  }
}

// ─── Transacao atomica ───
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
