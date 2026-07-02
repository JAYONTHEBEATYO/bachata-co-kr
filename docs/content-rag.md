# Bachata Korea Content RAG

이 저장소의 RAG 초기 구조는 외부 서비스보다 원천 데이터와 운영 기록을 먼저 안정화하는 방식입니다. 기사, 스타일 가이드, 댄서 프로필, 행사, 장비, 커뮤니티 데이터와 운영 메모를 한곳에 모아 검색 가능한 지식 인덱스를 만듭니다.

## 파일

- `data/knowledge-notes.json`: 사이트 운영자 피드백, 글쓰기 원칙, 향후 콘텐츠 메모를 저장합니다.
- `tools/build-knowledge-base.mjs`: 사이트 데이터와 운영 메모를 읽어 `data/generated/knowledge-index.json`을 생성합니다.
- `tools/search-knowledge.mjs`: 생성된 인덱스에서 관련 문서와 청크를 빠르게 찾습니다.

## 사용

```powershell
node tools/build-knowledge-base.mjs
node tools/search-knowledge.mjs "센슈얼 펀더멘털 한국어 문장"
node tools/search-knowledge.mjs "국내 바차타 행사"
```

## 운영 원칙

- 공개 문장에는 내부 작업 용어를 쓰지 않습니다.
- 외부 글과 캡션은 그대로 복사하지 않고, 출처 링크와 함께 한국 독자에게 필요한 맥락으로 다시 씁니다.
- 새로 받은 제보나 수정 지시는 `data/knowledge-notes.json`에 먼저 남기고 인덱스를 다시 생성합니다.
- 나중에 벡터DB나 검색 API를 붙이더라도 `data/generated/knowledge-index.json`을 기준 데이터로 삼습니다.
