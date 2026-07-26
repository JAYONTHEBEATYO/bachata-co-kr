import type { NextRequest } from "next/server";
import { getCommunityContext, jsonHeaders } from "@/lib/community-server";
import { communities } from "@/lib/communities";
import type { AdminTopic } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { db } = await getCommunityContext();
  if (!db) {
    return Response.json({
      boards: communities,
      subtopics: []
    }, { headers: jsonHeaders(request, "GET,OPTIONS") });
  }

  try {
    const rows = await db.prepare(
      `select id, slug, category, parent_id as parentId, topic_type as topicType,
              name, description, color, sort_order as sortOrder, status
       from topic_definitions
       where status = 'active'
       order by topic_type, sort_order, name`
    ).all<AdminTopic>();
    const topics = rows.results || [];
    const boards = topics
      .filter((topic) => topic.topicType === "board")
      .map((topic) => ({
        slug: topic.slug,
        category: topic.category,
        name: topic.name,
        description: topic.description,
        color: topic.color
      }));
    return Response.json({
      boards: boards.length ? boards : communities,
      subtopics: topics.filter((topic) => topic.topicType === "subtopic")
    }, { headers: jsonHeaders(request, "GET,OPTIONS") });
  } catch {
    return Response.json({
      boards: communities,
      subtopics: []
    }, { headers: jsonHeaders(request, "GET,OPTIONS") });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(request, "GET,OPTIONS")
  });
}
