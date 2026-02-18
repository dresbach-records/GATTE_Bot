# 🤝 CONTRIBUINDO — GATTE_Bot

> **Stack:** Node.js 20 · Express 4 · TypeScript 5 · PostgreSQL 16 · Redis 7
> **Ambiente:** Docker

---

## ✋ Quem Pode Contribuir

Este é um projeto proprietário. Contribuições são permitidas **apenas para colaboradores autorizados**. Siga este guia para manter a qualidade e a consistência do código.

---

## ⚙️ Ambiente de Desenvolvimento

### Pré-requisitos

| Ferramenta | Versão Mínima |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Docker | 24+ |
| Docker Compose | v2+ |

### Setup Inicial

```bash
# 1. Clone o repositório
git clone https://github.com/dresbach-records/GATTE_Bot.git
cd GATTE_Bot

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# ⚠️ Preencha os valores no arquivo .env

# 4. Inicie os serviços (Postgres, Redis)
docker-compose up -d

# 5. Rode as migrações do banco
npm run db:migrate

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

---

## 🌿 Estratégia de Branches

| Branch | Finalidade |
|---|---|
| `main` | Código de produção. O deploy é feito a partir daqui. |
| `develop` | Branch principal de desenvolvimento. Integração das features. |
| `feat/*` | Novas funcionalidades (ex: `feat/add-ticket-flow`). |
| `fix/*` | Correções de bugs (ex: `fix/handle-audio-message`). |
| `chore/*` | Tarefas técnicas, atualização de dependências, etc. |
| `docs/*` | Alterações exclusivas na documentação. |

> **Regra:** Nunca faça push direto para `main` ou `develop`. Todo o código deve passar por um Pull Request.

---

## 📝 Padrão de Commits

Este projeto adota o padrão **Conventional Commits**. A mensagem de commit deve seguir o formato:

`<tipo>(escopo): descrição curta em português`

### Tipos Válidos:

| Tipo | Descrição |
|---|---|
| `feat` | Uma nova funcionalidade. |
| `fix` | Uma correção de bug. |
| `docs` | Mudanças apenas na documentação. |
| `chore` | Tarefas de build, configuração, etc. Sem impacto no usuário final. |
| `refactor` | Refatoração de código que não altera o comportamento. |
| `test` | Adição ou correção de testes. |
| `perf` | Melhoria de performance. |
| `ci` | Mudanças nos arquivos de CI/CD. |

### Exemplos:

```bash
feat(flows): adiciona fluxo de abertura de ticket
fix(whatsapp): corrige formatação de mensagem de boas-vindas
docs(api): documenta o endpoint de health check
chore(deps): atualiza a versão do zod para 3.22
```

---

## 🔄 Fluxo de Pull Request (PR)

1.  **Crie a branch** a partir de `develop`:
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feat/minha-nova-feature
    ```
2.  **Desenvolva** sua funcionalidade, fazendo commits que sigam o padrão definido.

3.  **Abra o Pull Request** direcionado para a branch `develop`.

4.  **Aguarde a revisão**. É necessária a aprovação de pelo menos **um** outro desenvolvedor.

5.  Após a aprovação, realize o **Squash and Merge** do seu PR em `develop`.

---

## 🚫 O que NÃO fazer

- ❌ **Nunca** commitar arquivos `.env`, credenciais ou chaves de API.
- ❌ **Nunca** fazer push direto para as branches `main` ou `develop`.
- ❌ **Nunca** alterar um arquivo de migração (`migrations/*`) que já foi executado em `develop` ou `main`.
- ❌ **Nunca** usar `console.log()` no código. Utilize o logger (`logger.info()`, `logger.error()`).

---

*GATTE_Bot · Guia de Contribuição v1.0*
