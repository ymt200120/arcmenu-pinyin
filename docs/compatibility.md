# 兼容性表与门控策略

## 支持状态分级

**✅ 真机验证**（完整功能 + 真机卸载/重装周期，证据 `docs/verification/` 与 canary 报告）：

| ArcMenu | GNOME Shell | 验证方式 |
| --- | --- | --- |
| 70.0 (version 74) | 46.0 (Ubuntu 24.04.4, Wayland) | 隔离 headless Shell 端到端 + 主力真机 Canary（安装/启用/卸载/重装）+ Node/GJS 单元测试 |

**🔍 仅静态结构审计**（shell-version 允许安装；注入前逐项形状审计，不匹配即安全拒绝）：

- GNOME Shell 45 / 47–49（shell-version 列表允许安装，运行时行为未实测）
- ArcMenu 70.x 其他小版本（构建差异未知，审计兜底）

**❓ 未测试**：

- ArcMenu 71+ 及其他主版本（默认拒绝注入）
- X11 会话、多显示器第二屏菜单细节
- extensions.gnome.org 商店合规性

## 门控策略（对未验证版本的保护）

本扩展对 ArcMenu 的集成是**运行时结构注入**，因此内置两道门：

1. **结构审计**（`src/compat.js` `auditArcMenu()`）：逐项确认
   `BaseMenuLayout.prototype` 上的 `_createSortedAppsList` / `_displayAppList` /
   `_createLabelWithSeparator` / `setDefaultMenuView` / `_destroyMenuItems` 存在，
   且 `_displayAppList` 源码包含 `charAt(0).toUpperCase()` / `addBucketChar` /
   `populateMenu` 标记（与 ArcMenu 70.0 的实现一致），`utils.getAppDisplayName`、
   `constants.CategoryType/DisplayType`、`ArcMenuManager` 单例访问器可用。
2. **版本白名单**（`VERIFIED_ARCMENU_MAJORS`）：当前仅 `['70']`。

任一门不通过：**拒绝注入**，输出 `[arcmenu-pinyin]` 前缀的诊断日志，本扩展保持启用但
不产生任何行为，ArcMenu 完全运行官方代码。不会以"捕获一切异常"的方式带病运行。

## 适配新版本的流程

1. 阅读 ArcMenu 新版 `menulayouts/baseMenuLayout.js` 的 `_displayAppList` /
   `_createSortedAppsList`，确认结构审计各项仍成立，或更新 `auditArcMenu()`；
2. 在本机运行 `runtime/run-isolated-check.sh`（隔离环境，不影响日常桌面）；
3. 全部通过后，把新主版本加入 `VERIFIED_ARCMENU_MAJORS` 并更新本表。

## 已知限制

- GNOME Shell 45/47–49 未实测（shell-version 列表允许安装，风险由门控兜底）；
- pinyin-pro 词库决定多音字覆盖面，冷门专名可能分组偏差（仅影响所在字母桶）；
- 全角字符开头的名称归入 `#` 桶；
- Bucket Jump 弹窗按钮布局由官方 `populateMenu()` 决定（8 列上限内的自适应网格）。
