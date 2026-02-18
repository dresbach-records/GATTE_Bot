import { Conversation, User, SessionContext, INTENT } from '@/types';
import { WhatsAppService } from '@/services/whatsapp.service';
import { generateResponse, buildContext } from '@/services/ai.service';
import { TicketRepo, MsgRepo, ConvRepo } from '@/db/repositories';
import { config } from '@/config';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Handlers (um por tipo de intencao)
// ══════════════════════════════════════════════════════════

// ─── MENU HANDLER ─────────────────────────────────────────
export const MenuHandler = {

  MENU_TEXT: `👋 Ola! Sou a *Gatta*, assistente virtual da GATTE Tecnologia.

Como posso te ajudar hoje?

1️⃣ Informacoes sobre a GATTE
2️⃣ Servicos e Produtos (LC Web / LC ERP)
3️⃣ Planos e Precos
4️⃣ Abrir Chamado de Suporte
5️⃣ Quero ser cliente
6️⃣ Perguntas Frequentes
7️⃣ Agendar Demonstracao
8️⃣ Consultar Chamado (protocolo)
9️⃣ Falar com Atendente

_Digite o numero da opcao ou escreva sua duvida livremente!_`,

  async show(conv: Conversation, user: User): Promise<void> {
    await ConvRepo.setMode(conv.id, 'menu');
    await WhatsAppService.sendText(user.phone, MenuHandler.MENU_TEXT);
    logger.info('Menu exibido', { convId: conv.id });
  },

  async handleOption(option: string, conv: Conversation, user: User, ctx: SessionContext | null): Promise<void> {
    const { FlowManager } = await import('@/flows/flow-manager');
    const num = option.trim();

    switch (num) {
      case '1': return AIHandler.generate('Fale sobre a GATTE Tecnologia', conv, ctx, user);
      case '2': return AIHandler.generate('Explique os servicos LC Web e LC ERP', conv, ctx, user);
      case '3': return AIHandler.generate('Explique os planos Essencial, Profissional e Enterprise', conv, ctx, user);
      case '4': return FlowManager.start('TICKET_FLOW', conv, user);
      case '5': return FlowManager.start('LEAD_FLOW', conv, user);
      case '6': return AIHandler.generate('Quais sao as perguntas frequentes sobre os servicos da GATTE?', conv, ctx, user);
      case '7': return FlowManager.start('DEMO_FLOW', conv, user);
      case '8': return TicketHandler.promptProtocol(conv, user);
      case '9': return EscalateHandler.run(conv, user);
      default:  return MenuHandler.show(conv, user);
    }
  },
};

// ─── AI HANDLER ───────────────────────────────────────────
export const AIHandler = {

  async generate(
    message: string,
    conv: Conversation,
    ctx: SessionContext | null,
    user: User
  ): Promise<void> {
    await ConvRepo.setMode(conv.id, 'ai_free');
    await WhatsAppService.sendTyping(user.phone);

    try {
      const context = await buildContext(ctx, conv.total_messages);

      const { text, tokensIn, tokensOut, latencyMs } = await generateResponse(
        message, context, user
      );

      await WhatsAppService.sendText(user.phone, text);

      // Salvar mensagens no banco
      await MsgRepo.save({ convId: conv.id, role: 'user', content: message });
      await MsgRepo.save({
        convId: conv.id, role: 'assistant', content: text,
        tokensIn, tokensOut,
        model: config.ai.responderModel,
        latencyMs,
      });

      logger.info('Resposta IA gerada', { latencyMs, tokensIn, tokensOut });

    } catch (err: any) {
      logger.error('Erro no AIHandler', { error: err.message });
      await WhatsAppService.sendText(
        user.phone,
        'Desculpe, encontrei uma dificuldade momentanea. Pode tentar novamente? 🙏\nSe preferir, posso te conectar com nossa equipe: *9*'
      );
    }
  },
};

