## [2.1.0] - 2026-06-02

### Added
- **中英文国际化支持**：设置页面新增语言切换器，系统界面文本全面支持中文/英文双语切换，共覆盖 462 个翻译 key，涵盖登录页、首页、管理后台全部模块
- **语言持久化与服务器同步**：语言偏好通过 localStorage 本地持久化，登录后自动从服务器同步已保存的语言设置，支持无痕模式降级到浏览器语言
- **独立语言设置 API**：新增 `PUT /api/admin/setting/language` 端点，仅更新语言字段而不覆盖其他系统配置
- **翻译边界修正**：严格区分系统工具文本（需翻译）与用户自定义数据（不翻译），搜索引擎卡片模板通过独立 `t()` 函数在非 React 上下文中完成翻译
- **数据库 language 字段**：`nav_setting` 表新增 `language` 列，默认值 `zh-CN`，通过 `ALTER TABLE` 迁移自动添加

### Fixed
- **登录页夜间模式按钮定位**：修复 DarkSwitch 组件在登录页跑至登录框右侧的问题，补全 Login.css 中 `.floating-actions` 定位样式，按钮现固定在页面右下角，与主页面保持一致
- **部署版本信息 UI 精简**：将独占一整张 Card 的版本信息替换为页面底部紧凑 footer，与 Grafana、GitLab 等成熟项目的版本号展示风格对齐

### Changed
- **分层架构漂白重构**：消除 service 层 42 处、main.go 4 处直接操作 `database.DB` 的越级违规行为，新增 30 个 `database/operations.go` 封装函数，实现 Router → Handler → Service → Database 纯净单向依赖流
- **架构断路器升级**：`assert_architecture.sh` 从单重检查（handler→database）升级为三重断路器（handler + main + service），全面守护三层架构纪律
- **错误处理统一**：service 层函数签名统一返回 `(T, error)`，消除 `utils.CheckErr()` 静默吞错模式，handler 层补充完整的 error 响应处理
- **编译产物体积优化**：重构后净减 163 行代码，service 层瘦身 30%+

### 风险提示
本项目代码包含部分由 AI 自动生成与修改的逻辑。为确保数据资产安全，请在升级前务必对底层物理数据库进行完整备份，并自行评估导入风险。

---

## 升级注意事项

1. **SQLite 字段迁移**：本次发布新增 `nav_setting.language` 字段，启动时自动执行 `ALTER TABLE` 迁移，无需手动操作。首次启动时默认值为 `zh-CN`。
2. **API 兼容性**：所有现有 API 路由、请求/响应结构保持不变，新增的 `PUT /api/admin/setting/language` 为纯新增端点，向下兼容。
3. **Go 版本要求**：`go.mod` 要求 Go 1.23.0+，toolchain go1.23.5。
4. **前端构建产物**：本次发布包含前端 i18n 全量变更，需重新执行 `ui/build` 生成静态资源嵌入 Go 二进制。通过 GoReleaser 管线自动完成。
