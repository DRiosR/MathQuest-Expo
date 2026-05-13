import { AvatarAssets } from '@/types/avatar';

// Import SVG files as React components
import Skin01 from '../assets/svg/customization/skin_01.svg';
import Skin02 from '../assets/svg/customization/skin_02.svg';
import Skin03 from '../assets/svg/customization/skin_03.svg';
import Skin04 from '../assets/svg/customization/skin_04.svg';
import Skin05 from '../assets/svg/customization/skin_05.svg';

import Hair01 from '../assets/svg/customization/hair_01.svg';
import Hair02 from '../assets/svg/customization/hair_02.svg';
import Hair03 from '../assets/svg/customization/hair_03.svg';

import Eyes01 from '../assets/svg/customization/eyes_01.svg';
import Eyes02 from '../assets/svg/customization/eyes_02.svg';
import Eyes03 from '../assets/svg/customization/eyes_03.svg';
import Eyes04 from '../assets/svg/customization/eyes_04.svg';

import Mouth01 from '../assets/svg/customization/mouth_01.svg';
import Mouth02 from '../assets/svg/customization/mouth_02.svg';
import Mouth03 from '../assets/svg/customization/mouth_03.svg';
import Mouth04 from '../assets/svg/customization/mouth_04.svg';

import Clothes01 from '../assets/svg/customization/clothes_01.svg';
import Clothes02 from '../assets/svg/customization/clothes_02.svg';
import Clothes03 from '../assets/svg/customization/clothes_03.svg';
import Clothes04 from '../assets/svg/customization/clothes_04.svg';
import Clothes05 from '../assets/svg/customization/clothes_05.svg';

const skinAssets = {
  skin01: Skin01,
  skin02: Skin02,
  skin03: Skin03,
  skin04: Skin04,
  skin05: Skin05,
};

const hairAssets = {
  none: null, // No hair option
  hair01: Hair01,
  hair02: Hair02,
  hair03: Hair03,
};

const eyesAssets = {
  eyes01: Eyes01,
  eyes02: Eyes02,
  eyes03: Eyes03,
  eyes04: Eyes04,
};

const mouthAssets = {
  none: null, // No mouth option
  mouth01: Mouth01,
  mouth02: Mouth02,
  mouth03: Mouth03,
  mouth04: Mouth04,
};

// For now, using skin as placeholder for clothes
const clothesAssets = {
  clothes01: Clothes01, // Placeholder
  clothes02: Clothes02,
  clothes03: Clothes03,
  clothes04: Clothes04,
  clothes05: Clothes05,
};

export const avatarAssets: AvatarAssets = {
  skin: skinAssets,
  hair: hairAssets,
  hair_back: {},
  eyes: eyesAssets,
  mouth: mouthAssets,
  clothes: clothesAssets,
  marco: {
    none: null,
  },
};

// Asset keys for easy iteration
export const assetKeys = {
  skin: Object.keys(skinAssets),
  hair: Object.keys(hairAssets),
  hair_back: [],
  eyes: Object.keys(eyesAssets),
  mouth: Object.keys(mouthAssets),
  clothes: Object.keys(clothesAssets),
  marco: {
    none: 'none',
  },
};

// Default avatar configuration
export const defaultAvatar = {
  skin_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/skin/skin_01.png',
  hair_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_01/delante_m_01.png',
  hair_back_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_01/atras_m_01.png',
  eyes_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_01.png',
  mouth_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/boca/boca_01.png',
  clothes_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_01.png',
  frame_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/delante_bronce.png',
  frame_back_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/atras_bronce.png',
};

// Category display names and icons
export const categoryConfig = {
  skin: {
    name: 'Skin',
    icon: 'user' as const,
    displayName: 'Piel',
  },
  hair: {
    name: 'Hair',
    icon: 'cut' as const,
    displayName: 'Cabello',
  },
  eyes: {
    name: 'Eyes',
    icon: 'eye' as const,
    displayName: 'Ojos',
  },
  mouth: {
    name: 'Mouth',
    icon: 'smile' as const,
    displayName: 'Boca',
  },
  clothes: {
    name: 'Clothes',
    icon: 'tshirt' as const,
    displayName: 'Ropa',
  },
  marco: {
    name: 'Frame',
    icon: 'border-all' as const,
    displayName: 'Marco',
  },
};

