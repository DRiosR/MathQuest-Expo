const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const itemsToUpdate = [
  {
    nombre: 'CABELLO M 3',
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_3/delante_m_03.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_3/atras_m_03.png'
  },
  {
    nombre: 'CABELLO M 4',
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_4/delante_m_04.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_4/atras_m_04.png'
  },
  {
    nombre: 'CABELLO M 5',
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_5/delante_m_05.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_5/atras.png'
  }
];

async function updateItems() {
  console.log('🔄 Corrigiendo URLs de los cabellos en la tienda...');
  
  for (const item of itemsToUpdate) {
    const { error } = await supabase
      .from('tienda')
      .update({
        imagen: item.imagen,
        imagen_atras: item.imagen_atras
      })
      .eq('nombre', item.nombre);

    if (error) {
      console.error(`❌ Error al actualizar ${item.nombre}:`, error);
    } else {
      console.log(`✅ ${item.nombre} actualizado correctamente.`);
    }
  }
}

updateItems();
