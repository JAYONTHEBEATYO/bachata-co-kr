export const referenceSources = [
  {
    id: "coinness-live-feed",
    outlet: "Coinness",
    url: "https://coinness.com/",
    section: "live-feed",
    fallbackTitle: "빠르게 반복 방문하는 뉴스 피드",
    fallbackObservation: {
      headlineShape: "짧은 사실형 제목과 즉시 이해되는 메타 정보",
      ledeStrategy: "첫 문장에서 사건·주체·수치를 바로 제시",
      paragraphCadence: "한 카드에 한 이슈, 2-4문장 중심",
      sentenceRhythm: "짧고 건조하지만 목록 이동이 빠른 리듬",
      vocabularyNotes: "과장보다 정확성, 카테고리와 시간 정보 우선",
      layoutNotes: "좌측 피드, 반복 카드, 광고/커뮤니티 진입점 분리",
      ctaPattern: "더보기와 상세 링크를 작게 배치"
    }
  },
  {
    id: "gq-korea-feature",
    outlet: "GQ Korea",
    url: "https://www.gqkorea.co.kr/",
    section: "feature",
    fallbackTitle: "인물과 취향을 전면에 세우는 매거진",
    fallbackObservation: {
      headlineShape: "인물명 또는 사물명을 앞에 두고 한 문장 훅을 붙임",
      ledeStrategy: "장면, 인용, 감각어로 독자가 머릿속에 이미지를 만들게 함",
      paragraphCadence: "짧은 문단과 긴 문단을 교차해 리듬을 만듦",
      sentenceRhythm: "단정한 문장 안에 취향의 어휘를 섞음",
      vocabularyNotes: "세련됨, 태도, 장면, 취향, 지금성",
      layoutNotes: "큰 이미지와 굵은 제목, 카테고리 명확화",
      ctaPattern: "관련 기사와 인물 흐름으로 자연스럽게 이동"
    }
  },
  {
    id: "longblack-note",
    outlet: "LongBlack",
    url: "https://longblack.co/",
    section: "longform-note",
    fallbackTitle: "하루 한 편 읽는 깊은 노트",
    fallbackObservation: {
      headlineShape: "인물·브랜드·질문을 결합해 지적 호기심을 만듦",
      ledeStrategy: "왜 지금 읽어야 하는지 먼저 열고, 맥락을 순서대로 쌓음",
      paragraphCadence: "소제목을 촘촘히 두고 3-6문장 단위로 호흡 조절",
      sentenceRhythm: "친절하지만 가볍지 않은 설명형",
      vocabularyNotes: "루틴, 해상도, 관점, 맥락, 사례",
      layoutNotes: "노트형 목차와 추천 흐름",
      ctaPattern: "다음 노트, 관련 관심사, 읽기 루틴으로 연결"
    }
  },
  {
    id: "eyesmag-news",
    outlet: "eyesmag",
    url: "https://www.eyesmag.com/",
    section: "fashion-lifestyle-news",
    fallbackTitle: "실시간 패션·라이프스타일 뉴스",
    fallbackObservation: {
      headlineShape: "브랜드·인물·아이템을 전면에 세우는 짧은 제목",
      ledeStrategy: "무엇이 새로 나왔는지, 왜 화제인지 빠르게 요약",
      paragraphCadence: "뉴스 55%, 리포트 15%, 인터뷰 10%처럼 가벼운 피드와 깊은 기사를 분리",
      sentenceRhythm: "속도감 있는 현재형 문장",
      vocabularyNotes: "드롭, 공개, 협업, 컬렉션, 라이프스타일",
      layoutNotes: "이미지 중심 카드와 카테고리 필터",
      ctaPattern: "원문/상세 보기, 관련 키워드 이동"
    }
  },
  {
    id: "the-edit-review",
    outlet: "The Edit",
    url: "https://the-edit.co.kr/",
    section: "review",
    fallbackTitle: "사는 재미를 말하는 리뷰형 매거진",
    fallbackObservation: {
      headlineShape: "질문형 또는 생활감 있는 문장으로 클릭 이유를 만듦",
      ledeStrategy: "개인 경험을 앞에 두고 정보로 확장",
      paragraphCadence: "대화체와 설명체를 섞되 정보 밀도는 유지",
      sentenceRhythm: "친근하지만 문장 끝을 정리하는 리듬",
      vocabularyNotes: "직접 써봄, 충분함, 취향, 생활감, 가격감",
      layoutNotes: "리뷰 카드, 카테고리, 추천 리스트",
      ctaPattern: "제품/장소/관련 글로 이어지는 자연스러운 링크"
    }
  },
  {
    id: "yozm-it-structure",
    outlet: "요즘IT",
    url: "https://yozm.wishket.com/magazine/",
    section: "analysis",
    fallbackTitle: "질문을 구조화해 답하는 실무형 매거진",
    fallbackObservation: {
      headlineShape: "문제 상황과 배운 점을 제목에 같이 둠",
      ledeStrategy: "독자가 겪는 문제를 먼저 말하고 해결 흐름을 제시",
      paragraphCadence: "소제목, 리스트, 사례, 정리 순서가 명확",
      sentenceRhythm: "실무자의 말투에 가까운 설명형",
      vocabularyNotes: "전략, 실험, 파이프라인, 단계, 체크리스트",
      layoutNotes: "긴 글도 목차와 이미지 캡션으로 길을 잃지 않게 함",
      ctaPattern: "관련 실무 글과 다음 학습으로 연결"
    }
  },
  {
    id: "design-plus-archive",
    outlet: "Design+",
    url: "https://design.co.kr/article/",
    section: "design-archive",
    fallbackTitle: "시대의 디자인 이슈를 아카이빙하는 기사 구조",
    fallbackObservation: {
      headlineShape: "프로젝트·장소·사물을 제목 첫머리에 둠",
      ledeStrategy: "대상이 가진 의미와 지금성을 먼저 설명",
      paragraphCadence: "자료성 문단과 비평 문단을 교차",
      sentenceRhythm: "차분하고 밀도 있는 전문 매거진 톤",
      vocabularyNotes: "아카이브, 문법, 시선, 프로젝트, 맥락",
      layoutNotes: "카테고리와 날짜가 선명한 기사 인덱스",
      ctaPattern: "동일 카테고리 기사와 전시/프로젝트 링크"
    }
  }
];
