// ============================================================
// TIPOS CENTRALIZADOS — Agentise Leads
// ============================================================

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'error'
export type RegimeTributario = 'simples' | 'lucro_real' | 'lucro_presumido' | 'outros'
export type PorteEmpresa = 'me' | 'epp' | 'medio' | 'grande' | 'outros'
export type ListStatus = 'pending_review' | 'reviewed' | 'in_campaign'
export type LeadStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'contacted'
  | 'responded'
  | 'negative_response'
  | 'converted'

// ---- Settings -----------------------------------------------
export interface Settings {
  id: string
  user_id: string
  cnpja_api_key: string | null
  apollo_api_key: string | null
  resend_api_key: string | null
  resend_from_email: string | null
  resend_from_name: string | null
  chatwoot_url: string | null
  chatwoot_api_token: string | null
  chatwoot_account_id: number | null
  chatwoot_inbox_id: number | null
  whatsapp_link: string | null
  negative_response_polling_interval: number
  created_at: string
  updated_at: string
}

// ---- Batch --------------------------------------------------
export interface Batch {
  id: string
  user_id: string
  name: string
  cnpjs: string[]
  total: number
  processed: number
  qualified: number
  disqualified: number
  errors: number
  filter_regime: string[]
  filter_porte: string[]
  status: BatchStatus
  error_log: ErrorLogEntry[]
  created_at: string
  completed_at: string | null
}

export interface ErrorLogEntry {
  cnpj: string
  error: string
  timestamp: string
}

// ---- Company ------------------------------------------------
export interface Endereco {
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
}

export interface Company {
  id: string
  user_id: string
  batch_id: string
  cnpj: string
  razao_social: string | null
  nome_fantasia: string | null
  regime_tributario: RegimeTributario
  porte: PorteEmpresa
  situacao_cadastral: string | null
  cnae_principal: string | null
  cnae_descricao: string | null
  endereco: Endereco | null
  website: string | null
  telefone: string | null
  email: string | null
  raw_data: Record<string, unknown> | null
  qualified: boolean
  created_at: string
  // joined
  batch?: Pick<Batch, 'id' | 'name'>
  partners?: Partner[]
}

// ---- Partner ------------------------------------------------
export interface Partner {
  id: string
  user_id: string
  company_id: string
  nome: string
  qualificacao: string | null
  cpf_masked: string | null
  data_entrada: string | null
  created_at: string
}

// ---- Lead List ----------------------------------------------
export interface LeadList {
  id: string
  user_id: string
  batch_id: string | null
  sequential_number: number
  title: string
  total_leads: number
  approved_leads: number
  rejected_leads: number
  status: ListStatus
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
}

// ---- Enriched Lead ------------------------------------------
export interface EnrichedLead {
  id: string
  user_id: string
  partner_id: string
  company_id: string
  list_id: string
  nome: string
  email: string | null
  email_type: string | null
  email_status: string | null
  linkedin_url: string | null
  cargo: string | null
  telefone: string | null
  empresa_nome: string | null
  empresa_domain: string | null
  apollo_raw: Record<string, unknown> | null
  status: LeadStatus
  chatwoot_contact_id: number | null
  created_at: string
  updated_at: string
  // joined
  company?: Pick<Company, 'id' | 'razao_social' | 'nome_fantasia' | 'cnpj'>
}

// ---- Filters ------------------------------------------------
export interface QualificationFilters {
  regime: RegimeTributario[]
  porte: PorteEmpresa[]
}

export interface CompanyFilters {
  search: string
  qualified: 'all' | 'yes' | 'no'
  regime: RegimeTributario | 'all'
  porte: PorteEmpresa | 'all'
  batch_id: string | 'all'
}

// ---- Campaign -----------------------------------------------
export type CampaignStatus = 'draft' | 'sending' | 'completed' | 'paused'
export type EmailSendStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'

export interface EmailCampaign {
  id: string
  user_id: string
  list_id: string | null
  name: string
  subject: string
  body_template: string
  from_name: string
  from_email: string
  whatsapp_link: string | null
  status: CampaignStatus
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  replied_count: number
  bounced_count: number
  complained_count: number
  created_at: string
  updated_at: string
  sent_at: string | null
  completed_at: string | null
  list?: Pick<LeadList, 'id' | 'title' | 'approved_leads'>
}

