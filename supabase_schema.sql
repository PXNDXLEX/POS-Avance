-- ==============================================================================
-- SISTEMA DE GESTIÓN DE AVANCE DE EFECTIVO (POS-Avance)
-- Esquema de base de datos Supabase PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA DE PERFILES (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operador' CHECK (role IN ('superadmin', 'admin', 'operador')),
  is_superadmin BOOLEAN NOT NULL DEFAULT false,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Si la tabla ya existía, asegurarse de tener la columna is_superadmin y el constraint actualizado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_superadmin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
  END IF;

  -- Actualizar el constraint de rol para incluir 'superadmin'
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'admin', 'operador'));
END $$;

-- 3. TABLA DE CONFIGURACIÓN DEL SISTEMA (System Settings)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  business_name TEXT NOT NULL DEFAULT 'Avance de Efectivo',
  notice_text TEXT DEFAULT 'Recuerde verificar que los datos coincidan exactamente con el Pago Móvil del cliente.',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insertar configuración inicial por defecto
INSERT INTO public.system_settings (id, default_commission_percentage, business_name)
VALUES ('default', 10.00, 'Avance de Efectivo')
ON CONFLICT (id) DO NOTHING;

-- 4. TABLA DE TRANSACCIONES / AVANCES (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre TEXT NOT NULL,
  cliente_cedula VARCHAR(8) NOT NULL,
  cliente_telefono VARCHAR(11) NOT NULL,
  cliente_banco_codigo VARCHAR(4) NOT NULL,
  cliente_banco_nombre TEXT NOT NULL,
  monto_bruto NUMERIC(15, 2) NOT NULL CHECK (monto_bruto > 0),
  comision_porcentaje NUMERIC(5, 2) NOT NULL CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100),
  monto_comision NUMERIC(15, 2) NOT NULL DEFAULT 0,
  monto_neto NUMERIC(15, 2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
  fecha_operacion TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  fecha_pago TIMESTAMPTZ,
  referencia_pago TEXT,
  comprobante_url TEXT,
  notas TEXT,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pagado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_transactions_estado ON public.transactions(estado);
CREATE INDEX IF NOT EXISTS idx_transactions_cliente_cedula ON public.transactions(cliente_cedula);
CREATE INDEX IF NOT EXISTS idx_transactions_fecha_operacion ON public.transactions(fecha_operacion DESC);

-- 5. TABLA DE AUDITORÍA Y LOGS (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  accion VARCHAR(50) NOT NULL,
  detalles TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction ON public.audit_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 6. CONFIGURACIÓN DEL BUCKET DE STORAGE (Comprobantes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Acceso publico para ver comprobantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprobantes');

CREATE POLICY "Usuarios autenticados pueden subir comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Usuarios autenticados pueden actualizar comprobantes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comprobantes');

-- 7. TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFILES
-- Si existía el trigger experimental de auto-confirmar, removerlo para no interferir con GoTrue
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  initial_role TEXT;
  is_super BOOLEAN;
BEGIN
  initial_role := COALESCE(new.raw_user_meta_data->>'role', 'operador');
  is_super := (initial_role = 'superadmin');

  INSERT INTO public.profiles (id, email, full_name, role, is_superadmin, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    initial_role,
    is_super,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_superadmin = EXCLUDED.is_superadmin,
    username = EXCLUDED.username;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS update_transactions_timestamp ON public.transactions;
CREATE TRIGGER update_transactions_timestamp
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
-- Nadie excepto el propio superadmin puede ver la fila del superadmin
CREATE POLICY "Lectura de perfiles con proteccion de superadmin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- El superadmin puede ver a todos
    (auth.uid() = id) OR
    (NOT is_superadmin AND role != 'superadmin') OR
    (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND (p.role = 'superadmin' OR p.is_superadmin = true)
    ))
  );

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Nadie puede borrar al superadmin
CREATE POLICY "Eliminar perfiles excepto superadmin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    NOT is_superadmin AND role != 'superadmin' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (p.role IN ('admin', 'superadmin') OR p.is_superadmin = true)
    )
  );

-- Políticas para System Settings
CREATE POLICY "Permitir lectura de configuraciones a usuarios autenticados"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administradores y Superadmins pueden modificar configuraciones"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Políticas para Transactions
CREATE POLICY "Usuarios autenticados pueden ver transacciones"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear transacciones"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar transacciones"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Administradores y Superadmins pueden eliminar transacciones"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Políticas para Audit Logs
CREATE POLICY "Usuarios autenticados pueden ver logs de auditoria"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar logs de auditoria"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- 10. REPARACIÓN Y CREACIÓN DEL SUPERADMIN "otto" (CLAVE: 25156888)
-- ==============================================================================
-- 1. Eliminar cualquier trigger manual sobre auth.users para evitar conflictos con GoTrue
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_new_user();

-- 2. Reparar valores NULL en auth.users que provocan "Database error querying schema"
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  is_sso_user = COALESCE(is_sso_user, false),
  is_anonymous = COALESCE(is_anonymous, false)
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change_token_new IS NULL 
  OR email_change IS NULL;

-- 3. Limpiar y recrear de forma 100% compatible con GoTrue a otto@posavance.com
DELETE FROM public.profiles WHERE email = 'otto@posavance.com';
DELETE FROM auth.users WHERE email = 'otto@posavance.com';

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'otto@posavance.com',
  crypt('25156888', gen_salt('bf')),
  timezone('utc'::text, now()),
  null,
  '',
  null,
  '',
  null,
  '',
  '',
  null,
  timezone('utc'::text, now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Otto","role":"superadmin","username":"otto"}'::jsonb,
  false,
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  null,
  null,
  '',
  '',
  null,
  '',
  0,
  null,
  '',
  null,
  false,
  null,
  false
);

-- 4. Registrar en profiles
INSERT INTO public.profiles (id, email, full_name, role, is_superadmin, username)
SELECT id, 'otto@posavance.com', 'Otto', 'superadmin', true, 'otto'
FROM auth.users
WHERE email = 'otto@posavance.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  is_superadmin = true,
  full_name = 'Otto',
  username = 'otto';
