import type { Comment, Community, DancerCard, DraftSignal, EventCard, Thread } from "./types";

export const communities: Community[] = [
  {
    slug: "hot",
    name: "인기",
    description: "오늘 바차타 코리아에서 가장 많이 반응한 글입니다.",
    memberCount: 1280,
    color: "#ff5a3d"
  },
  {
    slug: "video",
    name: "영상",
    description: "유튜브, 소셜 영상, 워크숍 클립을 보고 이야기합니다.",
    memberCount: 920,
    color: "#4f7cff"
  },
  {
    slug: "events",
    name: "행사",
    description: "국내외 페스티벌, 워크숍, 소셜 일정을 모읍니다.",
    memberCount: 760,
    color: "#07a074"
  },
  {
    slug: "questions",
    name: "질문",
    description: "처음 배우는 사람도 편하게 물어볼 수 있는 공간입니다.",
    memberCount: 640,
    color: "#ad6cff"
  },
  {
    slug: "dancers",
    name: "댄서",
    description: "국내외 댄서, 팀, 크루, 강사의 무대와 수업 이야기를 만납니다.",
    memberCount: 530,
    color: "#f5a524"
  },
  {
    slug: "guide",
    name: "가이드",
    description: "바차타 베이직과 장르별 핵심을 차근차근 따라갑니다.",
    memberCount: 680,
    color: "#0c8f70"
  }
];

