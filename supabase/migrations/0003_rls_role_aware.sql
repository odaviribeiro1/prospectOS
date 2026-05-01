-- ============================================================
-- Migration 0003: RLS role-aware
-- ============================================================
-- Reescreve as 14 policies de domínio para reconhecer o role gestor:
--
--   auth.uid() = user_id  →  auth.uid() = user_id OR public.is_gestor()
--
-- Operacional continua vendo apenas seus próprios dados (comportamento idêntico
-- ao da migration 0001). Gestor passa a enxergar tudo da instância.
--
-- Pré-requisito: 0002_profiles_and_roles.sql aplicada (define is_gestor()).
-- ============================================================

-- 1. settings ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings" ON public.settings
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_gestor());

DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
CREATE POLICY "Users can insert own settings" ON public.settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_gestor());

DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings" ON public.settings
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_gestor());

-- 2. batches ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own batches" ON public.batches;
CREATE POLICY "Users can manage own batches" ON public.batches
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 3. companies --------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own companies" ON public.companies;
CREATE POLICY "Users can manage own companies" ON public.companies
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 4. partners ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own partners" ON public.partners;
CREATE POLICY "Users can manage own partners" ON public.partners
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 5. lead_lists -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own lead lists" ON public.lead_lists;
CREATE POLICY "Users can manage own lead lists" ON public.lead_lists
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 6. enriched_leads ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own leads" ON public.enriched_leads;
CREATE POLICY "Users can manage own leads" ON public.enriched_leads
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 7. email_campaigns --------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own campaigns" ON public.email_campaigns;
CREATE POLICY "Users can manage own campaigns" ON public.email_campaigns
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 8. email_sends ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own sends" ON public.email_sends;
CREATE POLICY "Users can manage own sends" ON public.email_sends
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 9. follow_up_sequences ----------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own sequences" ON public.follow_up_sequences;
CREATE POLICY "Users can manage own sequences" ON public.follow_up_sequences
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 10. follow_up_steps -------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own steps" ON public.follow_up_steps;
CREATE POLICY "Users can manage own steps" ON public.follow_up_steps
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 11. follow_up_enrollments -------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own enrollments" ON public.follow_up_enrollments;
CREATE POLICY "Users can manage own enrollments" ON public.follow_up_enrollments
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 12. follow_up_sends -------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own follow up sends" ON public.follow_up_sends;
CREATE POLICY "Users can manage own follow up sends" ON public.follow_up_sends
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 13. follow_up_activity_log ------------------------------------------------
DROP POLICY IF EXISTS "Users can view own fu logs" ON public.follow_up_activity_log;
CREATE POLICY "Users can view own fu logs" ON public.follow_up_activity_log
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());

-- 14. activity_log ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own logs" ON public.activity_log;
CREATE POLICY "Users can view own logs" ON public.activity_log
  FOR ALL
  USING (auth.uid() = user_id OR public.is_gestor());
