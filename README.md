# Agentise Leads

Boilerplate open source self-hosted de prospecção outbound B2B. Faça fork, configure suas credenciais nos painéis (Supabase, GitHub, Vercel) e tenha sua própria instância rodando — sem multi-tenancy, sem billing, sem dependência de SaaS de terceiros para suas integrações.

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
├── components/        # ui, layout, cnpj, campaigns, followup, dashboard
├── pages/             # Uma página por rota (lazy loaded)
├── hooks/             # Custom hooks por domínio
├── lib/               # Clientes, utils, validators
├── stores/            # Zustand
├── types/             # Tipos TypeScript centralizados
└── routes/            # Roteamento com lazy loading

supabase/
├── migrations/        # 0001..0004 (init, profiles/roles, RLS, drop settings)
└── functions/         # cnpja-lookup, apollo-enrich, resend-send, resend-webhook,
                       # chatwoot-test, chatwoot-poll, follow-up-send
```

## 🚀 Como rodar (passo a passo)

Este é um boilerplate open source self-hosted. Siga estes 6 passos para ter sua instância rodando em produção em ~30 minutos. **Não é necessário editar uma única linha de código.**

### 1. Crie um projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Escolha região (recomendado: South America — São Paulo), senha do banco e plano Free.
3. Aguarde o provisionamento (~2 minutos).
4. Anote: **Project URL** e **anon public key** (Project Settings → API).

### 2. Faça fork deste repositório e aplique as migrations

1. Clique em **Fork** no topo desta página.
2. No Dashboard do seu projeto Supabase, abra o **SQL Editor**.
3. Cole e execute, **na ordem**, o conteúdo de cada arquivo da pasta `supabase/migrations/`:
   - `0001_init.sql` — schema base (14 tabelas, RLS, helpers, Realtime)
   - `0002_profiles_and_roles.sql` — `profiles`, enum `user_role`, trigger `handle_new_user`
   - `0003_rls_role_aware.sql` — policies RLS para gestor/operacional
   - `0004_drop_settings_table.sql` — remove BYOK em texto plano
4. Habilite **Realtime** em `Database → Replication → supabase_realtime` para as tabelas: `email_sends`, `batches`, `follow_up_enrollments`, `follow_up_activity_log`.

### 3. Configure as Secrets das Edge Functions

No Dashboard do Supabase, vá em **Project Settings → Edge Functions → Secrets** e adicione:

| Secret | Onde obter | Para que serve |
|---|---|---|
| `CNPJA_API_KEY` | https://cnpja.com (Dashboard → API Keys) | Consulta de CNPJ + quadro societário |
| `APOLLO_API_KEY` | https://app.apollo.io/#/settings/integrations/api | Enriquecimento de sócios (email, LinkedIn, cargo) |
| `RESEND_API_KEY` | https://resend.com/api-keys | Disparo de e-mails transacionais |
| `RESEND_FROM_EMAIL` | (você define) | E-mail remetente usado pelas Edge Functions |
| `RESEND_FROM_NAME` | (você define) | Nome do remetente exibido no inbox |
| `CHATWOOT_URL` | URL base do seu Chatwoot (sem barra final) | Integração com Chatwoot |
| `CHATWOOT_API_TOKEN` | Chatwoot Dashboard → Profile → Access Token | Auth na API do Chatwoot |
| `CHATWOOT_ACCOUNT_ID` | Chatwoot Dashboard (URL inclui o ID) | Conta usada para criar contatos |
| `CHATWOOT_INBOX_ID` | Chatwoot Dashboard → Inboxes | Inbox de e-mail usada |
| `WHATSAPP_LINK` | (você define) | Substitui `{{link_whatsapp}}` nos templates |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pela plataforma Supabase — **não precisam ser configuradas manualmente**.

### 4. Configure auto-deploy de Edge Functions via GitHub Actions

No seu fork do GitHub:

1. Vá em **Settings → Secrets and variables → Actions**.
2. Clique em **New repository secret** e adicione:
   - `SUPABASE_ACCESS_TOKEN` — gere em https://supabase.com/dashboard/account/tokens
   - `SUPABASE_PROJECT_REF` — encontre em **Supabase → Project Settings → General → Reference ID**
3. Vá na aba **Actions** do seu fork e habilite os workflows.
4. Clique em **Deploy Supabase Edge Functions → Run workflow → Run workflow** (botão verde).
5. Aguarde a conclusão (~2 minutos). As 7 Edge Functions serão deployadas automaticamente.

A partir daqui, qualquer push em `main` que altere `supabase/functions/**` redeploya as funções automaticamente.

### 5. Deploy do frontend na Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New → Project → Import** e selecione seu fork.
2. Na tela de configuração, em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` — a Project URL anotada na etapa 1
   - `VITE_SUPABASE_ANON_KEY` — a anon key anotada na etapa 1
   - `VITE_RESEND_FROM_EMAIL` — e-mail remetente padrão exibido nos formulários (opcional)
   - `VITE_RESEND_FROM_NAME` — nome do remetente padrão (opcional)
   - `VITE_WHATSAPP_LINK` — link de WhatsApp default para `{{link_whatsapp}}` (opcional)
3. Clique em **Deploy** e aguarde (~2 minutos).
4. Anote a URL gerada (ex.: `seu-projeto.vercel.app`).

### 6. Crie sua conta de gestor

1. Acesse a URL gerada pela Vercel.
2. Você verá a tela de cadastro.
3. Crie sua conta com e-mail e senha.
4. **O primeiro usuário cadastrado vira `gestor` automaticamente** via trigger `handle_new_user`.
5. Pronto! Você está dentro do dashboard.

Usuários cadastrados depois são criados como `operacional` (vêem apenas os dados que eles mesmos criaram). Para promover/rebaixar, ver seção [Roles & permissões](#roles--permissões).

## 🛠️ Modo dev (avançado)

Para desenvolvimento local com hot reload:

```bash
git clone https://github.com/<seu-usuario>/agentise-leads.git
cd agentise-leads
cp .env.example .env.local
# Edite .env.local preenchendo VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Comandos úteis:

```bash
npm run dev      # Servidor de desenvolvimento (Vite)
npm run build    # Build de produção (tsc -b + vite build)
npm run lint     # ESLint
```

Deploy manual de Edge Functions (alternativa ao GitHub Actions do passo 4):

```bash
supabase link --project-ref <seu-project-ref>
supabase functions deploy cnpja-lookup apollo-enrich resend-send resend-webhook chatwoot-test chatwoot-poll follow-up-send
```

## Roles & permissões

A instância tem dois roles, definidos no enum `public.user_role`:

| Role | Permissões |
|---|---|
| **`gestor`** | Vê e edita todos os dados da instância. Único role que pode promover/rebaixar outros usuários. |
| **`operacional`** | Vê e edita apenas os dados que ele mesmo criou (linhas onde `auth.uid() = user_id`). |

Toda policy RLS segue o padrão `auth.uid() = user_id OR public.is_gestor()` — implementado em `0003_rls_role_aware.sql`.

### Promover/rebaixar manualmente

Não há UI de administração de usuários. O gestor altera roles direto no SQL Editor:

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

1. Habilite as extensões `pg_cron` e `pg_net` no Supabase (**Database → Extensions**).
2. Abra `supabase/migrations/0001_init.sql`, localize o bloco comentado de scheduler ao final do arquivo, descomente, ajuste a `<SUPABASE_URL>` e o `<SERVICE_ROLE_KEY>` e execute no SQL Editor.
3. O polling rodará a cada 60s (intervalo configurável no `cron.schedule`).

Sem `pg_cron`, a remoção automática só acontece quando você invoca a Edge Function manualmente.

## Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md) para padrão de commits, branch model e como abrir PRs.

## Licença

[MIT](./LICENSE) © 2026 Agentise.
