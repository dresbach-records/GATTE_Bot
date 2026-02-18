
import 'isomorphic-fetch';
import { PublicClientApplication, ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { config } from '@/config';
import { logger } from '@/utils/logger';

interface CalendarServiceError {
  isError: true;
  message: string;
  details?: any;
}

class CalendarService {
  private graphClient: Client | null = null;
  private msalClient: ConfidentialClientApplication;
  private isEnabled: boolean;

  constructor() {
    if (!config.ms.clientId || !config.ms.clientSecret || !config.ms.tenantId || !config.ms.userId) {
      logger.warn('Credenciais do Microsoft Graph não configuradas. O serviço de calendário estará desabilitado.');
      this.isEnabled = false;
      // @ts-ignore - MsalClient precisa ser inicializado, mas não será usado.
      this.msalClient = {}; 
      return;
    }

    this.isEnabled = true;
    const msalConfig: Configuration = {
      auth: {
        clientId: config.ms.clientId,
        authority: `https://login.microsoftonline.com/${config.ms.tenantId}`,
        clientSecret: config.ms.clientSecret,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message) => {
            if (level === LogLevel.Error) logger.error('MSAL Error', { message });
            if (level === LogLevel.Warning) logger.warn('MSAL Warning', { message });
          },
          piiLoggingEnabled: false,
          logLevel: LogLevel.Warning,
        },
      },
    };

    this.msalClient = new ConfidentialClientApplication(msalConfig);
    this.initializeGraphClient();
  }

  private async initializeGraphClient(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        logger.error('Não foi possível obter o token de acesso para o MS Graph. Autenticação falhou.');
        this.isEnabled = false;
        return;
      }

      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      logger.info('Cliente do Microsoft Graph inicializado com sucesso.');
    } catch (error: any) {
        logger.error('Falha ao inicializar o cliente do MS Graph', { error: error.message });
        this.isEnabled = false;
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.isEnabled) return null;

    const request = {
      scopes: ['https://graph.microsoft.com/.default'],
    };

    try {
      const response = await this.msalClient.acquireTokenByClientCredential(request);
      return response?.accessToken || null;
    } catch (error) {
      logger.error('Erro ao adquirir token do MS Graph', { error });
      return null;
    }
  }

  public async findAvailableTimes(durationMinutes: number = 30): Promise<any[] | CalendarServiceError> {
    if (!this.isEnabled || !this.graphClient) {
        return { isError: true, message: 'Serviço de calendário não está configurado ou falhou ao inicializar.' };
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14); // Buscar nos próximos 14 dias

    const requestBody = {
        schedules: [config.ms.userId],
        startTime: {
            dateTime: today.toISOString(),
            timeZone: 'America/Sao_Paulo',
        },
        endTime: {
            dateTime: endDate.toISOString(),
            timeZone: 'America/Sao_Paulo',
        },
        availabilityViewInterval: durationMinutes,
    };

    try {
        const response = await this.graphClient
            .api(`/users/${config.ms.userId}/calendar/getSchedule`)
            .post(requestBody);

        return response.value[0]?.scheduleItems || [];
    } catch (error: any) {
        logger.error('Erro ao buscar horários no MS Graph', { error: error.message });
        return { isError: true, message: 'Falha ao consultar a agenda.', details: error.message };
    }
  }

  public async createEvent(subject: string, startTime: string, endTime: string, attendeeName: string, attendeePhone: string): Promise<any | CalendarServiceError> {
    if (!this.isEnabled || !this.graphClient) {
        return { isError: true, message: 'Serviço de calendário não está configurado ou falhou ao inicializar.' };
    }

    const event = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: `Agendamento de demonstração para <strong>${attendeeName}</strong> (Contato: ${attendeePhone}).<br>Agendado via GATTE Bot.`
      },
      start: {
          dateTime: startTime,
          timeZone: 'America/Sao_Paulo'
      },
      end: {
          dateTime: endTime,
          timeZone: 'America/Sao_Paulo'
      },
      attendees: [],
    };

    try {
        const response = await this.graphClient.api(`/users/${config.ms.userId}/calendar/events`).post(event);
        logger.info('Evento criado com sucesso no calendário', { subject, startTime });
        return response;
    } catch (error: any) {
        logger.error('Erro ao criar evento no MS Graph', { error: error.message });
        return { isError: true, message: 'Falha ao criar o evento na agenda.', details: error.message };
    }
  }
}

export const calendarService = new CalendarService();
