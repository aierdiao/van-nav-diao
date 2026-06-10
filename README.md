# Van Nav

<p align="center">
  <a href="#chinese">🇨🇳 中文</a> · <a href="#english">🇺🇸 English</a>
</p>

一个轻量的导航站，支持搜索引擎集成，适合作为主页使用。有配套的[浏览器插件](https://github.com/Mereithhh/van-nav-extension)和 API。

> 本项目 fork 自 [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav)，在原版基础上进行了架构重构、安全加固和工程化改进。详见[与上游项目的区别](#与上游项目的区别)。

<a id="chinese"></a>

> 🌐 **在线 Demo**：[van-nav-73v7.onrender.com](https://van-nav-73v7.onrender.com/)
> （跟随 GitHub Docker 镜像自动部署更新，数据为演示用途，定期重置）

## 预览

### PC 端

<p align="center">
<img src="images/pc-light.png" alt="PC 端浅色模式" width="49%"/>
<img src="images/pc-dark.png" alt="PC 端深色模式" width="49%"/>
</p>

### 移动端

<p align="center">
<img src="images/phone-light.png" alt="移动端浅色模式" width="24%"/>
<img src="images/phone-dark.png" alt="移动端深色模式" width="24%"/>
</p>

### 后台管理

<p align="center">
<img src="images/admin-tools-light.png" alt="工具管理" width="49%"/>
<img src="images/admin-tools-dark.png" alt="工具管理（深色）" width="49%"/>
</p>

<p align="center">
<img src="images/admin-categories.png" alt="分类管理" width="49%"/>
<img src="images/admin-search-engines.png" alt="搜索引擎管理" width="49%"/>
</p>

<p align="center">
<img src="images/admin-api-tokens.png" alt="API Token 管理" width="49%"/>
<img src="images/admin-settings.png" alt="系统设置" width="49%"/>
</p>

## 与上游项目的区别

本项目 fork 自 [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav)（最新代码 `8b9a544`）。以下是本项目相对上游的**新增功能**和**改进差异**。

### 新增功能

#### WebDAV 云备份与恢复

上游无此功能。本项目支持将数据库加密备份到坚果云等 WebDAV 服务：

- 后台可配置 WebDAV 连接信息、备份周期（每日/每周/每月/自定义 cron）
- 备份文件自动 AES-256-GCM 加密，密钥自动生成无需手动配置
- 支持保留策略（不限制/按数量/按天数自动清理过期备份）
- 后台可查看云端备份文件列表，一键恢复指定备份
- 恢复前自动备份当前数据库，防止误操作

#### 全量配置导入导出

上游仅支持工具的导入导出。本项目支持**所有配置**的一键备份和恢复：

- 导出范围：工具、分类、搜索引擎、API Token、系统设置、网站配置
- 导出格式：JSON 文件，可在任意实例间迁移
- 导入时自动按类型处理（分类先清空再写入、Token 按名称去重、设置合并更新）

#### 链接健康检查

上游无此功能。后台可批量检测所有工具链接的存活状态：

- 并发检测（10 路并发，HEAD 请求优先，失败降级 GET）
- 标记每条链接的 HTTP 状态码和存活状态
- 支持一键将失效链接排序到列表末尾

#### 工具描述自动获取

上游无此功能。支持"一键更新描述"批量获取工具页面的 `<title>` 和 `<meta description>`：

- 支持 GBK/GB2312/UTF-8 自动编码识别
- 自动检测反爬页面（验证码等），避免误采集
- 单个工具可通过 `GET /api/admin/fetch-page-info?url=xxx` 获取

#### 部署版本号管理

上游无此功能。编译时通过 ldflags 注入 Git tag 作为版本号，启动时自动同步到数据库：

- 后台「系统设置」页面显示当前部署版本
- 支持通过 API 递增构建号（供 CI/CD 流水线调用）
- 更新部署后版本号自动对齐，无需手动修改

#### Docker Compose 支持

上游无 `docker-compose.yml`。本项目提供开箱即用的 Compose 配置：

```yaml
services:
  van-nav:
    image: ghcr.io/thirsty5034/van-nav:latest
    container_name: van-nav
    restart: unless-stopped
    ports:
      - "6412:6412"
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Shanghai
```

#### GHCR 多架构镜像

上游镜像托管在 Docker Hub。本项目切换到 GitHub Container Registry，支持多架构：

```bash
docker pull ghcr.io/thirsty5034/van-nav:latest
```

支持 `linux/amd64`、`linux/arm64`、`linux/arm`、`darwin/amd64`、`darwin/arm64`。

#### 页面美化功能

上游无此功能。管理后台新增「页面美化」配置页，支持管理员自定义前端页面显示效果：

- **主题色彩**：主色调、页面背景色、卡片背景色、主文字颜色、次文字颜色、边框颜色
- **布局调整**：卡片圆角（8px/12px/16px/20px）、卡片阴影（无/轻微/柔和/明显）、卡片内边距、卡片间距
- **排版设置**：标题字号、标题字重（400/500/600/700）、描述字号
- **自定义 CSS**：支持注入最多 10KB 的自定义 CSS，后端自动净化危险关键字（`expression`、`behavior`、跨域 `url()` 等）
- **预设主题**：7 种预设主题一键填充（经典蓝、科技紫、极简灰、自然绿、日落橙、樱花粉、渐变毛玻璃）
- **CSS 变量驱动**：前端全局采用原生 CSS 变量（`--van-nav-*`），零运行时性能损耗
- **备份集成**：主题配置无缝接入现有导入导出与 WebDAV 备份系统
- **备案栏条件隐藏**：未配置工信部备案信息时，底部备案栏自动隐藏

#### 中英文国际化（i18n）

上游无此功能。本项目实现了完整的前后端中英文双语支持：

- 设置页面语言切换器，一键切换中文/英文界面
- 覆盖 462 个翻译 key（登录页、首页、管理后台全部模块），中英翻译完全对齐
- 语言偏好 localStorage 持久化 + 服务器同步，支持无痕模式降级到浏览器语言
- 独立 `PUT /api/admin/setting/language` API，仅更新语言字段不覆盖其他配置
- 严格区分系统文本（翻译）与用户自定义数据（不翻译），搜索引擎卡片通过独立 `t()` 函数在非 React 上下文中翻译
- `nav_setting` 表新增 `language` 字段，启动时自动迁移

### 安全改进

| 改进项 | 上游 | 本项目 |
|--------|------|--------|
| JWT 密钥 | 每次重启随机生成，所有已签发 token 立即失效 | 持久化到 `./data/jwt_secret`，重启后 token 保持有效 |
| 密码校验 | bcrypt + 明文回退比较 | bcrypt-first，旧版明文密码首次登录自动升级为 bcrypt 哈希 |
| API Token 有效期 | 100 年 | 10 年 |
| 数据库迁移 | `panic(err)` 崩溃并吐栈 trace | `logger.LogError` + `os.Exit(1)`，输出清晰错误信息 |
| 依赖安全 | 存在 98 个 npm 漏洞 + 15 个 Dependabot 告警 | 全部修复 |

### 可靠性改进

| 改进项 | 上游 | 本项目 |
|--------|------|--------|
| goroutine panic 兜底 | 无 `defer/recover`，异步线程 panic 直接崩进程 | 4 个异步路径全部保护 |
| 错误响应 | 5 个删除/更新 Handler 静默吞错后仍返回 200 | 显式返回 HTTP 500 + 错误信息 |
| 批量导入 | 循环内每条记录独立 Prepare + Exec | 事务内复用 Prepared Statement，单次批量提交 |

### 工程化改进

| 改进项 | 上游 | 本项目 |
|--------|------|--------|
| CI 工具链 | Node.js 较旧版本 | Node.js 22 + pnpm 11.4.0 + Go 1.24 |
| Docker 构建 | 单阶段 | 多阶段构建（前端 + 后端 + 运行时分离） |
| 发版流程 | 手动发布 | GoReleaser 自动交叉编译 6 平台 + 结构化 Release Notes |
| 分层架构 | handler 直接调用 database（10 处） | service 层 42 处 + main.go 4 处越级 DB 操作全部消除，30 个 `database/operations.go` 封装函数，handler/main/service 三层零 `database.DB` 引用 |
| 错误处理统一 | `utils.CheckErr()` 静默吞错 | service 层函数签名统一返回 `(T, error)`，handler 层完整 error 响应 |
| 架构断路器 | 无 | `assert_architecture.sh` 编译期三重扫描（handler + main + service），阻止分层违规回归 |

## 使用技巧/快捷键

- 桌面端打开页面后搜索框自动聚焦，可直接输入开始搜索；移动端需点击搜索框
- 搜索后按回车，直接在新标签页打开第一个结果
- 搜索后按对应卡片右上角数字 + Ctrl/Command，直接打开对应结果
- 支持自定义跳转方式（新标签页/当前标签页）

## CHANGELOG

具体请看 [CHANGELOG.md](CHANGELOG.md)

## 安装方法

### Docker

```bash
docker run -d \
  --name van-nav \
  --restart unless-stopped \
  -p 6412:6412 \
  -v ./data:/app/data \
  -e TZ=Asia/Shanghai \
  ghcr.io/thirsty5034/van-nav:latest
```

打开浏览器 [http://localhost:6412](http://localhost:6412) 即可访问。

- 默认端口 `6412`
- 默认账号密码 `admin` / `admin`，首次运行后请进入后台修改
- 数据存储在挂载的 `./data` 目录中

### Docker Compose

新建 `docker-compose.yml`：

```yaml
services:
  van-nav:
    image: ghcr.io/thirsty5034/van-nav:latest
    container_name: van-nav
    restart: unless-stopped
    ports:
      - "6412:6412"
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Shanghai
```

启动：

```bash
docker compose up -d
```

### 可执行文件

下载 [Releases](https://github.com/thirsty5034/van-nav/releases) 中对应平台的二进制文件，直接运行。

```bash
./van-nav -port 6412
```

打开浏览器 [http://localhost:6412](http://localhost:6412) 即可访问。

- 默认端口 `6412`，添加 `-port <port>` 参数可指定端口
- 默认账号密码 `admin` / `admin`，首次运行后请进入后台修改
- 数据库自动创建在当前目录：`data/nav.db`

### nginx 反向代理

```nginx
server {
    listen 80;
    server_name <yourhost>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <yourhost>;

    ssl_certificate <your-cert-path>;
    ssl_certificate_key <your-key-path>;
    ssl_verify_client off;
    proxy_ssl_verify off;

    location / {
        proxy_pass http://127.0.0.1:6412;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_set_header Upgrade $http_upgrade;
    }
}
```

### systemd 服务

1. 复制二进制文件到 `/usr/local/bin` 并加执行权限

2. 创建 `/etc/systemd/system/van-nav.service`：

```ini
[Unit]
Description=VanNav
After=network.target
Wants=network.target

[Service]
WorkingDirectory=/usr/local/bin
ExecStart=/usr/local/bin/van-nav
Restart=on-abnormal
RestartSec=5s
KillMode=mixed
StandardOutput=null
StandardError=syslog

[Install]
WantedBy=multi-user.target
```

3. 常用运维命令：

```bash
# 启动 / 停止 / 重启
sudo systemctl start van-nav
sudo systemctl stop van-nav
sudo systemctl restart van-nav

# 查看状态 / 实时日志
sudo systemctl status van-nav
sudo journalctl -u van-nav -f

# 开机自启 / 取消自启
sudo systemctl enable van-nav
sudo systemctl disable van-nav
```

## 浏览器插件

[浏览器插件仓库](https://github.com/Mereithhh/van-nav-extension) — 一键添加工具、快速打开管理后台和主站。

## FAQ

### 忘记密码怎么办

使用 `-reset-password` 参数重置管理员密码，**数据不会丢失**：

```bash
# 先停止服务
sudo systemctl stop van-nav

# 重置密码（两种方式）
./van-nav -reset-password admin          # 重置为 admin
./van-nav -reset-password 'MyStr0ngP@ss' # 重置为指定密码

# 重启服务
sudo systemctl start van-nav
```

Docker 用户：

```bash
docker exec van-nav ./van-nav -reset-password admin
```

重置后请通过后台「系统设置」尽快修改为强密码。

> 建议定期通过后台「配置导入导出」功能导出配置备份。

## 参与开发

本项目使用 Go + React 技术栈。如有 Golang 和 React 开发经验，可以很轻松上手。欢迎提交 Issue 和 PR。

---

<a id="english"></a>

# English

## Van Nav

A lightweight navigation site with search engine integration, suitable as a homepage. Comes with a [browser extension](https://github.com/Mereithhh/van-nav-extension) and API.

> This project is forked from [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav), with architectural restructuring, security hardening, and engineering improvements on top of the original. See [Differences from Upstream](#differences-from-upstream) for details.

### Preview

> 🌐 **Online Demo**: [van-nav-73v7.onrender.com](https://van-nav-73v7.onrender.com/)
> (Auto-deploys from GitHub Docker images. Demo data resets periodically.)

#### Desktop

<p align="center">
<img src="images/pc-light.png" alt="Desktop Light Mode" width="49%"/>
<img src="images/pc-dark.png" alt="Desktop Dark Mode" width="49%"/>
</p>

#### Mobile

<p align="center">
<img src="images/phone-light.png" alt="Mobile Light Mode" width="24%"/>
<img src="images/phone-dark.png" alt="Mobile Dark Mode" width="24%"/>
</p>

#### Admin Panel

<p align="center">
<img src="images/admin-tools-light.png" alt="Tool Management" width="49%"/>
<img src="images/admin-tools-dark.png" alt="Tool Management (Dark)" width="49%"/>
</p>

<p align="center">
<img src="images/admin-categories.png" alt="Category Management" width="49%"/>
<img src="images/admin-search-engines.png" alt="Search Engine Management" width="49%"/>
</p>

<p align="center">
<img src="images/admin-api-tokens.png" alt="API Token Management" width="49%"/>
<img src="images/admin-settings.png" alt="System Settings" width="49%"/>
</p>

### Differences from Upstream

This project is forked from [Mereithhh/van-nav](https://github.com/Mereithhh/van-nav) (latest commit `8b9a544`). Below are the **new features** and **improvements** relative to the upstream project.

#### New Features

**WebDAV Cloud Backup & Restore**

Not available in upstream. This project supports encrypted database backup to WebDAV services such as Jianguoyun (Nutstore):

- Configurable WebDAV connection info and backup schedule (daily / weekly / monthly / custom cron)
- Backup files are automatically encrypted with AES-256-GCM; encryption key is auto-generated
- Retention policy support (unlimited / by count / by days to auto-clean expired backups)
- View cloud backup file list in the admin panel, restore any backup with one click
- Current database is auto-backed up before restore to prevent accidental data loss

**Full Configuration Import & Export**

Upstream only supports tool import/export. This project supports **all configuration** backup and restore:

- Export scope: tools, categories, search engines, API tokens, system settings, site configuration
- Export format: JSON file, portable across any instance
- Import automatically processes by type (categories cleared before write, tokens deduplicated by name, settings merged)

**Link Health Check**

Not available in upstream. Batch-detect the status of all tool links from the admin panel:

- Concurrent detection (10-way concurrency, HEAD request first, fallback to GET on failure)
- Mark each link's HTTP status code and alive status
- One-click sort dead links to the end of the list

**Auto-fetch Tool Descriptions**

Not available in upstream. "One-click update descriptions" to batch-fetch `<title>` and `<meta description>` from tool pages:

- Auto encoding detection for GBK / GB2312 / UTF-8
- Auto-detect anti-scraping pages (captchas, etc.) to avoid false scraping
- Single tool can be fetched via `GET /api/admin/fetch-page-info?url=xxx`

**Deployment Version Management**

Not available in upstream. Git tag is injected as version number via ldflags at compile time and auto-synced to database at startup:

- "System Settings" page in admin panel displays the current deployment version
- API endpoint to increment build number (for CI/CD pipelines)
- Version number auto-aligns after deployment, no manual edits needed

**Docker Compose Support**

Upstream has no `docker-compose.yml`. This project provides an out-of-the-box Compose configuration.

**GHCR Multi-Architecture Images**

Upstream images are hosted on Docker Hub. This project uses GitHub Container Registry with multi-architecture support: `linux/amd64`, `linux/arm64`, `linux/arm`, `darwin/amd64`, `darwin/arm64`.

#### Theme Beautification System

Not available upstream. The admin panel gains a new "Theme" configuration page for customizing the frontend appearance:

- **Theme Colors**: primary color, page background, card background, primary text color, secondary text color, border color
- **Layout Adjustments**: card border radius (8px/12px/16px/20px), card shadow (none/subtle/soft/prominent), card padding, card gap
- **Typography**: title font size, title font weight (400/500/600/700), description font size
- **Custom CSS**: inject up to 10KB of custom CSS with automatic backend sanitization of dangerous keywords (`expression`, `behavior`, cross-origin `url()`, etc.)
- **Preset Themes**: 7 one-click presets (Classic Blue, Tech Purple, Minimal Gray, Forest Green, Sunset Orange, Sakura Pink, Gradient Glass)
- **CSS Variables**: frontend uses native CSS custom properties (`--van-nav-*`) globally, zero runtime performance overhead
- **Backup Integration**: theme configuration seamlessly integrates with existing import/export and WebDAV backup systems
- **Conditional Footer**: government record footer auto-hides when not configured

#### Chinese/English Internationalization (i18n)

Not available upstream. This project implements full bilingual Chinese/English support:

- Language switcher in admin settings, one-click toggle between Chinese and English
- 462 translation keys (login page, homepage, all admin modules), Chinese and English fully aligned
- Language preference persisted via localStorage + server sync, incognito mode falls back to browser language
- Dedicated `PUT /api/admin/setting/language` API that only updates the language field
- Strict boundary: system text is translated, user-defined data is not; search engine cards translated via standalone `t()` function in non-React context
- `nav_setting` table gains `language` column, auto-migrated on startup

#### Security Improvements

| Improvement | Upstream | This Project |
|-------------|----------|--------------|
| JWT Secret | Randomly generated on each restart, all issued tokens immediately invalidated | Persisted to `./data/jwt_secret`, tokens remain valid after restart |
| Password Verification | bcrypt + plaintext fallback comparison | bcrypt-first, legacy plaintext passwords auto-upgraded to bcrypt hash on first login |
| API Token Expiry | 100 years | 10 years |
| Database Migration | `panic(err)` crashes with stack trace | `logger.LogError` + `os.Exit(1)`, outputs clear error message |
| Dependency Security | 98 npm vulnerabilities + 15 Dependabot alerts | All fixed |

#### Reliability Improvements

| Improvement | Upstream | This Project |
|-------------|----------|--------------|
| goroutine Panic Recovery | No `defer/recover`, async goroutine panic crashes the process | All 4 async paths protected |
| Error Responses | 5 delete/update Handlers silently swallow errors, still return 200 | Explicit HTTP 500 + error message |
| Batch Import | Each record individually Prepare + Exec inside loop | Prepared Statement reused inside transaction, single batch commit |

#### Engineering Improvements

| Improvement | Upstream | This Project |
|-------------|----------|--------------|
| CI Toolchain | Older Node.js version | Node.js 22 + pnpm 11.4.0 + Go 1.24 |
| Docker Build | Single-stage | Multi-stage build (frontend + backend + runtime separated) |
| Release Process | Manual release | GoReleaser auto cross-compiles for 6 platforms + structured Release Notes |
| Layered Architecture | Handler directly calls database (10 occurrences) | 42 violations in service layer + 4 in main.go fully eliminated; 30 `database/operations.go` wrapper functions; handler/main/service layers have zero `database.DB` references |
| Error Handling | `utils.CheckErr()` silently swallows errors | Service layer functions return `(T, error)`, handler layer produces explicit error responses |
| Architecture Circuit Breaker | None | `assert_architecture.sh` compile-time triple scan (handler + main + service) to prevent layering violation regressions |

### Tips & Shortcuts

- On desktop, the search box auto-focuses on page load — just start typing; on mobile, tap the search box to focus
- After searching, press Enter to open the first result in a new tab
- After searching, press the number on the corresponding card + Ctrl/Command to open that result directly
- Customizable navigation behavior (new tab / current tab)

### CHANGELOG

See [CHANGELOG.md](CHANGELOG.md) for details.

### Installation

#### Docker

```bash
docker run -d \
  --name van-nav \
  --restart unless-stopped \
  -p 6412:6412 \
  -v ./data:/app/data \
  -e TZ=Asia/Shanghai \
  ghcr.io/thirsty5034/van-nav:latest
```

Open your browser at [http://localhost:6412](http://localhost:6412).

- Default port: `6412`
- Default credentials: `admin` / `admin` — change via admin panel after first run
- Data is stored in the mounted `./data` directory

#### Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  van-nav:
    image: ghcr.io/thirsty5034/van-nav:latest
    container_name: van-nav
    restart: unless-stopped
    ports:
      - "6412:6412"
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Shanghai
```

Start:

```bash
docker compose up -d
```

#### Standalone Binary

Download the binary for your platform from [Releases](https://github.com/thirsty5034/van-nav/releases) and run directly.

```bash
./van-nav -port 6412
```

Open your browser at [http://localhost:6412](http://localhost:6412).

- Default port: `6412`, use `-port <port>` to specify a different port
- Default credentials: `admin` / `admin` — change via admin panel after first run
- Database auto-created in the current directory: `data/nav.db`

#### nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name <yourhost>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <yourhost>;

    ssl_certificate <your-cert-path>;
    ssl_certificate_key <your-key-path>;
    ssl_verify_client off;
    proxy_ssl_verify off;

    location / {
        proxy_pass http://127.0.0.1:6412;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_set_header Upgrade $http_upgrade;
    }
}
```

#### systemd Service

1. Copy the binary to `/usr/local/bin` and make it executable

2. Create `/etc/systemd/system/van-nav.service`:

```ini
[Unit]
Description=VanNav
After=network.target
Wants=network.target

[Service]
WorkingDirectory=/usr/local/bin
ExecStart=/usr/local/bin/van-nav
Restart=on-abnormal
RestartSec=5s
KillMode=mixed
StandardOutput=null
StandardError=syslog

[Install]
WantedBy=multi-user.target
```

3. Common commands:

```bash
# Start / Stop / Restart
sudo systemctl start van-nav
sudo systemctl stop van-nav
sudo systemctl restart van-nav

# Status / Live Logs
sudo systemctl status van-nav
sudo journalctl -u van-nav -f

# Enable / Disable Auto-start on Boot
sudo systemctl enable van-nav
sudo systemctl disable van-nav
```

### Browser Extension

[Browser Extension Repository](https://github.com/Mereithhh/van-nav-extension) — One-click add tools, quick access to admin panel and main site.

### FAQ

**Forgot Password**

Use the `-reset-password` parameter to reset the admin password. **No data will be lost**:

```bash
# Stop the service first
sudo systemctl stop van-nav

# Reset password (two options)
./van-nav -reset-password admin          # Reset to admin
./van-nav -reset-password 'MyStr0ngP@ss' # Reset to a custom password

# Restart the service
sudo systemctl start van-nav
```

For Docker users:

```bash
docker exec van-nav ./van-nav -reset-password admin
```

After resetting, change to a strong password via the admin panel "System Settings" as soon as possible.

> It is recommended to regularly export a configuration backup via the admin panel "Import & Export".

### Contributing

This project uses a Go + React tech stack. If you have experience with Golang and React, you should be able to get started easily. Issues and PRs are welcome.

