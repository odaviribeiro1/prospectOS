# FASE 6 — Smoke test manual end-to-end

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-leads (ProspectOS)
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 5 deve estar commitada.
> Esforço estimado: 1–2h. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **última fase** da migração — validação manual end-to-end. Esta fase **não modifica código**; ela executa um roteiro de teste e registra os resultados. Contexto em `MIGRATION_PLAN.md` e `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

1. `git rev-parse --abbrev-ref HEAD` — `oss-self-hosted`
2. `git status --porcelain` — limpo
3. `git log -1 --oneline` — último commit deve ser `migration(fase5): documentação final + DX`
4. Confirmar que existem 4 migrations em `supabase/migrations/` (`0001_init.sql`, `0002_profiles_and_roles.sql`, `0003_rls_role_aware.sql`, `0004_drop_settings_table.sql`).
5. Confirmar que `src/pages/SettingsPage.tsx`, `src/hooks/useSettings.ts`, `src/components/dashboard/OnboardingBanner.tsx`, `src/hooks/useOnboarding.ts` **não existem**.
6. Confirmar que `.claude/CLAUDE.md`, `README.md`, `LICENSE`, `CONTRIBUTING.md`, `.env.example` foram atualizados na Fase 5.

Se qualquer pré-checagem falhar, **pare** e reporte.

### Escopo desta fase

Smoke test manual de todos os fluxos críticos do domínio nuclear, **executado pelo usuário em ambiente real** (Supabase + servidor de dev local). Você (Claude) gera um roteiro detalhado em `migration/SMOKE_TEST_REPORT.md`, executa apenas as etapas estáticas (lint, build, verificação de arquivos), e instrui o usuário a executar as etapas que requerem browser/banco real. Ao final, atualiza o `MIGRATION_PLAN.md` marcando todas as fases como `✅ Concluída` se o usuário reportar sucesso.

### Lista de mudanças concretas

#### Migrations / Edge Functions / Código
- Nenhuma. Esta fase é puramente verificação.

#### Arquivos a criar
- `migration/SMOKE_TEST_REPORT.md` — checklist do smoke test, com seções para o usuário marcar e anexar evidências (screenshots/logs).

#### Arquivos a modificar
- `MIGRATION_PLAN.md` — atualizar a tabela de fases marcando todas como `✅ Concluída` **somente após** o usuário reportar smoke test com sucesso.

### Roteiro de smoke test (a entrar em `migration/SMOKE_TEST_REPORT.md`)

#### Etapa A — Validação estática (você, Claude, executa)

1. `npm run build` — compilação sem erro.
2. `grep -rn "from('settings')\|from(\"settings\")" src/ supabase/` — vazio.
3. `grep -rn "tenant_id\|tenantId\|TenantContext\|useSettings\|OnboardingBanner\|useOnboarding" src/ supabase/` — vazio.
4. `grep -rn "console.log" src/lib/supabase.ts` — vazio.
5. `ls supabase/migrations/` — exatamente 4 arquivos.
6. `ls src/pages/SettingsPage.tsx src/hooks/useSettings.ts src/components/dashboard/OnboardingBanner.tsx src/hooks/useOnboarding.ts 2>/dev/null` — todos ausentes.
7. `grep -c "is_gestor()" supabase/migrations/0003_rls_role_aware.sql` — ≥ 14.
8. `grep "Deno.env.get" supabase/functions/*/index.ts | wc -l` — ≥ 6 (uma chave por função, ou mais).
9. `git log --oneline | head -10` — últimos 6 commits seguem padrão `migration(faseN):`.

#### Etapa B — Setup do ambiente (usuário executa)

10. Criar projeto novo no Supabase (ou usar um descartável dedicado a este teste).
11. Aplicar as 4 migrations em ordem via SQL Editor ou `supabase db push`.
12. Configurar env vars no Dashboard (Settings > Edge Functions): `CNPJA_API_KEY`, `APOLLO_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID`, `WHATSAPP_LINK`.
13. Deploy das 7 Edge Functions: `supabase functions deploy cnpja-lookup apollo-enrich resend-send resend-webhook chatwoot-test chatwoot-poll follow-up-send`.
14. `cp .env.example .env.local` e preencher `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RESEND_FROM_EMAIL`, `VITE_RESEND_FROM_NAME`, `VITE_WHATSAPP_LINK`.
15. `npm run dev` em outra aba — servidor local em `http://localhost:5173`.

#### Etapa C — Teste de roles (usuário executa)

16. Acessar `/registro` e criar **primeiro usuário** (`gestor1@test.com`). Após login, navegar para `/perfil` — confirmar que aparece "Seu papel: **Gestor**".
17. Logout. Acessar `/registro` e criar **segundo usuário** (`operador1@test.com`). Após login, navegar para `/perfil` — confirmar "Seu papel: **Operacional**".
18. Validar SQL: rodar no SQL Editor `SELECT id, role FROM public.profiles ORDER BY created_at;` — deve mostrar 2 linhas, primeira com `gestor`, segunda com `operacional`.

#### Etapa D — Pipeline de domínio com role `operacional` (usuário executa)

Logado como `operador1`:

19. `/consulta` — colar 2 CNPJs válidos (ex: `00.000.000/0001-91` Banco do Brasil, `33.000.167/0001-01` Petrobras), aplicar filtros padrão (Simples, Lucro Presumido, ME, EPP, Médio), criar batch.
20. `/empresas` — esperar processamento (Realtime atualizando), confirmar que as 2 empresas aparecem com seus dados da CNPJá.
21. Selecionar 1 empresa qualificada → enriquecer via Apollo. Esperar conclusão.
22. `/listas` — abrir a lista recém-criada (`#1 Leads Enriquecidos - DD/MM/YY HH:mm`). Aprovar 1 lead, rejeitar outro.
23. `/campanhas` → "Nova campanha" — selecionar a lista, preencher subject e body com `{{nome}}` e `{{empresa}}`, **enviar** (clicar em enviar — manual, conforme regra de negócio).
24. Esperar webhook do Resend atualizar o status para `delivered` (Realtime). Verificar em `/campanhas/:id`.
25. `/follow-ups` → "Nova sequência" — criar sequência com 1 step (delay 1h, condition `no_reply`). Inscrever o lead aprovado na sequência.

#### Etapa E — Visibilidade do `gestor` (usuário executa)

26. Logout do `operador1`. Login como `gestor1`.
27. `/empresas` — confirmar que **vê as empresas que `operador1` criou** (RLS com `is_gestor()` funcionando).
28. `/listas` — confirmar que vê a lista do operador.
29. `/campanhas` — confirmar que vê a campanha enviada.
30. `/follow-ups` — confirmar que vê a sequência e o enrollment.

#### Etapa F — Edge Functions com env vars (usuário executa)

31. Confirmar nos logs do Supabase Functions que `cnpja-lookup`, `apollo-enrich`, `resend-send` foram invocadas com sucesso (status 200).
32. Confirmar que **nenhum log mostra `from('settings')`** ou tentativa de leitura da tabela inexistente.
33. (Opcional) Forçar erro removendo `RESEND_API_KEY` temporariamente — confirmar que `resend-send` retorna 500 com mensagem PT-BR clara, e o frontend exibe toast de erro amigável.

#### Etapa G — Encerramento

34. Usuário reporta resultado completo: ✅ ou ❌ por cada item das etapas A–F.
35. Você (Claude) atualiza `MIGRATION_PLAN.md` marcando as fases 1–6 como `✅ Concluída`.
36. Você (Claude) faz commit final.

### Restrições

- Não execute as etapas B–F você mesmo. Elas requerem browser, banco real, deploy de Edge Function — todas fora do que sessões de Claude Code devem fazer sem aprovação caso a caso.
- Apenas execute a Etapa A (validação estática) com `bash_tool`.
- Não modifique código nesta fase. Se durante a etapa A você encontrar regressão, **pare** e reporte ao usuário; **não** crie commits de "correção" aqui — eles iriam contra o ponto da fase de smoke test (que é validar o estado do final da Fase 5).
- Se o smoke test exigir correções, criar uma fase 5.5 ou 7 separada, conduzida em sessão à parte.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.**

#### 1. Etapa A executada por Claude
- [ ] `npm run build` sem erro.
- [ ] Todos os 9 greps/checks da Etapa A com resultado esperado.
- [ ] `migration/SMOKE_TEST_REPORT.md` criado com o roteiro completo das etapas A–G.

#### 2. Etapas B–F reportadas pelo usuário
- [ ] Usuário cola no chat o resultado de cada item (Etapa B–F). Aguarde antes de prosseguir.
- [ ] Etapa C (roles): primeiro usuário virou `gestor`, segundo virou `operacional`. Confirmado via SQL.
- [ ] Etapa D (pipeline operacional): batch → enriquecimento → lista → campanha → follow-up. Todos os passos completaram.
- [ ] Etapa E (gestor vê tudo): RLS com `is_gestor()` validada com olho real.
- [ ] Etapa F (Edge Functions): nenhuma referência a `settings` em logs. Erro forçado retorna mensagem PT-BR.

#### 3. Atualização do MIGRATION_PLAN.md
- [ ] Após sucesso reportado, marcar todas as fases (1–6) como `✅ Concluída` na tabela.
- [ ] Adicionar nota final ao `MIGRATION_PLAN.md` com data de conclusão.

#### 4. Commit final
- [ ] Commit feito com mensagem `migration(fase6): smoke test e&e concluído`.

### Commit final

```bash
git add -A
git commit -m "migration(fase6): smoke test e2e concluído

Mudanças principais:
- migration/SMOKE_TEST_REPORT.md com roteiro e resultados
- MIGRATION_PLAN.md: todas as fases marcadas como concluídas
- Migração SaaS → Open Source Self-Hosted finalizada

Refs: MIGRATION_PLAN.md fase 6"
```

Após o commit, reporte ao usuário:
- ✅ Migração concluída.
- Próximos passos sugeridos (não obrigatórios nesta sessão): merge de `oss-self-hosted` em `main`, `git tag v1-self-hosted`, push do repo.
