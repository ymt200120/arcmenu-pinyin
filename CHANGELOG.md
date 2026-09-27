# Changelog

## arcmenu-pinyin 1.0.0 (2026-09-27)

仓库由"覆盖式补丁套件"转型为独立扩展 `arcmenu-pinyin@ymt200120`。

### 新形态：独立扩展（不修改 ArcMenu 任何文件）

- 运行时集成：`Main.extensionManager.lookup()` 定位 ArcMenu → 按 URI 导入其 ES 模块
  （GJS 模块缓存共享）→ 对 `BaseMenuLayout.prototype` 的
  `_createSortedAppsList` / `_displayAppList` 做临时覆写；
- 复用官方 Bucket Jump List：拼音字母直接注册进 `addBucketChar()`，
  弹窗网格与点击跳转全部为官方实现；
- 兼容性门控：结构审计（注入点逐项形状校验）+ ArcMenu 版本白名单（当前 70.x），
  不通过即安全拒绝注入；
- 生命周期状态机：ArcMenu 与本扩展的启用顺序无关；ArcMenu 禁用时自动撤除注入；
  对 GNOME 扩展禁用 rebase 循环幂等；
- 拼音转换升级：pinyin-pro 整串分词转换取首字母，首字多音字按词定音
  （重庆银行→C 而非 Z、厦门银行→X 而非 S；旧补丁为仅转首字）。

### 验证

- 单元测试 16 项：Node 与 GJS 双跑全通过（`tests/`）；
- 隔离 headless GNOME Shell 46.0 + 真实 ArcMenu 70.0 端到端验证：
  注入 → CLI 禁用 → 官方行为恢复 → 再启用 → 拼音恢复，全链路通过、
  零 JS 错误（`runtime/run-isolated-check.sh`，证据见 `docs/verification/`）。

### 与上游的关系

- Alphabet Jump List 已通过上游 MR !284 合入 ArcMenu 70.0（官方名 Bucket Jump List）；
- 旧覆盖式补丁（含旧 install.sh）移入 `legacy/` 仅作存档，禁止使用。
