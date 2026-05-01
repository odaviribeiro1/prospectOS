# FASE 1 — Faxina técnica

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-leads (ProspectOS)
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 0 (snapshot + branch) deve estar commitada.
> Esforço estimado: 1h. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 1** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md` na raiz do repositório, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`
2. `git status --porcelain` — confirmar working directory limpo
3. `git log -1 --oneline` — último commit deve mencionar a Fase 0 (`migration(fase0)`) ou ser o commit de criação do `MIGRATION_PLAN.md`
4. `view AUDIT_REPORT.md` — releia a seção 5 (qualidade) e seção 7 (observações livres)
5. `view MIGRATION_PLAN.md` — releia a seção "Observações específicas deste projeto"

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

Limpar débitos triviais identificados na auditoria, sem mexer em domínio ou semântica. Três alvos: (a) remover `console.log` de debug que vaza a anon key do Supabase, (b) remover redefinição duplicada da função `get_dashboard_data` no `database.sql`, e (c) reorganizar `database.sql` para o caminho canônico `supabase/migrations/0001_init.sql`. Esta fase prepara o terreno para fases que adicionam migrations incrementais.

### Lista de mudanças concretas (geradas a partir do `AUDIT_REPORT.md`)

#### Migrations SQL a criar
- Nenhuma. Esta fase apenas **renomeia** o arquivo de migration existente.

#### Migrations SQL a modificar
- `database.sql` (raiz) → mover para `supabase/migrations/0001_init.sql`. Durante a movimentação:
  - Remover o bloco duplicado `CREATE OR REPLACE FUNCTION public.get_dashboard_data` das linhas 632–658 (a versão canônica fica nas linhas 531–561).
  - Remover o `GRANT EXECUTE ON FUNCTION public.get_dashboard_data(UUID, TIMESTAMPTZ) TO authenticated;` da linha 658 — adicioná-lo logo após a definição canônica da função (após a linha 561).
  - Manter o bloco de `pg_cron` comentado (linhas 596–625) — apenas mover junto com o restante.
  - Manter cabeçalho original com `AGENTISE LEADS — DATABASE SETUP COMPLETO`.

#### Edge Functions a modificar
- Nenhuma.

#### Edge Functions a deletar
- Nenhuma.

#### Arquivos TypeScript a modificar
- `src/lib/supabase.ts` — remover linhas 5 e 6 (`console.log("URL:", supabaseUrl)` e `console.log("KEY:", supabaseAnonKey)`).

#### Arquivos TypeScript a deletar
- Nenhum.

#### Tipos a atualizar
- Nenhum.

#### Outros artefatos
- `README.md` — atualizar a instrução do passo 4 do "Setup Local" para apontar para `supabase/migrations/0001_init.sql` em vez de `database.sql`.
- `README.md` — atualizar a seção "Scheduler (pg_cron)" para apontar para `supabase/migrations/0001_init.sql` em vez de `database.sql`.

### Ordem de execução recomendada

1. `mkdir -p supabase/migrations`
2. `view database.sql` (offset 625, limit 35) para confirmar exatamente o intervalo do bloco duplicado.
3. Ler `database.sql` inteiro, copiar para `supabase/migrations/0001_init.sql` removendo o bloco duplicado e ajustando o `GRANT EXECUTE` para logo após a definição canônica. Use `Write` para criar o arquivo novo.
4. `git rm database.sql` (ou `rm database.sql` seguido de `git add -A`).
5. `Edit` em `src/lib/supabase.ts` para remover as 2 linhas de `console.log`.
6. `Edit` em `README.md` (2 ocorrências de `database.sql` → `supabase/migrations/0001_init.sql`).
7. Rodar `npm run build` para confirmar que o frontend ainda compila (mudança em `supabase.ts` é só remoção de log, mas vale validar).
8. Validação (gate abaixo).
9. Commit.

### Restrições

- Não toque em código de domínio (componentes, hooks de domínio, Edge Functions).
- Não rode `supabase db push`, `supabase functions deploy`, ou qualquer comando de deploy. O usuário aplica as migrations manualmente quando quiser.
- Não rode `npm install`. Nenhuma dependência nova.
- Não exclua nada além de `database.sql` da raiz e das 2 linhas de `console.log`. Em particular, não toque no bloco `pg_cron` comentado — ele será preservado dentro do novo `0001_init.sql`.
- Se descobrir que precisa modificar algo fora do escopo, **pare** e reporte ao usuário.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 1 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] `supabase/migrations/0001_init.sql` existe e contém ~590 linhas (650 originais menos as ~30 linhas duplicadas + ajuste do GRANT).
- [ ] `database.sql` na raiz **não** existe mais (`ls database.sql` retorna erro).
- [ ] `grep -c "CREATE OR REPLACE FUNCTION public.get_dashboard_data" supabase/migrations/0001_init.sql` retorna **1** (não 2).
- [ ] `grep -c "GRANT EXECUTE ON FUNCTION public.get_dashboard_data" supabase/migrations/0001_init.sql` retorna **1**.
- [ ] `grep "console.log" src/lib/supabase.ts` retorna vazio.
- [ ] Bloco comentado de `pg_cron` (`SELECT cron.schedule(...)`) preservado dentro de `supabase/migrations/0001_init.sql`.
- [ ] README aponta para `supabase/migrations/0001_init.sql` (e não para `database.sql`) nos passos relevantes.

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. Anexar trecho final do log (sucesso da compilação Vite + tsc).
- [ ] Não há erros de TypeScript em `src/lib/supabase.ts`.

#### 3. Testes visuais
- N/A nesta fase (sem mudança de UI).

#### 4. Testes responsivos
- N/A nesta fase.

#### 5. Testes de integração
- [ ] `git diff main -- src/lib/supabase.ts` mostra apenas as 2 linhas de console.log removidas.
- [ ] `git status` mostra: `database.sql` deletado; `supabase/migrations/0001_init.sql` novo; `src/lib/supabase.ts` modificado; `README.md` modificado.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima (não agrupar como "tudo ok").
- Evidência: linhas exatas que foram removidas; contagem real de linhas do novo arquivo `0001_init.sql`; saída do `npm run build`.
- Bugs ou regressões encontradas e como foram resolvidos — ou registrados como débito técnico explícito.

### Commit final

```bash
git add -A
git commit -m "migration(fase1): faxina técnica pré-migração

Mudanças principais:
- Remove console.log de debug em src/lib/supabase.ts (anon key leak)
- Move database.sql → supabase/migrations/0001_init.sql
- Remove redefinição duplicada de get_dashboard_data
- Atualiza README para apontar para o novo caminho da migration

Refs: MIGRATION_PLAN.md fase 1"
```

Reporte ao usuário a conclusão e instrua sobre a próxima fase (`migration/FASE-2.prompt.md` — Achatar roles).
