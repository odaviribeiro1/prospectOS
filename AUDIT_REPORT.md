# Audit Report — agentise-leads (ProspectOS)

> Auditoria de viabilidade de migração SaaS → Open Source Self-Hosted.
> Gerado em 2026-04-30.

## 1. Inventário

- **Stack**: React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS 4 + shadcn/ui (Radix) + Supabase (Auth/PG/Edge Functions/Realtime) + TanStack Query 5 + Zustand 5 + React Router v6 + React Hook Form + Zod + Sonner.
- **Migrations**: **0 arquivos versionados em `supabase/migrations/`** — schema único em `database.sql` na raiz (658 linhas, idempotente via `CREATE IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`, `DROP POLICY IF EXISTS`).
- **Edge Functions**: 7 — `cnpja-lookup`, `apollo-enrich`, `resend-send`, `resend-webhook`, `chatwoot-test`, `chatwoot-poll`, `follow-up-send`.
- **Possui CLAUDE.md**: sim (em `.claude/CLAUDE.md`, descreve stack/regras de negócio).
- **Possui README útil**: sim — atualizado, com setup local, deploy, lista de Edge Functions e scheduler pg_cron.
- **Frontend**: 96 arquivos `.ts`/`.tsx`, ~8.4k linhas. 16 páginas, 12 hooks de domínio, 1 store Zustand (UI/batch/enrichment local), `src/types/index.ts` único e tipado a mão (não gerado do Supabase).
- **`.env.example`**: presente, apenas Supabase URL + anon key (correto — keys de integração ficam no banco).
- **`vercel.json`**: rewrites SPA + headers de segurança (X-Frame-Options, nosniff, Permissions-Policy).

## 2. Acoplamento SaaS detectado

### A. Multi-tenancy no banco
- Tabelas com `tenant_id`: **0**
- Tabela `tenants` / `workspaces` / `organizations`: **inexistente**
- Policies RLS com tenant: **0** (todas usam `auth.uid() = user_id`)
- Auth Hook customizado: **não**
- Coluna `user_id UUID REFERENCES auth.users` em **14 de 14 tabelas** — isolamento é **per-user**, não per-tenant.

### B. Multi-tenancy no frontend
- Ocorrências de `tenant_id` / `tenantId`: **0**
- Hooks/contextos `TenantContext`, `TenantProvider`, `useTenant`: **inexistentes**
- Lógica de subdomínio (`hostname.split`, `window.location.hostname`, `subdomain`, `slug`): **0 ocorrências**

### C. White-label / branding dinâmico
- Variáveis `--brand-primary` / `--brand-secondary`, colunas `logo_url` / `primary_color` / `custom_domain`, componentes de branding dinâmico: **0 ocorrências**.
- Tema é estático: dark mode (HSL) definido em `src/index.css` via `:root` + `.dark`. Cores Agentise (azul `211 75% 52%`, sidebar azul-marinho `213 54% 15%`) já são fixas.

### D. Billing
- Stripe / checkout / subscription / pricing / planos / seats: **0 ocorrências reais**.
- Único hit em `subscription` é `supabase.auth.onAuthStateChange` (`AppLayout.tsx:17`), não billing.
- Edge Functions de billing (`stripe-webhook`, `create-checkout`): **inexistentes**.

### E. BYOK (keys cifradas)
- `pgp_sym_encrypt` / `pgp_sym_decrypt` / `vault.*` / `encrypted_keys` / AES-GCM: **0 uso real**. `pgcrypto` é instalado (linha 9 de `database.sql`) apenas para `gen_random_uuid()`.
- Existe **BYOK simples não-cifrado**: tabela `settings` com colunas `cnpja_api_key`, `apollo_api_key`, `resend_api_key`, `chatwoot_api_token` em texto plano, configuradas pela tela `/settings` por usuário.

