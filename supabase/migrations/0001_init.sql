-- ========================================================
-- AGENTISE LEADS — DATABASE SETUP COMPLETO
-- Fases 1, 2, 3, 4 — Execute no Supabase SQL Editor
-- ========================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM ('pending', 'processing', 'completed', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE regime_tributario AS ENUM ('simples', 'lucro_real', 'lucro_presumido', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE porte_empresa AS ENUM ('me', 'epp', 'medio', 'grande', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE list_status AS ENUM ('pending_review', 'reviewed', 'in_campaign');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'pending_review', 'approved', 'rejected',
    'contacted', 'responded', 'negative_response', 'converted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'sending', 'completed', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_send_status AS ENUM (
    'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE step_condition AS ENUM ('no_reply', 'no_open', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delay_unit AS ENUM ('hours', 'days');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM (
    'active', 'paused', 'completed',
    'removed_negative', 'removed_replied', 'removed_manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FASE 1: TABELAS CORE
-- ============================================================

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cnpja_api_key TEXT,
  apollo_api_key TEXT,
  resend_api_key TEXT,
  resend_from_email TEXT,
  resend_from_name TEXT,
  chatwoot_url TEXT,
  chatwoot_api_token TEXT,
  chatwoot_account_id INTEGER,
  chatwoot_inbox_id INTEGER,
  whatsapp_link TEXT,
  negative_response_polling_interval INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Batches
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cnpjs TEXT[] NOT NULL,
  total INTEGER NOT NULL,
  processed INTEGER DEFAULT 0,
  qualified INTEGER DEFAULT 0,
  disqualified INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  filter_regime TEXT[] NOT NULL,
  filter_porte TEXT[] NOT NULL,
  status batch_status DEFAULT 'pending',
  error_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  regime_tributario regime_tributario DEFAULT 'outros',
  porte porte_empresa DEFAULT 'outros',
  situacao_cadastral TEXT,
  cnae_principal TEXT,
  cnae_descricao TEXT,
  endereco JSONB,
  website TEXT,
  telefone TEXT,
  email TEXT,
  raw_data JSONB,
  qualified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  qualificacao TEXT,
  cpf_masked TEXT,
  data_entrada TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Lists
CREATE TABLE IF NOT EXISTS public.lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id),
  sequential_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  total_leads INTEGER DEFAULT 0,
  approved_leads INTEGER DEFAULT 0,
  rejected_leads INTEGER DEFAULT 0,
  status list_status DEFAULT 'pending_review',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enriched Leads
CREATE TABLE IF NOT EXISTS public.enriched_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  list_id UUID REFERENCES public.lead_lists(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  email_type TEXT,
  email_status TEXT,
  linkedin_url TEXT,
  cargo TEXT,
  telefone TEXT,
  empresa_nome TEXT,
  empresa_domain TEXT,
  apollo_raw JSONB,
  status lead_status DEFAULT 'pending_review',
  chatwoot_contact_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FASE 2: CAMPANHAS DE EMAIL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  list_id UUID REFERENCES public.lead_lists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  whatsapp_link TEXT,
  status campaign_status DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  complained_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE NOT NULL,
  resend_id TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT NOT NULL,
  subject_rendered TEXT NOT NULL,
  body_rendered TEXT NOT NULL,
  status email_send_status DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  opened_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type TEXT,
  complained_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FASE 3: FOLLOW-UPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  remove_on_any_reply BOOLEAN DEFAULT false,
  remove_on_negative_reply BOOLEAN DEFAULT true,
  total_steps INTEGER DEFAULT 0,
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_removed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.follow_up_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sequence_id UUID REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  name TEXT,
  delay_value INTEGER NOT NULL,
  delay_unit delay_unit NOT NULL,
  condition_type step_condition DEFAULT 'no_reply',
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.follow_up_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sequence_id UUID REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  current_step INTEGER DEFAULT 0,
  next_step_order INTEGER DEFAULT 1,
  status enrollment_status DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_step_sent_at TIMESTAMPTZ,
  next_step_due_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  removal_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.follow_up_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES public.follow_up_enrollments(id) ON DELETE CASCADE NOT NULL,
  step_id UUID REFERENCES public.follow_up_steps(id) ON DELETE SET NULL NOT NULL,
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  resend_id TEXT,
  to_email TEXT NOT NULL,
  subject_rendered TEXT NOT NULL,
  body_rendered TEXT NOT NULL,
  status email_send_status DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.follow_up_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES public.follow_up_enrollments(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.enriched_leads(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES public.follow_up_sequences(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FASE 4: AUDITORIA GLOBAL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_batch ON public.companies(batch_id);
CREATE INDEX IF NOT EXISTS idx_companies_qualified ON public.companies(qualified);
CREATE INDEX IF NOT EXISTS idx_companies_user ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_company ON public.partners(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_lists_user ON public.lead_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_list ON public.enriched_leads(list_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.enriched_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.enriched_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON public.enriched_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_list ON public.email_campaigns(list_id);
CREATE INDEX IF NOT EXISTS idx_sends_campaign ON public.email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sends_lead ON public.email_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_sends_status ON public.email_sends(status);
CREATE INDEX IF NOT EXISTS idx_sends_resend_id ON public.email_sends(resend_id);
CREATE INDEX IF NOT EXISTS idx_sequences_user ON public.follow_up_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_active ON public.follow_up_sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_steps_sequence ON public.follow_up_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_steps_order ON public.follow_up_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_enrollments_sequence ON public.follow_up_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON public.follow_up_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.follow_up_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_next_due ON public.follow_up_enrollments(next_step_due_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_fu_sends_enrollment ON public.follow_up_sends(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_fu_sends_lead ON public.follow_up_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_fu_sends_resend ON public.follow_up_sends(resend_id);
CREATE INDEX IF NOT EXISTS idx_fu_log_enrollment ON public.follow_up_activity_log(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_fu_log_action ON public.follow_up_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_fu_log_created ON public.follow_up_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enriched_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own batches" ON public.batches;
CREATE POLICY "Users can manage own batches" ON public.batches FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own companies" ON public.companies;
CREATE POLICY "Users can manage own companies" ON public.companies FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own partners" ON public.partners;
CREATE POLICY "Users can manage own partners" ON public.partners FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own lead lists" ON public.lead_lists;
CREATE POLICY "Users can manage own lead lists" ON public.lead_lists FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own leads" ON public.enriched_leads;
CREATE POLICY "Users can manage own leads" ON public.enriched_leads FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own campaigns" ON public.email_campaigns;
CREATE POLICY "Users can manage own campaigns" ON public.email_campaigns FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own sends" ON public.email_sends;
CREATE POLICY "Users can manage own sends" ON public.email_sends FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own sequences" ON public.follow_up_sequences;
CREATE POLICY "Users can manage own sequences" ON public.follow_up_sequences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own steps" ON public.follow_up_steps;
CREATE POLICY "Users can manage own steps" ON public.follow_up_steps FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own enrollments" ON public.follow_up_enrollments;
CREATE POLICY "Users can manage own enrollments" ON public.follow_up_enrollments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own follow up sends" ON public.follow_up_sends;
CREATE POLICY "Users can manage own follow up sends" ON public.follow_up_sends FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own fu logs" ON public.follow_up_activity_log;
CREATE POLICY "Users can view own fu logs" ON public.follow_up_activity_log FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own logs" ON public.activity_log;
CREATE POLICY "Users can view own logs" ON public.activity_log FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at_settings ON public.settings;
CREATE TRIGGER set_updated_at_settings
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_leads ON public.enriched_leads;
CREATE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON public.enriched_leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_campaigns ON public.email_campaigns;
CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sends ON public.email_sends;
CREATE TRIGGER set_updated_at_sends
  BEFORE UPDATE ON public.email_sends
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sequences ON public.follow_up_sequences;
CREATE TRIGGER set_updated_at_sequences
  BEFORE UPDATE ON public.follow_up_sequences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_steps ON public.follow_up_steps;
CREATE TRIGGER set_updated_at_steps
  BEFORE UPDATE ON public.follow_up_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_enrollments ON public.follow_up_enrollments;
CREATE TRIGGER set_updated_at_enrollments
  BEFORE UPDATE ON public.follow_up_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Próximo número sequencial para listas
CREATE OR REPLACE FUNCTION public.next_list_sequential_number(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequential_number), 0) + 1
  INTO next_num
  FROM public.lead_lists
  WHERE user_id = p_user_id;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calcular data do próximo passo
CREATE OR REPLACE FUNCTION public.calculate_next_step_due(
  p_last_sent_at TIMESTAMPTZ,
  p_delay_value INTEGER,
  p_delay_unit TEXT
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  IF p_delay_unit = 'hours' THEN
    RETURN p_last_sent_at + (p_delay_value || ' hours')::INTERVAL;
  ELSIF p_delay_unit = 'days' THEN
    RETURN p_last_sent_at + (p_delay_value || ' days')::INTERVAL;
  ELSE
    RETURN p_last_sent_at + INTERVAL '1 day';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Dashboard: dados consolidados
CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_companies', (SELECT COUNT(*) FROM public.companies WHERE user_id = p_user_id AND created_at >= p_start_date),
    'qualified_companies', (SELECT COUNT(*) FROM public.companies WHERE user_id = p_user_id AND qualified = true AND created_at >= p_start_date),
    'total_enriched_leads', (SELECT COUNT(*) FROM public.enriched_leads WHERE user_id = p_user_id AND status != 'rejected' AND created_at >= p_start_date),
    'total_campaigns', (SELECT COUNT(*) FROM public.email_campaigns WHERE user_id = p_user_id AND status = 'completed' AND sent_at >= p_start_date),
    'total_sent', (SELECT COALESCE(SUM(sent_count), 0) FROM public.email_campaigns WHERE user_id = p_user_id AND sent_at >= p_start_date),
    'total_delivered', (SELECT COALESCE(SUM(delivered_count), 0) FROM public.email_campaigns WHERE user_id = p_user_id AND sent_at >= p_start_date),
    'total_opened', (SELECT COALESCE(SUM(opened_count), 0) FROM public.email_campaigns WHERE user_id = p_user_id AND sent_at >= p_start_date),
    'total_replied', (SELECT COALESCE(SUM(replied_count), 0) FROM public.email_campaigns WHERE user_id = p_user_id AND sent_at >= p_start_date),
    'total_bounced', (SELECT COALESCE(SUM(bounced_count), 0) FROM public.email_campaigns WHERE user_id = p_user_id AND sent_at >= p_start_date),
    'pending_follow_ups', (
      SELECT COUNT(*) FROM public.follow_up_enrollments
      WHERE user_id = p_user_id AND status = 'active' AND next_step_due_at <= NOW()
    ),
    'active_enrollments', (
      SELECT COUNT(*) FROM public.follow_up_enrollments
      WHERE user_id = p_user_id AND status = 'active'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissão para usuários autenticados chamarem via RPC
GRANT EXECUTE ON FUNCTION public.get_dashboard_data(UUID, TIMESTAMPTZ) TO authenticated;

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_sends;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_activity_log;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN (
      'settings', 'batches', 'companies', 'partners', 'lead_lists',
      'enriched_leads', 'email_campaigns', 'email_sends',
      'follow_up_sequences', 'follow_up_steps', 'follow_up_enrollments',
      'follow_up_sends', 'follow_up_activity_log', 'activity_log'
    );

  IF table_count = 14 THEN
    RAISE NOTICE 'SUCESSO: Todas as 14 tabelas foram criadas corretamente.';
  ELSE
    RAISE NOTICE 'ATENCAO: Apenas % de 14 tabelas encontradas.', table_count;
  END IF;
END $$;

-- ============================================================
-- FASE 3 — pg_cron Scheduler (executar no SQL Editor do Supabase)
-- Requer extensão pg_cron habilitada no projeto Supabase.
-- Habilitar em: Settings > Database > Extensions > pg_cron
-- ============================================================

-- Agendar polling do Chatwoot a cada 60 segundos
-- (pg_cron suporta no mínimo 1 minuto)
/*
SELECT cron.schedule(
  'chatwoot-poll-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/chatwoot-poll',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verificar jobs agendados:
-- SELECT * FROM cron.job;

-- Remover job (se necessário):
-- SELECT cron.unschedule('chatwoot-poll-every-minute');
*/
