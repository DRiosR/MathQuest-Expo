require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontrados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBucketsAndFiles() {
  console.log('--- Explorando Supabase Storage ---');

  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
    console.error('Error listando buckets:', bError);
    return;
  }

  console.log('Buckets encontrados:', buckets.map(b => b.name));

  for (const bucket of buckets) {
    console.log(`\nContenido de bucket: ${bucket.name}`);
    const { data: files, error: fError } = await supabase.storage.from(bucket.name).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (fError) {
      console.error(`Error listando archivos en ${bucket.name}:`, fError);
      continue;
    }

    files.forEach(f => {
      console.log(` - ${f.name} (${f.id ? 'F' : 'D'})`);
    });
  }
}

listBucketsAndFiles();
