const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStoreTable() {
  console.log('🔍 Consultando tabla "tienda"...');
  const { data, error } = await supabase.from('tienda').select('*').limit(5);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('ℹ️ La tabla "tienda" está vacía.');
    return;
  }

  console.log('✅ Primeros 5 items de la tienda:');
  data.forEach(item => {
    console.log(`- [${item.id}] ${item.nombre} | Imagen: ${item.imagen} | Tienda: ${item.imagen_tienda}`);
  });
}

checkStoreTable();
