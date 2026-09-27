#!/usr/bin/env bash
# 构建 ArcMenu Pinyin 发布包
# 用法: scripts/build.sh [输出目录]（默认 dist/）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="${REPO_ROOT}/arcmenu-pinyin@ymt200120"
OUT_DIR="${1:-${REPO_ROOT}/dist}"

mkdir -p "${OUT_DIR}"
VERSION=$(python3 -c "import json;print(json.load(open('${EXT_DIR}/metadata.json'))['version-name'])")
ZIP_PATH="${OUT_DIR}/arcmenu-pinyin-v${VERSION}.zip"

rm -f "${ZIP_PATH}"
# zip 根目录即扩展文件（解压到 ~/.local/share/gnome-shell/extensions/<uuid>/ 即可）
( cd "${EXT_DIR}" && zip -qr "${ZIP_PATH}" . -x '*.DS_Store' )

echo "构建完成: ${ZIP_PATH}"
echo "包含文件:"
unzip -l "${ZIP_PATH}" | head -8
echo "  ...（vendor/pinyin-pro 为拼音库 ESM 构建，MIT 许可证）"
