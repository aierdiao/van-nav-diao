# Diaopicks

轻量工具收藏与导航站。Cloudflare Workers + Static Assets + D1 + R2，TypeScript / Hono；公开页完整 HTML 与渐进增强，React 仅用于后台和延迟加载的可乐猫咪。

## 开发

```sh
npm ci
npm run build
npm run types
npx wrangler d1 migrations apply diaopicks-db --local
npm run dev
```

空库需先导入业务数据并发布。公开页无业务 API 前置依赖；后台始终需要 Cloudflare Access，开发服务器没有免验证后门。

```sh
npm run check
npm test
npm run build
npx wrangler deploy --dry-run
```

## 数据与发布

- D1 保存工具、分类、标签关系、排序、搜索引擎、基本设置和媒体登记，是唯一业务权威数据源。
- R2 私有桶保存 `uploads/` 图片、`releases/` 派生历史快照和 `published/current.json`。不启用 r2.dev 或桶级公开访问。
- 保存只更新 D1。发布读取一致快照，剔除隐藏数据，检查图片存在，再使用 R2 ETag 条件写入切换当前快照。并发旧版本无法覆盖新版本，失败不破坏上一份内容。
- 公开内容缓存 30 秒，HTML 最多再缓存 30 秒，更新延迟上限约 60 秒。管理响应 `private,no-store`；哈希 JS/CSS 一年缓存；媒体需在当前公开快照白名单内才可读取。
- `/admin` 与 `/api/admin/*` 受 Access 及服务端签名、issuer、audience、邮箱授权校验保护，`workers.dev` 也不能绕过。写操作要求同源 Origin 和自定义请求头。
- 只接受有正确文件签名且不超过 2 MB 的 PNG/JPEG/WebP/GIF/ICO。SVG 不接受；没有任意 URL 抓取代理。替换图片会产生新内容哈希，旧对象保留以便恢复。
- `/category/{slug}`、`/tag/{slug}` 是浏览链接。没有 SEO 后台、逐页 SEO 字段、llms.txt、PWA、密码/JWT 用户系统或 VPS 运行依赖。

## 迁移、备份与恢复

详细操作见 [部署与恢复](docs/operations.md)。后台提供简单业务 JSON 导出。完整恢复必须同时备份 D1 与 R2，公开快照不能替代完整备份。旧原始数据、旧源码和迁移核对材料放在被忽略的 `local-output/`，不得提交。

## 来源与许可证

本仓库源自 [thirsty5034/van-nav](https://github.com/thirsty5034/van-nav)，上游基于 [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav)。本次重写运行架构，保留导航体验及 Diaopicks 原 ColaPet 组件、素材、对白。原 MIT 许可证与 WangLu 版权声明保留于 [LICENSE](LICENSE)。
