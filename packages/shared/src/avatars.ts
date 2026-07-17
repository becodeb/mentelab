/** Avatares elegibles por los alumnos (emoji — sin assets externos). */
export const AVATARS: Record<string, string> = {
  fox: "🦊",
  panda: "🐼",
  dino: "🦖",
  frog: "🐸",
  unicorn: "🦄",
  tiger: "🐯",
  owl: "🦉",
  koala: "🐨",
  penguin: "🐧",
  cat: "🐱",
  dog: "🐶",
  monkey: "🐵",
  lion: "🦁",
  bear: "🐻",
  rabbit: "🐰",
  octopus: "🐙",
};

export const AVATAR_IDS = Object.keys(AVATARS);

export function avatarEmoji(avatarId: string): string {
  return AVATARS[avatarId] ?? "🙂";
}

/** Imágenes de la clave visual (PICTURE): el alumno elige 3 de estas 9. */
export const PICTURE_KEYS: Record<string, string> = {
  apple: "🍎",
  ball: "⚽",
  rocket: "🚀",
  star: "⭐",
  fish: "🐟",
  car: "🚗",
  flower: "🌸",
  moon: "🌙",
  pizza: "🍕",
};
export const PICTURE_KEY_IDS = Object.keys(PICTURE_KEYS);
