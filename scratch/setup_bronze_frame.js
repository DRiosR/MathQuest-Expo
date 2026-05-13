require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBronzeFrame() {
  console.log('--- Configurando Marco de Bronce ---');

  // 1. Insertar en la tienda si no existe
  const bronzeFrame = {
    nombre: 'MARCO BRONCE 01',
    categoria: 'marco',
    calidad: 'comun',
    precio: 0,
    imagen: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/delante_bronce.png',
    imagen_atras: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/atras%20bronce.png',
    imagen_tienda: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/delante_bronce.png'
  };

  const { data: existing, error: checkError } = await supabase
    .from('tienda')
    .select('id')
    .eq('nombre', bronzeFrame.nombre)
    .maybeSingle();

  if (checkError) {
    console.error('Error verificando tienda:', checkError);
    return;
  }

  let productId;
  if (!existing) {
    const { data: inserted, error: insertError } = await supabase
      .from('tienda')
      .insert(bronzeFrame)
      .select('id')
      .single();
    
    if (insertError) {
      console.error('Error insertando en tienda:', insertError);
      return;
    }
    productId = inserted.id;
    console.log(`✅ Marco de Bronce añadido a la tienda con ID: ${productId}`);
  } else {
    productId = existing.id;
    console.log(`ℹ️ El Marco de Bronce ya existe en la tienda con ID: ${productId}`);
  }

  // 2. Darle el marco a todos los usuarios actuales
  console.log('Otorgando marco a todos los usuarios...');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id');
  if (pError) {
    console.error('Error obteniendo perfiles:', pError);
    return;
  }

  const inventoryItems = profiles.map(p => ({
    usuario_id: p.id,
    producto_id: productId
  }));

  const { error: invError } = await supabase.from('inventario').upsert(inventoryItems, { onConflict: 'usuario_id, producto_id' });
  
  if (invError) {
    // Si no hay restricción unique, puede fallar el onConflict. Intentamos insertar normal
    console.log('Intento de upsert falló o no soportado, probando inserción manual...');
    const { error: insertInvError } = await supabase.from('inventario').insert(inventoryItems);
    if (insertInvError && insertInvError.code !== '23505') {
       console.error('Error otorgando inventario:', insertInvError);
    } else {
       console.log('✅ Marco otorgado a usuarios existentes (algunos podrían haberlo tenido ya).');
    }
  } else {
    console.log('✅ Marco otorgado a todos los usuarios mediante upsert.');
  }

  // 3. Actualizar el avatar de todos los usuarios para que tengan el marco puesto si no tienen ninguno
  console.log('Actualizando avatares para incluir el marco por defecto...');
  const { data: avatars, error: avError } = await supabase.from('avatars').select('*');
  if (avError) {
    console.error('Error obteniendo avatares:', avError);
    return;
  }

  for (const av of avatars) {
    if (!av.frame_asset) {
      await supabase.from('avatars').update({
        frame_asset: bronzeFrame.imagen,
        frame_back_asset: bronzeFrame.imagen_atras
      }).eq('id', av.id);
    }
  }
  console.log('✅ Avatares actualizados.');
}

setupBronzeFrame();
