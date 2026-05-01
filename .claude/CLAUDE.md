# CLAUDE.md — Agentise Leads

## Sobre o Projeto

Agentise Leads é um **boilerplate open source self-hosted** de prospecção outbound B2B mantido pela Agentise. Cobre o ciclo completo: consulta de CNPJ em lote, enriquecimento de leads via Apollo.io, disparo manual de e-mails via Resend, integração com Chatwoot para gestão de respostas e sequências de follow-up automatizadas. Cada instância pertence a um único cliente — não há multi-tenancy, billing nem white-label dinâmico.

**Mantenedor:** Agentise (agentise.com.br) — Davi
**Modelo:** open source self-hosted (uma instância = um cliente)
**Idioma da interface:** Português Brasileiro (PT-BR) — toda label, placeholder, mensagem de erro, toast e texto da UI deve estar em português.

### Roles

A instância tem dois níveis de acesso, definidos no enum `public.user_role`:

- **`gestor`** — vê e edita todos os dados da instância. O **primeiro usuário** registrado vira `gestor` automaticamente via trigger `handle_new_user`.
- **`operacional`** — vê e edita apenas as linhas que ele criou (`auth.uid() = user_id`).

Toda policy RLS segue o padrão `auth.uid() = user_id OR public.is_gestor()`. Promoção/rebaixamento é feito manualmente via SQL (`UPDATE public.profiles SET role = 'gestor' WHERE id = '<uuid>'`) — não há UI de administração de usuários.

---

## Stack Técnica

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS 3 + tailwindcss-animate
- **Componentes:** shadcn/ui (Radix primitives)
- **Roteamento:** React Router DOM v6
- **State:** Zustand (global) + TanStack Query (server state)
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, Realtime)
- **Formulários:** React Hook Form + Zod
- **Tabelas:** @tanstack/react-table
- **Ícones:** Lucide React
- **Toasts:** Sonner
- **Deploy:** Vercel (frontend) + Supabase Cloud (backend)

---

## Design System

### Fonte

Instrument Sans (Google Fonts, pesos 400-700). Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif. Alternativas configuráveis: Inter, Roboto, Poppins, DM Sans.

### Cores (CSS Variables HSL)

O app é **dark mode only** — classe `.dark` sempre ativa no `<html>`. Não implementar toggle de tema.

```
Background:          240 10% 3.9%      (quase preto)
Foreground:          0 0% 98%          (branco)
Primary/Accent:      211 75% 52%       (azul ~#3B82F6)
Destructive:         0 62.8% 30.6%     (vermelho escuro)
Muted/Border/Input:  240 3.7% 15.9%    (cinza escuro)
Sidebar BG:          213 54% 15%       (azul escuro marinho)
Sidebar FG:          0 0% 85%          (cinza claro)
Sidebar Border:      213 54% 20%       (azul marinho claro)
```

### Cores de Status (classes Tailwind diretas)

- Sucesso/Qualificada: `emerald-400` com bg `emerald-400/10`
- Pendente/Alerta: `amber-400` com bg `amber-400/10`
- Erro/Descartada: `red-400` com bg `red-400/10`
- Info/Processando: `blue-400` com bg `blue-400/10`

### Visual

- Border radius base: 0.5rem
- Animações: tailwindcss-animate
- Efeitos: ambient glow em elementos primários, dot grid background na landing/login

---

## Arquitetura do Projeto

### Estrutura de Pastas

```
src/
├── components/
│   ├── ui/              # shadcn/ui
│   ├── layout/          # AppLayout, Sidebar, Header
│   ├── cnpj/            # Componentes do módulo CNPJ
│   ├── enrichment/      # Componentes de enriquecimento
│   ├── leads/           # Componentes de listas e leads
│   ├── campaigns/       # Componentes de campanhas de email
│   ├── followup/        # Componentes de follow-up
│   └── dashboard/       # Componentes do dashboard
├── pages/               # Páginas (uma por rota)
├── hooks/               # Custom hooks (um por domínio)
├── lib/                 # Clientes, utils, validators
├── stores/              # Zustand stores
├── types/               # Tipos TypeScript centralizados
└── routes/              # Definição de rotas
```

