# FASE 5 — Documentação final + DX

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-leads (ProspectOS)
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 4 deve estar commitada.
> Esforço estimado: 1–2h. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 5** da migração — a parte de documentação para usuários que farão fork do repositório. Contexto em `MIGRATION_PLAN.md` e `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

1. `git rev-parse --abbrev-ref HEAD` — `oss-self-hosted`
2. `git status --porcelain` — limpo
3. `git log -1 --oneline` — último commit deve ser `migration(fase4): remove banner de onboarding`
4. Verificar que após a Fase 3 não existe mais `src/pages/SettingsPage.tsx`, e que após a Fase 2 existe `supabase/migrations/0002_profiles_and_roles.sql`.

Se qualquer pré-checagem falhar, **pare** e reporte.

### Escopo desta fase

Reescrever toda a documentação de setup do projeto para o modelo open source self-hosted. Hoje o `README.md` ainda fala de SaaS multi-cliente, da tela `/settings` (que não existe mais) e de `database.sql` (que virou `supabase/migrations/0001_init.sql`). O `.env.example` foi atualizado parcialmente na Fase 3 mas precisa de seção explicativa. O `CLAUDE.md` do projeto (`.claude/CLAUDE.md`) está descrevendo o estado SaaS — atualizar para o estado self-hosted final, mantendo idioma PT-BR. Adicionar `LICENSE` (MIT) e `CONTRIBUTING.md` mínimos.

### Lista de mudanças concretas

#### Migrations SQL a criar
- Nenhuma.

#### Edge Functions a modificar / deletar
- Nenhuma.

#### Arquivos TypeScript a modificar
- Nenhum.

#### Arquivos a modificar

- `README.md` — reescrever inteiramente seguindo este esqueleto (em PT-BR):
  1. **Título + descrição curta** (1 parágrafo): "Boilerplate open source de prospecção outbound B2B. Faça fork, configure `.env`, deploy e tenha sua própria instância de prospecção em Supabase + Vercel."
  2. **Funcionalidades** (bullet list das 4 fases do produto: Consulta CNPJ → Enriquecimento → Campanhas → Follow-up).
  3. **Stack** (1 parágrafo).
  4. **Arquitetura** (árvore resumida de `src/` e `supabase/functions/`).
  5. **Setup self-hosted — passo a passo:**
     - 1. Fork ou clone do repositório
     - 2. `npm install`
     - 3. Criar projeto no Supabase
     - 4. Aplicar migrations: rodar `supabase db push` ou colar `supabase/migrations/0001_init.sql`, `0002_profiles_and_roles.sql`, `0003_rls_role_aware.sql`, `0004_drop_settings_table.sql` no SQL Editor, em ordem
     - 5. Configurar `.env.local` no frontend (apenas `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RESEND_FROM_EMAIL`, `VITE_RESEND_FROM_NAME`, `VITE_WHATSAPP_LINK`)
     - 6. Deploy das Edge Functions: `supabase functions deploy cnpja-lookup apollo-enrich resend-send resend-webhook chatwoot-test chatwoot-poll follow-up-send`
     - 7. Configurar env vars das Edge Functions no Dashboard (Settings > Edge Functions > Environment Variables): `CNPJA_API_KEY`, `APOLLO_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID`, `WHATSAPP_LINK`. Alternativa via CLI: `supabase secrets set CNPJA_API_KEY=...`.
     - 8. Habilitar extensões necessárias no Supabase: `pgcrypto` (já no migration), opcionalmente `pg_cron` + `pg_net` para o polling automático do Chatwoot.
     - 9. Habilitar Realtime nas tabelas `email_sends`, `batches`, `follow_up_enrollments`, `follow_up_activity_log`.
     - 10. Deploy do frontend na Vercel — apontar para o repositório, configurar env vars do frontend, deploy.
     - 11. Primeiro registro: o **primeiro usuário** que se registrar via `/registro` será automaticamente promovido a `gestor` pelo trigger `handle_new_user`. Usuários subsequentes serão `operacional`.
  6. **Roles & permissões:** explicar `gestor` (vê tudo) vs `operacional` (vê apenas o que criou). Documentar que para promover/rebaixar, o gestor precisa rodar SQL manualmente: `UPDATE public.profiles SET role = 'gestor' WHERE id = '<user-uuid>';`.
  7. **Scheduler pg_cron** (Chatwoot polling): seção dedicada com o SQL comentado de `0001_init.sql`, instruções para descomentar e adaptar.
  8. **Comandos**: `npm run dev`, `npm run build`, `npm run lint`.
  9. **Contribuindo**: link para `CONTRIBUTING.md`.
  10. **Licença**: link para `LICENSE`.

- `.env.example` — adicionar seção introdutória em PT-BR explicando os 3 grupos: (a) Supabase (frontend), (b) Defaults de exibição (frontend, não-sensível), (c) Edge Functions (backend, sensível — não vai no .env do frontend, vai como secret no Supabase). Manter as 13 variáveis listadas na Fase 3.

- `.claude/CLAUDE.md` — reescrever a seção "Sobre o Projeto" para refletir o estado self-hosted: substituir "Empresa: Agentise" por "Boilerplate open source mantido pela Agentise"; adicionar parágrafo sobre roles `gestor`/`operacional`; remover qualquer referência a `/settings` UI ou tabela `settings`. Atualizar a seção "Variáveis de Ambiente" para listar as env vars finais (frontend + Edge Functions). Atualizar a seção "Banco de Dados" para apontar para `supabase/migrations/000{1,2,3,4}_*.sql` em vez de `database.sql`. Manter o resto (regras de negócio, idioma PT-BR, design system) intacto.

#### Arquivos a criar

- `LICENSE` — MIT padrão. Copyright `Agentise`, ano `2026`.
- `CONTRIBUTING.md` — minimalista (em PT-BR):
  - Como rodar localmente
  - Padrão de commits (Conventional Commits — `feat:`, `fix:`, `chore:`, `refactor:`)
  - Branch model (`main` produção, `dev` desenvolvimento, feature branches `feat/<nome>`)
  - Como abrir PR (descrever mudança, anexar screenshots se UI, garantir `npm run build` passa)
  - Como reportar issue (template simples: descrição + reprodução + ambiente)

### Ordem de execução recomendada

1. `view README.md` para conferir o estado atual e identificar quais seções reaproveitar.
2. `view .env.example` (após Fase 3) para confirmar o estado.
3. `view .claude/CLAUDE.md` para identificar seções que precisam atualização (idioma, refs a `/settings`, refs a `database.sql`).
4. Reescrever `README.md` (`Write` é mais simples que muitos `Edit`).
5. Editar `.env.example` adicionando comentários introdutórios.
6. Editar `.claude/CLAUDE.md` cirurgicamente (manter o que está bom, atualizar o que mudou).
7. Criar `LICENSE` (MIT padrão).
8. Criar `CONTRIBUTING.md`.
9. `npm run build` — garantir que nada quebrou (não deveria, é só doc, mas o `tsc -b` faz parte do build).
10. Validação (gate abaixo).
11. Commit.

### Restrições

- Não toque em código de domínio.
- Não modifique `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `eslint.config.js`. Configuração de build não muda nesta fase.
- Idioma: **toda** documentação criada/modificada deve estar em PT-BR. `LICENSE` é a única exceção (texto MIT padrão em inglês).
- `CONTRIBUTING.md` deve ser **curto** — máx. 50 linhas. Não criar elaboradíssimas guidelines.
- README final deve caber em ~200–300 linhas. Foco em "como subir uma instância", não tutorial do produto.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.**

