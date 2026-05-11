require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scanFullTienda() {
  const categories = ['ojos', 'boca', 'camisa', 'skin'];
  console.log('--- Scanning TIENDA_AVATAR for other categories ---');
  for (const cat of categories) {
    const { data } = await supabase.storage.from('tienda_avatar').list(cat);
    if (data) data.forEach(f => console.log(`${cat}/${f.name}`));
  }
  
  console.log('\n--- Scanning COSMETICOS_AVATAR for other categories ---');
  for (const cat of categories) {
    const { data } = await supabase.storage.from('cosmeticos_avatar').list(cat);
    if (data) data.forEach(f => console.log(`${cat}/${f.name}`));
  }
}

scanFullTienda();
