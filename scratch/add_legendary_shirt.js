const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  {
    nombre: 'CAMISA LEGENDARIA',
    categoria: 'clothes',
    calidad: 'legendario',
    precio: 3500,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_3/adelante_3.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/camisa/camisa_3.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_3/atras_3.png'
  }
];

async function addShirt() {
  console.log('🚀 Agregando camisa legendaria a la tienda...');
  const { data, error } = await supabase
    .from('tienda')
    .insert(items);

  if (error) {
    console.error('❌ Error al insertar items:', error);
  } else {
    console.log('✅ Camisa legendaria agregada exitosamente!');
  }
}

addShirt();
