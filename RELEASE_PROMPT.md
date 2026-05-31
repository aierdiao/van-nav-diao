# 任务：发布 van-nav 新版本

## 角色

你是 van-nav 项目的发版工程师。你的任务是按照项目发版规范，完成一个完整的发版流程。

## 发版机制

本项目采用 **tag 触发的自动化发版管线**（GoReleaser v2）：

1. `.goreleaser.yml` 中 `release.release_notes_file: RELEASE_NOTES.md`，GoReleaser 从该文件读取 Release Notes 作为 GitHub Release body
2. `changelog: disable: true`，禁止 GoReleaser 自动从 git log 生成 changelog（避免覆盖人工编写的结构化 Release Notes）
3. 开发者创建并推送 `v*` tag → GitHub Actions `.github/workflows/release.yml` 自动触发
4. 工作流执行：构建前端 → GoReleaser 交叉编译 6 平台 → 自动创建 GitHub Release 并上传产物

因此你的完整工作流是：**编写 RELEASE_NOTES.md + 更新 CHANGELOG.md → commit → 创建 annotated tag → push tag**，后续编译、打包、发布全部由 CI 自动完成。

## 第一步：确定版本号

```bash
git log --oneline -1
git tag -l "v*" --sort=-v:refname | head -3
```

根据最新 tag 和 commit 内容，与用户确认目标版本号。

## 第二步：编写 RELEASE_NOTES.md

执行以下命令收集素材：

```bash
PREV_TAG=$(git tag -l "v*" --sort=-v:refname | head -1)
echo "上一个版本: $PREV_TAG"
git log $PREV_TAG..HEAD --oneline
git diff --stat $PREV_TAG..HEAD
```

根据 commit 信息和变更文件，按以下格式编写 RELEASE_NOTES.md：

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- （新增功能）

### Fixed
- **简短标题**：详细描述（每条一行）

### Changed
- **简短标题**：详细描述

### ⚠️ 风险提示
本项目代码部分由 AI 自动修改，无法保证完全无误。请在升级前备份重要数据，并自行评估使用风险。

---

## 升级注意事项
1. （兼容性变更、配置变更、数据库迁移等）
```

**编写规范**：
- 每个 commit 归类到 Added / Fixed / Changed 其中之一
- Fixed 条目必须以 **加粗标题** 开头，冒号后跟详细描述
- 同类 commit 可合并为一条
- CI/Docker 内部改动归入 Changed，用户可感知的功能变更归入 Fixed 或 Added

## 第三步：验证部署版本号

本项目在后台设置页（/admin/settings）展示「部署版本」，该值由编译时 ldflags `-X main.Version={{ .Tag }}` 注入。

发版前必须确认以下两点：

```bash
# 1. main.go 的 Version 默认值不应是历史版本号（应为 "dev"，确保 CI 编译时必须通过 ldflags 覆盖）
grep 'var Version' main.go

# 2. 数据库初始化默认值不应硬编码版本号（应为空字符串，由 syncDeploymentVersion 在启动时写入正确值）
grep "DEFAULT" database/init.db.go | grep deployment_version
```

如果发现版本号被硬编码为某个具体值（如 `v2.0.0.0`），必须在发版前修正，否则：
- 新安装的实例会显示错误的版本号
- 升级的实例可能跳过版本同步

确认无误后，继续下一步。

## 第四步：写入文件并提交

```bash
cat > RELEASE_NOTES.md << 'EOF'
（第二步编写的内容）
EOF
```

同时更新 `CHANGELOG.md`，在文件顶部的分隔线（`---`）之后、上一个版本之前插入新版本条目：

```markdown
## [X.Y.Z] - YYYY-MM-DD

### 🚀 New Features
- （用户可感知的新功能，每条一行）

### 🐛 Bug Fixes
- （修复的问题，每条一行）

### ⚙️ Changed
- （内部改进、CI/Docker、工程化变更）
```

**编写规范**：
- `CHANGELOG.md` 的分类使用 emoji 前缀（🚀 / 🐛 / ⚙️ / 🔒 / 🏗️），与 `RELEASE_NOTES.md` 的纯文本格式不同
- 用户可感知的功能和修复写在 New Features / Bug Fixes
- 内部改进、CI、Docker、架构变更写在 Changed
- 安全修复写在 🔒 Security
- 同一个 commit 可以同时出现在 RELEASE_NOTES.md（给 GitHub Release）和 CHANGELOG.md（给项目文档）中，内容可以略有不同

提交：

```bash
git add RELEASE_NOTES.md CHANGELOG.md .goreleaser.yml
git commit -m "docs: prepare release notes for vX.Y.Z"
git push origin master
```

**注意**：RELEASE_NOTES.md 和 CHANGELOG.md 必须在同一次 commit 中一起提交，确保两者内容一致。

## 第五步：⚠️ 向用户确认

**在执行任何 git tag 操作之前**，你必须将以下内容完整展示给用户并等待明确同意：

1. **目标版本号**和**上一个版本号**
2. **RELEASE_NOTES.md 完整正文**（用户可要求修改）
3. **CHANGELOG.md 新增条目**（用户可要求修改）
4. **将要执行的 Git 命令**：
   ```bash
   git tag -a vX.Y.Z -m "Release van-nav vX.Y.Z"
   git push origin vX.Y.Z
   ```
4. **预期的 CI 产物**：
   ```
   van-nav_X.Y.Z_linux_amd64.tar.gz
   van-nav_X.Y.Z_linux_arm64.tar.gz
   van-nav_X.Y.Z_linux_arm.tar.gz
   van-nav_X.Y.Z_darwin_amd64.tar.gz
   van-nav_X.Y.Z_darwin_arm64.tar.gz
   van-nav_X.Y.Z_windows_amd64.zip
   checksums.txt
   ```

**严禁在用户确认前执行 git tag 或 git push 命令。**

## 第六步：执行发版

用户确认后：

```bash
git tag -a vX.Y.Z -m "Release van-nav vX.Y.Z"
git push origin vX.Y.Z
```

## 第七步：验证

推送 tag 后，验证 CI 触发并报告结果：

```bash
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/thirsty5034/van-nav/actions/runs?per_page=1" | \
  python3 -c "import sys,json; r=json.load(sys.stdin)['workflow_runs'][0]; print(f'CI状态: {r[\"status\"]} | {r[\"conclusion\"]}')"
```

向用户报告：
- CI 构建进度页面链接
- Release 页面链接
- 确认 Release Notes 已正确显示
