const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const updates = [
  // Hombres
  { nombre: 'CABELLO H 2', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_02.png' },
  { nombre: 'CABELLO H 3', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_03.png' },
  { nombre: 'CABELLO H 4', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_04.png' },
  { nombre: 'CABELLO H 5', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_05.png' },
  // Mujeres
  { nombre: 'CABELLO M 2', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/mujer/cabello_tienda_M_02.png' },
  { nombre: 'CABELLO M 3', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/mujer/cabello_tienda_M_03.png' },
  { nombre: 'CABELLO M 4', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/mujer/cabello_tienda_M_04.png' },
  { nombre: 'CABELLO M 5', img: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/mujer/cabello_tienda_M_05.png' }
];

async function updateAllThumbnails() {
  console.log('🔄 Actualizando TODAS las miniaturas de Cabello (2-5)...');
  
  for (const item of updates) {
    const { error } = await supabase
      .from('tienda')
      .update({
        imagen_tienda: item.img
      })
      .eq('nombre', item.nombre);

    if (error) {
      console.error(`❌ Error al actualizar ${item.nombre}:`, error);
    } else {
      console.log(`✅ Miniatura de ${item.nombre} actualizada correctamente.`);
    }
  }
}

updateAllThumbnails();
