# START — Setup da sua instância

> Bem-vindo! Este arquivo configura sua instância do **Agentise Leads** na sua infraestrutura Supabase + Vercel.
>
> 1. Crie um projeto novo no Supabase em https://supabase.com/dashboard (anote URL, anon key, service_role key e Project Reference em Project Settings → API e General).
> 2. Crie um Personal Access Token Supabase em https://supabase.com/dashboard/account/tokens (escopo "All access").
> 3. Tenha em mãos as chaves de API dos providers que este projeto usa (lista mais abaixo).
> 4. Abra um terminal na raiz deste repositório clonado.
> 5. Execute `claude` (Claude Code precisa estar instalado e autorizado).
> 6. Digite na sessão: **"Leia o arquivo START.md e execute tudo"**
> 7. Responda às perguntas conforme Claude Code as faz.
>
> Em ~10 minutos, sua instância estará configurada: migrations aplicadas, Edge Functions deployadas, secrets configuradas, conta de gestor criada. Depois é só fazer o deploy do frontend na Vercel.

---

## Credenciais que serão pedidas

**Supabase (obrigatórias):**
- **Supabase URL** — formato `https://xxxxxxxxxxxxxxxxxxxxxx.supabase.co`. Em Project Settings → API → Project URL.
- **Supabase anon key** — JWT longo. Em Project Settings → API → Project API keys → `anon` `public`.
- **Supabase service_role key** — JWT longo (manter em sigilo). Em Project Settings → API → Project API keys → `service_role` `secret`.
- **Supabase Project Reference** — código de 20 letras tipo `xhznjliwxbosunwrcaut`. Em Project Settings → General → Reference ID.
- **Supabase Personal Access Token** — formato `sbp_...`. Em https://supabase.com/dashboard/account/tokens.

**Conta gestor (obrigatórias):**
- **E-mail** que você vai usar como gestor desta instância.
- **Senha** (mínimo 8 caracteres).

**Edge Functions Secrets (opcionais — pode pular e configurar depois):**
- `CNPJA_API_KEY` — https://cnpja.com (Dashboard → API Keys)
- `APOLLO_API_KEY` — https://app.apollo.io/#/settings/integrations/api
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` — https://resend.com/api-keys
- `CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID` — Chatwoot Dashboard → Profile → Access Token
- `WHATSAPP_LINK` — link de WhatsApp default usado em `{{link_whatsapp}}` nos templates de e-mail

---

## Instruções para Claude Code

> A partir daqui, este arquivo é lido pelo Claude Code do aluno e contém as instruções que você (Claude Code) deve executar quando o aluno disser "leia START.md e execute tudo". Siga rigorosamente.

Você é responsável por configurar o projeto **Agentise Leads** (boilerplate self-hosted de prospecção outbound B2B) na infraestrutura Supabase do usuário (aluno). O fluxo é interativo: pergunte uma credencial por vez, valide imediatamente, e só ao final aplique mudanças no Supabase do usuário.

### Princípios

1. **Interativo, uma pergunta por vez.** Não pedir bloco gigante de credenciais.
2. **Validar antes de prosseguir.** Toda credencial recebida deve ser testada (URL responde, anon key autentica, access token tem permissão).
3. **Nada fica em arquivo permanente até validar.** Manter credenciais em variáveis da sessão até a confirmação final.
4. **Resumo antes de aplicar.** No final, listar tudo que vai ser feito e pedir confirmação ("digite SIM para prosseguir").
5. **Mensagens curtas e claras** em pt-BR. Sem postâmbulos longos.
6. **Erros são oportunidade de retry**, não de abandono. Se uma credencial falhar validação, pedir de novo com explicação clara do que está errado.

### Pré-checagem

1. Confirmar `node --version` retorna 20+.
2. Confirmar `supabase --version` (CLI Supabase instalada). Se não estiver, instruir: `npm install -g supabase` e parar até o aluno instalar.
3. Confirmar `pwd` está na raiz do repositório `agentise-leads` (existe `package.json` com `"name": "agentise-leads"` e pasta `supabase/migrations/` com 4 arquivos `0001..0004`).
4. `git status` deve estar limpo (não obrigatório, mas alertar se sujo).
5. Ler `.env.example` na raiz e listar todas as variáveis em 3 grupos (Frontend / Edge Functions Secrets / Scripts).

### Sequência interativa

#### Passo 1 — Apresentação

Mostre ao aluno em uma única mensagem:
- Projeto detectado: `agentise-leads`
- 5 variáveis frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RESEND_FROM_EMAIL`, `VITE_RESEND_FROM_NAME`, `VITE_WHATSAPP_LINK`)
- 10 secrets de Edge Functions (CNPJA_API_KEY, APOLLO_API_KEY, RESEND_*, CHATWOOT_*, WHATSAPP_LINK)
- Aviso: "Vou pedir cada credencial uma por vez. Você pode pausar e retomar depois — nada é gravado até a confirmação final."

