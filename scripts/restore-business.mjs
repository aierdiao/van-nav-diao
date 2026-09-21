import { readFile, writeFile } from "node:fs/promises";
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw Error(
    "Usage: node scripts/restore-business.mjs private-export.json private-restore.sql",
  );
const archive = JSON.parse(await readFile(input, "utf8"));
if (archive.format !== "diaopicks/v2") throw Error("Unsupported export format");
const d = archive.data;
const val = (v) =>
  v === null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : "'" + String(v).replaceAll("'", "''") + "'";
const fields = {
  media: ["key", "name", "type", "size", "created_at"],
  categories: ["id", "name", "slug", "sort", "hidden"],
  tags: ["id", "name", "slug", "sort", "hidden"],
  search_engines: [
    "id",
    "name",
    "url_template",
    "description",
    "icon",
    "sort",
    "hidden",
  ],
  tools: [
    "id",
    "name",
    "url",
    "description",
    "icon",
    "category_id",
    "sort",
    "category_sort",
    "hidden",
  ],
  settings: [
    "id",
    "title",
    "description",
    "favicon",
    "new_tab",
    "columns",
    "show_engines",
    "compact",
    "no_images",
    "notice",
  ],
};
let sql =
  "-- Restore into a NEW database after applying migrations. Never overwrite active production.\n";
for (const [table, keys] of Object.entries(fields)) {
  for (const row of table === "settings"
    ? [d.settings]
    : table === "media"
      ? archive.media || []
      : d[table]) {
    for (const k of keys)
      if (row[k] === undefined) throw Error("Missing " + table + "." + k);
    sql += `INSERT ${table === "settings" ? "OR REPLACE " : ""}INTO ${table}(${keys.join(",")}) VALUES(${keys.map((k) => val(row[k])).join(",")});\n`;
  }
}
for (const t of d.tools)
  for (const [i, id] of t.tag_ids.entries())
    sql += `INSERT INTO tool_tags(tool_id,tag_id,sort) VALUES(${val(t.id)},${val(id)},${i});\n`;
sql +=
  "UPDATE publication SET revision=revision+1,published_revision=0,published_at=NULL,last_error=NULL WHERE id=1;\n";
await writeFile(output, sql);
console.log(
  "Restore SQL written; apply to a new database, restore media, then publish.",
);
