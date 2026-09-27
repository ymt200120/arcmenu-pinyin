# shellcheck shell=bash
# ArcMenu Pinyin — runtime 隔离断言库（仅 runtime 验证套件使用）
#
# assert_isolation 必须在隔离会话内、任何可能写入 dconf / 用户配置 /
# 启动 gnome-shell 的操作之前调用。任何一项不满足立即打印诊断并以
# 42 退出（fail-closed），不得继续执行。
#
# 本文件只读取环境变量、只写 stderr，无任何副作用，
# 因此可在纯 shell 测试（test-isolation-asserts.sh）中反复加载执行。
#
# 所需输入（由 run-isolated-check.sh 外层捕获并导出）：
#   REAL_HOME                 进入沙箱前的真实 $HOME
#   REAL_XDG_RUNTIME_DIR      进入沙箱前的真实 XDG_RUNTIME_DIR
#   REAL_SESSION_BUS_ADDRESS  进入沙箱前的真实 DBUS_SESSION_BUS_ADDRESS
# 以及由内层设置的隔离值：
#   RUN                       沙箱根目录
#   HOME / XDG_CONFIG_HOME / XDG_DATA_HOME / XDG_RUNTIME_DIR
#   DBUS_SESSION_BUS_ADDRESS  私有会话总线（dbus-run-session）

assert_isolation() {
    # 0. 外层基准必须存在（缺失说明 harness 装配错误，同样 fail-closed）
    if [ -z "${REAL_HOME:-}" ]; then
        echo "FATAL(isolation): REAL_HOME not provided by outer harness" >&2
        exit 42
    fi
    if [ -z "${REAL_SESSION_BUS_ADDRESS:-}" ]; then
        echo "FATAL(isolation): REAL_SESSION_BUS_ADDRESS not provided by outer harness" >&2
        exit 42
    fi
    if [ -z "${REAL_XDG_RUNTIME_DIR:-}" ]; then
        echo "FATAL(isolation): REAL_XDG_RUNTIME_DIR not provided by outer harness" >&2
        exit 42
    fi

    # 1. HOME 必须已隔离且位于沙箱内
    if [ -z "${HOME:-}" ] || [ "$HOME" = "$REAL_HOME" ]; then
        echo "FATAL(isolation): HOME not isolated (HOME=${HOME:-<unset>})" >&2
        exit 42
    fi
    case "$HOME" in
        "$RUN"/*) ;;
        *)
            echo "FATAL(isolation): HOME not under sandbox ($RUN): $HOME" >&2
            exit 42 ;;
    esac

    # 2. XDG_CONFIG_HOME 不得指向真实配置
    if [ "${XDG_CONFIG_HOME:-}" = "$REAL_HOME/.config" ]; then
        echo "FATAL(isolation): XDG_CONFIG_HOME points at real user config" >&2
        exit 42
    fi
    case "$XDG_CONFIG_HOME" in
        "$RUN"/*) ;;
        *)
            echo "FATAL(isolation): XDG_CONFIG_HOME not under sandbox: ${XDG_CONFIG_HOME:-<unset>}" >&2
            exit 42 ;;
    esac

    # 3. XDG_DATA_HOME 不得指向真实用户数据
    if [ "${XDG_DATA_HOME:-}" = "$REAL_HOME/.local/share" ]; then
        echo "FATAL(isolation): XDG_DATA_HOME points at real user data" >&2
        exit 42
    fi
    case "$XDG_DATA_HOME" in
        "$RUN"/*) ;;
        *)
            echo "FATAL(isolation): XDG_DATA_HOME not under sandbox: ${XDG_DATA_HOME:-<unset>}" >&2
            exit 42 ;;
    esac

    # 4. XDG_RUNTIME_DIR 必须是沙箱内私有目录（不得共享 /run/user/<uid>）
    if [ -z "${XDG_RUNTIME_DIR:-}" ] || [ "$XDG_RUNTIME_DIR" = "$REAL_XDG_RUNTIME_DIR" ]; then
        echo "FATAL(isolation): XDG_RUNTIME_DIR not isolated (${XDG_RUNTIME_DIR:-<unset>})" >&2
        exit 42
    fi
    if [ "$XDG_RUNTIME_DIR" != "${RUN:-}/runtime" ]; then
        echo "FATAL(isolation): XDG_RUNTIME_DIR is not the private runtime dir: $XDG_RUNTIME_DIR" >&2
        exit 42
    fi

    # 5. 会话总线必须是私有总线
    if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
        echo "FATAL(isolation): DBUS_SESSION_BUS_ADDRESS not set (private bus missing)" >&2
        exit 42
    fi
    if [ "$DBUS_SESSION_BUS_ADDRESS" = "$REAL_SESSION_BUS_ADDRESS" ]; then
        echo "FATAL(isolation): session bus is the real desktop session bus" >&2
        exit 42
    fi
    case "$DBUS_SESSION_BUS_ADDRESS" in
        *"$REAL_XDG_RUNTIME_DIR"*)
            echo "FATAL(isolation): session bus references real runtime dir: $DBUS_SESSION_BUS_ADDRESS" >&2
            exit 42 ;;
    esac
    case "$DBUS_SESSION_BUS_ADDRESS" in
        *"runtime=yes"*|*"$XDG_RUNTIME_DIR"*) ;;
        *)
            echo "FATAL(isolation): session bus not private: $DBUS_SESSION_BUS_ADDRESS" >&2
            exit 42 ;;
    esac

    return 0
}