### F. Onboarding wizard
- Rotas `/onboarding`, `/setup`, `/wizard`: **inexistentes**.
- Componente `OnboardingBanner` (`src/components/dashboard/OnboardingBanner.tsx`) + hook `useOnboarding` — é apenas um **checklist no dashboard** (configurar API keys, fazer primeira consulta, primeira lista, primeira campanha) com flag `localStorage agentise_onboarding_dismissed`. Não é wizard de tenant.

### G. Roles existentes
- Nenhum enum de role. Nenhuma coluna `role` em tabela. Nenhum `super_admin`/`admin`/`gestor`/`vendedor`/`member`/`editor`/`viewer`.
- Modelo de permissão é binário: usuário autenticado vê apenas suas próprias linhas via `auth.uid() = user_id`.

## 3. Domínio nuclear

- **Descrição**: prospecção outbound B2B em pipeline linear — consulta de CNPJ em lote → qualificação por filtros (regime tributário + porte) → enriquecimento de sócios via Apollo.io → revisão manual → campanhas de e-mail via Resend → sequências de follow-up com remoção automática por label `resposta_negativa` no Chatwoot.
- **Entidades centrais** (5):
  1. `batches` + `companies` + `partners` (consulta CNPJ e quadro societário)
  2. `lead_lists` + `enriched_leads` (resultados do Apollo)
  3. `email_campaigns` + `email_sends` (outreach)
  4. `follow_up_sequences` + `follow_up_steps` + `follow_up_enrollments` + `follow_up_sends` (follow-up)
  5. `settings` (BYOK + configuração de integrações)
- **Edge Functions de domínio (todas)**: `cnpja-lookup`, `apollo-enrich`, `resend-send`, `resend-webhook`, `chatwoot-test`, `chatwoot-poll`, `follow-up-send`. Nenhuma é "casca SaaS" (billing/onboarding/tenant).
- **Telas de domínio (todas)**: `MetricasPage`, `ConsultaPage`, `EmpresasPage`, `ListasPage`, `LeadReviewPage`, `CampanhasPage`, `CampaignCreatePage`, `CampaignDetailPage`, `FollowUpsPage`, `NovaSequenciaPage`, `SequenciaDetalhePage`, `SettingsPage` (BYOK), `ProfilePage`, `LoginPage`, `RegisterPage`. **Não existe** página de billing, planos, organização, members, white-label.

## 4. Esforço estimado de migração

| Item | Nível | Justificativa |
|---|---|---|
| Remover `tenant_id` de tabelas e RLS | **Trivial** | Não existe — nada a remover. |
| Consolidar roles em 2 (gestor/operacional) | **Médio** | Não existe role hoje; **adicionar** tabela `profiles` com enum `role`, trigger `handle_new_user` que faz primeiro registrado virar `gestor`, e refatorar 14 policies RLS para `auth.uid() = user_id OR is_gestor()`. |
| Remover subdomínio + resolução de tenant | **Trivial** | Não existe — nada a remover. |
| Remover branding dinâmico | **Trivial** | Não existe — tema dark Agentise já é fixo no CSS. |
| Remover billing | **Trivial** | Não existe — nada a remover. |
| Remover BYOK e mover keys pra `.env` | **Médio** | Apagar colunas `*_api_key` / `*_api_token` da tabela `settings` (ou apagar a tabela e mover `whatsapp_link`/`negative_response_polling_interval` para outra), reescrever 7 Edge Functions para ler `Deno.env.get('CNPJA_API_KEY')` etc., apagar `SettingsPage` + `ApiKeyField` + `ConnectionTest` + `useSettings`, atualizar `.env.example`. |
| Remover onboarding wizard | **Baixo** | Apagar `OnboardingBanner` + `useOnboarding` + import em `MetricasPage` (3 arquivos). |
| Schema isolado com nome próprio | **Baixo** | Renomear `public` → `prospectos` (ou similar) em `database.sql` + ajustar referências, ou manter `public` e renomear apenas o nome do projeto Supabase. Trivial se mantiver `public`. |
| Testes pós-migração | **Médio** | Cobertura de testes existente: **zero** (não há `*.test.ts`, sem Vitest/Jest configurado). Validação obrigatoriamente manual: login → settings (agora vazio) → consulta → enriquecimento → campanha → follow-up. |
| Limpeza de debug (`console.log` da anon key em `src/lib/supabase.ts:5-6`) | **Trivial** | 2 linhas. |
| Consolidar `database.sql` em `supabase/migrations/0001_init.sql` | **Baixo** | Mover arquivo, remover bloco final duplicado de `get_dashboard_data` (linhas 632–658, redefinição idêntica da função das linhas 531–561). |