export const threads: Thread[] = [
  {
    id: "1001",
    slug: "bachata-basic-first-watch",
    title: "바차타 베이직 먼저 파악하기",
    excerpt: "이제 막 바차타가 궁금해졌다면, 스텝 이름보다 박자와 체중 이동을 먼저 보면 훨씬 빨리 감이 옵니다.",
    body: "바차타 베이직은 바차타 커플댄스를 추기 위해서 가장 기초적이면서도 중요합니다. 스텝 자체는 단순해 보여도, 실제로는 박자 안에서 체중을 어떻게 옮기는지, 골반과 상체가 어느 정도로 따라오는지, 파트너와 거리를 어떻게 유지하는지가 함께 들어 있습니다. 이제 막 바차타에 관심이 생겼다면 아래 영상을 참고해서 바차타 베이직이 무엇인지 먼저 감을 잡아보세요. 처음부터 화려한 웨이브나 턴을 외우려고 하기보다, 네 박자 안에서 몸이 어디로 가는지 확인하는 편이 훨씬 오래 갑니다. 영상은 한 번 보고 끝내기보다, 발만 보고 한 번, 골반과 상체를 보고 한 번, 음악의 악센트를 들으며 한 번 더 보는 걸 추천합니다.",
    communitySlug: "questions",
    communityName: "질문",
    flair: "입문",
    author: "Bachata Korea",
    createdAt: "2026-07-08T08:10:00+09:00",
    score: 214,
    upvotes: 231,
    downvotes: 17,
    commentCount: 38,
    videoId: "xhrdh-uFkog",
    sourceLinks: [{ label: "Bachata Dance Academy 베이직", url: "https://www.youtube.com/watch?v=xhrdh-uFkog" }],
    tags: ["바차타 베이직", "입문", "bachata basic"],
    pinned: true
  },
  {
    id: "1002",
    slug: "bachata-influence-melvin-gatica-points",
    title: "Bachata Influence, 테크닉보다 중요하게 생각하는 포인트!",
    excerpt: "Melvin & Gatica 계열을 볼 때는 큰 동작보다 프레임, 전환, 감정선의 밀도 조절이 먼저 보입니다.",
    body: "Melvin & Gatica 계열의 Bachata Influence 영상을 살펴보면, 기존 센슈얼 바차타와 비슷해 보이는 웨이브나 트릭보다 프레임, 전환, 감정선의 밀도 조절이 더 중요해 보입니다. 리더가 멈추는 순간, 팔의 힘을 빼는 순간, 팔로워가 축을 다시 세우는 순간을 보면 왜 이 스타일이 단순히 어려운 동작 모음이 아닌지 알 수 있습니다. 이런 포인트를 중점적으로 보면 안 보였던 부분이 두 배로 보인다는 사실. 특히 소셜에서 바로 따라 하기 어려운 기술을 욕심내기보다, 음악이 바뀌는 지점에서 두 사람이 어떻게 속도를 줄이고 다시 연결하는지 먼저 보는 것이 좋습니다.",
    communitySlug: "video",
    communityName: "영상",
    flair: "Bachata Influence",
    author: "Bachata Korea",
    createdAt: "2026-07-08T07:45:00+09:00",
    score: 188,
    upvotes: 205,
    downvotes: 17,
    commentCount: 27,
    videoId: "sUy5L7x5pyE",
    sourceLinks: [{ label: "Melvin & Gatica 영상", url: "https://www.youtube.com/watch?v=sUy5L7x5pyE" }],
    tags: ["Bachata Influence", "Melvin Gatica", "센슈얼 바차타"]
  },
  {
    id: "1003",
    slug: "korea-social-video-watch-points",
    title: "국내 바차타 소셜 영상, 어디부터 보면 좋을까?",
    excerpt: "서울 소셜 영상은 분위기만 보는 자료가 아닙니다. 박자, 거리, 홀드, 플로어 매너를 같이 읽을 수 있습니다.",
    body: "국내 바차타 소셜 영상은 단순한 기록 영상처럼 보여도, 처음 배우는 사람에게 꽤 좋은 참고 자료가 됩니다. 어떤 음악이 자주 나오는지, 사람들이 어느 정도 간격으로 춤을 추는지, 리드와 팔로우가 붐비는 플로어에서 어떻게 동선을 조절하는지 한 번에 볼 수 있기 때문입니다. 특히 그레이와 로렌처럼 국내에서 자주 언급되는 페어의 소셜 영상은 화려한 패턴보다 실제 플로어에서 움직임이 어떻게 정리되는지를 보기 좋습니다. 처음 볼 때는 잘 추는 사람만 찾기보다, 곡이 바뀌는 순간의 시작, 중간에 공간이 좁아졌을 때의 대처, 마지막 포즈 이후의 인사까지 보는 쪽이 좋습니다.",
    communitySlug: "video",
    communityName: "영상",
    flair: "국내 소셜",
    author: "Bachata Korea",
    createdAt: "2026-07-08T06:35:00+09:00",
    score: 171,
    upvotes: 190,
    downvotes: 19,
    commentCount: 21,
    videoId: "gDtOwUqeWKw",
    sourceLinks: [{ label: "국내 소셜 참고 영상", url: "https://www.youtube.com/watch?v=gDtOwUqeWKw" }],
    tags: ["국내 바차타", "소셜", "서울"]
  },
  {
    id: "1004",
    slug: "sensual-vs-dominican-bachata",
    title: "센슈얼? 도미니칸? 처음엔 이렇게 구분하면 됩니다",
    excerpt: "장르 이름을 외우기보다 음악을 듣는 방식, 체중 이동, 연결감의 차이를 먼저 잡으면 덜 헷갈립니다.",
    body: "센슈얼 바차타와 도미니칸 바차타는 서로 우열을 따질 장르가 아니라, 음악을 읽고 몸을 쓰는 방식이 다른 흐름에 가깝습니다. 도미니칸은 리듬과 풋워크의 맛이 먼저 들어오고, 센슈얼은 프레임과 상체 움직임, 음악의 긴장을 다루는 방식이 눈에 들어옵니다. 처음 배우는 단계에서는 어느 쪽이 더 멋있는지보다 내가 어떤 음악에 더 반응하는지 보는 편이 좋습니다. 빠른 기타 리듬을 들으면 발이 먼저 움직이는지, 느린 보컬과 드라마틱한 전환에서 몸의 연결감을 느끼는지 체크해보세요. 둘 다 해보면 결국 바차타를 더 넓게 이해하게 됩니다.",
    communitySlug: "questions",
    communityName: "질문",
    flair: "장르",
    author: "latincielo",
    createdAt: "2026-07-07T23:20:00+09:00",
    score: 156,
    upvotes: 169,
    downvotes: 13,
    commentCount: 44,
    videoId: "vs3YqyTyOIo",
    sourceLinks: [{ label: "센슈얼 참고 영상", url: "https://www.youtube.com/watch?v=vs3YqyTyOIo" }],
    tags: ["센슈얼 바차타", "도미니칸 바차타", "입문"]
  },
  {
    id: "1005",
    slug: "festival-calendar-july-2026",
    title: "이번 달 국내 바차타 페스티벌과 워크숍 체크",
    excerpt: "날짜, 장소, 패스 범위는 공식 링크로 다시 확인하고, 영상으로 분위기까지 미리 봅니다.",
    body: "바차타 행사 정보는 인스타그램, 예매 페이지, 스튜디오 공지, 유튜브 영상에 흩어져 있는 경우가 많습니다. 그래서 일정만 보는 것보다 어떤 워크숍이 열리는지, 소셜 비중이 큰지, Jack & Jill이나 쇼케이스가 있는지 함께 보는 편이 좋습니다. 특히 처음 페스티벌을 가는 사람이라면 패스 이름이 비슷해서 헷갈릴 수 있습니다. 전체 패스인지, 소셜만 가능한지, 워크숍이 포함되는지, 환불 조건이 어떻게 되는지 공식 링크에서 다시 확인하세요. 바차타 코리아는 이런 정보를 쓰레드로 모아두고, 확인된 링크와 영상이 있는 것부터 먼저 올립니다.",
    communitySlug: "events",
    communityName: "행사",
    flair: "페스티벌",
    author: "Bachata Korea",
    createdAt: "2026-07-07T21:15:00+09:00",
    score: 143,
    upvotes: 151,
    downvotes: 8,
    commentCount: 19,
    videoId: "zQXNPwMqpdw",
    sourceLinks: [
      { label: "K-Sensual Instagram", url: "https://www.instagram.com/ksensual_official/" },
      { label: "BachaMap listing", url: "https://bachamap.com/festivals/south-korea/k-sensual" }
    ],
    tags: ["페스티벌", "워크숍", "K-Sensual"]
  },
  {
    id: "1006",
    slug: "overseas-festival-before-booking",
    title: "해외 바차타 페스티벌, 비행기 끊기 전에 볼 것",
    excerpt: "해외 행사는 라인업보다 숙소, 패스 범위, 환불 조건, 도시 동선이 먼저입니다.",
    body: "해외 바차타 페스티벌은 라인업이 화려해서 바로 결제하고 싶어지지만, 실제로는 비행기와 숙소가 함께 움직이는 일정입니다. 날짜가 확정인지, 베뉴가 공항이나 숙소에서 얼마나 떨어져 있는지, 워크숍과 소셜이 같은 장소인지 먼저 확인해야 합니다. 패스도 이름만 보고 고르면 안 됩니다. Full pass, Party pass, Workshop pass가 섞여 있고, 환불 조건이나 명의 변경 규정이 행사마다 다릅니다. 바차타 제네바나 카디스 같은 해외 일정은 공식 웹사이트와 예매 페이지가 분리되어 있는 경우가 있으니, 결제 전에는 반드시 원문 링크에서 조건을 다시 보는 것이 좋습니다.",
    communitySlug: "events",
    communityName: "행사",
    flair: "해외페스티벌",
    author: "Bachata Korea",
    createdAt: "2026-07-07T18:00:00+09:00",
    score: 118,
    upvotes: 128,
    downvotes: 10,
    commentCount: 16,
    videoId: "KwCdb36gUtY",
    sourceLinks: [
      { label: "Bachata Geneva Festival", url: "https://bachatagenevafestival.com/" },
      { label: "Social World Cup 영상", url: "https://www.youtube.com/watch?v=KwCdb36gUtY" }
    ],
    tags: ["해외페스티벌", "여행", "Geneva"]
  },
  {
    id: "1007",
    slug: "first-social-etiquette",
    title: "처음 소셜 갈 때, 춤보다 먼저 챙기면 좋은 것",
    excerpt: "처음엔 잘 추는 것보다 음악 듣기, 거절 매너, 플로어에서 부딪히지 않는 감각이 더 중요합니다.",
    body: "처음 바차타 소셜에 가면 내가 얼마나 잘 추는지부터 걱정하게 됩니다. 그런데 실제로는 기본 매너가 훨씬 중요합니다. 춤을 신청할 때는 가볍게 묻고, 상대가 거절하면 바로 물러나면 됩니다. 플로어가 좁을 때는 큰 딥이나 과한 이동을 줄이고, 옆 커플과 부딪히지 않는 범위에서 춤추는 것이 좋습니다. 땀이 많다면 수건이나 여벌 옷을 챙기는 것도 기본입니다. 처음부터 모든 곡을 추려고 하지 않아도 됩니다. 몇 곡은 그냥 앉아서 음악과 사람들의 흐름을 보는 것만으로도 다음 소셜이 훨씬 편해집니다.",
    communitySlug: "questions",
    communityName: "질문",
    flair: "소셜매너",
    author: "sera",
    createdAt: "2026-07-07T13:20:00+09:00",
    score: 101,
    upvotes: 109,
    downvotes: 8,
    commentCount: 31,
    sourceLinks: [],
    tags: ["소셜", "매너", "초보자"]
  },
  {
    id: "1008",
    slug: "korke-judith-16-fundamentals",
    title: "Korke & Judith 16 fundamentals, 정답표가 아니라 지도처럼 보기",
    excerpt: "센슈얼 바차타의 기본 개념은 이름을 외우기보다 연결, 축, 안전, 음악 해석을 함께 봐야 합니다.",
    body: "Korke & Judith로 대표되는 센슈얼 바차타의 기본 개념은 단어만 외운다고 바로 춤이 되지 않습니다. body wave, isolation, head movement 같은 이름보다 중요한 것은 언제 쓰는지, 어떤 연결에서 가능한지, 안전하게 멈출 수 있는지입니다. 특히 헤드무브나 깊은 상체 움직임은 영상에서 멋있어 보여도 소셜에서 그대로 따라 하면 위험할 수 있습니다. 그래서 16 fundamentals는 정답표라기보다 지도로 보는 편이 좋습니다. 각 개념이 어떤 음악에서 자연스럽게 나오고, 리더와 팔로워가 어디까지 동의하고 준비해야 하는지 같이 보세요.",
    communitySlug: "guide",
    communityName: "가이드",
    flair: "센슈얼",
    author: "Bachata Korea",
    createdAt: "2026-07-06T22:50:00+09:00",
    score: 93,
    upvotes: 101,
    downvotes: 8,
    commentCount: 12,
    videoId: "B7Wv3cqHrSU",
    sourceLinks: [{ label: "Korke y Judith 16 fundamentals", url: "https://www.youtube.com/watch?v=B7Wv3cqHrSU" }],
    tags: ["Korke Judith", "센슈얼", "안전"]
  }
];

