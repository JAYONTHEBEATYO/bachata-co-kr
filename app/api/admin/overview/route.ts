import type { NextRequest } from "next/server";
import { adminResponse, requireAdmin } from "@/lib/admin-server";
import type { AdminOverview } from "@/lib/admin-types";

type CountRow = { count: number };
type AnalyticsRow = {
  pageviews: number;
  visitors: number;
  duration: number;
};

const kstDayStart = (daysAgo = 0) => {
  const kstOffset = 9 * 60 * 60_000;
  const shifted = Date.now() + kstOffset;
  const day = 24 * 60 * 60_000;
  return new Date(Math.floor(shifted / day) * day - kstOffset - daysAgo * day).toISOString();
};

const percentChange = (current: number, previous: number) => {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { db } = auth;

  const today = kstDayStart();
  const yesterday = kstDayStart(1);
  const fourteenDays = kstDayStart(13);
  const sevenDays = kstDayStart(6);
  const fiveMinutes = new Date(Date.now() - 5 * 60_000).toISOString();

  const [
    todayAnalytics,
    yesterdayAnalytics,
    active,
    threads7d,
    comments7d,
    memberCount,
    pendingProposals,
    openReports,
    dailyRows,
    topPageRows,
    activityRows
  ] = await Promise.all([
    db.prepare(
      `select count(*) as pageviews, count(distinct visitor_hash) as visitors,
              coalesce(avg(case when duration_seconds > 0 then duration_seconds end), 0) as duration
       from analytics_pageviews where started_at >= ? and device_type != 'bot'`
    ).bind(today).first<AnalyticsRow>(),
    db.prepare(
      `select count(*) as pageviews, count(distinct visitor_hash) as visitors,
              coalesce(avg(case when duration_seconds > 0 then duration_seconds end), 0) as duration
       from analytics_pageviews where started_at >= ? and started_at < ? and device_type != 'bot'`
    ).bind(yesterday, today).first<AnalyticsRow>(),
    db.prepare(
      `select count(distinct session_hash) as count
       from analytics_pageviews
       where updated_at >= ? and device_type != 'bot'`
    ).bind(fiveMinutes).first<CountRow>(),
    db.prepare(
      "select count(*) as count from guest_threads where status = 'published' and created_at >= ?"
    ).bind(sevenDays).first<CountRow>(),
    db.prepare(
      "select count(*) as count from comments where status = 'published' and created_at >= ?"
    ).bind(sevenDays).first<CountRow>(),
    db.prepare("select count(*) as count from users where status = 'active'").first<CountRow>(),
    db.prepare("select count(*) as count from admin_proposals where status = 'pending'").first<CountRow>(),
    db.prepare("select count(*) as count from reports where status = 'open'").first<CountRow>(),
    db.prepare(
      `select date(datetime(started_at, '+9 hours')) as date,
              count(*) as pageviews,
              count(distinct visitor_hash) as visitors,
              round(coalesce(avg(case when duration_seconds > 0 then duration_seconds end), 0)) as duration
       from analytics_pageviews
       where started_at >= ? and device_type != 'bot'
       group by date(datetime(started_at, '+9 hours'))
       order by date asc`
    ).bind(fourteenDays).all<{
      date: string;
      pageviews: number;
      visitors: number;
      duration: number;
    }>(),
    db.prepare(
      `select path, count(*) as pageviews, count(distinct visitor_hash) as visitors,
              round(coalesce(avg(case when duration_seconds > 0 then duration_seconds end), 0)) as duration
       from analytics_pageviews
       where started_at >= ? and device_type != 'bot'
       group by path
       order by pageviews desc
       limit 8`
    ).bind(sevenDays).all<{
      path: string;
      pageviews: number;
      visitors: number;
      duration: number;
    }>(),
    db.prepare(
      `select id, action, target_type as targetType, target_id as targetId, created_at as createdAt
       from admin_activity_log order by created_at desc limit 10`
    ).all<{
      id: string;
      action: string;
      targetType: string;
      targetId: string | null;
      createdAt: string;
    }>()
  ]);

  const current = {
    pageviews: Number(todayAnalytics?.pageviews || 0),
    visitors: Number(todayAnalytics?.visitors || 0),
    duration: Math.round(Number(todayAnalytics?.duration || 0))
  };
  const previous = {
    pageviews: Number(yesterdayAnalytics?.pageviews || 0),
    visitors: Number(yesterdayAnalytics?.visitors || 0),
    duration: Math.round(Number(yesterdayAnalytics?.duration || 0))
  };

  const overview: AdminOverview = {
    generatedAt: new Date().toISOString(),
    metrics: {
      visitors: {
        value: current.visitors,
        change: percentChange(current.visitors, previous.visitors)
      },
      pageviews: {
        value: current.pageviews,
        change: percentChange(current.pageviews, previous.pageviews)
      },
      averageDuration: {
        value: current.duration,
        change: percentChange(current.duration, previous.duration)
      },
      activeNow: { value: Number(active?.count || 0) },
      threads7d: { value: Number(threads7d?.count || 0) },
      comments7d: { value: Number(comments7d?.count || 0) },
      members: { value: Number(memberCount?.count || 0) },
      pendingWork: {
        value: Number(pendingProposals?.count || 0) + Number(openReports?.count || 0)
      }
    },
    daily: (dailyRows.results || []).map((row) => ({
      date: row.date,
      pageviews: Number(row.pageviews || 0),
      visitors: Number(row.visitors || 0),
      duration: Number(row.duration || 0)
    })),
    topPages: (topPageRows.results || []).map((row) => ({
      path: row.path,
      pageviews: Number(row.pageviews || 0),
      visitors: Number(row.visitors || 0),
      duration: Number(row.duration || 0)
    })),
    activity: activityRows.results || []
  };

  return adminResponse(request, 200, { overview });
}
