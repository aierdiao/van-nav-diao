import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { adminAuth } from "../src/server/auth";
const app = new Hono<{ Bindings: Env }>();
app.use("*", adminAuth);
app.all("*", (c) => c.json({ secret: "never anonymous" }));
const env = {
  ACCESS_ISSUER: "https://im-sun.cloudflareaccess.com",
  ACCESS_AUD: "expected",
  ADMIN_EMAIL: "im.sun@live.com",
} as unknown as Env;
for (const path of [
  "/admin",
  "/api/admin/data",
  "/api/admin/export",
  "/api/admin/media",
  "/api/admin/publish",
])
  test("Access required at " + path, async () => {
    for (const host of [
      "diaopicks.com",
      "diaopicks.im-sun.workers.dev",
      "preview.invalid",
    ]) {
      const r = await app.request("https://" + host + path, {}, env);
      assert.equal(r.status, 401);
      assert.equal(r.headers.get("cache-control"), "private, no-store");
      assert.ok(!(await r.text()).includes("never anonymous"));
    }
  });
test("forged identity assertion is rejected", async () => {
  const r = await app.request(
    "https://diaopicks.com/api/admin/data",
    {
      headers: {
        "Cf-Access-Jwt-Assertion":
          "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6ImltLnN1bkBsaXZlLmNvbSJ9.",
      },
    },
    env,
  );
  assert.equal(r.status, 401);
});

test("signed Access identity enforces expiry, audience, owner and same-origin writes", async () => {
  const { generateKeyPair, exportJWK, SignJWT } = await import("jose");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: "unit-key",
    alg: "RS256",
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ keys: [jwk] }), {
      headers: { "content-type": "application/json" },
    });
  const issue = (email: string, aud = "expected", expired = false) =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: "RS256", kid: "unit-key" })
      .setIssuer(env.ACCESS_ISSUER)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime(expired ? Math.floor(Date.now() / 1000) - 60 : "5m")
      .sign(privateKey);
  try {
    for (const [email, aud, expired, status] of [
      ["im.sun@live.com", "expected", false, 200],
      ["other@example.com", "expected", false, 403],
      ["im.sun@live.com", "wrong", false, 401],
      ["im.sun@live.com", "expected", true, 401],
    ] as const) {
      const token = await issue(email, aud, expired);
      const response = await app.request(
        "https://diaopicks.com/api/admin/data",
        { headers: { "Cf-Access-Jwt-Assertion": token } },
        env,
      );
      assert.equal(response.status, status);
    }
    const token = await issue("im.sun@live.com");
    for (const [origin, marker, status] of [
      ["https://evil.example", "1", 403],
      ["https://diaopicks.com", "", 403],
      ["https://diaopicks.com", "1", 200],
    ] as const) {
      const r = await app.request(
        "https://diaopicks.com/api/admin/publish",
        {
          method: "POST",
          headers: {
            "Cf-Access-Jwt-Assertion": token,
            Origin: origin,
            "X-Diaopicks-Request": marker,
            "Content-Type": "application/json",
          },
          body: "{}",
        },
        env,
      );
      assert.equal(r.status, status);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
