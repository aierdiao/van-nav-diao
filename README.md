# van-nav-diao / 刁页

This repository is a fork of [thirsty5034/van-nav](https://github.com/thirsty5034/van-nav).

The upstream fork is based on the original [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav).

本仓库是 [thirsty5034/van-nav](https://github.com/thirsty5034/van-nav) 的公开 fork。

上游 fork 基于原始项目 [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav)。

## Differences / 与上游的差异

This fork is customized for [diao.page](https://diao.page/). Compared with the upstream navigation project, it keeps the lightweight Van Nav base while adding and retaining these DIAO-specific changes:

- category and tag SEO URLs such as `/category/{slug}` and `/tag/{slug}`, with editable slugs, generated sitemap, and `llms.txt`;
- clickable tool tags, affiliate labels, tag-aware search, and migration from the old `阿刁有返利` category to the `Aff` tool tag;
- compact card layout with two-line descriptions, category plus optional tags, mobile two-column cards, and stable fallback icons;
- admin description length control, category sorting, per-category tool sorting, search engine management, WebDAV backup, and full config import/export with new fields;
- Chrome bookmark import/export, preserving folder/category order and bookmark order where possible;
- selected upstream v2.4.2 security and maintenance fixes, plus local schema/data migrations for this customized site;
- basic SEO, accessibility, and PageSpeed-oriented cache/service-worker improvements.

本 fork 面向 [diao.page](https://diao.page/) 定制。在保留 Van Nav 轻量导航站底座的基础上，主要差异包括：

- 分类页和标签页 URL：`/category/{slug}`、`/tag/{slug}`，支持后台自定义 slug，并自动生成 sitemap 和 `llms.txt`；
- 工具级标签、可点击标签、`Aff` 返利标签、标签搜索，以及旧 `阿刁有返利` 分类到 `Aff` 标签的迁移；
- 更紧凑的卡片布局：两行描述、底部分类和可选标签、移动端双列、稳定的图标兜底；
- 后台描述长度限制、分类排序、分类内工具排序、搜索引擎管理、WebDAV 备份，以及支持新版字段的全局导入导出；
- Chrome 书签导入导出，尽量保留文件夹顺序和书签顺序；
- 选择性吸收上游 v2.4.2 的安全和维护修复，并包含当前定制站点所需的数据结构迁移；
- 基础 SEO、无障碍和 PageSpeed/cache/service-worker 优化。

## Docker Compose

This fork includes a `docker-compose.yml` for self-hosted deployment:

```bash
docker compose up -d --build
```

Data is mounted from `./data` to `/app/data`, so `nav.db` and runtime secrets stay outside the container.

本 fork 已包含 `docker-compose.yml`，可直接用于自托管部署：

```bash
docker compose up -d --build
```

数据目录会从 `./data` 挂载到容器内 `/app/data`，`nav.db` 和运行时密钥会保留在容器外。

## License

This project keeps the original MIT License. See [LICENSE](./LICENSE).
