#!/usr/bin/env bash
# 构建 ArcMenu Pinyin 发布包
# 用法: scripts/build.sh [输出目录]（默认 dist/）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="${REPO_ROOT}/arcmenu-pinyin@ymt200120"
OUT_DIR="${1:-${REPO_ROOT}/dist}"
mkdir -p "${OUT_DIR}"
# 参数可能为相对路径（CI 传入 dist），而后续 zip 在 EXT_DIR 子 shell 中创建——
# 必须在此规范化为绝对路径，否则 cd 后相对基准改变导致 "Could not create output file"。
OUT_DIR="$(cd "${OUT_DIR}" && pwd)"
VERSION=$(python3 -c "import json;print(json.load(open('${EXT_DIR}/metadata.json'))['version-name'])")
ZIP_PATH="${OUT_DIR}/arcmenu-pinyin-v${VERSION}.zip"

rm -f "${ZIP_PATH}"
# zip 根目录即扩展文件（解压到 ~/.local/share/gnome-shell/extensions/<uuid>/ 即可）
( cd "${EXT_DIR}" && zip -qr "${ZIP_PATH}" . -x '*.DS_Store' )

echo "构建完成: ${ZIP_PATH}"

# 在命令替换中完整读取 listing，再做有界展示与结构校验。
# 直接 `unzip -l | head` 在 pipefail 下会因 head 提前退出触发 SIGPIPE(141)。
ZIP_LISTING="$(unzip -l "${ZIP_PATH}")"

echo "包含文件:"
printf '%s\n' "${ZIP_LISTING}" | sed -n '1,9p'
echo "  ...（vendor/pinyin-pro 为拼音库 ESM 构建，MIT 许可证）"

# 结构校验使用 zipinfo(-Z1) 的纯路径输出，避免 -l 的表头/表尾干扰
# （"Archive: …/dist/xxx.zip" 行本身包含 dist/，会被误判）。
ZIP_ENTRIES="$(unzip -Z1 "${ZIP_PATH}")"
if [ -z "${ZIP_ENTRIES}" ]; then
    echo "错误: 无法读取 zip 条目" >&2
    exit 1
fi

# 计数一律用 awk（grep -c 在零匹配时退出码为 1，会触发 set -e 误终止）
FILE_COUNT="$(printf '%s\n' "${ZIP_ENTRIES}" | awk 'END { print NR }')"

METADATA_COUNT="$(printf '%s\n' "${ZIP_ENTRIES}" | awk '$0 == "metadata.json" { c++ } END { print c + 0 }')"
if [ "${METADATA_COUNT}" -ne 1 ]; then
    echo "错误: metadata.json 必须恰好位于 zip 根目录一处（当前 ${METADATA_COUNT} 处）" >&2
    exit 1
fi

# 不允许打包进 VCS 元数据 / 构建产物 / runtime 临时数据 / 绝对路径
UNEXPECTED="$(printf '%s\n' "${ZIP_ENTRIES}" | awk 'BEGIN { c = 0 } /(^|\/)\.git(\/|$)|^dist\/|^runtime\/|^\/home\/|^\/tmp\// { c++ } END { print c + 0 }')"
if [ "${UNEXPECTED}" -ne 0 ]; then
    printf '%s\n' "${ZIP_ENTRIES}" | grep -E '(^|/)\.git(/|$)|^dist/|^runtime/|^/home/|^/tmp/' >&2
    echo "错误: zip 中出现意外条目，共 ${UNEXPECTED} 个" >&2
    exit 1
fi

echo "包内文件数: ${FILE_COUNT}（metadata.json 位于 zip 根）"
