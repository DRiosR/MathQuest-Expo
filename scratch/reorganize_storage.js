const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Faltan credenciales en el .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function organizeStorage() {
  console.log('🚀 Iniciando reorganización de Storage y Base de Datos...');

  try {
    const { data: items, error: fetchError } = await supabase.from('tienda').select('*');
    if (fetchError) throw fetchError;

    console.log(`📦 Procesando ${items.length} items...`);

    for (const item of items) {
      let updatedData = {};

      // --- PROCESAR SVG (AvatarItems) ---
      if (item.imagen && item.imagen.includes('AvatarItems')) {
        const parts = item.imagen.split('/AvatarItems/');
        const oldPath = parts[1];
        
        if (!oldPath.startsWith(`${item.categoria}/`)) {
          const fileName = oldPath.split('/').pop();
          const newPath = `${item.categoria}/${fileName}`;
          
          console.log(`  🔄 Moviendo SVG: ${oldPath} -> ${newPath}`);
          
          const { error: copyError } = await supabase.storage
            .from('AvatarItems')
            .copy(oldPath, newPath);
          
          if (!copyError || copyError.message.includes('already exists')) {
            updatedData.imagen = `${supabaseUrl}/storage/v1/object/public/AvatarItems/${newPath}`;
          }
        }
      }

      // --- PROCESAR PNG (StoreItems) ---
      if (item.imagen_tienda && item.imagen_tienda.includes('StoreItems')) {
        const parts = item.imagen_tienda.split('/StoreItems/');
        const oldPath = parts[1];
        
        if (!oldPath.startsWith('previews/')) {
          const fileName = oldPath.split('/').pop();
          const newPath = `previews/${fileName}`;
          
          console.log(`  🔄 Moviendo PNG: ${oldPath} -> ${newPath}`);
          
          const { error: copyError } = await supabase.storage
            .from('StoreItems')
            .copy(oldPath, newPath);
          
          if (!copyError || copyError.message.includes('already exists')) {
            updatedData.imagen_tienda = `${supabaseUrl}/storage/v1/object/public/StoreItems/${newPath}`;
          }
        }
      }

      if (Object.keys(updatedData).length > 0) {
        const { error: updateError } = await supabase
          .from('tienda')
          .update(updatedData)
          .eq('id', item.id);
        
        if (!updateError) console.log(`    ✅ Item ${item.id} (${item.categoria}) actualizado.`);
      }
    }

    console.log('\n✨ ¡Organización completada con éxito!');
  } catch (error) {
    console.error('\n💥 Error fatal:', error.message);
  }
}

organizeStorage();
