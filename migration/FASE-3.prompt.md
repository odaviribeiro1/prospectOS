# FASE 3 — Remover BYOK e mover keys para `.env`

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-leads (ProspectOS)
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 2 deve estar commitada.
> Esforço estimado: 4–5h. Risco: Médio.

---

## Prompt para Claude Code

Você está executando a **Fase 3** da migração — a mais pesada. Contexto em `MIGRATION_PLAN.md` e levantamento original em `AUDIT_REPORT.md` seção 2.E.

### Pré-checagem obrigatória

1. `git rev-parse --abbrev-ref HEAD` — `oss-self-hosted`
2. `git status --porcelain` — limpo
3. `git log -1 --oneline` — último commit deve ser `migration(fase2): adiciona roles gestor/operacional`
4. Confirmar que `supabase/migrations/0002_profiles_and_roles.sql` e `0003_rls_role_aware.sql` existem.
5. `view AUDIT_REPORT.md` — releia seção 2.E (BYOK) e seção 4 (esforço de remover BYOK).
6. `view MIGRATION_PLAN.md` — releia "Decisão sobre `settings` table" em "Observações específicas deste projeto".

Se qualquer pré-checagem falhar, **pare** e reporte.

### Escopo desta fase

Hoje cada usuário insere suas API keys via `/settings` UI, que persiste plaintext na tabela `settings` (colunas `cnpja_api_key`, `apollo_api_key`, `resend_api_key`, `chatwoot_api_token`, etc.). As 6 Edge Functions de domínio buscam essas keys do banco para chamar APIs externas. No modelo open source self-hosted, **uma instância = um cliente**, então as keys vão para variáveis de ambiente das Edge Functions, configuradas via `supabase secrets set` ou no Dashboard. A tabela `settings` é dropada inteira; a tela `/settings` e seus componentes são removidos; as 6 Edge Functions passam a ler `Deno.env.get('CNPJA_API_KEY')`, etc. Páginas que liam `settings.resend_from_email`, `settings.whatsapp_link` etc. precisam ler de outra fonte — recebem essas variáveis também do `.env` do frontend (com prefixo `VITE_`) **apenas para os campos não-sensíveis** (from_email, from_name, whatsapp_link); as API keys propriamente ditas não vão para o frontend.

**Decisão de produto consolidada**: a tabela `settings` é dropada inteira. Não há configuração runtime sobrando — tudo vai para `.env`.

### Lista de mudanças concretas

#### Migrations SQL a criar
- `supabase/migrations/0004_drop_settings_table.sql` — conteúdo:
  - `DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;`
  - `DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;`
  - `DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;`
  - `DROP TRIGGER IF EXISTS set_updated_at_settings ON public.settings;`
  - `DROP TABLE IF EXISTS public.settings CASCADE;`
  - Comentário no topo explicando que API keys foram movidas para `.env` das Edge Functions.

#### Edge Functions a modificar

Para cada uma das 6 funções abaixo, **substituir** o trecho que faz `supabase.from('settings').select(...).eq('user_id', user.id).single()` por leitura direta de `Deno.env.get(...)`. Manter a validação de JWT (`auth.getUser`) intacta.

- `supabase/functions/cnpja-lookup/index.ts` — usar `Deno.env.get('CNPJA_API_KEY')`. Se ausente, retornar 500 com mensagem clara em PT-BR ("CNPJA_API_KEY não configurada nas variáveis de ambiente da Edge Function").
- `supabase/functions/apollo-enrich/index.ts` — usar `Deno.env.get('APOLLO_API_KEY')`.
- `supabase/functions/resend-send/index.ts` — usar `Deno.env.get('RESEND_API_KEY')`, `Deno.env.get('RESEND_FROM_EMAIL')`, `Deno.env.get('RESEND_FROM_NAME')`.
- `supabase/functions/chatwoot-test/index.ts` — usar `Deno.env.get('CHATWOOT_URL')`, `Deno.env.get('CHATWOOT_API_TOKEN')`.
- `supabase/functions/chatwoot-poll/index.ts` — usar `CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`. **Atenção**: hoje a função itera sobre `settings` para encontrar usuários com Chatwoot configurado. No modelo self-hosted, há uma única configuração — a função processa todos os enrollments ativos da instância sem precisar agrupar por user. Reescrever esse loop.
- `supabase/functions/follow-up-send/index.ts` — usar `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` (e `WHATSAPP_LINK` se a função renderizar templates com `{{link_whatsapp}}`).

