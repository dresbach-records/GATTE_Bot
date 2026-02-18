CREATE USER gatte_user WITH PASSWORD 'SenhaForte123';# 🚀 DEPLOYMENT — GATTE_Bot

> **Plataforma:** Docker · Docker Compose
> **Ambientes:** Desenvolvimento (local) e Produção (servidor)

---

## 🌐 Ambientes

| Ambiente | Descrição | Arquivos de Configuração |
|---|---|---|
| **Desenvolvimento** | Roda localmente com hot-reload. Ideal para desenvolver e testar. | `docker-compose.yml`, `.env` |
| **Produção** | Otimizado para performance e estabilidade. Roda em um servidor dedicado. | `docker-compose.prod.yml`, variáveis de ambiente no host |

---

## 💻 Desenvolvimento Local

O ambiente de desenvolvimento é gerenciado pelo Docker Compose e foi projetado para ser iniciado com um único comando.

```bash
# 1. Verifique se o Docker está em execução.

# 2. Suba os containers em modo "detached" (-d)
docker-compose up -d

# A aplicação estará disponível em http://localhost:3000
# O servidor reiniciará automaticamente a cada alteração no código.

# Para parar os serviços:
docker-compose down
```

---

## 🚀 Deploy para Produção

O deploy em produção utiliza um arquivo Docker Compose específico (`docker-compose.prod.yml`) que não monta os volumes de código, garantindo que a imagem seja autocontida e imutável.

### Pré-requisitos no Servidor de Produção:
- Docker e Docker Compose instalados.
- Git instalado.
- Variáveis de ambiente configuradas no host (não use um arquivo `.env` em produção).

### Passos do Deploy:

```bash
# 1. Acesse o servidor de produção via SSH
ssh user@your_server_ip

# 2. Navegue até o diretório do projeto
cd /path/to/GATTE_Bot

# 3. Puxe a versão mais recente da branch principal
git checkout main
git pull origin main

# 4. Construa a nova imagem do Docker sem usar cache
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Suba a nova versão da aplicação em modo "detached"
docker-compose -f docker-compose.prod.yml up -d

# 6. (Opcional) Remova containers antigos que não estão mais em uso
docker image prune -f
```

---

## 🤖 CI/CD (Futuro)

Um pipeline de CI/CD pode automatizar o processo de deploy. O fluxo seria:

1.  **Push na branch `main`:** Um push ou merge na branch `main` dispara o pipeline.
2.  **Testes:** O pipeline executa os testes automatizados.
3.  **Build da Imagem:** Uma nova imagem Docker é construída e enviada para um registry (como o Docker Hub ou AWS ECR).
4.  **Deploy:** O servidor de produção é instruído (via SSH ou um agente) a baixar a nova imagem e reiniciar o serviço.

---

## 🔙 Rollback

Se um deploy apresentar problemas, o Docker facilita o retorno para a versão anterior.

### Rollback Manual:

1.  **Liste as imagens Docker:** Encontre o `IMAGE ID` da versão anterior que funcionava.
    ```bash
    docker images
    ```
2.  **Reverta o código:** Volte para o commit da versão estável.
    ```bash
    git log
    git checkout <commit_hash_da_versao_estavel>
    ```
3.  **Reconstrua e suba a versão anterior:**
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

---

## ✅ Checklist Pré-Deploy (Produção)

- [ ] O código foi mesclado na branch `main`.
- [ ] As variáveis de ambiente no servidor de produção estão corretas e atualizadas.
- [ ] O backup do banco de dados foi realizado.
- [ ] As migrações do banco de dados foram testadas em um ambiente de staging.
- [ ] O comando `npm audit` foi executado e não há vulnerabilidades críticas.
- [ ] A equipe foi comunicada sobre o deploy.

---

*GATTE_Bot · Guia de Deploy v1.0 · 2024*
