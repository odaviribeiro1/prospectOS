# PRD — Agentise Lead Generation & Outreach Platform

**Produto:** Agentise Leads  
**Autor:** Davi — Agentise  
**Versão:** 1.0  
**Data:** 25/03/2026  
**Status:** Draft  

---

## 1. Visão Geral do Produto

### 1.1 Problema

Empresas B2B no Brasil enfrentam um processo manual, fragmentado e demorado para prospecção outbound. A coleta de dados públicos de CNPJ, o enriquecimento com dados de contato dos sócios e o disparo de abordagens via e-mail são feitos em ferramentas separadas, sem rastreabilidade nem automação de follow-up. Isso resulta em baixa eficiência comercial e perda de oportunidades.

### 1.2 Solução

Uma plataforma web unificada que cobre o ciclo completo de prospecção outbound:

1. **Consulta em lote de CNPJs** via API CNPJá com filtros de qualificação (regime tributário e porte).
2. **Enriquecimento automático** dos sócios das empresas qualificadas via API Apollo.io (LinkedIn, e-mail, cargo, telefone).
3. **Disparo manual de e-mails** personalizados via Resend, com métricas de entrega, abertura e resposta.
4. **Integração bidirecional com Chatwoot** (self-hosted) para gestão das respostas no canal de e-mail.
5. **Sequências de follow-up** configuráveis com regras de tempo e remoção automática de leads com resposta negativa.

### 1.3 Público-alvo

- Operadores comerciais e SDRs da Agentise e seus clientes B2B.
- Gestores de vendas que precisam de visibilidade sobre o pipeline de prospecção.

### 1.4 Princípios de Design

- **Human-in-the-loop**: Toda ação de disparo é manual. A ferramenta sugere, o humano decide.
- **Transparência de dados**: O usuário sempre vê de onde veio cada dado e o status de cada lead.
- **Compliance**: Respeito ao rate-limit das APIs, boas práticas de envio de e-mail e tratamento de opt-out.

---

## 2. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS + tailwindcss-animate |
| Componentes UI | shadcn/ui (Radix primitives) |
| Fonte | Instrument Sans (Google Fonts, 400-700) + fallback system |
| Backend / BaaS | Supabase (Auth, Database, Edge Functions, Realtime) |
| Disparo de E-mail | Resend (API REST) |
| Consulta CNPJ | CNPJá (API REST) |
| Enriquecimento | Apollo.io (API REST — People Enrichment endpoint) |
| Gestão de Respostas | Chatwoot (self-hosted, API REST + Webhooks) |
| Deploy Frontend | Vercel |
| Deploy Backend | Supabase Cloud (ou self-hosted via EasyPanel) |

---

## 3. Design System

### 3.1 Paleta de Cores (CSS Variables — HSL)

```css
:root {
  /* Modo Escuro (padrão — classe .dark no <html>) */
  --background: 240 10% 3.9%;       /* quase preto */
  --foreground: 0 0% 98%;           /* branco */
  --primary: 211 75% 52%;           /* azul médio ~#3B82F6 */
  --accent: 211 75% 52%;            /* mesmo azul */
  --destructive: 0 62.8% 30.6%;     /* vermelho escuro */
  --muted: 240 3.7% 15.9%;          /* cinza escuro */
  --border: 240 3.7% 15.9%;         /* cinza escuro */
  --input: 240 3.7% 15.9%;          /* cinza escuro */

  /* Sidebar */
  --sidebar-background: 213 54% 15%;  /* azul escuro marinho */
  --sidebar-foreground: 0 0% 85%;     /* cinza claro */
  --sidebar-border: 213 54% 20%;      /* azul marinho mais claro */

  /* Status / Badges (hardcoded) */
  --status-success: emerald;    /* verde — sucesso, prioridade baixa */
  --status-warning: amber;      /* amarelo — suporte, prioridade média */
  --status-danger: red;         /* vermelho — prioridade alta, destrutivo */
  --status-info: blue;          /* azul — demos */
}
```

### 3.2 Tipografia

- **Fonte principal:** Instrument Sans (Google Fonts, pesos 400–700)
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Alternáveis via Design Settings:** Inter, Roboto, Poppins, DM Sans

### 3.3 Espaçamento e Forma

- **Border radius base:** `0.5rem`
- **Dark mode:** ativado via classe `.dark` no `<html>`
- **Animações:** plugin `tailwindcss-animate`
- **Efeitos visuais:** ambient glow, dot grid background na landing page

---

## 4. Arquitetura de Dados (Supabase)

