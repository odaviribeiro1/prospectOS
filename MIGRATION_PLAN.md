# Migration Plan — agentise-leads (ProspectOS)

> Plano de migração de SaaS multi-tenant para Open Source Self-Hosted.
> Gerado em 2026-04-30 com base em `AUDIT_REPORT.md`.
> Branch de trabalho: `oss-self-hosted` | Tag de snapshot: `v0-saas-final`.

## Resumo da auditoria

- **Decisão:** MIGRAR
- **Esforço total estimado:** 10–16 horas (~2 sessões de Claude Code)
- **Qualidade média do código atual:** 4.43 / 5
- **Acoplamento crítico identificado:** praticamente inexistente. Não há `tenant_id`, `tenants`, subdomínio, white-label dinâmico, billing, BYOK cifrado nem wizard de tenant. O isolamento atual é per-`user_id` (modelo single-user), e a única "casca" é (a) BYOK simples não-cifrado em texto plano na tabela `settings` que precisa virar `.env`, (b) ausência de roles que precisa ganhar 2 níveis (`gestor`/`operacional`), e (c) um banner de onboarding descartável.

## Domínio nuclear a preservar

Prospecção outbound B2B em pipeline linear: consulta de CNPJ em lote → qualificação por filtros (regime tributário + porte) → enriquecimento de sócios via Apollo.io → revisão manual → campanhas de e-mail via Resend → sequências de follow-up com remoção automática por label `resposta_negativa` no Chatwoot.

- **Entidades centrais (5 grupos):**
  1. `batches` + `companies` + `partners` (consulta CNPJ e quadro societário)
  2. `lead_lists` + `enriched_leads` (resultados do Apollo)
  3. `email_campaigns` + `email_sends` (outreach)
  4. `follow_up_sequences` + `follow_up_steps` + `follow_up_enrollments` + `follow_up_sends` + `follow_up_activity_log` (follow-up)
  5. `activity_log` (auditoria) — **tudo isto deve sobreviver intacto.**
- **Edge Functions de domínio (todas):** `cnpja-lookup`, `apollo-enrich`, `resend-send`, `resend-webhook`, `chatwoot-test`, `chatwoot-poll`, `follow-up-send`.
- **Telas de domínio:** `MetricasPage`, `ConsultaPage`, `EmpresasPage`, `ListasPage`, `LeadReviewPage`, `CampanhasPage`, `CampaignCreatePage`, `CampaignDetailPage`, `FollowUpsPage`, `NovaSequenciaPage`, `SequenciaDetalhePage`, `ProfilePage`, `LoginPage`, `RegisterPage`. (`SettingsPage` será **removida** na Fase 3.)

## Fases incluídas neste plano

| # | Fase | Esforço estimado | Risco | Status |
|---|---|---|---|---|
| 0 | Branch e snapshot | 5min | Nulo | ✅ Concluída |
| 1 | Faxina técnica | 1h | Baixo | ⏳ Pendente |
| 2 | Achatar roles (gestor/operacional) | 3–4h | Médio | ⏳ Pendente |
| 3 | Remover BYOK e mover keys para `.env` | 4–5h | Médio | ⏳ Pendente |
| 4 | Remover onboarding banner | 30min | Baixo | ⏳ Pendente |
| 5 | Documentação final + DX | 1–2h | Baixo | ⏳ Pendente |
| 6 | Smoke test manual end-to-end | 1–2h | Baixo | ⏳ Pendente |

## Fases excluídas e justificativa

| Fase do catálogo | Por que não se aplica |
|---|---|
| Remover white-label dinâmico | Auditoria seção 2.C confirmou: **0 ocorrências** de `--brand-primary`, `logo_url`, `custom_domain`, etc. Tema dark Agentise (`#0A0A0F`, blue `211 75% 52%`, sidebar `213 54% 15%`) já é fixo em `src/index.css`. |
| Remover `tenant_id` | Auditoria seção 2.A confirmou: **0 colunas** `tenant_id` em 14 tabelas; **0 tabelas** `tenants`/`workspaces`/`organizations`; isolamento é per-`user_id`. |
| Remover billing | Auditoria seção 2.D confirmou: **0 ocorrências reais** de Stripe/checkout/subscription/pricing. |
| Remover subdomain dinâmico | Auditoria seção 2.B confirmou: **0 ocorrências** de `hostname.split`, `subdomain`, `window.location.hostname`. |
| Decidir `/setup` vs `.env` | Projeto já usa `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` puramente via `.env`. Não há rota `/setup` — não há decisão a tomar. |
| Remover wizard de tenant | Auditoria seção 2.F confirmou: rotas `/onboarding`/`/setup`/`/wizard` **inexistentes**. O único onboarding é um banner de checklist no dashboard, tratado na Fase 4. |

