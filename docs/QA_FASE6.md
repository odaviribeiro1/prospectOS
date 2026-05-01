# QA Fase 6 — Validação End-to-End da Migração Self-Hosted

> Roteiro de validação manual da branch `oss-self-hosted` (Agentise Leads).
> Pré-requisito: fases 1–5 já commitadas (faxina, roles, BYOK→.env, remoção do banner, docs).

## 1. Critérios de aceite

A Fase 6 é considerada concluída quando **todos** os blocos abaixo passam sem erro:

- [ ] Build estático limpo (`npm run build`)
- [ ] Smoke estático (lint não tem erro novo introduzido pela migração)
- [ ] Setup de banco a partir do zero usando `supabase/migrations/0001..0004` aplica sem erro
- [ ] Primeiro registro vira `gestor`; segundo vira `operacional` (verificado em `public.profiles`)
- [ ] RLS por role funciona: gestor vê tudo da instância; operacional vê apenas o que criou
- [ ] Tela `/settings` não existe mais (404 / NotFound)
- [ ] Banner de onboarding não aparece em `/metricas`
- [ ] Edge Functions leem keys de `Deno.env.get` (sem hit em `public.settings`)
- [ ] Fluxo nuclear (consulta CNPJ → enriquecimento → revisão → campanha → follow-up) executa de ponta a ponta com 1 lead real

## 2. Setup local (uma vez por máquina)

```bash
# 1. Clonar e instalar
git checkout oss-self-hosted
npm install

# 2. Configurar frontend
cp .env.example .env.local
# Editar .env.local e preencher VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
# (anon key é pública por design — RLS protege os dados)

# 3. Configurar Supabase (linkar projeto e aplicar migrations)
supabase link --project-ref <PROJECT_REF>
supabase db push   # aplica 0001 → 0004 em ordem

# 4. Configurar secrets das Edge Functions
supabase secrets set \
  CNPJA_API_KEY=... \
  APOLLO_API_KEY=... \
  RESEND_API_KEY=... \
  RESEND_FROM_EMAIL="contato@suaempresa.com.br" \
  RESEND_FROM_NAME="Sua Empresa" \
  CHATWOOT_URL="https://chatwoot.suaempresa.com.br" \
  CHATWOOT_API_TOKEN=... \
  CHATWOOT_ACCOUNT_ID=1 \
  CHATWOOT_INBOX_ID=1 \
  WHATSAPP_LINK="https://wa.me/5511..."

# 5. Deploy das Edge Functions
supabase functions deploy \
  cnpja-lookup apollo-enrich resend-send resend-webhook \
  chatwoot-test chatwoot-poll follow-up-send

# 6. Subir o frontend
npm run dev
# Abre em http://localhost:5173
```

## 3. Smoke estático (rodar antes do QA manual)

```bash
npm run build           # esperado: ✓ built — sem erros
```

Lint pode ter erros pré-existentes (`react-refresh/only-export-components` em
`src/routes/index.tsx`, `react-hooks/incompatible-library` em `LeadReviewPage`,
`react-hooks/set-state-in-effect` em `NovaSequenciaPage`, 1 unused-var em
`apollo-enrich`). **Nenhum** introduzido pela migração — esses ficam para um PR
de qualidade separado.

Auditoria estática que precisa retornar zero hits:

```bash
# 1. Resíduos de BYOK no frontend
grep -rn "useSettings\|SettingsPage\|ApiKeyField\|cnpja_api_key\|apollo_api_key\|resend_api_key\|chatwoot_api_token" src/

# 2. Resíduos do banner de onboarding
grep -rn "OnboardingBanner\|useOnboarding\|agentise_onboarding_dismissed" src/

# 3. Edge Functions ainda lendo da tabela settings
grep -rn "from('settings')\|from(\"settings\")" supabase/functions/

# 4. Rotas /settings em sidebars
grep -rn "/settings" src/components/layout/
```

## 4. Validação de banco (psql / SQL Editor)

Cole no SQL Editor do Supabase logo após `supabase db push`:

