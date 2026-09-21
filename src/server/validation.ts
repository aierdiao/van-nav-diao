import { z } from "zod";
const bool = z.number().int().min(0).max(1),
  sort = z.number().int().min(-1000000).max(1000000);
const name = z.string().trim().min(1).max(160),
  slug = z
    .string()
    .min(1)
    .max(160)
    .regex(/^[\p{L}\p{N}_-]+$/u);
export const webUrl = z
  .string()
  .max(4096)
  .refine((s) => {
    try {
      const u = new URL(s);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "需要有效的 http/https 网址");
const icon = z
  .string()
  .refine(
    (s) =>
      s === "" ||
      s === "/placeholder.svg" ||
      /^\/media\/[a-f0-9]{64}\.(webp|png|jpg|gif|ico)$/.test(s),
    "请上传图片",
  );
export const schemas = {
  tools: z.object({
    name,
    url: webUrl,
    description: z.string().max(500),
    icon,
    category_id: z.number().int().positive().nullable(),
    sort,
    category_sort: sort,
    hidden: bool,
    tag_ids: z
      .array(z.number().int().positive())
      .max(50)
      .transform((x) => [...new Set(x)]),
  }),
  categories: z.object({ name, slug, sort, hidden: bool }),
  tags: z.object({ name, slug, sort, hidden: bool }),
  search_engines: z.object({
    name,
    url_template: webUrl.refine(
      (s) => s.includes("{query}"),
      "搜索地址需包含 {query}",
    ),
    description: z.string().max(500),
    icon,
    sort,
    hidden: bool,
  }),
  settings: z.object({
    title: name,
    description: z.string().max(500),
    favicon: icon,
    new_tab: bool,
    columns: z.number().int().min(2).max(6),
    show_engines: bool,
    compact: bool,
    no_images: bool,
    notice: z.string().max(2000),
  }),
};
export type Entity = keyof typeof schemas;
export function isEntity(v: string): v is Entity {
  return Object.hasOwn(schemas, v);
}
export function imageType(b: Uint8Array): string | null {
  const hex = [...b.slice(0, 12)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  if (hex.startsWith("89504e470d0a1a0a")) return "png";
  if (hex.startsWith("ffd8ff")) return "jpg";
  if (hex.startsWith("474946383761") || hex.startsWith("474946383961"))
    return "gif";
  if (
    hex.startsWith("52494646") &&
    new TextDecoder().decode(b.slice(8, 12)) === "WEBP"
  )
    return "webp";
  if (hex.startsWith("00000100")) return "ico";
  return null;
}
