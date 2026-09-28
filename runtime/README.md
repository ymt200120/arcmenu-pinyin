# `runtime/`：隔离运行时验证

这套脚本在临时环境中启动 headless GNOME Shell，加载 ArcMenu、ArcMenu Pinyin
和探针扩展，检查注入、禁用恢复和重新启用流程。脚本只读取仓库和指定的
ArcMenu 源目录，运行数据写入 `/tmp` 下的隔离目录。

## 隔离边界

`run-isolated-check.sh` 会：

- 用 `dbus-run-session` 创建私有会话总线，并把 `XDG_RUNTIME_DIR` 设为运行目录下的
  0700 子目录。`lib/isolation-asserts.sh` 会比较真实会话的环境；当
  `dbus-run-session` 在 `/tmp` 创建 `dbus-*` socket 时，也会检查 socket 名称和路径；
- 把 `HOME`、`XDG_DATA_HOME`、`XDG_CONFIG_HOME`、`XDG_CACHE_HOME` 和状态目录设为
  运行目录下的子目录；
- 在任何 dconf、gsettings 或 gnome-shell 操作之前运行 `assert_isolation`。真实
  `HOME`、XDG 目录、runtime 目录或会话总线一旦被复用，断言立即以非零状态退出；
- 将 ArcMenu、ArcMenu Pinyin 和探针复制到隔离扩展目录。ArcMenu 源目录不会被修改；
- 只在隔离数据目录中创建用于测试的 `.desktop` 文件。

脚本结束时会停止自己启动的 headless Shell，并保留运行目录，方便查看结果和日志。
它不安装系统包，也不写入日常桌面配置。

## 检查内容

headless GNOME Shell 中会加载真实 ArcMenu 70.0、ArcMenu Pinyin 和
`probe-pinyin-check@ymt200120`，然后执行三个阶段：

1. `phase1` 检查注入后的活跃布局、应用数量、分桶字符顺序和五个多音字样例：
   微信→W、腾讯会议→T、哔哩哔哩→B、重庆银行→C、厦门银行→X。实际出现的分桶必须
   属于 `#` 或 A–Z，且按字母顺序排列；
2. `phase2` 通过 `gnome-extensions disable` 禁用本扩展，等待官方分桶恢复，并检查
   是否重新出现 CJK 分桶；
3. `phase3` 重新启用本扩展，检查拼音分桶是否恢复。

每个阶段最多轮询 15 次，每秒一次，以等待 ArcMenu 视图完成重建。探针会把阶段结果
写入 `results.json`，脚本还会检查探针错误并输出非 DING 的 `JS ERROR` 数量。

跳转面板的固定键位模型（`#` + A–Z，共 27 键）由
`tests/bucketgrid.test.mjs` 覆盖；运行时探针记录当前网格按钮数，但阶段通过条件主要
检查分桶、顺序和恢复流程。

## 用法

本机需要安装 ArcMenu 70.x。未提供参数时，脚本读取
`$HOME/.local/share/gnome-shell/extensions/arcmenu@arcmenu.com`：

```bash
runtime/run-isolated-check.sh
```

也可以传入一个 ArcMenu 扩展目录作为副本来源：

```bash
runtime/run-isolated-check.sh /path/to/arcmenu@arcmenu.com
```

成功时输出 `EVAL PASS`，退出码为 0。默认运行目录由
`mktemp -d /tmp/amp-verify.XXXXXX` 创建，目录中会保留 `results.json`、`shell.log`
和 `cli.log` 等证据。

如需指定目录，可使用一个尚不存在的 `/tmp` 直接子目录：

```bash
AMP_RUN=/tmp/amp-verify-manual runtime/run-isolated-check.sh
```

脚本会在第一次写入前拒绝 `$HOME`、`/`、嵌套路径、已有目录和已有符号链接。显式
目录由 `mkdir` 原子创建，权限为 0700；脚本不会清理或覆盖 `AMP_RUN` 指定的目录。

## 实现备注

GNOME Shell 46 在禁用扩展时，可能暂时禁用再启用其后仍启用的扩展（rebase）。探针
保留 `_started` 状态，跨过这段周期继续运行；这也覆盖了本扩展状态机的幂等路径。

探针每个阶段都等待状态收敛，避免把扩展状态事件和 ArcMenu 视图重建之间的时序当成
验证失败。

## CI

headless GNOME Shell 加载真实 ArcMenu 需要本机扩展和显示环境，因而
`run-isolated-check.sh` 不在公开 CI 中运行。`.github/workflows/ci.yml` 当前覆盖：

- Node 20 和 22 的测试，以及 6 个用例的 `runtime/test-probe-monotonic.mjs`；
- GJS 下运行同一套单元测试；
- Shell 语法检查和 `runtime/test-isolation-asserts.sh`；
- 发布包结构审计，以及由 `scripts/build.sh` 生成的 `.sha256` 文件校验。

runtime 验证在本机运行脚本。仓库里的 `docs/verification/` 保存的是固定 27 键改动前的
历史运行证据；它可以说明当时的注入和恢复流程，但不能作为 1.1.0 固定键位的证明。
要验证当前代码，请运行脚本并查看它输出的运行目录和 `results.json`。