```sql
-- 4.1. Migrations aplicadas (esperado: nenhum erro nos passos anteriores)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
-- Esperado: 14 tabelas + profiles. Tabela 'settings' NÃO deve aparecer.

-- 4.2. Enum user_role existe
SELECT typname, enumlabel FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
WHERE typname = 'user_role';
-- Esperado: 2 linhas — 'gestor' e 'operacional'.

-- 4.3. Trigger handle_new_user instalado
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Esperado: 1 linha.

-- 4.4. Helper is_gestor() existe
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_gestor';
-- Esperado: 1 linha, prosecdef = true (SECURITY DEFINER).

-- 4.5. Policies role-aware (todas devem incluir is_gestor())
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual NOT LIKE '%is_gestor%'
  AND tablename != 'profiles';
-- Esperado: 0 linhas. Se vier algo, a 0003 não foi aplicada para aquela tabela.
```

## 5. QA funcional — roteiro passo a passo

### Bloco A — Auth + Roles (15 min)

1. **Primeiro registro vira `gestor`**
   - Abra `/register`
   - Crie conta `gestor@teste.com / senha12345`
   - Após login, vá em `/perfil`
   - **Esperado:** badge "Gestor" com ícone Shield e texto "Você enxerga todos os dados da instância."
   - **Validação SQL:** `SELECT id, role FROM public.profiles;` → 1 linha, role = `gestor`.

2. **Segundo registro vira `operacional`**
   - Em uma janela anônima, registre `oper@teste.com / senha12345`
   - Em `/perfil`, badge "Operacional" e texto "Você enxerga apenas os dados que criou."
   - **Validação SQL:** `SELECT id, role FROM public.profiles ORDER BY created_at;` → 2 linhas, segunda com role = `operacional`.

3. **`/settings` foi removida**
   - Logado como gestor, navegue para `http://localhost:5173/settings`
   - **Esperado:** página NotFound (rota não existe).
   - Confirme que o item "Configurações" **não** aparece nem na sidebar desktop nem no menu mobile.

4. **Banner de onboarding sumiu**
   - Em `/metricas`, role a página até o final.
   - **Esperado:** dashboard mostra apenas Pipeline / Funnel / RecentActivity / PendingFollowUps. Sem checklist de onboarding.

### Bloco B — RLS por role (10 min)

Pré-condição: criou 1 batch como `gestor` e 1 batch como `operacional`.

1. **Operacional só vê o próprio batch**
   - Logado como `oper@teste.com`, vá em `/empresas`
   - **Esperado:** apenas as empresas do batch criado por ele. Nada do gestor.
   - **Validação SQL (rodar com a JWT do operacional via `auth.set_jwt(...)` ou via console do app):**
     ```sql
     SELECT count(*) FROM public.batches;
     ```
     Esperado: igual ao número de batches do operacional.

2. **Gestor vê tudo**
   - Logado como `gestor@teste.com`, mesma tela.
   - **Esperado:** vê os batches dos dois usuários.

### Bloco C — Pipeline nuclear (45 min)

Use 1 CNPJ real para validação ponta-a-ponta. Sugestão: `33.000.167/0001-01` (Petrobras — público, retorna dados ricos).

1. **Consulta CNPJ (`/consulta`)**
   - Cole o CNPJ no textarea, marque filtro Lucro Real + Grande Porte (compatível com Petrobras), clique "Iniciar Consulta".
   - **Esperado:** progress bar avança, batch fica `completed`, empresa qualificada aparece em `/empresas`.
   - **Validação Edge Function:** Supabase Dashboard → Edge Functions → `cnpja-lookup` → Logs → última invocação retorna 200.

2. **Empresas (`/empresas`)**
   - Selecione a empresa, clique "Enriquecer Selecionadas".
   - **Esperado:** Apollo retorna sócios com email/cargo/LinkedIn; cria `lead_lists` com título `#1 Leads Enriquecidos - DD/MM/YY HH:mm`.
   - **Validação SQL:**
     ```sql
     SELECT title FROM public.lead_lists ORDER BY created_at DESC LIMIT 1;
     SELECT count(*) FROM public.enriched_leads
       WHERE list_id = (SELECT id FROM public.lead_lists ORDER BY created_at DESC LIMIT 1);
     ```

3. **Revisão (`/listas/:id`)**
   - Aprove 1 lead, rejeite o resto.
   - **Esperado:** status muda para `approved` / `rejected`, lista fica `reviewed`.

