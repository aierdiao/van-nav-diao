#!/bin/bash
# van-nav 编译期架构合规断路器

echo "🔍 开始扫描 handler/ 控制层是否存在私通 database/ 数据层的违规行为..."

# 1. 提取 handler 包下的所有实际导入路径，并盘查是否包含底层 database 依赖
VIOLATIONS=$(go list -f '{{.Dir}}: {{.Imports}}' /workspaces/van-nav/handler/... | grep "github.com/mereith/nav/database")

if [ ! -z "$VIOLATIONS" ]; then
    echo -e "\n🚨 [严重架构违规] 抓获铁证！以下 Handler 文件违法跨层导入了 database 包："
    echo "$VIOLATIONS"
    echo -e "\n❌ 阻断原因：Handler 必须通过 service 层中转，禁止直接怼向数据库！请立刻重构！"
    exit 1
else
    echo "✅ 恭喜！handler/ 隔离层非常干净，分层纪律 100% 达标。"
    exit 0
fi