### 4.1 Tabelas Principais

#### `companies`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| cnpj | text (unique) | CNPJ formatado |
| razao_social | text | Razão social |
| nome_fantasia | text | Nome fantasia |
| regime_tributario | enum | `simples`, `lucro_real`, `lucro_presumido` |
| porte | enum | `me`, `epp`, `medio`, `grande` |
| situacao_cadastral | text | Ativa, Baixada, etc. |
| cnae_principal | text | Código CNAE principal |
| cnae_descricao | text | Descrição do CNAE |
| endereco | jsonb | Endereço completo (logradouro, cidade, UF, CEP) |
| raw_data | jsonb | Payload completo da CNPJá (fallback) |
| qualified | boolean | Passou nos filtros de regime + porte |
| created_at | timestamptz | Data de inserção |
| batch_id | uuid (FK) | Referência ao lote de consulta |

#### `partners` (Quadro Societário)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| company_id | uuid (FK) | Referência a `companies` |
| nome | text | Nome completo do sócio |
| qualificacao | text | Qualificação (ex: Sócio-Administrador) |
| cpf_masked | text | CPF mascarado retornado pela CNPJá |
| created_at | timestamptz | Data de inserção |

#### `enriched_leads`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| partner_id | uuid (FK) | Referência a `partners` |
| company_id | uuid (FK) | Referência a `companies` |
| list_id | uuid (FK) | Referência a `lead_lists` |
| nome | text | Nome completo |
| email | text | E-mail retornado pelo Apollo |
| email_type | text | `corporate` ou `personal` |
| linkedin_url | text | URL do perfil LinkedIn |
| cargo | text | Cargo atual |
| telefone | text | Telefone (quando disponível) |
| empresa_nome | text | Nome da empresa (Apollo) |
| apollo_raw | jsonb | Payload completo do Apollo |
| status | enum | `pending_review`, `approved`, `rejected`, `contacted`, `responded`, `negative_response`, `converted` |
| created_at | timestamptz | Data de inserção |

#### `lead_lists`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| sequential_number | integer | Numeração sequencial (#1, #2, #3...) |
| title | text | Título formatado: `#N Leads Enriquecidos - DD/MM/YY HH:mm` |
| total_leads | integer | Total de leads na lista |
| reviewed | boolean | Se a revisão humana foi concluída |
| reviewed_at | timestamptz | Data/hora da revisão |
| reviewed_by | uuid (FK) | Usuário que revisou |
| created_at | timestamptz | Data de criação |

#### `batches`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| name | text | Nome descritivo do lote |
| cnpjs | text[] | Array de CNPJs submetidos |
| total | integer | Total de CNPJs no lote |
| processed | integer | Quantos já foram processados |
| qualified | integer | Quantos passaram nos filtros |
| filter_regime | text[] | Regimes selecionados como filtro |
| filter_porte | text[] | Portes selecionados como filtro |
| status | enum | `pending`, `processing`, `completed`, `error` |
| created_at | timestamptz | Data de criação |

#### `email_campaigns`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| list_id | uuid (FK) | Lista de leads alvo |
| subject | text | Assunto do e-mail |
| body_template | text | Template do corpo com variáveis |
| variables_schema | jsonb | Schema das variáveis disponíveis |
| from_name | text | Nome do remetente |
| from_email | text | E-mail do remetente (domínio Resend) |
| status | enum | `draft`, `sending`, `completed` |
| created_at | timestamptz | Data de criação |
| sent_at | timestamptz | Quando o disparo foi iniciado |

#### `email_sends`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| campaign_id | uuid (FK) | Referência à campanha |
| lead_id | uuid (FK) | Referência ao lead |
| resend_id | text | ID do envio no Resend |
| to_email | text | E-mail de destino |
| status | enum | `queued`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `complained` |
| sent_at | timestamptz | Momento do envio |
| delivered_at | timestamptz | Momento da entrega |
| opened_at | timestamptz | Momento da primeira abertura |
| replied_at | timestamptz | Momento da resposta (via Chatwoot) |
| created_at | timestamptz | Data de criação |

#### `follow_up_sequences`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| name | text | Nome da sequência |
| description | text | Descrição |
| is_active | boolean | Sequência ativa ou pausada |
| created_at | timestamptz | Data de criação |

#### `follow_up_steps`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| sequence_id | uuid (FK) | Referência à sequência |
| step_order | integer | Ordem do passo (1, 2, 3...) |
| delay_value | integer | Valor do intervalo |
| delay_unit | enum | `hours`, `days` |
| subject | text | Assunto do follow-up |
| body_template | text | Template do corpo com variáveis |
| condition_type | enum | `no_reply`, `no_open`, `custom` |
| created_at | timestamptz | Data de criação |

