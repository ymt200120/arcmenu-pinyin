#!/usr/bin/env bash
# ArcMenu Pinyin — 隔离 headless GNOME Shell 端到端验证
#
# 在完全隔离的环境（独立 dbus 会话 + 独立 HOME/XDG 目录）中启动真实
# gnome-shell --headless，加载真实 ArcMenu + 产品扩展 + 探针扩展，
# 验证：注入 → 拼音分桶 → CLI 禁用产品扩展 → 官方行为恢复 → 再启用 → 拼音恢复。
#
# 本脚本只读取仓库与系统已安装的 ArcMenu（拷贝副本），只在 /tmp 下写入，
# 不触碰日常桌面环境。用法：
#   runtime/run-isolated-check.sh [ArcMenu源目录]
# 未提供参数时自动探测 ~/.local/share/gnome-shell/extensions/arcmenu@arcmenu.com。
set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN="${AMP_RUN:-/tmp/amp-verify}"
ARC_SRC="${1:-$HOME/.local/share/gnome-shell/extensions/arcmenu@arcmenu.com}"
PRODUCT_UUID='arcmenu-pinyin@ymt200120'
PROBE_UUID='probe-pinyin-check@ymt200120'

# ---- 捕获真实环境基准（进入沙箱前），供内层 fail-closed 断言比较 ----
REAL_HOME="$HOME"
REAL_XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
REAL_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}"
export REAL_HOME REAL_XDG_RUNTIME_DIR REAL_SESSION_BUS_ADDRESS

[ -d "$ARC_SRC" ] || { echo "未找到 ArcMenu 扩展目录: $ARC_SRC"; exit 2; }

# ---- 组装隔离环境 ----
rm -rf "$RUN"
mkdir -p "$RUN/data/gnome-shell/extensions" "$RUN/data/applications" \
         "$RUN/home" "$RUN/config/dconf" "$RUN/cache" "$RUN/runtime"
chmod 700 "$RUN/runtime"

cp -r "$ARC_SRC" "$RUN/data/gnome-shell/extensions/arcmenu@arcmenu.com"
cp -r "$REPO_ROOT/arcmenu-pinyin@ymt200120" "$RUN/data/gnome-shell/extensions/$PRODUCT_UUID"
cp -r "$REPO_ROOT/runtime/probe-pinyin-check@ymt200120" "$RUN/data/gnome-shell/extensions/$PROBE_UUID"
mkdir -p "$RUN/lib"
cp "$REPO_ROOT/runtime/lib/isolation-asserts.sh" "$RUN/lib/isolation-asserts.sh"

# ---- 隔离环境的测试应用（中英文 + 多音字样例）----
make_desktop() {
    cat > "$RUN/data/applications/$1.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=$2
Comment=isolated runtime verification app
Exec=/bin/true
Terminal=false
Categories=Utility;
EOF
}
make_desktop weixin        '微信'
make_desktop tme           '腾讯会议'
make_desktop bili          '哔哩哔哩'
make_desktop cqbank        '重庆银行'
make_desktop xmbank        '厦门银行'
make_desktop testalpha     'Test Alpha'
make_desktop testzebra     'Test Zebra'
make_desktop testpw        '1Password Test'
make_desktop testparen     '(Test Paren'

# ---- 内层会话脚本 ----
cat > "$RUN/inner.sh" <<'INNER'
#!/usr/bin/env bash
set -u
RUN="$(dirname "$0")"
RUN="$(cd "$RUN" && pwd)"

export HOME="$RUN/home"
export XDG_DATA_HOME="$RUN/data"
export XDG_CONFIG_HOME="$RUN/config"
export XDG_CACHE_HOME="$RUN/cache"
export XDG_STATE_HOME="$RUN/home/.local/state"
export XDG_RUNTIME_DIR="$RUN/runtime"
export NO_AT_BRIDGE=1

# ---- fail-closed 隔离断言：必须在任何 dconf/gsettings/gnome-shell 操作之前 ----
. "$RUN/lib/isolation-asserts.sh"
assert_isolation

# 手动启动 dconf-service（dbus 激活路径存在首写竞态）
/usr/libexec/dconf-service &
sleep 1

gsettings set org.gnome.shell enabled-extensions "['arcmenu@arcmenu.com', 'arcmenu-pinyin@ymt200120', 'probe-pinyin-check@ymt200120']"
gsettings set org.gnome.shell disable-user-extensions false
sleep 1
echo "isolated env OK; enabled: $(gsettings get org.gnome.shell enabled-extensions)"

