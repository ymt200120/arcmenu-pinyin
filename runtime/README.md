# runtime/ — 隔离实机验证套件

本目录包含在**完全隔离的环境**中对本扩展做端到端运行时验证的全部材料。

## 隔离保证

`run-isolated-check.sh` 的运行方式：

- 通过 `dbus-run-session` 启动**私有 DBus 会话**（与你正在使用的桌面会话完全隔离）；
  会话总线 socket 与全部内层进程的 `XDG_RUNTIME_DIR` 指向沙箱内私有目录（0700），
  不共享真实 `/run/user/<uid>`；
- `HOME`/`XDG_DATA_HOME`/`XDG_CONFIG_HOME`/`XDG_CACHE_HOME` 全部指向 `/tmp` 下的临时目录；
- 内层会话在**任何** dconf/gsettings/gnome-shell 操作之前执行 fail-closed 隔离断言
  （`lib/isolation-asserts.sh`：HOME、XDG_*、私有会话总线与真实环境逐一比对，
  任何一项不满足立即以非零码退出；断言库行为由 `test-isolation-asserts.sh` 纯 shell 测试覆盖）；
- 从系统**拷贝**一份 ArcMenu 副本到隔离扩展目录（原目录只读，不做任何修改）；
- 测试用的中英文/多音字 `.desktop` 文件只存在于隔离目录；
- 退出时仅终止本次会话中由脚本自己启动的进程。

不会安装任何系统包，不会写入用户配置，不会触碰正在运行的桌面会话。

## 验证内容

加载真实 ArcMenu 70.0 + 真实本扩展 + 探针扩展（本目录 `probe-pinyin-check@ymt200120`），在 headless GNOME Shell 中自动完成：

1. **phase1（注入态）**：所有应用按拼音 A-Z 分桶（BucketJump 键值纯字母）、桶序单调、
   目标应用（微信→W、腾讯会议→T、哔哩哔哩→B、重庆银行→C、厦门银行→X）全部命中；
2. **phase2（禁用恢复）**：通过 `gnome-extensions disable` 禁用本扩展后，
   BucketJump 立即回到官方分桶（原始首字符，含 CJK 桶）；
3. **phase3（再启用恢复）**：`gnome-extensions enable` 后拼音分桶恢复。

全程统计非 DING 的 `JS ERROR`（期望为 0）。

## 用法

```bash
# 需要本机已安装 ArcMenu 70.x（仅读取，作为副本来源）
runtime/run-isolated-check.sh
# 或指定 ArcMenu 扩展目录（例如从 upstream 构建包解出的目录）
runtime/run-isolated-check.sh /path/to/arcmenu@arcmenu.com
```

输出 `EVAL PASS` 且退出码为 0 即全部通过；`/tmp/amp-verify/results.json` 保存完整阶段证据。

## 设计说明

- GNOME Shell 46 的 `gnome-extensions disable` 会触发"rebase"（禁用一个扩展时，
  GNOME 会把在它之后启用的扩展临时 disable→enable 一轮，见 `extensionSystem.js`
  `_callExtensionDisable`）。探针的状态机因此必须跨 enable/disable 周期保持
  （`_started` 哨兵），这也是对本扩展自身幂等性的隐式检验。
- 探针的每个阶段都带轮询收敛（最多 15 次），避免与时序敏感的事件竞态。

## CI 说明

`.github/workflows/ci.yml` 中的 `runtime-verify` 任务默认 `continue-on-error`，
因为在 GitHub 托管运行器上需要额外配置 ArcMenu 70 构建包的获取方式
（ArcMenu 官方发布于 GitLab Releases / extensions.gnome.org，URL 变动较频繁）。
本地运行 `runtime/run-isolated-check.sh` 是权威验证途径。
