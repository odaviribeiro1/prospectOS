-- Migration 0004 — Drop settings table
-- Contexto: migração SaaS → Open Source Self-Hosted (fase 3).
-- A tabela `settings` armazenava API keys e configurações por usuário (BYOK em texto plano).
-- No modelo self-hosted, uma instância = um cliente, então as keys foram movidas para
-- variáveis de ambiente das Edge Functions (Deno.env.get) e os defaults não-sensíveis
-- (from_email, from_name, whatsapp_link) foram movidos para VITE_* no frontend.
-- Esta migration remove a tabela inteira e todos os artefatos relacionados.

DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;

DROP TRIGGER IF EXISTS set_updated_at_settings ON public.settings;

DROP TABLE IF EXISTS public.settings CASCADE;
