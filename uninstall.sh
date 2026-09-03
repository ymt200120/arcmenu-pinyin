#!/usr/bin/env bash
# 卸载补丁,恢复全部原始文件
set -euo pipefail

EXT_DIR="${HOME}/.local/share/gnome-shell/extensions/arcmenu@arcmenu.com"

ORIG_FILES=(
    "menulayouts/az.js"
    "menulayouts/baseMenuLayout.js"
    "stylesheet.css"
)
NEW_FILES=(
    "menulayouts/alphabetJumpList.js"
)

restored=0
for rel in "${ORIG_FILES[@]}"; do
    target="${EXT_DIR}/${rel}"
    backup="${target}.orig"
    if [ -f "${backup}" ]; then
        cp "${backup}" "${target}"
        echo "恢复: ${rel}"
        restored=1
    else
        echo "无备份,跳过: ${rel}"
    fi
done

for rel in "${NEW_FILES[@]}"; do
    rm -f "${EXT_DIR}/${rel}"
    echo "移除: ${rel}"
done
rm -rf "${EXT_DIR}/libs/pinyin-pro"
echo "移除: libs/pinyin-pro"

if [ "${restored}" -eq 1 ]; then
    echo "已恢复原始文件。重载: 注销并重新登录。"
else
    echo "未做任何修改。"
fi
