## van-nav-diao v1.0.8

### 🐛 Bug Fixes

- **可乐跑动途中动作错乱修复**：移动（跑开/漫游）和自动动作（挥手 / 看代码 / 好奇抬头）此前共用同一个计时器，且自动动作会无条件切换精灵状态，导致跑动途中如果自动动作定时器恰好触发，猫会在还在用 CSS 平移的过程中突然切成挥手/看代码的贴图，看起来像"动作贴图在平移"；现在移动优先，移动进行中自动动作会跳过，移动结束才恢复调度。

### 🧹 Warnings Cleanup

- **CI 依赖升级**：`.github/workflows/release.yml` 升级 `actions/checkout`、`actions/setup-node`、`actions/setup-go`、`goreleaser-action` 到 Node 24 原生大版本，消除 "Node.js 20 is deprecated" 强制转 Node 24 的警告；`goreleaser-action` 的 `version` 从 `latest` 改成显式的 `~> v2`，消除版本锁定提示。
- **go vet 清理**：`goscraper/goscraper.go` 中 `parseDocument` 循环后一段永远走不到的 `return nil` 死代码已删除，`go vet ./...` 恢复无输出。

### Docker 镜像

```bash
docker pull ghcr.io/aierdiao/van-nav-diao:v1.0.8
docker pull ghcr.io/aierdiao/van-nav-diao:latest
```

升级方式：

```bash
docker compose pull && docker compose up -d
```

### 升级说明

1. 升级前建议备份 `data/nav.db`。
2. 本版本无数据库 Schema 变更，可直接升级。
3. 本版本均为 bug 修复和 CI 清理，无新增功能面。

### 已知风险

- WebP atlas 为离散帧动画，无法做到真正骨骼动画式表情插值，仅通过降低状态切换频率和淡出过渡减少突兀感。
