import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { readData, publish } from "./data";
import { schemas, isEntity, imageType } from "./validation";
const api = new Hono<{ Bindings: Env }>();
api.use(
  "*",
  bodyLimit({
    maxSize: 2 * 1024 * 1024,
    onError: (c) => c.json({ error: "文件不能超过 2 MB" }, 413),
  }),
);
api.get("/data", async (c) => c.json(await readData(c.env.DB)));
api.get("/export", async (c) => {
  const d = await readData(c.env.DB);
  c.header(
    "Content-Disposition",
    'attachment; filename="diaopicks-business.json"',
  );
  const media = (
    await c.env.DB.prepare("SELECT * FROM media ORDER BY key").all()
  ).results;
  return c.json({
    format: "diaopicks/v2",
    exported_at: new Date().toISOString(),
    ...d,
    media,
  });
});
api.post("/publish", async (c) => {
  try {
    return c.json(await publish(c.env));
  } catch (e) {
    const message = e instanceof Error ? e.message : "发布失败，请重试";
    await c.env.DB.prepare(
      "UPDATE publication SET last_error=? WHERE id=1 AND revision>published_revision",
    )
      .bind(message)
      .run();
    return c.json({ error: message }, 503);
  }
});
api.get("/media", async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        "SELECT * FROM media ORDER BY created_at DESC",
      ).all()
    ).results,
  ),
);
api.get("/media/:key", async (c) => {
  const key = c.req.param("key");
  if (!/^[a-f0-9]{64}\.(webp|png|jpg|gif|ico)$/.test(key)) return c.notFound();
  const o = await c.env.MEDIA.get("uploads/" + key);
  if (!o) return c.notFound();
  c.header(
    "Content-Type",
    o.httpMetadata?.contentType || "application/octet-stream",
  );
  return c.body(o.body);
});
api.post("/media", async (c) => {
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  const ext = imageType(bytes);
  if (!ext)
    return c.json(
      { error: "只接受 PNG、JPEG、WebP、GIF 或 ICO 图片；SVG 请先转成 PNG" },
      415,
    );
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const key = hash + "." + ext;
  const type =
    ext === "jpg"
      ? "image/jpeg"
      : ext === "ico"
        ? "image/x-icon"
        : "image/" + ext;
  await c.env.MEDIA.put("uploads/" + key, bytes, {
    httpMetadata: { contentType: type },
  });
  let name = "图片";
  try {
    name = decodeURIComponent(c.req.header("X-File-Name") || "图片").slice(
      0,
      200,
    );
  } catch {}
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO media(key,name,type,size) VALUES(?,?,?,?)",
  )
    .bind(key, name, type, bytes.length)
    .run();
  return c.json({ key, url: "/media/" + key });
});
api.put("/:entity/:id", async (c) => {
  const entity = c.req.param("entity"),
    id = Number(c.req.param("id"));
  if (!isEntity(entity) || !Number.isSafeInteger(id) || id < 1)
    return c.notFound();
  const parsed = schemas[entity].safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      {
        error: parsed.error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("；"),
      },
      400,
    );
  const fields: Record<string, unknown> = { ...parsed.data };
  delete fields.tag_ids;
  if (entity === "settings" && id !== 1) return c.notFound();
  const keys = Object.keys(fields);
  const values = Object.values(fields) as (string | number | null)[];
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO ${entity}(id,${keys.join(",")}) VALUES(?,${keys.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${keys.map((k) => `${k}=excluded.${k}`).join(",")}`,
    ).bind(id, ...values),
  ];
  if (entity === "tools" && "tag_ids" in parsed.data) {
    statements.push(
      c.env.DB.prepare("DELETE FROM tool_tags WHERE tool_id=?").bind(id),
    );
    parsed.data.tag_ids.forEach((tag, i) =>
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO tool_tags(tool_id,tag_id,sort) VALUES(?,?,?)",
        ).bind(id, tag, i),
      ),
    );
  }
  statements.push(
    c.env.DB.prepare(
      "UPDATE publication SET revision=revision+1,last_error=NULL WHERE id=1",
    ),
  );
  try {
    await c.env.DB.batch(statements);
  } catch {
    return c.json(
      { error: "保存失败：名称、路径重复或关联项不存在，请检查" },
      409,
    );
  }
  return c.json({ saved: true, published: false });
});
api.delete("/:entity/:id", async (c) => {
  const entity = c.req.param("entity"),
    id = Number(c.req.param("id"));
  if (
    !isEntity(entity) ||
    entity === "settings" ||
    !Number.isSafeInteger(id) ||
    id < 1
  )
    return c.notFound();
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM ${entity} WHERE id=?`).bind(id),
    c.env.DB.prepare(
      "UPDATE publication SET revision=revision+1,last_error=NULL WHERE id=1",
    ),
  ]);
  return c.json({ saved: true, published: false });
});
export default api;
