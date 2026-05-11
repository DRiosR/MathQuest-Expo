const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  {
    nombre: 'CAMISA 5',
    categoria: 'clothes',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_5.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/camisa/camisa_tienda_5.png',
    imagen_atras: null
  }
];

async function addShirt5() {
  console.log('🚀 Agregando camisa 5 a la tienda...');
  const { data, error } = await supabase
    .from('tienda')
    .insert(items);

  if (error) {
    console.error('❌ Error al insertar items:', error);
  } else {
    console.log('✅ Camisa 5 agregada exitosamente!');
  }
}

addShirt5();
