import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/config';
import { ClassifiedIntent, IntentValue, SessionContext, User, INTENT } from '@/types';
import { logger } from '@/utils/logger';

// ══════════════════════════════════════════════════════════
// GATTE BOT — AI Service
// Classificador (haiku) + Respondedor (sonnet) + Contexto
// ══════════════════════════════════════════════════════════

const client = new Anthropic({ apiKey: config.ai.apiKey });

// ─── SYSTEM PROMPT FIXO (fonte da verdade) ───
function buildSystemPrompt(user?: User): string {
  const clientData = user && user.is_client
    ? `\n\n# DADOS DO CLIENTE LOGADO\nNome: ${user.name || 'nao informado'}\nEmpresa: ${user.company || 'nao informada'}\nCliente ativo: Sim`
    : '';

  return `# IDENTIDADE E PERSONA
Voce e Gatta, assistente virtual oficial da GATTE Tecnologia.
A GATTE e especializada em: TI empresarial, Certificacao Digital (e-CPF, e-CNPJ, NFe, CTe), Automacao de processos e Revenda do sistema LC (LC Web e LC ERP).

PERSONALIDADE:
- Tom: profissional, cordial, objetivo e prestativo
- Idioma: portugues brasileiro exclusivamente
- Emojis: maximo 2 por mensagem
- Tamanho: maximo 5 linhas por resposta. Se mais, use lista numerada.
- Nunca use girias ou linguagem informal excessiva

# ESCOPO PERMITIDO
- Informacoes sobre GATTE Tecnologia e seus servicos
- LC Web, LC ERP, Certificacao Digital, PIX, TEF, NFe
- Comparacao de planos: Essencial, Profissional, Enterprise
- Duvidas de implantacao e configuracao do sistema LC
- Status de chamados (quando protocolo informado)
- Dados do cliente logado (ver abaixo)

# ESCOPO PROIBIDO
- Precos exatos (coletar interesse e passar para comercial)
- Dados de OUTROS clientes (violacao LGPD)
- Assuntos juridicos, fiscais, medicos
- Opiniao sobre concorrentes (Totvs, Senior, Sankhya)
- Promessas de prazo ou desconto sem aprovacao comercial

# POLITICA ANTI-ALUCINACAO (CRITICA)
Se voce nao tem certeza de uma informacao: NAO INVENTE.
Use EXATAMENTE uma destas respostas:
- Dado desconhecido: "Essa e uma otima pergunta! Vou verificar com nossa equipe e retorno em breve. Posso ajudar com mais alguma coisa?"
- Preco/condicao comercial: "Os valores dependem do perfil da sua empresa. Vou conectar voce com nosso comercial para uma proposta personalizada. 📋"
- Dado do cliente ausente: "Nao localizei essa informacao. Pode me passar o numero do protocolo ou confirmar seu e-mail cadastrado?"
PROIBIDO usar: "Acredito que...", "Provavelmente...", "Acho que..."

# ESCALADA OBRIGATORIA
Transfira SEMPRE para humano quando:
1. Cliente pedir atendente explicitamente
2. Reclamacao formal ou mencao a acao legal
3. Problema com perda financeira do cliente
4. Voce nao soube responder apos 2 tentativas
5. Frustacao intensa (!!!, URGENTE, palavroes)
Mensagem padrao: "Entendo a importancia. Vou te conectar com um especialista agora. Um momento! 👤"

# FALLBACK (fora do escopo)
"Esse tema esta fora do que posso ajudar aqui. Posso te ajudar com algo sobre os servicos da GATTE? 😊"
${clientData}`;
}

// ─── PROMPT DO CLASSIFICADOR ───
const CLASSIFIER_PROMPT = `Voce e um classificador de intencoes. Analise a mensagem e retorne APENAS um JSON valido.
SEM texto adicional. SEM markdown. SEM explicacoes. APENAS o JSON.

Formato: {"intent":"INTENT_CODE","confidence":0.95,"secondary":"INTENT_CODE_OR_NULL"}

Intencoes validas:
INTENT_INFO_COMPANY | INTENT_INFO_PRODUCT | INTENT_INFO_PLAN | INTENT_INFO_CERTIFICATE | INTENT_INFO_INTEGRATION
INTENT_OPEN_TICKET | INTENT_CHECK_TICKET | INTENT_CAPTURE_LEAD | INTENT_SCHEDULE_DEMO
INTENT_QUERY_SERVICES | INTENT_QUERY_CERTIFICATE | INTENT_QUERY_TICKET_LIST
INTENT_MENU_OPEN | INTENT_MENU_OPTION | INTENT_HUMAN_REQUEST | INTENT_COMPLAINT_FORMAL
INTENT_SMALLTALK | INTENT_FAQ | INTENT_OUT_OF_SCOPE | INTENT_UNKNOWN

Regras:
- confidence entre 0.0 e 1.0
- Se confidence < 0.6 use INTENT_UNKNOWN
- secondary pode ser null`;

