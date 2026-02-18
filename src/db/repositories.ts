import { query, transaction } from '@/db/pool';
import { User, Conversation, SessionContext, Ticket, Lead } from '@/types';
import { hashPhone, maskEmail, generateProtocol } from '@/utils/security';
import { config, SLA_HOURS } from '@/config';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Repositories (acesso ao banco)
// ══════════════════════════════════════════════════════════

// ─── USER REPO ────────────────────────────────────────────
export const UserRepo = {

  async findOrCreate(phone: string): Promise<User> {
    const hash = hashPhone(phone);
    const found = await query<User>(
      'SELECT * FROM users WHERE phone_hash = $1 LIMIT 1',
      [hash], 'user.findByHash'
    );
    if (found.length) return found[0];

    const [created] = await query<User>(
      `INSERT INTO users (phone, phone_hash, consent, created_at, updated_at)
       VALUES ($1, $2, false, NOW(), NOW())
       RETURNING *`,
      [phone, hash], 'user.create'
    );
    logger.info('Novo usuario criado', { phone_hash: hash });
    return created;
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    const sets: string[] = [];
    const vals: any[]    = [];
    let i = 1;

    if (data.name    !== undefined) { sets.push(`name=$${i++}`);         vals.push(data.name); }
    if (data.email   !== undefined) {
      sets.push(`email=$${i++}`, `email_masked=$${i++}`);
      vals.push(data.email, maskEmail(data.email));
    }
    if (data.company !== undefined) { sets.push(`company=$${i++}`);      vals.push(data.company); }
    if (data.consent !== undefined) {
      sets.push(`consent=$${i++}`, `consent_at=$${i++}`);
      vals.push(data.consent, new Date());
    }

    sets.push(`updated_at=NOW()`);
    vals.push(id);

    const [updated] = await query<User>(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      vals, 'user.update'
    );
    return updated;
  },

  async anonymize(userId: string): Promise<void> {
    await transaction(async (client) => {
      await client.query(
        `UPDATE users SET
           name='ANONIMIZADO', email=NULL, email_masked=NULL,
           phone='ANONIMIZADO_'||id::text,
           phone_hash=encode(digest('DELETED_'||id::text,'sha256'),'hex'),
           login_token=NULL, lgpd_deleted=true, updated_at=NOW()
         WHERE id=$1`,
        [userId]
      );
      await client.query(
        `UPDATE messages SET content='[REMOVIDO POR LGPD]', content_masked='[REMOVIDO POR LGPD]'
         WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id=$1)`,
        [userId]
      );
      await client.query(
        `UPDATE leads SET name='ANONIMIZADO', email=NULL, phone='ANONIMIZADO'
         WHERE user_id=$1`,
        [userId]
      );
      await client.query(
        `INSERT INTO audit_log (user_id, action, resource, detail)
         VALUES ($1, 'LGPD_ANONYMIZE', 'users', '{"reason":"user_request"}')`,
        [userId]
      );
    });
    logger.info('Usuario anonimizado (LGPD)', { userId });
  },
};

// ─── CONVERSATION REPO ────────────────────────────────────
export const ConvRepo = {

  async getOpenOrCreate(userId: string): Promise<Conversation> {
    const [open] = await query<Conversation>(
      `SELECT * FROM conversations
       WHERE user_id=$1 AND status='open'
       ORDER BY started_at DESC LIMIT 1`,
      [userId], 'conv.getOpen'
    );
    if (open) return open;

    const [created] = await query<Conversation>(
      `INSERT INTO conversations (user_id, status, mode)
       VALUES ($1, 'open', 'idle') RETURNING *`,
      [userId], 'conv.create'
    );
    return created;
  },

  async setMode(convId: string, mode: Conversation['mode']): Promise<void> {
    await query(
      `UPDATE conversations SET mode=$1, last_msg_at=NOW() WHERE id=$2`,
      [mode, convId], 'conv.setMode'
    );
  },

  async startFlow(convId: string, flow: string): Promise<void> {
    await query(
      `UPDATE conversations SET
         mode='flow', current_flow=$1, flow_step=0, flow_data='{}', last_msg_at=NOW()
       WHERE id=$2`,
      [flow, convId], 'conv.startFlow'
    );
  },

  async advanceStep(convId: string, data: Record<string, any>): Promise<void> {
    await query(
      `UPDATE conversations SET
         flow_step = flow_step + 1,
         flow_data = flow_data || $1::jsonb,
         last_msg_at = NOW()
       WHERE id=$2`,
      [JSON.stringify(data), convId], 'conv.advanceStep'
    );
  },

  async endFlow(convId: string): Promise<void> {
    await query(
      `UPDATE conversations SET
         mode='ai_free', current_flow=NULL, flow_step=0, flow_data='{}', last_msg_at=NOW()
       WHERE id=$1`,
      [convId], 'conv.endFlow'
    );
  },

  async incrementMessages(convId: string): Promise<void> {
    await query(
      `UPDATE conversations SET total_messages=total_messages+1, last_msg_at=NOW() WHERE id=$1`,
      [convId], 'conv.incrementMsgs'
    );
  },

  async close(convId: string, status: 'closed' | 'transferred' | 'expired' = 'closed'): Promise<void> {
    await query(
      `UPDATE conversations SET status=$1, mode='idle', closed_at=NOW() WHERE id=$2`,
      [status, convId], 'conv.close'
    );
  },

  async expireIdle(): Promise<number> {
    const result = await query<{ id: string }>(
      `UPDATE conversations SET status='expired', closed_at=NOW()
       WHERE status='open'
         AND last_msg_at < NOW() - INTERVAL '${config.ai.sessionTTLHours} hours'
       RETURNING id`,
      [], 'conv.expireIdle'
    );
    return result.length;
  },
};

