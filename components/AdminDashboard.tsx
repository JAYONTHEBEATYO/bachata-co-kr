"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Gauge,
  Layers3,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  AdminEditorialAutomation,
  AdminOverview,
  AdminProposal,
  AdminReport,
  AdminRun,
  AdminSource,
  AdminThread,
  AdminTopic
} from "@/lib/admin-types";
import type { SessionUser } from "@/lib/types";
import { ProfileAvatar } from "./ProfileAvatar";

type AdminTab = "overview" | "editorial" | "automation" | "threads" | "topics" | "operations";

type AdminData = {
  overview: AdminOverview | null;
  proposals: AdminProposal[];
  threads: AdminThread[];
  topics: AdminTopic[];
  reports: AdminReport[];
  sources: AdminSource[];
  runs: AdminRun[];
  automation: AdminEditorialAutomation | null;
};

const emptyData: AdminData = {
  overview: null,
  proposals: [],
  threads: [],
  topics: [],
  reports: [],
  sources: [],
  runs: [],
  automation: null
};

const tabs: Array<{ id: AdminTab; label: string; icon: typeof Gauge }> = [
  { id: "overview", label: "개요", icon: Gauge },
  { id: "editorial", label: "AI 콘텐츠·개선안", icon: Sparkles },
  { id: "automation", label: "AI 운영 설정", icon: Clock3 },
  { id: "threads", label: "게시물", icon: FileText },
  { id: "topics", label: "주제·하위주제", icon: Layers3 },
  { id: "operations", label: "신고·수집 현황", icon: ShieldCheck }
];

const categoryLabels: Record<string, string> = {
  questions: "질문",
  video: "영상",
  events: "행사",
  promotion: "홍보",
  free: "자유게시판",
  academyReview: "아카데미 리뷰",
  dancerReview: "댄서 리뷰",
  socialReview: "소셜 후기",
  poll: "설문조사",
  ama: "무엇이든 물어보세요"
};

const proposalStatusLabels: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인됨",
  denied: "거절됨",
  published: "게시됨",
  applied: "적용 완료"
};

const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
const formatDateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value))
  : "-";
const formatDuration = (seconds: number) => seconds >= 60
  ? `${Math.floor(seconds / 60)}분 ${seconds % 60}초`
  : `${seconds}초`;

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    }
  });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
};

