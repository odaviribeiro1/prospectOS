# Rotation Checklist

> **Atenção:** as credenciais abaixo apareceram em arquivos do repositório local (`.env.local` e `.env.functions`, ambos nunca trackeados pelo Git, mas existentes em disco). Embora elas nunca tenham sido publicadas no GitHub, rotacioná-las é boa prática — credenciais que estiveram em disco local podem ter sido capturadas por backups, sincronizações de cloud, ferramentas de busca de código, etc.
>
> Rotacione cada uma nos respectivos painéis dos providers antes de considerar o repositório seguro para distribuição como boilerplate público.

## Credenciais a rotacionar

### Supabase Anon Key (projeto `wpagibinplbxehgsuvkt`)

- **Onde apareceu:** `.env.local` linha 8 — `VITE_SUPABASE_ANON_KEY=eyJh...TqcA` (truncada)
- **Onde rotacionar:** Supabase Dashboard → Project Settings → API → **Roll JWT secret**
- **Passo a passo:**
  1. Acesse https://supabase.com/dashboard/project/wpagibinplbxehgsuvkt/settings/api
  2. Em **JWT Settings**, clique em **Generate a new JWT secret**.
  3. Confirme — isso invalida tanto a `anon` quanto a `service_role` antigas.
  4. Copie a nova `anon public` key e atualize:
     - Vercel → Settings → Environment Variables → `VITE_SUPABASE_ANON_KEY`
     - `.env.local` (apenas para dev local — não trackeado)
  5. Refaça o deploy do frontend na Vercel.

### Supabase Service Role Key (projeto `wpagibinplbxehgsuvkt`)

- **Onde apareceu:** `.env.functions` linha 1 — `SERVICE_ROLE_KEY=eyJh...AppE` (truncada)
- **Onde rotacionar:** mesma operação acima (rolar o JWT secret invalida ambas as keys de uma vez).
- **Passo a passo (após rolar o JWT):**
  1. Copie a nova `service_role` key do mesmo painel.
  2. A plataforma Supabase já injeta `SUPABASE_SERVICE_ROLE_KEY` automaticamente nas Edge Functions — após rolar o JWT, as funções passam a receber a nova key sem ação manual.
  3. Confirme deletando `.env.functions` do disco local (não é mais necessário — Edge Functions leem direto do ambiente do Supabase).

### Project URL (projeto `wpagibinplbxehgsuvkt`)

- **Onde apareceu:** `.env.local` linha 7 — `VITE_SUPABASE_URL=https://wpagibinplbxehgsuvkt.supabase.co` e `docs/QA_FASE6.md` linha 12 (referência textual)
- **Comentário:** o Project URL/Reference ID por si só **não é credencial** — é um identificador público que aparece em qualquer chamada de API. Não precisa ser rotacionado. Ele só vira sensível em conjunto com uma key válida; ao rotacionar o JWT secret acima, qualquer URL+key vazada perde validade.

## Verificação final

Após rotacionar:

1. Faça um login no app deployado e confirme que o auth funciona.
2. Dispare uma Edge Function (ex.: testar conexão Chatwoot em /settings da UI antiga, ou disparar um e-mail de teste) e confirme que continua respondendo.
3. Apague `.env.functions` do disco local (`rm .env.functions`) — ele não é mais necessário no fluxo open source self-hosted, já que as Edge Functions leem `SUPABASE_SERVICE_ROLE_KEY` direto do ambiente Supabase.
4. Atualize `.env.local` com os novos valores e siga o `Modo dev` do README.
