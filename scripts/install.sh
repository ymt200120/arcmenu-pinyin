#!/usr/bin/env bash
# 安装 ArcMenu Pinyin 到当前用户（不修改 ArcMenu 本身的任何文件）
# 可重复执行；本脚本只写入本扩展自己的目录。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_SRC="${REPO_ROOT}/arcmenu-pinyin@ymt200120"
TARGET="${HOME}/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120"
UUID="arcmenu-pinyin@ymt200120"

command -v gnome-shell >/dev/null || { echo "未检测到 GNOME Shell"; exit 1; }

mkdir -p "$(dirname "${TARGET}")"

if [ -d "${TARGET}" ]; then
    echo "检测到旧安装，先移除: ${TARGET}"
    gnome-extensions disable "${UUID}" >/dev/null 2>&1 || true
    rm -rf "${TARGET}"
fi

cp -r "${EXT_SRC}" "${TARGET}"
echo "已安装到: ${TARGET}"

# 校验 ArcMenu 是否在位（只检查，不做任何修改）
ARC_DIR="${HOME}/.local/share/gnome-shell/extensions/arcmenu@arcmenu.com"
ARC_DIR_SYSTEM="/usr/share/gnome-shell/extensions/arcmenu@arcmenu.com"
if [ ! -d "${ARC_DIR}" ] && [ ! -d "${ARC_DIR_SYSTEM}" ]; then
    echo "警告: 未找到官方 ArcMenu 扩展。本扩展依赖 ArcMenu 70.0+，"
    echo "      请先安装并启用 ArcMenu，再启用本扩展。"
fi

echo ""
echo "下一步:"
echo "  1. 注销并重新登录（Wayland 下必须；X11 可用 gnome-extensions enable 热载）"
echo "  2. gnome-extensions enable ${UUID}"
echo "  3. 打开 ArcMenu → 所有应用：中文应用应出现在拼音首字母分组中"
echo ""
echo "卸载: scripts/uninstall.sh"
