const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  {
    nombre: 'CAMISA 2',
    categoria: 'clothes',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_2/adelante_2.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/camisa/camisa_tienda_2.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_2/atras_2.png'
  },
  {
    nombre: 'CAMISA 4',
    categoria: 'clothes',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_4/delante_4.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/camisa/camisa_tienda_4.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_4/atras_4.png'
  }
];

async function addShirts() {
  console.log('🚀 Agregando camisas 2 y 4 a la tienda...');
  const { data, error } = await supabase
    .from('tienda')
    .insert(items);

  if (error) {
    console.error('❌ Error al insertar items:', error);
  } else {
    console.log('✅ Camisas 2 y 4 agregadas exitosamente!');
  }
}

addShirts();
