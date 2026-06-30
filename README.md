# bachata.co.kr

Korean bachata web magazine and community hub for `bachata.co.kr`.

## Content Discovery

The site is static, but the repo includes a daily discovery pipeline:

- `data/sources.json`: editor-managed source map
- `data/articles.json`: editor-managed evergreen article library
- `data/style-guides.json`: editor-managed bachata style guide library
- `data/profiles.json`: editor-managed dancer, team, venue profile library
- `data/board.json`: editor-managed community board seed data
- `data/events.json`: editor-managed monthly event and visiting artist radar data
- `data/social-radar.json`: editor-managed Instagram, hashtag, and official source watchlist
- `data/programs.json`: editor-managed video-first learning program library
- `data/editorial-desk.json`: editor-managed story queue and publishing series plan
- `data/gear.json`: editor-managed dance shoes and gear comparison data
- `tools/collect-scene-signals.mjs`: validates YouTube embeds and prepares candidate signals
- `tools/build-articles.mjs`: builds `/articles/` and `data/generated/article-index.json`
- `tools/build-style-guides.mjs`: builds `/styles/` and `data/generated/style-index.json`
- `tools/build-profiles.mjs`: builds `/profiles/` and `data/generated/profile-index.json`
- `tools/build-board.mjs`: builds `/community/` and `data/generated/board-index.json`
- `tools/build-events.mjs`: builds `/events/` and `data/generated/event-index.json`
- `tools/build-social-radar.mjs`: builds `/radar/` and `data/generated/social-radar-index.json`
- `tools/build-programs.mjs`: builds `/programs/` and `data/generated/program-index.json`
- `tools/build-editorial-desk.mjs`: builds `/desk/` and `data/generated/editorial-desk-index.json`
- `tools/build-gear.mjs`: builds `/gear/` and `data/generated/gear-index.json`
- `tools/build-daily-brief.mjs`: turns generated signals into static daily brief pages
- `.github/workflows/content-discovery.yml`: scheduled GitHub Actions workflow
- `data/generated/scene-signals.json`: generated candidate queue for editorial review
- `briefs/`: generated daily brief pages
- `articles/`: generated evergreen article pages
- `styles/`: generated style guide pages
- `profiles/`: generated dancer, team, venue profile pages
- `community/`: generated community board pages
- `events/`: generated monthly visiting artist and festival radar pages
- `radar/`: generated Instagram and source watchlist pages
- `programs/`: generated video-first learning path pages
- `desk/`: generated editorial queue and publishing desk pages
- `gear/`: generated dance shoes and gear comparison pages