export const comments: Comment[] = [
  {
    id: "c1",
    threadId: "1001",
    author: "firstbasic",
    body: "베이직을 발만 보다가 골반이랑 체중 이동을 같이 보니까 갑자기 이해가 되네요.",
    score: 42,
    createdAt: "2026-07-08T08:24:00+09:00",
    replies: [
      {
        id: "c1-1",
        threadId: "1001",
        author: "Bachata Korea",
        body: "처음엔 발, 골반, 음악을 따로 보는 게 맞습니다. 한 번에 다 보려고 하면 오히려 놓치는 게 많아요.",
        score: 19,
        createdAt: "2026-07-08T08:31:00+09:00"
      }
    ]
  },
  {
    id: "c2",
    threadId: "1002",
    author: "sensualreader",
    body: "프레임이랑 멈춤을 보라는 말이 좋네요. 영상 다시 보니까 손이 아니라 몸 전체가 기다리는 느낌이 보입니다.",
    score: 35,
    createdAt: "2026-07-08T08:02:00+09:00"
  },
  {
    id: "c3",
    threadId: "1005",
    author: "festivalgoer",
    body: "패스 종류 헷갈리는 건 진짜 공감입니다. 소셜만 되는 패스인지 워크숍 포함인지 항상 다시 봐야 해요.",
    score: 28,
    createdAt: "2026-07-07T22:01:00+09:00"
  }
];

