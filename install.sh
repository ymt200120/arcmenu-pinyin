#!/usr/bin/env bash
# 安装 ArcMenu 补丁:字母分组标题点击弹出 A-Z 面板(Windows 式跳转) + az 布局拼音分组
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="${HOME}/.local/share/gnome-shell/extensions/arcmenu@arcmenu.com"

# 文件列表: 扩展内路径 | 补丁标识(用于检测扩展更新后刷新备份)
PATCHED_FILES=(
    "menulayouts/az.js|indexLetterForName"
    "menulayouts/baseMenuLayout.js|_registerAlphabetHeader"
    "stylesheet.css|arcmenu-alphabet-panel"
)
NEW_FILES=(
    "menulayouts/alphabetJumpList.js"
)

[ -d "${EXT_DIR}" ] || { echo "错误: 未找到 ${EXT_DIR}" >&2; exit 1; }

for entry in "${PATCHED_FILES[@]}"; do
    rel="${entry%%|*}"
    marker="${entry##*|}"
    target="${EXT_DIR}/${rel}"
    backup="${target}.orig"

    [ -f "${target}" ] || { echo "错误: 未找到 ${target}" >&2; exit 1; }

    if [ ! -f "${backup}" ]; then
        cp "${target}" "${backup}"
        echo "备份: ${rel} -> $(basename "${backup}")"
    elif ! grep -q "${marker}" "${target}"; then
        cp "${target}" "${backup}"
        echo "检测到扩展更新,刷新备份: ${rel}"
    fi

    install -m 644 "${SRC_DIR}/${rel}" "${target}"
    echo "安装: ${rel}"
done

for rel in "${NEW_FILES[@]}"; do
    install -m 644 "${SRC_DIR}/${rel}" "${EXT_DIR}/${rel}"
    echo "安装: ${rel}"
done

mkdir -p "${EXT_DIR}/libs"
rm -rf "${EXT_DIR}/libs/pinyin-pro"
cp -r "${SRC_DIR}/libs/pinyin-pro" "${EXT_DIR}/libs/pinyin-pro"
echo "安装: libs/pinyin-pro"

echo ""
echo "完成。重载方式:"
echo "  gnome-extensions disable arcmenu@arcmenu.com && gnome-extensions enable arcmenu@arcmenu.com"
echo "  Wayland 下若代码未热载,请注销并重新登录。"
