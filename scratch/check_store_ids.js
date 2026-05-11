require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStoreIds() {
  console.log('--- Listando IDs de la Tienda ---');
  const { data, error } = await supabase
    .from('tienda')
    .select('id, nombre')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  data.forEach(item => {
    console.log(`ID: ${item.id} - Nombre: ${item.nombre}`);
  });
}

checkStoreIds();
