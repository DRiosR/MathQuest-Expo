require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scanTienda() {
  console.log('--- Escaneando tienda_avatar ---');
  const categories = ['cabello', 'ojos', 'boca', 'camisa', 'skin'];
  
  for (const cat of categories) {
    console.log(`\nEscaneando ${cat}...`);
    // Intentar listar subcarpetas (hombre/mujer)
    const { data: subdirs } = await supabase.storage.from('tienda_avatar').list(cat);
    
    if (!subdirs) continue;

    for (const sub of subdirs) {
      if (sub.id === null) { // es carpeta
         const { data: files } = await supabase.storage.from('tienda_avatar').list(`${cat}/${sub.name}`);
         if (files) {
           files.forEach(f => console.log(`TIENDA: ${cat}/${sub.name}/${f.name}`));
         }
      } else {
         console.log(`TIENDA: ${cat}/${sub.name}`);
      }
    }
  }

  console.log('\n--- Escaneando cosmeticos_avatar ---');
  for (const cat of categories) {
     const { data: files } = await supabase.storage.from('cosmeticos_avatar').list(cat, { limit: 100 });
     if (files) {
        files.forEach(f => {
           if (f.id === null) {
              console.log(`COSMETICO (DIR): ${cat}/${f.name}`);
           } else {
              console.log(`COSMETICO (FILE): ${cat}/${f.name}`);
           }
        });
     }
  }
}

scanTienda();
