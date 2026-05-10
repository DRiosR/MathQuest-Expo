const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyAvatars() {
  console.log('🔍 Verificando rutas en la tabla "avatars"...');
  const { data, error } = await supabase.from('avatars').select('*').limit(3);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  data.forEach(av => {
    console.log(`\n👤 Usuario: ${av.profile_id}`);
    console.log(`   - Skin: ${av.skin_asset}`);
    console.log(`   - Hair: ${av.hair_asset}`);
    console.log(`   - Eyes: ${av.eyes_asset}`);
    console.log(`   - Mouth: ${av.mouth_asset}`);
    console.log(`   - Clothes: ${av.clothes_asset}`);
  });
}

verifyAvatars();
