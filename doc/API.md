# 📡 API — GATTE_Bot

> **Base:** Express 4 · Node.js 20 · REST · JSON
> **Auth:** Validação de Webhook (HMAC) e Tokens (futuro)

---

## 🌐 Base URL

| Ambiente | URL |
|---|---|
| **dev** | `http://localhost:3000` |
| **prod** | `https://api.gattebot.com` (exemplo) |

---

## 📱 Webhook do WhatsApp

Este é o principal endpoint da aplicação, responsável por receber todas as interações do usuário vindas da API da Meta.

### `POST /webhook`

Recebe notificações de novas mensagens, status de entrega, reações, etc.

**Autenticação:**
- A autenticidade da requisição é verificada pelo header `X-Hub-Signature-254`, que deve conter o hash HMAC-SHA256 do corpo da requisição, assinado com o `APP_SECRET` da Meta.

**Exemplo de Payload (Nova Mensagem):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "whatsapp_business_account_id",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+551155551234",
              "phone_number_id": "phone_number_id"
            },
            "contacts": [
              {
                "profile": { "name": "João Silva" },
                "wa_id": "5511999998765"
              }
            ],
            "messages": [
              {
                "from": "5511999998765",
                "id": "wamid.message_id",
                "timestamp": "1678886400",
                "text": { "body": "Olá, gostaria de abrir um chamado" },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Respostas:**
- `200 OK`: A mensagem foi recebida e será processada de forma assíncrona.
- `403 Forbidden`: A assinatura do webhook é inválida. A mensagem é descartada.
- `400 Bad Request`: O payload está malformado (validação Zod falhou).

### `GET /webhook`

Usado apenas para a verificação inicial do endpoint pela Meta. O servidor responde com o `hub.challenge` se o `hub.verify_token` for válido.

---

## 🎫 Gerenciamento de Tickets (Futuro)

Endpoints para uma futura interface administrativa.

- `GET /api/tickets`: Lista todos os tickets com filtros (`status`, `priority`, `assignee`).
- `GET /api/tickets/:id`: Retorna os detalhes de um ticket específico, incluindo o histórico de mensagens.
- `PATCH /api/tickets/:id`: Atualiza o status, prioridade ou responsável de um ticket.
- `POST /api/tickets/:id/comments`: Adiciona um comentário interno a um ticket.

---

## ❤️ Health Check

Endpoint para monitoramento da saúde da aplicação.

### `GET /health`

Verifica o status da aplicação e suas dependências.

**Response 200:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "ai_service": "healthy",
  "timestamp": "2024-07-26T10:00:00Z"
}
```

**Possíveis status de dependências:** `connected`, `disconnected`, `unhealthy`.

---

## ❌ Códigos de Erro

| Código | Significado |
|---|---|
| `400` | Bad Request — Payload inválido ou faltando parâmetros. |
| `401` | Unauthorized — Token de autenticação ausente ou inválido (para APIs de admin futuras). |
| `403` | Forbidden — Assinatura do webhook inválida ou acesso negado. |
| `404` | Not Found — Recurso não encontrado (e.g., ticket com ID inexistente). |
| `429` | Too Many Requests — Limite de mensagens por minuto excedido. |
| `500` | Internal Server Error — Erro inesperado no servidor, banco de dados ou serviço de IA. |
| `503` | Service Unavailable — Uma dependência crítica (e.g., API de IA) está fora do ar. |

**Formato padrão de erro:**
```json
{
  "error": "INVALID_WEBHOOK_SIGNATURE",
  "message": "A assinatura HMAC do webhook não pôde ser validada.",
  "statusCode": 403
}
```

---

*GATTE_Bot · API v1.0 · Express · 2024*
