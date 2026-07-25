import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Music2 } from "lucide-react";
import { AppNavigation } from "@/components/AppNavigation";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Sidebar } from "@/components/Sidebar";
import { getCommunityContext } from "@/lib/community-server";
import { getCommunities } from "@/lib/data";
import { formatRelativeDate } from "@/lib/format";
import { loadPublicProfile } from "@/lib/auth-server";

type ProfileThread = {
  id: string;
  title: string;
  body: string;
  category: string;
  score: number;
  createdAt: string;
  commentCount: number;
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const { db } = await getCommunityContext();
  const profile = db ? await loadPublicProfile(db, handle) : null;
  return profile ? {
    title: `${profile.displayName} (@${profile.handle})`,
    description: profile.bio || `${profile.displayName}님의 바차타 코리아 프로필입니다.`,
    alternates: { canonical: `/u/${profile.handle}` }
  } : { title: "프로필을 찾을 수 없습니다" };
}

export default async function PublicProfilePage({
  params
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const { db } = await getCommunityContext();
  if (!db) notFound();
  const profile = await loadPublicProfile(db, handle);
  if (!profile) notFound();
  const communities = await getCommunities();
  const rows = await db.prepare(
    `select
      g.id,
      g.title,
      g.body,
      g.category,
      g.score,
      g.created_at as createdAt,
      (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
     from guest_threads g
     where g.user_id = ? and g.status = 'published'
     order by g.created_at desc
     limit 20`
  ).bind(profile.id).all<ProfileThread>();

  return (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        <div className="public-profile-page">
          <section className="public-profile-head">
            <ProfileAvatar
              name={profile.displayName}
              avatarUrl={profile.avatarUrl}
              avatarPreset={profile.avatarPreset}
              size={96}
            />
            <div>
              <h1>{profile.displayName}</h1>
              <p>@{profile.handle}</p>
              {profile.bio ? <strong>{profile.bio}</strong> : null}
              <div className="public-profile-meta">
                {profile.location ? <span><MapPin size={15} />{profile.location}</span> : null}
                {profile.danceYears !== null ? <span><Music2 size={15} />바차타 {profile.danceYears}년</span> : null}
                <span><CalendarDays size={15} />{formatRelativeDate(profile.joinedAt)} 가입</span>
              </div>
            </div>
          </section>
          {profile.preferredStyles.length ? (
            <div className="profile-style-row">
              {profile.preferredStyles.map((style) => <span key={style}>{style}</span>)}
            </div>
          ) : null}
          <section className="profile-thread-list">
            <header>
              <h2>작성한 글</h2>
              <span>{rows.results?.length || 0}개</span>
            </header>
            {rows.results?.length ? rows.results.map((thread) => (
              <Link key={thread.id} href={`/g/${thread.id.slice(0, 8)}`}>
                <span>{thread.category}</span>
                <h3>{thread.title}</h3>
                <p>{thread.body.replace(/\[첨부\][\s\S]*/g, "").slice(0, 140)}</p>
                <small>추천 {thread.score} · 댓글 {thread.commentCount} · {formatRelativeDate(thread.createdAt)}</small>
              </Link>
            )) : <p className="empty-copy">아직 작성한 글이 없습니다.</p>}
          </section>
        </div>
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
