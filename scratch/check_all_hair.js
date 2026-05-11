require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFiles(bucket, path = '') {
  const { data, error } = await supabase.storage.from(bucket).list(path);
  if (error) return;

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) {
       await listFiles(bucket, fullPath);
    } else {
       console.log(`${bucket}: ${fullPath}`);
    }
  }
}

async function run() {
  await listFiles('cosmeticos_avatar', 'cabello/mujer');
}

run();
