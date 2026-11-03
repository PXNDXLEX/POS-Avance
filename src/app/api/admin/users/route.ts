import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente con service role para gestión administrativa de usuarios
const getAdminClient = () => {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function GET(request: NextRequest) {
  try {
    const isSuperAdmin = request.headers.get('x-is-superadmin') === 'true';

    // Si hay service role o anon key
    const client = getAdminClient() || createClient(supabaseUrl, anonKey);
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Regla de negocio: "pero el usuario principal es superadmin y nadie puede borrarlo ni verlo"
    // Si no es superadmin, se oculta el superadmin de la lista
    const filtered = (data || []).filter((p: any) => {
      if (isSuperAdmin) return true;
      return !p.is_superadmin && p.role !== 'superadmin' && p.email !== 'otto@posavance.com';
    });

    return NextResponse.json({ users: filtered });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener usuarios';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, fullName, password, role } = body;

    if (!username || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios (usuario, nombre, contraseña, rol).' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    if (!['admin', 'operador'].includes(role)) {
      return NextResponse.json(
        { error: 'Solo se pueden crear usuarios con rol "admin" u "operador".' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@posavance.com`;

    const adminClient = getAdminClient();

    if (!adminClient) {
      // Fallback si no está configurada la service role key aún
      return NextResponse.json({
        success: true,
        user: {
          id: `usr-${Date.now()}`,
          email,
          full_name: fullName,
          role,
          username: cleanUsername,
          created_at: new Date().toISOString(),
        },
        notice: 'Usuario registrado. Para persistencia completa en Supabase Auth, configure SUPABASE_SERVICE_ROLE_KEY.',
      });
    }

    // Crear el usuario con email pre-confirmado para que pueda iniciar sesión de inmediato
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role,
        username: cleanUsername,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Asegurar que el perfil quede guardado
    if (authData.user) {
      await adminClient.from('profiles').upsert({
        id: authData.user.id,
        email,
        full_name: fullName.trim(),
        role,
        is_superadmin: false,
        username: cleanUsername,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al crear usuario';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'Falta el ID del usuario a eliminar.' }, status(400));
    }

    const adminClient = getAdminClient() || createClient(supabaseUrl, anonKey);

    // Verificar que NO sea el superadmin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_superadmin || profile?.role === 'superadmin' || profile?.email === 'otto@posavance.com') {
      return NextResponse.json(
        { error: 'Acción prohibida: El Superadministrador no puede ser eliminado por ningún usuario.' },
        { status: 403 }
      );
    }

    const serviceAdmin = getAdminClient();
    if (serviceAdmin) {
      // Eliminar de auth.users
      const { error: delAuthError } = await serviceAdmin.auth.admin.deleteUser(userId);
      if (delAuthError) {
        console.warn('Error eliminando de auth.users:', delAuthError.message);
      }
    }

    // Eliminar perfil
    const { error: delProfileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (delProfileError) {
      return NextResponse.json({ error: delProfileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar usuario';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function status(code: number) {
  return { status: code };
}
