const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateOjos6() {
  console.log('🔄 Actualizando asset de OJOS 6 a la versión _06...');
  
  const { error } = await supabase
    .from('tienda')
    .update({
      imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_06.png'
    })
    .eq('nombre', 'OJOS 6');

  if (error) {
    console.error(`❌ Error al actualizar OJOS 6:`, error);
  } else {
    console.log(`✅ Asset de OJOS 6 actualizado correctamente a ojos_06.png.`);
  }
}

updateOjos6();