**Total estimado: 10–16 horas** (uma a duas sessões de Claude Code). Bem abaixo do limiar de 60h.

## 5. Qualidade do código existente

| Critério | Nota (1-5) |
|---|---|
| Tipagem TypeScript (strict, zero `any`, zero `as any`, types em `src/types/index.ts`) | **5** |
| Organização de pastas (componentes/hooks/páginas/lib/types/stores por domínio) | **5** |
| Idempotência de migrations (único `database.sql` com `IF NOT EXISTS` e `DROP POLICY IF EXISTS`, mas tem 1 bloco duplicado) | **3** |
| Tratamento de erro nas Edge Functions (consistente: `try/catch` global, CORS uniforme, validação de JWT idêntica em todas) | **4** |
| Aderência ao design system Agentise (dark fixo, HSL CSS vars, paleta azul `211 75% 52%`, sidebar `213 54% 15%`) | **5** |
| Documentação (README atualizado, CLAUDE.md detalhado, PRD em `docs/PRD.md` com 33k+ caracteres) | **5** |
| Dívidas técnicas (zero `TODO`/`FIXME`/`HACK`/`XXX`, dois `console.log` de debug em `src/lib/supabase.ts`) | **4** |

**Média: 4.43 / 5** — qualidade alta.

## 6. Recomendação final

**Decisão: MIGRAR**

**Justificativa em 4 frases:**
Este projeto **nunca foi um SaaS multi-tenant**. Não há `tenant_id`, `tenants`, subdomínio, white-label dinâmico, billing, BYOK cifrado nem wizard de onboarding de tenant — o isolamento é simplesmente per-`user_id`. O único trabalho real de migração é (a) trocar BYOK por `.env` em ~7 Edge Functions, (b) opcionalmente adicionar 2 roles via tabela `profiles` + trigger de primeiro-registrado, e (c) remover o banner de onboarding. A qualidade do código (4.43/5), a aderência ao design Agentise dark e a estrutura limpa tornam reescrever do zero um desperdício — o esforço (10–16h) é uma fração do que custaria reconstruir 14 tabelas, 7 Edge Functions e 16 páginas.

**Sequência sugerida de fases:**

