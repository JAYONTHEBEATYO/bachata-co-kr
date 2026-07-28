const endpoint = (process.env.EDITORIAL_AUTOMATION_URL || "https://bachata.co.kr/api/admin/automation").trim();
const token = (process.env.ADMIN_AUTOMATION_TOKEN || "").trim();

import licensedVideoSamples from "../lib/licensed-video-samples.json" with { type: "json" };

export { licensedVideoSamples };

export const licensedVideoSamplePayload = {
  mode: "daily",
  candidateLimit: 5,
  contentType: "video",
  reuseOnly: true,
  signals: licensedVideoSamples
};

const isMain = process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(licensedVideoSamplePayload, null, 2));
    process.exit(0);
  }
  if (!token) throw new Error("ADMIN_AUTOMATION_TOKEN is required.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(licensedVideoSamplePayload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Editorial sample request failed (${response.status}): ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2));
}