export interface EmailSend {
  id: string
  user_id: string
  campaign_id: string
  lead_id: string
  resend_id: string | null
  to_email: string
  to_name: string
  subject_rendered: string
  body_rendered: string
  status: EmailSendStatus
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  opened_count: number
  clicked_at: string | null
  bounced_at: string | null
  bounce_type: string | null
  complained_at: string | null
  replied_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  lead?: Pick<EnrichedLead, 'id' | 'nome' | 'email' | 'cargo' | 'empresa_nome'>
}

export interface TemplateVariable {
  key: string
  label: string
  example: string
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'nome', label: 'Primeiro Nome', example: 'João' },
  { key: 'nome_completo', label: 'Nome Completo', example: 'João da Silva' },
  { key: 'empresa', label: 'Nome da Empresa', example: 'Empresa XYZ Ltda' },
  { key: 'cargo', label: 'Cargo', example: 'Diretor Comercial' },
  { key: 'email', label: 'E-mail do Lead', example: 'joao@empresa.com.br' },
  { key: 'link_whatsapp', label: 'Link WhatsApp', example: 'https://wa.me/5548999999999' },
]

// ---- Follow-up Sequences ------------------------------------
export type DelayUnit = 'hours' | 'days'
export type StepCondition = 'no_reply' | 'no_open' | 'always'
export type EnrollmentStatus = 'active' | 'completed' | 'removed' | 'paused'
export type FollowUpSendStatus = 'sent' | 'delivered' | 'opened' | 'failed'
export type ActivityType =
  | 'enrollment_created'
  | 'step_sent'
  | 'step_skipped'
  | 'enrollment_completed'
  | 'enrollment_removed'
  | 'chatwoot_poll'

export interface FollowUpSequence {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  total_enrollments: number
  active_enrollments: number
  completed_enrollments: number
  created_at: string
  updated_at: string
  steps?: FollowUpStep[]
}

export interface FollowUpStep {
  id: string
  sequence_id: string
  user_id: string
  step_number: number
  name: string
  condition: StepCondition
  delay_value: number
  delay_unit: DelayUnit
  subject: string
  body_template: string
  created_at: string
  updated_at: string
}

export interface FollowUpEnrollment {
  id: string
  sequence_id: string
  lead_id: string
  user_id: string
  campaign_id: string | null
  current_step: number
  status: EnrollmentStatus
  next_step_due_at: string | null
  enrolled_at: string
  completed_at: string | null
  removed_at: string | null
  removal_reason: string | null
  // joined
  lead?: Pick<EnrichedLead, 'id' | 'nome' | 'email' | 'cargo' | 'empresa_nome'>
  sequence?: Pick<FollowUpSequence, 'id' | 'name'>
}

export interface FollowUpSend {
  id: string
  enrollment_id: string
  step_id: string
  lead_id: string
  user_id: string
  resend_id: string | null
  to_email: string
  subject_rendered: string
  status: FollowUpSendStatus
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface FollowUpActivityLogEntry {
  id: string
  sequence_id: string
  enrollment_id: string | null
  lead_id: string | null
  user_id: string
  type: ActivityType
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
  // joined
  lead?: Pick<EnrichedLead, 'id' | 'nome' | 'empresa_nome'>
}

export interface PendingFollowUp {
  enrollment: FollowUpEnrollment
  step: FollowUpStep
  sequence: Pick<FollowUpSequence, 'id' | 'name'>
}

// ---- API Responses ------------------------------------------
export interface CnpjaLookupResult {
  company: Partial<Company>
  partners: Partial<Partner>[]
  rate_limit_remaining: number | null
  rate_limit_reset: number | null
}

export interface ApolloEnrichResult {
  list_id: string
  title: string
  total: number
  enriched_count: number
  errors: number
}

export interface EnrichmentProgress {
  total: number
  current: number
  status: 'idle' | 'processing' | 'done' | 'error'
  result: ApolloEnrichResult | null
}
