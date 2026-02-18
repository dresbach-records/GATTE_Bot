GATTE Tecnologia
Revenda LC
DOC 02 — Orquestrador de Intencoes
Classificacao, Roteamento e Maquina de Estados
Versao 1.0  |  2025

1. O Problema do if/else Gigante
Sem um orquestrador central, o codigo evolui para uma cascata de condicionais impossiveis de manter. O orquestrador e a peca que recebe cada mensagem e decide, de forma estruturada, qual caminho ela deve seguir.

❌ Sem Orquestrador	✅ Com Orquestrador
if message.includes('chamado') → ticket
else if message.includes('plano') → planos
else if message.includes('demo') → demo
else → IA generativa
Imprevisivel, frágil, impossivel de testar	1. Mensagem → ClassificadorIA
2. Intencao → Roteador
3. Roteador → Handler correto
4. Handler → Resposta
Previsivel, testavel, extensivel

2. Catalogo de Intencoes
Cada mensagem recebida e classificada em uma das intencoes abaixo. A classificacao e feita pela IA em milissegundos antes do processamento principal.

Intencao	Tipo	Handler	Exemplo de mensagem
MENU_OPEN	estruturado	MenuHandler	"menu" / "ola" / inicio conversa
INSTITUTIONAL_INFO	aberto	AIHandler	"O que é a GATTE?" / "O que voces fazem?"
PRODUCT_INFO	aberto	AIHandler	"O que é LC Web?" / "como funciona ERP?"
PLAN_COMPARE	aberto	AIHandler	"quais planos?" / "diferenca essencial pro"
PRICING_REQUEST	estruturado	LeadHandler	"quanto custa?" / "quero orcamento"
TICKET_OPEN	estruturado	TicketHandler	"tenho problema" / "nao consigo acessar"
TICKET_STATUS	estruturado	TicketHandler	"status do chamado" / protocolo "BR-1234"
LEAD_CAPTURE	estruturado	LeadHandler	"quero ser cliente" / "tenho interesse"
DEMO_SCHEDULE	estruturado	AppointmentHandler	"agendar demo" / "quero uma demonstracao"
SUPPORT_BASIC	estruturado	SupportHandler	"suporte" / "ajuda tecnica"
IMPLANT_HELP	aberto	AIHandler	"como instalar?" / "requisitos do sistema"
FAQ	aberto	AIHandler	"o que e certificacao?" / "como integrar TEF?"
SERVICE_QUERY	autenticado	ClientHandler	"meus servicos" / "o que eu contratei?"
CERT_QUERY	autenticado	ClientHandler	"validade do certificado" / "quando vence?"
HUMAN_REQUEST	estruturado	EscalateHandler	"falar com atendente" / "quero humano"
OUT_OF_SCOPE	fallback	FallbackHandler	Mensagem sem intencao reconhecida

3. Maquina de Estados
O chatbot opera em modos distintos. A transicao entre modos e controlada pelo orquestrador com base na intencao classificada e no estado atual da conversa.

Estado Atual	Evento	Proximo Estado	Acao
IDLE	Primeiro contato	MENU	Exibir menu de boas-vindas
MENU	Opcao numerica 1-9	FLOW_*	Iniciar fluxo correspondente
MENU	Mensagem livre	AI_FREE	Processar com IA generativa
AI_FREE	Intencao estruturada detectada	FLOW_*	Redirecionar para fluxo
AI_FREE	Digitar 'menu'	MENU	Retornar ao menu principal
FLOW_TICKET	Dados coletados	IDLE	Ticket criado, protocolo enviado
FLOW_LEAD	Dados coletados	IDLE	Lead salvo e enviado ao CRM
FLOW_DEMO	Agendamento confirmado	IDLE	Confirmacao enviada ao cliente
AI_FREE	Intencao HUMAN_REQUEST	HUMAN	Transferir para atendente
FLOW_*	Intencao HUMAN_REQUEST	HUMAN	Transferir mantendo contexto
HUMAN	Atendente encerra	IDLE	Pos-venda automatico enviado
QUALQUER	Timeout 4h sem resposta	CLOSED	Sessao encerrada, contexto limpo

4. Fluxos Estruturados
Fluxos estruturados sao sequencias de coleta de dados com passos definidos. O orquestrador controla qual passo esta ativo e valida cada entrada antes de avancar.

Fluxo: TICKET_FLOW
Passo	Bot pergunta	Validacao	Campo salvo
1	Qual e o seu nome completo?	Minimo 3 caracteres	users.name
2	Qual e o seu e-mail?	Formato valido de e-mail	users.email
3	Descreva o problema detalhadamente:	Minimo 20 caracteres	tickets.description
4	Qual e a urgencia? (1-Baixa 2-Media 3-Alta)	Valor entre 1 e 3	tickets.priority
✔	Ticket gerado! Protocolo: BR-XXXX	—	tickets (INSERT completo)

Fluxo: LEAD_FLOW
Passo	Bot pergunta	Validacao	Campo salvo
1	Qual e o seu nome?	Minimo 3 caracteres	leads.name
2	Nome da sua empresa?	Opcional (pode pular)	leads.company
3	Qual produto te interessa?	Selecionar opcao do menu	leads.interest
4	Qual o melhor e-mail para contato?	Formato valido	leads.email
✔	Obrigado! Nossa equipe retorna em ate 1 dia util.	—	leads (INSERT) + CRM

5. Pseudocodigo do Orquestrador
