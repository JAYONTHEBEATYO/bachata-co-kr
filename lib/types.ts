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
