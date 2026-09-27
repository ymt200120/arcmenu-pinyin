#!/usr/bin/env bash
# isolation-asserts.sh 的纯 shell 行为测试。
# 无 GNOME / 无 dconf / 无 gsettings / 无文件写入 —— 可安全在宿主机运行。
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
run_case 42 'REAL_HOME 缺失（harness 装配错误）→ 拒绝'        t_no_real_home
run_case 42 'REAL_SESSION_BUS_ADDRESS 缺失 → 拒绝'            t_no_real_bus
run_case 42 'REAL_XDG_RUNTIME_DIR 缺失 → 拒绝'                t_no_real_runtime

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
