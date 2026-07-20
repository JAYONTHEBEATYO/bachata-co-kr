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
  subtopics: string[];
};

const topics: Topic[] = [
  {
    slug: "academy-review",
    title: "아카데미 리뷰",
    description: "어디에서 배울지 고민될 때 실제 수업과 동호회 경험을 나눕니다.",
    href: "/topics/academy-review",
    meta: "수업·동호회",
    subtopics: ["라틴씨엘로", "센슈얼랩", "에버라틴", "라스트댄스", "엔수에뇨", "오살사"]
  },
  {
    slug: "dancer-review",
    title: "댄서 리뷰",
    description: "워크숍부터 부트캠프, 소셜댄스까지 직접 겪은 이야기를 나눕니다.",
    href: "/topics/dancer-review",
    meta: "워크숍·홀딩",
    subtopics: ["멜빈", "가티카", "헤로", "미글레", "그레이", "소라", "원궁"]
  },
  {
    slug: "social-review",
    title: "소셜 후기",
    description: "오늘 플로어 분위기, 음악, 사람, 매너를 장소별로 남깁니다.",
    href: "/topics/social-review",
    meta: "바·지역",
    subtopics: ["강남 라틴바", "홍대 보니따", "인천", "부산", "대구", "제주"]
  },
  {
    slug: "events",
    title: "국내외 행사",
    description: "국내 행사와 해외 페스티벌, 워크숍, 패스 이야기를 찾아봅니다.",
    href: "/topics/events",
    meta: "행사·페스티벌",
    subtopics: ["국내 행사", "해외 행사", "행사 후기", "워크숍", "양도/패스"]
  },
  {
    slug: "questions",
    title: "질문과 무물보",
    description: "처음 배우는 사람부터 강사, 운영자까지 댓글로 묻고 답합니다.",
    href: "/write?type=ama",
    meta: "무물보",
    subtopics: ["무물보", "입문 질문", "음악 질문", "홀딩", "소셜 매너"]
  },
  {
    slug: "styles",
    title: "장르와 테크닉",
    description: "센슈얼, 도미니칸, 인플루언스, 풋워크 같은 세부 주제를 따라갑니다.",
    href: "/guide",
    meta: "스타일",
    subtopics: ["센슈얼", "도미니칸", "인플루언스", "풋워크", "레이디스타일", "맨즈스타일"]
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
    <section className="topic-explore" id="topic-explore" aria-labelledby="topic-explore-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">주제 탐색</span>
          <h2 id="topic-explore-title">바차타 이야기를 어디에 올릴까?</h2>
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
                <div className="topic-chip-row">
                  {topic.subtopics.slice(0, 6).map((subtopic) => <em key={subtopic}>{subtopic}</em>)}
                </div>
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