wait_stage() {
    local f="$RUN/$1"
    for _ in $(seq 1 "${2:-60}"); do
        [ -f "$f" ] && return 0
        kill -0 "$SHELL_PID" 2>/dev/null || return 1
        sleep 1
    done
    echo "TIMEOUT waiting for $1"
    return 1
}

timeout 150 gnome-shell --headless --virtual-monitor 1280x800 >"$RUN/shell.log" 2>&1 &
SHELL_PID=$!
sleep 8

wait_stage stage1-injected || true
echo "cli: disable product extension"
gnome-extensions disable arcmenu-pinyin@ymt200120 >>"$RUN/cli.log" 2>&1
wait_stage stage2-disabled || true
sleep 1

echo "cli: re-enable product extension"
gnome-extensions enable arcmenu-pinyin@ymt200120 >>"$RUN/cli.log" 2>&1
wait_stage stage3-reenabled || true
sleep 1

kill "$SHELL_PID" 2>/dev/null || true
wait "$SHELL_PID" 2>/dev/null || true
INNER
chmod +x "$RUN/inner.sh"

# ---- 运行 ----
echo ">>> 在隔离会话中启动 gnome-shell --headless ..."
# 私有会话总线：dbus-run-session 在 XDG_RUNTIME_DIR（沙箱私有目录）内
# 创建 bus socket；显式剔除可能残留的真实总线地址。
env -u DBUS_SESSION_BUS_ADDRESS XDG_RUNTIME_DIR="$RUN/runtime" \
    dbus-run-session -- bash "$RUN/inner.sh" 2>&1 | grep -E 'isolated env|cli:|TIMEOUT' || true

# ---- 评估结果 ----
python3 - "$RUN/results.json" <<'PYEOF'
import json, sys

try:
    data = json.load(open(sys.argv[1]))
except Exception as e:
    print(f"EVAL FAIL: no results ({e})")
    sys.exit(1)

stages = {s['stage']: s for s in data['stages']}
failures = []

s1 = stages.get('phase1-injected-state')
s2 = stages.get('phase2-after-product-disable')
s3 = stages.get('phase3-after-product-reenable')

def chk(cond, msg):
    if not cond:
        failures.append(msg)

chk(s1, 'phase1 缺失（产品注入态未验证）')
if s1:
    chk(s1.get('converged'), 'phase1: 轮询未收敛（未见拼音分桶）')
    chk(s1.get('layoutFound'), 'phase1: 未找到活的布局实例')
    chk(s1.get('allPinyinBuckets'), f"phase1: 分桶非纯 A-Z: {s1.get('buckets')}")
    chk(s1.get('monotonic'), 'phase1: 字母序列非单调')
    chk(s1.get('appCount', 0) > 10, 'phase1: 应用数量异常')
    for name, info in (s1.get('targets') or {}).items():
        chk(info.get('found') and info.get('bucket') == info.get('expected'),
            f"phase1: {name} 期望 {info.get('expected')}，实际 {info.get('bucket')}")

chk(s2, 'phase2 缺失（禁用恢复未验证）')
if s2:
    chk(s2.get('converged'), 'phase2: 轮询未收敛（未见官方分桶恢复）')
    chk(s2.get('layoutFound'), 'phase2: 未找到布局实例')
    chk(s2.get('hasCjkBuckets'), f"phase2: 禁用后未恢复官方 CJK 分桶: {s2.get('buckets')}")

chk(s3, 'phase3 缺失（再启用恢复未验证）')
if s3:
    chk(s3.get('converged'), 'phase3: 轮询未收敛（拼音分桶未恢复）')
    chk(s3.get('allPinyinBuckets'), f"phase3: 再启用后拼音分桶未恢复: {s3.get('buckets')}")

chk(not data.get('errors'), f"探针内部错误: {data.get('errors')}")

for s in data['stages']:
    brief = {k: v for k, v in s.items() if k in ('stage', 'appCount', 'buckets', 'monotonic')}
    print('  ', json.dumps(brief, ensure_ascii=False)[:220])

if failures:
    print('\nEVAL FAIL:')
    for f in failures:
        print('  -', f)
    sys.exit(1)
print('\nEVAL PASS: 注入态 A-Z 分桶 / 禁用即恢复官方 / 再启用即恢复拼音 全部通过')
PYEOF
rc=$?

echo '--- 非 DING 的 JS ERROR 数（期望 0）---'
grep 'JS ERROR' "$RUN/shell.log" 2>/dev/null | grep -cv DING || true

# 清理私有 runtime 目录（结果与日志保留在 $RUN 供查阅）
rm -rf "$RUN/runtime"

exit $rc
