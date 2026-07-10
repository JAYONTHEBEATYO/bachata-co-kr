# Bachata Korea 배포 런북

## 기본 원칙

- 공개 주소는 `https://bachata.co.kr` 하나로 고정한다.
- Worker 미리보기 주소나 `workers.dev` 주소는 API fallback 용도로만 둔다.
- 공개 HTML에는 운영 문구, 내부 큐, 출처 점검 숫자, 가짜 댓글·가짜 반응을 노출하지 않는다.
- D1 테이블은 API에서 한 번 더 보정하지만, 새 환경을 만들 때는 SQL 파일을 먼저 적용한다.

## 로컬 검증

```powershell
npm run verify
```

검증에 포함되는 항목:

- 공개 카피 감사
- 커뮤니티 공개 HTML 감사
- TypeScript 타입 검사
- Next 빌드

## D1 초기 스키마

새 D1 데이터베이스를 만들거나 깨끗한 환경을 구성할 때만 아래 순서로 적용한다.

```powershell
npx wrangler d1 execute bachata-comments --remote --file cloudflare/d1/threads.sql
npx wrangler d1 execute bachata-comments --remote --file cloudflare/d1/comments.sql
npx wrangler d1 execute bachata-comments --remote --file cloudflare/d1/votes.sql
npx wrangler d1 execute bachata-comments --remote --file cloudflare/d1/awards.sql
```

이미 운영 중인 DB에는 API의 `ensureCommunityTables` 보정이 먼저 작동한다. 운영 DB에 직접 SQL을 반복 적용할 때는 중복 컬럼 오류가 날 수 있으므로, 적용 전에 현재 테이블 구조를 확인한다.

## Cloudflare Workers 배포

```powershell
npm run cf:deploy
```

배포 후 확인:

```powershell
curl.exe -I https://bachata.co.kr/
curl.exe -I https://bachata.co.kr/write/
curl.exe -I https://bachata-co-kr.bachata-korea.workers.dev/
```

## GitHub Pages 스냅샷

GitHub Pages 쪽 정적 fallback을 유지해야 할 때만 사용한다.

```powershell
node scripts/snapshot-worker-for-pages.mjs
node scripts/write-legacy-redirects.mjs
```

그 다음 변경분을 커밋하고 `main`에 push하면 Pages가 갱신된다.

## Google 로그인 설정

Supabase Auth의 Google provider를 사용한다.

필요한 공개 env:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://{project-ref}.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="{anon-key}"
```

Supabase Dashboard에서 Google provider를 켜고, Google Cloud OAuth 클라이언트에는 아래 redirect URL을 등록한다.

```text
https://{project-ref}.supabase.co/auth/v1/callback
```

Supabase Auth URL Configuration에는 아래 주소를 허용한다.

```text
Site URL: https://bachata.co.kr
Redirect URLs:
https://bachata.co.kr/auth/callback
https://www.bachata.co.kr/auth/callback
https://bachata-co-kr.bachata-korea.workers.dev/auth/callback
http://localhost:3000/auth/callback
http://localhost:3333/auth/callback
```

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 클라이언트 번들에 들어가는 공개 키다. 값이 바뀌면 `npm run cf:deploy` 후 `node scripts/snapshot-worker-for-pages.mjs`를 다시 실행해야 한다.

## 라이브 점검 체크리스트

- 홈 접속 200
- 글쓰기 페이지 200
- 비회원 글쓰기에서 제목 placeholder가 비어 있음
- 비회원 비밀번호는 자동 입력되지 않음
- 댓글 입력창은 접기 상태에서 시작하고, 터치하면 에디터가 열림
- 댓글 등록 버튼이 모바일에서도 보임
- 글 카드와 상세에 추천·비추천 버튼이 보임
- 공유 주소가 `bachata.co.kr`로 생성됨
- 글 전용 공유 페이지 `/g/{id}`에 `og:title`, `og:description`, `og:image`가 들어감
- `/login`에서 Google 버튼이 Supabase OAuth로 이동함
- `/auth/callback`에서 세션 교환 후 `/profile`로 이동함
- 공개 HTML에 가짜 댓글 수, 가짜 좋아요, `Hot/New/Top/Rising`, 내부 운영 문구가 없음
