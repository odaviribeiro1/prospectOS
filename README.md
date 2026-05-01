# Agentise Leads

Boilerplate open source de prospecção outbound B2B. Faça fork, configure `.env`, faça deploy e tenha sua própria instância de prospecção rodando em Supabase + Vercel — sem multi-tenancy, sem billing, sem dependência de SaaS de terceiros para suas integrações.

## Funcionalidades

- **Consulta CNPJ em lote** — entrada em massa via API CNPJá, qualificação automática por regime tributário e porte.
- **Enriquecimento de sócios** — Apollo.io para e-mail, LinkedIn, cargo e telefone do quadro societário.
- **Campanhas de e-mail** — templates com variáveis (`{{nome}}`, `{{empresa}}`, `{{link_whatsapp}}`), disparo manual via Resend, métricas de entrega/abertura/resposta via webhooks.
- **Sequências de follow-up** — builder de passos, painel de pendentes para envio manual e remoção automática de leads que receberam a label `resposta_negativa` no Chatwoot (polling configurável).

## Stack

React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui (Radix), Zustand + TanStack Query, React Hook Form + Zod, Sonner. Backend: Supabase (Auth, PostgreSQL com RLS, Edge Functions em Deno, Realtime). Deploy: Vercel (frontend) + Supabase Cloud (backend). Idioma da interface: PT-BR. Tema: dark mode fixo.

## Arquitetura

```
src/
├── components/
│   ├── ui/          # shadcn/ui + base (EmptyState, ErrorBoundary, TableSkeleton)
│   ├── layout/      # AppLayout, Sidebar, MobileSidebar, Header
│   ├── cnpj/        # Consulta CNPJ
│   ├── campaigns/   # Campanhas de e-mail
│   ├── followup/    # Sequências de follow-up
│   └── dashboard/   # Dashboard global
├── pages/           # Uma página por rota (lazy loaded)
├── hooks/           # Custom hooks por domínio
├── lib/             # Clientes, utils, validators
├── stores/          # Zustand
├── types/           # Tipos TypeScript centralizados
└── routes/          # Roteamento com lazy loading

supabase/
├── migrations/
│   ├── 0001_init.sql                 # Schema base (14 tabelas, RLS, helpers, realtime)
│   ├── 0002_profiles_and_roles.sql   # Tabela profiles + enum user_role + trigger handle_new_user
│   ├── 0003_rls_role_aware.sql       # Policies RLS atualizadas para gestor/operacional
│   └── 0004_drop_settings_table.sql  # Remove BYOK em texto plano
└── functions/
    ├── cnpja-lookup/   # Proxy CNPJá
    ├── apollo-enrich/  # Enriquecimento Apollo
    ├── resend-send/    # Disparo de e-mail
    ├── resend-webhook/ # Webhook de eventos Resend
    ├── chatwoot-test/  # Teste de conexão Chatwoot
    ├── chatwoot-poll/  # Polling de labels Chatwoot
    └── follow-up-send/ # Envio de passo de follow-up
```

## Setup self-hosted — passo a passo