#### `follow_up_enrollments`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| sequence_id | uuid (FK) | Referência à sequência |
| lead_id | uuid (FK) | Referência ao lead |
| campaign_id | uuid (FK) | Campanha de origem |
| current_step | integer | Passo atual na sequência |
| status | enum | `active`, `completed`, `removed_negative`, `removed_manual`, `paused` |
| enrolled_at | timestamptz | Data de inscrição |
| last_step_sent_at | timestamptz | Último follow-up enviado |
| removed_at | timestamptz | Data de remoção (se aplicável) |
| removal_reason | text | Motivo da remoção |

#### `settings`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador interno |
| user_id | uuid (FK) | Usuário dono das configurações |
| resend_api_key | text (encrypted) | API Key do Resend |
| resend_from_email | text | E-mail de envio configurado no Resend |
| resend_from_name | text | Nome de exibição no Resend |
| apollo_api_key | text (encrypted) | API Key do Apollo.io |
| cnpja_api_key | text (encrypted) | API Key da CNPJá |
| chatwoot_url | text | URL base da instância Chatwoot |
| chatwoot_api_token | text (encrypted) | Token de acesso da API Chatwoot |
| chatwoot_account_id | integer | ID da conta no Chatwoot |
| chatwoot_inbox_id | integer | ID da inbox de e-mail no Chatwoot |
| negative_response_polling_interval | integer | Intervalo de polling em segundos (default: 60) |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última atualização |

### 4.2 Políticas RLS (Row Level Security)

Todas as tabelas terão RLS habilitado com policies baseadas em `auth.uid()`, garantindo que cada usuário só veja e manipule seus próprios dados. A tabela `settings` terá criptografia a nível de coluna para campos sensíveis (API keys e tokens) usando `pgcrypto` ou Supabase Vault.

---

## 5. Features Detalhadas

### 5.1 Módulo 1 — Consulta de CNPJ em Lote

#### 5.1.1 Descrição

O usuário insere uma lista de CNPJs (via textarea ou upload de CSV/TXT) e a ferramenta consulta cada CNPJ na API da CNPJá, respeitando o rate-limit. Antes de executar a consulta, o usuário define os filtros de qualificação que serão aplicados automaticamente.

#### 5.1.2 Tela: Consulta em Lote

**Elementos da interface:**

- **Área de entrada de CNPJs:**
  - Textarea para colar CNPJs (um por linha, aceita com ou sem formatação).
  - Botão "Upload CSV/TXT" para importar arquivo.
  - Contador em tempo real: "X CNPJs detectados".
  - Validação instantânea de formato (14 dígitos, dígitos verificadores).

- **Painel de Filtros de Qualificação:**
  - **Regime Tributário** (multi-select checkbox): Simples Nacional, Lucro Real, Lucro Presumido.
  - **Porte da Empresa** (multi-select checkbox): ME, EPP, Médio Porte, Grande Porte.
  - Tooltip explicativo: "Somente empresas que corresponderem a TODOS os filtros selecionados avançarão para a etapa de enriquecimento."

- **Botão "Iniciar Consulta"**: Cria o batch e inicia o processamento.

- **Barra de progresso do lote:**
  - Progresso geral: "45/120 CNPJs processados".
  - Badge de qualificados: "18 empresas qualificadas".
  - Badge de descartados: "27 empresas fora dos filtros".
  - Badge de erros: "0 erros de API".
  - Estimativa de tempo restante baseada no rate-limit configurado.

#### 5.1.3 Integração CNPJá

**Endpoint:** `GET https://api.cnpja.com/office/{cnpj}`

**Headers:**
```
Authorization: {cnpja_api_key}
```

**Rate Limiting:**
- O sistema lê o header `X-RateLimit-Remaining` da resposta.
- Quando o remaining chegar a 0, pausa até o timestamp do header `X-RateLimit-Reset`.
- Progress bar mostra status: "Aguardando rate-limit reset... (retomando em Xs)".

**Dados extraídos e mapeados:**

| Dado CNPJá | Campo Local |
|---|---|
| `company.name` | `companies.razao_social` |
| `alias` | `companies.nome_fantasia` |
| `taxRegime` | `companies.regime_tributario` |
| `company.size` | `companies.porte` |
| `status.text` | `companies.situacao_cadastral` |
| `mainActivity.id` + `.text` | `companies.cnae_principal` + `cnae_descricao` |
| `address.*` | `companies.endereco` (jsonb) |
| `company.members[]` | iterado para criar registros em `partners` |

