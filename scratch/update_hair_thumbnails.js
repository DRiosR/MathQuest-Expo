const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const updates = [
  {
    nombre: 'CABELLO H 1',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/hombre/cabello_tienda_H_01.png'
  },
  {
    nombre: 'CABELLO M 1',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/tienda_avatar/cabello/mujer/cabello_tienda_M_01.png'
  }
];

async function updateThumbnails() {
  console.log('🔄 Actualizando miniaturas de Cabello 1...');
  
  for (const item of updates) {
    const { error } = await supabase
      .from('tienda')
      .update({
        imagen_tienda: item.imagen_tienda
      })
      .eq('nombre', item.nombre);

    if (error) {
      console.error(`❌ Error al actualizar ${item.nombre}:`, error);
    } else {
      console.log(`✅ Miniatura de ${item.nombre} actualizada a _01.`);
    }
  }
}

updateThumbnails();