#### 1. Testes funcionais
- [ ] `README.md` contém seção "Setup self-hosted — passo a passo" com 11 passos numerados.
- [ ] `README.md` documenta os 2 roles `gestor` e `operacional` e o trigger de "primeiro usuário vira gestor".
- [ ] `README.md` lista todas as 10 env vars de Edge Functions e 5 env vars de frontend.
- [ ] `README.md` aponta para `supabase/migrations/000{1,2,3,4}_*.sql` (não para `database.sql`).
- [ ] `README.md` **não menciona** `/settings`, `useSettings`, `SettingsPage`, `OnboardingBanner`.
- [ ] `LICENSE` existe com texto MIT, copyright "Agentise" e ano "2026".
- [ ] `CONTRIBUTING.md` existe em PT-BR, ≤50 linhas.
- [ ] `.env.example` tem seções comentadas explicando frontend vs Edge Functions.
- [ ] `.claude/CLAUDE.md` atualizado (sem refs a `/settings` ou `database.sql`; menciona roles).

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. (Mudança é só doc, mas o `tsc -b` no script ainda roda.)

#### 3. Testes visuais
- N/A.

#### 4. Testes responsivos
- N/A.

#### 5. Testes de integração
- [ ] `git status` mostra: `README.md` modificado, `.env.example` modificado, `.claude/CLAUDE.md` modificado, `LICENSE` novo, `CONTRIBUTING.md` novo.
- [ ] Nenhum arquivo de código (`src/`, `supabase/functions/`, `supabase/migrations/`) foi modificado nesta fase.

#### 6. Relatório de conclusão
- ✅ ou ❌ por cada item.
- Anexar a contagem de linhas final do `README.md` e do `CONTRIBUTING.md`.
- Confirmar que copyright do `LICENSE` é "Agentise" e ano "2026".

### Commit final

```bash
git add -A
git commit -m "migration(fase5): documentação final + DX

Mudanças principais:
- README.md reescrito para modelo open source self-hosted
- .env.example com seções comentadas (frontend vs Edge Functions)
- .claude/CLAUDE.md atualizado (roles, migrations, sem /settings)
- LICENSE (MIT) adicionado
- CONTRIBUTING.md mínimo adicionado

Refs: MIGRATION_PLAN.md fase 5"
```

Reporte ao usuário e instrua sobre a próxima fase (`migration/FASE-6.prompt.md` — Smoke test manual end-to-end).
