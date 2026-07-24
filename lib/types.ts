export type Community = {
  slug: string;
  category: string;
  name: string;
  description: string;
  memberCount?: number;
  color: string;
};

export type SourceLink = {
  label: string;
  url: string;
};

export type Comment = {
  id: string;
  threadId: string;
  parentId?: string | null;
  author: string;
  ipPrefix?: string | null;
  body: string;
  score: number;
  createdAt: string;
  replies?: Comment[];
};

export type GuestThread = {
  id: string;
  title: string;
  body: string;
  category: string;
  linkUrl?: string | null;
  guestId: string;
  ipPrefix: string;
  score: number;
  downvotes: number;
  commentCount: number;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
};
