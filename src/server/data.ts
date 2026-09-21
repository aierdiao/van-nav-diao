import type {
  Dataset,
  Tool,
  Category,
  Tag,
  Engine,
  Settings,
  Publication,
  Snapshot,
} from "../shared";
export async function readData(
  db: D1Database,
): Promise<{ data: Dataset; state: Publication }> {
  const r = await db.batch([
    db.prepare("SELECT * FROM publication WHERE id=1"),
    db.prepare("SELECT * FROM tools ORDER BY sort,id"),
    db.prepare("SELECT * FROM categories ORDER BY sort,id"),
    db.prepare("SELECT * FROM tags ORDER BY sort,id"),
    db.prepare("SELECT * FROM search_engines ORDER BY sort,id"),
    db.prepare("SELECT * FROM settings WHERE id=1"),
    db.prepare("SELECT * FROM tool_tags ORDER BY sort,tag_id"),
  ]);
  const links = r[6].results as { tool_id: number; tag_id: number }[];
  return {
    state: r[0].results[0] as Publication,
    data: {
      tools: (r[1].results as Omit<Tool, "tag_ids">[]).map((t) => ({
        ...t,
        tag_ids: links.filter((l) => l.tool_id === t.id).map((l) => l.tag_id),
      })),
      categories: r[2].results as Category[],
      tags: r[3].results as Tag[],
      search_engines: r[4].results as Engine[],
      settings: r[5].results[0] as Settings,
    },
  };
}
export function publicSnapshot(data: Dataset, revision: number): Snapshot {
  const categories = data.categories.filter((c) => !c.hidden),
    tags = data.tags.filter((t) => !t.hidden);
  const tools = data.tools
    .filter(
      (t) =>
        !t.hidden &&
        (t.category_id === null ||
          categories.some((c) => c.id === t.category_id)),
    )
    .map((t) => ({
      ...t,
      tag_ids: t.tag_ids.filter((id) => tags.some((tag) => tag.id === id)),
    }));
  const search_engines = data.search_engines.filter((e) => !e.hidden);
  const media = [
    ...new Set(
      [
        ...tools.map((t) => t.icon),
        ...search_engines.map((e) => e.icon),
        data.settings.favicon,
      ]
        .filter((x) => x.startsWith("/media/"))
        .map((x) => x.slice(7)),
    ),
  ];
  return {
    tools,
    categories,
    tags,
    search_engines,
    settings: data.settings,
    revision,
    published_at: new Date().toISOString(),
    media,
  };
}
export async function publish(env: Env) {
  const { data, state } = await readData(env.DB);
  const snapshot = publicSnapshot(data, state.revision);
  // Validate every referenced object before touching the last good publication.
  const missing = new Set(snapshot.media.map((key) => "uploads/" + key));
  let cursor: string | undefined;
  while (missing.size) {
    const listed = await env.MEDIA.list({
      prefix: "uploads/",
      limit: 1000,
      cursor,
    });
    for (const object of listed.objects) missing.delete(object.key);
    if (!listed.truncated) break;
    cursor = listed.cursor;
  }
  if (missing.size) throw new Error("发布失败：引用图片缺失，请重新上传");
  const body = JSON.stringify(snapshot);
  await env.MEDIA.put(`releases/${state.revision}.json`, body, {
    httpMetadata: { contentType: "application/json" },
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await env.MEDIA.get("published/current.json");
    const previous = current ? await current.json<Snapshot>() : null;
    if (previous && previous.revision >= state.revision) {
      await env.DB.prepare(
        "UPDATE publication SET published_revision=MAX(published_revision,?), published_at=?, last_error=NULL WHERE id=1",
      )
        .bind(previous.revision, previous.published_at)
        .run();
      return { revision: previous.revision, alreadyPublished: true };
    }
    const result = await env.MEDIA.put("published/current.json", body, {
      onlyIf: current
        ? { etagMatches: current.etag }
        : { etagDoesNotMatch: "*" },
      httpMetadata: { contentType: "application/json" },
    });
    if (!result) continue;
    await env.DB.prepare(
      "UPDATE publication SET published_revision=MAX(published_revision,?), published_at=?, last_error=NULL WHERE id=1",
    )
      .bind(state.revision, snapshot.published_at)
      .run();
    return { revision: state.revision, published_at: snapshot.published_at };
  }
  throw new Error("另一次发布正在进行，请重试");
}
export async function getSnapshot(
  env: Env,
  ctx: { waitUntil(p: Promise<unknown>): void },
  origin: string,
): Promise<Snapshot | null> {
  const cache = caches.default;
  const key = new Request(origin + "/__published_snapshot_v2");
  let response = await cache.match(key);
  if (!response) {
    const object = await env.MEDIA.get("published/current.json");
    if (!object) return null;
    response = new Response(object.body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public,max-age=30",
      },
    });
    ctx.waitUntil(cache.put(key, response.clone()));
  }
  return response.json<Snapshot>();
}
