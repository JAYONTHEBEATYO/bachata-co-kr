import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "index.html");
const dataPath = resolve(root, "data/home-rail.json");
const programsPath = resolve(root, "data/generated/program-index.json");
const articlesPath = resolve(root, "data/generated/article-index.json");
const eventsPath = resolve(root, "data/generated/event-index.json");
const latestBriefPath = resolve(root, "data/generated/latest-brief.json");
const sourceHealthPath = resolve(root, "data/generated/source-health.json");
const outputPath = resolve(root, "data/generated/home-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const findProgram = (programs, id) => programs.find((item) => item.id === id);
const findArticle = (articles, slug) => articles.find((item) => item.slug === slug || item.url?.endsWith(`/${slug}.html`));
const youtubeThumb = (videoId) => videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "";

const nextEvent = (events, today) => {
  const upcoming = events
    .filter((event) => event.startDate && event.startDate >= today && event.status !== "archive")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] || events.find((event) => event.status !== "archive") || events[0];
};

const resolveCard = (card, context) => {
  if (card.kind === "program") {
    const program = findProgram(context.programs, card.id);
    return {
      ...card,
      title: card.title || program?.title,
      href: program?.url || "/programs/",
      videoId: card.videoId || program?.videoId || null
    };
  }

  if (card.kind === "article") {
    const article = findArticle(context.articles, card.slug);
    return {
      ...card,
      title: card.title || article?.title,
      href: article?.url || "/articles/",
      videoId: card.videoId || article?.heroVideo?.id || article?.heroVideo || null
    };
  }

  if (card.kind === "next-event") {
    const event = nextEvent(context.events, context.today);
    return {
      ...card,
      title: card.title || event?.title || "이번 달 한국 바차타",
      href: event?.url || "/events/",
      videoId: card.videoId || event?.videoId || null,
      meta: event?.startDate ? `${event.startDate} · ${event.city || "Korea"}` : card.meta
    };
  }

  if (card.kind === "brief") {
    return {
      ...card,
      href: context.latestBrief.url || "/briefs/",
      meta: `${context.latestBrief.candidateCount || 0} signals`
    };
  }

  return { ...card, href: card.href || "/" };
};

const renderCard = (card) => `<a class="rail-card${card.featured ? " featured" : ""}" href="${escapeHtml(card.href)}">
            ${card.videoId ? `<figure class="rail-thumb">
              <img loading="lazy" src="${escapeHtml(youtubeThumb(card.videoId))}" alt="" aria-hidden="true">
              <span>Watch</span>
            </figure>` : ""}
            <div class="rail-card-copy">
              <span>${escapeHtml(card.label)}</span>
              <strong>${escapeHtml(card.title)}</strong>
              <p>${escapeHtml(card.description)}</p>
            </div>
            <em>${escapeHtml(card.meta)}</em>
          </a>`;

const renderShelf = (config, cards, latestBrief, sourceHealth) => {
  const broken = sourceHealth?.summary?.broken || 0;
  const healthText = sourceHealth?.summary ? (broken ? `출처 ${broken}개 검수 중` : "출처 점검 완료") : "출처 확인 중";
  const briefText = latestBrief?.candidateCount ? `오늘 후보 ${latestBrief.candidateCount}개` : "오늘 브리프";
  return `<!-- home-rail:start -->
      <section class="home-shelf" aria-labelledby="watch-next-title">
        <div class="shelf-head">
          <div>
            <p class="eyebrow">${escapeHtml(config.eyebrow)}</p>
            <h2 id="watch-next-title">${escapeHtml(config.title)}</h2>
          </div>
          <p>${escapeHtml(config.intro)} <a href="${escapeHtml(latestBrief.url || "/briefs/")}">${escapeHtml(briefText)}</a> · <a href="/health/">${escapeHtml(healthText)}</a></p>
        </div>
        <div class="content-rail">
          ${cards.map(renderCard).join("\n          ")}
        </div>
      </section>
      <!-- home-rail:end -->`;
};

const main = async () => {
  const [config, programIndex, articleIndex, eventIndex, latestBrief, sourceHealth] = await Promise.all([
    readJson(dataPath),
    readJson(programsPath),
    readJson(articlesPath),
    readJson(eventsPath),
    readJson(latestBriefPath),
    readJson(sourceHealthPath)
  ]);

  const today = latestBrief.generationDate || new Date().toISOString().slice(0, 10);
  const context = {
    programs: programIndex.programs || [],
    articles: articleIndex.articles || [],
    events: eventIndex.events || [],
    latestBrief,
    sourceHealth,
    today
  };
  const cards = config.cards.map((card) => resolveCard(card, context));
  const shelf = renderShelf(config, cards, latestBrief, sourceHealth);
  const html = await readFile(indexPath, "utf8");
  const nextHtml = html.replace(/<!-- home-rail:start -->[\s\S]*?<!-- home-rail:end -->/, shelf);
  if (nextHtml === html && !html.includes("<!-- home-rail:start -->")) {
    throw new Error("home rail markers not found in index.html");
  }

  await writeFile(indexPath, nextHtml, "utf8");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: config.updatedAt,
    latestBrief: {
      url: latestBrief.url,
      candidateCount: latestBrief.candidateCount,
      generationDate: latestBrief.generationDate
    },
    sourceHealth: sourceHealth.summary,
    cards: cards.map((card) => ({
      label: card.label,
      title: card.title,
      url: card.href,
      meta: card.meta,
      videoId: card.videoId || null,
      featured: Boolean(card.featured)
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${indexPath}`);
  console.log(`Wrote ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
