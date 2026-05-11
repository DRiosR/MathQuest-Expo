require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scanAll() {
  const buckets = ['tienda_avatar', 'cosmeticos_avatar'];
  const categories = ['cabello/hombre', 'cabello/mujer', 'ojos', 'boca', 'camisa', 'skin'];
  
  for (const bucket of buckets) {
    console.log(`\n--- BUCKET: ${bucket} ---`);
    for (const cat of categories) {
      const { data } = await supabase.storage.from(bucket).list(cat);
      if (data) {
        data.forEach(item => {
           console.log(`${cat}/${item.name} (${item.id ? 'FILE' : 'DIR'})`);
        });
      }
    }
  }
}

scanAll();
