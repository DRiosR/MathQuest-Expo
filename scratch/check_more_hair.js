require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMoreHair() {
  const folders = [
    'cabello/mujer/cabello_M_03',
    'cabello/mujer/cabello_M_04',
    'cabello/mujer/cabello_M_05',
    'cabello/hombre/cabello_H_02',
    'cabello/hombre/cabello_H_03',
    'cabello/hombre/cabello_H_04',
    'cabello/hombre/cabello_H_05'
  ];
  for (const folder of folders) {
    const { data: files } = await supabase.storage.from('cosmeticos_avatar').list(folder);
    console.log(`Folder: ${folder}`);
    if (files) files.forEach(f => console.log(`  File: ${f.name}`));
  }
}

checkMoreHair();
