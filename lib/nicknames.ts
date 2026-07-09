const prefixes = [
  "망괄량이",
  "술취한",
  "심쿵",
  "리듬타는",
  "박자잡는",
  "소셜가는",
  "한곡만더",
  "불금",
  "월요병",
  "라틴불꽃",
  "도미니칸",
  "센슈얼",
  "홍대사는",
  "강남가는",
  "멜번사는",
  "새벽연습",
  "물병든",
  "턴돌다",
  "골반요정",
  "풋워크"
];

const names = [
  "쥬디스",
  "헤로",
  "멜빈",
  "가티카",
  "크리스티안",
  "가브리엘라",
  "바차테라",
  "바차테로",
  "미글레",
  "게로",
  "로렌",
  "그레이",
  "세라",
  "와플",
  "달콩",
  "소라",
  "스카",
  "쥬벨",
  "클루니",
  "져니",
  "류지",
  "꽃라라",
  "원준",
  "요니",
  "고니",
  "라틴러"
];

const suffixes = [
  "",
  "등장",
  "출근",
  "퇴근",
  "입문중",
  "소셜중",
  "한곡반",
  "턴실패",
  "기본기중",
  "파티감",
  "밥뭐먹래",
  "티키타카",
  "박자요정",
  "연습생",
  "오늘도춤"
];

const randomIndex = (length: number) => {
  if (length <= 0) return 0;
  const bytes = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes[0] % length;
  }
  return Math.floor(Math.random() * length);
};

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const buildNickname = (prefixIndex: number, nameIndex: number, suffixIndex: number, number: number) => {
  const suffix = suffixes[suffixIndex] || "";
  return `${prefixes[prefixIndex]}${names[nameIndex]}${suffix}${number.toString().padStart(2, "0")}`;
};

export const randomKoreanNickname = () =>
  buildNickname(
    randomIndex(prefixes.length),
    randomIndex(names.length),
    randomIndex(suffixes.length),
    randomIndex(90) + 10
  );

export const nicknameFromSeed = (seed: string) => {
  const hash = hashSeed(seed || "bachata");
  return buildNickname(
    hash % prefixes.length,
    Math.floor(hash / prefixes.length) % names.length,
    Math.floor(hash / prefixes.length / names.length) % suffixes.length,
    (hash % 90) + 10
  );
};

export const displayGuestNickname = (name: string, seed: string) => {
  if (/^(anon|guest)_/i.test(name)) return nicknameFromSeed(seed);
  return name;
};
