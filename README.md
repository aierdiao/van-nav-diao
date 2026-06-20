# van-nav-diao / 刁页

This repository is a fork of [thirsty5034/van-nav](https://github.com/thirsty5034/van-nav).

The upstream fork is based on the original [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav).

本仓库是 [thirsty5034/van-nav](https://github.com/thirsty5034/van-nav) 的公开 fork。

上游 fork 基于原始项目 [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav)。

## 与上游的差异

本 fork 面向 [diao.page](https://diao.page/) 定制。在保留 Van Nav 轻量导航站底座的基础上，主要差异包括：

- 分类页和标签页 URL：`/category/{slug}`、`/tag/{slug}`，支持后台自定义 slug，并自动生成 sitemap 和 `llms.txt`；
- 工具级标签、可点击标签、`Aff` 返利标签、标签搜索；
- 更紧凑的卡片布局：两行描述、底部分类和可选标签、移动端双列、稳定的图标兜底；
- 后台描述长度限制、分类排序、分类内工具排序，以及支持新版字段的全局导入导出；
- Chrome 书签导入导出，尽量保留文件夹顺序和书签顺序；
- 选择性吸收上游 v2.4.2 的安全和维护修复，并包含当前定制站点所需的数据结构迁移；
- 基础 SEO、无障碍和 PageSpeed/cache/service-worker 优化。

## Docker Compose 一键快速启用

在云服务器终端执行以下命令。无论目录是否已存在，都可以用这一组命令拉取最新公开 Compose 配置并启动：

```bash
mkdir -p van-nav-diao && cd van-nav-diao
mkdir -p data
curl -fsSL https://raw.githubusercontent.com/aierdiao/van-nav-diao/main/docker-compose.yml -o docker-compose.yml
docker compose pull
docker compose up -d
```

部署完成后访问：

- 前台：`http://服务器IP:6412`
- 后台：`http://服务器IP:6412/admin`
- 初始账号/密码：`admin` / `admin`

首次登录后请立即修改后台密码。数据会保存在当前目录的 `./data` 中；如果 `./data/nav.db` 已存在，会继续使用现有数据库。后台支持从 Chrome 书签 HTML 文件快速导入网址。

这套命令始终从 `main` 拉取最新公开 Compose 文件，使用 `ghcr.io/aierdiao/van-nav-diao:latest` 镜像，并把 `./data` 挂载到容器内 `/app/data`。

Compose 配置如下：

```yaml
services:
  van-nav:
    image: ghcr.io/aierdiao/van-nav-diao:latest
    container_name: van-nav
    restart: unless-stopped
    ports:
      - "6412:6412"
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Shanghai
```

## Differences From Upstream

This fork is customized for [diao.page](https://diao.page/). Compared with the upstream navigation project, it keeps the lightweight Van Nav base while adding and retaining these DIAO-specific changes:

- category and tag SEO URLs such as `/category/{slug}` and `/tag/{slug}`, with editable slugs, generated sitemap, and `llms.txt`;
- clickable tool tags, affiliate labels, tag-aware search, and migration from the old `阿刁有返利` category to the `Aff` tool tag;
- compact card layout with two-line descriptions, category plus optional tags, mobile two-column cards, and stable fallback icons;
- admin description length control, category sorting, per-category tool sorting, search engine management, WebDAV backup, and full config import/export with new fields;
- Chrome bookmark import/export, preserving folder/category order and bookmark order where possible;
- selected upstream v2.4.2 security and maintenance fixes, plus local schema/data migrations for this customized site;
- basic SEO, accessibility, and PageSpeed-oriented cache/service-worker improvements.

## Docker Compose Quick Start

Run these commands on a cloud server. They refresh the public Compose file from `main`, pull `ghcr.io/aierdiao/van-nav-diao:latest`, and start the container:

```bash
mkdir -p van-nav-diao && cd van-nav-diao
mkdir -p data
curl -fsSL https://raw.githubusercontent.com/aierdiao/van-nav-diao/main/docker-compose.yml -o docker-compose.yml
docker compose pull
docker compose up -d
```

After deployment, open:

- Public site: `http://SERVER_IP:6412`
- Admin panel: `http://SERVER_IP:6412/admin`
- Initial account/password: `admin` / `admin`

Change the password after the first login. Data is stored in `./data`, and an existing `./data/nav.db` will be reused. The admin panel can import Chrome bookmark HTML files.

Compose file:

```yaml
services:
  van-nav:
    image: ghcr.io/aierdiao/van-nav-diao:latest
    container_name: van-nav
    restart: unless-stopped
    ports:
      - "6412:6412"
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Shanghai
```

## License

This project keeps the original MIT License. See [LICENSE](./LICENSE).