4. **Campanha (`/campanhas/nova`)**
   - Selecione a lista, escreva template com `{{nome}}` / `{{empresa}}` / `{{link_whatsapp}}`.
   - Clique **MANUALMENTE** "Enviar agora".
   - **Esperado:** Edge Function `resend-send` retorna 200, `email_sends.status` = `sent`, contato criado no Chatwoot (verificar inbox manualmente).
   - **Validação SQL:**
     ```sql
     SELECT status, sent_at, resend_id FROM public.email_sends ORDER BY created_at DESC LIMIT 1;
     ```

5. **Webhook Resend**
   - Configure webhook no painel Resend → URL: `https://<project>.supabase.co/functions/v1/resend-webhook`
   - Abra o e-mail enviado; aguarde alguns segundos.
   - **Esperado:** `email_sends.opened_at` populado.

6. **Follow-up (`/follow-ups/nova-sequencia`)**
   - Crie sequência: passo 1 (1h, condição "não respondeu"), passo 2 (24h, condição "não abriu").
   - Inscreva o lead da campanha na sequência.
   - **Esperado:** `follow_up_enrollments.status` = `active`. `/follow-ups` mostra pendentes.

7. **Polling Chatwoot (manual)**
   - No Chatwoot, atribua a label `resposta_negativa` ao contato criado em (4).
   - Invoque manualmente:
     ```bash
     curl -X POST https://<project>.supabase.co/functions/v1/chatwoot-poll \
       -H "Authorization: Bearer <ANON_KEY>"
     ```
   - **Esperado:** lead removido da sequência (`enrollments.status = 'removed_by_chatwoot'`). Activity log mostra evento.
   - **Validação SQL:**
     ```sql
     SELECT status, removed_at, removal_reason FROM public.follow_up_enrollments
     ORDER BY updated_at DESC LIMIT 1;
     ```

## 6. Cenários negativos (15 min)

- [ ] Tentar consultar CNPJ inválido → toast de erro PT-BR; nada criado em `companies`.
- [ ] Enriquecer empresa sem sócios → mensagem amigável; lista vazia mas criada.
- [ ] Enviar campanha sem template → botão desabilitado.
- [ ] Operacional tenta acessar URL de batch criado por gestor (`/empresas?batch=<uuid>`) → empresas não aparecem (RLS bloqueia).
- [ ] Logout do gestor → não consegue mais ler nenhuma tabela autenticada (clean state).

## 7. Comparativo pré/pós migração

Use este checklist binário ao fechar a fase:

| Item | Antes (SaaS) | Depois (self-hosted) | Status |
|---|---|---|---|
| Tela `/settings` (BYOK) | Existia | Removida | ☐ |
| Banner de onboarding | Existia | Removido | ☐ |
| Tabela `public.settings` | Existia | Dropada | ☐ |
| Coluna `role` em `profiles` | Inexistente | Existe | ☐ |
| Trigger primeiro-registrado | Inexistente | Instalado | ☐ |
| Helper `is_gestor()` | Inexistente | Instalado | ☐ |
| Edge Functions lendo de `Deno.env.get` | Lendo de `settings` | Lendo de env | ☐ |
| `database.sql` na raiz | Existia | Movido para `supabase/migrations/0001` | ☐ |
| README com fluxo self-hosted | Genérico | Atualizado | ☐ |
| `console.log` da anon key | Presente | Removido | ☐ |

## 8. Saída esperada

Quando todos os blocos passarem, criar tag e mergear:

```bash
git tag -a v1.0.0-oss -m "Agentise Leads OSS — primeira release self-hosted"
git push origin oss-self-hosted --tags
gh pr create --base main --head oss-self-hosted \
  --title "Migração SaaS → Open Source Self-Hosted (fases 1-6)" \
  --body "Ver AUDIT_REPORT.md e docs/QA_FASE6.md"
```

## 9. Notas

- **pg_cron + pg_net não testado neste roteiro** — o agendamento automático de
  `chatwoot-poll` está comentado em `0001_init.sql:604-625` aguardando o cliente
  habilitar pg_cron. Para QA manual, basta invocar via curl como em (7).
- **Sem testes automatizados** — Vitest não configurado. Caso queira blindar
  regressões, sugestão pós-migração: testes de smoke nas 7 Edge Functions
  (deno test) + 1 e2e do fluxo nuclear (Playwright).
- **Realtime** — só funciona se o cliente tiver habilitado realtime no projeto
  Supabase (Settings → API → Realtime). Para validar localmente: abrir 2 abas em
  `/empresas`, iniciar consulta numa, observar progress bar avançar na outra
  sem refresh.
