-- ============================================================
-- Migration 0005: convites + role owner/member
-- ============================================================
-- Adiciona sistema de convites por token (válidos por 7 dias) e renomeia
-- conceitualmente os roles para owner/member (mantendo gestor/operacional como
-- alias de compatibilidade com policies já criadas em 0003).
--
--   - Owner   = único, criado no primeiro signup. Substitui o role 'gestor'.
--   - Member  = entra via convite. Substitui o role 'operacional'.
--
-- O trigger handle_new_user é reescrito para:
--   1) primeira pessoa do sistema vira owner (sem precisar de convite),
--   2) demais signups exigem invite_token válido em raw_user_meta_data,
--   3) signup sem token válido falha com EXCEPTION clara.
-- ============================================================

-- 1. Estender enum user_role com owner / member ------------------------------
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'member';

-- 2. Migrar profiles existentes: gestor -> owner, operacional -> member -------
-- Roda em DO block separado porque ALTER TYPE ADD VALUE não pode ser usado na
-- mesma transaction que UPDATE com o valor novo (Postgres exige commit antes).
COMMIT;

UPDATE public.profiles SET role = 'owner'  WHERE role = 'gestor';
UPDATE public.profiles SET role = 'member' WHERE role = 'operacional';

BEGIN;

-- 3. Tabela invites ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invites_role_invitable CHECK (role IN ('member', 'owner'))
);

CREATE INDEX IF NOT EXISTS invites_token_active_idx
  ON public.invites(token)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS invites_email_idx ON public.invites(email);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 4. Helper is_owner() -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- Manter is_gestor() funcionando: agora retorna TRUE para owner também, para
-- não quebrar as policies criadas em 0003_rls_role_aware.sql.
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('gestor', 'owner')
  );
$$;

-- 5. Policies em invites ------------------------------------------------------
DROP POLICY IF EXISTS "invites_owner_all" ON public.invites;
CREATE POLICY "invites_owner_all" ON public.invites
  FOR ALL
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- 6. Trigger handle_new_user reescrito ---------------------------------------
-- Primeira pessoa do sistema vira owner. Demais signups exigem invite_token
-- válido (presente em raw_user_meta_data, não expirado, não usado, email
-- corresponde ao email do convite).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_count INT;
  v_invite_token TEXT;
  v_invite_record public.invites%ROWTYPE;
  v_role public.user_role;
BEGIN
  SELECT count(*) INTO v_user_count FROM public.profiles;

  -- Caso 1: primeira pessoa do sistema vira owner (sem convite)
  IF v_user_count = 0 THEN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Caso 2: signup só permitido com invite_token válido em raw_user_meta_data
  v_invite_token := NEW.raw_user_meta_data ->> 'invite_token';

  IF v_invite_token IS NULL OR v_invite_token = '' THEN
    RAISE EXCEPTION 'Self-signup desabilitado. Solicite um convite ao owner desta instância.';
  END IF;

  SELECT * INTO v_invite_record
  FROM public.invites
  WHERE token = v_invite_token
    AND used_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower(NEW.email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido, expirado, já utilizado ou e-mail não corresponde.';
  END IF;

  v_role := v_invite_record.role;

  UPDATE public.invites
  SET used_at = now()
  WHERE id = v_invite_record.id;

  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Função pública is_signup_open() ----------------------------------------
-- Retorna TRUE quando ainda não existe nenhum profile (instância "fresca",
-- self-signup do primeiro user permitido). Usada pelo frontend (anon) para
-- decidir se mostra o formulário de registro ou a tela de "self-signup
-- desabilitado". SECURITY DEFINER porque a tabela profiles tem RLS que
-- bloqueia leitura anônima.
CREATE OR REPLACE FUNCTION public.is_signup_open()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1);
$$;

GRANT EXECUTE ON FUNCTION public.is_signup_open() TO anon, authenticated;

-- 8. Função pública get_invite_by_token() ------------------------------------
-- Retorna apenas dados não-sensíveis de um convite válido (email, role,
-- expires_at). Usada pela tela /invite para mostrar o e-mail pré-preenchido
-- antes do signup. Não retorna o próprio token nem invited_by.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS TABLE (email TEXT, role public.user_role, expires_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT i.email, i.role, i.expires_at
  FROM public.invites i
  WHERE i.token = p_token
    AND i.used_at IS NULL
    AND i.revoked_at IS NULL
    AND i.expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon, authenticated;