// ─── SESSION CONTEXT REPO ─────────────────────────────────
export const CtxRepo = {

  async load(convId: string): Promise<SessionContext | null> {
    const [ctx] = await query<SessionContext>(
      'SELECT * FROM session_context WHERE conversation_id=$1',
      [convId], 'ctx.load'
    );
    return ctx || null;
  },

  async upsert(convId: string, data: Partial<SessionContext>): Promise<void> {
    const ttl = new Date(Date.now() + config.ai.sessionTTLHours * 3_600_000);
    await query(
      `INSERT INTO session_context
         (conversation_id, messages_json, summary, total_tokens, last_intent,
          current_flow, step_index, context_json, ttl_expires_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (conversation_id) DO UPDATE SET
         messages_json  = EXCLUDED.messages_json,
         summary        = COALESCE(EXCLUDED.summary, session_context.summary),
         total_tokens   = EXCLUDED.total_tokens,
         last_intent    = EXCLUDED.last_intent,
         current_flow   = EXCLUDED.current_flow,
         step_index     = EXCLUDED.step_index,
         context_json   = EXCLUDED.context_json,
         ttl_expires_at = $9,
         updated_at     = NOW()`,
      [
        convId,
        JSON.stringify(data.messages_json || []),
        data.summary || null,
        data.total_tokens || 0,
        data.last_intent || null,
        data.current_flow || null,
        data.step_index || 0,
        JSON.stringify(data.context_json || {}),
        ttl,
      ], 'ctx.upsert'
    );
  },

  async cleanup(): Promise<number> {
    const result = await query<{ id: string }>(
      `DELETE FROM session_context WHERE ttl_expires_at < NOW() RETURNING id`,
      [], 'ctx.cleanup'
    );
    return result.length;
  },
};

// ─── TICKET REPO ──────────────────────────────────────────
export const TicketRepo = {

  async create(data: {
    userId: string;
    convId: string;
    name: string;
    description: string;
    priority: Ticket['priority'];
  }): Promise<Ticket> {
    const protocol = generateProtocol();
    const slaHours = SLA_HOURS[data.priority];
    const slaDue = new Date(Date.now() + slaHours * 3_600_000);
    const title  = data.description.slice(0, 80) + (data.description.length > 80 ? '...' : '');

    const [ticket] = await query<Ticket>(
      `INSERT INTO tickets
         (protocol, user_id, conversation_id, title, description, priority, sla_due_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [protocol, data.userId, data.convId, title, data.description, data.priority, slaDue],
      'ticket.create'
    );
    logger.info('Ticket criado', { protocol, priority: data.priority });
    return ticket;
  },

  async findByProtocol(protocol: string): Promise<Ticket | null> {
    const [t] = await query<Ticket>(
      'SELECT * FROM tickets WHERE protocol=$1',
      [protocol], 'ticket.findByProtocol'
    );
    return t || null;
  },

  async listByUser(userId: string): Promise<Ticket[]> {
    return query<Ticket>(
      `SELECT * FROM tickets WHERE user_id=$1 AND status != 'closed' ORDER BY created_at DESC`,
      [userId], 'ticket.listByUser'
    );
  },
};

// ─── LEAD REPO ────────────────────────────────────────────
export const LeadRepo = {

  async create(data: {
    userId?: string;
    name: string;
    company?: string;
    phone: string;
    email?: string;
    interest?: string;
  }): Promise<Lead> {
    const [lead] = await query<Lead>(
      `INSERT INTO leads (user_id, name, company, phone, email, interest, source)
       VALUES ($1,$2,$3,$4,$5,$6,'whatsapp_bot') RETURNING *`,
      [data.userId||null, data.name, data.company||null, data.phone,
       data.email||null, data.interest||null],
      'lead.create'
    );
    logger.info('Lead criado', { leadId: lead.id });
    return lead;
  },
};

// ─── MESSAGE REPO ─────────────────────────────────────────
export const MsgRepo = {

  async save(data: {
    convId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokensIn?: number;
    tokensOut?: number;
    intent?: string;
    model?: string;
    latencyMs?: number;
  }): Promise<void> {
    const { maskSensitive } = await import('@/utils/logger');
    await query(
      `INSERT INTO messages
         (conversation_id, role, content, content_masked, tokens_input, tokens_output,
          intent_detected, model_used, latency_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        data.convId, data.role, data.content,
        maskSensitive(data.content),
        data.tokensIn||null, data.tokensOut||null,
        data.intent||null, data.model||null, data.latencyMs||null,
      ], 'msg.save'
    );
  },
};
