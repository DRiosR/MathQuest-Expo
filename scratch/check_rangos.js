require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRangos() {
  console.log('--- Buscando marcos en cosmeticos_avatar/rangos ---');
  const { data: files, error } = await supabase.storage.from('cosmeticos_avatar').list('rangos');
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Archivos en rangos:');
  files.forEach(f => console.log(`- ${f.name}`));
}

checkRangos();
