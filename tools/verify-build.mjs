import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);

const requiredFiles = [
  "index.html",
  "sitemap.xml",
  "data/generated/article-index.json",
  "data/generated/style-index.json",
  "data/generated/profile-index.json",
  "data/generated/program-index.json",
  "data/generated/board-index.json",
  "data/generated/social-radar-index.json",
  "data/generated/social-intake-index.json",
  "data/generated/signal-history.json",
  "data/generated/source-health.json",
  "data/generated/home-index.json",
  "data/generated/latest-brief.json"
];

const publicDirs = [
  "articles",
  "styles",
  "profiles",
  "programs",
  "community",
  "submit",
  "events",
  "radar",
  "intake",
  "korea-scene",
  "gear",
  "health",
  "briefs",
  "data/generated"
];

const mojibakePattern = /[\uFFFD\u00C3\u00EC\u00ED\u00EB]|諛|쨌/;

const readText = async (relativePath) => readFile(resolve(root, relativePath), "utf8");
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

const assert = (condition, message, details = {}) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const walkFiles = async (relativeDir) => {
  const start = resolve(root, relativeDir);
  const files = [];

  const visit = async (absoluteDir) => {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = resolve(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else {
        files.push(absolutePath);
      }
    }
  };

  try {
    await visit(start);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return files.map((absolutePath) => absolutePath
    .replace(`${root}\\`, "")
    .replaceAll("\\", "/"));
};

const verifyRequiredFiles = async () => {
  for (const relativePath of requiredFiles) {
    const info = await stat(resolve(root, relativePath));
    assert(info.isFile() && info.size > 0, `Required build artifact is missing or empty: ${relativePath}`);
  }
};

const verifyMojibake = async () => {
  const files = [
    "index.html",
    "sitemap.xml",
    ...(await Promise.all(publicDirs.map(walkFiles))).flat()
  ].filter((file) => [".html", ".json", ".xml"].includes(extname(file)));

  const seen = new Set();
  const offenders = [];
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    const text = await readText(file);
    if (mojibakePattern.test(text)) {
      offenders.push(file);
    }
  }

  assert(offenders.length === 0, "Generated public files contain mojibake-like characters", { offenders });
  return files.length;
};

const verifySourceHealth = async () => {
  const health = await readJson("data/generated/source-health.json");
  const summary = health.summary || {};
  const blockingBroken = (health.results || []).filter((item) => (
    item.status === "broken" && ["internal", "youtube"].includes(item.type)
  ));
  assert(blockingBroken.length === 0, "Source health has broken internal pages or YouTube embeds", {
    summary,
    blockingBroken
  });
  assert((summary.total || 0) > 0, "Source health did not audit any links", summary);
  return {
    ...summary,
    blockingBroken: blockingBroken.length,
    externalBroken: (health.results || []).filter((item) => item.status === "broken" && item.type === "external").length
  };
};

const verifySocialIntake = async () => {
  const intake = await readJson("data/generated/social-intake-index.json");
  const summary = intake.summary || {};
  assert((summary.totalQueue || 0) > 0, "Social intake queue is empty", summary);
  assert((summary.brokenLinks || 0) === 0, "Social intake has broken links", summary);
  assert((summary.videos || 0) > 0, "Social intake has no video candidates", summary);
  assert((intake.queue || []).some((item) => item.novelty), "Social intake queue is missing novelty metadata", summary);
  return summary;
};

const verifySocialRadar = async () => {
  const radar = await readJson("data/generated/social-radar-index.json");
  const html = await readText("radar/index.html");
  const automation = radar.automation || {};
  assert((radar.accountCount || 0) >= 10, "Social radar has too few tracked accounts", {
    accountCount: radar.accountCount
  });
  assert((radar.hashtagCount || 0) >= 5, "Social radar has too few tracked hashtags", {
    hashtagCount: radar.hashtagCount
  });
  assert(automation.graphApi?.status, "Social radar is missing Instagram Graph automation status", automation);
  assert(automation.oembed?.status === "embed-only", "Instagram oEmbed must stay marked as embed-only", automation.oembed);
  return {
    accountCount: radar.accountCount,
    hashtagCount: radar.hashtagCount,
    graphApi: automation.graphApi.status,
    oembed: automation.oembed.status,
    fallback: automation.fallback?.status
  };
};