// ─── CLASSIFICADOR ───
export async function classifyIntent(
  message: string,
  ctx?: SessionContext | null
): Promise<ClassifiedIntent> {
  const contextHint = ctx?.last_intent
    ? `\nContexto anterior: ${ctx.last_intent}`
    : '';

  try {
    const response = await client.messages.create({
      model: config.ai.classifierModel,
      max_tokens: config.ai.maxTokensClassifier,
      system: CLASSIFIER_PROMPT,
      messages: [{ role: 'user', content: message + contextHint }],
    });

    const raw = (response.content[0] as any).text.trim();
    const parsed = JSON.parse(raw);

    return {
      intent:     (parsed.intent || INTENT.UNKNOWN) as IntentValue,
      confidence: parseFloat(parsed.confidence) || 0,
      secondary:  parsed.secondary || undefined,
    };
  } catch (err: any) {
    logger.warn('Erro na classificacao de intencao', { error: err.message });
    return { intent: INTENT.UNKNOWN, confidence: 0 };
  }
}

// ─── RESPONDEDOR PRINCIPAL ───
export async function generateResponse(
  message: string,
  context: Array<{ role: 'user' | 'assistant'; content: string }>,
  user?: User
): Promise<{ text: string; tokensIn: number; tokensOut: number; latencyMs: number }> {
  const start = Date.now();

  const response = await client.messages.create({
    model:      config.ai.responderModel,
    max_tokens: config.ai.maxTokensResponder,
    system:     buildSystemPrompt(user),
    messages:   [...context, { role: 'user', content: message }],
  });

  const text      = (response.content[0] as any).text;
  const latencyMs = Date.now() - start;

  return {
    text,
    tokensIn:  response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
    latencyMs,
  };
}

// ─── GERENCIAMENTO DE CONTEXTO ───
export async function buildContext(
  ctx: SessionContext | null,
  totalMessages: number
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  if (!ctx) return [];

  let messages = [...(ctx.messages_json as any[])];

  // Sumarizar se necessario
  if (totalMessages > config.ai.summarizeAfter && !ctx.summary) {
    try {
      const summaryResp = await client.messages.create({
        model:      config.ai.classifierModel,
        max_tokens: 500,
        system:     'Resuma o inicio desta conversa em no maximo 3 frases, preservando informacoes importantes como nome, problema e dados coletados.',
        messages:   messages.slice(0, -config.ai.maxContextMessages).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });
      ctx.summary = (summaryResp.content[0] as any).text;
      logger.info('Contexto sumarizado', { convId: ctx.conversation_id });
    } catch (err: any) {
      logger.warn('Falha ao sumarizar contexto', { error: err.message });
    }
  }

  // Manter apenas as ultimas N mensagens
  messages = messages.slice(-config.ai.maxContextMessages);

  // Truncar por tokens (estimativa: 1 token ≈ 4 chars)
  while (messages.reduce((acc, m) => acc + m.content.length / 4, 0) > config.ai.maxContextTokens) {
    if (messages.length <= 1) break;
    messages = messages.slice(1);
  }

  return messages as Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ─── RESOLUCAO DE PRIORIDADE ───
export function resolvePriority(classified: ClassifiedIntent): IntentValue {
  const { INTENT_PRIORITY } = require('@/types');
  const primary   = classified.intent;
  const secondary = classified.secondary;

  if (!secondary) return primary;

  const pPrimary   = INTENT_PRIORITY[primary]   ?? 99;
  const pSecondary = INTENT_PRIORITY[secondary] ?? 99;

  return pPrimary <= pSecondary ? primary : secondary;
}
