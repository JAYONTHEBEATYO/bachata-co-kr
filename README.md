# bachata.co.kr

## Current App Direction

`bachata.co.kr` is now moving from a static magazine build to a Reddit-style bachata community app.

- Runtime: Next.js App Router on Cloudflare Workers via OpenNext
- Data layer: Supabase schema in `supabase/migrations/0001_reddit_community_schema.sql`
- Fallback data: local seed data in `lib/seed.ts`
- Main UX: Hot/New/Top/Rising thread feed, playable YouTube embeds, comments, score rail, events, dancer cards, mobile bottom navigation
- Public copy rule: reader-facing pages must not expose internal workflow terms or crawler-style language

Local commands:

```powershell
npm install
npm run dev
npm run verify
npm run verify:cloudflare
```

Cloudflare commands:

```powershell
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Cloudflare deployment files:

- `open-next.config.ts`: OpenNext Cloudflare adapter config
- `wrangler.jsonc`: Worker name, compatibility flags, static assets, public variables
- `.dev.vars.example`: local secret template for Supabase keys

Supabase setup:

```powershell
# Apply the migration in Supabase SQL editor or Supabase CLI.
# Then run supabase/seed.sql for initial communities and threads.
```

Required deployment variables when Supabase is enabled:

```text
NEXT_PUBLIC_SITE_URL=https://bachata.co.kr
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Set these in Cloudflare Workers dashboard as variables/secrets before enabling live community writes. The app works without them by using `lib/seed.ts` fallback data.

Korean bachata web magazine and community hub for `bachata.co.kr`.

## Content Discovery

The site is static, but the repo includes a daily discovery pipeline:

