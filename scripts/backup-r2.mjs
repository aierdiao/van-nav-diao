import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
const directory = process.argv[2];
if (!directory || !directory.startsWith("local-output/"))
  throw Error("Use an ignored local-output/ backup directory.");
await mkdir(directory, { recursive: true });
const query = (sql) =>
  JSON.parse(
    execFileSync(
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
    ),
  )[0].results;
const media = query("SELECT * FROM media"),
  state = query("SELECT * FROM publication WHERE id=1")[0];
await writeFile(
  join(directory, "media-manifest.json"),
  JSON.stringify(media, null, 2),
);
await writeFile(
  join(directory, "publication.json"),
  JSON.stringify(state, null, 2),
);
const objects = [
  ...media.map((m) => "uploads/" + m.key),
  "published/current.json",
  ...Array.from({ length: state.revision }, (_, i) => `releases/${i + 1}.json`),
];
const manifest = [];
for (const key of objects) {
  const destination = join(directory, key);
  await mkdir(join(destination, ".."), { recursive: true });
  try {
    execFileSync(
      "npx",
      [
        "wrangler",
        "r2",
        "object",
        "get",
        "diaopicks-media/" + key,
        "--remote",
        "--file",
        destination,
      ],
      { stdio: "pipe" },
    );
    const bytes = await readFile(destination);
    manifest.push({
      key,
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  } catch (error) {
    const message = String(error.stderr || "") + String(error.stdout || "");
    if (
      key.startsWith("releases/") &&
      /NoSuchKey|specified key does not exist|object does not exist|object was not found/i.test(
        message,
      )
    )
      manifest.push({ key, absent: true });
    else
      throw Error(
        "Backup failed for " +
          key +
          "; check access/network and retry. No failed download is considered a valid backup.",
      );
  }
  await writeFile(
    join(directory, "objects.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log("Checked", key);
}
console.log(
  "Complete. Retain the D1 SQL export from the same editing freeze alongside this directory.",
);
