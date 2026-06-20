## van-nav-diao v1.0.4

### 更新内容

#### 健康检测：访问受限状态

- **新增「访问受限」状态**：HTTP 403 响应（如 Cloudflare 拦截）不再误判为「失效」，改为独立的橙色「访问受限」标签，与「正常」和「失效」并列显示。
- **状态筛选器**：检测结果表格左上方新增筛选下拉，支持按「全部状态 / 正常 / 访问受限 / 失效」过滤，方便运营人员快速定位目标。
- **统计数字扩展**：检测结果统计区从 3 列扩展为 4 列，新增「访问受限」计数（橙色）。
- **访问受限不参与整理**：「整理失效链接」操作只移动真正失效的链接，访问受限的链接保持原位。

#### React Hook 修复

- **CardV2 useMemo 依赖缺失修复**：移除 `<img>` 外层不必要的 `useMemo`，`handleImageError` 改用 `useCallback` 包裹，消除 ESLint `react-hooks/exhaustive-deps` 警告。

### Docker 镜像

```bash
docker pull ghcr.io/aierdiao/van-nav-diao:1.0.4
docker pull ghcr.io/aierdiao/van-nav-diao:latest
```

升级方式：

```bash
docker compose pull && docker compose up -d
```

### 升级说明

1. 升级前建议备份 `data/nav.db`。
2. 本版本无数据库 Schema 变更，可直接升级。
3. 已标记为「失效」的 403 网站，下次执行健康检测后会自动更新为「正常（访问受限）」状态。

### 已知风险

- 访问受限的判定仅基于 HTTP 403 状态码，部分真正失效的页面也可能返回 403，需人工复核。