const verifySignalHistory = async () => {
  const signals = await readJson("data/generated/scene-signals.json");
  const history = await readJson("data/generated/signal-history.json");
  const topicCandidates = (signals.topics || []).flatMap((topic) => topic.candidates || []);
  const missingHistory = topicCandidates.filter((candidate) => !candidate.signalKey || !history.signals?.[candidate.signalKey]);
  assert(topicCandidates.length > 0, "Scene signals have no candidates", signals.historySummary || {});
  assert(missingHistory.length === 0, "Some scene signal candidates are missing history records", {
    missingHistory: missingHistory.slice(0, 10).map((candidate) => candidate.title || candidate.id)
  });
  assert((history.summary?.totalSignals || 0) > 0, "Signal history is empty", history.summary || {});
  return history.summary;
};

const verifyHomeHero = async () => {
  const home = await readText("index.html");
  const homeIndex = await readJson("data/generated/home-index.json");
  const hero = homeIndex.heroVideo || {};
  assert(hero.videoId, "Home index is missing a hero video", homeIndex);
  assert(/^[A-Za-z0-9_-]{11}$/.test(hero.videoId), "Home hero videoId does not look like a YouTube video id", hero);
  assert(home.includes(`youtube-nocookie.com/embed/${hero.videoId}`), "Homepage does not render the generated hero video", hero);
  assert(home.includes("<!-- hero-video:start -->") && home.includes("<!-- hero-video:end -->"), "Homepage hero markers are missing");
  assert(home.includes("<!-- home-channels:start -->") && home.includes("<!-- home-channels:end -->"), "Homepage channel markers are missing");
  assert(home.includes("<!-- editorial-deck:start -->") && home.includes("<!-- editorial-deck:end -->"), "Homepage editorial deck markers are missing");
  const channels = homeIndex.channels || [];
  assert(channels.length >= 6, "Homepage should expose the main content channels", { channels: channels.length });
  const missingChannels = channels.filter((channel) => !channel.url || !home.includes(`href="${channel.url}"`));
  assert(missingChannels.length === 0, "Homepage channel links are not rendered", { missingChannels });
  const deck = homeIndex.editorialDeck || {};
  assert((deck.itemCount || 0) >= 4, "Homepage editorial deck should expose at least four entry points", deck);
  const missingDeckLinks = (deck.items || []).filter((item) => !item.url || !home.includes(`href="${item.url}"`));
  assert(missingDeckLinks.length === 0, "Homepage editorial deck links are not rendered", { missingDeckLinks });
  const iframeCount = (home.match(/<iframe\b/g) || []).length;
  const loaderCount = (home.match(/class="video-loader"/g) || []).length;
  assert(iframeCount === 1, "Homepage should load only the hero iframe before interaction", { iframeCount });
  assert(loaderCount >= 8, "Homepage should render below-fold videos as click-to-load thumbnails", { loaderCount });
  return {
    ...hero,
    channelCount: channels.length,
    editorialDeckItems: deck.itemCount,
    iframeCount,
    loaderCount
  };
};

