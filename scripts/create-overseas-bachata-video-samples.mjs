import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import overseasBachataVideoSamples from "../lib/overseas-bachata-video-samples.json" with { type: "json" };

const endpoint = (process.env.EDITORIAL_AUTOMATION_URL || "https://bachata.co.kr/api/admin/automation").trim();
const token = (process.env.ADMIN_AUTOMATION_TOKEN || "").trim();

export { overseasBachataVideoSamples };

export const overseasBachataVideoSamplePayload = {
  mode: "daily",
  sampleSet: "overseas-bachata-video",
  candidateLimit: 5,
  contentType: "video",
  overseasOnly: true,
  reuseOnly: false,
  signals: overseasBachataVideoSamples
};

const isMain = Boolean(
  process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isMain) {
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(overseasBachataVideoSamplePayload, null, 2));
    process.exit(0);
  }
  if (!token) throw new Error("ADMIN_AUTOMATION_TOKEN is required.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(overseasBachataVideoSamplePayload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Editorial sample request failed (${response.status}): ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2));
}