#### Edge Functions a deletar
- Nenhuma (todas continuam, só mudam de fonte de credencial).

#### Arquivos TypeScript a modificar

- `src/lib/validators.ts` — remover `settingsSchema` e o tipo `SettingsForm`.
- `src/components/layout/Sidebar.tsx` — remover entrada `{ icon: Settings, label: 'Configurações', path: '/settings' }` (linha ~29). Remover import `Settings` do lucide-react se ficar órfão. Remover bloco de "Status das integrações" (linhas ~88–91 e o componente que as renderiza, se for específico). Remover import e uso de `useSettings` e `navigate('/settings')`.
- `src/pages/EmpresasPage.tsx` — remover import `useSettings` (linha 19) e uso na linha 47. Se `settings` era usado para gating UX (ex: "configure Apollo antes de enriquecer"), substituir por instrução genérica em PT-BR ("Configure APOLLO_API_KEY no .env das Edge Functions") — mas idealmente apenas remover a verificação, já que no modelo self-hosted a key é responsabilidade do operador da instância.
- `src/pages/ConsultaPage.tsx` — remover import `useSettings` (linha 16) e uso na linha 22. Mesma orientação acima.
- `src/pages/CampaignCreatePage.tsx` — remover import `useSettings` (linha 21) e uso nas linhas 30, 67–69. Os defaults `from_name`, `from_email`, `whatsapp_link` que vinham de `settings` devem agora vir de `import.meta.env.VITE_RESEND_FROM_NAME`, `VITE_RESEND_FROM_EMAIL`, `VITE_WHATSAPP_LINK` (com fallback para string vazia se não definidos). Esses 3 são considerados não-sensíveis (apenas configuração de exibição) e podem ir para o frontend.
- `src/routes/index.tsx` — remover a linha `{ path: 'settings', element: <LazyRoute element={<SettingsPage />} /> }` e o `lazy(() => import('../pages/SettingsPage')...)`.
- `src/hooks/useOnboarding.ts` — remover dependência de `settings` (será reescrito mais a fundo na Fase 4; nesta fase, basta remover a query de `from('settings')` e os campos `hasApiKeys`/`hasResend`/`hasChatwoot`, mantendo apenas `hasFirstBatch`/`hasFirstList`/`hasFirstCampaign`. A Fase 4 deletará o hook inteiro).

#### Arquivos TypeScript a deletar
- `src/pages/SettingsPage.tsx`
- `src/hooks/useSettings.ts`
- `src/components/settings/ApiKeyField.tsx`
- `src/components/settings/ConnectionTest.tsx`
- (Se a pasta `src/components/settings/` ficar vazia, deletar a pasta também.)

#### Tipos a atualizar
- `src/types/index.ts` — remover a interface `Settings` (linhas ~20–37). Manter o restante intacto.

#### Outros artefatos
- `.env.example` — adicionar bloco de variáveis para Edge Functions (comentadas, com exemplo):
  ```
  # ============================================================
  # Edge Functions — configure no Dashboard do Supabase
  # (Settings > Edge Functions > Environment Variables)
  # ou via: supabase secrets set CNPJA_API_KEY=...
  # ============================================================
  # CNPJA_API_KEY=
  # APOLLO_API_KEY=
  # RESEND_API_KEY=
  # RESEND_FROM_EMAIL=
  # RESEND_FROM_NAME=
  # CHATWOOT_URL=
  # CHATWOOT_API_TOKEN=
  # CHATWOOT_ACCOUNT_ID=
  # CHATWOOT_INBOX_ID=
  # WHATSAPP_LINK=
  ```
