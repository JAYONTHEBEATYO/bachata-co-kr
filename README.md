# bachata.co.kr

Korean bachata web magazine and community hub for `bachata.co.kr`.

## Content Discovery

The site is static, but the repo includes a daily discovery pipeline:

- `data/sources.json`: editor-managed source map
- `tools/collect-scene-signals.mjs`: validates YouTube embeds and prepares candidate signals
- `.github/workflows/content-discovery.yml`: scheduled GitHub Actions workflow
- `data/generated/scene-signals.json`: generated candidate queue for editorial review
