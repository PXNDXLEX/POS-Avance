-- ==============================================================================
-- SISTEMA DE GESTIÓN DE AVANCE DE EFECTIVO (POS-Avance)
-- Esquema de base de datos Supabase PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'operador')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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
-- Inserta el bucket 'comprobantes' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para el bucket comprobantes
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

-- 7. TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFILES AL REGISTRAR USUARIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user BOOLEAN;
  initial_role TEXT;
BEGIN
  -- Si es el primer usuario registrado en la base de datos, asignarle rol de admin automáticamente
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;
  
  IF is_first_user THEN
    initial_role := 'admin';
  ELSE
    initial_role := COALESCE(new.raw_user_meta_data->>'role', 'operador');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    initial_role
  );
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
CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Políticas para System Settings
CREATE POLICY "Permitir lectura de configuraciones a usuarios autenticados"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden modificar configuraciones"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
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

CREATE POLICY "Solo administradores pueden eliminar transacciones"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
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
-- INSTRUCCIONES PARA EL USUARIO ADMINISTRADOR DE EMERGENCIA:
-- 
-- 1. Puedes registrar tu usuario normalmente desde la pantalla de login.
--    El PRIMER usuario registrado se convierte automáticamente en 'admin'.
-- 2. Si ya tienes un usuario creado y deseas convertirlo en administrador de emergencia,
--    ejecuta el siguiente comando en el SQL Editor de Supabase:
--
--    UPDATE public.profiles
--    SET role = 'admin'
--    WHERE email = 'tu_correo_admin@ejemplo.com';
-- ==============================================================================

