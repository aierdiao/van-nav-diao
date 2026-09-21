import { test } from "node:test";
import assert from "node:assert/strict";
import { publicSnapshot, publish } from "../src/server/data";
import { schemas, imageType } from "../src/server/validation";
import { renderPage } from "../src/server/render";
import type { Dataset } from "../src/shared";
const data: Dataset = {
  categories: [
    { id: 1, name: "公开分类", slug: "public", sort: 0, hidden: 0 },
    { id: 2, name: "秘密分类", slug: "secret-category", sort: 0, hidden: 1 },
  ],
  tags: [
    { id: 1, name: "Aff", slug: "affiliation", sort: 0, hidden: 0 },
    { id: 2, name: "秘密标签", slug: "secret-tag", sort: 0, hidden: 1 },
  ],
  search_engines: [
    {
      id: 1,
      name: "秘密引擎",
      url_template: "https://private.example/?q={query}",
      description: "private",
      icon: "",
      sort: 0,
      hidden: 1,
    },
  ],
  tools: [
    {
      id: 1,
      name: "公开工具",
      url: "https://example.com/?aff=a%2Bb&src=原值",
      description: "<script>alert(1)</script>",
      icon: "",
      category_id: 1,
      sort: 0,
      category_sort: 0,
      hidden: 0,
      tag_ids: [1, 2],
    },
    {
      id: 2,
      name: "秘密工具",
      url: "https://secret.example",
      description: "secret",
      icon: "/media/" + "a".repeat(64) + ".webp",
      category_id: 1,
      sort: 0,
      category_sort: 0,
      hidden: 1,
      tag_ids: [],
    },
    {
      id: 3,
      name: "分类隐藏工具",
      url: "https://other-secret.example",
      description: "",
      icon: "",
      category_id: 2,
      sort: 0,
      category_sort: 0,
      hidden: 0,
      tag_ids: [],
    },
  ],
  settings: {
    id: 1,
    title: "Diaopicks",
    description: "",
    favicon: "/placeholder.svg",
    new_tab: 1,
    columns: 4,
    show_engines: 1,
    compact: 0,
    no_images: 0,
    notice: "",
  },
};
test("hidden content is omitted before HTML/JSON and image publication", () => {
  const s = publicSnapshot(data, 2),
    serialized = JSON.stringify(s);
  assert.equal(s.tools.length, 1);
  assert.deepEqual(s.tools[0].tag_ids, [1]);
  assert.deepEqual(s.media, []);
  for (const forbidden of [
    "秘密",
    "secret.example",
    "secret-tag",
    "secret-category",
    "private.example",
  ])
    assert.ok(!serialized.includes(forbidden));
});
test("server HTML contains names, exact affiliate URL and escaped descriptions without JS", () => {
  const s = publicSnapshot(data, 2);
  const html = renderPage(s, "/")!;
  assert.ok(html.includes("公开工具"));
  assert.ok(html.includes("https://example.com/?aff=a%2Bb&amp;src=原值"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert(1)"));
  assert.equal(renderPage(s, "/category/secret-category"), null);
  assert.ok(renderPage(s, "/tag/affiliation"));
});
test("input validation rejects active URLs, external icons and invalid slugs", () => {
  const t = data.tools[0];
  assert.ok(
    !schemas.tools.safeParse({ ...t, url: "javascript:alert(1)" }).success,
  );
  assert.ok(
    !schemas.tools.safeParse({
      ...t,
      icon: "https://external.example/icon.png",
    }).success,
  );
  assert.ok(
    !schemas.categories.safeParse({ ...data.categories[0], slug: "../admin" })
      .success,
  );
  assert.ok(
    !schemas.search_engines.safeParse({
      ...data.search_engines[0],
      url_template: "https://example.com/",
    }).success,
  );
  assert.equal(
    imageType(new TextEncoder().encode('<svg onload="alert(1)">')),
    null,
  );
});
// Fake object storage models R2's compare-and-swap; D1 batch is a consistent snapshot.
function environment(
  revision: number,
  options: { missing?: boolean; failPut?: boolean; race?: boolean } = {},
) {
  let current = publicSnapshot(data, 1);
  let etag = "old";
  const previous = JSON.stringify(current);
  let writes = 0;
  const env = {
    DB: {
      prepare: (sql: string) => ({
        sql,
        bind() {
          return this;
        },
        run: async () => ({ success: true }),
      }),
      batch: async () => [
        { results: [{ revision }] },
        { results: data.tools.map(({ tag_ids, ...t }) => t) },
        { results: data.categories },
        { results: data.tags },
        { results: data.search_engines },
        { results: [data.settings] },
        {
          results: [
            { tool_id: 1, tag_id: 1 },
            { tool_id: 1, tag_id: 2 },
          ],
        },
      ],
    },
    MEDIA: {
      head: async () => (options.missing ? null : {}),
      get: async () => ({ etag, json: async () => current }),
      put: async (
        key: string,
        value: string,
        opts: { onlyIf?: { etagMatches?: string } },
      ) => {
        if (options.failPut) throw new Error("storage unavailable");
        if (key !== "published/current.json") return {};
        if (options.race && writes++ === 0) {
          current = publicSnapshot(data, revision + 1);
          etag = "newer";
          return null;
        }
        if (opts.onlyIf?.etagMatches !== etag) return null;
        current = JSON.parse(value);
        etag = "written";
        return {};
      },
    },
  };
  return {
    env: env as unknown as Env,
    current: () => JSON.stringify(current),
    previous,
  };
}
test("failed publication leaves last good snapshot unchanged", async () => {
  const e = environment(2, { failPut: true });
  await assert.rejects(publish(e.env));
  assert.equal(e.current(), e.previous);
});
test("older publishing job cannot overwrite a newer completed publication", async () => {
  const e = environment(2, { race: true });
  const r = await publish(e.env);
  assert.equal(r.revision, 3);
  assert.equal(JSON.parse(e.current()).revision, 3);
});
test("successful publish updates public revision", async () => {
  const e = environment(2);
  await publish(e.env);
  assert.equal(JSON.parse(e.current()).revision, 2);
});