export function AdminDashboard({ user }: { user: SessionUser }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [data, setData] = useState<AdminData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, proposals, threads, topics, reports, sources, automation] = await Promise.all([
        fetchJson<{ overview: AdminOverview }>("/api/admin/overview"),
        fetchJson<{ proposals: AdminProposal[] }>("/api/admin/proposals"),
        fetchJson<{ threads: AdminThread[] }>("/api/admin/threads"),
        fetchJson<{ topics: AdminTopic[] }>("/api/admin/topics"),
        fetchJson<{ reports: AdminReport[] }>("/api/admin/reports"),
        fetchJson<{ sources: AdminSource[]; runs: AdminRun[] }>("/api/admin/sources"),
        fetchJson<AdminEditorialAutomation>("/api/admin/automation/settings").catch(() => null)
      ]);
      setData({
        overview: overview.overview,
        proposals: proposals.proposals,
        threads: threads.threads,
        topics: topics.topics,
        reports: reports.reports,
        sources: sources.sources,
        runs: sources.runs,
        automation
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "관리자 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const runAutomation = async (mode: "daily" | "weekly", sampleSet?: "licensed-video") => {
    setBusy(sampleSet ? "automation-video-samples" : `automation-${mode}`);
    setNotice("");
    setError("");
    try {
      const result = await fetchJson<{ proposalsCount: number }>("/api/admin/automation", {
        method: "POST",
        body: JSON.stringify({ mode, sampleSet })
      });
      setNotice(sampleSet
        ? `라이선스 영상 초안 ${result.proposalsCount}건을 검토 목록에 추가했습니다.`
        : mode === "daily"
          ? `AI 콘텐츠 초안 ${result.proposalsCount}건을 검토 목록에 추가했습니다.`
          : `사이트 개선안 ${result.proposalsCount}건을 준비했습니다.`);
      await loadAll();
      setTab("editorial");
    } catch (automationError) {
      setError(automationError instanceof Error ? automationError.message : "자동화를 실행하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const pendingCount = data.proposals.filter((proposal) => proposal.status === "pending").length;
  const openReportCount = data.reports.filter((report) => report.status === "open").length;

  return (
    <main className="admin-page">
      <header className="admin-hero">
        <div className="admin-hero-copy">
          <span><ShieldCheck size={15} /> ADMIN CONSOLE</span>
          <h1>바차타 코리아 운영실</h1>
          <p>사이트 흐름을 확인하고, 콘텐츠와 커뮤니티 운영 결정을 한곳에서 처리합니다.</p>
        </div>
        <div className="admin-hero-actions">
          <button
            type="button"
            className="admin-button secondary"
            disabled={Boolean(busy)}
            onClick={() => void runAutomation("daily")}
          >
            {busy === "automation-daily" ? <LoaderCircle className="spin" size={16} /> : <Bot size={16} />}
            AI 콘텐츠 초안 만들기
          </button>
          <button
            type="button"
            className="admin-button primary"
            disabled={Boolean(busy)}
            onClick={() => void runAutomation("weekly")}
          >
            {busy === "automation-weekly" ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
            사이트 개선안 받기
          </button>
          <div className="admin-account">
            <ProfileAvatar
              name={user.displayName}
              avatarUrl={user.avatarUrl}
              avatarPreset={user.avatarPreset}
              size={38}
            />
            <span><strong>{user.displayName}</strong><small>최고 관리자</small></span>
          </div>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="관리자 메뉴">
        {tabs.map((item) => {
          const Icon = item.icon;
          const count = item.id === "editorial"
            ? pendingCount
            : item.id === "operations"
              ? openReportCount
              : 0;
          return (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "active" : ""}
              aria-label={item.label}
              aria-pressed={tab === item.id}
              title={item.label}
              onClick={() => setTab(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {count ? <b>{count}</b> : null}
            </button>
          );
        })}
        <button
          type="button"
          className="admin-refresh"
          aria-label="관리자 데이터 새로고침"
          title="새로고침"
          onClick={() => void loadAll()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "spin" : ""} size={17} />
          <span>새로고침</span>
        </button>
      </nav>

      {notice ? <div className="admin-toast success"><Check size={16} />{notice}</div> : null}
      {error ? <div className="admin-toast error"><AlertTriangle size={16} />{error}</div> : null}

      {loading && !data.overview ? (
        <div className="admin-loading"><LoaderCircle className="spin" size={28} /><p>운영 데이터를 불러오는 중입니다.</p></div>
      ) : null}

      {!loading || data.overview ? (
        <section className="admin-workspace">
          {tab === "overview" && data.overview ? (
            <OverviewPanel overview={data.overview} proposals={data.proposals} reports={data.reports} />
          ) : null}
          {tab === "editorial" ? (
            <EditorialPanel
              proposals={data.proposals}
              feedbackLabels={data.automation?.options.feedbackLabels || []}
              busy={busy}
              setBusy={setBusy}
              setNotice={setNotice}
              setError={setError}
              reload={loadAll}
            />
          ) : null}
          {tab === "automation" ? (
            data.automation ? (
              <AutomationPanel
                automation={data.automation}
                busy={busy}
                setBusy={setBusy}
                setNotice={setNotice}
                setError={setError}
                reload={loadAll}
                runVideoSamples={() => runAutomation("daily", "licensed-video")}
              />
            ) : (
              <div className="admin-empty large">
                <AlertTriangle size={24} />
                <p>AI 운영 설정을 불러오지 못했습니다. 데이터베이스 마이그레이션 상태를 확인해주세요.</p>
              </div>
            )
          ) : null}
          {tab === "threads" ? (
            <ThreadsPanel
              threads={data.threads}
              busy={busy}
              setBusy={setBusy}
              setNotice={setNotice}
              setError={setError}
              reload={loadAll}
            />
          ) : null}
          {tab === "topics" ? (
            <TopicsPanel
              topics={data.topics}
              busy={busy}
              setBusy={setBusy}
              setNotice={setNotice}
              setError={setError}
              reload={loadAll}
            />
          ) : null}
          {tab === "operations" ? (
            <OperationsPanel
              reports={data.reports}
              sources={data.sources}
              runs={data.runs}
              busy={busy}
              setBusy={setBusy}
              setNotice={setNotice}
              setError={setError}
              reload={loadAll}
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function OverviewPanel({
  overview,
  proposals,
  reports
}: {
  overview: AdminOverview;
  proposals: AdminProposal[];
  reports: AdminReport[];
}) {
  const cards = [
    { label: "오늘 방문자", metric: overview.metrics.visitors, icon: Users, format: formatNumber },
    { label: "오늘 페이지뷰", metric: overview.metrics.pageviews, icon: Eye, format: formatNumber },
    { label: "평균 체류시간", metric: overview.metrics.averageDuration, icon: Clock3, format: formatDuration },
    { label: "최근 5분 접속", metric: overview.metrics.activeNow, icon: Activity, format: formatNumber }
  ];
  const maxPageviews = Math.max(1, ...overview.daily.map((item) => item.pageviews));
  const pending = proposals.filter((proposal) => proposal.status === "pending").slice(0, 4);
  const openReports = reports.filter((report) => report.status === "open").length;

  return (
    <div className="admin-overview">
      <div className="admin-metric-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="admin-metric">
              <div><span>{card.label}</span><Icon size={18} /></div>
              <strong>{card.format(card.metric.value)}</strong>
              {typeof card.metric.change === "number" ? (
                <small className={card.metric.change >= 0 ? "positive" : "negative"}>
                  어제보다 {card.metric.change >= 0 ? "+" : ""}{card.metric.change}%
                </small>
              ) : <small>실시간 집계</small>}
            </article>
          );
        })}
      </div>

      <div className="admin-overview-grid">
        <section className="admin-panel analytics-panel">
          <header className="admin-panel-head">
            <div><span>최근 14일</span><h2>방문 흐름</h2></div>
            <div className="chart-legend"><i />페이지뷰 <i />방문자</div>
          </header>
          <div className="admin-chart" role="img" aria-label="최근 14일 방문자와 페이지뷰 그래프">
            {overview.daily.length ? overview.daily.map((item) => (
              <div className="chart-column" key={item.date}>
                <div className="chart-bars">
                  <i style={{ height: `${Math.max(3, item.pageviews / maxPageviews * 100)}%` }} />
                  <b style={{ height: `${Math.max(3, item.visitors / maxPageviews * 100)}%` }} />
                </div>
                <span>{item.date.slice(5).replace("-", ".")}</span>
              </div>
            )) : <p className="admin-empty">오늘부터 방문 흐름이 쌓입니다.</p>}
          </div>
          <div className="analytics-summary">
            <span><strong>{formatNumber(overview.metrics.threads7d.value)}</strong>새 글</span>
            <span><strong>{formatNumber(overview.metrics.comments7d.value)}</strong>새 댓글</span>
            <span><strong>{formatNumber(overview.metrics.members.value)}</strong>회원</span>
            <span><strong>{formatNumber(overview.metrics.pendingWork.value)}</strong>처리할 일</span>
          </div>
        </section>

        <section className="admin-panel priority-panel">
          <header className="admin-panel-head">
            <div><span>오늘의 운영</span><h2>먼저 볼 항목</h2></div>
            <MoreHorizontal size={18} />
          </header>
          <div className="priority-list">
            {openReports ? (
              <div className="priority-item urgent">
                <AlertTriangle size={18} />
                <span><strong>미처리 신고 {openReports}건</strong><small>게시물과 댓글 신고를 확인해주세요.</small></span>
                <ChevronRight size={17} />
              </div>
            ) : null}
            {pending.map((proposal) => (
              <div className="priority-item" key={proposal.id}>
                {proposal.proposalType === "content" ? <FileCheck2 size={18} /> : <Sparkles size={18} />}
                <span><strong>{proposal.title}</strong><small>{proposalStatusLabels[proposal.status]}</small></span>
                <ChevronRight size={17} />
              </div>
            ))}
            {!openReports && !pending.length ? (
              <div className="admin-empty compact"><Check size={20} /><p>지금 바로 처리할 항목이 없습니다.</p></div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="admin-overview-grid lower">
        <section className="admin-panel">
          <header className="admin-panel-head">
            <div><span>최근 7일</span><h2>많이 본 페이지</h2></div>
          </header>
          <div className="admin-table">
            <div className="admin-table-row head"><span>페이지</span><span>조회</span><span>방문자</span><span>체류</span></div>
            {overview.topPages.map((page) => (
              <div className="admin-table-row" key={page.path}>
                <Link href={page.path} target="_blank">{page.path}</Link>
                <span>{formatNumber(page.pageviews)}</span>
                <span>{formatNumber(page.visitors)}</span>
                <span>{formatDuration(page.duration)}</span>
              </div>
            ))}
            {!overview.topPages.length ? <p className="admin-empty">집계된 페이지가 아직 없습니다.</p> : null}
          </div>
        </section>

        <section className="admin-panel">
          <header className="admin-panel-head">
            <div><span>관리 기록</span><h2>최근 변경</h2></div>
          </header>
          <div className="activity-list">
            {overview.activity.map((item) => (
              <div key={item.id}>
                <i />
                <span><strong>{item.action}</strong><small>{formatDateTime(item.createdAt)}</small></span>
              </div>
            ))}
            {!overview.activity.length ? <p className="admin-empty">첫 관리 작업부터 기록됩니다.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function EditorialPanel({
  proposals,
  feedbackLabels,
  busy,
  setBusy,
  setNotice,
  setError,
  reload
}: {
  proposals: AdminProposal[];
  feedbackLabels: string[];
  busy: string;
  setBusy: (value: string) => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
  reload: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"pending" | "content" | "site_improvement" | "all">("pending");
  const filtered = proposals.filter((proposal) => {
    if (filter === "all") return true;
    if (filter === "pending") return proposal.status === "pending" || proposal.status === "approved";
    return proposal.proposalType === filter;
  });

  return (
    <div className="admin-section-stack">
      <header className="admin-section-title">
        <div><span>AI DESK</span><h2>AI 콘텐츠와 개선 제안</h2><p>콘텐츠 초안은 편집 후 게시하고, 개선 제안은 검토한 뒤 작업 여부를 결정합니다.</p></div>
        <div className="admin-filter">
          {[
            ["pending", "검토 대기"],
            ["content", "콘텐츠"],
            ["site_improvement", "개선안"],
            ["all", "전체"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value as typeof filter)}
            >{label}</button>
          ))}
        </div>
      </header>
      <div className="proposal-list">
        {filtered.map((proposal) => (
          <ProposalEditor
            key={proposal.id}
            proposal={proposal}
            feedbackLabelOptions={feedbackLabels}
            busy={busy}
            setBusy={setBusy}
            setNotice={setNotice}
            setError={setError}
            reload={reload}
          />
        ))}
        {!filtered.length ? <div className="admin-empty large"><Sparkles size={24} /><p>이 조건에 맞는 제안이 없습니다.</p></div> : null}
      </div>
    </div>
  );
}

function ProposalEditor({
  proposal,
  feedbackLabelOptions,
  busy,
  setBusy,
  setNotice,
  setError,
  reload
}: {
  proposal: AdminProposal;
  feedbackLabelOptions: string[];
  busy: string;
  setBusy: (value: string) => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
  reload: () => Promise<void>;
}) {
  const [title, setTitle] = useState(proposal.title);
  const [summary, setSummary] = useState(proposal.summary);
  const [body, setBody] = useState(proposal.body);
  const [category, setCategory] = useState(proposal.category);
  const [tags, setTags] = useState(proposal.tags.join(", "));
  const [reviewNote, setReviewNote] = useState(proposal.reviewNote || "");
  const [feedbackRating, setFeedbackRating] = useState(proposal.feedbackRating || 0);
  const [feedbackLabels, setFeedbackLabels] = useState(proposal.feedbackLabels || []);
  const isBusy = busy === proposal.id;
  const isClosed = ["denied", "published", "applied"].includes(proposal.status);

  const mutate = async (action: "save" | "deny" | "approve" | "apply" | "publish") => {
    setBusy(proposal.id);
    setError("");
    setNotice("");
    try {
      const result = await fetchJson<{ threadPath?: string; status?: string }>("/api/admin/proposals", {
        method: "PATCH",
        body: JSON.stringify({
          id: proposal.id,
          action,
          title,
          summary,
          body,
          category,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          reviewNote,
          feedbackRating: feedbackRating || null,
          feedbackLabels
        })
      });
      if (result.threadPath) {
        setNotice("콘텐츠를 게시했습니다.");
      } else if (action === "deny") {
        setNotice("제안을 거절 처리했습니다.");
      } else if (action === "approve") {
        setNotice("개선안을 작업 대기로 승인했습니다.");
      } else if (action === "apply") {
        setNotice("적용 완료로 기록했습니다.");
      } else {
        setNotice("편집 내용을 저장했습니다.");
      }
      await reload();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "제안서를 처리하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  return (
    <article className={`proposal-card ${proposal.proposalType}`}>
      <header>
        <div className="proposal-type">
          {proposal.proposalType === "content" ? <FileText size={16} /> : <Settings2 size={16} />}
          <span>{proposal.proposalType === "content" ? "콘텐츠 초안" : "사이트 개선안"}</span>
          <b data-status={proposal.status}>{proposalStatusLabels[proposal.status]}</b>
          <small data-priority={proposal.priority}>{proposal.priority === "high" || proposal.priority === "urgent" ? "우선 검토" : "일반"}</small>
        </div>
        <span className="proposal-confidence">신뢰도 {Math.round(proposal.confidence * 100)}%</span>
      </header>
      {proposal.media ? (
        <section className="proposal-media-preview" aria-label="영상 자료와 재사용 조건">
          {proposal.media.thumbnail ? (
            <a className="proposal-media-thumb" href={proposal.sourceUrl || proposal.media.sourceAssetUrl || "#"} target="_blank" rel="noreferrer">
              <img src={proposal.media.thumbnail} alt={`${proposal.title} 영상 미리보기`} loading="lazy" />
              <span><FileCheck2 size={14} />{proposal.media.type === "video" ? "영상 미리보기" : "이미지 미리보기"}</span>
            </a>
          ) : null}
          <div className="proposal-media-meta">
            <strong><ShieldCheck size={15} />재사용 조건 확인</strong>
            <p>{proposal.media.attributionText || "게시 전 출처와 라이선스 표기를 다시 확인해주세요."}</p>
            <div>
              {proposal.media.licenseUrl ? <a href={proposal.media.licenseUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} />{proposal.media.licenseName || "라이선스"}</a> : null}
              {proposal.media.sourceAssetUrl ? <a href={proposal.media.sourceAssetUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} />원본 파일 열기</a> : null}
            </div>
          </div>
        </section>
      ) : null}
      <div className="proposal-fields">
        <label>
          <span>제목</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={isClosed} />
        </label>
        <label>
          <span>한 줄 요약</span>
          <textarea rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} disabled={isClosed} />
        </label>
        <label>
          <span>{proposal.proposalType === "content" ? "본문 초안" : "권장 작업"}</span>
          <textarea rows={proposal.proposalType === "content" ? 10 : 5} value={body} onChange={(event) => setBody(event.target.value)} disabled={isClosed} />
        </label>
        <div className="proposal-inline-fields">
          {proposal.proposalType === "content" ? (
            <>
              <label><span>게시판</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={isClosed}>
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label><span>태그</span><input value={tags} onChange={(event) => setTags(event.target.value)} disabled={isClosed} /></label>
            </>
          ) : null}
          {proposal.proposalType === "site_improvement" ? (
            <label className="review-note"><span>관리자 메모</span><input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} disabled={isClosed} placeholder="결정 이유나 후속 작업" /></label>
          ) : null}
        </div>
        {proposal.proposalType === "content" ? (
          <section className="editorial-feedback-box" aria-label="AI 편집 피드백">
            <div className="editorial-feedback-head">
              <div>
                <span>AI 학습 피드백</span>
                <p>평가와 수정 이유는 다음 콘텐츠 초안을 만들 때 편집 기준으로 반영됩니다.</p>
              </div>
              <div className="feedback-rating" aria-label="초안 평점">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={feedbackRating === rating ? "active" : ""}
                    onClick={() => setFeedbackRating(rating)}
                    disabled={isClosed}
                    aria-pressed={feedbackRating === rating}
                    title={`${rating}점`}
                  >{rating}</button>
                ))}
              </div>
            </div>
            <div className="feedback-labels">
              {feedbackLabelOptions.map((label) => {
                const selected = feedbackLabels.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    className={selected ? "active" : ""}
                    onClick={() => setFeedbackLabels((current) => selected
                      ? current.filter((item) => item !== label)
                      : [...current, label].slice(0, 6))}
                    disabled={isClosed}
                    aria-pressed={selected}
                  >{label}</button>
                );
              })}
            </div>
            <label>
              <span>편집 메모</span>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                disabled={isClosed}
                placeholder="좋았던 점이나 다음 초안에서 고칠 점을 적어주세요."
              />
            </label>
          </section>
        ) : null}
      </div>
      <footer>
        <div className="proposal-evidence">
          {proposal.sourceUrl ? (
            <a href={proposal.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />{proposal.sourceName || "원문 확인"}
            </a>
          ) : (
            <span><BarChart3 size={14} />{proposal.rationale || "운영 지표 기반"}</span>
          )}
          <small>{formatDateTime(proposal.createdAt)}</small>
        </div>
        <div className="proposal-actions">
          {!isClosed ? <button type="button" onClick={() => void mutate("deny")} disabled={isBusy}><X size={15} />거절</button> : null}
          {!isClosed ? <button type="button" onClick={() => void mutate("save")} disabled={isBusy}><Save size={15} />저장</button> : null}
          {proposal.proposalType === "content" && !isClosed ? (
            <button className="primary" type="button" onClick={() => void mutate("publish")} disabled={isBusy}>
              {isBusy ? <LoaderCircle className="spin" size={15} /> : <FileCheck2 size={15} />}승인 후 게시
            </button>
          ) : null}
          {proposal.proposalType === "site_improvement" && proposal.status === "pending" ? (
            <button className="primary" type="button" onClick={() => void mutate("approve")} disabled={isBusy}><Check size={15} />작업 승인</button>
          ) : null}
          {proposal.proposalType === "site_improvement" && proposal.status === "approved" ? (
            <button className="primary" type="button" onClick={() => void mutate("apply")} disabled={isBusy}><Check size={15} />적용 완료</button>
          ) : null}
          {proposal.threadId ? <Link href={`/g/${proposal.threadId}`} target="_blank"><ExternalLink size={15} />게시물 보기</Link> : null}
        </div>
      </footer>
    </article>
  );
}


function AutomationPanel({
  automation,
  busy,
  setBusy,
  setNotice,
  setError,
  reload,
  runVideoSamples
}: {
  automation: AdminEditorialAutomation;
  busy: string;
  setBusy: (value: string) => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
  reload: () => Promise<void>;
  runVideoSamples: () => Promise<void>;
}) {
  const [settings, setSettings] = useState(automation.settings);
  const isBusy = busy === "automation-settings";
  const cadenceLabels: Record<number, string> = {
    6: "6시간마다",
    12: "12시간마다",
    24: "매일",
    48: "2일마다",
    72: "3일마다",
    168: "매주"
  };

  useEffect(() => {
    setSettings(automation.settings);
  }, [automation]);

  const updateNumber = (
    key: "preferredHourKst" | "candidateLimit" | "duplicateWindowDays" | "feedbackLookback",
    value: string
  ) => setSettings((current) => ({ ...current, [key]: Number(value) }));

  const saveSettings = async () => {
    setBusy("automation-settings");
    setNotice("");
    setError("");
    try {
      const result = await fetchJson<{ settings: AdminEditorialAutomation["settings"] }>(
        "/api/admin/automation/settings",
        {
          method: "PATCH",
          body: JSON.stringify(settings)
        }
      );
      setSettings(result.settings);
      setNotice("AI 콘텐츠 실행 설정을 저장했습니다.");
      await reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "AI 운영 설정을 저장하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="admin-section-stack">
      <header className="admin-section-title">
        <div>
          <span>EDITORIAL AUTOMATION</span>
          <h2>AI 콘텐츠 운영 설정</h2>
          <p>수집과 초안 작성 주기를 정합니다. AI 결과는 자동 게시되지 않고 검토 목록에만 쌓입니다.</p>
        </div>
        <div className="admin-section-actions">
          <button className="admin-button secondary" type="button" onClick={() => void runVideoSamples()} disabled={Boolean(busy)}>
            {busy === "automation-video-samples" ? <LoaderCircle className="spin" size={16} /> : <FileCheck2 size={16} />}
            라이선스 영상 샘플 5건 만들기
          </button>
          <button className="admin-button primary" type="button" onClick={() => void saveSettings()} disabled={isBusy}>
            {isBusy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
            설정 저장
          </button>
        </div>
      </header>

      <div className="automation-layout">
        <section className="admin-panel automation-settings-panel">
          <header className="admin-panel-head">
            <div><span>실행 정책</span><h2>콘텐츠 수집과 초안 작성</h2></div>
            <label className="automation-toggle">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
              />
              <span aria-hidden="true" />
              {settings.enabled ? "사용 중" : "중지됨"}
            </label>
          </header>
          <div className="automation-form-grid">
            <label>
              <span>실행 주기</span>
              <select
                value={settings.cadenceHours}
                onChange={(event) => setSettings((current) => ({ ...current, cadenceHours: Number(event.target.value) }))}
              >
                {automation.options.cadenceHours.map((hours) => (
                  <option key={hours} value={hours}>{cadenceLabels[hours] || `${hours}시간마다`}</option>
                ))}
              </select>
              <small>GitHub Actions는 매시간 확인하고, 실제 작성은 이 주기에 맞을 때만 시작합니다.</small>
            </label>
            <label>
              <span>기준 시각</span>
              <select
                value={settings.preferredHourKst}
                onChange={(event) => updateNumber("preferredHourKst", event.target.value)}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00 KST</option>
                ))}
              </select>
              <small>하루 이상 주기일 때 초안 작성을 시작할 한국 시각입니다.</small>
            </label>
            <label>
              <span>회당 초안 수</span>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.candidateLimit}
                onChange={(event) => updateNumber("candidateLimit", event.target.value)}
              />
              <small>한 번에 1~5건만 검토 목록에 추가합니다.</small>
            </label>
            <label>
              <span>중복 검사 기간</span>
              <div className="automation-number-field">
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={settings.duplicateWindowDays}
                  onChange={(event) => updateNumber("duplicateWindowDays", event.target.value)}
                />
                <b>일</b>
              </div>
              <small>URL, 제목, 본문 유사도를 이 기간의 기존 글과 비교합니다.</small>
            </label>
            <label>
              <span>참고할 최근 피드백</span>
              <div className="automation-number-field">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.feedbackLookback}
                  onChange={(event) => updateNumber("feedbackLookback", event.target.value)}
                />
                <b>건</b>
              </div>
              <small>최근 승인·반려·편집 기록을 다음 AI 작성 기준으로 요약합니다.</small>
            </label>
          </div>
        </section>

        <aside className="admin-panel automation-status-panel">
          <header className="admin-panel-head">
            <div><span>현재 상태</span><h2>다음 실행</h2></div>
            <Activity size={18} />
          </header>
          <dl>
            <div><dt>다음 예정</dt><dd>{settings.enabled ? formatDateTime(settings.nextRunAt) : "자동 실행 중지"}</dd></div>
            <div><dt>최근 시작</dt><dd>{formatDateTime(settings.lastStartedAt)}</dd></div>
            <div><dt>최근 완료</dt><dd>{formatDateTime(settings.lastCompletedAt)}</dd></div>
          </dl>
          <div className="automation-feedback-stats">
            <span><strong>{automation.feedback.total}</strong>누적 피드백</span>
            <span><strong>{automation.feedback.averageRating || "-"}</strong>평균 평점</span>
            <span><strong>{automation.feedback.positive}</strong>좋은 평가</span>
            <span><strong>{automation.feedback.negative}</strong>개선 평가</span>
          </div>
          <p><ShieldCheck size={15} />중복으로 판정된 자료는 AI 작성 전에 제외되며, 모든 초안은 관리자 승인 후에만 공개됩니다.</p>
        </aside>
      </div>
    </div>
  );
}

function ThreadsPanel({
  threads,
  busy,
  setBusy,
  setNotice,
  setError,
  reload
}: {
  threads: AdminThread[];
  busy: string;
  setBusy: (value: string) => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const visible = threads.filter((thread) => {
    const matchesStatus = status === "all" || thread.status === status;
    const needle = query.trim().toLowerCase();
    return matchesStatus && (!needle || `${thread.title} ${thread.author}`.toLowerCase().includes(needle));
  });

  const patchThread = async (thread: AdminThread, patch: Record<string, unknown>, message: string) => {
    setBusy(thread.id);
    setError("");
    try {
      await fetchJson("/api/admin/threads", {
        method: "PATCH",
        body: JSON.stringify({ id: thread.id, ...patch })
      });
      setNotice(message);
      await reload();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "게시물을 변경하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="admin-section-stack">
      <header className="admin-section-title">
        <div><span>CONTENT CONTROL</span><h2>게시물 관리</h2><p>게시물 노출과 추천 영역을 조정합니다.</p></div>
        <div className="admin-search-filter">
          <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목·작성자 검색" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">전체 상태</option>
            <option value="published">공개</option>
            <option value="hidden">숨김</option>
            <option value="removed">삭제 처리</option>
          </select>
        </div>
      </header>
      <section className="admin-panel thread-admin-list">
        <div className="thread-admin-row head">
          <span>게시물</span><span>반응</span><span>상태</span><span>관리</span>
        </div>
        {visible.map((thread) => (
          <div className="thread-admin-row" key={thread.id}>
            <div className="thread-admin-title">
              <span>{categoryLabels[thread.category] || thread.category}</span>
              <Link href={`/g/${thread.id}`} target="_blank">{thread.title}</Link>
              <small>{thread.author} · {formatDateTime(thread.createdAt)}</small>
            </div>
            <div className="thread-admin-reaction">
              <span><ThumbsUp size={14} />{thread.score - thread.downvotes}</span>
              <span><MessageSquare size={14} />{thread.commentCount}</span>
            </div>
            <span className={`status-pill ${thread.status}`}>
              {thread.status === "published" ? "공개" : thread.status === "hidden" ? "숨김" : "삭제"}
            </span>
            <div className="thread-admin-actions">
              <button
                type="button"
                className={thread.isPinned ? "active" : ""}
                title="상단 고정"
                disabled={busy === thread.id}
                onClick={() => void patchThread(thread, { isPinned: !thread.isPinned }, thread.isPinned ? "고정을 해제했습니다." : "상단에 고정했습니다.")}
              ><Pin size={15} /></button>
              <button
                type="button"
                className={thread.isFeatured ? "active" : ""}
                title="추천 콘텐츠"
                disabled={busy === thread.id}
                onClick={() => void patchThread(thread, { isFeatured: !thread.isFeatured }, thread.isFeatured ? "추천에서 제외했습니다." : "추천 콘텐츠로 지정했습니다.")}
              ><Sparkles size={15} /></button>
              <select
                value={thread.status}
                disabled={busy === thread.id}
                onChange={(event) => void patchThread(thread, { status: event.target.value }, "게시물 상태를 변경했습니다.")}
              >
                <option value="published">공개</option>
                <option value="hidden">숨김</option>
                <option value="removed">삭제</option>
              </select>
            </div>
          </div>
        ))}
        {!visible.length ? <p className="admin-empty">조건에 맞는 게시물이 없습니다.</p> : null}
      </section>
    </div>
  );
}

function TopicsPanel({
  topics,
  busy,
  setBusy,
  setNotice,
  setError,
  reload
}: {
  topics: AdminTopic[];
  busy: string;
  setBusy: (value: string) => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
  reload: () => Promise<void>;
}) {
  const boards = topics.filter((topic) => topic.topicType === "board");
  const subtopics = topics.filter((topic) => topic.topicType === "subtopic");
  const [newTopic, setNewTopic] = useState({
    parentId: boards[0]?.id || "",
    name: "",
    slug: "",
    description: "",
    color: boards[0]?.color || "#ff4f3f",
    sortOrder: 100
  });

  useEffect(() => {
    if (!newTopic.parentId && boards[0]) {
      setNewTopic((current) => ({ ...current, parentId: boards[0].id, color: boards[0].color }));
    }
  }, [boards, newTopic.parentId]);

  const saveTopic = async (topic: AdminTopic, patch: Partial<AdminTopic>) => {
    setBusy(topic.id);
    setError("");
    try {
      await fetchJson("/api/admin/topics", {
        method: "PATCH",
        body: JSON.stringify({ ...topic, ...patch })
      });
      setNotice("주제 설정을 저장했습니다.");
      await reload();
    } catch (topicError) {
      setError(topicError instanceof Error ? topicError.message : "주제를 저장하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const createSubtopic = async () => {
    setBusy("new-topic");
    setError("");
    try {
      await fetchJson("/api/admin/topics", {
        method: "POST",
        body: JSON.stringify(newTopic)
      });
      setNotice("새 하위주제를 추가했습니다.");
      setNewTopic((current) => ({ ...current, name: "", slug: "", description: "" }));
      await reload();
    } catch (topicError) {
      setError(topicError instanceof Error ? topicError.message : "하위주제를 추가하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="admin-section-stack">
      <header className="admin-section-title">
        <div><span>INFORMATION ARCHITECTURE</span><h2>주제와 하위주제</h2><p>게시판 이름과 노출 순서를 바꾸면 공개 주제 화면에도 반영됩니다.</p></div>
      </header>

      <section className="admin-panel topic-manager">
        <header className="admin-panel-head"><div><span>대분류</span><h2>게시판 편집</h2></div></header>
        <div className="topic-admin-grid">
          {boards.map((board) => <TopicRow key={board.id} topic={board} busy={busy === board.id} onSave={saveTopic} />)}
        </div>
      </section>

      <section className="admin-panel topic-manager">
        <header className="admin-panel-head">
          <div><span>하위 분류</span><h2>하위주제 편집</h2></div>
          <span>{subtopics.length}개</span>
        </header>
        <div className="subtopic-groups">
          {boards.map((board) => {
            const children = subtopics.filter((topic) => topic.parentId === board.id);
            return (
              <section key={board.id}>
                <h3><i style={{ background: board.color }} />{board.name}<span>{children.length}</span></h3>
                <div>
                  {children.map((topic) => <TopicRow key={topic.id} topic={topic} busy={busy === topic.id} onSave={saveTopic} compact />)}
                  {!children.length ? <p>등록된 하위주제가 없습니다.</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="admin-panel add-topic-panel">
        <header className="admin-panel-head"><div><span>새 분류</span><h2>하위주제 추가</h2></div><Plus size={19} /></header>
        <div className="add-topic-form">
          <label><span>상위 게시판</span>
            <select value={newTopic.parentId} onChange={(event) => {
              const board = boards.find((item) => item.id === event.target.value);
              setNewTopic((current) => ({ ...current, parentId: event.target.value, color: board?.color || current.color }));
            }}>
              {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
            </select>
          </label>
          <label><span>이름</span><input value={newTopic.name} onChange={(event) => setNewTopic((current) => ({ ...current, name: event.target.value }))} placeholder="예: 댄서:멜빈(FRANCE)" /></label>
          <label><span>주소</span><input value={newTopic.slug} onChange={(event) => setNewTopic((current) => ({ ...current, slug: event.target.value }))} placeholder="예: dancer-melvin" /></label>
          <label className="wide"><span>설명</span><input value={newTopic.description} onChange={(event) => setNewTopic((current) => ({ ...current, description: event.target.value }))} placeholder="이 주제에서 나눌 이야기" /></label>
          <button className="admin-button primary" type="button" onClick={() => void createSubtopic()} disabled={busy === "new-topic" || !newTopic.name.trim()}>
            {busy === "new-topic" ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}추가
          </button>
        </div>
      </section>
    </div>
  );
}

function TopicRow({
  topic,
  busy,
  onSave,
  compact = false
}: {
  topic: AdminTopic;
  busy: boolean;
  onSave: (topic: AdminTopic, patch: Partial<AdminTopic>) => Promise<void>;
  compact?: boolean;
}) {
  const [name, setName] = useState(topic.name);
  const [description, setDescription] = useState(topic.description);
  const [color, setColor] = useState(topic.color);
  const [sortOrder, setSortOrder] = useState(topic.sortOrder);
  const [status, setStatus] = useState(topic.status);

  return (
    <div className={`topic-admin-row ${compact ? "compact" : ""}`}>
      <input className="topic-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="주제 색상" />
      <div className="topic-admin-fields">
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label="주제 이름" />
        <input value={description} onChange={(event) => setDescription(event.target.value)} aria-label="주제 설명" />
      </div>
      <input className="topic-order" type="number" min="0" max="999" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} aria-label="노출 순서" />
      <select value={status} onChange={(event) => setStatus(event.target.value as AdminTopic["status"])} aria-label="노출 상태">
        <option value="active">노출</option>
        <option value="hidden">숨김</option>
        <option value="archived">보관</option>
      </select>
      <button
        type="button"
        title="저장"
        disabled={busy}
        onClick={() => void onSave(topic, { name, description, color, sortOrder, status })}
      >{busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}</button>
    </div>
  );
}

function OperationsPanel({
  reports,
  sources,
  runs,
  busy,
  setBusy,
  setNotice,
  setError,
  reload
}: {
  reports: AdminReport[];
  sources: AdminSource[];
  runs: AdminRun[];
  busy: string;
  setBusy: (value: string) => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
  reload: () => Promise<void>;
}) {
  const patchReport = async (report: AdminReport, status: string) => {
    setBusy(report.id);
    try {
      await fetchJson("/api/admin/reports", {
        method: "PATCH",
        body: JSON.stringify({ id: report.id, status })
      });
      setNotice("신고 상태를 변경했습니다.");
      await reload();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "신고를 처리하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };
  const toggleSource = async (source: AdminSource) => {
    setBusy(source.id);
    try {
      await fetchJson("/api/admin/sources", {
        method: "PATCH",
        body: JSON.stringify({ id: source.id, enabled: !source.enabled })
      });
      setNotice(source.enabled ? "수집기를 일시 중지했습니다." : "수집기를 다시 켰습니다.");
      await reload();
    } catch (sourceError) {
      setError(sourceError instanceof Error ? sourceError.message : "수집기 설정을 변경하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="admin-section-stack">
      <header className="admin-section-title">
        <div><span>TRUST & SOURCES</span><h2>신고함과 콘텐츠 수집 현황</h2><p>사용자 신고를 처리하고, AI 콘텐츠가 참고하는 공개 정보원의 수집 상태를 확인합니다.</p></div>
      </header>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <header className="admin-panel-head"><div><span>신고함</span><h2>검토할 신고</h2></div><b>{reports.filter((report) => report.status === "open").length}</b></header>
          <div className="report-list">
            {reports.map((report) => (
              <article key={report.id}>
                <div>
                  <span data-status={report.status}>{report.status === "open" ? "미처리" : report.status}</span>
                  <strong>{report.reason}</strong>
                  <small>{formatDateTime(report.createdAt)}</small>
                </div>
                {report.detail ? <p>{report.detail}</p> : null}
                <footer>
                  <Link href={`/g/${report.threadId || report.targetId}${report.targetType === "comment" ? `#comment-${report.targetId}` : ""}`} target="_blank"><ExternalLink size={14} />대상 확인</Link>
                  <button type="button" disabled={busy === report.id} onClick={() => void patchReport(report, "dismissed")}>기각</button>
                  <button type="button" disabled={busy === report.id} onClick={() => void patchReport(report, "actioned")}>조치 완료</button>
                </footer>
              </article>
            ))}
            {!reports.length ? <p className="admin-empty">접수된 신고가 없습니다.</p> : null}
          </div>
        </section>

        <section className="admin-panel">
          <header className="admin-panel-head"><div><span>자동 수집</span><h2>콘텐츠 원천</h2></div><Bot size={18} /></header>
          <div className="source-list">
            {sources.map((source) => (
              <div key={source.id}>
                <span className={`source-state ${source.lastStatus}`}><i /></span>
                <div><strong>{source.name}</strong><small>{source.sourceType} · {source.lastSuccessAt ? `최근 성공 ${formatDateTime(source.lastSuccessAt)}` : "첫 실행 대기"}</small></div>
                <a href={source.url} target="_blank" rel="noreferrer" aria-label={`${source.name} 열기`}><ExternalLink size={15} /></a>
                <button
                  type="button"
                  className={source.enabled ? "toggle active" : "toggle"}
                  aria-pressed={source.enabled}
                  disabled={busy === source.id}
                  onClick={() => void toggleSource(source)}
                ><i /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <header className="admin-panel-head"><div><span>실행 기록</span><h2>자동화 로그</h2></div><Archive size={18} /></header>
        <div className="run-table">
          <div className="run-row head"><span>작업</span><span>상태</span><span>수집</span><span>제안</span><span>시작</span></div>
          {runs.map((run) => (
            <div className="run-row" key={run.id}>
              <span>{run.runType === "daily_content" ? "일일 콘텐츠" : run.runType === "weekly_audit" ? "주간 사이트 점검" : "수동 실행"}</span>
              <span data-status={run.status}>{run.status}</span>
              <span>{run.signalsCount}건</span>
              <span>{run.proposalsCount}건</span>
              <span>{formatDateTime(run.startedAt)}</span>
            </div>
          ))}
          {!runs.length ? <p className="admin-empty">첫 자동화 실행을 기다리고 있습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}
