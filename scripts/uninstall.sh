#!/usr/bin/env bash
# 卸载 ArcMenu Pinyin（只移除本扩展自身的目录，不触碰 ArcMenu）
set -euo pipefail

UUID="arcmenu-pinyin@ymt200120"
TARGET="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

gnome-extensions disable "${UUID}" >/dev/null 2>&1 || true

if [ -d "${TARGET}" ]; then
    rm -rf "${TARGET}"
    echo "已移除: ${TARGET}"
else
    echo "未发现安装目录: ${TARGET}"
fi

echo "如曾启用过本扩展，建议注销并重新登录以彻底清理运行时痕迹。"
echo "官方 ArcMenu 未被本扩展修改，无需任何恢复操作。"
