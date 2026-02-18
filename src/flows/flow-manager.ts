import { Conversation, SessionContext, User, FlowStep } from '@/types';
import { ConvRepo, CtxRepo, TicketRepo, LeadRepo, MsgRepo } from '@/db/repositories';
import { WhatsAppService } from '@/services/whatsapp.service';
import { validate, sanitizeInput } from '@/utils/security';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Flow Manager
// Fluxos estruturados de coleta com validacao passo a passo
// ══════════════════════════════════════════════════════════

// ─── DEFINICAO DOS FLUXOS ───
const FLOWS: Record<string, FlowStep[]> = {

  TICKET_FLOW: [
    {
      step: 0, field: 'name',
      ask: 'Vou abrir um chamado para voce! 📋\n\nPrimeiro, qual e o seu nome completo?',
      validate: validate.name,
      error: 'Por favor, informe um nome valido (minimo 3 caracteres).',
    },
    {
      step: 1, field: 'email',
      ask: 'Qual e o seu e-mail para contato?',
      validate: validate.email,
      error: 'E-mail invalido. Tente novamente (ex: nome@empresa.com.br)',
    },
    {
      step: 2, field: 'description',
      ask: 'Descreva o problema detalhadamente:\n\n(Quanto mais detalhes, mais rapido conseguimos resolver!)',
      validate: validate.minLength(20),
      error: 'Por favor, descreva melhor o problema (minimo 20 caracteres).',
    },
    {
      step: 3, field: 'priority',
      ask: 'Qual e a urgencia?\n\n1 - Baixa (pode aguardar)\n2 - Media (afeta o trabalho)\n3 - Alta (sistema parado)\n4 - Critica (perda financeira)',
      validate: validate.option(['1','2','3','4']),
      error: 'Por favor, digite apenas 1, 2, 3 ou 4.',
      transform: (v: string) => (['low','medium','high','critical'] as const)[parseInt(v)-1],
    },
  ],

  LEAD_FLOW: [
    {
      step: 0, field: 'name',
      ask: 'Otimo! Vamos preparar uma proposta para voce. 😊\n\nQual e o seu nome?',
      validate: validate.name,
      error: 'Por favor, informe um nome valido.',
    },
    {
      step: 1, field: 'company',
      ask: 'Qual e o nome da sua empresa?\n\n(Pode digitar "nao tenho" se for pessoa fisica)',
      validate: (v: string) => v.trim().length >= 2,
      error: 'Por favor, informe o nome da empresa.',
    },
    {
      step: 2, field: 'interest',
      ask: 'Qual produto ou servico te interessa?\n\n1 - LC Web\n2 - LC ERP\n3 - Certificacao Digital\n4 - Desenvolvimento de sistemas\n5 - Outro',
      validate: validate.option(['1','2','3','4','5']),
      error: 'Digite o numero da opcao (1 a 5).',
      transform: (v: string) => (['LC Web','LC ERP','Certificacao Digital','Desenvolvimento','Outro'] as const)[parseInt(v)-1],
    },
    {
      step: 3, field: 'email',
      ask: 'Qual o melhor e-mail para nossa equipe entrar em contato?',
      validate: validate.email,
      error: 'E-mail invalido. Tente novamente.',
    },
  ],

  DEMO_FLOW: [
    {
      step: 0, field: 'preferred_date',
      ask: 'Vou agendar uma demonstracao para voce! 📅\n\nQual data voce prefere?\n(Ex: 20/01/2025 ou "proxima semana")',
      validate: (v: string) => v.trim().length >= 5,
      error: 'Por favor, informe uma data ou periodo.',
    },
    {
      step: 1, field: 'preferred_time',
      ask: 'Qual horario e melhor para voce?\n\n1 - Manha (9h-12h)\n2 - Tarde (14h-17h)\n3 - Qualquer horario',
      validate: validate.option(['1','2','3']),
      error: 'Digite 1, 2 ou 3.',
      transform: (v: string) => (['Manha (9h-12h)','Tarde (14h-17h)','Qualquer horario'] as const)[parseInt(v)-1],
    },
  ],
};

