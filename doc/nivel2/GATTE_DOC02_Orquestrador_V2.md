GATTE Tecnologia
Revenda LC
DOC 02 — Orquestrador de Intencoes — V2
Maquina de Estados Formal, Catalogo e Pseudocodigo Executavel

Versao 2.0  |  2025

1. Enumeracao Formal de Intencoes
Cada intencao e um valor imutavel de enum. Nenhum if/else pode referenciar string literal — apenas a constante.

// intents.enum.ts — fonte unica da verdade
export const INTENT = {
  // ── Institucionais ─────────────────────────────
  INFO_COMPANY:       'INTENT_INFO_COMPANY',      // Quem e a GATTE?
  INFO_PRODUCT:       'INTENT_INFO_PRODUCT',      // O que e LC Web?
  INFO_PLAN:          'INTENT_INFO_PLAN',         // Quais planos?
  INFO_CERTIFICATE:   'INTENT_INFO_CERTIFICATE',  // O que e cert digital?
  INFO_INTEGRATION:   'INTENT_INFO_INTEGRATION',  // Como funciona TEF/PIX?
  // ── Fluxos Estruturados ─────────────────────────
  OPEN_TICKET:        'INTENT_OPEN_TICKET',       // Quero abrir chamado
  CHECK_TICKET:       'INTENT_CHECK_TICKET',      // Status protocolo BR-xxx
  CAPTURE_LEAD:       'INTENT_CAPTURE_LEAD',      // Quero ser cliente
  SCHEDULE_DEMO:      'INTENT_SCHEDULE_DEMO',     // Agendar demonstracao
  // ── Autenticados ────────────────────────────────
  QUERY_SERVICES:     'INTENT_QUERY_SERVICES',    // Meus servicos ativos
  QUERY_CERTIFICATE:  'INTENT_QUERY_CERTIFICATE', // Validade do meu cert
  QUERY_TICKET_LIST:  'INTENT_QUERY_TICKET_LIST', // Meus chamados abertos
  // ── Navegacao ───────────────────────────────────
  MENU_OPEN:          'INTENT_MENU_OPEN',         // menu / ola / inicio
  MENU_OPTION:        'INTENT_MENU_OPTION',       // usuario digitou 1..9
  // ── Escalada ────────────────────────────────────
  HUMAN_REQUEST:      'INTENT_HUMAN_REQUEST',     // quero atendente
  COMPLAINT_FORMAL:   'INTENT_COMPLAINT_FORMAL',  // reclamacao formal
  // ── Conversacional ──────────────────────────────
  SMALLTALK:          'INTENT_SMALLTALK',         // oi / tudo bem
  FAQ:                'INTENT_FAQ',               // duvida geral
  // ── Fallback ────────────────────────────────────
  OUT_OF_SCOPE:       'INTENT_OUT_OF_SCOPE',      // fora do escopo GATTE
  UNKNOWN:            'INTENT_UNKNOWN',            // nao classificavel
} as const;

2. Regra de Prioridade de Intencoes
Quando uma mensagem contem multiplas intencoes, o orquestrador aplica a seguinte ordem de prioridade (1 = maxima):

P	Intencao	Justificativa
1	HUMAN_REQUEST / COMPLAINT_FORMAL	Seguranca e compliance. Escala imediatamente, sem processamento adicional.
2	CHECK_TICKET	Cliente pode estar em situacao critica. Resposta imediata ao chamado aberto.
3	OPEN_TICKET	Problema reportado tem prioridade sobre curiosidade.
4	MENU_OPTION	Selecao explicita do usuario sempre respeita o menu.
5	SCHEDULE_DEMO / CAPTURE_LEAD	Intencao de negocio estruturada.
6	INFO_* / FAQ	Informativo, nao urgente.
7	SMALLTALK	Conversa casual, processa somente se nenhuma acima detectada.
8	UNKNOWN / OUT_OF_SCOPE	Fallback. Aciona politica de resposta padrao.

Exemplo: 'Quero abrir chamado e saber sobre certificacao' → OPEN_TICKET ganha (prioridade 3 vs 6). O bot abre o fluxo de ticket e menciona: 'Apos resolvermos seu chamado, te explico sobre certificacao.'

3. Diagrama Formal de Estados
Cada estado e uma constante do sistema. Transicoes sao deterministas — dado um estado + evento, o proximo estado e unico.

export const STATE = {
  IDLE:                'STATE_IDLE',
  MENU:                'STATE_MENU',
  AI_FREE:             'STATE_AI_FREE',
  TICKET_FLOW_S1:      'STATE_TICKET_FLOW_S1',  // coleta nome
  TICKET_FLOW_S2:      'STATE_TICKET_FLOW_S2',  // coleta email
  TICKET_FLOW_S3:      'STATE_TICKET_FLOW_S3',  // coleta descricao
  TICKET_FLOW_S4:      'STATE_TICKET_FLOW_S4',  // coleta prioridade
  TICKET_FLOW_DONE:    'STATE_TICKET_FLOW_DONE',
  LEAD_FLOW_S1:        'STATE_LEAD_FLOW_S1',    // coleta nome
  LEAD_FLOW_S2:        'STATE_LEAD_FLOW_S2',    // coleta empresa
  LEAD_FLOW_S3:        'STATE_LEAD_FLOW_S3',    // coleta interesse
  LEAD_FLOW_S4:        'STATE_LEAD_FLOW_S4',    // coleta email
  LEAD_FLOW_DONE:      'STATE_LEAD_FLOW_DONE',
  DEMO_FLOW_S1:        'STATE_DEMO_FLOW_S1',    // coleta data/hora
  DEMO_FLOW_S2:        'STATE_DEMO_FLOW_S2',    // confirma agendamento
  DEMO_FLOW_DONE:      'STATE_DEMO_FLOW_DONE',
  HUMAN:               'STATE_HUMAN',            // atendimento humano
  CLOSED:              'STATE_CLOSED',
} as const;

