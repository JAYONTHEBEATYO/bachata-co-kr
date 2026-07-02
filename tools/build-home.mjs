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
const sceneSignalsPath = resolve(root, "data/generated/scene-signals.json");
const outputPath = resolve(root, "data/generated/home-index.json");

const koreaDate = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(date);

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const findProgram = (programs, id) => programs.find((item) => item.id === id);
const findArticle = (articles, slug) => articles.find((item) => item.slug === slug || item.url?.endsWith(`/${slug}.html`));
const youtubeThumb = (videoId) => videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "";
const videoEmbedUrl = (videoId) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;

const shorten = (value = "", max = 76) => {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

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
      meta: `${context.latestBrief.candidateCount || 0}개 소식`
    };
  }

  return { ...card, href: card.href || "/" };
};

const renderCard = (card) => `<a class="rail-card${card.featured ? " featured" : ""}" href="${escapeHtml(card.href)}">
            ${card.videoId ? `<figure class="rail-thumb">
              <img loading="lazy" src="${escapeHtml(youtubeThumb(card.videoId))}" alt="" aria-hidden="true">
              <span>영상</span>
            </figure>` : ""}
            <div class="rail-card-copy">
              <span>${escapeHtml(card.label)}</span>
              <strong>${escapeHtml(card.title)}</strong>
              <p>${escapeHtml(card.description)}</p>
            </div>
            <em>${escapeHtml(card.meta)}</em>
          </a>`;

const renderChannel = (channel) => `<a class="channel-link" href="${escapeHtml(channel.href)}">
          <span>${escapeHtml(channel.label)}</span>
          <strong>${escapeHtml(channel.title)}</strong>
          <p>${escapeHtml(channel.description)}</p>
          <em>${escapeHtml(channel.metric)}</em>
        </a>`;

const renderChannels = (config) => `<!-- home-channels:start -->
      <section class="channel-strip" aria-label="빠른 이동">
        <div class="channel-row">
          ${(config.channels || []).map(renderChannel).join("\n          ")}
        </div>
      </section>
      <!-- home-channels:end -->`;

const renderDeckItem = (item) => `<a class="deck-card" href="${escapeHtml(item.href)}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.description)}</p>
          <em>${escapeHtml(item.meta)}</em>
        </a>`;

const renderEditorialDeck = (config) => {
  const deck = config.editorialDeck;
  if (!deck?.items?.length) {
    return "";
  }

  return `<!-- editorial-deck:start -->
      <section class="editorial-deck" aria-labelledby="editorial-deck-title">
        <div class="deck-inner">
          <div class="deck-head">
            <p class="eyebrow">${escapeHtml(deck.eyebrow)}</p>
            <h2 id="editorial-deck-title">${escapeHtml(deck.title)}</h2>
            <p>${escapeHtml(deck.intro)}</p>
          </div>
          <div class="deck-grid">
            ${deck.items.map(renderDeckItem).join("\n            ")}
          </div>
        </div>
      </section>
      <!-- editorial-deck:end -->`;
};

const selectHeroVideo = (sceneSignals) => {
  const topicPriority = new Map([
    ["korea-scene", 18],
    ["bachata-influence", 14],
    ["bachazouk", 10],
    ["global-dancers", 8],
    ["gear-market", 2]
  ]);

  const candidates = (sceneSignals?.topics || [])
    .filter((topic) => topic.id !== "editorial-desk")
    .flatMap((topic) => (topic.candidates || [])
      .map((candidate) => {
        const videoId = candidate.videoId || candidate.id;
        return {
          id: videoId,
          title: candidate.title || "Bachata video",
          sourceUrl: candidate.sourceUrl || `https://www.youtube.com/watch?v=${videoId}`,
          topicId: topic.id,
          topicLabel: topic.label,
          score: (candidate.score || 0) + (topicPriority.get(topic.id) || 0),
          hasEmbed: Boolean(candidate.embedUrl && /^[A-Za-z0-9_-]{11}$/.test(videoId || ""))
        };
      })
      .filter((candidate) => candidate.hasEmbed))
    .sort((a, b) => b.score - a.score);

  return candidates[0] || {
    id: "sUy5L7x5pyE",
    title: "Bachata Influence Tutorial | Melvin & Gatica",
    sourceUrl: "https://www.youtube.com/watch?v=sUy5L7x5pyE",
    topicId: "bachata-influence",
    topicLabel: "Bachata Influence",
    score: 0
  };
};

const renderHeroVideo = (heroVideo) => `<!-- hero-video:start -->
          <div class="hero-media">
            <div class="hero-media-frame">
              <iframe loading="eager" src="${escapeHtml(videoEmbedUrl(heroVideo.id))}" title="${escapeHtml(heroVideo.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div class="hero-media-caption">
              <span>추천 영상 · ${escapeHtml(heroVideo.topicLabel)}</span>
              <a href="${escapeHtml(heroVideo.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(shorten(heroVideo.title))}</a>
            </div>
          </div>
          <!-- hero-video:end -->`;

