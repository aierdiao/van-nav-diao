## van-nav-diao v1.0.3

### 更新内容

#### 安全与稳定性修复

- **SSRF DNS 重绑定防护**：`FetchPageInfoHandler` 新增域名解析后的内网地址判断，避免攻击者通过域名绕过 IP 字面量检查。
- **Handler 吞错修复**：`UpdateTool`、`UpdateUser`、`AddCatelog`、`UpdateCatelog` 不再忽略 service 层错误，失败时返回 HTTP 500。
- **字符串切片越界修复**：修复 `extractDomain`、`GetSuffixFromUrl`、`getIcon` 等短字符串或空字符串场景的 panic 风险。
- **备份恢复流程修复**：`RestoreFromBackup` 改为先写临时文件再原子 rename，失败时回滚并重新初始化数据库连接，避免残留 nil DB。
- **数据库迁移错误可见化**：迁移阶段的 `DB.Exec` 统一通过辅助函数记录失败日志，避免静默失败。
- **API 路径判断修复**：`strings.Contains(path, "/api")` 改为 `strings.HasPrefix(path, "/api/")`，避免误匹配普通页面路径。

#### SEO 与缓存

- **Sitemap 增加 `<lastmod>`**：站点地图条目新增当日日期，帮助搜索引擎判断页面新鲜度。
- **首页缓存 TTL 调整**：首页数据缓存从 5 秒提升到 60 秒；后台写操作仍会主动失效缓存。
- **API 请求去掉 cache-bust 参数**：前端不再为所有 `/api/` GET 请求附加 `_t=Date.now()`，恢复正常 HTTP 缓存语义。
- **静态资源协商缓存修复**：`ServeContent` 不再传入 `time.Now()` 作为 modtime，避免浏览器条件请求永远无法命中 304。

#### 图标与性能

- **favicon 并发去重**：缓存未命中时通过 `singleflight` 合并同一 URL 的并发抓取，减少外部请求风暴。
- **兜底图缓存行为修正**：移除对 302 fallback 响应设置长期 immutable 缓存头的无效做法。
- **linkcheck 重复写入清理**：移除 goroutine 内独立写入，避免和末尾批量更新重复。

#### CI / Docker

- **Docker 镜像目标修复**：GitHub Actions Docker workflow 发布到当前 fork 包 `ghcr.io/aierdiao/van-nav-diao`，不再指向上游 `thirsty5034/van-nav`。

### Docker 镜像

```bash
docker pull ghcr.io/aierdiao/van-nav-diao:1.0.3
docker pull ghcr.io/aierdiao/van-nav-diao:latest
```

Compose 推荐继续使用：

```bash
mkdir -p van-nav-diao && cd van-nav-diao
mkdir -p data
curl -fsSL https://raw.githubusercontent.com/aierdiao/van-nav-diao/main/docker-compose.yml -o docker-compose.yml
docker compose pull
docker compose up -d
```

### 升级说明

1. 升级前建议备份 `data/nav.db`。
2. 本版本不包含数据库 Schema 破坏性变更，可直接升级。
3. 首页缓存 TTL 调整为 60 秒；后台写操作会主动失效缓存，正常情况下前台仍会很快更新。
4. 前端 API 请求不再附加时间戳参数，浏览器和代理层会按 HTTP 语义处理缓存。

### 验证建议

```powershell
git diff --check
go test ./...
pnpm --dir ui exec tsc --noEmit
docker build -t ghcr.io/aierdiao/van-nav-diao:1.0.3 .
```

发布后检查：

- GitHub Release body 是否为本文件内容。
- `ghcr.io/aierdiao/van-nav-diao:1.0.3` 是否可拉取。
- `ghcr.io/aierdiao/van-nav-diao:latest` 是否更新。
- `/sitemap.xml`、`/api/`、首页和后台是否正常。

### 已知风险

- 本版本包含安全、缓存、备份恢复和 Docker workflow 等底层修复，升级前请保留数据库备份。
- 如果 GitHub Actions 推 GHCR 失败，优先检查 workflow 是否仍指向上游镜像，其次检查仓库 Actions workflow permissions。
