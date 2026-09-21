import { execFileSync } from "node:child_process";
import { writeFile, readFile } from "node:fs/promises";
import { publicSnapshot } from "../src/server/data";
import type { Dataset } from "../src/shared";
// Initial provisioning only. Reads back D1, checks exact migration parity, refuses an existing publication.
const base = "local-output/rebuild";
function query(sql: string) {
  const out = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "diaopicks-db",
      "--remote",
      "--json",
      "--command",
      sql,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(out)[0].results;
}
const state = query("SELECT * FROM publication WHERE id=1")[0];
if (state.published_revision !== 0 || state.revision !== 1)
  throw Error("Initial bootstrap refused: database already edited/published");
const links = query("SELECT * FROM tool_tags ORDER BY sort,tag_id");
const data: Dataset = {
  tools: query("SELECT * FROM tools ORDER BY sort,id").map(
    (t: Dataset["tools"][number]) => ({
      ...t,
      tag_ids: links
        .filter((l: { tool_id: number }) => l.tool_id === t.id)
        .map((l: { tag_id: number }) => l.tag_id),
    }),
  ),
  categories: query("SELECT * FROM categories ORDER BY sort,id"),
  tags: query("SELECT * FROM tags ORDER BY sort,id"),
  search_engines: query("SELECT * FROM search_engines ORDER BY sort,id"),
  settings: query("SELECT * FROM settings WHERE id=1")[0],
};
const expected: Dataset = JSON.parse(
  await readFile(base + "/business.json", "utf8"),
);
for (const key of ["tools", "categories", "tags", "search_engines"] as const) {
  for (const row of expected[key]) {
    const found = data[key].find((x) => x.id === row.id);
    for (const [k, v] of Object.entries(row))
      if (
        JSON.stringify(v) !==
        JSON.stringify((found as Record<string, unknown> | undefined)?.[k])
      )
        throw Error(`Mismatch ${key}:${row.id}:${k}`);
  }
  if (expected[key].length !== data[key].length) throw Error("count mismatch");
}
for (const [k, v] of Object.entries(expected.settings))
  if (v !== data.settings[k as keyof typeof data.settings])
    throw Error("settings mismatch");
await writeFile(
  base + "/evidence/remote-business-readback.json",
  JSON.stringify(data),
);
const snapshot = publicSnapshot(data, 1);
await writeFile(base + "/initial-publication.json", JSON.stringify(snapshot));
console.log({
  verified: true,
  tools: data.tools.length,
  public_tools: snapshot.tools.length,
  media: snapshot.media.length,
});
