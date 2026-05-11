const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  {
    nombre: 'CABELLO H 2',
    categoria: 'hair',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/hombre/cabello_h_2/cabello_H_02.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_2png',
    imagen_atras: null
  },
  {
    nombre: 'CABELLO H 3',
    categoria: 'hair',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/hombre/cabello_h_3/cabello_H_03.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_3.png',
    imagen_atras: null
  },
  {
    nombre: 'CABELLO H 4',
    categoria: 'hair',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/hombre/cabello_h_4/cabello_H_04.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_4.png',
    imagen_atras: null
  },
  {
    nombre: 'CABELLO H 5',
    categoria: 'hair',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/hombre/cabello_h_5/adelante_h_5.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_5.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/hombre/cabello_h_5/atras_h_5.png'
  }
];

async function addItems() {
  console.log('🚀 Agregando nuevos cabellos de hombre a la tienda...');
  const { data, error } = await supabase
    .from('tienda')
    .insert(items);

  if (error) {
    console.error('❌ Error al insertar items:', error);
  } else {
    console.log('✅ Items de hombre agregados exitosamente!');
  }
}

addItems();
