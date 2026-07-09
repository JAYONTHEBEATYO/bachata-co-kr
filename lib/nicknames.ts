const terms = [
  "센슈얼",
  "도미니칸",
  "인플루언스",
  "트레디셔널",
  "풋워크",
  "베이직",
  "라떼랄",
  "바일라",
  "꼰띠고",
  "바차테라",
  "바차테로",
  "리드",
  "팔로우",
  "소셜",
  "홀딩",
  "아이솔레이션",
  "바디웨이브",
  "리듬",
  "뮤지컬리티",
  "타이밍",
  "프레임",
  "커넥션",
  "샤인",
  "턴패턴",
  "웨이브",
  "스텝",
  "카운트",
  "플로어",
  "파티",
  "워크숍",
  "부트캠프",
  "페스티벌",
  "라틴",
  "댄스",
  "한곡반",
  "오픈홀드",
  "클로즈드홀드",
  "바차타"
];

const bannedNamePieces = [
  "쥬디스",
  "헤로",
  "멜빈",
  "가티카",
  "크리스티안",
  "가브리엘라",
  "로렌",
  "그레이",
  "쥬벨",
  "클루니",
  "져니",
  "류지",
  "원준",
  "요니"
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

const randomNumber = () => {
  const bytes = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes[0] % 1000;
  }
  return Math.floor(Math.random() * 1000);
};

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const buildNickname = (term: string, number: number) => `${term}${number.toString().padStart(3, "0")}`;

export const randomKoreanNickname = () => buildNickname(terms[randomIndex(terms.length)], randomNumber());

export const nicknameFromSeed = (seed: string) => {
  const hash = hashSeed(seed || "bachata");
  return buildNickname(terms[hash % terms.length], Math.floor(hash / terms.length) % 1000);
};

export const isSafeGuestNickname = (name: string) =>
  new RegExp(`^(${terms.join("|")})\\d{3}$`).test(name);

export const needsNicknameRefresh = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/^(anon|guest)_/i.test(trimmed)) return true;
  if (/[?]{2,}|�/.test(trimmed)) return true;
  if (bannedNamePieces.some((piece) => trimmed.includes(piece))) return true;
  return false;
};

export const displayGuestNickname = (name: string, seed: string) => {
  if (isSafeGuestNickname(name)) return name;
  if (needsNicknameRefresh(name)) return nicknameFromSeed(seed);
  return name.slice(0, 32);
};
