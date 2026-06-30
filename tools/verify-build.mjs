import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "index.html",
  "sitemap.xml",
  "data/generated/article-index.json",
  "data/generated/style-index.json",
  "data/generated/profile-index.json",
  "data/generated/program-index.json",
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
  const iframeCount = (home.match(/<iframe\b/g) || []).length;
  const loaderCount = (home.match(/class="video-loader"/g) || []).length;
  assert(iframeCount === 1, "Homepage should load only the hero iframe before interaction", { iframeCount });
  assert(loaderCount >= 8, "Homepage should render below-fold videos as click-to-load thumbnails", { loaderCount });
  return {
    ...hero,
    iframeCount,
    loaderCount
  };
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
  const [sourceHealth, socialIntake, signalHistory, indexCounts, scannedFiles, homeHero] = await Promise.all([
    verifySourceHealth(),
    verifySocialIntake(),
    verifySignalHistory(),
    verifyIndexesAndSitemap(),
    verifyMojibake(),
    verifyHomeHero()
  ]);

  const report = {
    ok: true,
    scannedFiles,
    indexCounts,
    homeHero,
    sourceHealth,
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
