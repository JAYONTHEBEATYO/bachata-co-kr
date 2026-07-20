import { dancers, events, threads } from "./seed";

export const editorialTargetIds = new Set([
  ...threads.map((thread) => thread.id),
  ...events.map((event) => `event-${event.id}`),
  ...dancers.map((dancer) => `dancer-${dancer.id}`)
]);