**Lógica de filtragem:**

```
SE company.taxRegime IN filtros_regime_selecionados
   E company.size IN filtros_porte_selecionados
ENTÃO qualified = true
SENÃO qualified = false
```

Apenas empresas com `qualified = true` ficam disponíveis para enriquecimento.

#### 5.1.4 Tela: Resultado do Lote

**Elementos da interface:**

- **Tabela de empresas consultadas** com colunas: CNPJ, Razão Social, Regime, Porte, Situação, Sócios (count), Status (Qualificada / Descartada).
- **Filtros inline** para visualizar apenas qualificadas ou descartadas.
- **Ação em massa:** "Enviar qualificadas para enriquecimento" → dispara o Módulo 2.
- **Detalhamento expandível** por empresa: mostra sócios, endereço, CNAE, dados brutos.

---

### 5.2 Módulo 2 — Enriquecimento de Leads via Apollo.io

#### 5.2.1 Descrição

Para cada sócio das empresas qualificadas, a ferramenta consulta a API do Apollo.io passando nome + empresa para obter dados de contato profissionais. Ao final, gera uma lista numerada e datada que fica em fila de revisão.

#### 5.2.2 Integração Apollo.io

**Endpoint:** `POST https://api.apollo.io/api/v1/people/match`

**Headers:**
```
Content-Type: application/json
X-Api-Key: {apollo_api_key}
```

**Payload:**
```json
{
  "first_name": "João",
  "last_name": "Silva",
  "organization_name": "Empresa XYZ Ltda",
  "domain": "empresaxyz.com.br"
}
```

**Nota:** O campo `domain` é opcional mas melhora a precisão. O sistema tentará extrair o domínio do website da empresa (se retornado pela CNPJá).

**Dados extraídos e mapeados:**

| Dado Apollo | Campo Local |
|---|---|
| `person.email` | `enriched_leads.email` |
| `person.email_status` | validação (só salva se `verified` ou `guessed`) |
| `person.linkedin_url` | `enriched_leads.linkedin_url` |
| `person.title` | `enriched_leads.cargo` |
| `person.phone_numbers[0].sanitized_number` | `enriched_leads.telefone` |
| `person.organization.name` | `enriched_leads.empresa_nome` |

**Rate Limiting Apollo:**
- Respeitar o header `X-Rate-Limit-Remaining`.
- Delay mínimo de 1 segundo entre requests.
- Em caso de 429, aguardar `Retry-After` header.

#### 5.2.3 Geração de Lista

Ao concluir o enriquecimento de um lote, o sistema:

1. Consulta o maior `sequential_number` existente em `lead_lists`.
2. Incrementa +1.
3. Gera o título no padrão: `#N Leads Enriquecidos - DD/MM/YY HH:mm`.
4. Cria o registro em `lead_lists` com `reviewed = false`.
5. Vincula todos os leads enriquecidos do lote via `list_id`.

**Exemplo de títulos:**
```
#1 Leads Enriquecidos - 25/03/26 14:30
#2 Leads Enriquecidos - 26/03/26 09:15
#3 Leads Enriquecidos - 28/03/26 16:45
```

#### 5.2.4 Tela: Fila de Listas de Leads

**Elementos da interface:**

