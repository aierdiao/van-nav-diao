import { build } from "esbuild";
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("static", "dist", { recursive: true });
const result = await build({
  entryPoints: {
    public: "src/client/public.ts",
    admin: "src/client/admin.tsx",
    pet: "src/client/pet.tsx",
  },
  bundle: true,
  splitting: true,
  format: "esm",
  outdir: "dist/assets",
  entryNames: "[name]-[hash]",
  chunkNames: "chunk-[hash]",
  assetNames: "[name]-[hash]",
  minify: true,
  metafile: true,
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },
});
const entries = {};
for (const [path, out] of Object.entries(result.metafile.outputs)) {
  if (out.entryPoint) {
    const name = out.entryPoint.split("/").pop().split(".")[0];
    entries[name] = "/" + path.replace(/^dist\//, "");
    if (out.cssBundle)
      entries[name + "Css"] = "/" + out.cssBundle.replace(/^dist\//, "");
  }
}
await writeFile("src/server/assets.json", JSON.stringify(entries));
await mkdir("local-output/rebuild/evidence", { recursive: true });
await writeFile(
  "local-output/rebuild/evidence/build-meta.json",
  JSON.stringify(result.metafile, null, 2),
);
console.log(entries);
