import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from '@/utils/logger';

class WhatsAppService {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.initialize();
  }

  private initialize() {
    this.client.on('qr', (qr) => {
      console.log('Escaneie o QR Code abaixo:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.isReady = true;
      logger.info('WhatsApp conectado com sucesso.');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('Falha na autenticação', { msg });
    });

    this.client.on('disconnected', () => {
      this.isReady = false;
      logger.warn('WhatsApp desconectado');
    });

    this.client.initialize();
  }

  public async sendText(to: string, message: string) {
    if (!this.isReady) {
      logger.error('WhatsApp client não está pronto. Mensagem não enviada.');
      return;
    }
    try {
      // O whatsapp-web.js espera o formato [number]@c.us
      const chatId = `${to}@c.us`;
      await this.client.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Erro ao enviar mensagem via whatsapp-web.js', { error });
    }
  }
}

// Exporta uma única instância para ser usada em toda a aplicação
export const whatsappService = new WhatsAppService();
