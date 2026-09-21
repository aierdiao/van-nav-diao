import { Hono } from "hono";
import { adminAuth } from "./auth";
import admin from "./admin";
import { getSnapshot } from "./data";
import { renderPage, renderAdmin } from "./render";
const app = new Hono<{ Bindings: Env }>();
app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  await next();
});
app.use("/admin", adminAuth);
app.use("/admin/*", adminAuth);
app.use("/api/admin", adminAuth);
app.use("/api/admin/*", adminAuth);
app.get("/admin", (c) => c.html(renderAdmin()));
app.get("/admin/*", (c) => c.html(renderAdmin()));
app.route("/api/admin", admin);
app.get("/health", (c) => c.json({ ok: true, application: "diaopicks-v2" }));
app.get("/media/:key", async (c) => {
  const key = c.req.param("key");
  if (!/^[a-f0-9]{64}\.(webp|png|jpg|gif|ico)$/.test(key)) return c.notFound();
  const s = await getSnapshot(c.env, c.executionCtx, new URL(c.req.url).origin);
  if (!s?.media.includes(key)) return c.notFound();
  const o = await c.env.MEDIA.get("uploads/" + key);
  if (!o) return c.notFound();
  c.header(
    "Content-Type",
    o.httpMetadata?.contentType || "application/octet-stream",
  );
  c.header("Cache-Control", "public,max-age=30");
  c.header("ETag", o.httpEtag);
  return c.body(o.body);
});
app.get("*", async (c) => {
  const path = new URL(c.req.url).pathname;
  if (path === "/" || /^\/(category|tag)\/[^/]+\/?$/.test(path)) {
    const snapshot = await getSnapshot(
      c.env,
      c.executionCtx,
      new URL(c.req.url).origin,
    );
    if (!snapshot) {
      c.header("Cache-Control", "no-store");
      return c.text("内容尚未发布，请稍后再来。", 503);
    }
    let html: string | null;
    try {
      html = renderPage(snapshot, path);
    } catch {
      return c.notFound();
    }
    if (!html) return c.notFound();
    c.header("Cache-Control", "public,max-age=0,s-maxage=30,must-revalidate");
    c.header("X-Published-Revision", String(snapshot.revision));
    return c.html(html);
  }
  if (
    path.startsWith("/assets/") ||
    path.startsWith("/pets/") ||
    [
      "/placeholder.svg",
      "/theme-init.js",
      "/service-worker.js",
      "/sw.js",
    ].includes(path)
  ) {
    const r = await c.env.ASSETS.fetch(c.req.raw);
    const headers = new Headers(r.headers);
    headers.set(
      "Cache-Control",
      path.startsWith("/assets/")
        ? "public,max-age=31536000,immutable"
        : path.endsWith("worker.js") || path === "/sw.js"
          ? "no-store"
          : "public,max-age=3600",
    );
    if (path.endsWith("worker.js") || path === "/sw.js")
      headers.set("Service-Worker-Allowed", "/");
    return new Response(r.body, { status: r.status, headers });
  }
  return c.notFound();
});
app.onError((e, c) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      path: new URL(c.req.url).pathname,
      error: e.name,
    }),
  );
  c.header("Cache-Control", "no-store");
  return c.json({ error: "操作未完成，请重试；已发布的内容不受影响" }, 500);
});
export default app;