const renderShelf = (config, cards, latestBrief, sourceHealth = {}) => {
  const briefUrl = latestBrief.url || "/briefs/";
  const summary = sourceHealth.summary || sourceHealth || {};
  return `<!-- home-rail:start -->
      <section class="home-shelf" aria-labelledby="watch-next-title">
        <div class="shelf-layout">
          <div class="feed-column">
            <div class="shelf-head">
              <div>
                <p class="eyebrow">${escapeHtml(config.eyebrow)}</p>
                <h2 id="watch-next-title">${escapeHtml(config.title)}</h2>
              </div>
              <p>${escapeHtml(config.intro)} <a href="${escapeHtml(briefUrl)}">오늘 업데이트</a> · <a href="/events/">행사 일정</a></p>
            </div>
            <div class="content-rail">
              ${cards.map(renderCard).join("\n              ")}
            </div>
          </div>
          <aside class="home-sidebar" aria-label="바차타 소식 제보와 추천 읽을거리">
            <a class="ad-slot" href="/submit/">
              <span>소식 보내기</span>
              <strong>바차타 행사·클래스·팀 소식을 보내주세요</strong>
              <em>제보는 일정, 최신소식, 매거진 기사로 자연스럽게 녹여 반영합니다.</em>
            </a>
            <div class="side-box">
              <span>오늘의 바차타</span>
              <strong>${escapeHtml(latestBrief.headline || `${latestBrief.candidateCount || 0}개 소식에서 고른 읽을거리`)}</strong>
              <p>${escapeHtml(latestBrief.dek || "공개 영상, 행사 페이지, 공식 링크를 바탕으로 읽을 만한 이야기를 추립니다.")}</p>
            </div>
          </aside>
        </div>
      </section>
      <!-- home-rail:end -->`;
};

const main = async () => {
  const [config, programIndex, articleIndex, eventIndex, latestBrief, sourceHealth, sceneSignals] = await Promise.all([
    readJson(dataPath),
    readJson(programsPath),
    readJson(articlesPath),
    readJson(eventsPath),
    readJson(latestBriefPath),
    readJson(sourceHealthPath),
    readJson(sceneSignalsPath)
  ]);

  const today = latestBrief.generationDate || koreaDate();
  const context = {
    programs: programIndex.programs || [],
    articles: articleIndex.articles || [],
    events: eventIndex.events || [],
    latestBrief,
    sourceHealth,
    today
  };
  const cards = config.cards.map((card) => resolveCard(card, context));
  const heroVideo = selectHeroVideo(sceneSignals);
  const channels = renderChannels(config);
  const shelf = renderShelf(config, cards, latestBrief, sourceHealth);
  const editorialDeck = renderEditorialDeck(config);
  const html = await readFile(indexPath, "utf8");
  const withHero = html.replace(/<!-- hero-video:start -->[\s\S]*?<!-- hero-video:end -->/, renderHeroVideo(heroVideo));
  if (withHero === html && !html.includes("<!-- hero-video:start -->")) {
    throw new Error("hero video markers not found in index.html");
  }

  const withChannels = withHero.includes("<!-- home-channels:start -->")
    ? withHero.replace(/<!-- home-channels:start -->[\s\S]*?<!-- home-channels:end -->/, channels)
    : withHero.replace(/(<section class="hero"[\s\S]*?<\/section>)\s*(<!-- home-rail:start -->)/, `$1\n\n      ${channels}\n\n      $2`);
  if (withChannels === withHero && !withHero.includes("<!-- home-channels:start -->")) {
    throw new Error("home channel insertion point not found in index.html");
  }

  const nextHtml = withChannels.replace(/<!-- home-rail:start -->[\s\S]*?<!-- home-rail:end -->/, shelf);
  if (nextHtml === withChannels && !withChannels.includes("<!-- home-rail:start -->")) {
    throw new Error("home rail markers not found in index.html");
  }

  const withEditorialDeck = nextHtml.includes("<!-- editorial-deck:start -->")
    ? nextHtml.replace(/<!-- editorial-deck:start -->[\s\S]*?<!-- editorial-deck:end -->/, editorialDeck)
    : nextHtml.replace(/(<!-- home-rail:end -->)/, `$1\n\n      ${editorialDeck}`);
  if (editorialDeck && withEditorialDeck === nextHtml && !nextHtml.includes("<!-- editorial-deck:start -->")) {
    throw new Error("editorial deck insertion point not found in index.html");
  }

  await writeFile(indexPath, withEditorialDeck, "utf8");
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
    heroVideo: {
      title: heroVideo.title,
      topic: heroVideo.topicLabel,
      sourceUrl: heroVideo.sourceUrl,
      videoId: heroVideo.id,
      score: heroVideo.score
    },
    channels: (config.channels || []).map((channel) => ({
      label: channel.label,
      title: channel.title,
      url: channel.href,
      metric: channel.metric
    })),
    editorialDeck: config.editorialDeck ? {
      title: config.editorialDeck.title,
      itemCount: config.editorialDeck.items?.length || 0,
      items: (config.editorialDeck.items || []).map((item) => ({
        label: item.label,
        title: item.title,
        url: item.href,
        meta: item.meta
      }))
    } : null,
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
