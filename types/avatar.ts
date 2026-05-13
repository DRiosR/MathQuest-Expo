export type Avatar = {
    skin_asset: string;
    hair_asset?: string; //can be null
    hair_back_asset?: string; // layer behind the avatar
    eyes_asset: string; 
    mouth_asset?: string; //can be null
    clothes_asset: string;
    clothes_back_asset?: string; // layer behind the skin
    frame_asset?: string; // front layer of the frame
    frame_back_asset?: string; // back layer of the frame
};

export type AvatarAssets = {
    skin: { [key: string]: any };
    hair: { [key: string]: any };
    hair_back: { [key: string]: any };
    eyes: { [key: string]: any };
    mouth: { [key: string]: any };
    clothes: { [key: string]: any };
    marco: { [key: string]: any };
};

// default avatar
export const defaultAvatar: Avatar = {
    skin_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/skin/skin_01.png',
    hair_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_01/delante_m_01.png',
    hair_back_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/cabello/mujer/cabello_M_01/atras_m_01.png',
    eyes_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/ojos/ojos_01.png',
    mouth_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/boca/boca_01.png',
    clothes_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/camisa/camisa_01.png',
    frame_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/delante_bronce.png',
    frame_back_asset: 'https://fdfmtjjeylzznldkrqwl.supabase.co/storage/v1/object/public/cosmeticos_avatar/marco/rangos/bronce/atras%20bronce.png',
};

export type AvatarCategory = 'skin' | 'hair' | 'eyes' | 'mouth' | 'clothes' | 'marco';