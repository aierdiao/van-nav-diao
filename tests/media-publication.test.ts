import { test } from "node:test";
import assert from "node:assert/strict";
import { publish } from "../src/server/data";
test("publication checks the R2 object inventory before writing a snapshot", async () => {
  let writes = 0;
  const row = {
    id: 1,
    name: "t",
    url: "https://example.com",
    description: "",
    icon: "/media/" + "f".repeat(64) + ".webp",
    category_id: null,
    sort: 0,
    category_sort: 0,
    hidden: 0,
  };
  const env = {
    DB: {
      prepare: () => ({}),
      batch: async () => [
        { results: [{ revision: 2 }] },
        { results: [row] },
        { results: [] },
        { results: [] },
        { results: [] },
        { results: [{ favicon: "", title: "Test" }] },
        { results: [] },
      ],
    },
    MEDIA: {
      list: async () => ({ objects: [], truncated: false }),
      put: async () => {
        writes++;
      },
    },
  } as unknown as Env;
  await assert.rejects(publish(env), /引用图片缺失/);
  assert.equal(writes, 0);
});
