#!/bin/bash
# 编译 + 重启测试环境（宿主机执行）
cd /workspaces/van-nav
VERSION=$(git describe --tags --always)
echo "编译版本: $VERSION"
GOTOOLCHAIN=local go build -mod=vendor -ldflags="-s -w -X main.Version=$VERSION" -o van-nav .
echo "编译完成，重启服务..."
sudo systemctl restart van-nav-test.service
sleep 1
sudo journalctl -u van-nav-test.service -n 3 --no-pager
echo "✅ 完成"
