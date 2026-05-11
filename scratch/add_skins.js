const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const items = [
  {
    nombre: 'PIEL 2',
    categoria: 'skin',
    calidad: 'legendario',
    precio: 2000,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/skin/skin_2.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/skin/skin_tienda_2.png',
    imagen_atras: null
  },
  {
    nombre: 'PIEL 3',
    categoria: 'skin',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/skin/skin_3.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/skin/skin_tienda_3.png',
    imagen_atras: null
  },
  {
    nombre: 'PIEL 4',
    categoria: 'skin',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/skin/skin_4.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/skin/skin_tienda_4.png',
    imagen_atras: null
  },
  {
    nombre: 'PIEL 5',
    categoria: 'skin',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/skin/skin_5.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/skin/skin_tienda_5.png',
    imagen_atras: null
  },
  {
    nombre: 'PIEL 6',
    categoria: 'skin',
    calidad: 'raro',
    precio: 700,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/skin/skin_6.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/skin/skin_tienda_6.png',
    imagen_atras: null
  }
];

async function addSkins() {
  console.log('🚀 Agregando nuevas pieles a la tienda...');
  const { data, error } = await supabase
    .from('tienda')
    .insert(items);

  if (error) {
    console.error('❌ Error al insertar items:', error);
  } else {
    console.log('✅ Nuevas pieles agregadas exitosamente!');
  }
}

addSkins();
