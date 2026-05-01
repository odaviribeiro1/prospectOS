# FASE 4 — Remover onboarding banner

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-leads (ProspectOS)
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 3 deve estar commitada.
> Esforço estimado: 30min. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 4** da migração. Contexto em `MIGRATION_PLAN.md` e `AUDIT_REPORT.md` seção 2.F.

### Pré-checagem obrigatória

1. `git rev-parse --abbrev-ref HEAD` — `oss-self-hosted`
2. `git status --porcelain` — limpo
3. `git log -1 --oneline` — último commit deve ser `migration(fase3): remove BYOK e move keys para .env`
4. Confirmar que a tabela `settings` foi removida do código (`grep -rn "from('settings')" src/ supabase/` deve retornar vazio).

Se qualquer pré-checagem falhar, **pare** e reporte.

### Escopo desta fase

O `OnboardingBanner` é um checklist no dashboard com 6 passos: configurar API keys (CNPJá, Apollo, Resend, Chatwoot — todos eliminados na Fase 3), fazer primeira consulta, primeira lista, primeira campanha. Após a Fase 3, o banner perde a maior parte do sentido. No modelo open source self-hosted, o setup é responsabilidade do operador da instância (via `.env`), e o usuário gestor/operacional não precisa de checklist no produto. Esta fase remove o banner inteiro: componente, hook, integração na `MetricasPage` e localStorage flag.

### Lista de mudanças concretas

#### Migrations SQL a criar
- Nenhuma.

#### Edge Functions a modificar / deletar
- Nenhuma.

#### Arquivos TypeScript a modificar
- `src/pages/MetricasPage.tsx` — remover:
  - import de `OnboardingBanner` e `useOnboarding`
  - linha que chama `const { data: onboarding } = useOnboarding()`
  - bloco condicional `{onboarding && !onboarding.isComplete && (<OnboardingBanner status={onboarding} />)}`
  - Verificar que nada mais depende dessas variáveis na página.

#### Arquivos TypeScript a deletar
- `src/components/dashboard/OnboardingBanner.tsx`
- `src/hooks/useOnboarding.ts`
- (Se a pasta `src/components/dashboard/` ficar vazia, deletar a pasta. Caso contrário, manter.)

#### Tipos a atualizar
- Tipos eram locais (interface `OnboardingStatus` exportada de `useOnboarding.ts`). Some junto com o arquivo.

#### Outros artefatos
- Nenhum.

### Ordem de execução recomendada

1. `view src/pages/MetricasPage.tsx` para localizar exatamente as linhas a remover.
2. `Edit` em `MetricasPage.tsx` para remover o import, o `useOnboarding()` e o bloco condicional.
3. Deletar `src/components/dashboard/OnboardingBanner.tsx` e `src/hooks/useOnboarding.ts`.
4. Verificar se a pasta `src/components/dashboard/` ficou vazia. Se sim, removê-la; se não, manter.
5. Limpeza opcional: `localStorage.removeItem('agentise_onboarding_dismissed')` não é necessária no código (a chave fica órfã no browser dos usuários existentes, sem efeito colateral).
6. `npm run build` para confirmar.
7. Validação (gate abaixo).
8. Commit.

### Restrições

- Não toque em nenhum outro arquivo. A remoção é cirúrgica.
- Não rode `npm install`.
- Se descobrir que `OnboardingBanner` ou `useOnboarding` é importado de outro arquivo além de `MetricasPage.tsx`, **pare** e reporte (a auditoria mapeou apenas `MetricasPage` como consumidor; se houver outro, a Fase 4 precisa ser revisada).

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.**

#### 1. Testes funcionais
- [ ] `ls src/components/dashboard/OnboardingBanner.tsx` retorna erro (arquivo deletado).
- [ ] `ls src/hooks/useOnboarding.ts` retorna erro.
- [ ] `grep -rn "OnboardingBanner\|useOnboarding\|onboarding_dismissed" src/` retorna **vazio**.
- [ ] `MetricasPage.tsx` renderiza sem o banner (verificar visualmente o JSX retornado).

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. Anexar log final.
- [ ] Zero erros TypeScript.

#### 3. Testes visuais
- [ ] `MetricasPage` renderiza sem o card "Configurar API Keys" / "Configurar Resend" / "Configurar Chatwoot" — apenas as métricas reais do domínio.

#### 4. Testes responsivos
- N/A (remoção pura, sem novos componentes).

#### 5. Testes de integração
- [ ] `git status` mostra: 2 arquivos deletados (banner + hook), 1 modificado (`MetricasPage.tsx`).

#### 6. Relatório de conclusão
- ✅ ou ❌ por cada item.
- Evidência: snippet do `MetricasPage.tsx` antes/depois mostrando o bloco removido.

### Commit final

```bash
git add -A
git commit -m "migration(fase4): remove banner de onboarding

Mudanças principais:
- Remove OnboardingBanner e useOnboarding (checklist obsoleto após Fase 3)
- MetricasPage exibe apenas métricas reais do domínio

Refs: MIGRATION_PLAN.md fase 4"
```

Reporte ao usuário e instrua sobre a próxima fase (`migration/FASE-5.prompt.md` — Documentação final + DX).