- `.env.example` — adicionar bloco para o frontend (não-sensíveis):
  ```
  # ============================================================
  # Frontend (não-sensíveis) — usados como defaults na UI
  # ============================================================
  VITE_RESEND_FROM_EMAIL=
  VITE_RESEND_FROM_NAME=
  VITE_WHATSAPP_LINK=
  ```

### Ordem de execução recomendada

1. Criar `supabase/migrations/0004_drop_settings_table.sql`.
2. Atualizar `.env.example` com os 2 blocos novos.
3. Refatorar Edge Functions, uma por vez, validando que o `Deno.env.get` substitui exatamente onde `settings` era lido. Sequência sugerida: `cnpja-lookup` → `apollo-enrich` → `resend-send` → `chatwoot-test` → `follow-up-send` → `chatwoot-poll` (último porque é o mais complexo, com loop sobre usuários a ser reescrito).
4. Remover `settingsSchema` de `src/lib/validators.ts`.
5. Editar `src/components/layout/Sidebar.tsx` (remover item de menu, remover bloco de status, remover import e uso de `useSettings`).
6. Editar `src/pages/EmpresasPage.tsx` (remover import e uso).
7. Editar `src/pages/ConsultaPage.tsx` (remover import e uso).
8. Editar `src/pages/CampaignCreatePage.tsx` (substituir `settings.*` por `import.meta.env.VITE_*` com fallback).
9. Editar `src/routes/index.tsx` (remover rota e lazy import).
10. Editar `src/hooks/useOnboarding.ts` (remover query de `from('settings')` e campos correlatos).
11. Editar `src/types/index.ts` (remover interface `Settings`).
12. Deletar `src/pages/SettingsPage.tsx`, `src/hooks/useSettings.ts`, `src/components/settings/ApiKeyField.tsx`, `src/components/settings/ConnectionTest.tsx`. Verificar se a pasta `src/components/settings/` ficou vazia; se sim, removê-la.
13. Rodar `npm run build` e iterar até zero erros TypeScript.
14. Validação (gate abaixo).
15. Commit.

### Restrições

- **Não execute nenhuma migration ou deploy de Edge Function** nesta sessão. Apenas edite arquivos.
- Não toque em nenhum arquivo fora da lista acima. Em particular: hooks de domínio (`useBatch`, `useCampaigns`, `useLeadLists`, `useEnrichment`, `useEmailSends`, `useEnrollments`, `useSequences`, `useDashboard`, `useActivityLog`, `useCompanies`, `useProfile`) **não devem ser modificados** — eles operam em tabelas de domínio que não foram afetadas.
- Não altere `supabase/migrations/0001_init.sql`, `0002_profiles_and_roles.sql`, `0003_rls_role_aware.sql`. Adições vão na nova migration `0004`.
- Não altere a Edge Function `resend-webhook` — ela não lia `settings` (validar com `grep`, mas pelo levantamento da auditoria não há referências).
- Se descobrir que `settings.negative_response_polling_interval` é usado em algum lugar não listado acima, **pare** e reporte (esse campo era runtime e some com a tabela; o intervalo passa a ser fixo no `chatwoot-poll` ou via env var `CHATWOOT_POLL_INTERVAL_SECONDS` se necessário).

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 3 NÃO pode ser declarada concluída enquanto todos os itens abaixo não forem reportados explicitamente.

