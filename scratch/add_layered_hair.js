require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontrados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Iniciando Actualización de Base de Datos ---');

  // Intentar agregar columnas si no existen (esto fallará si no hay rpc de SQL, pero lo intentamos por si acaso hay un endpoint)
  // Como no hay rpc, lo más probable es que falle. Pero podemos intentar insertar directamente.
  
  const newItem = {
    nombre: 'CABELLO M 01',
    categoria: 'hair',
    calidad: 'raro',
    precio: 100,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_01/delante_m_01.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_01/atras_m_01.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_01/delante_m_01.png'
  };

  console.log('Insertando nuevo item en la tienda...');
  const { data, error } = await supabase.from('tienda').insert([newItem]).select();

  if (error) {
    if (error.message.includes('column "imagen_atras" of relation "tienda" does not exist')) {
      console.error('\n❌ ERROR: La columna "imagen_atras" no existe en la tabla "tienda".');
      console.log('Por favor, ejecuta el siguiente SQL en el editor de Supabase:\n');
      console.log('ALTER TABLE tienda ADD COLUMN imagen_atras text;');
      console.log('ALTER TABLE avatars ADD COLUMN hair_back_asset text;');
    } else {
      console.error('Error insertando item:', error);
    }
  } else {
    console.log('✅ Item insertado correctamente:', data);
  }

  console.log('\n--- Proceso Finalizado ---');
}

run();
