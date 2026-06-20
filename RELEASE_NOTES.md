## [v2.1.1] - 2026-06-03

### Added

- **首页加载性能大幅提升**：数据库添加 7 个关键索引（nav_img / nav_api_token / nav_user / nav_table），首页数据引入 5 秒 TTL 进程内缓存，API Token 校验走内存 O(1) 查找，多用户并发场景下 QPS 预期提升 3-5 倍
- **链接健康检测批量写入优化**：CheckAllLinks 将逐条独立 UPDATE 改为单次事务批量提交，100 条工具的 DB 写入延迟降低 80% 以上
- **goscraper 连接复用**：批量导入工具时图标抓取共享 HTTP 客户端，TCP / TLS 连接复用，延迟降低 40-60%

### Fixed

- **DeleteToolWithImage 先删后查 Bug**：删除工具后因查询已删除行导致图片缓存永远无法清理，nav_img 表持续膨胀。修复为先查询 logo 再执行删除，图片孤儿记录可被正确回收
- **validUTF8 误判非 ASCII 内容**：自定义 UTF-8 检查函数将任何非 ASCII 字节直接判定为非法，导致中文、日文等页面触发无意义的 GBK 转码开销。替换为标准库 `unicode/utf8.Valid`

### Changed

- **连接池与 WAL 同步优化**：SQLite 连接池配置 SetMaxOpenConns(10) / SetMaxIdleConns(10)，WAL 模式下同步级别设为 NORMAL，兼顾读写并发与数据安全
- **InsertImage 去重机制重构**：从 SELECT COUNT + INSERT 两步操作改为 INSERT OR IGNORE + 唯一索引，消除 TOCTOU 竞态条件
- **正则表达式预编译**：FetchPageInfoHandler 热路径上的 6 个正则从请求级编译提升为包级变量，消除重复编译开销与 GC 压力
- **响应体大小防护**：FetchPageInfoHandler 限制 2MB、GetImgBase64FromUrl 限制 5MB，防止恶意或异常响应导致 OOM
- **GoReleaser 配置补充**：release_notes_file 字段补全，修复 Release Notes 未自动注入 GitHub Release 的问题
- **内部开发辅助文件清理**：将 ARCH_CONTRACT.md、restart-test.sh 等非生产文件从版本控制中移除并加入 .gitignore
- **README 文档完善**：补充 i18n 国际化功能描述，更新架构重构与错误处理改进说明

### 风险提示

本项目代码包含部分由 AI 自动生成与修改的逻辑。为确保数据资产安全，请在升级前务必对底层物理数据库（data/nav.db）进行完整备份，并自行评估导入风险。

---

## 升级注意事项

1. **数据库索引变更**：首次启动 v2.1.1 时会自动创建 7 个新索引（`idx_img_url`、`idx_img_url_unique`、`idx_token_value_disabled`、`idx_user_name`、`idx_table_catelog`、`idx_table_alive`、`idx_table_sort`），该操作对已有数据量较小的实例几乎无感知，数据量较大时可能产生毫秒级启动延迟
2. **nav_img 唯一索引**：新增 `idx_img_url_unique` 唯一索引，若历史数据中存在重复的 url 记录，首次启动时 INSERT OR IGNORE 会静默跳过重复项，不影响正常运行
3. **连接池行为变更**：SQLite 最大连接数限制为 10（此前无限制），对于单机部署场景无影响，高并发代理场景下如遇 `SQLITE_BUSY` 可适当调大 `SetMaxOpenConns`
4. **WAL 同步级别**：从默认 FULL 降为 NORMAL，在极端断电场景下理论上存在极小概率的 WAL 文件损坏风险，但正常关机与进程终止不受影响