const verifyStyleVideoLoading = async () => {
  const styleIndex = await readJson("data/generated/style-index.json");
  const styleHome = await readText("styles/index.html");
  const styleHomeIframeCount = (styleHome.match(/<iframe\b/g) || []).length;
  assert(styleHomeIframeCount === 1, "Style index should load only its hero iframe", {
    iframeCount: styleHomeIframeCount
  });

  const pages = [];
  for (const guide of styleIndex.guides || []) {
    const page = guide.url?.replace(/^\//, "");
    if (!page) continue;
    const html = await readText(page);
    const iframeCount = (html.match(/<iframe\b/g) || []).length;
    const loaderCount = (html.match(/class="video-loader"/g) || []).length;
    assert(iframeCount === 1, "Style guide should load only the hero iframe before interaction", {
      guide: guide.id,
      iframeCount
    });
    assert(loaderCount >= 3, "Style guide should render watchlist videos as click-to-load thumbnails", {
      guide: guide.id,
      loaderCount
    });
    assert(html.includes("data-video-button"), "Style guide is missing click-to-load video controls", {
      guide: guide.id
    });
    pages.push({ id: guide.id, iframeCount, loaderCount });
  }

  return {
    pageCount: pages.length,
    loaderCount: pages.reduce((total, page) => total + page.loaderCount, 0)
  };
};

const verifyArticleVideoLoading = async () => {
  const articlesData = await readJson("data/articles.json");
  const pages = [];

  for (const article of articlesData.articles || []) {
    if (!article.heroVideo?.id || !(article.watchlist || []).length) continue;
    const page = `articles/${article.slug}.html`;
    const html = await readText(page);
    const iframeCount = (html.match(/<iframe\b/g) || []).length;
    const loaderCount = (html.match(/class="video-loader"/g) || []).length;
    assert(iframeCount === 1, "Article should load only the hero iframe before interaction", {
      slug: article.slug,
      iframeCount
    });
    assert(loaderCount >= article.watchlist.length, "Article watchlist videos should render as click-to-load thumbnails", {
      slug: article.slug,
      loaderCount,
      watchlist: article.watchlist.length
    });
    assert(html.includes("data-video-button"), "Article is missing click-to-load video controls", {
      slug: article.slug
    });
    pages.push({ slug: article.slug, iframeCount, loaderCount });
  }

  return {
    pageCount: pages.length,
    loaderCount: pages.reduce((total, page) => total + page.loaderCount, 0)
  };
};

const verifyProgramVideoLoading = async () => {
  const programsData = await readJson("data/programs.json");
  const pages = [];

  for (const program of programsData.programs || []) {
    const page = `programs/${program.id}.html`;
    const html = await readText(page);
    const iframeCount = (html.match(/<iframe\b/g) || []).length;
    const loaderCount = (html.match(/class="video-loader"/g) || []).length;
    assert(iframeCount === 1, "Program should load only the hero iframe before interaction", {
      id: program.id,
      iframeCount
    });
    if ((program.watchlist || []).length) {
      assert(loaderCount >= program.watchlist.length, "Program watchlist videos should render as click-to-load thumbnails", {
        id: program.id,
        loaderCount,
        watchlist: program.watchlist.length
      });
      assert(html.includes("data-video-button"), "Program is missing click-to-load video controls", {
        id: program.id
      });
    }
    pages.push({ id: program.id, iframeCount, loaderCount });
  }

  return {
    pageCount: pages.length,
    loaderCount: pages.reduce((total, page) => total + page.loaderCount, 0)
  };
};

const verifyCommunityBoard = async () => {
  const board = await readJson("data/generated/board-index.json");
  const communityHome = await readText("community/index.html");
  const expectedCategories = ["events", "market", "jobs", "venues"];
  const categoryIds = (board.categories || []).map((category) => category.id);
  const missingCategories = expectedCategories.filter((id) => !categoryIds.includes(id));
  assert(missingCategories.length === 0, "Community board is missing required categories", {
    missingCategories,
    categoryIds
  });
  assert((board.entries || []).length >= 8, "Community board has too few starter entries", {
    entries: (board.entries || []).length
  });
  assert((board.categories || []).every((category) => (category.submissionFields || []).length >= 4), "Community categories need submission field guidance", {
    categories: board.categories
  });
  assert((board.entries || []).every((entry) => (entry.requirements || []).length >= 4), "Community entries need posting requirements", {
    missing: (board.entries || []).filter((entry) => !(entry.requirements || []).length)
  });

  for (const category of board.categories || []) {
    const page = category.url?.replace(/^\//, "");
    assert(page, "Community category is missing a URL", category);
    const html = await readText(page);
    assert(communityHome.includes(`href="${category.url}"`), "Community index does not link to category page", category);
    assert(html.includes("등록 전 확인할 것"), "Community category page does not render posting requirements", category);
    const iframeCount = (html.match(/<iframe\b/g) || []).length;
    const loaderCount = (html.match(/class="video-loader"/g) || []).length;
    assert(iframeCount === 0, "Community category pages should not eager-load video iframes", {
      category: category.id,
      iframeCount
    });
    if (category.id === "venues") {
      assert(loaderCount >= 1, "Venues community page should expose video as a click-to-load thumbnail", {
        loaderCount
      });
      assert(html.includes("data-video-button"), "Venues community page is missing click-to-load video controls");
    }
  }

  return {
    categories: board.categories?.length || 0,
    entries: board.entries?.length || 0,
    videoEntries: (board.entries || []).filter((entry) => entry.hasVideo).length
  };
};

const verifyKoreanCopy = async () => {
  const { stdout } = await execFileAsync("node", ["tools/audit-korean-copy.mjs"], {
    cwd: root,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 5
  });
  return JSON.parse(stdout);
};

const verifyIndexesAndSitemap = async () => {
  const sitemap = await readText("sitemap.xml");
  const articleIndex = await readJson("data/generated/article-index.json");
  const styleIndex = await readJson("data/generated/style-index.json");
  const profileIndex = await readJson("data/generated/profile-index.json");
  const programIndex = await readJson("data/generated/program-index.json");

  const pageRefs = [
    ...(articleIndex.articles || []).map((item) => item.url),
    ...(styleIndex.guides || []).map((item) => item.url),
    ...(profileIndex.profiles || []).map((item) => item.url),
    ...(programIndex.programs || []).map((item) => item.url)
  ].filter(Boolean);

  const missing = [];
  for (const pageUrl of pageRefs) {
    const relativePath = pageUrl.replace(/^\//, "");
    try {
      const info = await stat(resolve(root, relativePath));
      if (!info.isFile() || info.size === 0) missing.push(pageUrl);
    } catch {
      missing.push(pageUrl);
    }
  }

  const missingFromSitemap = pageRefs.filter((pageUrl) => !sitemap.includes(pageUrl));

  assert(missing.length === 0, "Generated index points to missing public pages", { missing });
  assert(missingFromSitemap.length === 0, "Generated pages are missing from sitemap", { missingFromSitemap });

  return {
    articles: articleIndex.articles?.length || 0,
    styles: styleIndex.guides?.length || 0,
    profiles: profileIndex.profiles?.length || 0,
    programs: programIndex.programs?.length || 0
  };
};

const main = async () => {
  await verifyRequiredFiles();
  const [sourceHealth, socialIntake, socialRadar, signalHistory, indexCounts, scannedFiles, homeHero, styleVideos, articleVideos, programVideos, communityBoard, koreanCopy] = await Promise.all([
    verifySourceHealth(),
    verifySocialIntake(),
    verifySocialRadar(),
    verifySignalHistory(),
    verifyIndexesAndSitemap(),
    verifyMojibake(),
    verifyHomeHero(),
    verifyStyleVideoLoading(),
    verifyArticleVideoLoading(),
    verifyProgramVideoLoading(),
    verifyCommunityBoard(),
    verifyKoreanCopy()
  ]);

  const report = {
    ok: true,
    scannedFiles,
    indexCounts,
    homeHero,
    sourceHealth,
    socialRadar,
    styleVideos,
    articleVideos,
    programVideos,
    communityBoard,
    koreanCopy,
    signalHistory,
    socialIntake
  };

  console.log(JSON.stringify(report, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }
  process.exitCode = 1;
});