1. **Faxina técnica (1h)** — remover `console.log("URL"/"KEY")` de `src/lib/supabase.ts`; mover `database.sql` para `supabase/migrations/0001_init.sql`; remover redefinição duplicada de `get_dashboard_data` (linhas 632–658).
2. **Roles 2-níveis (3–4h)** — criar tabela `profiles (id uuid PK → auth.users, role text check (role in ('gestor','operacional')) default 'operacional')`. Adicionar trigger `on_auth_user_created` que faz o primeiro registrado virar `gestor`. Criar helper SQL `is_gestor()` (`SECURITY DEFINER`). Reescrever 14 policies RLS para `auth.uid() = user_id OR is_gestor()`. Adicionar UI mínima em `ProfilePage` mostrando role atual.
3. **Mover BYOK → `.env` (4–5h)** — adicionar `CNPJA_API_KEY`, `APOLLO_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID`, `WHATSAPP_LINK` em `.env.example`. Reescrever 7 Edge Functions para `Deno.env.get(...)`. Apagar tabela `settings` (ou reduzí-la a `negative_response_polling_interval` global). Apagar `SettingsPage`, `ApiKeyField`, `ConnectionTest`, `useSettings`, schema Zod `settingsSchema`. Remover rota `/settings` do `routes/index.tsx` e do menu lateral.
4. **Limpeza do onboarding banner (30min)** — apagar `OnboardingBanner.tsx`, `useOnboarding.ts`, e remover bloco condicional em `MetricasPage.tsx:51-52`.
5. **Atualizar README + CLAUDE.md + PRD (1–2h)** — refletir modelo self-hosted: setup é `git clone` + `cp .env.example .env` + cole `database.sql` no SQL Editor + `supabase functions deploy --all` + `vercel deploy`.
6. **QA manual end-to-end (1–2h)** — fluxo completo: registro → primeiro usuário vira gestor → segundo usuário vira operacional → consulta CNPJ → enriquecimento → revisão → campanha de e-mail → sequência de follow-up.

## 7. Observações livres

- **Inversão da premissa do prompt**: o prompt assume que o repositório é um SaaS multi-tenant carregando "casca" pesada. Este repositório **já é praticamente self-hosted single-tenant** — o projeto SaaS multi-tenant descrito em `~/.claude/CLAUDE.md` (Content Hub, white-label, workspaces, BYOK cifrado via Vault, wizard de 7 steps) é **outro projeto** (provavelmente outra pasta, Content Hub). Não confundir os dois durante a migração.
- **`user_id` ≠ tenant_id**: o `user_id` aqui significa "usuário individual dono dos dados", não "tenant". Em uma instância self-hosted com 2 roles, faz sentido manter `user_id` como FK para `auth.users` (rastreamento de quem criou) mas a RLS deve permitir que `gestor` veja tudo, não só o que ele criou. Decisão de produto: o operacional vê apenas seus próprios leads (modelo atual) ou vê todos os leads da instância? A resposta muda as policies RLS — recomendo confirmar com o stakeholder antes da fase 2.
- **`database.sql` na raiz vs `supabase/migrations/`**: hoje só existe `supabase/.temp/` e `supabase/functions/` — a pasta `migrations` não existe. O fluxo "cole no SQL Editor" funciona, mas é frágil (sem `supabase db push`, sem versionamento incremental). Recomendo migrar para o fluxo nativo do Supabase CLI durante a Fase 1.
- **Redefinição duplicada**: `get_dashboard_data` está definida duas vezes em `database.sql` (linhas 531–561 e 632–658) — exatamente o mesmo corpo. Não é bug funcional (a segunda sobrescreve a primeira via `CREATE OR REPLACE`), mas é dívida que delata edição manual sem cleanup.
- **Console leak**: `src/lib/supabase.ts:5-6` imprime `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no console em produção. Anon key é pública (não é leak crítico), mas deve ser removido antes de empacotar o open source — usuários técnicos vão notar e reportar como issue.
- **Realtime habilitado** em `email_sends`, `batches`, `follow_up_enrollments`, `follow_up_activity_log` (database.sql:566-569). Funciona em self-hosted desde que o cliente habilite realtime no projeto Supabase dele — vale documentar no README.
- **pg_cron + pg_net**: scheduler para `chatwoot-poll` está comentado em `database.sql:604-625` aguardando o usuário descomentar. Para o boilerplate self-hosted, vale criar um script CLI (`npm run setup:cron`) que automatiza, ou pelo menos uma seção dedicada no README com aviso de que polling de Chatwoot só funciona se pg_cron for habilitado no Supabase do cliente.
- **Sem testes**: zero arquivos `.test.ts`/`.spec.ts`, Vitest não configurado. Não é bloqueador para a migração (escopo pequeno), mas vale recomendar adicionar testes de smoke nas Edge Functions críticas após a migração.