4. Tabela de Transicao de Estados
Estado Atual	Evento / Intencao	Proximo Estado	Acao Disparada
IDLE	Primeiro contato ou MENU_OPEN	MENU	sendMenu()
MENU	MENU_OPTION (1)	AI_FREE	handleInstitutional()
MENU	MENU_OPTION (2)	AI_FREE	handleProducts()
MENU	MENU_OPTION (3)	AI_FREE	handlePlans()
MENU	MENU_OPTION (4)	TICKET_FLOW_S1	startTicketFlow()
MENU	MENU_OPTION (5)	LEAD_FLOW_S1	startLeadFlow()
MENU	MENU_OPTION (6)	AI_FREE	handleFAQ()
MENU	MENU_OPTION (7)	DEMO_FLOW_S1	startDemoFlow()
MENU	MENU_OPTION (8)	AI_FREE	handleTicketCheck()
MENU	MENU_OPTION (9)	HUMAN	escalateToHuman()
AI_FREE	OPEN_TICKET	TICKET_FLOW_S1	startTicketFlow()
AI_FREE	CAPTURE_LEAD	LEAD_FLOW_S1	startLeadFlow()
AI_FREE	SCHEDULE_DEMO	DEMO_FLOW_S1	startDemoFlow()
AI_FREE	MENU_OPEN	MENU	sendMenu()
TICKET_FLOW_S*	Input valido	TICKET_FLOW_S(n+1)	saveFlowData()
TICKET_FLOW_S4	Input valido	TICKET_FLOW_DONE	createTicket()
TICKET_FLOW_DONE	—	IDLE	sendProtocol()
LEAD_FLOW_S4	Input valido	LEAD_FLOW_DONE	saveLead() + syncCRM()
DEMO_FLOW_S2	Confirmado	DEMO_FLOW_DONE	createAppointment()
QUALQUER	HUMAN_REQUEST	HUMAN	escalateToHuman()
QUALQUER	COMPLAINT_FORMAL	HUMAN	escalateToHuman() + alert()
HUMAN	Atendente encerra	CLOSED	sendPostSale()
QUALQUER	Timeout 4h	CLOSED	expireSession()

5. Pseudocodigo Executavel do Orquestrador
// orchestrator.ts — unico ponto de entrada de cada mensagem
async function orchestrate(phone: string, raw: string): Promise<void> {

  // ─── 1. Resolver usuario e conversa ───────────────────────
  const user = await UserRepo.findOrCreate(phone);
  const conv = await ConvRepo.getOpenOrCreate(user.id);
  const ctx  = await CtxRepo.load(conv.id);

  // ─── 2. Fluxo ativo? Continua coleta ─────────────────────
  if (conv.current_flow && conv.mode === 'flow') {
    return FlowManager.continue(conv, ctx, raw);
  }

  // ─── 3. Classificar intencao (modelo leve) ────────────────
  const intent = await IntentClassifier.classify(raw, ctx, {
    model: 'claude-haiku',
    maxTokens: 100,  // classificacao e rapida
    systemPrompt: CLASSIFIER_PROMPT,
  });

  // ─── 4. Aplicar prioridade quando multiplas intencoes ─────
  const resolved = IntentPriority.resolve(intent);

  // ─── 5. Roteamento determinista ───────────────────────────
  switch (resolved) {
    case INTENT.HUMAN_REQUEST:
    case INTENT.COMPLAINT_FORMAL:
      return EscalateHandler.run(conv, user);

    case INTENT.MENU_OPEN:
    case INTENT.MENU_OPTION:
      return MenuHandler.run(conv, raw);

    case INTENT.OPEN_TICKET:
      return FlowManager.start('TICKET_FLOW', conv, ctx);

    case INTENT.CAPTURE_LEAD:
      return FlowManager.start('LEAD_FLOW', conv, ctx);

    case INTENT.SCHEDULE_DEMO:
      return FlowManager.start('DEMO_FLOW', conv, ctx);

    case INTENT.CHECK_TICKET:
      return TicketHandler.queryStatus(raw, user);

    case INTENT.OUT_OF_SCOPE:
    case INTENT.UNKNOWN:
      return FallbackHandler.run(conv, ctx);

    default:  // INFO_*, FAQ, SMALLTALK → IA livre
      return AIHandler.generate(raw, ctx, user, {
        model: 'claude-sonnet',
        maxTokens: 1500,
        systemPrompt: buildSystemPrompt(user),
      });
  }
}

6. FlowManager — Validacao por Passo
