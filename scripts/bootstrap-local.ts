import { getPlatformProxy } from "wrangler";
import { readFile } from "node:fs/promises";
import { publish, readData } from "../src/server/data";
const p = await getPlatformProxy<Env>();
try {
  const manifest = JSON.parse(
    await readFile("local-output/rebuild/media-manifest.json", "utf8"),
  );
  for (const m of manifest)
    await p.env.MEDIA.put(
      "uploads/" + m.key,
      await readFile("local-output/rebuild/media/" + m.key),
      { httpMetadata: { contentType: m.type } },
    );
  console.log(await publish(p.env));
  const d = await readData(p.env.DB);
  console.log({ tools: d.data.tools.length, revision: d.state });
} finally {
  await p.dispose();
}