// ─── TICKET HANDLER ───────────────────────────────────────
export const TicketHandler = {

  async promptProtocol(conv: Conversation, user: User): Promise<void> {
    await WhatsAppService.sendText(
      user.phone,
      '🔍 Informe o numero do seu protocolo.\n\n_Ex: BR-20250120-4892_'
    );
    await ConvRepo.setMode(conv.id, 'ai_free');
  },

  async queryStatus(message: string, conv: Conversation, user: User): Promise<void> {
    // Extrair protocolo da mensagem
    const match = message.match(/BR-\d{8}-\d{4}/i);

    if (!match) {
      await WhatsAppService.sendText(
        user.phone,
        '🔍 Nao encontrei um protocolo na sua mensagem.\n\nO formato e: *BR-AAAAMMDD-XXXX*\n\nPode me informar o numero do protocolo?'
      );
      return;
    }

    const protocol = match[0].toUpperCase();
    const ticket   = await TicketRepo.findByProtocol(protocol);

    if (!ticket) {
      await WhatsAppService.sendText(
        user.phone,
        `❌ Protocolo *${protocol}* nao encontrado.\n\nVerifique o numero e tente novamente, ou abra um novo chamado digitando *4*.`
      );
      return;
    }

    // Seguranca: usuario so pode ver seus proprios tickets
    if (ticket.user_id !== user.id) {
      await WhatsAppService.sendText(
        user.phone,
        `❌ Protocolo *${protocol}* nao encontrado para esta conta.`
      );
      return;
    }

    const statusEmoji: Record<string, string> = {
      open:           '🟡 Aberto',
      in_progress:    '🔵 Em andamento',
      waiting_client: '⏳ Aguardando voce',
      resolved:       '🟢 Resolvido',
      closed:         '⚫ Encerrado',
    };

    const msg = [
      `📋 *Chamado ${protocol}*`,
      ``,
      `Status: ${statusEmoji[ticket.status] || ticket.status}`,
      `Prioridade: ${ticket.priority.toUpperCase()}`,
      `Aberto em: ${ticket.created_at.toLocaleDateString('pt-BR')}`,
      ticket.assigned_to ? `Responsavel: ${ticket.assigned_to}` : '',
      ticket.sla_due_at ? `Prazo SLA: ${ticket.sla_due_at.toLocaleDateString('pt-BR')}` : '',
    ].filter(Boolean).join('\n');

    await WhatsAppService.sendText(user.phone, msg);
    logger.info('Status de ticket consultado', { protocol });
  },
};

// ─── ESCALATE HANDLER ─────────────────────────────────────
export const EscalateHandler = {

  async run(conv: Conversation, user: User): Promise<void> {
    await ConvRepo.setMode(conv.id, 'human');

    const msg = [
      '👤 Entendo! Vou te conectar com um de nossos especialistas agora.',
      '',
      `📞 Enquanto isso, voce tambem pode nos contatar diretamente:`,
      `WhatsApp: ${config.company.whatsappHuman}`,
      `E-mail: ${config.company.supportEmail}`,
      '',
      'Um momento... ⏳',
    ].join('\n');

    await WhatsAppService.sendText(user.phone, msg);

    // Notificar equipe interna (pode integrar com sistema de tickets/Slack)
    logger.warn('Escalada para humano solicitada', {
      convId: conv.id,
      userId: user.id,
      lastIntent: conv.last_intent,
    });
  },
};

// ─── FALLBACK HANDLER ─────────────────────────────────────
export const FallbackHandler = {

  async run(conv: Conversation, user: User): Promise<void> {
    const msg = [
      'Hmm, nao consegui entender exatamente o que voce precisa. 🤔',
      '',
      'Posso te ajudar com:',
      '• Informacoes sobre nossos sistemas e servicos',
      '• Abertura de chamados de suporte',
      '• Certificacao digital',
      '',
      'Digite *menu* para ver todas as opcoes, ou descreva sua duvida com mais detalhes!',
    ].join('\n');

    await WhatsAppService.sendText(user.phone, msg);
  },
};
