# POS Avance - Sistema de Gestión de Avance de Efectivo

Sistema web moderno desarrollado con **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS** y **Supabase**, diseñado específicamente para comercios en Venezuela que ofrecen servicio de avance de efectivo a través de sus puntos de venta (POS).

Listo para ser desplegado en **Vercel** en pocos minutos.

---

## 🌟 Características Principales

1. **Registro Rápido de Operaciones POS:**
   - Monto bruto pasado por el punto de venta.
   - Cálculo automático de la comisión retenida y del monto neto a transferir al cliente por Pago Móvil al día siguiente.
   - Detección y autocompletado inteligente de clientes frecuentes por número de cédula.

2. **Validaciones Bancarias Venezolanas:**
   - **Teléfono Pago Móvil:** Validación estricta de prefijos oficiales (`0424`, `0414`, `0412`, `0422`, `0416`, `0426`) + 7 dígitos (11 dígitos exactos).
   - **Cédula de Identidad:** Validación estricta de solo números y 8 dígitos.
   - **Lista de Bancos con Búsqueda:** Selector desplegable con opción de escritura y autocompletado con todos los bancos venezolanos y sus códigos SUDEBAN de 4 dígitos (0102 Banco de Venezuela, 0134 Banesco, 0105 Mercantil, 0108 Provincial, 0172 Bancamiga, etc.).
   - **Aviso Informativo Obligatorio:** Recordatorio visible de que los datos deben coincidir exactamente con los afiliados al Pago Móvil del cliente.

3. **Copiado de Pago Móvil con 1 Clic:**
   - Botón directo para copiar al portapapeles con el formato exacto requerido para aplicaciones bancarias:
     ```text
     banco
     telefono
     Cedula
     monto
     ```
     *Ejemplo:*
     ```text
     0102
     042485256565
     25156888
     15400,00
     ```

4. **Control de Pagos y Auditoría Inmutable:**
   - Filtrado rápido entre operaciones *Pendientes por Transferir* y *Pagadas*.
   - Modal para marcar como pagado con número de referencia bancaria.
   - Registro cronológico detallado de auditoría (quién registró la operación, cuándo se marcó como pagado, cambios de estado).

5. **Notificación por WhatsApp con Capture de Pago:**
   - Subida del capture / comprobante bancario a **Supabase Storage**.
   - Enlace directo a WhatsApp (`wa.me`) con mensaje personalizado listo para enviar al cliente detallando el monto neto transferido, el banco destino y el comprobante adjunto.

6. **Gestión de Usuarios y Administrador de Emergencia:**
   - Autenticación segura mediante **Supabase Auth**.
   - Roles: `admin` (Administrador) y `operador` (Operador de caja).
   - Gestión de perfil: actualización de nombre completo y cambio de contraseña.
   - Mecanismo de **Administrador de Emergencia** mediante consulta SQL directa en Supabase en caso de pérdida de credenciales.
   - Modo demostración local automático si aún no se han configurado las claves de Supabase.

---

## 🚀 Despliegue en Vercel

### Paso 1: Configurar Supabase
1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. Ve al **SQL Editor** en tu panel de Supabase.
3. Copia todo el contenido del archivo [`supabase_schema.sql`](./supabase_schema.sql) incluido en este repositorio y ejecútalo (**Run**).
   - Creará las tablas `profiles`, `system_settings`, `transactions` y `audit_logs`.
   - Creará el bucket de almacenamiento `comprobantes` para los captures bancarios.
   - Activará las políticas de seguridad Row Level Security (RLS) y los triggers de actualización.

### Paso 2: Obtener las Claves de Supabase
En Supabase, dirígete a **Project Settings -> API** y copia:
- **Project URL**
- **Project API Anon Key**

### Paso 3: Desplegar en Vercel
1. Ve a [vercel.com](https://vercel.com) e importa tu repositorio de GitHub `POS-Avance`.
2. En la sección **Environment Variables**, añade las siguientes variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: La URL de tu proyecto Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: La clave anónima (`anon key`) de tu proyecto Supabase.
3. Haz clic en **Deploy**.
4. ¡Listo! Vercel compilará y desplegará la aplicación en una URL pública segura (HTTPS).

---

## 🛠️ Ejecución Local

Para probar el sistema en tu máquina:

```bash
# 1. Clona el repositorio
git clone https://github.com/PXNDXLEX/POS-Avance.git
cd POS-Avance

# 2. Instala las dependencias
npm install

# 3. Crea el archivo .env.local basándote en .env.example
# (Opcional: Si no lo creas, el sistema correrá en Modo Demo Local con almacenamiento en el navegador)
cp .env.example .env.local

# 4. Inicia el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🛡️ Administrador de Emergencia

El primer usuario que se registre en el sistema recibe automáticamente el rol de **`admin`**.

Si por algún motivo pierdes el acceso a tu usuario administrador o necesitas activar un usuario de emergencia inmediatamente:

1. Ve al **SQL Editor** en Supabase.
2. Ejecuta la siguiente consulta sustituyendo el correo electrónico:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'tu_correo_admin@ejemplo.com';
   ```

---

## 📁 Estructura del Proyecto

```text
├── public/                 # Archivos estáticos
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/login/   # Pantalla de inicio de sesión y registro
│   │   ├── dashboard/      # Panel principal y vistas protegidas
│   │   │   ├── nuevo/      # Registro de nuevo avance POS
│   │   │   ├── configuracion/# Configuración de % de comisión
│   │   │   ├── auditoria/  # Historial global de auditoría
│   │   │   └── perfil/     # Gestión de perfil y contraseña
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/         # Componentes UI interactivos
│   │   ├── BankSelect.tsx  # Combobox con búsqueda de bancos venezolanos
│   │   ├── TransactionForm.tsx # Formulario con cálculos en vivo
│   │   ├── PagoMovilModal.tsx  # Modal con copiado en bloque formato exacto
│   │   ├── MarkPaidModal.tsx   # Modal para marcar pago y subir capture
│   │   ├── WhatsAppModal.tsx   # Notificación y apertura directa wa.me
│   │   ├── StatsOverview.tsx   # Tarjetas con KPIs y métricas financieras
│   │   └── Navbar.tsx      # Barra de navegación adaptable
│   ├── context/            # AuthContext y manejo de sesión
│   ├── lib/
│   │   ├── banks.ts        # Lista oficial SUDEBAN de bancos
│   │   ├── formatters.ts   # Formato venezolano y generador Pago Móvil
│   │   ├── validations.ts  # Validadores de teléfono y cédula
│   │   └── transactions.ts # Métodos CRUD y Storage
├── supabase_schema.sql     # Script SQL completo para Supabase
└── .env.example            # Plantilla de variables de entorno
```