Aguarde "ok" / "vai" / "pode" antes de prosseguir.

#### Passo 2 — Supabase URL

Pergunte: "Cole sua Supabase URL (formato `https://xxxx.supabase.co`)."

Validação:
- Regex `^https://[a-z0-9]{20,}\.supabase\.co$`
- `curl -sI {URL}/rest/v1/ -H "apikey: dummy"` deve retornar `401` (confirma que a URL existe).

Se inválido, explicar e pedir de novo.

#### Passo 3 — Supabase anon key

Pergunte: "Cole sua Supabase anon key (JWT longo, começa com `eyJ`)."

Validação:
- Começa com `eyJ`
- `curl -s {URL}/rest/v1/ -H "apikey: {ANON_KEY}"` deve retornar `200` ou JSON válido.

#### Passo 4 — Supabase service_role key

Pergunte: "Cole sua Supabase service_role key. **Atenção:** essa chave dá acesso total ao seu banco — mantenha em sigilo."

Validação:
- Começa com `eyJ`
- Decodificar o payload do JWT (sem assinatura) e checar `role === 'service_role'`. Use:
  ```bash
  node -e "console.log(JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64').toString()))" "{KEY}"
  ```

#### Passo 5 — Supabase Project Reference

Pergunte: "Cole o Project Reference do seu projeto Supabase (20 letras minúsculas, ex.: `xhznjliwxbosunwrcaut`)."

Validação:
- Regex `^[a-z]{20}$`
- Confirmar que a URL do Passo 2 começa com `https://{REF}.supabase.co`.

#### Passo 6 — Supabase Personal Access Token

Pergunte: "Cole seu Personal Access Token Supabase (formato `sbp_...`). Crie em https://supabase.com/dashboard/account/tokens se ainda não tem."

Validação:
- Começa com `sbp_`
- Testar com Management API:
  ```bash
  curl -s https://api.supabase.com/v1/projects/{PROJECT_REF} \
    -H "Authorization: Bearer {ACCESS_TOKEN}"
  ```
  Deve retornar JSON com dados do projeto (não `401`).

Se falhar com 401, explicar: "Token sem acesso ao projeto. Verifique se o token tem escopo `All access` e se o Project Ref está correto."

#### Passo 7 — Secrets das Edge Functions

Para **cada secret** abaixo, perguntar uma a uma. Mostrar nome, descrição e link de obtenção. Permitir `pular` para deixar em branco (avisar que features dependentes daquela secret não funcionarão até configurar manualmente em Supabase Dashboard → Project Settings → Edge Functions → Secrets).

