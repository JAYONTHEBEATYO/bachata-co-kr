# bachata.co.kr

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
- `tools/collect-scene-signals.mjs`: validates YouTube embeds and prepares candidate signals
- `tools/audit-sources.mjs`: audits internal links, external source URLs, and YouTube oEmbed health
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
- `tools/verify-build.mjs`: fails the daily workflow if generated pages have missing files, sitemap gaps, mojibake-like text, broken links, or an empty intake queue
- `.github/workflows/content-discovery.yml`: scheduled GitHub Actions workflow
- `data/generated/scene-signals.json`: generated candidate queue for editorial review
- `data/generated/source-health.json`: generated source, link, and video health report
- `data/generated/home-index.json`: generated homepage rail model for the current daily brief
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
