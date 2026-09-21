# 部署与恢复

## 唯一现行架构

Workers `diaopicks`，D1 `diaopicks-db`，私有 R2 `diaopicks-media`。使用 `wrangler.jsonc` 配置；管理授权通过 Cloudflare Access。不要恢复旧 Go、Docker、CRA、密码登录、WebDAV 或版本管理后台。

## 部署

1. `npm ci`，`npm run check`，`npm test`，`npm run build`。
2. `git diff --check`，`git status --short`，`git branch --show-current`。
3. 如有新迁移，先备份，执行 `npx wrangler d1 migrations apply diaopicks-db --remote`。
4. `npx wrangler deploy --dry-run` 后执行 `npx wrangler deploy`。
5. 用真实浏览器验收公开页和管理页，分别检查发布状态、媒体、Access 防绕过。推送代码不等于部署。

公开 JS/CSS 内容哈希变化即新资源。猫咪素材版本改变时应改文件路径避免旧缓存。旧 Service Worker 地址持续返回退役脚本（no-store），新页面也主动清理旧 Workbox 注册和已知缓存。离线旧浏览器需恢复联网后才能取得退役脚本；无法远程删除离线设备的缓存。

## 当前资源与切换状态

- 2026-09-21 正式域名已切换到 Worker；`www` 与 HTTP 保留到 HTTPS 主域名的路径/查询参数跳转。旧 VPS 网站容器已停止且禁用自动重启，原始卷保留用于恢复；其他 VPS 应用不变。
- `/admin` 为后台入口，Access 管理员为现有站点所有者。Access 应用同时覆盖正式域名及 workers.dev 的 `/admin`、`/admin/*`、`/api/admin`、`/api/admin/*`；Worker 自身再次校验身份。
- 10 个旧图片引用因空文件、HTML/错误页面或不可获取而以占位显示；完整私有迁移清单在 `local-output/rebuild/migration-report.json`。这些条目的名称与完整业务链接仍保留，可在后台上传替换图标。
- Cloudflare 本站自动 Web Analytics 注入已停用，避免额外前端脚本；历史统计配置保留。

## 备份

在非公开目录执行：

```sh
mkdir -p local-output/backups/DATE
npx wrangler d1 export diaopicks-db --remote --output local-output/backups/DATE/database.sql
```

后台 `/api/admin/export` 可导出 `diaopicks/v2` 业务 JSON，包含隐藏内容，仅限管理员，不能公开。备份时先暂停后台编辑，D1 与 R2 必须来自同一冻结窗口。完整备份还须导出 R2 全部 `uploads/`、发布快照及媒体清单；保留哈希、大小和 MIME。可用 `scripts/backup-r2.mjs`，需要 Cloudflare API Token 放入环境变量，或使用当前 Wrangler 登录。运行 `node scripts/backup-r2.mjs local-output/backups/DATE/r2`，结果清单为 `objects.json`。备份命令不输出令牌。

首次迁移原始 SQLite、媒体缓存、必要配置及源代码归档只保存在私有恢复目录。原数据库可能含旧认证/备份凭据，按敏感资料保存，不直接导入新 D1。

## 恢复

- 优先恢复到**新的** D1 和 R2，导入完整 D1 SQL，按原 key 上传 R2 对象，修改绑定，验证后切换。不要直接覆盖仍有新增数据的生产库。
- 完整业务 JSON 可用 `scripts/restore-business.mjs` 生成 SQL，导入空的已建表数据库；媒体需另行恢复。导入后从 D1 重新发布，而不是人工维护公开快照。
- 代码回滚可用 Wrangler 的版本回滚，但它不会回滚数据库或 R2。
- 切换后回滚前先冻结新后台写入并导出最新 D1/R2，核对切换后新增修改，再决定恢复新架构上一版本或转换业务数据。不要只将域名指回旧 SQLite 丢弃新增内容。
- 旧容器停机保留原卷；不要同时开放两套后台写入。不删除旧卷或回收旧服务器上的其他应用。

## 故障处理

- 保存成功但未发布：后台明确显示待发布；点击发布。
- 发布失败：上一版继续可用，检查媒体缺失或存储错误后重试。
- 不依赖单点缓存清除宣称全球更新，允许约 60 秒窗口，最后以浏览器内容与发布版本核实。
- 有效 Access 会话仍 401：核对 `ACCESS_ISSUER`、`ACCESS_AUD`、管理员邮箱及 Access 应用保护范围；不能临时移除身份检查。
- 图片引用失败：替换上传并保存、发布；不要启用访客触发的外部 favicon 请求。

## 首次上线的恢复材料

本地私有 `local-output/rebuild/backups/` 保存：

- `original.tar.gz`、`nav.db`：一致的旧 SQLite、媒体缓存和必要配置；`source-main.tar.gz`：旧源码。
- `dns-before.json`：切换前 DNS；仅站点 A 记录被替换，邮件记录不变。
- `d1-after-validation.sql`、`business-final.json`：清理验收数据后的最终业务备份，176 工具，发布版本 21。
- `r2-final/`：120 个上传图片及实际存在的发布产物，`manifest.json` 记录哈希和不存在的发布版本。保存与发布分离，因此不是每个保存版本都存在发布产物。

最终 SQL 与 JSON 分别恢复到临时 SQLite 并检查完整性、外键及 URL；120 个图片对象均按 SHA-256 核对通过。这些检查不等同于完整云端灾难恢复演练。不要将较早测试期间的导出替代最终备份，也不要把整个恢复目录上传到公开仓库。