| Secret | Descrição | Onde obter | Validação |
|---|---|---|---|
| `CNPJA_API_KEY` | Consulta de CNPJ + quadro societário | https://cnpja.com (Dashboard → API Keys) | string não vazia |
| `APOLLO_API_KEY` | Enriquecimento de sócios | https://app.apollo.io/#/settings/integrations/api | string não vazia |
| `RESEND_API_KEY` | Disparo de e-mails | https://resend.com/api-keys | começa com `re_` |
| `RESEND_FROM_EMAIL` | E-mail remetente | (você define, ex.: `prospect@suaempresa.com`) | regex e-mail |
| `RESEND_FROM_NAME` | Nome remetente | (você define) | string não vazia |
| `CHATWOOT_URL` | Base URL do Chatwoot (sem barra final) | URL da sua instância Chatwoot | regex URL https |
| `CHATWOOT_API_TOKEN` | User Access Token do Chatwoot | Chatwoot → Profile → Access Token | string não vazia |
| `CHATWOOT_ACCOUNT_ID` | ID da conta no Chatwoot | URL do Chatwoot inclui o ID | número inteiro |
| `CHATWOOT_INBOX_ID` | ID da inbox de e-mail | Chatwoot → Inboxes | número inteiro |
| `WHATSAPP_LINK` | Link WhatsApp default usado em `{{link_whatsapp}}` | (você define) | regex URL https |

Para `VITE_RESEND_FROM_EMAIL`, `VITE_RESEND_FROM_NAME` e `VITE_WHATSAPP_LINK` (frontend), reutilize os mesmos valores informados acima ou pergunte separadamente. São opcionais.

#### Passo 8 — Conta gestor

1. "E-mail do gestor desta instância:" — validar regex de e-mail.
2. "Senha do gestor (mínimo 8 caracteres):" — validar comprimento.

Anotar para criar via Supabase Auth Admin API no final.

#### Passo 9 — Resumo e confirmação

Em uma única mensagem, mostre:
- ✅ Supabase URL: `https://xxx...supabase.co`
- ✅ Anon key: `eyJhbGc...` (primeiros 12 chars)
- ✅ Service role: `eyJhbGc...` (primeiros 12 chars)
- ✅ Project ref: `xhznjli...`
- ✅ Access token: `sbp_xxxx...` (primeiros 8 chars)
- ✅ Secrets configuradas: N de 10 (listar quais foram puladas, se houver)
- ✅ Gestor: `email@example.com`

Liste **as ações que serão executadas** em ordem:

1. Criar `.env` na raiz com `VITE_*`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.
2. Rodar `npm install` se `node_modules/` não existir.
3. Linkar projeto: `supabase link --project-ref {PROJECT_REF}`.
4. Aplicar migrations: `supabase db push`.
5. Deployar Edge Functions: `supabase functions deploy cnpja-lookup apollo-enrich resend-send resend-webhook chatwoot-test chatwoot-poll follow-up-send`.
6. Configurar secrets via Management API (`PATCH /v1/projects/{ref}/secrets`).
7. Criar usuário gestor via Auth Admin API.
8. Validar que o trigger `handle_new_user` promoveu para `role = 'gestor'`.

Pergunte: "Digite SIM (em maiúsculas) para executar tudo acima. Qualquer outra coisa cancela e nenhuma mudança é feita."

#### Passo 10 — Execução

Apenas se o aluno responder exatamente `SIM`:

**10.1 — Escrever `.env` local**

```bash
cat > .env <<EOF
VITE_SUPABASE_URL={URL}
VITE_SUPABASE_ANON_KEY={ANON_KEY}
VITE_RESEND_FROM_EMAIL={RESEND_FROM_EMAIL ou vazio}
VITE_RESEND_FROM_NAME={RESEND_FROM_NAME ou vazio}
VITE_WHATSAPP_LINK={WHATSAPP_LINK ou vazio}
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN}
SUPABASE_PROJECT_REF={PROJECT_REF}
EOF
```

**Não** escrever `service_role`, `CNPJA_API_KEY`, `APOLLO_API_KEY`, `RESEND_API_KEY`, `CHATWOOT_*` ou `WHATSAPP_LINK` no `.env` — essas vão direto pro Supabase via Management API. Confirmar que `.env` está no `.gitignore`.

**10.2 — `npm install` se necessário**

