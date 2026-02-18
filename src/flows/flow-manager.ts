
import { Flow } from '@/flows/flow.abstract';
import { LeadFlow } from '@/flows/lead.flow';
import { TicketFlow } from '@/flows/ticket.flow';
import { DemoFlow } from '@/flows/demo.flow';
import { logger } from '@/utils/logger';
import { CtxRepo, ConvRepo } from '@/db/repositories';
import { whatsappService } from '@/services/whatsapp.service';
import { User, Conversation, FlowName } from '@/types';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Flow Manager
// ══════════════════════════════════════════════════════════

const flowRegistry: Record<FlowName, new () => Flow> = {
  LEAD_FLOW: LeadFlow,
  TICKET_FLOW: TicketFlow,
  DEMO_FLOW: DemoFlow,
};

async function start(flowName: FlowName, conv: Conversation, user: User): Promise<void> {
  logger.info(`Iniciando fluxo [${flowName}]`, { userId: user.id, convId: conv.id });

  const FlowClass = flowRegistry[flowName];
  if (!FlowClass) {
    logger.error(`Tentativa de iniciar um fluxo não registrado: ${flowName}`);
    return;
  }

  await CtxRepo.upsert(conv.id, { current_step: 'start' });
  await ConvRepo.setFlow(conv.id, flowName);

  const flowInstance = new FlowClass();
  const initialStep = flowInstance.getStep('start');

  await initialStep(conv, user, '');
}

async function continueFlow(conv: Conversation, ctx: any, message: string, user: User): Promise<void> {
  const flowName = conv.current_flow as FlowName;
  const currentStepName = ctx.current_step;

  logger.info(`Continuando fluxo [${flowName}.${currentStepName}]`, { userId: user.id, message });

  const FlowClass = flowRegistry[flowName];
  if (!FlowClass) {
    logger.error(`Tentativa de continuar um fluxo não registrado: ${flowName}`);
    return;
  }

  const flowInstance = new FlowClass();
  const nextStepFn = flowInstance.getStep(currentStepName);

  if (!nextStepFn) {
    logger.error(`Passo nao encontrado no fluxo: [${flowName}.${currentStepName}]`);
    await whatsappService.sendText(user.phone, 'Ocorreu um erro inesperado. Por favor, tente novamente.');
    await ConvRepo.endFlow(conv.id);
    return;
  }

  const result = await nextStepFn(conv, user, message);

  if (result?.endFlow) {
    logger.info(`Fluxo [${flowName}] finalizado.`, { userId: user.id });
    await ConvRepo.endFlow(conv.id);
  }
}

export const FlowManager = {
  start,
  continue: continueFlow,
};
