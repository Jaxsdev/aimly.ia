import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const email = 'amigo@aimly.ia';
  const password = 'Password123!';
  const name = 'Carlos (Amigo)';

  console.log(`Creando usuario de prueba: ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log(`El usuario ${email} ya estaba registrado.`);
    } else {
      console.error('Error al crear usuario:', error.message);
      process.exit(1);
    }
  } else {
    console.log(`✅ Usuario creado exitosamente con ID: ${data.user.id}`);
  }

  const userId = data?.user?.id;
  if (userId) {
    await supabase.from('profiles').upsert({
      id: userId,
      name,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
    });
    console.log('✅ Perfil creado en la base de datos.');
  }
}

main();
