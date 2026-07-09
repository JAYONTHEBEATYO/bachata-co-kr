export const avatarPresets = [
  { id: "bachata-step", emoji: "💃", label: "스텝" },
  { id: "latin-night", emoji: "🕺", label: "라틴" },
  { id: "music-count", emoji: "🎵", label: "박자" },
  { id: "festival-light", emoji: "✨", label: "페스티벌" },
  { id: "social-floor", emoji: "🔥", label: "소셜" },
  { id: "practice-mode", emoji: "🎧", label: "연습" }
];

export const avatarFromSeed = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }
  return avatarPresets[Math.abs(hash) % avatarPresets.length];
};
