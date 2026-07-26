export type PosterAnalysisResult = {
  id: string;
  title: string;
  eventKind: string;
  intro: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  hosts: string[];
  instructors: string[];
  djs: string[];
  performers: string[];
  program: string[];
  prices: string[];
  registration: string[];
  contacts: string[];
  dressCode: string;
  notices: string[];
  tags: string[];
  confidence: number;
  uncertainFields: string[];
  sourceTextPreview: string;
  draftBody: string;
  cached: boolean;
};

export type PosterAnalysisApplyValue = {
  title: string;
  body: string;
  tags: string[];
};

type PosterFields = Omit<
  PosterAnalysisResult,
  "id" | "sourceTextPreview" | "draftBody" | "cached"
>;

const cleanLine = (value: unknown, maxLength = 180) => (
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : ""
);

const cleanList = (value: unknown, maxItems = 12, maxLength = 140) => (
  Array.isArray(value)
    ? [...new Set(value.map((item) => cleanLine(item, maxLength)).filter(Boolean))].slice(0, maxItems)
    : []
);

const uncertainFieldLabels: Record<string, string> = {
  title: "행사명",
  eventKind: "행사 종류",
  date: "날짜",
  time: "시간",
  venue: "장소",
  address: "주소",
  prices: "참가비",
  registration: "신청 방법",
  contacts: "문의처",
  dressCode: "드레스 코드"
};

const ignoredTags = new Set(["지역", "종류", "행사 종류", "행사종류", "키워드", "태그"]);

export const posterAnalysisSchema = {
  type: "object",
  properties: {
    title: { type: "string", maxLength: 120 },
    eventKind: { type: "string", maxLength: 40 },
    intro: { type: "string", maxLength: 320 },
    date: { type: "string", maxLength: 100 },
    time: { type: "string", maxLength: 100 },
    venue: { type: "string", maxLength: 120 },
    address: { type: "string", maxLength: 180 },
    hosts: { type: "array", items: { type: "string" }, maxItems: 10 },
    instructors: { type: "array", items: { type: "string" }, maxItems: 12 },
    djs: { type: "array", items: { type: "string" }, maxItems: 12 },
    performers: { type: "array", items: { type: "string" }, maxItems: 12 },
    program: { type: "array", items: { type: "string" }, maxItems: 16 },
    prices: { type: "array", items: { type: "string" }, maxItems: 12 },
    registration: { type: "array", items: { type: "string" }, maxItems: 10 },
    contacts: { type: "array", items: { type: "string" }, maxItems: 10 },
    dressCode: { type: "string", maxLength: 100 },
    notices: { type: "array", items: { type: "string" }, maxItems: 12 },
    tags: { type: "array", items: { type: "string" }, maxItems: 8 },
    confidence: { type: "number" },
    uncertainFields: { type: "array", items: { type: "string" }, maxItems: 12 }
  },
  required: [
    "title",
    "eventKind",
    "intro",
    "date",
    "time",
    "venue",
    "address",
    "hosts",
    "instructors",
    "djs",
    "performers",
    "program",
    "prices",
    "registration",
    "contacts",
    "dressCode",
    "notices",
    "tags",
    "confidence",
    "uncertainFields"
  ]
} as const;

export const normalizePosterFields = (value: unknown): PosterFields | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const fields: PosterFields = {
    title: cleanLine(source.title, 120),
    eventKind: cleanLine(source.eventKind, 40),
    intro: cleanLine(source.intro, 320),
    date: cleanLine(source.date, 100),
    time: cleanLine(source.time, 100),
    venue: cleanLine(source.venue, 120),
    address: cleanLine(source.address, 180),
    hosts: cleanList(source.hosts, 10),
    instructors: cleanList(source.instructors, 12),
    djs: cleanList(source.djs, 12),
    performers: cleanList(source.performers, 12),
    program: cleanList(source.program, 16),
    prices: cleanList(source.prices, 12),
    registration: cleanList(source.registration, 10, 220),
    contacts: cleanList(source.contacts, 10, 160),
    dressCode: cleanLine(source.dressCode, 100),
    notices: cleanList(source.notices, 12, 220),
    tags: cleanList(source.tags, 8, 20)
      .map((tag) => tag.replace(/^#/, ""))
      .filter((tag) => !ignoredTags.has(tag)),
    confidence: Math.max(0, Math.min(1, Number(source.confidence) || 0)),
    uncertainFields: cleanList(source.uncertainFields, 12, 80)
      .map((field) => uncertainFieldLabels[field] || field)
  };

  if (!fields.title && !fields.date && !fields.venue && !fields.program.length) return null;
  const observedConfidence = [
    fields.title ? 0.2 : 0,
    fields.date ? 0.15 : 0,
    fields.time ? 0.1 : 0,
    fields.venue ? 0.15 : 0,
    fields.address ? 0.1 : 0,
    fields.hosts.length || fields.instructors.length || fields.djs.length || fields.performers.length ? 0.1 : 0,
    fields.program.length ? 0.05 : 0,
    fields.prices.length ? 0.05 : 0,
    fields.registration.length ? 0.05 : 0,
    fields.contacts.length ? 0.05 : 0
  ].reduce((sum, score) => sum + score, 0);
  fields.confidence = Math.max(fields.confidence, observedConfidence);
  if (!fields.tags.includes("바차타")) fields.tags.unshift("바차타");
  if (fields.eventKind && !fields.tags.includes(fields.eventKind)) fields.tags.push(fields.eventKind);
  fields.tags = fields.tags.slice(0, 8);
  if (!fields.date && !fields.uncertainFields.includes("날짜")) fields.uncertainFields.push("날짜");
  if (fields.date && !/(?:19|20)\d{2}/.test(fields.date) && !fields.uncertainFields.includes("연도")) {
    fields.uncertainFields.push("연도");
  }
  if (!fields.venue && !fields.uncertainFields.includes("장소")) fields.uncertainFields.push("장소");
  return fields;
};

const appendSection = (parts: string[], icon: string, title: string, lines: string[]) => {
  const values = lines.map((line) => line.trim()).filter(Boolean);
  if (!values.length) return;
  parts.push(`${icon} ${title}\n${values.join("\n")}`);
};

export const buildPosterDraft = (fields: PosterFields) => {
  const parts: string[] = [];
  const intro = fields.intro.length >= 20
    ? fields.intro
    : `${fields.title || "바차타 행사"} 포스터에서 확인되는 정보를 보기 쉽게 정리했습니다.`;
  parts.push(intro);

  appendSection(parts, "📅", "일정", [
    fields.date,
    fields.time
  ]);
  appendSection(parts, "📍", "장소", [
    fields.venue,
    fields.address
  ]);
  appendSection(parts, "🕺", "함께하는 사람들", [
    ...fields.hosts.map((item) => `주최 · ${item}`),
    ...fields.instructors.map((item) => `강사 · ${item}`),
    ...fields.djs.map((item) => `DJ · ${item}`),
    ...fields.performers.map((item) => `공연 · ${item}`)
  ]);
  appendSection(parts, "🎵", "프로그램", fields.program);
  appendSection(parts, "💳", "참가비", fields.prices);
  appendSection(parts, "🔗", "신청", fields.registration);
  appendSection(parts, "💬", "문의", fields.contacts);
  appendSection(parts, "👗", "드레스 코드", [fields.dressCode]);
  appendSection(parts, "📌", "알아둘 점", fields.notices);

  return parts.join("\n\n").trim();
};

export const posterCategoryLabel = (category: string) => (
  category === "promotion" ? "홍보" : "행사"
);
