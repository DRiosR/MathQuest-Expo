const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateOjos3() {
  console.log('🔄 Actualizando asset de OJOS 3 a la versión _03...');
  
  const { error } = await supabase
    .from('tienda')
    .update({
      imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_03.png'
    })
    .eq('nombre', 'OJOS 3');

  if (error) {
    console.error(`❌ Error al actualizar OJOS 3:`, error);
  } else {
    console.log(`✅ Asset de OJOS 3 actualizado correctamente a ojos_03.png.`);
  }
}

updateOjos3();
