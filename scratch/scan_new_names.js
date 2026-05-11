require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scanNewStructure() {
  const buckets = ['tienda_avatar', 'cosmeticos_avatar'];
  const categories = ['cabello/hombre', 'cabello/mujer', 'ojos', 'boca', 'camisa', 'skin'];
  
  for (const bucket of buckets) {
    console.log(`\n--- BUCKET: ${bucket} ---`);
    for (const cat of categories) {
      const { data } = await supabase.storage.from(bucket).list(cat);
      if (data) {
        for (const item of data) {
           if (item.id) {
             console.log(`${cat}/${item.name} (FILE)`);
           } else {
             console.log(`${cat}/${item.name} (DIR)`);
             // List contents of subdirs for hair
             if (cat.startsWith('cabello')) {
                const { data: subData } = await supabase.storage.from(bucket).list(`${cat}/${item.name}`);
                if (subData) subData.forEach(s => console.log(`  -> ${cat}/${item.name}/${s.name}`));
             }
           }
        }
      }
    }
  }
}

scanNewStructure();
