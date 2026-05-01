-- ============================================================
-- Migration 0002: profiles + roles (gestor / operacional)
-- ============================================================
-- Cria a infraestrutura de RBAC mínima para a versão self-hosted:
--   - enum public.user_role
--   - tabela public.profiles (1:1 com auth.users)
--   - helper public.is_gestor() para uso nas policies RLS
--   - trigger handle_new_user: o PRIMEIRO usuário registrado vira gestor
-- ============================================================

-- 1. Enum de roles ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('gestor', 'operacional');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela profiles ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'operacional',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Helper is_gestor() -------------------------------------------------------
-- SECURITY DEFINER + STABLE evita recursão de RLS quando policies de outras
-- tabelas chamam is_gestor() (que precisaria ler profiles, que tem RLS).
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'gestor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_gestor() TO authenticated;

-- 4. Policies em profiles -----------------------------------------------------
-- SELECT: usuário lê o próprio profile; gestor lê todos.
DROP POLICY IF EXISTS "profiles_select_self_or_gestor" ON public.profiles;
CREATE POLICY "profiles_select_self_or_gestor" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_gestor());

-- INSERT: feito pelo trigger handle_new_user (SECURITY DEFINER), mas mantemos
-- uma policy permissiva para o gestor adicionar profiles manualmente caso
-- queira no futuro.
DROP POLICY IF EXISTS "profiles_insert_gestor" ON public.profiles;
CREATE POLICY "profiles_insert_gestor" ON public.profiles
  FOR INSERT
  WITH CHECK (public.is_gestor());

-- UPDATE: operacional atualiza apenas o próprio display_name (não role).
-- Gestor atualiza qualquer profile, incluindo role.
DROP POLICY IF EXISTS "profiles_update_self_displayname" ON public.profiles;
CREATE POLICY "profiles_update_self_displayname" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id AND NOT public.is_gestor())
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_update_gestor" ON public.profiles;
CREATE POLICY "profiles_update_gestor" ON public.profiles
  FOR UPDATE
  USING (public.is_gestor())
  WITH CHECK (public.is_gestor());

-- DELETE: apenas gestor pode remover profiles manualmente.
DROP POLICY IF EXISTS "profiles_delete_gestor" ON public.profiles;
CREATE POLICY "profiles_delete_gestor" ON public.profiles
  FOR DELETE
  USING (public.is_gestor());

-- 5. Trigger updated_at -------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Trigger handle_new_user --------------------------------------------------
-- Primeiro usuário registrado vira gestor; demais viram operacional.
-- Roda como SECURITY DEFINER para conseguir inserir em profiles ignorando RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF (SELECT count(*) FROM public.profiles) = 0 THEN
    v_role := 'gestor';
  ELSE
    v_role := 'operacional';
  END IF;

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

-- 7. Backfill ----------------------------------------------------------------
-- Para instâncias com usuários pré-existentes em auth.users (sem profile ainda),
-- garante que o usuário mais antigo vire gestor e os demais virem operacional.
INSERT INTO public.profiles (id, role)
SELECT
  u.id,
  CASE
    WHEN u.id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
      THEN 'gestor'::public.user_role
    ELSE 'operacional'::public.user_role
  END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