### Edge Functions (Supabase)

```
supabase/functions/
├── cnpja-lookup/        # Proxy para API CNPJá
├── apollo-enrich/       # Enriquecimento via Apollo.io
├── resend-send/         # Disparo de email via Resend
├── resend-webhook/      # Webhook de eventos Resend
├── chatwoot-test/       # Teste de conexão Chatwoot
├── chatwoot-poll/       # Polling de labels Chatwoot
└── follow-up-send/      # Envio de passo de follow-up
```

Todas as Edge Functions leem suas API keys diretamente de `Deno.env.get(...)` — configuradas como secrets no Supabase (Settings → Edge Functions → Environment Variables). Nenhuma key trafega pelo browser.

---

## Documentação do Produto

O PRD completo está em `docs/PRD.md`. Consulte este arquivo antes de implementar qualquer feature nova para garantir alinhamento com a arquitetura, integrações e regras de negócio definidas.

---

## Módulos e Fases

### Fase 1 — MVP (atual)
- **Consulta CNPJ:** Entrada de CNPJs em lote, filtros de qualificação (regime tributário + porte), processamento via CNPJá com rate-limit handling
- **Empresas:** Listagem com tabela, filtros, detalhamento, seleção para enriquecimento
- **Enriquecimento:** Apollo.io para dados de sócios (email, LinkedIn, cargo, telefone)
- **Listas:** Geração automática com título sequencial `#N Leads Enriquecidos - DD/MM/YY HH:mm`
- **Revisão:** Aprovação/rejeição individual e em massa de leads enriquecidos

### Fase 2 — Outreach
- **Campanhas de E-mail:** Templates com variáveis ({{nome}}, {{empresa}}, {{link_whatsapp}}), disparo MANUAL via Resend
- **Métricas:** Taxa de entrega, abertura, resposta, bounce (via webhooks Resend)
- **Integração Chatwoot:** Criação de contatos no Chatwoot ao enviar email

### Fase 3 — Follow-up
- **Sequências:** Builder de passos com delay configurável e condições (não respondeu, não abriu)
- **Painel de Pendentes:** Lista de follow-ups prontos para envio manual
- **Remoção Automática:** Polling no Chatwoot (60s) para detectar label `resposta_negativa` e remover lead da sequência

---

## Integrações Externas

| Serviço | Uso | Autenticação | Docs |
|---------|-----|-------------|------|
| CNPJá | Consulta dados de CNPJ + quadro societário | API Key (header Authorization) | https://cnpja.com/docs |
| Apollo.io | Enriquecimento: email, LinkedIn, cargo, telefone | API Key (header X-Api-Key) | https://apolloio.github.io/apollo-api-docs |
| Resend | Disparo de emails + webhooks de eventos | Bearer Token | https://resend.com/docs |
| Chatwoot | Gestão de respostas, labels, contatos | User Access Token | https://www.chatwoot.com/developers/api |

---

## Banco de Dados

### Migrations

Todas as migrations estão em `supabase/migrations/`, aplicadas em ordem:

1. `0001_init.sql` — schema base (14 tabelas de domínio, RLS, helpers, realtime publication).
2. `0002_profiles_and_roles.sql` — tabela `profiles`, enum `user_role`, helper `is_gestor()` e trigger `handle_new_user` (primeiro registrado vira gestor).
3. `0003_rls_role_aware.sql` — atualiza policies RLS de todas as tabelas para `auth.uid() = user_id OR public.is_gestor()`.
4. `0004_drop_settings_table.sql` — remove a tabela `settings` (BYOK em texto plano substituído por `.env` das Edge Functions).

### Tabelas Principais

