import cron from 'node-cron';

import { query } from '@/db/pool';
import { CtxRepo, ConvRepo } from '@/db/repositories';
import { whatsappService } from '@/services/whatsapp.service';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Cron Jobs (tarefas automaticas em background)
// ══════════════════════════════════════════════════════════

export function startJobs() {
  logger.info('Iniciando cron jobs...');

  // ─── A cada 30min: limpar sessoes expiradas ───────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      const n = await CtxRepo.cleanup();
      if (n > 0) logger.info(`Sessoes expiradas removidas: ${n}`);
    } catch (err: any) {
      logger.error('Erro no job cleanup_sessions', { error: err.message });
    }
  });

  // ─── A cada hora: expirar conversas ociosas ───────────
  cron.schedule('0 * * * *', async () => {
    try {
      const n = await ConvRepo.expireIdle();
      if (n > 0) logger.info(`Conversas expiradas: ${n}`);
    } catch (err: any) {
      logger.error('Erro no job expire_conversations', { error: err.message });
    }
  });

  // ─── Diario 08h00: alertas de certificado 30 dias ─────
  cron.schedule('0 8 * * *', async () => {
    try {
      const expiring = await query<{ user_id: string; phone: string; type: string; expires_at: Date; id: string }>(
        `SELECT c.id, c.type, c.expires_at, u.id as user_id, u.phone
         FROM certificates c
         JOIN users u ON u.id = c.user_id
         WHERE c.status = 'valid'
           AND c.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
           AND c.alert_30d_sent = false
           AND u.lgpd_deleted = false`,
        [], 'job.cert_30d'
      );

      for (const cert of expiring) {
        const dias = Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / 86_400_000);
        const msg = `⚠️ *Atencao!* Seu certificado digital *${cert.type}* vence em *${dias} dias* (${new Date(cert.expires_at).toLocaleDateString('pt-BR')}).\n\nPara renovar, entre em contato com nossa equipe. 📋`;
        await whatsappService.sendText(cert.phone, msg);
        await query('UPDATE certificates SET alert_30d_sent=true WHERE id=$1', [cert.id], 'job.cert_30d_update');
      }

      if (expiring.length > 0) logger.info(`Alertas de certificado 30d enviados: ${expiring.length}`);
    } catch (err: any) {
      logger.error('Erro no job cert_30d', { error: err.message });
    }
  });

  // ─── Diario 08h00: alertas de certificado 7 dias ──────
  cron.schedule('5 8 * * *', async () => {
    try {
      const expiring = await query<{ user_id: string; phone: string; type: string; expires_at: Date; id: string }>(
        `SELECT c.id, c.type, c.expires_at, u.id as user_id, u.phone
         FROM certificates c
         JOIN users u ON u.id = c.user_id
         WHERE c.status = 'valid'
           AND c.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
           AND c.alert_07d_sent = false
           AND u.lgpd_deleted = false`,
        [], 'job.cert_7d'
      );

      for (const cert of expiring) {
        const dias = Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / 86_400_000);
        const msg = `🚨 *URGENTE!* Seu certificado *${cert.type}* vence em *${dias} dia(s)*!\n\nEvite interrupcoes na emissao de notas fiscais. Renove agora!\n\nDigite *4* para falar com nossa equipe. 🏃`;
        await whatsappService.sendText(cert.phone, msg);
        await query('UPDATE certificates SET alert_07d_sent=true WHERE id=$1', [cert.id], 'job.cert_7d_update');
      }

      if (expiring.length > 0) logger.info(`Alertas de certificado 7d enviados: ${expiring.length}`);
    } catch (err: any) {
      logger.error('Erro no job cert_7d', { error: err.message });
    }
  });

  // ─── A cada hora: alertas de SLA prestes a vencer ─────
  cron.schedule('15 * * * *', async () => {
    try {
      const critical = await query<{ protocol: string; priority: string; sla_due_at: Date; assigned_to: string }>(
        `SELECT protocol, priority, sla_due_at, assigned_to
         FROM tickets
         WHERE status NOT IN ('resolved','closed')
           AND sla_due_at BETWEEN NOW() AND NOW() + INTERVAL '2 hours'`,
        [], 'job.sla_alert'
      );

      for (const ticket of critical) {
        logger.warn('SLA prestes a vencer', {
          protocol:  ticket.protocol,
          priority:  ticket.priority,
          sla_due:   ticket.sla_due_at,
          assigned:  ticket.assigned_to,
        });
        // Aqui pode notificar via Slack, e-mail ou outro canal interno
      }
    } catch (err: any) {
      logger.error('Erro no job sla_alert', { error: err.message });
    }
  });

  // ─── Mensal 1o dia 03h00: anonimizacao LGPD ───────────
  cron.schedule('0 3 1 * *', async () => {
    try {
      // Anonimizar mensagens com mais de 90 dias
      const result = await query<{ id: string }>(
        `UPDATE messages SET content='[REMOVIDO POR LGPD]', content_masked='[REMOVIDO POR LGPD]'
         WHERE created_at < NOW() - INTERVAL '90 days'
           AND content != '[REMOVIDO POR LGPD]'
         RETURNING id`,
        [], 'job.lgpd_msgs'
      );

      // Anonimizar leads com mais de 2 anos
      const leads = await query<{ id: string }>(
        `UPDATE leads SET name='ANONIMIZADO', email=NULL, phone='ANONIMIZADO'
         WHERE created_at < NOW() - INTERVAL '2 years'
           AND name != 'ANONIMIZADO'
         RETURNING id`,
        [], 'job.lgpd_leads'
      );

      logger.info('LGPD cleanup concluido', {
        msgs_cleaned:  result.length,
        leads_cleaned: leads.length,
      });
    } catch (err: any) {
      logger.error('Erro no job lgpd_cleanup', { error: err.message });
    }
  });

  logger.info('Todos os cron jobs iniciados.');
}
