require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listDir(bucket, path) {
  console.log(`\nListing ${bucket}:${path}...`);
  const { data, error } = await supabase.storage.from(bucket).list(path);
  if (data) data.forEach(f => console.log(`${f.id ? 'FILE' : 'DIR'}: ${f.name}`));
}

async function run() {
  await listDir('cosmeticos_avatar', 'cabello/mujer');
  await listDir('cosmeticos_avatar', 'cabello/hombre');
}

run();
