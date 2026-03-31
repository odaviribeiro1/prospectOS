# CLAUDE.md — Agentise Leads

## Sobre o Projeto

Agentise Leads é uma plataforma de prospecção outbound B2B que cobre o ciclo completo: consulta de CNPJ em lote, enriquecimento de leads via Apollo.io, disparo manual de e-mails via Resend, integração com Chatwoot para gestão de respostas e sequências de follow-up automatizadas.

**Empresa:** Agentise (agentise.com.br)
**Responsável:** Davi
**Idioma da interface:** Português Brasileiro (PT-BR) — toda label, placeholder, mensagem de erro, toast e texto da UI deve estar em português.

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
│   └── settings/        # Componentes de configurações
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
├── resend-send/         # Disparo de email via Resend (Fase 2)
├── resend-webhook/      # Webhook de eventos Resend (Fase 2)
├── chatwoot-sync/       # Polling de labels Chatwoot (Fase 3)
└── follow-up-checker/   # Verificação de follow-ups pendentes (Fase 3)
```

---

## Documentação do Produto

O PRD completo está em `docs/PRD.md`. Consulte este arquivo antes de implementar qualquer feature nova para garantir alinhamento com a arquitetura, integrações e regras de negócio definidas.

---

## Módulos e Fases

### Fase 1 — MVP (atual)
- **Settings:** Configuração de API keys (CNPJá, Apollo, Resend, Chatwoot, WhatsApp)
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

### Tabelas Principais

- `settings` — API keys e configurações por usuário (RLS por user_id)
- `batches` — Lotes de consulta CNPJ com filtros e progresso
- `companies` — Empresas consultadas com dados da CNPJá e flag de qualificação
- `partners` — Sócios das empresas (quadro societário)
- `lead_lists` — Listas de leads enriquecidos com numeração sequencial
- `enriched_leads` — Leads enriquecidos com dados do Apollo
- `email_campaigns` — Campanhas de email (Fase 2)
- `email_sends` — Envios individuais com tracking de status (Fase 2)
- `follow_up_sequences` — Sequências de follow-up (Fase 3)
- `follow_up_steps` — Passos de cada sequência (Fase 3)
- `follow_up_enrollments` — Leads inscritos em sequências (Fase 3)

### Regras

- RLS habilitado em TODAS as tabelas com policy baseada em `auth.uid() = user_id`
- API keys armazenadas com criptografia (Supabase Vault ou pgcrypto)
- Índices em: cnpj, batch_id, list_id, campaign_id, lead_id, status
- Paginação cursor-based em tabelas com mais de 50 registros
- O SQL completo das migrations está em `database.sql` na raiz do projeto

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

```env
# .env.local (NÃO commitar)
VITE_SUPABASE_URL=https://wpagibinplbxehgsuvkt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwYWdpYmlucGxieGVoZ3N1dmt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjMyODUsImV4cCI6MjA4OTQzOTI4NX0.kEth9s4vMgPwABXAv9PyS2e-GDnwu0KRl0HMhmTTqcA

# Supabase Edge Functions (configurar no dashboard)
SUPABASE_URL=https://wpagibinplbxehgsuvkt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwYWdpYmlucGxieGVoZ3N1dmt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg2MzI4NSwiZXhwIjoyMDg5NDM5Mjg1fQ.vZs8R4oHnX7hnhf1TV0DSSKOPJ22XNTXq4BQJScAppE
```

As API keys do CNPJá, Apollo, Resend e Chatwoot ficam no banco (tabela `settings`), NUNCA em variáveis de ambiente do frontend.

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
supabase functions deploy cnpja-lookup
supabase functions deploy apollo-enrich

# Rodar migrations
# Copiar conteúdo de database.sql e executar no SQL Editor do Supabase
```