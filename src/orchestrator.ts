import { INTENT, INTENT_PRIORITY, IntentValue, WhatsAppMessage } from '@/types';
import { UserRepo, ConvRepo, CtxRepo, MsgRepo } from '@/db/repositories';
import { classifyIntent, resolvePriority } from '@/services/ai.service';
import { FlowManager } from '@/flows/flow-manager';
import { MenuHandler, AIHandler, TicketHandler, EscalateHandler, FallbackHandler } from '@/handlers';
import { sanitizeInput } from '@/utils/security';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Orchestrator
// Ponto unico de entrada. Zero if/else. Zero strings literais.
// ══════════════════════════════════════════════════════════

export async function orchestrate(incoming: WhatsAppMessage): Promise<void> {
  const { from: phone, body: rawMessage } = incoming;

  logger.info('Mensagem recebida', { phone_len: phone.length, msg_len: rawMessage.length });

  // ─── 1. Sanitizar input ───────────────────────────────
  const message = sanitizeInput(rawMessage);
  if (!message) return;

  // ─── 2. Resolver usuario e conversa ──────────────────
  const user = await UserRepo.findOrCreate(phone);
  const conv = await ConvRepo.getOpenOrCreate(user.id);
  const ctx  = await CtxRepo.load(conv.id);

  // ─── 3. Verificar consentimento LGPD ─────────────────
  if (!user.consent) {
    await handleConsent(phone, user, conv, message);
    return;
  }

  // ─── 4. Incrementar contador de mensagens ────────────
  await ConvRepo.incrementMessages(conv.id);

  // ─── 5. Fluxo estruturado ativo? Continua coleta ─────
  if (conv.current_flow && conv.mode === 'flow') {
    // Verificar se quer escapar do fluxo
    if (isEscapeCommand(message)) {
      await ConvRepo.endFlow(conv.id);
      await MenuHandler.show(conv, user);
      return;
    }
    return FlowManager.continue(conv, ctx, message, user);
  }

  // ─── 6. Modo humano: nao processar com IA ─────────────
  if (conv.mode === 'human') {
    logger.info('Conversa em modo humano, ignorando IA', { convId: conv.id });
    return;
  }

  // ─── 7. Classificar intencao ──────────────────────────
  const classified = await classifyIntent(message, ctx);
  const intent     = resolvePriority(classified);

  logger.info('Intencao classificada', {
    intent,
    confidence: classified.confidence,
    secondary:  classified.secondary,
  });

  // ─── 8. Salvar intent na conversa ─────────────────────
  await ConvRepo.setMode(conv.id, 'ai_free');

  // ─── 9. Roteamento determinista ───────────────────────
  switch (intent) {

    // Escalada prioritaria (prioridade 1)
    case INTENT.HUMAN_REQUEST:
    case INTENT.COMPLAINT_FORMAL:
      return EscalateHandler.run(conv, user);

    // Consulta de chamado (prioridade 2)
    case INTENT.CHECK_TICKET:
      return TicketHandler.queryStatus(message, conv, user);

    // Fluxos estruturados (prioridade 3-5)
    case INTENT.OPEN_TICKET:
      return FlowManager.start('TICKET_FLOW', conv, user);

    case INTENT.CAPTURE_LEAD:
      return FlowManager.start('LEAD_FLOW', conv, user);

    case INTENT.SCHEDULE_DEMO:
      return FlowManager.start('DEMO_FLOW', conv, user);

    // Navegacao por menu (prioridade 4)
    case INTENT.MENU_OPEN:
      return MenuHandler.show(conv, user);

    case INTENT.MENU_OPTION:
      return MenuHandler.handleOption(message, conv, user, ctx);

    // Dados autenticados (prioridade 6) — requer login
    case INTENT.QUERY_SERVICES:
    case INTENT.QUERY_CERTIFICATE:
    case INTENT.QUERY_TICKET_LIST:
      return handleAuthRequired(message, conv, user, ctx, intent);

    // Fallback (prioridade 9-10)
    case INTENT.OUT_OF_SCOPE:
    case INTENT.UNKNOWN:
      return FallbackHandler.run(conv, user);

    // Default: IA livre para tudo que e informativo (prioridade 6-8)
    default:
      return AIHandler.generate(message, conv, ctx, user);
  }
}

// ─── HELPERS ──────────────────────────────────────────────

function isEscapeCommand(msg: string): boolean {
  const escapes = ['menu', 'cancelar', 'cancel', 'sair', 'voltar', '0'];
  return escapes.includes(msg.toLowerCase().trim());
}

async function handleConsent(
  phone: string,
  user: any,
  conv: any,
  message: string
): Promise<void> {
  const { WhatsAppService } = await import('@/services/whatsapp.service');

  const consentMsg = [
    '👋 Ola! Antes de comecarmos, precisamos do seu consentimento.',
    '',
    '📋 *Aviso de Privacidade*',
    'Ao usar este assistente, a GATTE Tecnologia coleta seu numero, nome e mensagens',
    'para fins de atendimento, conforme a LGPD (Lei 13.709/2018).',
    '',
    'Seus dados sao protegidos e nao compartilhados com terceiros.',
    '',
    'Digite *SIM* para concordar e comecar o atendimento.',
    'Para mais info: privacidade@gatte.com.br',
  ].join('\n');

  if (message.toUpperCase().trim() === 'SIM') {
    await UserRepo.update(user.id, { consent: true });
    await WhatsAppService.sendText(phone, '✅ Consentimento registrado! Bem-vindo(a) ao atendimento da GATTE. 😊');
    await MenuHandler.show(conv, user);
  } else {
    await WhatsAppService.sendText(phone, consentMsg);
  }
}

async function handleAuthRequired(
  message: string,
  conv: any,
  user: any,
  ctx: any,
  intent: IntentValue
): Promise<void> {
  if (!user.is_client) {
    const { WhatsAppService } = await import('@/services/whatsapp.service');
    await WhatsAppService.sendText(
      user.phone,
      '🔐 Para consultar seus servicos e certificados, e necessario ser cliente ativo da GATTE.\n\nDigite *5* para falar com nossa equipe comercial! 😊'
    );
    return;
  }
  // Se for cliente, usa IA com dados do usuario
  return AIHandler.generate(message, conv, ctx, user);
}
