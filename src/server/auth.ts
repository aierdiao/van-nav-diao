import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
// Cache only public signing keys; never cache an identity or authorization result.
// The origin accepts signed Access identities only, including on workers.dev.
export const adminAuth: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  c.header("Cache-Control", "private, no-store");
  c.header("Vary", "Cookie, Cf-Access-Jwt-Assertion");
  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (!token) return c.json({ error: "需要 Cloudflare Access 身份验证" }, 401);
  try {
    const issuer = c.env.ACCESS_ISSUER;
    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer))
      throw new Error("issuer");
    let keys = keySets.get(issuer);
    if (!keys) {
      keys = createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs"));
      keySets.set(issuer, keys);
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: c.env.ACCESS_AUD,
      algorithms: ["RS256"],
    });
    if (
      typeof payload.email !== "string" ||
      payload.email.toLowerCase() !== c.env.ADMIN_EMAIL.toLowerCase()
    )
      return c.json({ error: "此身份没有管理权限" }, 403);
  } catch (e) {
    console.warn(
      JSON.stringify({
        event: "access_verification_failed",
        reason: e instanceof Error ? e.name : "unknown",
      }),
    );
    return c.json({ error: "身份已过期或无效，请重新登录" }, 401);
  }
  if (!["GET", "HEAD"].includes(c.req.method)) {
    const origin = new URL(c.req.url).origin;
    if (
      c.req.header("Origin") !== origin ||
      c.req.header("X-Diaopicks-Request") !== "1"
    )
      return c.json({ error: "请求来源不合法" }, 403);
    if (
      !["application/json", "application/octet-stream"].includes(
        (c.req.header("Content-Type") || "").split(";")[0],
      )
    )
      return c.json({ error: "请求格式不支持" }, 415);
  }
  await next();
};
