# 兼容性

下面把已经运行过的验证、允许安装但未运行验证的版本和完全未测试的组合分开记录。

## 已验证

| ArcMenu | GNOME Shell | 验证方式 |
| --- | --- | --- |
| 70.0（version 74） | 46.0（Ubuntu 24.04.4，Wayland） | 隔离 headless Shell 端到端验证、主力机 Canary 的安装/启用/卸载/重装周期（记录在仓库外），以及 Node/GJS 测试 |

仓库内的 `docs/verification/` 记录的是固定 27 键改动前的历史运行；主力机 Canary 的
完整记录保存在仓库外。

## 允许安装但未运行验证

这些组合没有对应的运行时验证记录：

- GNOME Shell 45、47–49：`metadata.json` 声明支持这些 Shell 版本，但实际是否注入仍
  由结构审计决定；
- ArcMenu 70.x 的其他小版本：主版本白名单允许继续审计，但构建差异可能导致拒绝注入。

## 不在当前支持范围或未覆盖

- ArcMenu 71 及更高主版本不在当前版本白名单中，扩展不会注入；
- X11 会话和多显示器第二屏菜单细节；
- extensions.gnome.org 的商店合规性。

## 注入门控

本扩展通过运行时结构注入接入 ArcMenu，因此在注入前会执行两项检查：

1. `src/compat.js` 的 `auditArcMenu()` 检查 `BaseMenuLayout.prototype` 上的
   `_createSortedAppsList`、`_displayAppList`、`_createLabelWithSeparator`、
   `setDefaultMenuView` 和 `_destroyMenuItems`，以及 `utils.getAppDisplayName`、
   `constants.CategoryType/DisplayType` 和 `ArcMenuManager` 单例访问器。它还检查
   `_displayAppList` 的分桶标记，以及 `BucketJumpListDialog` 的
   `populateMenu`、`_scrollToItem` 和相关按钮创建逻辑；
2. `VERIFIED_ARCMENU_MAJORS` 决定允许注入的 ArcMenu 主版本，目前只有 `['70']`。

任一检查失败，扩展都会记录带 `[arcmenu-pinyin]` 前缀的诊断并跳过注入。扩展可以
保持启用，但不会接管 ArcMenu 的方法。

## 适配新版本

1. 阅读新版本的 `menulayouts/baseMenuLayout.js`、`menuWidgets.js` 和相关模块，确认
   `_displayAppList`、`_createSortedAppsList`、`BucketJumpListDialog.populateMenu`
   等结构仍符合审计条件，必要时更新 `auditArcMenu()`；
2. 在安装了该版本 ArcMenu 的机器上运行 `runtime/run-isolated-check.sh`；
3. 端到端验证通过后，把主版本加入 `VERIFIED_ARCMENU_MAJORS`，并更新本表和相关证据。

## 已知限制

- GNOME Shell 45、47–49 目前未做运行时验证；它们虽然允许安装，是否注入仍由结构审计
  和版本门控决定；
- 多音字取决于 pinyin-pro 的内置词库，未收录的冷门专名可能进入非预期字母桶；
- 以全角字符开头的名称进入 `#` 桶；
- 跳转面板由扩展包装官方 `BucketJumpListDialog.populateMenu()`，固定显示 `#` + A–Z
  共 27 个键。网格列数沿用 ArcMenu 70.0 的公式，并受 8 列上限限制；无应用的键置灰
  且不可点击。
