import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Dataset, Publication } from "../shared";
import "./admin.css";
type Entity =
  | "tools"
  | "categories"
  | "tags"
  | "search_engines"
  | "settings"
  | "media";
type Row = Record<string, unknown>;
const titles: Record<Entity, string> = {
  tools: "工具",
  categories: "分类",
  tags: "标签",
  search_engines: "搜索引擎",
  settings: "站点设置",
  media: "图片",
};
async function request(path: string, method = "GET", body?: unknown) {
  const r = await fetch("/api/admin" + path, {
    method,
    headers:
      method === "GET"
        ? {}
        : { "Content-Type": "application/json", "X-Diaopicks-Request": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw new Error("登录状态已过期，请刷新页面重新登录");
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "请求失败");
  return d;
}
function App() {
  const [data, setData] = useState<Dataset | null>(null),
    [state, setState] = useState<Publication | null>(null),
    [entity, setEntity] = useState<Entity>("tools"),
    [edit, setEdit] = useState<Row | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [media, setMedia] = useState<Row[]>([]);
  async function load() {
    const r = await request("/data");
    setData(r.data);
    setState(r.state);
  }
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }
  const rows: Row[] = !data
    ? []
    : entity === "media"
      ? media
      : entity === "settings"
        ? [data.settings as unknown as Row]
        : (data[entity] as unknown as Row[]);
  function select(e: Entity) {
    setEntity(e);
    setEdit(null);
    setQuery("");
    if (e === "media") void run(async () => setMedia(await request("/media")));
  }
  function fresh() {
    const id = Math.max(0, ...rows.map((r) => Number(r.id))) + 1;
    const sort = Math.max(0, ...rows.map((r) => Number(r.sort))) + 1;
    const base = { id, name: "", sort, hidden: 0 };
    setEdit(
      entity === "tools"
        ? {
            ...base,
            url: "",
            description: "",
            icon: "",
            category_id: null,
            category_sort: sort,
            tag_ids: [],
          }
        : entity === "search_engines"
          ? {
              ...base,
              url_template: "https://www.google.com/search?q={query}",
              description: "",
              icon: "",
            }
          : { ...base, slug: "" },
    );
  }
  async function save() {
    if (!edit) return;
    await request("/" + entity + "/" + edit.id, "PUT", edit);
    setEdit(null);
    await load();
    setMessage("保存成功，尚未发布。确认后点击“发布到前台”。");
  }
  async function remove(row: Row) {
    if (!confirm("删除“" + (row.name || "此项") + "”？发布后才会从前台移除。"))
      return;
    await request("/" + entity + "/" + row.id, "DELETE", {});
    await load();
    setEdit(null);
    setMessage("删除已保存，尚未发布。");
  }
  async function upload(file: File) {
    const r = await fetch("/api/admin/media", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Diaopicks-Request": "1",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    if (edit)
      setEdit({ ...edit, [entity === "settings" ? "favicon" : "icon"]: d.url });
    setMessage("图片上传成功，请保存并发布对应条目。");
    setMedia(await request("/media"));
  }
  function field(k: string, label: string, type = "text") {
    if (!edit) return null;
    return (
      <label key={k}>
        {label}
        {type === "checkbox" ? (
          <input
            type="checkbox"
            checked={Boolean(edit[k])}
            onChange={(e) =>
              setEdit({ ...edit, [k]: Number(e.target.checked) })
            }
          />
        ) : type === "textarea" ? (
          <textarea
            value={String(edit[k] ?? "")}
            onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
          />
        ) : (
          <input
            type={type}
            required={["name", "url", "slug", "title", "url_template"].includes(
              k,
            )}
            value={String(edit[k] ?? "")}
            onChange={(e) =>
              setEdit({
                ...edit,
                [k]:
                  type === "number" ? Number(e.target.value) : e.target.value,
              })
            }
          />
        )}
      </label>
    );
  }
  return (
    <div className="admin">
      <header>
        <a href="/">← Diaopicks</a>
        <h1>内容管理</h1>
        <a href="/cdn-cgi/access/logout">退出登录</a>
      </header>
      <section className="publish">
        <div>
          <strong>
            {state
              ? state.revision === state.published_revision
                ? "当前内容已发布"
                : "有尚未发布的修改"
              : "正在载入"}
          </strong>
          <p>
            保存版本 {state?.revision ?? "—"} · 发布版本{" "}
            {state?.published_revision ?? "—"}
            {state?.published_at
              ? " · " + new Date(state.published_at).toLocaleString()
              : ""}
          </p>
          {state?.last_error && (
            <p className="error">上次发布：{state.last_error}</p>
          )}
        </div>
        <button
          disabled={busy || !data}
          onClick={() =>
            void run(async () => {
              await request("/publish", "POST", {});
              await load();
              setMessage("发布成功，公开页面将在最多约 60 秒内更新。");
            })
          }
        >
          发布到前台
        </button>
      </section>
      <p className="message" role="status">
        {message}
      </p>
      <nav>
        {Object.entries(titles).map(([key, label]) => (
          <button
            key={key}
            className={entity === key ? "selected" : ""}
            onClick={() => select(key as Entity)}
          >
            {label}
          </button>
        ))}
        <a href="/api/admin/export">导出业务 JSON</a>
      </nav>
      <div className="toolbar">
        <h2>
          {titles[entity]} <small>{rows.length}</small>
        </h2>
        {entity !== "settings" && entity !== "media" && (
          <>
            <input
              aria-label="搜索管理条目"
              placeholder="查找条目…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button disabled={busy} onClick={fresh}>
              ＋ 新增
            </button>
          </>
        )}
        {entity === "settings" && data && (
          <button onClick={() => setEdit({ ...data.settings })}>
            编辑设置
          </button>
        )}
        {entity === "media" && (
          <label className="upload">
            上传图片
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void run(() => upload(f));
              }}
            />
          </label>
        )}
      </div>
      {entity === "media" ? (
        <div className="media-grid">
          {media.map((m) => (
            <article key={String(m.key)}>
              <img alt="" src={"/api/admin/media/" + m.key} />
              <p>{String(m.name)}</p>
              <small>{Math.ceil(Number(m.size) / 1024)} KB</small>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText("/media/" + m.key);
                  setMessage("图片路径已复制，可粘贴到工具图标字段。");
                }}
              >
                复制图片路径
              </button>
            </article>
          ))}
        </div>
      ) : entity === "settings" ? (
        <p>管理标题、简介、图标、提示文案与展示偏好。修改后需发布。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>分类 / 路径</th>
                <th>排序</th>
                {entity === "tools" && <th>分类内排序</th>}
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) =>
                  [r.name, r.url, r.description]
                    .join(" ")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((r) => (
                  <tr key={Number(r.id)}>
                    <td>
                      <strong>{String(r.name)}</strong>
                      {r.description ? (
                        <small>{String(r.description)}</small>
                      ) : null}
                    </td>
                    <td>
                      {entity === "tools"
                        ? data?.categories.find((c) => c.id === r.category_id)
                            ?.name || "—"
                        : String(r.slug || r.url_template || "")}
                    </td>
                    <td>{Number(r.sort)}</td>
                    {entity === "tools" && <td>{Number(r.category_sort)}</td>}
                    <td>{r.hidden ? "隐藏" : "显示"}</td>
                    <td>
                      <button disabled={busy} onClick={() => setEdit({ ...r })}>
                        编辑
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await request("/" + entity + "/" + r.id, "PUT", {
                              ...r,
                              hidden: r.hidden ? 0 : 1,
                            });
                            await load();
                            setMessage("显示状态已保存，尚未发布。");
                          })
                        }
                      >
                        {r.hidden ? "显示" : "隐藏"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <div className="dialog-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            className="editor"
          >
            <h2 id="edit-title">编辑{titles[entity]}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(save);
              }}
            >
              {entity === "settings" ? (
                <>
                  {field("title", "站点标题")}
                  {field("description", "站点简介", "textarea")}
                  {field("notice", "前台提示文案", "textarea")}
                  {field("favicon", "站点图标路径")}
                  {field("columns", "桌面列数（2—6）", "number")}
                  {field("new_tab", "默认新窗口打开", "checkbox")}
                  {field("show_engines", "显示搜索引擎", "checkbox")}
                  {field("compact", "紧凑模式", "checkbox")}
                  {field("no_images", "不显示工具图片", "checkbox")}
                </>
              ) : (
                <>
                  {field("name", "名称")}
                  {entity === "tools" && (
                    <>
                      {field("url", "完整链接（含返利参数）")}
                      {field("description", "描述", "textarea")}
                      <label>
                        分类
                        <select
                          value={String(edit.category_id ?? "")}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              category_id: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        >
                          <option value="">无分类</option>
                          {data?.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {c.hidden ? "（隐藏）" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <fieldset>
                        <legend>标签</legend>
                        {data?.tags.map((t) => (
                          <label key={t.id}>
                            <input
                              type="checkbox"
                              checked={(edit.tag_ids as number[]).includes(
                                t.id,
                              )}
                              onChange={(e) =>
                                setEdit({
                                  ...edit,
                                  tag_ids: e.target.checked
                                    ? [...(edit.tag_ids as number[]), t.id]
                                    : (edit.tag_ids as number[]).filter(
                                        (id) => id !== t.id,
                                      ),
                                })
                              }
                            />
                            {t.name}
                          </label>
                        ))}
                      </fieldset>
                      {field(
                        "category_sort",
                        "分类内排序（小值优先）",
                        "number",
                      )}
                    </>
                  )}
                  {(entity === "categories" || entity === "tags") &&
                    field("slug", "路径标识（保留原值可保持旧链接）")}
                  {entity === "search_engines" && (
                    <>
                      {field(
                        "url_template",
                        "搜索地址（用 {query} 代替关键词）",
                      )}
                      {field("description", "说明", "textarea")}
                    </>
                  )}
                  {(entity === "tools" || entity === "search_engines") &&
                    field("icon", "图片路径")}
                  {field("sort", "全局排序（小值优先）", "number")}
                  {field("hidden", "隐藏", "checkbox")}
                </>
              )}
              {(entity === "tools" ||
                entity === "settings" ||
                entity === "search_engines") && (
                <label>
                  上传 / 替换图片（不超过 2 MB）
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void run(() => upload(f));
                    }}
                  />
                </label>
              )}
              <div className="editor-actions">
                <button disabled={busy} type="submit">
                  保存
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEdit(null)}
                >
                  取消
                </button>
                {entity !== "settings" && (
                  <button
                    className="danger"
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => remove(edit))}
                  >
                    删除
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.querySelector("#admin-root")!).render(<App />);