> Pré-requisitos: Node.js 20+, npm, conta no Supabase, conta na Vercel, [Supabase CLI](https://supabase.com/docs/guides/cli) instalada (opcional, mas recomendado).

### 1. Fork ou clone do repositório

```bash
git clone https://github.com/<seu-usuario>/agentise-leads.git
cd agentise-leads
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Crie um projeto no Supabase

Acesse [app.supabase.com](https://app.supabase.com), crie um novo projeto, e anote a `Project URL` e a `anon key` (Settings → API).

### 4. Aplique as migrations

**Opção A — via Supabase CLI (recomendado):**

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

**Opção B — via SQL Editor:** abra o SQL Editor no Dashboard do Supabase e cole o conteúdo de cada arquivo, **na ordem**:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_profiles_and_roles.sql`
3. `supabase/migrations/0003_rls_role_aware.sql`
4. `supabase/migrations/0004_drop_settings_table.sql`

### 5. Configure o `.env.local` do frontend

```bash
cp .env.example .env.local
```

Edite `.env.local` preenchendo as 5 variáveis do frontend:

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key do projeto Supabase |
| `VITE_RESEND_FROM_EMAIL` | E-mail remetente padrão (ex.: `prospect@suaempresa.com`) |
| `VITE_RESEND_FROM_NAME` | Nome do remetente exibido no inbox |
| `VITE_WHATSAPP_LINK` | Link de WhatsApp inserido no template `{{link_whatsapp}}` |

### 6. Faça deploy das Edge Functions

```bash
supabase functions deploy cnpja-lookup apollo-enrich resend-send resend-webhook chatwoot-test chatwoot-poll follow-up-send
```

### 7. Configure as env vars das Edge Functions

No Dashboard do Supabase: **Settings → Edge Functions → Environment Variables**. Ou via CLI: `supabase secrets set CHAVE=valor`.

| Variável | Descrição |
|---|---|
| `CNPJA_API_KEY` | Token da CNPJá |
| `APOLLO_API_KEY` | API key do Apollo.io |
| `RESEND_API_KEY` | API key do Resend |
| `RESEND_FROM_EMAIL` | E-mail remetente usado pelas Edge Functions |
| `RESEND_FROM_NAME` | Nome do remetente usado pelas Edge Functions |
| `CHATWOOT_URL` | Base URL do Chatwoot (sem barra final) |
| `CHATWOOT_API_TOKEN` | User Access Token do Chatwoot |
| `CHATWOOT_ACCOUNT_ID` | ID da conta no Chatwoot |
| `CHATWOOT_INBOX_ID` | ID da inbox de e-mail no Chatwoot |
| `WHATSAPP_LINK` | Fallback do link de WhatsApp para campanhas/follow-ups |

### 8. Habilite as extensões necessárias no Supabase

No Dashboard: **Database → Extensions**.

- `pgcrypto` — já habilitada pela migration `0001_init.sql`.
- `pg_cron` — opcional, necessário para o polling automático do Chatwoot (ver seção [Scheduler pg_cron](#scheduler-pg_cron-chatwoot-polling)).
- `pg_net` — opcional, necessária junto com `pg_cron` para o agendamento HTTP da Edge Function.

### 9. Habilite Realtime nas tabelas críticas

**Database → Replication → `supabase_realtime` publication**. Adicione as tabelas:

- `email_sends`
- `batches`
- `follow_up_enrollments`
- `follow_up_activity_log`

A migration `0001_init.sql` já tenta adicioná-las via `ALTER PUBLICATION`, mas confirme no Dashboard caso a publication tenha sido recriada.

### 10. Faça deploy do frontend na Vercel

1. Conecte o repositório à Vercel (`Add New → Project → Import`).
2. Em **Environment Variables**, configure as mesmas 5 variáveis `VITE_*` do passo 5.
3. Deploy. O `vercel.json` já traz rewrites SPA e headers de segurança (X-Frame-Options, nosniff, Permissions-Policy).

### 11. Primeiro registro

Acesse a URL da Vercel e registre o primeiro usuário em `/registro`. O trigger `handle_new_user` (definido em `0002_profiles_and_roles.sql`) detecta que a tabela `profiles` está vazia e promove esse primeiro registro automaticamente para o role **`gestor`**. Todos os usuários subsequentes são registrados como **`operacional`**.

## Roles & permissões

A instância tem dois roles, definidos no enum `public.user_role`:

| Role | Permissões |
|---|---|
| **`gestor`** | Vê e edita todos os dados da instância. Único role que pode promover/rebaixar outros usuários. |
| **`operacional`** | Vê e edita apenas os dados que ele mesmo criou (linhas onde `auth.uid() = user_id`). |

Toda policy RLS segue o padrão `auth.uid() = user_id OR public.is_gestor()` — implementado em `0003_rls_role_aware.sql`.

### Promover/rebaixar manualmente

Não há UI para administração de usuários. O gestor altera roles direto no SQL Editor:

```sql
-- Promover um usuário a gestor
UPDATE public.profiles SET role = 'gestor' WHERE id = '<user-uuid>';

-- Rebaixar para operacional
UPDATE public.profiles SET role = 'operacional' WHERE id = '<user-uuid>';

-- Listar todos os profiles
SELECT id, role, display_name, created_at FROM public.profiles ORDER BY created_at;
```

## Scheduler pg_cron (Chatwoot polling)

A Edge Function `chatwoot-poll` verifica periodicamente se algum contato recebeu a label `resposta_negativa` e remove o lead correspondente da sequência de follow-up. Para automatizar:

1. Habilite as extensões `pg_cron` e `pg_net` no Supabase (Database → Extensions).
2. Abra `supabase/migrations/0001_init.sql`, localize o bloco comentado de scheduler ao final do arquivo, descomente, ajuste a `<SUPABASE_URL>` e o `<SERVICE_ROLE_KEY>` e execute no SQL Editor.
3. O polling rodará a cada 60s (intervalo configurável no `cron.schedule`).

Sem `pg_cron`, a remoção automática só acontece quando você invoca a Edge Function manualmente.

## Comandos

```bash
npm run dev      # Servidor de desenvolvimento (Vite)
npm run build    # Build de produção (tsc -b + vite build)
npm run lint     # ESLint
```

## Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md) para padrão de commits, branch model e como abrir PRs.

## Licença

[MIT](./LICENSE) © 2026 Agentise.
