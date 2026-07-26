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

export type PublicProfile = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarPreset: string;
  bio: string;
  location: string;
  danceYears?: number | null;
  preferredStyles: string[];
  joinedAt: string;
};

export type SessionUser = PublicProfile & {
  email: string;
  role: "member" | "moderator" | "admin";
};

export type Comment = {
  id: string;
  threadId: string;
  parentId?: string | null;
  author: string;
  authorProfile?: PublicProfile | null;
  canManage?: boolean;
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
  authorProfile?: PublicProfile | null;
  canManage?: boolean;
  ipPrefix: string;
  score: number;
  downvotes: number;
  isPinned?: boolean;
  isFeatured?: boolean;
  commentCount: number;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
};
