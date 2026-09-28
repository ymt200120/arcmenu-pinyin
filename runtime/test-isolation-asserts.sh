#!/usr/bin/env bash
# isolation-asserts.sh 的纯 shell 行为测试。
# 无 GNOME / 无 dconf / 无 gsettings；目录安全回归用例只调用外层脚本的
# 预检路径，并使用自己创建的临时目录 —— 可安全在宿主机运行。
# 断言库以 source 方式加载（与 run-isolated-check.sh 内层使用的是同一实现）。
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/isolation-asserts.sh
source "$HERE/lib/isolation-asserts.sh"

pass=0
fail=0

# 每个用例先重置为"全隔离"基线，再注入单一破坏因素。
# 在子 shell 中调用：assert_isolation 的 exit 42 只退出子 shell。
base_env() {
    HOME=/tmp/sandbox/home
    XDG_CONFIG_HOME=/tmp/sandbox/config
    XDG_DATA_HOME=/tmp/sandbox/data
    XDG_CACHE_HOME=/tmp/sandbox/cache
    XDG_RUNTIME_DIR=/tmp/sandbox/runtime
    DBUS_SESSION_BUS_ADDRESS='unix:runtime=yes,guid=abc123'
    REAL_HOME=/realhome
    REAL_XDG_RUNTIME_DIR=/run/user/1000
    REAL_SESSION_BUS_ADDRESS='unix:path=/run/user/1000/bus'
    RUN=/tmp/sandbox
}

t_ok()                 { base_env; assert_isolation; }
t_home_is_real()       { base_env; HOME=/realhome; assert_isolation; }
t_home_outside()       { base_env; HOME=/elsewhere/home; assert_isolation; }
t_config_is_real()     { base_env; XDG_CONFIG_HOME=/realhome/.config; assert_isolation; }
t_config_outside()     { base_env; XDG_CONFIG_HOME=/elsewhere/config; assert_isolation; }
t_data_is_real()       { base_env; XDG_DATA_HOME=/realhome/.local/share; assert_isolation; }
t_data_outside()       { base_env; XDG_DATA_HOME=/elsewhere/data; assert_isolation; }
t_runtime_is_real()    { base_env; XDG_RUNTIME_DIR=/run/user/1000; assert_isolation; }
t_runtime_not_private() { base_env; XDG_RUNTIME_DIR=/tmp/other-runtime; assert_isolation; }
t_bus_unset()          { base_env; DBUS_SESSION_BUS_ADDRESS=''; assert_isolation; }
t_bus_is_real()        { base_env; DBUS_SESSION_BUS_ADDRESS='unix:path=/run/user/1000/bus'; assert_isolation; }
t_bus_refs_real_dir()  { base_env; DBUS_SESSION_BUS_ADDRESS='unix:path=/run/user/1000/bus,guid=x'; assert_isolation; }
t_bus_not_private()    { base_env; DBUS_SESSION_BUS_ADDRESS='unix:path=/tmp/unrelated/bus'; assert_isolation; }
t_bus_tmp_private()    { base_env; DBUS_SESSION_BUS_ADDRESS='unix:path=/tmp/dbus-abc123'; assert_isolation; }
t_bus_tmp_private_guid() { base_env; DBUS_SESSION_BUS_ADDRESS='unix:path=/tmp/dbus-abc123,guid=x'; assert_isolation; }
t_bus_tmp_nested()     { base_env; DBUS_SESSION_BUS_ADDRESS='unix:path=/tmp/dbus-abc123/nested'; assert_isolation; }
t_bus_tmp_missing_id() { base_env; DBUS_SESSION_BUS_ADDRESS='unix:path=/tmp/dbus-'; assert_isolation; }
t_no_real_home()       { base_env; REAL_HOME=''; assert_isolation; }
t_no_real_bus()        { base_env; REAL_SESSION_BUS_ADDRESS=''; assert_isolation; }
t_no_real_runtime()    { base_env; REAL_XDG_RUNTIME_DIR=''; assert_isolation; }

run_case() {
    local want="$1" desc="$2" fn="$3" rc=0
    ( "$fn" ) >/dev/null 2>&1 || rc=$?
    if [ "$rc" -eq "$want" ]; then
        pass=$((pass + 1))
        echo "PASS  $desc"
    else
        fail=$((fail + 1))
        echo "FAIL  $desc (期望退出码 $want，实际 $rc)"
    fi
}

