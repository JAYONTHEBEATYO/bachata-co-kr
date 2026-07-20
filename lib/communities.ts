import type { Community } from "./types";

export const communities: Community[] = [
  {
    slug: "free",
    category: "free",
    name: "자유게시판",
    description: "바차타와 소셜 이야기를 자유롭게 나눕니다.",
    color: "#ff4500"
  },
  {
    slug: "questions",
    category: "questions",
    name: "질문",
    description: "입문, 수업, 음악, 홀딩이 궁금할 때 묻습니다.",
    color: "#0079d3"
  },
  {
    slug: "video",
    category: "video",
    name: "영상",
    description: "함께 보고 싶은 공연, 소셜, 레슨 영상을 올립니다.",
    color: "#ff585b"
  },
  {
    slug: "events",
    category: "events",
    name: "행사",
    description: "소셜, 워크숍, 국내외 페스티벌 정보를 나눕니다.",
    color: "#7c4dff"
  },
  {
    slug: "academy-review",
    category: "academyReview",
    name: "아카데미 리뷰",
    description: "학원, 동호회, 수업을 직접 경험한 후기를 남깁니다.",
    color: "#008a66"
  },
  {
    slug: "dancer-review",
    category: "dancerReview",
    name: "댄서 리뷰",
    description: "워크숍, 부트캠프, 소셜에서 만난 댄서를 이야기합니다.",
    color: "#e5484d"
  },
  {
    slug: "social-review",
    category: "socialReview",
    name: "소셜 후기",
    description: "지역과 장소별 플로어 분위기와 후기를 공유합니다.",
    color: "#b7791f"
  },
  {
    slug: "ama",
    category: "ama",
    name: "무물보",
    description: "댄서, 강사, 운영자와 편하게 묻고 답합니다.",
    color: "#536471"
  }
];

export const communityBySlug = (slug: string) =>
  communities.find((community) => community.slug === slug);

export const communityByCategory = (category: string) =>
  communities.find((community) => community.category === category);
