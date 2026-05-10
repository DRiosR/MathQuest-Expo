const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: No se encontraron las variables de entorno de Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listStorage() {
  console.log('🔍 Buscando buckets en Supabase Storage...');
  
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Error al listar buckets:', bucketsError.message);
    return;
  }

  if (!buckets || buckets.length === 0) {
    console.log('ℹ️ No se encontraron buckets en el Storage.');
    return;
  }

  for (const bucket of buckets) {
    console.log(`\n📦 Bucket: ${bucket.name} (Public: ${bucket.public})`);
    
    const { data: files, error: filesError } = await supabase.storage.from(bucket.name).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (filesError) {
      console.error(`   ❌ Error al listar archivos en ${bucket.name}:`, filesError.message);
      continue;
    }

    if (!files || files.length === 0) {
      console.log('   (Vacío)');
    } else {
      files.forEach(file => {
        const size = (file.metadata?.size / 1024).toFixed(2);
        console.log(`   - 📄 ${file.name} (${size} KB) - ${file.metadata?.mimetype}`);
      });
    }
  }
}

listStorage();
