// List of base banned words (comprehensive vulgar terms, insults and bad words in Spanish and English)
const BANNED_WORDS = [
  // --- Anatomía y Vulgaridades ---
  'culo', 'pene', 'pito', 'pita', 'verga', 'ano', 'teta', 'tetas', 'pecho', 'pechos',
  'pepa', 'coño', 'orto', 'choto', 'chota', 'bola', 'bolas', 'huevo', 'huevos', 'chichi',
  'chichis', 'vulva', 'vagina', 'escroto', 'pija', 'pijo', 'monda', 'chimbo', 'chocha',
  'mame', 'mamar', 'soplar', 'pajear', 'pajeo',

  // --- Groserías e Insultos en Español ---
  'puto', 'puta', 'putito', 'putita', 'mierda', 'mierd', 'cagada', 'cagar', 'pendejo',
  'pendeja', 'zorra', 'pajero', 'pajera', 'cabron', 'cabrona', 'boludo', 'boluda',
  'joder', 'jodido', 'jodida', 'gonorrea', 'malparido', 'malparida', 'culon', 'culona',
  'chupamela', 'chupala', 'mamala', 'mamada', 'mamadas', 'culazo', 'hijodeputa',
  'hijadeputa', 'hijoeputa', 'hijaeputa', 'culero', 'culera', 'pendejazo', 'mierdilla',
  'pendejadas', 'marica', 'maricon', 'marico', 'maricona', 'soplanuca', 'soplamoco',
  'weon', 'weona', 'huevon', 'huevona', 'gilipollas', 'capullo', 'mamao', 'mamador',
  'mamadora', 'puton', 'putona', 'violador', 'pedofilo', 'nazi', 'hitler', 'facista',
  'estupido', 'estupida', 'idiota', 'pendejez',

  // --- Groserías e Insultos en Inglés ---
  'bitch', 'bastard', 'asshole', 'fuck', 'cunt', 'cock', 'dick', 'pussy', 'fucker',
  'shit', 'ass', 'whore', 'slut', 'motherfucker', 'nigga', 'nigger', 'retard',
  'dumbass', 'dickhead', 'prick', 'twat', 'wanker', 'bollocks'
];

// Map of common lookalike/leetspeak characters to standard letters
const CHAR_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '5': 's',
  '$': 's',
  '7': 't'
};

/**
 * Normalizes a string by converting to lowercase, removing accents/diacritics,
 * converting leetspeak lookalikes, and stripping non-alphanumeric characters.
 */
export function normalizeText(text: string): string {
  // 1. Lowercase and remove accents
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 2. Replace leetspeak characters
  let mapped = '';
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    mapped += CHAR_MAP[char] || char;
  }

  // 3. Remove all non-alphanumeric characters to catch spacing bypasses (e.g., "p.e.n.e", "c-u-l-o")
  return mapped.replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a string contains profane/banned words or their variations.
 */
export function containsProfanity(text: string): boolean {
  const normalized = normalizeText(text);

  for (const word of BANNED_WORDS) {
    // Prevent Scunthorpe problem:
    // If the banned word is very short (3 chars or less), only block if it matches exactly or is a clear prefix/suffix.
    if (word.length <= 3) {
      if (normalized === word || normalized.startsWith(word) || normalized.endsWith(word)) {
        return true;
      }
    } else {
      // For longer words, check substring presence, but bypass known false positives
      if (normalized.includes(word)) {
        // Safe exclusions
        if (word === 'pene' && normalized.includes('penelope')) {
          continue;
        }
        if (word === 'puta' && normalized.includes('diputado')) {
          continue;
        }
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates a username and returns whether it's valid and a specific localized error message if not.
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  const trimmed = username.trim();

  if (!trimmed) {
    return { isValid: false, error: 'El nombre de usuario es requerido' };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' };
  }

  if (trimmed.length > 15) {
    return { isValid: false, error: 'El nombre de usuario no puede tener más de 15 caracteres' };
  }

  // Only allow letters, numbers, underscores, and dots
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { isValid: false, error: 'Solo se permiten letras, números, puntos (.) y guiones bajos (_)' };
  }

  // Check for profanity
  if (containsProfanity(trimmed)) {
    return { isValid: false, error: 'Nombre de usuario inapropiado o no permitido' };
  }

  return { isValid: true };
}
