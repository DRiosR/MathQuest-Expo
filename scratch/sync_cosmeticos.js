require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = 'cosmeticos_avatar';
const CATEGORY_MAP = {
  'skin': 'skin',
  'ojos': 'eyes',
  'boca': 'mouth',
  'cabello': 'hair',
  'camisa': 'clothes'
};

async function syncCosmeticos() {
  console.log('--- Sincronizando desde cosmeticos_avatar ---');

  // 1. Limpiar tienda
  const { error: delError } = await supabase.from('tienda').delete().neq('id', 0);
  if (delError) console.error('Error al limpiar tienda:', delError);

  // 2. Iterar carpetas
  for (const [folder, category] of Object.entries(CATEGORY_MAP)) {
    console.log(`Procesando carpeta: ${folder} (categoría: ${category})`);
    
    const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(folder);
    if (listError) {
      console.error(`Error listando ${folder}:`, listError);
      continue;
    }

    const itemsToInsert = [];

    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${folder}/${file.name}`;
      
      itemsToInsert.push({
        nombre: file.name.split('.')[0].replace('_', ' ').toUpperCase(),
        categoria: category,
        calidad: 'comun',
        precio: 50,
        imagen: publicUrl,
        imagen_tienda: publicUrl // Usamos la misma ya que es PNG
      });
    }

    if (itemsToInsert.length > 0) {
      const { error: insError } = await supabase.from('tienda').insert(itemsToInsert);
      if (insError) console.error(`Error insertando items de ${folder}:`, insError);
      else console.log(`   ✅ Insertados ${itemsToInsert.length} items.`);
    }
  }

  console.log('--- Sincronización Completada ---');
}

syncCosmeticos();
