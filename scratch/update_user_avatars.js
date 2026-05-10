const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateUserAvatars() {
  console.log('🔄 Actualizando tabla "avatars" con las nuevas rutas...');

  try {
    const { data: avatars, error: fetchError } = await supabase.from('avatars').select('*');
    if (fetchError) throw fetchError;

    for (const av of avatars) {
      let updates = {};
      const fields = ['skin_asset', 'hair_asset', 'eyes_asset', 'mouth_asset', 'clothes_asset'];

      fields.forEach(field => {
        const val = av[field];
        if (val && val.includes('AvatarItems') && !val.includes('/')) {
          // Determinar categoría por el nombre del archivo si es posible
          let cat = field.split('_')[0]; // skin, hair, eyes, mouth, clothes
          updates[field] = `${supabaseUrl}/storage/v1/object/public/AvatarItems/${cat}/${val}`;
        } else if (val && val.includes('AvatarItems') && val.includes('/clothes/') && !field.startsWith('clothes')) {
          // Corregir si se movieron a /clothes/ por error en el paso anterior
          let cat = field.split('_')[0];
          const fileName = val.split('/').pop();
          updates[field] = `${supabaseUrl}/storage/v1/object/public/AvatarItems/${cat}/${fileName}`;
        }
      });

      if (Object.keys(updates).length > 0) {
        await supabase.from('avatars').update(updates).eq('id', av.id);
        console.log(`✅ Avatar de usuario ${av.profile_id} actualizado.`);
      }
    }
    console.log('✨ Tabla "avatars" sincronizada.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateUserAvatars();
