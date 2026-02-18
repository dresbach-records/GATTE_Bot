import axios from 'axios';
import { config } from '@/config';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — WhatsApp Service (Evolution API)
// ══════════════════════════════════════════════════════════

const api = axios.create({
  baseURL: `${config.whatsapp.baseUrl}/message`,
  headers: {
    'apikey': config.whatsapp.apiKey,
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

export const WhatsAppService = {

  async sendText(phone: string, text: string): Promise<void> {
    try {
      await api.post(`/sendText/${config.whatsapp.instance}`, {
        number: phone,
        text,
        delay: 1000,         // simula digitacao natural
        linkPreview: false,
      });
    } catch (err: any) {
      logger.error('Erro ao enviar mensagem WhatsApp', {
        error: err.response?.data || err.message,
      });
      throw err;
    }
  },

  async sendButtons(phone: string, text: string, buttons: Array<{ id: string; text: string }>): Promise<void> {
    try {
      await api.post(`/sendButtons/${config.whatsapp.instance}`, {
        number: phone,
        text,
        buttons: buttons.map(b => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 })),
        footerText: 'GATTE Tecnologia',
      });
    } catch (err: any) {
      // fallback para texto simples se botoes nao suportados
      const fallback = `${text}\n\n${buttons.map((b, i) => `${i+1}. ${b.text}`).join('\n')}`;
      await WhatsAppService.sendText(phone, fallback);
    }
  },

  async sendList(phone: string, text: string, sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>): Promise<void> {
    try {
      await api.post(`/sendList/${config.whatsapp.instance}`, {
        number: phone,
        title: 'GATTE Tecnologia',
        description: text,
        buttonText: 'Ver opcoes',
        footerText: 'Selecione uma opcao',
        sections,
      });
    } catch (err: any) {
      // fallback para texto
      const lines: string[] = [text, ''];
      sections.forEach(s => {
        lines.push(`*${s.title}*`);
        s.rows.forEach((r, i) => lines.push(`${i+1}. ${r.title}`));
      });
      await WhatsAppService.sendText(phone, lines.join('\n'));
    }
  },

  async markRead(messageId: string): Promise<void> {
    try {
      await api.post(`/markMessageAsRead/${config.whatsapp.instance}`, {
        readMessages: [{ id: messageId }],
      });
    } catch { /* nao critico */ }
  },

  async sendTyping(phone: string, durationMs = 1500): Promise<void> {
    try {
      await api.post(`/sendPresence/${config.whatsapp.instance}`, {
        number: phone,
        options: { presence: 'composing', delay: durationMs },
      });
    } catch { /* nao critico */ }
  },
};
