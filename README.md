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

Este projeto é self-hosted. Cada usuário roda própria instância em Supabase + Vercel. Setup completo em ~15 minutos.

### Caminho recomendado: setup interativo via Claude Code

Se você tem [Claude Code](https://claude.com/claude-code) instalado, esse é o caminho mais simples — Claude Code te pergunta cada credencial, valida tudo e configura sua instância sozinho.

1. Crie um projeto novo no Supabase em https://supabase.com/dashboard.
2. Faça fork deste repositório no GitHub.
3. Clone o seu fork localmente: `git clone https://github.com/<seu-usuario>/agentise-leads.git`.
4. Entre na pasta: `cd agentise-leads`.
5. Abra Claude Code: `claude`.
6. Abra o arquivo [`BOOTSTRAP.md`](./BOOTSTRAP.md), copie a partir de "Prompt para Claude Code", e cole na sessão.
7. Responda às perguntas — Claude Code aplica migrations, deploya as 7 Edge Functions, configura secrets via Management API e cria seu gestor.
8. Quando terminar, faça deploy do frontend na Vercel preenchendo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Claude Code te lembra desses valores no relatório final).
9. Acesse a URL gerada pela Vercel e faça login com o gestor criado.

Veja [`BOOTSTRAP.md`](./BOOTSTRAP.md) para o prompt completo.

### Caminho manual (sem Claude Code)

Se prefere fazer tudo no terminal:

```bash
git clone https://github.com/<seu-usuario>/agentise-leads.git
cd agentise-leads
cp .env.example .env
# Edite .env preenchendo VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
# SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF (veja comentários no arquivo)
npm install

# Linkar e aplicar migrations
supabase link --project-ref <seu-project-ref>
supabase db push

# Deploy de Edge Functions
supabase functions deploy cnpja-lookup apollo-enrich resend-send resend-webhook chatwoot-test chatwoot-poll follow-up-send
```

Configure as secrets das Edge Functions manualmente em **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (lista no `.env.example` grupo "Edge Functions Secrets"). Habilite **Realtime** em `Database → Replication → supabase_realtime` para `email_sends`, `batches`, `follow_up_enrollments`, `follow_up_activity_log`.

Deploy do frontend na Vercel: import do fork, preencha as `VITE_*` em **Environment Variables** e Deploy.

Crie sua conta de gestor acessando a URL deployada e cadastrando-se na tela de registro — o primeiro usuário vira `gestor` automaticamente via trigger `handle_new_user`.

### Modo dev local

```bash
cp .env.example .env.local
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção (tsc -b + vite build)
npm run lint     # ESLint
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
