
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users, conversations, messages, tickets } from '@/db/schema';

// ══════════════════════════════════════════════════════════
// Tipos de Banco de Dados (Drizzle ORM)
// ══════════════════════════════════════════════════════════

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type Ticket = InferSelectModel<typeof tickets>;
export type NewTicket = InferInsertModel<typeof tickets>;

// ══════════════════════════════════════════════════════════
// Tipos de Negócio e Lógica
// ══════════════════════════════════════════════════════════

// --- WhatsApp --- 
export interface WhatsAppMessage {
    from: string;  // Número de telefone do remetente
    body: string;  // Conteúdo da mensagem
}

// --- IA (Intenções) ---
export const INTENT = {
    // ... (intenções existentes)
    SCHEDULE_DEMO: 'schedule_demo',
} as const;

export type IntentValue = typeof INTENT[keyof typeof INTENT];

// --- Fluxos (Flows) ---
export type FlowName = 'LEAD_FLOW' | 'TICKET_FLOW' | 'DEMO_FLOW';

// Contexto da sessão, salvo no banco de dados, para fluxos e IA
export interface SessionContext {
    // Para IA
    last_interactions?: Array<{ role: 'user' | 'assistant', content: string }>;

    // Para Fluxos
    current_step?: string;
    [key: string]: any; // Permite outras chaves dinâmicas, como 'available_slots'
}
