# Agentise Leads

Plataforma de prospecção outbound B2B construída para a Agentise. Cobre o ciclo completo de prospecção: consulta de CNPJ em lote, enriquecimento de leads via Apollo.io, revisão manual, disparo de e-mails via Resend, integração com Chatwoot e sequências de follow-up automatizadas.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, Realtime)
- **State:** Zustand (global) + TanStack Query (servidor)
- **Integrações:** CNPJá, Apollo.io, Resend, Chatwoot
- **Deploy:** Vercel (frontend) + Supabase Cloud (backend)

## Funcionalidades

- **Fase 1 — MVP:** Consulta CNPJ em lote, qualificação automática, enriquecimento via Apollo, revisão de leads
- **Fase 2 — Outreach:** Campanhas de e-mail com templates variáveis, métricas via webhooks Resend, integração Chatwoot
- **Fase 3 — Follow-up:** Sequências com step builder, inscrição de leads, disparo manual, remoção automática por resposta negativa (Chatwoot polling)
- **Fase 4 — Dashboard:** Visão consolidada do pipeline, onboarding, responsividade completa, lazy loading

## Setup Local

```bash
# 1. Clone o repositório
git clone <repo>
cd agentise-leads

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com sua VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 4. Execute o banco de dados
# Acesse o SQL Editor do Supabase e cole o conteúdo de database.sql

# 5. Configure as Edge Functions (opcional para desenvolvimento local)
supabase functions serve

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

## Deploy

### Frontend (Vercel)

1. Conecte o repositório à Vercel
2. Configure as variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. O arquivo `vercel.json` já está configurado com headers de segurança e rewrites para SPA

### Edge Functions (Supabase)

```bash
supabase functions deploy cnpja-lookup
supabase functions deploy apollo-enrich
supabase functions deploy resend-send
supabase functions deploy resend-webhook
supabase functions deploy chatwoot-test
supabase functions deploy chatwoot-poll
supabase functions deploy follow-up-send
```

Configure no Dashboard do Supabase (Settings > Edge Functions > Environment Variables):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Scheduler (pg_cron)

Para ativar o polling automático do Chatwoot, execute o script de scheduler ao final do `database.sql` no SQL Editor do Supabase.

## Variáveis de Ambiente

Ver `.env.example`. As API keys de CNPJá, Apollo, Resend e Chatwoot são configuradas pela interface em `/settings` e armazenadas no banco — nunca em variáveis de ambiente do frontend.

## Arquitetura

```
src/
├── components/
│   ├── ui/          # shadcn/ui + componentes base (EmptyState, ErrorBoundary, TableSkeleton)
│   ├── layout/      # AppLayout, Sidebar, MobileSidebar, Header
│   ├── cnpj/        # Consulta CNPJ
│   ├── campaigns/   # Campanhas de e-mail
│   ├── followup/    # Sequências de follow-up
│   ├── dashboard/   # Dashboard global
│   └── settings/    # Configurações
├── pages/           # Uma página por rota (lazy loaded)
├── hooks/           # Custom hooks por domínio
├── lib/             # Clientes, utils, validators
├── stores/          # Zustand
├── types/           # Tipos TypeScript centralizados
└── routes/          # Roteamento com lazy loading

supabase/functions/
├── cnpja-lookup/    # Proxy CNPJá
├── apollo-enrich/   # Enriquecimento Apollo
├── resend-send/     # Disparo de e-mail
├── resend-webhook/  # Webhook eventos Resend
├── chatwoot-test/   # Teste de conexão Chatwoot
├── chatwoot-poll/   # Polling de labels Chatwoot
└── follow-up-send/  # Envio de passo de follow-up
```

## Comandos

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run lint     # Lint
```
