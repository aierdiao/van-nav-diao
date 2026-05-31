# ⚖️ van-nav 项目最高架构宪法（AI 必须无条件服从）

本文件是当前项目的核心合规底线。任何涉及新功能追加、接口修改、漏洞修复的开发任务，必须 100% 遵守以下物理分层纪律：

## 1. 严格的单向依赖流（Forbidden Cross-Layering）
- 项目必须死守三层架构：`Router` (main.go) → `handler/` (Controller层) → `service/` (业务核心层) → `database/` (数据持久层)。
- **Handler 层绝对高压线**：`handler/` 目录下的所有文件只允许处理 HTTP 协议入参解析（ShouldBindJSON等）与 HTTP 状态码响应封装。**绝对禁止**调用 `database.DB`，**绝对禁止**出现任何原生 SQL 字符串（如 SELECT/UPDATE/DELETE/INSERT）。

## 2. 异步 Goroutine 安全熔断
- 任何时候新开 `go func()` 异步线程（如图标懒抓取、后台备份等），**必须第一行强制写入** `defer` 捕获异常保护，严禁进程猝死：
  ```go
  go func() {
      defer func() {
          if r := recover(); r != nil {
              logger.LogError("异步线程发生崩溃严重崩溃: %v", r)
          }
      }()
      // 真正的业务逻辑
  }()
## 3. 安全合规规范
禁止明文回退比较：密码校验必须且只能通过 bcrypt.CompareHashAndPassword 执行，严禁进行字符串等值比较。

配置持久化：JWT 密钥、安全配置必须统一收拢在 service/ 的 DB 或全局变量配置中，严禁在 init() 中使用随机数导致重启失效。
