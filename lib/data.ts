import { communities } from "./communities";
import { getCommunityContext } from "./community-server";
import type { Community } from "./types";

export const getCommunities = async (): Promise<Community[]> => {
  try {
    const { db } = await getCommunityContext();
    if (!db) return communities;
    const rows = await db.prepare(
      `select slug, category, name, description, color
       from topic_definitions
       where topic_type = 'board' and status = 'active'
       order by sort_order, name`
    ).all<Community>();
    const configured = rows.results || [];
    return configured.length ? configured : communities;
  } catch {
    return communities;
  }
};
