# Reddit-style community reset

## Product scope

The site exposes one community model: topics contain threads, and threads contain comments. There are no seeded articles, fake reactions, editorial cards, festival directories, dancer directories, or public crawler dashboards.

## Navigation

1. Home feed with popular, recent, and top sorting.
2. Topic directory.
3. Topic feed.
4. Thread composer.
5. Thread detail with votes, comments, share, report, and deletion controls.

## Data rules

- D1 is the only source for public threads, comments, votes, and reports.
- R2 stores user-uploaded media.
- Empty databases render an explicit empty state instead of sample content.
- Guest nicknames use a bachata term and three random digits.
- Guest deletion passwords are entered by the author and hashed server-side.
- Public IP display is masked before storage and rendering.

## Backup

The pre-reset source is preserved in the Git branch `backup/reddit-reset-20260720` and tag `pre-reddit-reset-20260720`. The remote D1 export and legacy static/source folders are stored under the workspace backup directory for 2026-07-20.
