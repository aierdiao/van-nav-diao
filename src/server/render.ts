import type { Snapshot } from "../shared";
import assets from "./assets.json";
export const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const json = (v: unknown) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028");
export function renderPage(s: Snapshot, path: string) {
  const match = path.match(/^\/(category|tag)\/([^/]+)\/?$/);
  let filter: { kind: string; id: number } | null = null;
  if (match) {
    const item = (match[1] === "category" ? s.categories : s.tags).find(
      (x) => x.slug === decodeURIComponent(match[2]),
    );
    if (!item) return null;
    filter = { kind: match[1], id: item.id };
  }
  const ordered = [...s.tools].sort((a, b) =>
    filter?.kind === "category"
      ? a.category_sort - b.category_sort || a.sort - b.sort || a.id - b.id
      : a.sort - b.sort || a.id - b.id,
  );
  const visible = (t: Snapshot["tools"][number]) =>
    !filter ||
    (filter.kind === "category"
      ? t.category_id === filter.id
      : t.tag_ids.includes(filter.id));
  const pill = (kind: string, x: { id: number; slug: string; name: string }) =>
    `<a class="pill ${filter?.kind === kind && filter.id === x.id ? "active" : ""}" href="/${kind}/${encodeURIComponent(x.slug)}" data-filter="${kind}" data-id="${x.id}">${kind === "tag" ? "#" : ""}${esc(x.name)}</a>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.settings.title)}</title><meta name="description" content="${esc(s.settings.description)}"><link rel="icon" href="${esc(s.settings.favicon || "/placeholder.svg")}"><link rel="stylesheet" href="${assets.publicCss}"><script src="/theme-init.js"></script></head><body><a class="skip-link" href="#tools">跳到工具列表</a><main class="main" style="--columns:${s.settings.columns}"><h1 class="sr-only">${esc(s.settings.title)}</h1><div class="search"><form id="search-form" role="search"><label class="sr-only" for="search">搜索工具</label><span aria-hidden="true">⌕</span><input id="search" name="q" type="search" autocomplete="off" placeholder="按 / 开始搜索工具、网址或标签"><button type="submit">搜索</button></form></div><nav class="category-nav" aria-label="分类"><a class="pill ${!filter ? "active" : ""}" href="/" data-filter="all">全部工具</a>${s.categories.map((c) => pill("category", c)).join("")}</nav><nav class="tag-nav" aria-label="标签">${s.tags.map((t) => pill("tag", t)).join("")}</nav><aside class="notice">${esc(s.settings.notice)}</aside><div class="list-info"><span id="result-count" aria-live="polite">${ordered.filter(visible).length} 个工具</span><label><input id="new-tab" type="checkbox" ${s.settings.new_tab ? "checked" : ""}> 新窗口打开</label></div><section id="tools" class="cards ${s.settings.compact ? "compact" : ""}" aria-label="工具列表">${ordered
    .map((t) => {
      const cat = s.categories.find((c) => c.id === t.category_id);
      return `<article class="card" data-tool="${t.id}" ${visible(t) ? "" : "hidden"}><a class="tool-link" href="${esc(t.url)}" ${s.settings.new_tab ? 'target="_blank"' : ""} rel="noopener noreferrer${t.tag_ids.some((id) => s.tags.find((tag) => tag.id === id)?.name.toLowerCase() === "aff") ? " sponsored" : ""}">${s.settings.no_images ? "" : `<span class="icon"><img src="${esc(t.icon || "/placeholder.svg")}" alt="" width="32" height="32" loading="lazy" decoding="async"></span>`}<span class="card-copy"><strong>${esc(t.name)}</strong><span class="description">${esc(t.description)}</span></span></a><div class="card-meta">${t.tag_ids
        .map((id) => s.tags.find((tag) => tag.id === id))
        .filter((x) => !!x)
        .map(
          (tag) =>
            `<a href="/tag/${encodeURIComponent(tag.slug)}" data-filter="tag" data-id="${tag.id}" class="badge tag">${esc(tag.name)}</a>`,
        )
        .join(
          "",
        )}${cat ? `<a href="/category/${encodeURIComponent(cat.slug)}" data-filter="category" data-id="${cat.id}" class="badge">${esc(cat.name)}</a>` : ""}</div></article>`;
    })
    .join(
      "",
    )}${s.settings.show_engines ? s.search_engines.map((e) => `<article class="card web-search-card" data-web-search hidden><a class="tool-link" data-search-template="${esc(e.url_template)}" rel="noopener noreferrer"><span class="icon"><img src="${esc(e.icon || "/placeholder.svg")}" alt="" width="32" height="32" loading="lazy"></span><span class="card-copy"><strong>用 ${esc(e.name)} 搜索 ↗</strong><span class="description search-keyword"></span></span></a></article>`).join("") : ""}</section><p id="empty" hidden>没有找到匹配的工具，试试其他关键词。</p><footer><span>Diaopicks · 阿刁的精选收藏</span><a href="/admin">管理</a></footer></main><div id="pet-zone" aria-label="可乐的活动区域"><div id="pet-root" data-css="${assets.petCss}"></div></div><button class="theme-toggle" id="theme-toggle" aria-label="切换明暗主题">◐</button><script id="public-data" type="application/json">${json(s)}</script><script type="module" src="${assets.public}"></script></body></html>`;
}
export function renderAdmin() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diaopicks 管理</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="${assets.adminCss}"></head><body><div id="admin-root">正在读取管理数据…</div><script type="module" src="${assets.admin}"></script></body></html>`;
}