- `data/sources.json`: editor-managed source map
- `data/articles.json`: editor-managed evergreen article library
- `data/style-guides.json`: editor-managed bachata style guide library
- `data/profiles.json`: editor-managed dancer, team, venue profile library
- `data/board.json`: editor-managed community board seed data
- `data/submissions.json`: editor-managed submission templates for events, market, jobs, venues, and profiles
- `data/events.json`: editor-managed monthly event and visiting artist radar data
- `data/social-radar.json`: editor-managed Instagram, hashtag, and official source watchlist
- `data/social-intake.json`: editor-managed rules for turning social/search signals into publishable queues
- `data/korea-scene.json`: editor-managed Korea scene hub lenses for teams, venues, events, and community
- `data/programs.json`: editor-managed video-first learning program library
- `data/editorial-desk.json`: editor-managed story queue and publishing series plan
- `data/gear.json`: editor-managed dance shoes and gear comparison data
- `data/home-rail.json`: editor-managed homepage watch-next rail slots
- `data/knowledge-notes.json`: editor-managed writing rules, owner feedback, and future article notes
- `tools/collect-scene-signals.mjs`: validates YouTube embeds, prepares candidate signals, and updates signal history
- `tools/audit-sources.mjs`: audits internal links, external source URLs, and YouTube oEmbed health
- `tools/audit-visible-copy.mjs`: audits visible page text so internal workflow terms do not leak into public pages
- `tools/build-home.mjs`: builds the homepage watch-next rail and `data/generated/home-index.json`
- `tools/build-articles.mjs`: builds `/articles/` and `data/generated/article-index.json`
- `tools/build-style-guides.mjs`: builds `/styles/` and `data/generated/style-index.json`
- `tools/build-profiles.mjs`: builds `/profiles/` and `data/generated/profile-index.json`
- `tools/build-board.mjs`: builds `/community/` and `data/generated/board-index.json`
- `tools/build-submissions.mjs`: builds `/submit/` and `data/generated/submission-index.json`
- `tools/build-events.mjs`: builds `/events/` and `data/generated/event-index.json`
- `tools/build-social-radar.mjs`: builds `/radar/` and `data/generated/social-radar-index.json`
- `tools/build-social-intake.mjs`: builds `/intake/` and `data/generated/social-intake-index.json`
- `tools/build-korea-scene.mjs`: builds `/korea-scene/` and `data/generated/korea-scene-index.json`
- `tools/build-programs.mjs`: builds `/programs/` and `data/generated/program-index.json`
- `tools/build-editorial-desk.mjs`: builds `/desk/` and `data/generated/editorial-desk-index.json`
- `tools/build-gear.mjs`: builds `/gear/` and `data/generated/gear-index.json`
- `tools/build-daily-brief.mjs`: turns generated signals into static daily brief pages
- `tools/build-knowledge-base.mjs`: builds the local retrieval index at `data/generated/knowledge-index.json`
- `tools/search-knowledge.mjs`: searches the generated knowledge index for editing and article drafting
- `tools/serve-static.mjs`: serves the static site locally for visual QA
- `tools/verify-build.mjs`: fails the daily workflow if generated pages have missing files, sitemap gaps, mojibake-like text, broken internal links, broken YouTube embeds, or an empty intake queue
- `.github/workflows/content-discovery.yml`: scheduled GitHub Actions workflow
- `data/generated/scene-signals.json`: generated candidate queue for editorial review
- `data/generated/signal-history.json`: generated memory of seen signals, novelty state, first-seen dates, and recurring counts
- `data/generated/source-health.json`: generated source, link, and video health report
- `data/generated/home-index.json`: generated homepage rail model for the current daily brief
- `data/generated/knowledge-index.json`: generated retrieval index for site content, writing rules, and future RAG/API use
- `data/generated/social-intake-index.json`: generated publish queue from social, search, and editorial signals
- `data/generated/korea-scene-index.json`: generated Korea scene map from profiles, events, board, and intake signals
- `briefs/`: generated daily brief pages
- `articles/`: generated evergreen article pages
- `styles/`: generated style guide pages
- `profiles/`: generated dancer, team, venue profile pages
- `community/`: generated community board pages
- `submit/`: generated submission center and message builder page
- `events/`: generated monthly visiting artist and festival radar pages
- `radar/`: generated Instagram and source watchlist pages
- `intake/`: generated social signal to publishing queue pages
- `korea-scene/`: generated Korea bachata scene map pages
- `programs/`: generated video-first learning path pages
- `desk/`: generated editorial queue and publishing desk pages
- `gear/`: generated dance shoes and gear comparison pages
- `health/`: generated public source health dashboard
- `docs/content-rag.md`: current content RAG and archive workflow notes

## Daily Automation Settings

The scheduled workflow runs every day at `05:10` Korea time. It works without secrets by using editor-managed seeds, YouTube oEmbed validation, and the internal watchlist. Add the following repository settings when official APIs are ready:

- `YOUTUBE_API_KEY`: enables fresh YouTube search candidates for each topic.
- `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET`: enables fresh Naver blog/news search candidates.
- `INSTAGRAM_GRAPH_TOKEN`: enables the sanctioned Instagram Graph API path.
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`: required with `INSTAGRAM_GRAPH_TOKEN` for hashtag recent media collection.
- `INSTAGRAM_GRAPH_API_VERSION`: optional repository variable, defaults to `v21.0`.
- `INSTAGRAM_HASHTAG_LIMIT`: optional repository variable, defaults to `8` and is capped at `30` to respect Instagram hashtag search limits.

Instagram collection is intentionally not a public scraper. When Graph credentials are missing, the site still publishes a daily brief from official links, YouTube, Naver, and the editor watchlist. When Graph credentials are present, recent hashtag media is added to `data/generated/scene-signals.json` as `instagram-hashtag-media` and routed into `/intake/` for editorial review.

The daily collector also writes `data/generated/signal-history.json`. Each candidate receives a stable `signalKey`, `firstSeenAt`, `seenCount`, `novelty`, `publishFormat`, `targetUrl`, and `evidenceLevel`. This lets the brief distinguish a first-time signal from a recurring theme, so event news, Korean scene updates, style education, and gear notes can be prioritized without exposing internal scoring language on public pages.
