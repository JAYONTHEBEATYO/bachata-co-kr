# bachata.co.kr

`bachata.co.kr` is a focused Korean bachata discussion community. The public product is intentionally limited to topic feeds, guest posting, thread details, comments, votes, search, reports, and media uploads.

## Stack

- Next.js App Router
- Cloudflare Workers via OpenNext
- Cloudflare D1 for threads, comments, votes, and reports
- Cloudflare R2 for uploaded images
- Cloudflare Stream for direct video uploads, transcoding, and playback
- GitHub Pages snapshot for `bachata.co.kr`

## Public routes

- `/` community feed
- `/topics` topic directory
- `/c/[slug]` topic feed
- `/write` thread composer
- `/g/[id]` dynamic Worker thread URL with share metadata
- `https://go.bachata-korea.workers.dev/g/[short-id]` compact public share URL
- `/guest?id=[id]` GitHub Pages thread reader
- `/search?q=[query]` thread search

Editorial seed posts are not part of the public application. All visible posts, comments, and vote counts come from D1.

## Commands

```powershell
npm install
npm run dev
npm run verify
npm run verify:cloudflare
npm run cf:deploy
npx wrangler deploy --config wrangler.share.jsonc
```

## Cloudflare

The application Worker configuration is in `wrangler.jsonc`. The small service-binding proxy in `wrangler.share.jsonc` keeps share URLs shorter without duplicating application bindings or secrets. Apply migrations from `migrations/` before deployment and configure the `COMMUNITY_HASH_SALT` Worker secret. The `STREAM` binding must point to an active Cloudflare Stream subscription.

Images are limited to 12 MB. Videos are uploaded directly from the browser to Stream and are limited to 200 MB and five minutes. The API also caps video creation at three per hour, eight per uploader per day, and 120 site-wide per month.

The public app remains usable without an account. Guest authors choose a four-digit deletion password; that password is hashed server-side and is never returned by the API.
