# FASE 2 — Achatar roles (gestor / operacional)

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-leads (ProspectOS)
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 1 deve estar commitada.
> Esforço estimado: 3–4h. Risco: Médio.

---

## Prompt para Claude Code

Você está executando a **Fase 2** da migração deste projeto. O contexto completo está em `MIGRATION_PLAN.md` na raiz e o levantamento original em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

1. `git rev-parse --abbrev-ref HEAD` — confirmar `oss-self-hosted`
2. `git status --porcelain` — working directory limpo
3. `git log -1 --oneline` — último commit deve ser `migration(fase1): faxina técnica pré-migração`
4. Confirmar que `supabase/migrations/0001_init.sql` existe e `database.sql` na raiz não existe.
5. `view AUDIT_REPORT.md` — releia seção 2.G (roles existentes), seção 4 (esforço), seção 7 (observações sobre `user_id ≠ tenant_id`)
6. `view MIGRATION_PLAN.md` — releia "Observações específicas deste projeto"

Se qualquer pré-checagem falhar, **pare** e reporte.

### Escopo desta fase

Hoje o projeto não tem RBAC: cada usuário só vê seus próprios dados via `auth.uid() = user_id`. O modelo open source self-hosted requer 2 roles — `gestor` (vê tudo da instância) e `operacional` (vê apenas o que criou). Esta fase cria a infraestrutura: tabela `profiles`, enum `user_role`, trigger `handle_new_user` que faz o **primeiro usuário registrado** virar `gestor` (e demais virarem `operacional`), helper SQL `is_gestor()`, e reescreve as 14 policies RLS para `auth.uid() = user_id OR public.is_gestor()`. Adiciona também um indicador de role na `ProfilePage` para o usuário ver seu próprio papel.

**Decisão de produto consolidada**: operacional continua vendo apenas seus próprios leads. Gestor vê tudo. (Conforme observação do AUDIT_REPORT seção 7.)

### Lista de mudanças concretas