- **Lista em cards ou tabela** com: Título (com #), Total de leads, Data de criação, Status (Pendente Revisão / Revisada / Em Campanha).
- **Badge visual** para status: Amarelo = Pendente, Verde = Revisada, Azul = Em Campanha.
- **Ação:** Clicar na lista abre a tela de revisão.

#### 5.2.5 Tela: Revisão de Lista

**Elementos da interface:**

- **Tabela de leads enriquecidos** com colunas: Nome, Empresa, Cargo, E-mail, LinkedIn, Telefone, Status (checkbox para aprovar/rejeitar individualmente).
- **Ações em massa:** "Aprovar todos", "Rejeitar selecionados".
- **Filtros:** Por presença de e-mail, por presença de LinkedIn, por cargo.
- **Botão "Concluir Revisão":** Marca a lista como revisada e os leads aprovados ficam disponíveis para campanha de e-mail.
- **Indicador de qualidade:** % de leads com e-mail encontrado, % com LinkedIn, % com telefone.

---

### 5.3 Módulo 3 — Disparo Manual de E-mail via Resend

#### 5.3.1 Descrição

Permite que o usuário crie campanhas de e-mail com templates personalizáveis usando variáveis dinâmicas e dispare manualmente para leads aprovados. Métricas de entrega, abertura e resposta são rastreadas em tempo real via webhooks do Resend.

#### 5.3.2 Integração Resend

**Configuração (Tela de Settings):**
- Campo: `API Key do Resend` (input password com botão de visualizar).
- Campo: `E-mail de envio` (ex: outreach@agentise.com.br) — deve estar verificado no Resend.
- Campo: `Nome de exibição` (ex: Davi — Agentise).
- Botão: "Testar conexão" → envia e-mail de teste para o próprio usuário.

**Endpoint de envio:** `POST https://api.resend.com/emails`

**Headers:**
```
Authorization: Bearer {resend_api_key}
Content-Type: application/json
```

**Payload:**
```json
{
  "from": "Davi — Agentise <outreach@agentise.com.br>",
  "to": ["lead@empresa.com.br"],
  "subject": "Assunto personalizado",
  "html": "<p>Corpo do e-mail com variáveis renderizadas</p>",
  "headers": {
    "X-Entity-Ref-ID": "{unique_id_para_tracking}"
  }
}
```

**Webhooks do Resend:**
- Registrar webhook no painel Resend apontando para: `https://{supabase_url}/functions/v1/resend-webhook`
- Eventos rastreados: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`.
- Cada evento atualiza o campo `status` em `email_sends` e registra o timestamp correspondente.

#### 5.3.3 Variáveis Disponíveis no Template

| Variável | Descrição | Exemplo |
|---|---|---|
| `{{nome}}` | Primeiro nome do lead | João |
| `{{nome_completo}}` | Nome completo | João da Silva |
| `{{empresa}}` | Nome da empresa | Empresa XYZ |
| `{{cargo}}` | Cargo atual | Diretor Comercial |
| `{{link_whatsapp}}` | Link do WhatsApp do remetente | https://wa.me/5548999999999 |

**Nota:** O `link_whatsapp` é configurado uma vez na tela de Settings e inserido automaticamente quando a variável é usada.

#### 5.3.4 Tela: Criar Campanha de E-mail

**Elementos da interface:**

- **Seletor de lista:** Dropdown com listas revisadas e aprovadas.
- **Campo Assunto:** Input text com suporte a variáveis (autocomplete ao digitar `{{`).
- **Editor de corpo:** Rich text editor (TipTap ou similar) com:
  - Toolbar básica: Negrito, Itálico, Link, Lista.
  - Inserção de variáveis via botão dropdown ou digitação `{{`.
  - Preview em tempo real ao lado mostrando o e-mail renderizado com dados de um lead exemplo.
- **Campo "Link WhatsApp":** Preenchido automaticamente das Settings, editável por campanha.
- **Botão "Salvar Rascunho":** Salva sem enviar.
- **Botão "Disparar Campanha":** Com modal de confirmação mostrando:
  - Total de destinatários.
  - Preview do primeiro e-mail.
  - Checkbox: "Confirmo que revisei a lista e o conteúdo."
  - Botão final: "Confirmar e Enviar".

**Importante:** O disparo é SEMPRE manual. Não há agendamento automático. O botão de envio requer confirmação explícita.

#### 5.3.5 Tela: Dashboard de Métricas da Campanha

**Elementos da interface:**

- **Cards de métricas no topo:**
  - Total enviados (ícone: envelope).
  - Taxa de entrega: `(delivered / sent) * 100` — cor verde se > 95%.
  - Taxa de abertura: `(opened / delivered) * 100` — cor azul.
  - Taxa de resposta: `(replied / delivered) * 100` — cor primary.
  - Taxa de bounce: `(bounced / sent) * 100` — cor vermelha se > 5%.

- **Gráfico de funil:** Enviados → Entregues → Abertos → Respondidos.

- **Tabela detalhada por lead:** Nome, E-mail, Status (Enviado / Entregue / Aberto / Respondido / Bounce), Horários de cada evento.

- **Atualização:** Real-time via Supabase Realtime subscriptions na tabela `email_sends`.

---

### 5.4 Módulo 4 — Integração com Chatwoot (Self-Hosted)

#### 5.4.1 Descrição

As respostas dos leads aos e-mails de prospecção devem aparecer como conversas no Chatwoot, permitindo ao operador continuar a interação na ferramenta que já utiliza para atendimento. A integração é bidirecional.

#### 5.4.2 Configuração (Tela de Settings)

- **Campo:** URL da instância Chatwoot (ex: `https://chatwoot.agentise.com.br`)
- **Campo:** API Token (User Access Token do Chatwoot)
- **Campo:** Account ID
- **Campo:** Inbox ID (inbox do tipo Email)
- **Botão:** "Testar conexão" → `GET /api/v1/profile` para validar token.

#### 5.4.3 Fluxo de Integração

**Quando um e-mail é enviado pela plataforma:**

1. A Supabase Edge Function cria/atualiza um contato no Chatwoot via `POST /api/v1/accounts/{account_id}/contacts` com:
   - `name`: Nome do lead
   - `email`: E-mail do lead
   - `custom_attributes`: `{ source: "agentise_leads", lead_id: "uuid", campaign_id: "uuid" }`

2. Armazena o `chatwoot_contact_id` no registro do lead para referência futura.

**Quando o lead responde o e-mail:**

O Chatwoot recebe a resposta via inbox de e-mail configurada e cria automaticamente uma conversa. O operador interage normalmente pelo painel do Chatwoot.

**Sincronização de status (Chatwoot → Plataforma):**

- Edge Function `chatwoot-sync` roda via polling (configurável, default 60s).
- Para cada lead com status `contacted` ou `active` em `follow_up_enrollments`:
  - `GET /api/v1/accounts/{account_id}/contacts/{contact_id}/conversations`
  - Verifica se existe mensagem de resposta do contato → atualiza `email_sends.replied_at`.
  - Verifica labels do contato: `GET /api/v1/accounts/{account_id}/contacts/{contact_id}`
  - Se contém a label `resposta_negativa` → atualiza `enriched_leads.status = 'negative_response'` e remove da sequência de follow-up.

**Nota sobre a label `resposta_negativa`:** Esta label será atribuída por uma IA configurada externamente no Chatwoot (via automação N8N ou bot). A plataforma Agentise Leads apenas LÊ esta label; não a atribui.

#### 5.4.4 Tela: Status de Integração

- **Indicador de status:** Conectado (verde) / Desconectado (vermelho) / Erro (amarelo).
- **Último sync:** Timestamp do último polling bem-sucedido.
- **Contatos sincronizados:** Total de contatos criados no Chatwoot via a plataforma.
- **Log de erros:** Últimas 50 entradas de erro da sincronização.

---

### 5.5 Módulo 5 — Sequências de Follow-up

#### 5.5.1 Descrição

Permite configurar sequências de mensagens de follow-up que são sugeridas ao operador com base em regras de tempo e comportamento. O envio continua sendo MANUAL — a ferramenta notifica que há follow-ups pendentes e o operador decide enviar.

#### 5.5.2 Tela: Configurar Sequência de Follow-up

**Elementos da interface:**

- **Nome da sequência:** Input text (ex: "Follow-up Padrão 3 Toques").
- **Toggle:** Ativa / Inativa.
- **Builder de passos (drag-and-drop ou lista ordenada):**

  Cada passo contém:
  - **Ordem:** Número do passo (1, 2, 3...).
  - **Condição de disparo:**
    - Tipo: "Não respondeu" / "Não abriu" / "Personalizado".
    - Delay: Input numérico + seletor (horas / dias). Ex: "3 dias após o passo anterior".
  - **Assunto:** Input text com variáveis.
  - **Corpo do e-mail:** Editor rich text com variáveis (mesmo do módulo de campanha).
  - **Botão "Adicionar passo":** Insere novo passo na sequência.
  - **Botão "Remover passo":** Com confirmação.

- **Regras de remoção automática:**
  - Checkbox: "Remover leads que responderam de forma negativa (label `resposta_negativa` no Chatwoot)" — ativado por padrão.
  - Checkbox: "Remover leads que responderam qualquer mensagem" — desativado por padrão.

- **Botão "Salvar Sequência".**

**Exemplo de sequência configurada:**

```
Sequência: "Follow-up Padrão 3 Toques"

Passo 1:
  Condição: Não respondeu ao e-mail inicial
  Delay: 3 dias
  Assunto: "{{nome}}, viu meu último e-mail?"
  Corpo: "Oi {{nome}}, enviei uma mensagem há alguns dias sobre..."

Passo 2:
  Condição: Não respondeu ao Passo 1
  Delay: 5 dias
  Assunto: "Última tentativa, {{nome}}"
  Corpo: "{{nome}}, entendo que sua agenda é corrida..."

Regras: Remover se label "resposta_negativa" detectada no Chatwoot
```

#### 5.5.3 Tela: Painel de Follow-ups Pendentes

**Elementos da interface:**

- **Filtros:** Por sequência, por passo, por data de vencimento.
- **Tabela de follow-ups pendentes:**
  - Nome do lead.
  - Empresa.
  - Sequência / Passo atual.
  - Tempo desde último contato.
  - Status: "Pronto para envio" (verde) / "Aguardando prazo" (cinza) / "Removido" (vermelho).
- **Ação individual:** Botão "Enviar" ao lado de cada lead (abre preview do e-mail com confirmação).
- **Ação em massa:** "Enviar todos os pendentes prontos" com modal de confirmação.
- **Indicadores:** Total pendentes, Total prontos para envio hoje, Removidos automaticamente.

#### 5.5.4 Mecanismo de Polling para Remoção Automática

**Edge Function:** `follow-up-checker`

**Execução:** Cron job via `pg_cron` ou Supabase Scheduled Functions, rodando a cada 60 segundos (configurável em Settings).

**Lógica:**

```
PARA CADA enrollment com status = 'active':
  1. Buscar chatwoot_contact_id do lead
  2. GET /api/v1/accounts/{id}/contacts/{contact_id}
  3. SE labels contém "resposta_negativa":
     - Atualizar enrollment.status = 'removed_negative'
     - Atualizar enrollment.removed_at = NOW()
     - Atualizar enrollment.removal_reason = 'Label resposta_negativa detectada no Chatwoot'
     - Atualizar enriched_leads.status = 'negative_response'
     - Logar a remoção
  4. SE existe resposta do contato na conversa E regra "remover ao responder" está ativa:
     - Atualizar enrollment.status = 'completed'
```

---

## 6. Navegação e Layout

### 6.1 Sidebar (Menu Principal)

| Ícone | Label | Rota |
|---|---|---|
| Search | Consulta CNPJ | `/consulta` |
| Building | Empresas | `/empresas` |
| Users | Leads Enriquecidos | `/leads` |
| List | Listas | `/listas` |
| Mail | Campanhas de E-mail | `/campanhas` |
| MailForward | Follow-ups | `/follow-ups` |
| BarChart3 | Métricas | `/metricas` |
| Settings | Configurações | `/settings` |

### 6.2 Layout Padrão

- **Sidebar fixa à esquerda** (240px) com background `sidebar-background`.
- **Área de conteúdo principal** com background `background`.
- **Header contextual** dentro da área de conteúdo com título da página e breadcrumbs.
- **Mobile:** Sidebar colapsável (hamburger menu).

---

## 7. Fluxo Completo do Usuário (End-to-End)

```
1. CONFIGURAÇÃO INICIAL
   └─ Settings: Inserir API Keys (CNPJá, Apollo, Resend) + Credenciais Chatwoot

2. CONSULTA DE CNPJs
   └─ Inserir CNPJs → Definir filtros (regime + porte) → Iniciar consulta
   └─ Aguardar processamento (respeitando rate-limit)
   └─ Visualizar resultado: X qualificadas / Y descartadas

3. ENRIQUECIMENTO
   └─ Selecionar empresas qualificadas → Iniciar enriquecimento
   └─ Sistema consulta Apollo para cada sócio
   └─ Lista gerada automaticamente: "#N Leads Enriquecidos - DD/MM/YY HH:mm"
   └─ Lista entra na fila de revisão

4. REVISÃO HUMANA
   └─ Abrir lista pendente → Revisar cada lead
   └─ Aprovar / Rejeitar individualmente ou em massa
   └─ Concluir revisão

5. CAMPANHA DE E-MAIL
   └─ Criar campanha → Selecionar lista revisada
   └─ Escrever template com variáveis ({{nome}}, {{empresa}}, {{link_whatsapp}})
   └─ Preview → Confirmar → DISPARO MANUAL
   └─ Acompanhar métricas em tempo real

6. GESTÃO DE RESPOSTAS
   └─ Lead responde e-mail → Aparece no Chatwoot
   └─ Operador interage via Chatwoot
   └─ IA no Chatwoot atribui label "resposta_negativa" quando aplicável

7. FOLLOW-UP
   └─ Leads sem resposta entram na sequência configurada
   └─ Sistema monitora prazos e lista follow-ups prontos
   └─ Operador envia follow-ups manualmente
   └─ Leads com "resposta_negativa" são removidos automaticamente (polling 60s)
   └─ Ciclo repete até fim da sequência ou conversão
```

---

## 8. Integrações — Resumo Técnico

| Serviço | Tipo | Autenticação | Endpoints Utilizados |
|---|---|---|---|
| **CNPJá** | REST API | API Key (header `Authorization`) | `GET /office/{cnpj}` |
| **Apollo.io** | REST API | API Key (header `X-Api-Key`) | `POST /api/v1/people/match` |
| **Resend** | REST API + Webhooks | Bearer Token | `POST /emails`, Webhooks (`email.sent`, `.delivered`, `.opened`, `.clicked`, `.bounced`, `.complained`) |
| **Chatwoot** | REST API (polling) | User Access Token | `GET/POST /contacts`, `GET /contacts/{id}/conversations`, `GET /contacts/{id}` (labels) |
| **Supabase** | BaaS | Service Role Key (server-side) | Database, Auth, Edge Functions, Realtime, Scheduled Functions |

---

## 9. Requisitos Não-Funcionais

### 9.1 Segurança

- Todas as API keys armazenadas com criptografia (Supabase Vault ou pgcrypto).
- RLS habilitado em todas as tabelas.
- Edge Functions usam `service_role` key internamente; client-side usa `anon` key com RLS.
- Webhooks do Resend validados via assinatura HMAC.
- HTTPS em todas as comunicações.

### 9.2 Performance

- Consultas CNPJá e Apollo são processadas em background (Supabase Edge Functions ou pg_cron).
- Tabelas com índices em: `cnpj`, `list_id`, `campaign_id`, `lead_id`, `status`, `batch_id`.
- Paginação em todas as tabelas com mais de 50 registros (cursor-based).
- Realtime subscriptions limitadas a tabelas que requerem atualização live (`email_sends`, `batches`).

### 9.3 Escalabilidade

- Supabase escala horizontalmente para reads via connection pooling (PgBouncer).
- Edge Functions são serverless e auto-escaláveis.
- Para volumes acima de 10.000 leads/mês, considerar filas com Supabase Queue ou migração para worker dedicado.

### 9.4 Observabilidade

- Logs estruturados em todas as Edge Functions (JSON, com correlation_id por batch/campaign).
- Tabela `activity_log` para auditoria de ações do usuário.
- Alertas configuráveis: taxa de bounce > 5%, erros de API, falha no polling Chatwoot.

---

## 10. Fases de Entrega (Roadmap Sugerido)

### Fase 1 — MVP (Semanas 1-3)
- Tela de Settings com configuração de API keys.
- Módulo de Consulta CNPJ em lote com filtros.
- Módulo de Enriquecimento via Apollo + geração de listas.
- Tela de revisão de listas.

### Fase 2 — Outreach (Semanas 4-5)
- Módulo de Campanha de E-mail com editor de template e variáveis.
- Integração Resend (envio + webhooks).
- Dashboard de métricas de campanha.

### Fase 3 — Integração e Follow-up (Semanas 6-7)
- Integração Chatwoot (criação de contatos + polling de labels).
- Módulo de Sequências de Follow-up.
- Painel de follow-ups pendentes.
- Mecanismo de remoção automática via polling.

### Fase 4 — Polish (Semana 8)
- Testes end-to-end.
- Ajustes de UX/UI.
- Documentação interna.
- Deploy em produção.

---

## 11. Métricas de Sucesso

| Métrica | Meta |
|---|---|
| Taxa de qualificação (CNPJs que passam nos filtros) | Visibilidade — não há meta fixa |
| Taxa de enriquecimento (leads com e-mail encontrado) | > 60% |
| Taxa de entrega de e-mail | > 95% |
| Taxa de abertura | > 30% |
| Taxa de resposta | > 5% |
| Tempo médio do ciclo (consulta → primeiro contato) | < 48h |
| Follow-ups enviados no prazo | > 90% |

---

## 12. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Rate-limit CNPJá estoura em lotes grandes | Atraso no processamento | Fila com backoff exponencial + estimativa de tempo na UI |
| Apollo não encontra dados do sócio | Lista com baixa qualidade | Indicador de % enriquecido + fallback manual para pesquisa LinkedIn |
| E-mails caem em spam | Baixa taxa de abertura | Domínio verificado no Resend + warm-up + boas práticas de copy |
| Chatwoot fora do ar (self-hosted) | Polling falha | Retry com backoff + alerta no painel + graceful degradation |
| Label `resposta_negativa` não é atribuída pela IA | Leads negativos continuam recebendo follow-up | Opção de remoção manual + alerta se lead responde mas não tem label após X horas |

---

*Documento gerado em 25/03/2026 — Agentise*