export const events: EventCard[] = [
  {
    id: "k-sensual-summer-2026",
    title: "K-Sensual Summer 10th Anniversary",
    region: "domestic",
    dateLabel: "2026년 7월 9일-13일",
    city: "제주",
    venue: "제주",
    excerpt: "국내에서 해외 아티스트, Jack & Jill, 워크숍, 소셜을 함께 경험하기 좋은 여름형 바차타 행사입니다.",
    posterUrl: "https://i.ytimg.com/vi/zQXNPwMqpdw/hqdefault.jpg",
    sourceUrl: "https://www.instagram.com/ksensual_official/",
    tags: ["국내", "페스티벌", "K-Sensual"]
  },
  {
    id: "seoul-bachata-festival-2026",
    title: "Seoul Bachata Festival Vol.4",
    region: "domestic",
    dateLabel: "2026년 7월 24일-26일",
    city: "서울",
    venue: "서울",
    excerpt: "서울권 입문자와 소셜댄서가 접근하기 쉬운 국내 바차타 페스티벌입니다. 패스 범위와 소셜 장소를 먼저 확인하세요.",
    posterUrl: "https://i.ytimg.com/vi/jpCY0QqZqWE/hqdefault.jpg",
    sourceUrl: "https://www.instagram.com/seoulbachatafestival/",
    tags: ["서울", "워크숍", "소셜"]
  },
  {
    id: "bachata-geneva-festival-2026",
    title: "Bachata Geneva Festival 2026",
    region: "overseas",
    dateLabel: "2026년 10월 8일-12일",
    city: "Geneva, Switzerland",
    venue: "Palexpo Congress Center",
    excerpt: "해외 라인업과 Bachata Social World Cup 흐름을 함께 볼 수 있는 유럽권 대형 행사입니다.",
    posterUrl: "https://i.ytimg.com/vi/KwCdb36gUtY/hqdefault.jpg",
    sourceUrl: "https://bachatagenevafestival.com/",
    tags: ["해외", "Geneva", "World Cup"]
  }
];