#### Migrations SQL a criar
- `supabase/migrations/0002_profiles_and_roles.sql` — conteúdo:
  - `CREATE TYPE public.user_role AS ENUM ('gestor', 'operacional');` (envolto em `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`)
  - `CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, role public.user_role NOT NULL DEFAULT 'operacional', display_name TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`
  - `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`
  - Policies: usuários autenticados leem seu próprio profile (`auth.uid() = id`); gestor lê e atualiza qualquer profile; operacional só atualiza seu próprio `display_name` (não pode mudar `role`).
  - Trigger `set_updated_at_profiles BEFORE UPDATE` reusando `public.handle_updated_at()`.
  - Função `public.is_gestor() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor'); $$;`
  - `GRANT EXECUTE ON FUNCTION public.is_gestor() TO authenticated;`
  - Função `public.handle_new_user() RETURNS TRIGGER` que insere em `public.profiles (id, role)` — role = `'gestor'` se `(SELECT count(*) FROM public.profiles) = 0`, senão `'operacional'`.
  - Trigger `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
- `supabase/migrations/0003_rls_role_aware.sql` — reescreve as 14 policies de domínio. Para cada uma das tabelas abaixo, `DROP POLICY IF EXISTS` da versão antiga e recria como `FOR ALL USING (auth.uid() = user_id OR public.is_gestor())`:
  - `settings`, `batches`, `companies`, `partners`, `lead_lists`, `enriched_leads`, `email_campaigns`, `email_sends`, `follow_up_sequences`, `follow_up_steps`, `follow_up_enrollments`, `follow_up_sends`, `follow_up_activity_log`, `activity_log`.
  - **Observação**: `settings` será dropada na Fase 3, mas é mais simples reescrever sua policy aqui para manter o padrão e não criar exceção temporária. A Fase 3 dropará a tabela inteira.

#### Edge Functions a modificar
- Nenhuma nesta fase. As 7 Edge Functions continuam validando o JWT do usuário; o gestor passar a poder enxergar dados de outros usuários é controlado puramente pelas policies RLS reescritas (Edge Functions usam Service Role e ignoram RLS, então não há mudança de código necessário ali).

#### Edge Functions a deletar
- Nenhuma.

#### Arquivos TypeScript a modificar
- `src/types/index.ts` — adicionar:
  ```ts
  export type UserRole = 'gestor' | 'operacional'

  export interface Profile {
    id: string
    role: UserRole
    display_name: string | null
    created_at: string
    updated_at: string
  }
  ```
- `src/hooks/useProfile.ts` — **criar novo arquivo** com hook `useProfile()` que faz `supabase.from('profiles').select('*').eq('id', user.id).single()` (usando TanStack Query, padrão idêntico aos demais hooks do projeto). Expor `{ profile, isLoading, isGestor }`.
- `src/pages/ProfilePage.tsx` — adicionar bloco visual mostrando "Seu papel: **Gestor**" ou "Seu papel: **Operacional**" usando o `useProfile`. Usar Badge do shadcn/ui se já existir, senão usar um `<span>` com Tailwind seguindo a paleta existente.

#### Arquivos TypeScript a deletar
- Nenhum.

#### Tipos a atualizar
- `src/types/index.ts` — adicionar `UserRole` e `Profile` (já listado acima).

#### Outros artefatos
- Nenhum nesta fase (README e CLAUDE.md ficam para a Fase 5).

### Ordem de execução recomendada

1. Criar `supabase/migrations/0002_profiles_and_roles.sql` com `Write`.
2. Criar `supabase/migrations/0003_rls_role_aware.sql` com `Write`.
3. Adicionar tipos em `src/types/index.ts` com `Edit`.
4. Criar `src/hooks/useProfile.ts` com `Write`, espelhando o padrão de `src/hooks/useSettings.ts`.
5. Editar `src/pages/ProfilePage.tsx` para exibir o papel — primeiro `view` no arquivo para entender o layout, depois `Edit` minimamente invasivo.
6. Rodar `npm run build` para validar tipos e compilação.
7. Validação (gate abaixo).
8. Commit.

### Restrições

- **Não execute as migrations** (`supabase db push` está proibido). Apenas crie os arquivos `.sql` em `supabase/migrations/`. O usuário aplica manualmente quando quiser, na ordem `0002` → `0003`.
- Não toque em nenhuma Edge Function.
- Não toque em hooks de domínio existentes (`useBatch`, `useCampaigns`, `useLeadLists`, etc.) — eles continuam funcionando porque a RLS reescrita é compatível com `auth.uid() = user_id` (operacional continua tendo o mesmo acesso de antes).
- Não delete nada nesta fase.
- Não rode `npm install`.
- Se descobrir que precisa modificar algo fora desta lista, **pare** e reporte.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 2 NÃO pode ser declarada concluída enquanto todos os itens abaixo não forem reportados explicitamente.

#### 1. Testes funcionais
- [ ] `supabase/migrations/0002_profiles_and_roles.sql` existe e define enum `user_role`, tabela `profiles`, função `is_gestor()`, função `handle_new_user()` e trigger `on_auth_user_created`. Reportar contagem de linhas.
- [ ] `supabase/migrations/0003_rls_role_aware.sql` existe e contém **14** blocos `DROP POLICY ... CREATE POLICY ... USING (auth.uid() = user_id OR public.is_gestor())`. Confirmar com `grep -c "is_gestor()" supabase/migrations/0003_rls_role_aware.sql` ≥ 14.
- [ ] `src/hooks/useProfile.ts` existe e exporta `useProfile()` retornando `{ profile, isLoading, isGestor }`.
- [ ] `src/pages/ProfilePage.tsx` exibe o papel do usuário (verificar com `grep -i "gestor\|operacional\|role" src/pages/ProfilePage.tsx`).
- [ ] Tipos `UserRole` e `Profile` exportados de `src/types/index.ts`.
- [ ] **Lógica do trigger validada**: leitura visual do SQL confirmando que `(SELECT count(*) FROM public.profiles) = 0` é a condição de "primeiro usuário vira gestor". Anexar trecho.

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. Anexar trecho final do log.
- [ ] Não há erros de TypeScript em `src/types/index.ts`, `src/hooks/useProfile.ts`, `src/pages/ProfilePage.tsx`.

#### 3. Testes visuais
- [ ] `ProfilePage` carrega com o badge de role (verificação visual será feita na Fase 6 com servidor real, mas o markup deve estar presente).
- [ ] Estilo do badge segue paleta existente: blue `211 75% 52%` para gestor, muted/secondary para operacional. Usar classes Tailwind do projeto, não cores inline novas.

#### 4. Testes responsivos
- N/A nesta fase (mudança visual mínima na ProfilePage).

#### 5. Testes de integração
- [ ] `git diff` mostra apenas: 2 novos arquivos `.sql` em `supabase/migrations/`, 1 novo arquivo `src/hooks/useProfile.ts`, edits em `src/types/index.ts` e `src/pages/ProfilePage.tsx`.
- [ ] Hooks existentes (`useBatch`, `useCampaigns`, etc.) **não foram modificados** (`git diff --name-only` não inclui nenhum outro hook).

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por cada item acima (granular).
- Evidência: contagem de policies em `0003`, conteúdo do trigger `handle_new_user`, snippet da `ProfilePage` com o badge.
- Reconhecer explicitamente: **as migrations 0002 e 0003 não foram aplicadas no Supabase nesta sessão**. Cabe ao usuário rodar `supabase db push` ou colar no SQL Editor antes de testar.
- Bugs encontrados e resolução, ou débito técnico registrado.

### Commit final

```bash
git add -A
git commit -m "migration(fase2): adiciona roles gestor/operacional

Mudanças principais:
- Migration 0002: tabela profiles, enum user_role, helper is_gestor(), trigger handle_new_user (primeiro usuário vira gestor)
- Migration 0003: reescreve 14 policies RLS para auth.uid() = user_id OR is_gestor()
- Hook useProfile() + tipos UserRole/Profile
- ProfilePage exibe papel atual do usuário

Refs: MIGRATION_PLAN.md fase 2"
```

Reporte ao usuário e instrua sobre a próxima fase (`migration/FASE-3.prompt.md` — Remover BYOK e mover keys para `.env`).
