require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHair() {
  const categories = ['cabello/hombre', 'cabello/mujer'];
  for (const cat of categories) {
    console.log(`\nChecking ${cat} in cosmeticos_avatar...`);
    const { data: subdirs } = await supabase.storage.from('cosmeticos_avatar').list(cat);
    if (!subdirs) continue;
    for (const sub of subdirs) {
      if (sub.id === null) {
        const { data: files } = await supabase.storage.from('cosmeticos_avatar').list(`${cat}/${sub.name}`);
        console.log(`Folder: ${cat}/${sub.name}`);
        if (files) files.forEach(f => console.log(`  File: ${f.name}`));
      }
    }
  }
}

checkHair();
