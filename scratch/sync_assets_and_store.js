require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontrados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SVG_DIR = './assets/svg/customization';
const PNG_DIR = './assets/images/store/customization';
const BUCKET = 'AvatarItems';

async function sync() {
  console.log('--- Iniciando Sincronización ---');

  // 1. Limpiar tabla tienda
  console.log('Limpiando tabla tienda...');
  const { error: clearError } = await supabase.from('tienda').delete().neq('id', 0);
  if (clearError) console.error('Error limpiando tienda:', clearError);

  // 2. Listar archivos locales
  const svgFiles = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));
  const pngFiles = fs.readdirSync(PNG_DIR).filter(f => f.endsWith('.png'));

  console.log(`Encontrados ${svgFiles.length} SVGs y ${pngFiles.length} PNGs.`);

  // 3. Procesar items
  // Agrupamos por base name (ej: skin_01)
  const items = {};

  svgFiles.forEach(file => {
    const base = file.replace('.svg', '');
    const category = base.split('_')[0];
    if (!items[base]) items[base] = { base, category };
    items[base].svg = file;
  });

  pngFiles.forEach(file => {
    const base = file.replace('_store.png', '').replace('.png', '');
    if (items[base]) {
      items[base].png = file;
    } else {
       const category = base.split('_')[0];
       items[base] = { base, category, png: file };
    }
  });

  console.log(`Procesando ${Object.keys(items).length} items únicos.`);

  for (const key in items) {
    const item = items[key];
    const category = item.category;
    
    let svgPublicUrl = null;
    let pngPublicUrl = null;

    // Subir SVG
    if (item.svg) {
      const filePath = path.join(SVG_DIR, item.svg);
      const storagePath = `${category}/${item.svg}`;
      const fileBuffer = fs.readFileSync(filePath);
      
      console.log(`Subiendo SVG: ${storagePath}`);
      const { error: upError } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
        upsert: true,
        contentType: 'image/svg+xml'
      });
      if (upError) console.error(`Error subiendo ${item.svg}:`, upError);
      
      svgPublicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    }

    // Subir PNG
    if (item.png) {
      const filePath = path.join(PNG_DIR, item.png);
      const storagePath = `${category}/${item.png}`;
      const fileBuffer = fs.readFileSync(filePath);
      
      console.log(`Subiendo PNG: ${storagePath}`);
      const { error: upError } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
        upsert: true,
        contentType: 'image/png'
      });
      if (upError) console.error(`Error subiendo ${item.png}:`, upError);
      
      pngPublicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    }

    // Insertar en Tienda
    if (svgPublicUrl || pngPublicUrl) {
      const dbItem = {
        nombre: key.replace('_', ' ').toUpperCase(),
        categoria: category,
        calidad: 'comun',
        precio: 50,
        imagen: svgPublicUrl || pngPublicUrl,
        imagen_tienda: pngPublicUrl || svgPublicUrl
      };
      
      const { error: insError } = await supabase.from('tienda').insert([dbItem]);
      if (insError) console.error(`Error insertando ${key} en DB:`, insError);
    }
  }

  console.log('--- Sincronización Completada ---');
}

sync();