#### 1. Testes funcionais
- [ ] `supabase/migrations/0004_drop_settings_table.sql` existe com `DROP TABLE IF EXISTS public.settings CASCADE`.
- [ ] `grep -rn "from('settings')\|from(\"settings\")" src/ supabase/` retorna **vazio**.
- [ ] `grep -rn "useSettings\|settingsSchema\|SettingsForm" src/` retorna **vazio**.
- [ ] `grep -rn "cnpja_api_key\|apollo_api_key\|resend_api_key\|chatwoot_api_token" src/ supabase/functions/` retorna **vazio**.
- [ ] `grep -rn "Deno.env.get('CNPJA_API_KEY')" supabase/functions/` retorna 1 hit (em `cnpja-lookup`).
- [ ] `grep -rn "Deno.env.get('APOLLO_API_KEY')" supabase/functions/` retorna 1 hit.
- [ ] `grep -rn "Deno.env.get('RESEND_API_KEY')" supabase/functions/` retorna **2 hits** (resend-send + follow-up-send).
- [ ] `grep -rn "Deno.env.get('CHATWOOT_" supabase/functions/` retorna hits em `chatwoot-test` e `chatwoot-poll`.
- [ ] Arquivos deletados (`ls` retorna erro): `src/pages/SettingsPage.tsx`, `src/hooks/useSettings.ts`, `src/components/settings/ApiKeyField.tsx`, `src/components/settings/ConnectionTest.tsx`.
- [ ] Rota `/settings` removida de `src/routes/index.tsx` (`grep "/settings" src/routes/index.tsx` deve retornar vazio).
- [ ] Sidebar não tem mais entrada "Configurações" (`grep -i "configurações\|settings" src/components/layout/Sidebar.tsx` retorna apenas referências semânticas, não rotas).
- [ ] `.env.example` contém os blocos de Edge Functions e Frontend novos.

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. Anexar trecho do log.
- [ ] `npm run lint` (se houver script) sem warnings novos.
- [ ] Zero erros de TypeScript em arquivos modificados.

#### 3. Testes visuais
- [ ] Sidebar carrega sem o item "Configurações" e sem o bloco de status de integrações.
- [ ] Nenhuma página exibe vestígio de tela de settings (não há link quebrado).

#### 4. Testes responsivos
- N/A nesta fase (sem mudança de layout responsivo).

#### 5. Testes de integração
- [ ] Cada Edge Function modificada lê **exatamente** as env vars listadas, e não outras.
- [ ] Edge Function `chatwoot-poll` foi reescrita para single-instance (não itera mais sobre `settings`); validar visualmente o trecho que substituiu o loop por uma leitura única de env vars.
- [ ] `git status` mostra: 1 nova migration, 6 Edge Functions modificadas, 4 arquivos `src/` deletados, ~7 arquivos `src/` modificados, `.env.example` modificado.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima.
- Evidência: snippet do antes/depois de cada Edge Function (mostrar o trecho que lia `settings` substituído pelo `Deno.env.get`).
- Reconhecer explicitamente: **a migration 0004 não foi aplicada e as env vars não foram setadas no Supabase nesta sessão**. Cabe ao usuário rodar `supabase db push` (ou colar a SQL) e configurar as env vars antes de testar.
- Lista das env vars que o usuário precisa setar no Dashboard do Supabase (Settings > Edge Functions): `CNPJA_API_KEY`, `APOLLO_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID`, `WHATSAPP_LINK`.
- Bugs encontrados e resolução, ou débito técnico explícito.

### Commit final

```bash
git add -A
git commit -m "migration(fase3): remove BYOK e move keys para .env

Mudanças principais:
- Migration 0004: dropa tabela settings inteira
- 6 Edge Functions reescritas para Deno.env.get (CNPJA/APOLLO/RESEND/CHATWOOT/WHATSAPP)
- chatwoot-poll reescrita para single-instance
- /settings, useSettings, ApiKeyField, ConnectionTest removidos
- Defaults de campanhas movidos para VITE_* env vars no frontend
- .env.example atualizado com 10 vars de Edge Function + 3 vars de frontend

Refs: MIGRATION_PLAN.md fase 3"
```

Reporte ao usuário e instrua sobre a próxima fase (`migration/FASE-4.prompt.md` — Remover onboarding banner).
