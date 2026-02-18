// ══════════════════════════════════════════════════════════
// GATTE BOT — Types & Enums
// Fonte única da verdade para todas as constantes do sistema
// ══════════════════════════════════════════════════════════

// ─── INTENCOES ───
export const INTENT = {
  // Institucionais
  INFO_COMPANY:      'INTENT_INFO_COMPANY',
  INFO_PRODUCT:      'INTENT_INFO_PRODUCT',
  INFO_PLAN:         'INTENT_INFO_PLAN',
  INFO_CERTIFICATE:  'INTENT_INFO_CERTIFICATE',
  INFO_INTEGRATION:  'INTENT_INFO_INTEGRATION',
  // Fluxos estruturados
  OPEN_TICKET:       'INTENT_OPEN_TICKET',
  CHECK_TICKET:      'INTENT_CHECK_TICKET',
  CAPTURE_LEAD:      'INTENT_CAPTURE_LEAD',
  SCHEDULE_DEMO:     'INTENT_SCHEDULE_DEMO',
  // Autenticados
  QUERY_SERVICES:    'INTENT_QUERY_SERVICES',
  QUERY_CERTIFICATE: 'INTENT_QUERY_CERTIFICATE',
  QUERY_TICKET_LIST: 'INTENT_QUERY_TICKET_LIST',
  // Navegacao
  MENU_OPEN:         'INTENT_MENU_OPEN',
  MENU_OPTION:       'INTENT_MENU_OPTION',
  // Escalada
  HUMAN_REQUEST:     'INTENT_HUMAN_REQUEST',
  COMPLAINT_FORMAL:  'INTENT_COMPLAINT_FORMAL',
  // Conversacional
  SMALLTALK:         'INTENT_SMALLTALK',
  FAQ:               'INTENT_FAQ',
  // Fallback
  OUT_OF_SCOPE:      'INTENT_OUT_OF_SCOPE',
  UNKNOWN:           'INTENT_UNKNOWN',
} as const;

export type IntentValue = typeof INTENT[keyof typeof INTENT];

// ─── PRIORIDADE DE INTENCOES (1 = maxima) ───
export const INTENT_PRIORITY: Record<IntentValue, number> = {
  [INTENT.HUMAN_REQUEST]:     1,
  [INTENT.COMPLAINT_FORMAL]:  1,
  [INTENT.CHECK_TICKET]:      2,
  [INTENT.OPEN_TICKET]:       3,
  [INTENT.MENU_OPEN]:         4,
  [INTENT.MENU_OPTION]:       4,
  [INTENT.SCHEDULE_DEMO]:     5,
  [INTENT.CAPTURE_LEAD]:      5,
  [INTENT.QUERY_SERVICES]:    6,
  [INTENT.QUERY_CERTIFICATE]: 6,
  [INTENT.QUERY_TICKET_LIST]: 6,
  [INTENT.INFO_COMPANY]:      7,
  [INTENT.INFO_PRODUCT]:      7,
  [INTENT.INFO_PLAN]:         7,
  [INTENT.INFO_CERTIFICATE]:  7,
  [INTENT.INFO_INTEGRATION]:  7,
  [INTENT.FAQ]:               7,
  [INTENT.SMALLTALK]:         8,
  [INTENT.OUT_OF_SCOPE]:      9,
  [INTENT.UNKNOWN]:           10,
};

// ─── ESTADOS DA MAQUINA ───
export const STATE = {
  IDLE:              'STATE_IDLE',
  MENU:              'STATE_MENU',
  AI_FREE:           'STATE_AI_FREE',
  TICKET_FLOW_S1:    'STATE_TICKET_FLOW_S1',
  TICKET_FLOW_S2:    'STATE_TICKET_FLOW_S2',
  TICKET_FLOW_S3:    'STATE_TICKET_FLOW_S3',
  TICKET_FLOW_S4:    'STATE_TICKET_FLOW_S4',
  TICKET_FLOW_DONE:  'STATE_TICKET_FLOW_DONE',
  LEAD_FLOW_S1:      'STATE_LEAD_FLOW_S1',
  LEAD_FLOW_S2:      'STATE_LEAD_FLOW_S2',
  LEAD_FLOW_S3:      'STATE_LEAD_FLOW_S3',
  LEAD_FLOW_S4:      'STATE_LEAD_FLOW_S4',
  LEAD_FLOW_DONE:    'STATE_LEAD_FLOW_DONE',
  DEMO_FLOW_S1:      'STATE_DEMO_FLOW_S1',
  DEMO_FLOW_S2:      'STATE_DEMO_FLOW_S2',
  DEMO_FLOW_DONE:    'STATE_DEMO_FLOW_DONE',
  HUMAN:             'STATE_HUMAN',
  CLOSED:            'STATE_CLOSED',
} as const;

// ─── INTERFACES DO BANCO ───
export interface User {
  id: string;
  phone: string;
  phone_hash: string;
  name?: string;
  email?: string;
  email_masked?: string;
  company?: string;
  is_client: boolean;
  login_token?: string;
  token_exp_at?: Date;
  consent: boolean;
  consent_at?: Date;
  lgpd_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  status: 'open' | 'closed' | 'transferred' | 'waiting' | 'expired';
  mode: 'idle' | 'menu' | 'ai_free' | 'flow' | 'human';
  current_flow?: string;
  flow_step: number;
  flow_data?: Record<string, any>;
  last_intent?: string;
  transferred_to?: string;
  started_at: Date;
  last_msg_at: Date;
  closed_at?: Date;
  total_messages: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_masked?: string;
  tokens_input?: number;
  tokens_output?: number;
  intent_detected?: string;
  model_used?: string;
  latency_ms?: number;
  is_in_context: boolean;
  created_at: Date;
}

export interface SessionContext {
  id: string;
  conversation_id: string;
  messages_json: Array<{ role: string; content: string }>;
  summary?: string;
  total_tokens: number;
  last_intent?: string;
  current_flow?: string;
  step_index: number;
  context_json: Record<string, any>;
  ttl_expires_at: Date;
  updated_at: Date;
}

export interface Ticket {
  id: string;
  protocol: string;
  user_id: string;
  conversation_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  assigned_to?: string;
  internal_notes?: string;
  sla_due_at?: Date;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Lead {
  id: string;
  user_id?: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  interest?: string;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'lost' | 'converted';
  source: string;
  score: number;
  notes?: string;
  crm_id?: string;
  crm_synced_at?: Date;
  created_at: Date;
}

export interface ClassifiedIntent {
  intent: IntentValue;
  confidence: number;
  secondary?: IntentValue;
}

export interface FlowStep {
  step: number;
  field: string;
  ask: string;
  validate: (v: string) => boolean;
  error: string;
  transform?: (v: string) => any;
}

export interface WhatsAppMessage {
  from: string;
  body: string;
  messageId: string;
  timestamp: number;
  type: 'text' | 'audio' | 'image' | 'document';
}
