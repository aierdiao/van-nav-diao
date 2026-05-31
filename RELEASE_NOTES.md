## [2.0.2] - 2026-05-31

### Added

- **密码重置 CLI 命令**：新增 `-reset-password` 参数，无需启动服务即可重置管理员密码，数据零丢失。支持 `./van-nav -reset-password admin`（重置为默认密码）和 `./van-nav -reset-password '新密码'`（重置为自定义密码）。Docker 用户可通过 `docker exec van-nav ./van-nav -reset-password admin` 使用
- **README 双语支持**：新增完整英文翻译，顶部提供中英文语言选择器快速跳转
- **README 后台截图**：新增 6 张后台管理页面截图（工具管理、分类管理、搜索引擎管理、API Token、设置页），移除过时的 PAD 预览和交流群截图
- **CHANGELOG 规范化**：本项目日志与上游历史记录分离，上游日志折叠显示
- **发版流程增强**：RELEASE_PROMPT.md 新增 CHANGELOG.md 同步更新步骤

### Fixed

- **登录错误提示不显示**：前端读取 `response.message` 但后端返回 `errorMessage`，导致 toast 弹出空提示。改为内联红色错误横幅，直接显示在密码输入框下方，不再依赖 antd message 组件（可能被登录页背景遮挡）
- **部署版本号硬编码**：`main.go` 默认值从 `v2.0.0.0` 改为 `dev`，数据库 DEFAULT 从 `v2.0.0.0` 改为空字符串，确保 CI 编译时 ldflags 正确注入版本号
- **GoReleaser changelog 覆盖**：配置 `changelog.disable: true` + `release.release_notes_file: RELEASE_NOTES.md`，防止自动 changelog 覆盖人工编写的 Release Notes

### ⚠️ 风险提示

本项目代码部分由 AI 自动修改，无法保证完全无误。请在升级前备份重要数据，并自行评估使用风险。

---

## 升级注意事项

1. **密码重置**：忘记密码时使用 `-reset-password` 参数即可恢复，详见 FAQ
2. **数据库无 schema 变更**：本版本不涉及数据库表结构变更，可直接替换二进制升级
3. **前端变更**：登录页错误提示改为内联显示，升级后清除浏览器缓存可获得最佳体验
4. **Docker 镜像**：如使用 Docker 部署，建议拉取新的 GHCR 多架构镜像

---

**🙏 鸣谢**

本项目开发过程中得到了[小米大模型团队](https://github.com/XiaomiLM)百万亿 Token 创造者激励计划的支持与赞助，在此表示衷心感谢。
