const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  {
    nombre: 'OJOS 2',
    categoria: 'eyes',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_2.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/ojos/ojos_tienda_2.png',
    imagen_atras: null
  },
  {
    nombre: 'OJOS 3',
    categoria: 'eyes',
    calidad: 'legendario',
    precio: 2000,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_3.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/ojos/ojos_tienda_3.png',
    imagen_atras: null
  },
  {
    nombre: 'OJOS 4',
    categoria: 'eyes',
    calidad: 'epico',
    precio: 1500,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_4.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/ojos/ojos_tienda_4.png',
    imagen_atras: null
  },
  {
    nombre: 'OJOS 5',
    categoria: 'eyes',
    calidad: 'raro',
    precio: 600,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_5.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/ojos/ojos_tienda_5.png',
    imagen_atras: null
  },
  {
    nombre: 'OJOS 6',
    categoria: 'eyes',
    calidad: 'raro',
    precio: 600,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_6.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/ojos/ojos_tienda_6.png',
    imagen_atras: null
  }
];

async function addItems() {
  console.log('🚀 Agregando nuevos ojos a la tienda...');
  const { data, error } = await supabase
    .from('tienda')
    .insert(items);

  if (error) {
    console.error('❌ Error al insertar items:', error);
  } else {
    console.log('✅ Nuevos ojos agregados exitosamente!');
  }
}

addItems();
