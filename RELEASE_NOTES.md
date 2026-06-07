## [v2.3.2] - 2026-06-07

### Fixed

- **管理后台删除全部工具后页面不刷新**：`GetAllToolRows` 和 `GetAllCatelogs` 在数据库无记录时返回 nil slice，JSON 序列化为 `null`，导致前端 `store?.tools` 判断为 false 跳过数据更新。修复为空结果返回 `[]`，并增加前端 `Array.isArray()` 防御性判断
- **批量删除确认消息显示异常**：批量删除弹窗提示"确定要删除 {name} 吗？"但未传入 name 参数，现改为"确定要删除选中的工具吗？"
- **GitHub CodeQL 全部安全告警清零**：修复 i18n 正则转义、sw-config.js ReDoS 正则、handler SSRF 风险（新增私有 IP 校验），补充 Workflow permissions 声明
- **依赖安全升级**：`golang.org/x/crypto` v0.38.0 → v0.45.0，修复 CVE-2025-47914、CVE-2025-58181

### 风险提示

本项目代码包含部分由 AI 自动生成与修改的逻辑。为确保数据资产安全，请在升级前务必对底层物理数据库（data/nav.db）进行完整备份，并自行评估导入风险。

---

## 升级注意事项

1. 本次更新无数据库 schema 变更，升级后自动兼容
2. 依赖 `golang.org/x/crypto` 已升级，建议验证 SSH 相关功能（如有）