echo '== isolation-asserts 行为测试（纯 shell，无 GNOME）=='
run_case 0  '全隔离基线 → 通过'                                t_ok
run_case 42 'HOME == REAL_HOME → 拒绝'                        t_home_is_real
run_case 42 'HOME 不在沙箱内 → 拒绝'                          t_home_outside
run_case 42 'XDG_CONFIG_HOME == 真实配置 → 拒绝'              t_config_is_real
run_case 42 'XDG_CONFIG_HOME 不在沙箱内 → 拒绝'               t_config_outside
run_case 42 'XDG_DATA_HOME == 真实用户数据 → 拒绝'            t_data_is_real
run_case 42 'XDG_DATA_HOME 不在沙箱内 → 拒绝'                 t_data_outside
run_case 42 'XDG_RUNTIME_DIR == 真实 runtime → 拒绝'          t_runtime_is_real
run_case 42 'XDG_RUNTIME_DIR 非私有 runtime 目录 → 拒绝'      t_runtime_not_private
run_case 42 'DBUS_SESSION_BUS_ADDRESS 未设置 → 拒绝'          t_bus_unset
run_case 42 '会话总线 == 真实会话总线 → 拒绝'                 t_bus_is_real
run_case 42 '会话总线引用真实 runtime 目录 → 拒绝'            t_bus_refs_real_dir
run_case 42 '会话总线非私有（无关路径）→ 拒绝'                t_bus_not_private
run_case 0  'dbus-run-session /tmp/dbus-* socket → 通过'     t_bus_tmp_private
run_case 0  'dbus-run-session /tmp/dbus-* + guid → 通过'     t_bus_tmp_private_guid
run_case 42 '嵌套 /tmp/dbus-* 路径 → 拒绝'                   t_bus_tmp_nested
run_case 42 '缺少 /tmp/dbus-* socket 名称 → 拒绝'            t_bus_tmp_missing_id
run_case 42 'REAL_HOME 缺失（harness 装配错误）→ 拒绝'        t_no_real_home
run_case 42 'REAL_SESSION_BUS_ADDRESS 缺失 → 拒绝'            t_no_real_bus
run_case 42 'REAL_XDG_RUNTIME_DIR 缺失 → 拒绝'                t_no_real_runtime

# 外层 harness 的目录安全预检：先静态确认没有递归删除命令，再用危险目标
# 做动态拒绝测试。这样回归时即使目标是 $HOME 或 /，也不会进入任何写入路径。
RUN_CHECK="$HERE/run-isolated-check.sh"
MISSING_ARC="$HERE/.missing-arcmenu-for-safety-test"
safety_tmp=''
safety_marker=''

cleanup_safety_tmp() {
    if [ -n "$safety_marker" ]; then
        unlink "$safety_marker" 2>/dev/null || true
    fi
    if [ -n "$safety_tmp" ]; then
        rmdir "$safety_tmp" 2>/dev/null || true
    fi
}
trap cleanup_safety_tmp EXIT

if grep -Eq '(^|[[:space:];])rm[[:space:]]+-[^[:space:]]*r' "$RUN_CHECK"; then
    fail=$((fail + 1))
    echo 'FAIL  外层 harness 不得包含递归删除命令'
else
    pass=$((pass + 1))
    echo 'PASS  外层 harness 不包含递归删除命令'
fi

run_amp_reject() {
    local candidate="$1" desc="$2" output rc=0
    output="$(AMP_RUN="$candidate" "$RUN_CHECK" "$MISSING_ARC" 2>&1)" || rc=$?
    if [ "$rc" -eq 2 ] && printf '%s\n' "$output" | grep -q '拒绝 AMP_RUN'; then
        pass=$((pass + 1))
        echo "PASS  $desc"
    else
        fail=$((fail + 1))
        echo "FAIL  $desc (期望预检退出码 2，实际 $rc)"
    fi
}

run_amp_reject "$HOME" 'AMP_RUN=$HOME → 在写入前拒绝'
run_amp_reject / 'AMP_RUN=/ → 在写入前拒绝'

if safety_tmp="$(mktemp -d /tmp/amp-safety-existing.XXXXXX)"; then
    safety_marker="$safety_tmp/marker"
    : > "$safety_marker"
    output=''
    rc=0
    output="$(AMP_RUN="$safety_tmp" "$RUN_CHECK" "$MISSING_ARC" 2>&1)" || rc=$?
    if [ "$rc" -eq 2 ] && [ -f "$safety_marker" ] && printf '%s\n' "$output" | grep -q '目标已存在'; then
        pass=$((pass + 1))
        echo 'PASS  已存在 AMP_RUN → 拒绝且保留原目录'
    else
        fail=$((fail + 1))
        echo "FAIL  已存在 AMP_RUN → 拒绝且保留原目录 (退出码 $rc)"
    fi
else
    fail=$((fail + 1))
    echo 'FAIL  无法创建已有 AMP_RUN 的回归测试目录'
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
