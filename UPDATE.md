# UPDATE — Atualizar sua instância

> Use este arquivo sempre que quiser puxar a versão mais recente do projeto upstream e aplicá-la na sua instância.

## Como usar

1. No GitHub, vá no seu fork e clique em **"Sync fork"** (botão no topo) — isso traz os commits novos do upstream para sua main.
2. No terminal, dentro da pasta do projeto: `git pull`
3. Abra Claude Code: `claude`
4. Digite na sessão: **"Leia o arquivo UPDATE.md e execute tudo"**
5. Aguarde — Claude Code aplica migrations novas, redeploya Edge Functions e valida.

A Vercel detecta o push na main do fork e redeploya o frontend automaticamente.

---

## Instruções para Claude Code

> A partir daqui, este arquivo é lido pelo Claude Code do aluno e contém as instruções que você (Claude Code) deve executar quando o aluno disser "leia UPDATE.md e execute tudo".

Você está atualizando uma instância já configurada deste projeto **Agentise Leads**. Pré-requisitos:
- Existe `.env` na raiz com `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` válidos (criados no setup inicial via START.md).
- `supabase` CLI instalada (`supabase --version` deve responder).

### Pré-checagem

1. Confirmar que `.env` existe e contém `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF`. Se faltar, instruir o aluno a rodar START.md primeiro.
2. `git status` deve estar limpo. Se tiver modificações locais fora de `src/customizations/`, alertar e pedir orientação.
3. Mostrar ao aluno os commits novos puxados desde o último update: `git log HEAD@{1}..HEAD --oneline` (silenciar erro se reflog não tiver entrada anterior).
4. Ler `.env.example` atualizado e detectar secrets novas (no grupo "Edge Functions Secrets") em comparação com o `.env` local atual.

### Sequência

1. **Aplicar migrations novas:**
   ```bash
   set -a && source .env && set +a
   supabase link --project-ref "$SUPABASE_PROJECT_REF"
   supabase db push
   ```
   Mostrar saída. Se nenhuma migration nova, ok.

2. **Redeploy Edge Functions:**
   ```bash
   supabase functions deploy \
     cnpja-lookup apollo-enrich resend-send resend-webhook \
     chatwoot-test chatwoot-poll follow-up-send \
     create-invite revoke-invite \
     --project-ref "$SUPABASE_PROJECT_REF"
   ```
   Detectar dinamicamente as funções listando `ls supabase/functions/` (ignorando diretórios `_shared` ou similares iniciando com `_`). Mostrar saída.

3. **Verificar secrets necessárias:**
   - Listar todas as secrets do `.env.example` no grupo "Edge Functions Secrets".
   - Para cada secret nova (não presente no setup anterior), perguntar ao aluno se quer configurá-la agora.
   - Configurar via Management API:
     ```bash
     curl -X PATCH "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/secrets" \
       -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
       -H "Content-Type: application/json" \
       -d '[{"name":"NOME","value":"VALOR"}]'
     ```
   - Se o aluno pular, avisar quais features dependentes ficam offline.

4. **Resumo final:** listar:
   - Migrations aplicadas
   - Edge Functions redeployadas (e quais falharam, se algo)
   - Secrets configuradas neste update
   - Próximos passos (a Vercel vai redeployar o frontend sozinha em ~2 minutos)

### Tratamento de erros

- Migration falha → mostrar erro completo, NÃO continuar para Edge Functions, pedir orientação ao aluno.
- Edge Function falha → tentar deployar individualmente as que falharam, reportar quais ficaram pendentes.
- Sem permissão na Management API (401) → instruir o aluno a verificar `SUPABASE_ACCESS_TOKEN` no `.env` (pode ter expirado ou perdido escopo).

### Princípio

Você está mexendo em produção do aluno. Cuidado e transparência > velocidade.
