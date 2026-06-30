# bachata.co.kr

Korean bachata web magazine and community hub for `bachata.co.kr`.

## Content Discovery

The site is static, but the repo includes a daily discovery pipeline:

- `data/sources.json`: editor-managed source map
- `data/articles.json`: editor-managed evergreen article library
- `data/board.json`: editor-managed community board seed data
- `tools/collect-scene-signals.mjs`: validates YouTube embeds and prepares candidate signals
- `tools/build-articles.mjs`: builds `/articles/` and `data/generated/article-index.json`
- `tools/build-board.mjs`: builds `/community/` and `data/generated/board-index.json`
- `tools/build-daily-brief.mjs`: turns generated signals into static daily brief pages
- `.github/workflows/content-discovery.yml`: scheduled GitHub Actions workflow
- `data/generated/scene-signals.json`: generated candidate queue for editorial review
- `briefs/`: generated daily brief pages
- `articles/`: generated evergreen article pages
- `community/`: generated community board pages
