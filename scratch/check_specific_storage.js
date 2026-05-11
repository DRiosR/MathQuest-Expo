require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFiles(bucket, path = '') {
  console.log(`\n--- Bucket: ${bucket}, Path: "${path}" ---`);
  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit: 100,
    offset: 0,
  });

  if (error) {
    console.error(`Error:`, error);
    return;
  }

  for (const item of data) {
    if (item.id === null) { // It's a directory
       await listFiles(bucket, path ? `${path}/${item.name}` : item.name);
    } else {
       console.log(`File: ${path}/${item.name}`);
    }
  }
}

async function run() {
  await listFiles('cosmeticos_avatar', 'cabello/mujer/cabello_M_01');
  await listFiles('tienda_avatar', 'cabello');
}

run();