- `profiles` — perfil 1:1 com `auth.users`, contém o `role` (`gestor` | `operacional`)
- `batches` — Lotes de consulta CNPJ com filtros e progresso
- `companies` — Empresas consultadas com dados da CNPJá e flag de qualificação
- `partners` — Sócios das empresas (quadro societário)
- `lead_lists` — Listas de leads enriquecidos com numeração sequencial
- `enriched_leads` — Leads enriquecidos com dados do Apollo
- `email_campaigns` — Campanhas de email
- `email_sends` — Envios individuais com tracking de status
- `follow_up_sequences` — Sequências de follow-up
- `follow_up_steps` — Passos de cada sequência
- `follow_up_enrollments` — Leads inscritos em sequências

### Regras

- RLS habilitado em TODAS as tabelas com policy `auth.uid() = user_id OR public.is_gestor()`
- API keys de integrações ficam em **env vars das Edge Functions** (`Deno.env.get`), nunca no banco nem no browser
- Índices em: cnpj, batch_id, list_id, campaign_id, lead_id, status
- Paginação cursor-based em tabelas com mais de 50 registros
- Realtime habilitado em `email_sends`, `batches`, `follow_up_enrollments`, `follow_up_activity_log`

---

## Regras de Negócio Críticas

### Filtros de Qualificação (CNPJ)
Empresas SÓ avançam para enriquecimento se passarem nos dois filtros definidos pelo usuário:
1. Regime tributário (Simples, Lucro Real, Lucro Presumido)
2. Porte (ME, EPP, Médio Porte, Grande Porte)

### Listas de Leads
Título obrigatório no formato: `#N Leads Enriquecidos - DD/MM/YY HH:mm` onde N é sequencial por usuário.

### Disparo de Email
SEMPRE manual. Nunca implementar envio automático ou agendado. O humano DEVE clicar para enviar.

### Follow-up — Remoção Automática
Polling de 60s no Chatwoot verificando a label `resposta_negativa` no contato. Se encontrada, remove o lead da sequência automaticamente. A label é atribuída por IA externa no Chatwoot, NÃO pela plataforma.

### Sem Agente de IA
A plataforma NÃO tem agente de IA interno. Não implementar chatbot, IA conversacional ou assistente virtual dentro da ferramenta.

---

## Convenções de Código

- **TypeScript estrito:** Sem `any`. Tipar tudo corretamente.
- **Componentes:** Funcionais com hooks. Arquivos pequenos e focados.
- **Hooks customizados:** Um hook por domínio (useBatch, useCompanies, useLeadLists, etc.)
- **Imports:** Paths absolutos via alias `@/` configurado no Vite
- **Nomenclatura:** camelCase para variáveis/funções, PascalCase para componentes/tipos
- **Erros:** Try/catch em toda chamada de API com toast de erro amigável em PT-BR
- **Loading states:** Skeleton loaders em tabelas, spinners em botões, progress bars em processamentos
- **Responsividade:** Mobile-first, sidebar colapsável em telas menores

---

## Variáveis de Ambiente

A lista canônica está em `.env.example`. Resumo:

### Frontend (`.env.local`, prefixo `VITE_`, públicas)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_RESEND_FROM_EMAIL=     # default exibido em formulários de campanha
VITE_RESEND_FROM_NAME=
VITE_WHATSAPP_LINK=         # default do template {{link_whatsapp}}
```

### Edge Functions (configurar como secrets no Supabase)

Settings → Edge Functions → Environment Variables, ou `supabase secrets set NOME=valor`:

```
CNPJA_API_KEY
APOLLO_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_FROM_NAME
CHATWOOT_URL
CHATWOOT_API_TOKEN
CHATWOOT_ACCOUNT_ID
CHATWOOT_INBOX_ID
WHATSAPP_LINK
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pela plataforma nas Edge Functions — não precisam ser configuradas manualmente.

**Regra crítica:** nenhuma API key de integração (CNPJá, Apollo, Resend, Chatwoot) trafega pelo browser. Todo acesso a essas APIs é proxiado via Edge Functions.

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Deploy Edge Functions
supabase functions deploy cnpja-lookup apollo-enrich resend-send resend-webhook chatwoot-test chatwoot-poll follow-up-send

# Rodar migrations
supabase link --project-ref <project-ref>
supabase db push
# (ou colar 0001..0004 manualmente no SQL Editor, em ordem)
```