// ─── FLOW MANAGER ───
export const FlowManager = {

  async start(flowName: string, conv: Conversation, user: User): Promise<void> {
    const flow = FLOWS[flowName];
    if (!flow) {
      logger.error('Fluxo nao encontrado', { flowName });
      return;
    }

    await ConvRepo.startFlow(conv.id, flowName);
    await WhatsAppService.sendText(user.phone, flow[0].ask);

    logger.info('Fluxo iniciado', { flowName, convId: conv.id });
  },

  async continue(conv: Conversation, ctx: SessionContext | null, input: string, user: User): Promise<void> {
    const flow = FLOWS[conv.current_flow!];
    if (!flow) {
      await ConvRepo.endFlow(conv.id);
      return;
    }

    const step    = flow[conv.flow_step];
    const cleaned = sanitizeInput(input);

    // Validacao
    if (!step.validate(cleaned)) {
      await WhatsAppService.sendText(user.phone, step.error);
      return;
    }

    // Transformar valor e salvar
    const value = step.transform ? step.transform(cleaned) : cleaned;
    const data  = { [step.field]: value };

    await ConvRepo.advanceStep(conv.id, data);

    // Proximo passo?
    const nextStep = flow[conv.flow_step + 1];

    if (nextStep) {
      await WhatsAppService.sendText(user.phone, nextStep.ask);
    } else {
      // Fluxo completo — executar acao final
      const allData = { ...conv.flow_data, ...data };
      await FlowManager.complete(conv, user, allData);
    }
  },

  async complete(conv: Conversation, user: User, data: Record<string, any>): Promise<void> {
    await ConvRepo.endFlow(conv.id);

    switch (conv.current_flow) {
      case 'TICKET_FLOW':
        await FlowManager.completeTicket(conv, user, data);
        break;
      case 'LEAD_FLOW':
        await FlowManager.completeLead(conv, user, data);
        break;
      case 'DEMO_FLOW':
        await FlowManager.completeDemo(conv, user, data);
        break;
    }
  },

  async completeTicket(conv: Conversation, user: User, data: any): Promise<void> {
    try {
      const ticket = await TicketRepo.create({
        userId:      user.id,
        convId:      conv.id,
        name:        data.name,
        description: data.description,
        priority:    data.priority || 'medium',
      });

      // Atualizar nome do user se ainda nao tinha
      if (!user.name && data.name) {
        const { UserRepo } = await import('@/db/repositories');
        await UserRepo.update(user.id, { name: data.name, email: data.email });
      }

      const msg = `✅ Chamado aberto com sucesso!\n\n📋 Protocolo: *${ticket.protocol}*\nPrioridade: ${ticket.priority.toUpperCase()}\n\nNossa equipe tecnica entrara em contato em breve. Voce pode consultar o status digitando o protocolo aqui. 😊`;
      await WhatsAppService.sendText(user.phone, msg);

      logger.info('Ticket concluido via flow', { protocol: ticket.protocol });
    } catch (err: any) {
      logger.error('Erro ao criar ticket', { error: err.message });
      await WhatsAppService.sendText(user.phone, 'Ocorreu um erro ao abrir o chamado. Por favor, tente novamente ou entre em contato com nossa equipe. 🙏');
    }
  },

  async completeLead(conv: Conversation, user: User, data: any): Promise<void> {
    try {
      await LeadRepo.create({
        userId:   user.id,
        name:     data.name,
        company:  data.company,
        phone:    user.phone,
        email:    data.email,
        interest: data.interest,
      });

      const msg = `✅ Perfeito, ${data.name}!\n\nNossa equipe comercial vai entrar em contato em ate 1 dia util com uma proposta personalizada para sua empresa.\n\nAguarde! 😊`;
      await WhatsAppService.sendText(user.phone, msg);
    } catch (err: any) {
      logger.error('Erro ao criar lead', { error: err.message });
    }
  },

  async completeDemo(conv: Conversation, user: User, data: any): Promise<void> {
    const msg = `✅ Demonstracao solicitada!\n\n📅 Data preferida: ${data.preferred_date}\n⏰ Horario: ${data.preferred_time}\n\nNossa equipe confirma o agendamento em breve com o link da reuniao. 🎯`;
    await WhatsAppService.sendText(user.phone, msg);
  },
};
