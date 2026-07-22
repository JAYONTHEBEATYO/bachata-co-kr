export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    const originUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, "https://bachata-co-kr.bachata-korea.workers.dev");
    return env.COMMUNITY_ORIGIN.fetch(new Request(originUrl, request));
  }
};