Se `node_modules/` não existe, rodar `npm install`.

**10.3 — Linkar projeto Supabase**

```bash
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase link --project-ref {PROJECT_REF}
```

**10.4 — Aplicar migrations**

```bash
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase db push
```

Se falhar, capturar erro e oferecer retry/abortar.

**10.5 — Deploy de Edge Functions**

```bash
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase functions deploy \
  cnpja-lookup apollo-enrich resend-send resend-webhook \
  chatwoot-test chatwoot-poll follow-up-send \
  --project-ref {PROJECT_REF}
```

**10.6 — Configurar secrets via Management API**

Para cada secret não-pulada, fazer um `PATCH`. Pode batchar todas em um único request com array:

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{PROJECT_REF}/secrets" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[{"name":"NOME","value":"VALOR"}, ...]'
```

Verificar resposta `200`. Se `401` ou outro erro, capturar e tratar.

**10.7 — Criar gestor**

```bash
curl -X POST "{SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}" \
  -H "Content-Type: application/json" \
  -d '{"email":"{EMAIL}","password":"{SENHA}","email_confirm":true}'
```

Verificar resposta `200` e que retorna `id`.

**10.8 — Validar trigger `handle_new_user`**

Aguardar 2-3 segundos. Consultar via PostgREST com a service_role:

```bash
curl -s "{SUPABASE_URL}/rest/v1/profiles?select=id,role,display_name&limit=10" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}"
```

Confirmar que existe um `profile` com `role = 'gestor'` correspondente ao e-mail criado. Se não existir, alertar (mas não falhar) — o aluno pode rodar `UPDATE public.profiles SET role = 'gestor' WHERE id = '<uuid>';` no SQL Editor.

#### Passo 11 — Relatório final

```
✅ Setup concluído!

📊 Configurado:
- Migrations aplicadas: ✅ (0001..0004)
- Edge Functions deployadas: 7 (cnpja-lookup, apollo-enrich, resend-send, resend-webhook, chatwoot-test, chatwoot-poll, follow-up-send)
- Secrets configuradas: N de 10 (lista quais)
- Gestor criado: {email}

📋 Próximos passos:

1. Deploy do frontend na Vercel:
   - Acesse https://vercel.com/new
   - Importe seu fork
   - Em Environment Variables, preencha:
     • VITE_SUPABASE_URL = {URL}
     • VITE_SUPABASE_ANON_KEY = {ANON_KEY}
     • VITE_RESEND_FROM_EMAIL = {valor ou vazio}
     • VITE_RESEND_FROM_NAME = {valor ou vazio}
     • VITE_WHATSAPP_LINK = {valor ou vazio}
   - Clique em Deploy
   - Aguarde ~2 minutos

2. Acesse a URL gerada pela Vercel.
3. Faça login com o e-mail e senha de gestor que você acabou de criar.
4. Pronto — você tem sua instância rodando!

⚠️ Lembretes:
- As secrets de Edge Functions ficaram no Supabase Dashboard.
  Para alterar depois: Project Settings → Edge Functions → Secrets.
- Suas variáveis VITE_* ficaram no .env local (gitignored) e na Vercel.
- Se você pulou alguma secret, configure-a manualmente em Supabase
  Dashboard antes de usar a feature correspondente.

Em caso de problema, abra issue em https://github.com/{upstream-owner}/agentise-leads.
```

### Tratamento de erros gerais

- Em qualquer falha, mostrar erro completo e oferecer 3 opções: retry, pular esta etapa, abortar tudo.
- Antes do passo 10.1: nenhuma mudança foi feita, pode rodar de novo do zero.
- Entre 10.1 e 10.6: pode ter `.env` local criado e parcialmente migrations aplicadas — avisar o aluno do estado.
- Depois de 10.6: instância parcialmente configurada — melhor terminar manualmente.

### Princípio final

Você está tocando na infra de produção do aluno. **Cuidado, transparência e confirmação explícita** são mais importantes que velocidade.
