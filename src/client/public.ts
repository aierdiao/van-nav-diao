import "./public.css";
import type { Snapshot } from "../shared";
const data: Snapshot = JSON.parse(
  document.querySelector("#public-data")!.textContent!,
);
const search = document.querySelector<HTMLInputElement>("#search")!,
  newTab = document.querySelector<HTMLInputElement>("#new-tab")!;
const cards = new Map(
  [...document.querySelectorAll<HTMLElement>("[data-tool]")].map((e) => [
    Number(e.dataset.tool),
    e,
  ]),
);
const read = (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  write = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };
let composing = false;
function apply() {
  const url = new URL(location.href),
    parts = url.pathname.split("/");
  const selected = (parts[1] === "category" ? data.categories : data.tags).find(
    (x) => x.slug === decodeURIComponent(parts[2] || ""),
  );
  const keyword = search.value.trim();
  const q = keyword.toLocaleLowerCase();
  let n = 0;
  const ordered = [...data.tools].sort((a, b) =>
    parts[1] === "category"
      ? a.category_sort - b.category_sort || a.sort - b.sort || a.id - b.id
      : a.sort - b.sort || a.id - b.id,
  );
  for (const t of ordered) {
    const el = cards.get(t.id)!;
    const matches =
      (!selected ||
        (parts[1] === "category"
          ? t.category_id === selected.id
          : t.tag_ids.includes(selected.id))) &&
      (!q ||
        [
          t.name,
          t.description,
          t.url,
          ...t.tag_ids.map(
            (id) => data.tags.find((tag) => tag.id === id)?.name || "",
          ),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(q));
    el.hidden = !matches;
    if (matches) n++;
    document.querySelector("#tools")!.append(el);
  }
  for (const card of document.querySelectorAll<HTMLElement>(
    "[data-web-search]",
  )) {
    card.hidden = !keyword;
    const link = card.querySelector<HTMLAnchorElement>("a")!;
    if (keyword)
      link.href = link.dataset.searchTemplate!.replaceAll(
        "{query}",
        encodeURIComponent(keyword),
      );
    else link.removeAttribute("href");
    card.querySelector(".search-keyword")!.textContent = `「${keyword}」`;
    document.querySelector("#tools")!.append(card);
  }
  for (const link of document.querySelectorAll<HTMLElement>(".pill"))
    link.classList.toggle(
      "active",
      !selected
        ? link.dataset.filter === "all"
        : link.dataset.filter === parts[1] &&
            Number(link.dataset.id) === selected.id,
    );
  document.querySelector("#result-count")!.textContent = `${n} 个工具`;
  document.querySelector<HTMLElement>("#empty")!.hidden = n !== 0;
}
function persist() {
  const u = new URL(location.href);
  search.value
    ? u.searchParams.set("q", search.value)
    : u.searchParams.delete("q");
  u.searchParams.delete("engine");
  history.replaceState(null, "", u);
  apply();
}
function restore() {
  const u = new URL(location.href);
  search.value = u.searchParams.get("q") || "";
  apply();
}
search.addEventListener("compositionstart", () => (composing = true));
search.addEventListener("compositionend", () => {
  composing = false;
  persist();
});
search.addEventListener("input", () => {
  if (!composing) persist();
});
document.querySelector("#search-form")!.addEventListener("submit", (e) => {
  e.preventDefault();
  if (composing) return;
  persist();
});
document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("a[data-filter]");
  if (
    !a ||
    (e instanceof MouseEvent &&
      (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0))
  )
    return;
  e.preventDefault();
  const u = new URL(a.href);
  if (search.value) u.searchParams.set("q", search.value);
  history.pushState(null, "", u);
  restore();
});
window.addEventListener("popstate", restore);
window.addEventListener("pageshow", restore);
document.addEventListener("keydown", (e) => {
  if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape") {
    search.value = "";
    persist();
    search.blur();
    return;
  }
  const target = e.target as HTMLElement;
  if (
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) ||
    target.isContentEditable
  )
    return;
  if (e.key === "/") {
    e.preventDefault();
    search.focus();
  }
  if (e.key === "Escape") {
    search.value = "";
    persist();
  }
});
function targets() {
  document
    .querySelectorAll<HTMLAnchorElement>(".tool-link")
    .forEach((a) => (a.target = newTab.checked ? "_blank" : "_self"));
}
const preference = read("diaopicks-new-tab");
if (preference !== null) newTab.checked = preference === "1";
targets();
newTab.addEventListener("change", () => {
  write("diaopicks-new-tab", newTab.checked ? "1" : "0");
  targets();
});
document.querySelector("#theme-toggle")!.addEventListener("click", () => {
  const dark = document.documentElement.classList.toggle("dark-mode");
  write("diaopicks-theme", dark ? "dark" : "light");
});
document.querySelectorAll<HTMLImageElement>(".icon img").forEach((img) => {
  img.addEventListener("error", () => img.classList.add("broken"));
  if (img.complete && !img.naturalWidth) img.classList.add("broken");
});
restore();
// Retire old Workbox registrations and only their known cache families.
if ("serviceWorker" in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      for (const reg of regs) {
        if (new URL(reg.scope).origin === location.origin)
          await reg.unregister();
      }
      if ("caches" in window) {
        for (const name of await caches.keys())
          if (
            name.startsWith("workbox-") ||
            ["static-assets", "favicon-api"].includes(name)
          )
            await caches.delete(name);
      }
    })
    .catch(() => {});
}
const loadPet = () => {
  if (!document.querySelector("link[data-pet]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = document.querySelector<HTMLElement>("#pet-root")!.dataset.css!;
    link.dataset.pet = "1";
    document.head.append(link);
  }
  void import("./pet").then((m) => m.mountPet()).catch(() => {});
};
if ("requestIdleCallback" in window)
  window.requestIdleCallback(loadPet, { timeout: 3000 });
else setTimeout(loadPet, 1800);
document.addEventListener("visibilitychange", loadPet, { once: true });