export const dancers: DancerCard[] = [
  {
    id: "melvin-gatica",
    name: "Melvin & Gatica",
    role: "Bachata Influence",
    excerpt: "동작의 크기보다 프레임, 감정선, 전환의 밀도를 어떻게 설계하는지 볼 때 더 잘 읽히는 팀입니다.",
    videoId: "sUy5L7x5pyE",
    tags: ["Influence", "Musicality", "Method"]
  },
  {
    id: "emilien-tehina",
    name: "Emilien & Tehina",
    role: "Influence, Sensual",
    excerpt: "정지와 진행의 대비가 선명한 페어입니다. 큰 동작보다 언제 기다리고 언제 다시 이어가는지 보기에 좋습니다.",
    videoId: "FNv7eOMg-_k",
    tags: ["Influence", "Connection", "Workshop"]
  },
  {
    id: "korke-judith",
    name: "Korke & Judith",
    role: "Bachata Sensual",
    excerpt: "센슈얼 바차타를 이야기할 때 빠질 수 없는 기준점입니다. 16개 펀더멘털은 기술표보다 안전한 연결의 지도처럼 보면 좋습니다.",
    videoId: "B7Wv3cqHrSU",
    tags: ["Sensual", "Fundamentals", "Safety"]
  },
  {
    id: "gero-migle",
    name: "Gero & Migle",
    role: "Global Dancers",
    excerpt: "감정선과 컨트롤을 함께 보기 좋은 페어입니다. 큰 모양보다 시작 전 준비와 프레임 유지가 먼저 보입니다.",
    videoId: "j4CmXKDCMzI",
    tags: ["Sensual", "Performance", "Control"]
  },
  {
    id: "luis-andrea",
    name: "Luis & Andrea",
    role: "Global Dancers",
    excerpt: "국제 페스티벌 맥락에서 자주 언급되는 페어입니다. 타이밍, 방향 전환, 표현의 강약을 나눠 보기 좋습니다.",
    videoId: "L1vzrcpeBuw",
    tags: ["Sensual", "Workshop", "Festival"]
  },
  {
    id: "cristian-gabriella",
    name: "Cristian & Gabriella",
    role: "Bachata Sensual",
    excerpt: "부드러운 연결과 소셜 친화적인 라인을 같이 볼 수 있는 페어입니다. 느린 곡에서 거리와 속도를 다루는 방식이 눈에 들어옵니다.",
    videoId: "CZEB8wdVXOc",
    tags: ["Sensual", "Spain", "Connection"]
  },
  {
    id: "sara-panero",
    name: "Sara Panero",
    role: "Lady Style",
    excerpt: "레이디 스타일과 바디무브먼트를 독립적인 학습 주제로 보기 좋은 아티스트입니다. 손끝, 시선, 라인이 음악 안에서 어떻게 정리되는지 볼 수 있습니다.",
    videoId: "FCAt14yr0j4",
    tags: ["Lady Style", "Body Movement", "Stage"]
  },
  {
    id: "gray-loren",
    name: "Gray & Loren",
    role: "Korea Social",
    excerpt: "한국 바차타에서 Influence 계열 감각을 읽을 때 먼저 확인할 만한 팀입니다. 공개 소셜 영상으로 프레임과 음악성을 살펴볼 수 있습니다.",
    videoId: "nrJM-arshvE",
    tags: ["Korea", "Social", "Video"]
  },
  {
    id: "cluny-journey",
    name: "Cluny & Journey",
    role: "Korea Social",
    excerpt: "한국 소셜과 공연 영상으로 흐름을 확인할 수 있는 국내 페어입니다. 무대용 표현과 소셜용 움직임을 나눠 보기 좋습니다.",
    videoId: "CypEYpiRzCo",
    tags: ["Korea", "Social", "Performance"]
  },
  {
    id: "sora-dalkong",
    name: "소라 & 달콩",
    role: "Dominican, Korea",
    excerpt: "라틴씨엘로의 도미니칸, 베이직, 해외 데모 따라잡기 수업 기록이 확인되는 페어입니다. 발과 리듬을 같이 보는 입구로 좋습니다.",
    videoId: "6h3Io0i6H_M",
    tags: ["Korea", "Dominican", "Latin Cielo"]
  },
  {
    id: "waffle-sera",
    name: "와플 & 세라",
    role: "Korea Social",
    excerpt: "소셜 원리와 한곡반 영상으로 국내 수업 흐름을 확인할 수 있는 페어입니다. 안무보다 연결을 어떻게 설명하는지 볼 만합니다.",
    videoId: "ZvyiwLuNPj4",
    tags: ["Korea", "Social", "Class"]
  },
  {
    id: "victor-alba",
    name: "Victor & Alba",
    role: "Korea Visit",
    excerpt: "한국 부트캠프와 공연 영상으로 활동을 확인할 수 있는 최근 내한 팀입니다. 국내 워크숍 흐름과 연결해서 보기 좋습니다.",
    videoId: "AV2YXlMIBd0",
    tags: ["Korea Visit", "Bootcamp", "Sensual"]
  },
  {
    id: "ryuji",
    name: "류지",
    role: "Korea",
    excerpt: "화차타 백화점 클래스와 류텐션 영상으로 최근 강남 활동을 확인할 수 있는 댄서입니다. 레벨별 수업과 발표 흐름을 같이 볼 수 있습니다.",
    videoId: "-39NjttCnLM",
    tags: ["Korea", "Gangnam", "Class"]
  },
  {
    id: "ska-jubell",
    name: "스카 & 쥬벨",
    role: "Korea",
    excerpt: "원리반, 릴스반, 한곡반을 함께 운영하는 강남 바차타 페어입니다. 기본기 수업과 발표 영상이 어떻게 이어지는지 보기 좋습니다.",
    videoId: "PrKlmz-msFc",
    tags: ["Korea", "Class", "One Song"]
  },
  {
    id: "goni",
    name: "고니",
    role: "Dominican, Korea",
    excerpt: "풋워크 릴스반과 도미니칸 바차타 풋워크 영상으로 확인되는 국내 댄서입니다. 센슈얼만 보던 사람에게 리듬 중심의 입구가 됩니다.",
    videoId: "f7xAkIXFFes",
    tags: ["Korea", "Footwork", "Dominican"]
  }
];

export const draftSignals: DraftSignal[] = [
  {
    id: "d1",
    title: "네이버/다음 카페에서 반복되는 초보자 질문",
    source: "공개 검색 API",
    suggestedFlair: "질문",
    summary: "베이직, 소셜 매너, 첫 수업 준비 질문이 반복됩니다. 입문 가이드 쓰레드로 묶기 좋습니다.",
    confidence: "보통"
  },
  {
    id: "d2",
    title: "해외 페스티벌 예매 전 체크리스트",
    source: "공식 행사 링크",
    suggestedFlair: "해외페스티벌",
    summary: "패스 범위, 숙소, 환불 조건, 장소 이동을 한 번에 정리하는 저장용 글로 발행할 수 있습니다.",
    confidence: "높음"
  }
];
