import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const email = 'participante3@aimly.io';
  const password = 'Password123!';
  const name = 'Participante 3';

  console.log(`🔐 Creando/verificando usuario: ${email}...`);

  let userId: string | undefined;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name }
  });

  if (createError) {
    if (createError.message.toLowerCase().includes('already registered') || createError.message.toLowerCase().includes('already been registered') || createError.message.toLowerCase().includes('email address has already')) {
      console.log(`ℹ️ El usuario ${email} ya existía. Buscando ID...`);
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData?.users.find((u) => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        await supabase.auth.admin.updateUserById(userId, { password });
        console.log(`✅ Contraseña actualizada para ${email}`);
      }
    } else {
      console.error('❌ Error creando usuario:', createError.message);
      process.exit(1);
    }
  } else {
    userId = created.user.id;
    console.log(`✅ Usuario creado con ID: ${userId}`);
  }

  if (!userId) {
    console.error('❌ No se obtuvo ID de usuario.');
    process.exit(1);
  }

  // Ensure profile exists
  await supabase.from('profiles').upsert({
    id: userId,
    name,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
  });
  console.log('✅ Perfil guardado.');

  // Create test meeting
  const { data: meeting, error: mErr } = await supabase
    .from('meetings')
    .insert({
      title: 'Planificación de Producto Q3',
      objective: 'Alinear entregables del Q3 y priorizar funcionalidades de IA',
      expected_outcome: 'Lista de tareas asignadas y decisiones confirmadas para el trimestre',
      status: 'closed',
      host_id: userId,
      duration_minutes: 45
    })
    .select()
    .single();

  if (mErr || !meeting) {
    console.error('❌ Error creando reunión de prueba:', mErr?.message);
    process.exit(1);
  }
  console.log(`✅ Reunión creada: "${meeting.title}" (ID: ${meeting.id})`);

  // Add as host participant
  await supabase.from('meeting_participants').upsert({
    meeting_id: meeting.id,
    user_id: userId,
    role: 'host'
  }, { onConflict: 'meeting_id,user_id' });

  // Insert test decisions
  const { data: insertedDecisions } = await supabase
    .from('decisions')
    .insert([
      { meeting_id: meeting.id, text: 'Implementar arquitectura Serverless para microservicios de IA.', confirmed_by: userId },
      { meeting_id: meeting.id, text: 'Usar Supabase Realtime para la sincronización de tableros colaborativos.', confirmed_by: userId }
    ])
    .select();

  console.log(`✅ ${insertedDecisions?.length || 0} decisiones insertadas.`);

  // Insert test tasks
  const { data: insertedTasks } = await supabase
    .from('tasks')
    .insert([
      {
        meeting_id: meeting.id,
        title: 'Diseñar interfaz del Centro de Tareas',
        description: 'Crear componentes React responsivos con filtros de estado.',
        assignee_id: userId,
        status: 'done',
        source_decision_id: insertedDecisions?.[0]?.id
      },
      {
        meeting_id: meeting.id,
        title: 'Integrar endpoints de API REST en Fastify',
        description: 'Endpoints GET /api/tasks y GET /api/decisions con verificación de permisos.',
        assignee_id: userId,
        status: 'todo',
        source_decision_id: insertedDecisions?.[1]?.id
      },
      {
        meeting_id: meeting.id,
        title: 'Realizar pruebas E2E en el navegador',
        description: 'Verificar filtros, búsqueda y cambio interactivo de estado de tareas.',
        assignee_id: userId,
        status: 'todo'
      }
    ])
    .select();

  console.log(`✅ ${insertedTasks?.length || 0} tareas insertadas.`);

  console.log('\n🎉 ¡Datos de prueba listos!');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Meeting:  /meeting/${meeting.id}/result`);
}

main().catch(console.error);
