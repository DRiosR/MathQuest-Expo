const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  {
    nombre: 'BOCA 2',
    categoria: 'mouth',
    calidad: 'epico',
    precio: 1500,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/boca/boca_2.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/boca/boca_tienda_2.png',
    imagen_atras: null
  },
  {
    nombre: 'BOCA 3',
    categoria: 'mouth',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/boca/boca_3.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/boca/boca_tienda_3.png',
    imagen_atras: null
  },
  {
    nombre: 'BOCA 4',
    categoria: 'mouth',
    calidad: 'epico',
    precio: 1500,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/boca/boca_4.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/boca/boca_tienda_4.png',
    imagen_atras: null
  },
  {
    nombre: 'BOCA 5',
    categoria: 'mouth',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/boca/boca_5.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/boca/boca_tienda_5.png',
    imagen_atras: null
  },
  {
    nombre: 'BOCA 6',
    categoria: 'mouth',
    calidad: 'legendario',
    precio: 2000,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/boca/boca_6.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/boca/boca_tienda_6.png',
    imagen_atras: null
  }
];

async function addMouths() {
  console.log('🚀 Agregando nuevas bocas a la tienda...');
  const { data, error } = await supabase
    .from('tienda')
    .insert(items);

  if (error) {
    console.error('❌ Error al insertar items:', error);
  } else {
    console.log('✅ Nuevas bocas agregadas exitosamente!');
  }
}

addMouths();
