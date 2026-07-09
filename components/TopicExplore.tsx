"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

type Topic = {
  slug: string;
  title: string;
  description: string;
  href: string;
  meta: string;
};

const topics: Topic[] = [
  {
    slug: "academy-review",
    title: "아카데미 리뷰",
    description: "라틴씨엘로, 라스트댄스, 센슈얼랩, 엔수에뇨, 에버라틴처럼 실제 수업을 들은 사람들이 남기는 후기.",
    href: "/?sort=hot",
    meta: "수업 후기"
  },
  {
    slug: "dancer-review",
    title: "댄서 리뷰",
    description: "부트캠프, 마스터클래스, 워크숍, 소셜댄스, 해외수업참여까지 댄서를 경험한 방식별로 이야기합니다.",
    href: "/dancers",
    meta: "워크숍 후기"
  },
  {
    slug: "ask",
    title: "무물보",
    description: "인스트럭터, 운영자, 초보자 누구나 열 수 있는 질문방. 댓글로 묻고 답하는 바차타식 AMA입니다.",
    href: "/write",
    meta: "질문방"
  },
  {
    slug: "festival",
    title: "페스티벌",
    description: "국내 행사와 해외 페스티벌을 날짜, 패스, 동선, 후기 중심으로 모읍니다.",
    href: "/events",
    meta: "행사 정보"
  },
  {
    slug: "social-review",
    title: "소셜 후기",
    description: "오늘 플로어 분위기, 음악, 매너, 처음 간 사람의 체감까지 편하게 남기는 공간입니다.",
    href: "/?sort=new",
    meta: "현장감"
  },
  {
    slug: "beginner",
    title: "초보 질문",
    description: "베이직, 박자, 홀딩, 첫 소셜, 신발, 옷차림처럼 처음엔 다 헷갈리는 것들.",
    href: "/guide",
    meta: "입문"
  }
];

const storageKey = "bachata.followedTopics.v1";

export function TopicExplore() {
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setFollowed(new Set(JSON.parse(raw) as string[]));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  const toggle = (slug: string) => {
    setFollowed((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <section className="topic-explore" aria-labelledby="topic-explore-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">주제 탐색</span>
          <h2 id="topic-explore-title">요즘 바차타 사람들이 모이는 이야기</h2>
        </div>
        <Link href="/write">새 글 쓰기</Link>
      </div>
      <div className="topic-grid">
        {topics.map((topic) => {
          const isFollowed = followed.has(topic.slug);
          return (
            <article key={topic.slug} className="topic-card">
              <Link href={topic.href}>
                <span>{topic.meta}</span>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
              </Link>
              <button type="button" onClick={() => toggle(topic.slug)} aria-pressed={isFollowed}>
                {isFollowed ? <Check size={16} /> : <Bell size={16} />}
                {isFollowed ? "팔로우 중" : "팔로우"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
