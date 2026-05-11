const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function repairAvatars() {
  console.log('🛠️ Iniciando reparación de emergencia de la tabla "avatars"...');

  try {
    const { data: avatars, error: fetchError } = await supabase.from('avatars').select('*');
    if (fetchError) throw fetchError;

    for (const av of avatars) {
      let updates = {};
      const fields = ['skin_asset', 'hair_asset', 'hair_back_asset', 'eyes_asset', 'mouth_asset', 'clothes_asset'];

      fields.forEach(field => {
        let val = av[field];
        if (!val || val === 'none') return;

        // Extraer solo el nombre del archivo (quitar cualquier ruta previa)
        const fileName = val.split('/').pop();
        
        // Determinar la categoría real basándose en el prefijo del archivo
        let realCat = '';
        if (fileName.startsWith('skin_')) realCat = 'skin';
        else if (fileName.startsWith('hair_')) realCat = 'hair';
        else if (fileName.startsWith('eyes_')) realCat = 'eyes';
        else if (fileName.startsWith('mouth_')) realCat = 'mouth';
        else if (fileName.startsWith('clothes_')) realCat = 'clothes';

        if (realCat) {
          updates[field] = `${supabaseUrl}/storage/v1/object/public/AvatarItems/${realCat}/${fileName}`;
        }
      });

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.from('avatars').update(updates).eq('id', av.id);
        if (!updateError) console.log(`   ✅ Perfil ${av.profile_id} reparado.`);
      }
    }

    console.log('\n✨ ¡Base de datos reparada! Ahora los avatares deberían tener cada pieza en su sitio.');
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
  }
}

repairAvatars();
