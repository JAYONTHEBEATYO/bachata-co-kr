export type SortMode = "hot" | "new" | "top" | "rising";

export type Community = {
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  color: string;
};

export type SourceLink = {
  label: string;
  url: string;
};

export type Thread = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  communitySlug: string;
  communityName: string;
  flair: string;
  author: string;
  createdAt: string;
  score: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  videoId?: string;
  imageUrl?: string;
  sourceLinks: SourceLink[];
  tags: string[];
  pinned?: boolean;
};

export type Comment = {
  id: string;
  threadId: string;
  author: string;
  body: string;
  score: number;
  createdAt: string;
  replies?: Comment[];
};

export type EventCard = {
  id: string;
  title: string;
  region: "domestic" | "overseas";
  dateLabel: string;
  city: string;
  venue: string;
  excerpt: string;
  posterUrl: string;
  sourceUrl: string;
  tags: string[];
};

export type DancerCard = {
  id: string;
  name: string;
  role: string;
  excerpt: string;
  videoId: string;
  tags: string[];
};

export type DraftSignal = {
  id: string;
  title: string;
  source: string;
  suggestedFlair: string;
  summary: string;
  confidence: "높음" | "보통" | "확인 필요";
};
