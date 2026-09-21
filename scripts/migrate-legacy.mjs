// Offline migration: reads private intake only, never production credentials.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const base = process.argv[2] || "local-output/rebuild";
const legacy = JSON.parse(
  await readFile(base + "/legacy-business.json", "utf8"),
);
const intake = JSON.parse(await readFile(base + "/media-intake.json", "utf8"));
await mkdir(base + "/media", { recursive: true });
const media = [],
  failures = [],
  lookup = new Map();
for (const item of intake) {
  let bytes;
  try {
    if (item.source === "missing") {
      const r = await fetch(item.url, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw Error("HTTP " + r.status);
      bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length > 2 * 1024 * 1024) throw Error("too large");
      await writeFile(base + "/raw-media/" + item.file, bytes);
    } else bytes = await readFile(base + "/raw-media/" + item.file);
    let image;
    try {
      image = await sharp(bytes, { limitInputPixels: 20000000 })
        .resize(96, 96, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer();
    } catch (e) {
      // ICO: use the largest embedded PNG when possible; otherwise retain the bounded original ICO.
      if (
        bytes[0] === 0 &&
        bytes[1] === 0 &&
        bytes[2] === 1 &&
        bytes[3] === 0
      ) {
        const count = bytes.readUInt16LE(4);
        let best = null;
        for (let i = 0; i < count; i++) {
          let pos = 6 + 16 * i;
          if (pos + 16 > bytes.length) break;
          const length = bytes.readUInt32LE(pos + 8),
            offset = bytes.readUInt32LE(pos + 12);
          const b = bytes.subarray(offset, offset + length);
          if (b[0] === 137 && b[1] === 80 && (!best || b.length > best.length))
            best = b;
        }
        if (best)
          image = await sharp(best)
            .resize(96, 96, { fit: "inside" })
            .webp()
            .toBuffer();
        else image = bytes;
      } else throw e;
    }
    const ext = image === bytes ? "ico" : "webp",
      key = createHash("sha256").update(image).digest("hex") + "." + ext;
    await writeFile(base + "/media/" + key, image);
    lookup.set(item.url, "/media/" + key);
    if (!media.some((m) => m.key === key))
      media.push({
        key,
        name: new URL(
          item.url.startsWith("http")
            ? item.url
            : "https://diaopicks.com/" + item.url,
        ).hostname,
        type: ext === "ico" ? "image/x-icon" : "image/webp",
        size: image.length,
      });
  } catch (e) {
    failures.push({ url: item.url, reason: e.message });
    lookup.set(item.url, "");
  }
}
const categories = legacy.nav_catelog.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  sort: c.sort || 0,
  hidden: Number(!!c.hide),
}));
const tags = [...legacy.nav_tag_slug]
  .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
  .map((t, i) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    sort: i,
    hidden: 0,
  }));
const tools = legacy.nav_table.map((t) => {
  const names = (t.tags || "")
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: t.id,
    name: t.name,
    url: t.url,
    description: t.desc || "",
    icon: lookup.get(t.logo) || "",
    category_id: categories.find((c) => c.name === t.catelog)?.id ?? null,
    sort: t.sort || 0,
    category_sort: t.catelog_sort ?? t.sort ?? 0,
    hidden: Number(!!t.hide),
    tag_ids: names.map((n) => {
      let tag = tags.find((x) => x.name.toLowerCase() === n.toLowerCase());
      if (!tag) {
        tag = {
          id: Math.max(0, ...tags.map((x) => x.id)) + 1,
          name: n,
          slug: "tag-" + (tags.length + 1),
          sort: tags.length,
          hidden: 0,
        };
        tags.push(tag);
      }
      return tag.id;
    }),
  };
});
const l = legacy.nav_setting[0],
  site = legacy.nav_site_config[0];
const notice =
  l.customCss.match(/content:\s*"([^"]*)"/)?.[1].replace(/\\A\s*/g, "\n") ||
  "本站部分链接包含返利或邀请关系，已标注 Aff。";
const settings = {
  id: 1,
  title: l.title || "Diaopicks",
  description: l.metaDescription || "",
  favicon: lookup.get(l.favicon) || "/placeholder.svg",
  new_tab: Number(!!l.jumpTargetBlank),
  columns: l.pcColumnCount || 4,
  show_engines: Number(!!l.showSearchEngine),
  compact: Number(!!site.compactMode),
  no_images: Number(!!site.noImageMode),
  notice,
};
const search_engines = legacy.nav_search_engine.map((e) => ({
  id: e.id,
  name: e.name,
  url_template: e.urlTemplate,
  description: e.description || "",
  icon: lookup.get(e.logo) || "",
  sort: e.sort || 0,
  hidden: Number(!e.enabled),
}));
const data = { tools, categories, tags, search_engines, settings };
const sqlValue = (v) =>
  v === null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : "'" + String(v).replaceAll("'", "''") + "'";
const insert = (table, row) => {
  const keys = Object.keys(row);
  return `INSERT INTO ${table}(${keys.join(",")}) VALUES(${Object.values(row).map(sqlValue).join(",")}) ON CONFLICT(${table === "media" ? "key" : "id"}) DO UPDATE SET ${keys
    .filter((k) => k !== "id" && k !== "key")
    .map((k) => `${k}=excluded.${k}`)
    .join(",")};`;
};
let sql =
  "-- Idempotent initial migration; never re-run against edited production data.\n";
for (const [table, rows] of Object.entries({
  categories,
  tags,
  media,
  search_engines,
  settings: [settings],
}))
  for (const row of rows) sql += insert(table, row) + "\n";
for (const { tag_ids, ...row } of tools) {
  sql += insert("tools", row) + "\n";
  sql += `DELETE FROM tool_tags WHERE tool_id=${row.id};\n`;
  for (const [i, id] of tag_ids.entries())
    sql += `INSERT INTO tool_tags(tool_id,tag_id,sort) VALUES(${row.id},${id},${i});\n`;
}
await writeFile(base + "/migration.sql", sql);
await writeFile(base + "/business.json", JSON.stringify(data));
await writeFile(base + "/media-manifest.json", JSON.stringify(media, null, 2));
const report = {
  tools: tools.length,
  categories: categories.length,
  tags: tags.length,
  engines: search_engines.length,
  hidden_tools: tools.filter((t) => t.hidden).length,
  distinct_image_references: intake.length,
  media_objects: media.length,
  failures,
  urls_preserved: tools.every(
    (t) => legacy.nav_table.find((x) => x.id === t.id).url === t.url,
  ),
  unmatched_categories: legacy.nav_table
    .filter((t) => t.catelog && !categories.some((c) => c.name === t.catelog))
    .map((t) => ({ id: t.id, category: t.catelog })),
};
await writeFile(
  base + "/migration-report.json",
  JSON.stringify(report, null, 2),
);
console.log(report);