## Ordem de execução e dependências

A ordem foi escolhida pelas seguintes razões:

1. **Fase 1 (Faxina técnica)** primeiro porque resolve débitos triviais (console.log de anon key, redefinição duplicada de `get_dashboard_data`, mover `database.sql` para `supabase/migrations/`) sem risco — limpa o terreno antes das mudanças semânticas.
2. **Fase 2 (Roles)** antes da Fase 3 porque a refatoração de RLS para `auth.uid() = user_id OR is_gestor()` precisa do helper `is_gestor()` em pé. Reescrever as 14 policies uma vez só (na Fase 2) é mais barato que reescrever novamente na Fase 3.
3. **Fase 3 (BYOK → `.env`)** depois das roles porque a Fase 3 mexe nas mesmas 6 Edge Functions que validam JWT — ajustar `Deno.env.get` ao mesmo tempo que confirma RLS de role evita rework. Esta é a fase mais pesada.
4. **Fase 4 (Onboarding banner)** depois da Fase 3 porque um dos passos do checklist é "configurar API keys", que deixa de fazer sentido após BYOK ser movido para `.env`.
5. **Fase 5 (Documentação)** penúltima porque depende de o estado final do código estar definido (setup via `.env`, schema final, instruções de roles).
6. **Fase 6 (Smoke test manual end-to-end)** sempre por último — valida o fluxo completo: registro de primeiro usuário (vira gestor) → segundo usuário (vira operacional) → consulta CNPJ → enriquecimento → revisão → campanha → follow-up com remoção por Chatwoot.

## Como executar

Cada fase tem um prompt autocontido em `migration/FASE-N.prompt.md`. Para executar:

1. Abra Claude Code numa nova sessão na raiz deste repositório.
2. Confirme que está na branch `oss-self-hosted` (`git rev-parse --abbrev-ref HEAD`).
3. Confirme que a fase anterior está commitada (mensagem segue padrão `migration(faseN): <descrição>`).
4. Cole o conteúdo de `migration/FASE-N.prompt.md`.
5. Aguarde a execução completa, incluindo o gate de validação no final.
6. Revise as mudanças. Se aprovar, mantém-se em `oss-self-hosted` e segue para a próxima fase. **Merge em `main` apenas após a Fase 6.**
7. Cada fase termina com commit feito por Claude Code.

Se uma fase falhar:
- Não abandone a branch. Use `git reset --hard` para voltar ao último commit válido.
- Releia o `FASE-N.prompt.md` e ajuste manualmente se for o caso.
- Em último caso, `git checkout v0-saas-final` para inspecionar o estado pré-migração.

## Observações específicas deste projeto

- **`user_id` permanece** em todas as 14 tabelas como FK para `auth.users`. Não é "tenant_id renomeado" — é rastreamento legítimo de quem criou cada linha. A mudança de RLS na Fase 2 é: `auth.uid() = user_id` → `auth.uid() = user_id OR public.is_gestor()`. O operacional continua vendo só seus próprios leads; o gestor vê tudo da instância.
- **Migrações**: hoje só existe `database.sql` na raiz (cole-no-SQL-Editor). A Fase 1 move para `supabase/migrations/0001_init.sql` (renomeando o arquivo único existente, sem fragmentar). As fases seguintes adicionam migrations incrementais numeradas (`0002_profiles_and_roles.sql`, `0003_drop_settings_table.sql`).
- **Realtime habilitado** em `email_sends`, `batches`, `follow_up_enrollments`, `follow_up_activity_log` — preservar. Documentar no README (Fase 5) que self-hosted requer realtime habilitado no projeto Supabase do cliente.
- **pg_cron + pg_net**: scheduler para `chatwoot-poll` está comentado no `database.sql`. Manter assim — Fase 5 documenta como descomentar no README.
- **Sem testes automatizados**: zero `*.test.ts`, sem Vitest/Jest. A Fase 6 é exclusivamente manual. Adicionar testes é débito explícito, fora do escopo desta migração.
- **Console leak**: `src/lib/supabase.ts:5-6` imprime `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Resolvido na Fase 1.
- **Decisão sobre `settings` table**: a Fase 3 **dropa a tabela inteira** (todas as colunas viram `.env`, incluindo `whatsapp_link` que será template em campanhas). Se aparecer necessidade de configuração runtime no futuro, reintroduzir a tabela limpa.
