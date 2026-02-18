
import { Flow, FlowStep } from '@/flows/flow.abstract';
import { calendarService } from '@/services/calendar.service';
import { whatsappService } from '@/services/whatsapp.service';
import { CtxRepo } from '@/db/repositories';
import { logger } from '@/utils/logger';
import { User, Conversation } from '@/types';

// ══════════════════════════════════════════════════════════
// GATTE BOT — Demo Scheduling Flow
// ══════════════════════════════════════════════════════════

const DURATION_MINUTES = 30;

const findingSlots: FlowStep = async (conv: Conversation, user: User) => {
  await whatsappService.sendText(user.phone, 'Perfeito! Vou consultar a agenda da nossa equipe e já te apresento os horários livres. 🗓️');

  const busySlots = await calendarService.findAvailableTimes(DURATION_MINUTES);

  if ('isError' in busySlots || !Array.isArray(busySlots)) {
    logger.error('Falha ao buscar horários do MS Graph', { details: busySlots });
    await whatsappService.sendText(user.phone, 'Puxa, não consegui consultar a agenda agora. Por favor, tente novamente em alguns instantes.');
    return { endFlow: true };
  }

  const availableSlots = generateAvailableSlots(busySlots);

  if (availableSlots.length === 0) {
    await whatsappService.sendText(user.phone, 'Parece que não temos horários disponíveis nos próximos dias. Por favor, tente novamente mais tarde ou entre em contato com nossa equipe.');
    return { endFlow: true };
  }

  const optionsMessage = [
    '*Estes são os próximos horários disponíveis para uma conversa de 30 minutos:*\n',
    ...availableSlots.map((slot, index) => {
        const date = new Date(slot.start);
        const day = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
        const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `*${index + 1}* - ${day} às *${time}h*`;
    }),
    '\nDigite o *número* do horário que você prefere. Se nenhum servir, digite *0* para cancelar.'
  ].join('\n');

  await CtxRepo.upsert(conv.id, { 
    current_step: 'awaiting_slot_choice',
    available_slots: availableSlots 
  });

  await whatsappService.sendText(user.phone, optionsMessage);
};

const handleSlotChoice: FlowStep = async (conv: Conversation, user: User, message: string) => {
  const ctx = await CtxRepo.load(conv.id);
  const choice = parseInt(message.trim(), 10);

  if (!ctx || !ctx.available_slots) {
      logger.error('Contexto ou slots disponíveis não encontrados no passo de escolha de horário.');
      await whatsappService.sendText(user.phone, 'Ocorreu um erro. Vamos tentar de novo.');
      return findingSlots(conv, user, message);
  }

  if (isNaN(choice) || choice < 0 || choice > ctx.available_slots.length) {
    await whatsappService.sendText(user.phone, 'Opção inválida. Por favor, digite apenas o número do horário desejado.');
    return; 
  }

  if (choice === 0) {
    await whatsappService.sendText(user.phone, 'Ok, cancelado. Se mudar de ideia, é só chamar!');
    return { endFlow: true };
  }

  const chosenSlot = ctx.available_slots[choice - 1];
  const subject = `Demonstração Agendada - ${user.name || user.phone}`;
  
  await whatsappService.sendText(user.phone, `Confirmando seu agendamento... ⏳`);
  
  const result = await calendarService.createEvent(
    subject,
    chosenSlot.start,
    chosenSlot.end,
    user.name || 'Não informado',
    user.phone
  );

  if ('isError' in result) {
      logger.error('Falha ao criar evento no MS Graph', { details: result });
      await whatsappService.sendText(user.phone, 'Houve um problema ao confirmar seu agendamento. Por favor, tente escolher outro horário.');
      return findingSlots(conv, user, message);
  }

  await whatsappService.sendText(user.phone, '✅ *Agendamento confirmado!*\n\nNossa equipe já recebeu o convite na agenda. Até breve! 👋');
  return { endFlow: true };
};

function generateAvailableSlots(busySlots: any[]): Array<{start: string, end: string}> {
    const available = [];
    const now = new Date();
    const workHours = { start: 9, end: 18 };
    const searchDays = 7;

    const busyTimes = busySlots.map(slot => ({
        start: new Date(slot.start.dateTime + 'Z'),
        end: new Date(slot.end.dateTime + 'Z'),
    }));

    for (let i = 0; i < searchDays; i++) {
        const currentDay = new Date(now);
        currentDay.setDate(now.getDate() + i);

        if (currentDay.getDay() === 0 || currentDay.getDay() === 6) continue;

        const dayStart = new Date(currentDay); dayStart.setHours(workHours.start, 0, 0, 0);
        const dayEnd = new Date(currentDay); dayEnd.setHours(workHours.end, 0, 0, 0);

        let slotStart = new Date(dayStart);

        while (slotStart < dayEnd) {
            const slotEnd = new Date(slotStart.getTime() + DURATION_MINUTES * 60000);
            
            if (slotEnd > dayEnd) break;

            if (slotStart < new Date(now.getTime() + 15 * 60000)) {
                slotStart.setTime(slotStart.getTime() + 15 * 60000);
                continue;
            }
            
            const isOverlapping = busyTimes.some(busy => slotStart < busy.end && slotEnd > busy.start);

            if (!isOverlapping) {
                available.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
                if (available.length >= 5) return available;
            }
            slotStart.setTime(slotStart.getTime() + 15 * 60000);
        }
    }
    return available;
}

export class DemoFlow extends Flow {
  steps = {
    start: findingSlots,
    awaiting_slot_choice: handleSlotChoice,
  };
}
