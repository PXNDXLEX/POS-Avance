import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente con service role (si existe)
const getAdminClient = () => {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Cliente público / anon
const getAnonClient = () => {
  if (!supabaseUrl || !anonKey) return null;
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function GET(request: NextRequest) {
  try {
    const isSuperAdmin = request.headers.get('x-is-superadmin') === 'true';

    const client = getAdminClient() || getAnonClient();
    if (!client) {
      return NextResponse.json({ users: [] });
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Regla de seguridad: El superadmin principal es invisible en la lista web
    const filtered = (data || []).filter((p: any) => {
      return (
        !p.is_superadmin &&
        p.role !== 'superadmin' &&
        p.email !== 'otto@posavance.com' &&
        p.username !== 'otto'
      );
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

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!cleanUsername) {
      return NextResponse.json(
        { error: 'El nombre de usuario contiene caracteres no permitidos. Use solo letras, números y guiones.' },
        { status: 400 }
      );
    }

    // Mapeo interno: otto usa su cuenta existente, nuevos usuarios usan un dominio estándar válido para Supabase
    const email = cleanUsername === 'otto' ? 'otto@posavance.com' : `${cleanUsername}.posavance@gmail.com`;

    const adminClient = getAdminClient();

    if (adminClient) {
      // Método preferido: Crear usuario con Service Role (email pre-confirmado)
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
    }

    // Método alternativo si aún no han configurado SUPABASE_SERVICE_ROLE_KEY:
    // Crear usando cliente anónimo y persistir en profiles
    const anonClient = getAnonClient();
    if (!anonClient) {
      return NextResponse.json(
        { error: 'No se encontraron las variables de conexión a Supabase.' },
        { status: 500 }
      );
    }

    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          username: cleanUsername,
        },
      },
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (signUpData.user) {
      // Asegurar que el perfil quede guardado en profiles
      await anonClient.from('profiles').upsert({
        id: signUpData.user.id,
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
      user: signUpData.user,
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
      return NextResponse.json({ error: 'Falta el ID del usuario a eliminar.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const anonClient = getAnonClient();
    const client = adminClient || anonClient;

    if (!client) {
      return NextResponse.json({ error: 'Sin conexión a base de datos.' }, { status: 500 });
    }

    // Verificar que NO sea el superadmin
    const { data: targetProfile } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (
      targetProfile?.is_superadmin ||
      targetProfile?.role === 'superadmin' ||
      targetProfile?.email === 'otto@posavance.com'
    ) {
      return NextResponse.json(
        { error: 'Acción prohibida: El Superadministrador no puede ser eliminado por ningún usuario.' },
        { status: 403 }
      );
    }

    if (adminClient) {
      // Borrar de auth.users usando el Service Role
      const { error: delAuthError } = await adminClient.auth.admin.deleteUser(userId);
      if (delAuthError) {
        console.warn('Error eliminando de auth.users:', delAuthError.message);
      }
    }

    // Borrar de profiles
    const { error: delProfileError } = await client
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
