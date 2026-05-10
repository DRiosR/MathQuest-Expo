const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupStorage() {
  console.log('🧹 Iniciando limpieza de archivos duplicados...');

  try {
    // 1. Limpiar AvatarItems (Raíz y subcarpetas erróneas)
    const { data: avatarFiles } = await supabase.storage.from('AvatarItems').list('');
    const filesToDeleteAvatar = avatarFiles.filter(f => !f.id ? false : !['clothes', 'skin', 'hair', 'eyes', 'mouth'].includes(f.name)).map(f => f.name);

    if (filesToDeleteAvatar.length > 0) {
      console.log(`  🗑️ Borrando ${filesToDeleteAvatar.length} archivos de la raíz de AvatarItems...`);
      await supabase.storage.from('AvatarItems').remove(filesToDeleteAvatar);
    }

    // 2. Limpiar StoreItems (Raíz)
    const { data: storeFiles } = await supabase.storage.from('StoreItems').list('');
    const filesToDeleteStore = storeFiles.filter(f => !f.id ? false : f.name !== 'previews').map(f => f.name);

    if (filesToDeleteStore.length > 0) {
      console.log(`  🗑️ Borrando ${filesToDeleteStore.length} archivos de la raíz de StoreItems...`);
      await supabase.storage.from('StoreItems').remove(filesToDeleteStore);
    }

    // 3. Limpiar carpeta "clothes" de items que no son ropa (por el error anterior)
    const { data: clothesFiles } = await supabase.storage.from('AvatarItems').list('clothes');
    if (clothesFiles) {
      const wrongInClothes = clothesFiles.filter(f => 
        f.name.startsWith('eyes_') || 
        f.name.startsWith('hair_') || 
        f.name.startsWith('mouth_') || 
        f.name.startsWith('skin_')
      ).map(f => `clothes/${f.name}`);

      if (wrongInClothes.length > 0) {
        console.log(`  🗑️ Limpiando ${wrongInClothes.length} archivos incorrectos de AvatarItems/clothes/`);
        await supabase.storage.from('AvatarItems').remove(wrongInClothes);
      }
    }

    console.log('\n✅ ¡Limpieza completada! Ahora el Storage debería verse perfectamente organizado.');
  } catch (error) {
    console.error('\n💥 Error durante la limpieza:', error.message);
  }
}

cleanupStorage();
