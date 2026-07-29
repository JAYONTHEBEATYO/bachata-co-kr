export type AdminMetric = {
  value: number;
  change?: number;
};

export type AdminOverview = {
  generatedAt: string;
  metrics: {
    visitors: AdminMetric;
    pageviews: AdminMetric;
    averageDuration: AdminMetric;
    activeNow: AdminMetric;
    threads7d: AdminMetric;
    comments7d: AdminMetric;
    members: AdminMetric;
    pendingWork: AdminMetric;
  };
  daily: Array<{
    date: string;
    visitors: number;
    pageviews: number;
    duration: number;
  }>;
  topPages: Array<{
    path: string;
    pageviews: number;
    visitors: number;
    duration: number;
  }>;
  activity: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    createdAt: string;
  }>;
};

export type AdminProposal = {
  id: string;
  proposalType: "content" | "site_improvement";
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
  sourceUrl?: string | null;
  sourceName?: string | null;
  sourcePublishedAt?: string | null;
  evidence: Array<{ label?: string; url: string }>;
  media?: {
    type: "video" | "image";
    thumbnail?: string | null;
    sourceAssetUrl?: string | null;
    generatedImageUrl?: string | null;
    outputMediaUrl?: string | null;
    outputStreamId?: string | null;
    urlJobId?: string | null;
    reuseStatus: "verified" | "permission_granted" | "permission_review" | "unknown" | "restricted";
    licenseName?: string | null;
    licenseUrl?: string | null;
    attributionText?: string | null;
    regionScope?: "domestic" | "overseas" | "unknown";
    sourceCountry?: string | null;
    originalLanguage?: string | null;
    subtitleStatus?: "not_started" | "ready" | "blocked_rights";
    transformationStatus?: "embed_only" | "rights_review" | "ready";
  } | null;
  rationale: string;
  priority: "low" | "normal" | "high" | "urgent";
  confidence: number;
  status: "pending" | "approved" | "denied" | "published" | "applied";
  reviewNote?: string;
  feedbackRating?: number | null;
  feedbackLabels: string[];
  classificationJson?: string | null;
  threadId?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

export type AdminUrlContentJob = {
  id: string;
  sourceUrl: string;
  sourcePlatform: "youtube" | "instagram" | "reddit" | "web";
  contentKind: "video" | "article";
  sourceTitle: string;
  sourceAuthor: string;
  sourceHandle: string;
  sourceThumbnailUrl?: string | null;
  sourceAssetUrl?: string | null;
  reuseStatus: "permission_granted" | "permission_review" | "restricted" | "not_required";
  status:
    | "analyzing"
    | "awaiting_rights"
    | "awaiting_source"
    | "localization_queued"
    | "localizing"
    | "rendering"
    | "ready"
    | "failed"
    | "cancelled";
  generatedImageUrl?: string | null;
  outputAssetUrl?: string | null;
  outputStreamId?: string | null;
  proposalId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTopic = {
  id: string;
  slug: string;
  category: string;
  parentId?: string | null;
  topicType: "board" | "subtopic";
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  status: "active" | "hidden" | "archived";
};

export type AdminThread = {
  id: string;
  title: string;
  category: string;
  author: string;
  status: "published" | "hidden" | "removed";
  score: number;
  downvotes: number;
  commentCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  threadId?: string | null;
  reason: string;
  detail?: string | null;
  status: string;
  createdAt: string;
};

export type AdminSource = {
  id: string;
  name: string;
  sourceType: string;
  url: string;
  enabled: boolean;
  lastStatus: string;
  lastRunAt?: string | null;
  lastSuccessAt?: string | null;
  errorCount: number;
};

export type AdminRun = {
  id: string;
  runType: string;
  status: string;
  signalsCount: number;
  proposalsCount: number;
  startedAt: string;
  completedAt?: string | null;
};

export type AdminEditorialAutomation = {
  settings: {
    enabled: boolean;
    cadenceHours: number;
    preferredHourKst: number;
    candidateLimit: number;
    duplicateWindowDays: number;
    feedbackLookback: number;
    nextRunAt?: string | null;
    lastStartedAt?: string | null;
    lastCompletedAt?: string | null;
    updatedAt?: string | null;
  };
  options: {
    cadenceHours: number[];
    feedbackLabels: string[];
  };
  feedback: {
    total: number;
    averageRating: number;
    positive: number;
    negative: number;
  };
};
