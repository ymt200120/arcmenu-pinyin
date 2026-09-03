# Changelog

## v1.0.0 (2026-08-28)

首个公开发布版本。

### Alphabet Jump List（所有分组列表布局）

- 点击"所有应用"列表中的字母分组标题弹出 A-Z 选择面板（6 列网格，主题继承）
- 有应用的字母可点，无应用的置灰禁用
- 点击字母精确滚动到对应分组（实测比值自校准缩放）
- Esc / 点击面板外 / 重复点击标题关闭，全部由 PopupMenuManager 托管
- 已知修复（相对早期实验版）：
  - 移除侧边字母栏方案（stage 级 captured-event 拖拽存在处理器泄漏风险，
    曾导致全局输入冻结）
  - 跳转偏移改为实测比值，修复分数缩放下"点 W 落在 M"的偏差
  - header 改用 button-press-event 挂钩（PopupBaseMenuItem 的 ClickAction
    由构造参数决定 enabled，activate 信号对 ArcMenuSeparator 不发射）

### 拼音分组（az 布局）

- 应用按拼音首字母重排分组，汉字名归入 A-Z，数字/符号/未收录字符归 #
- 捆绑 pinyin-pro v3.29.3（MIT，纯 JS，GJS 兼容）
- 组标题与索引面板使用大写字母，与 Windows 中文环境行为一致

### 基础设施

- install.sh：增量备份 + ArcMenu 版本更新自动检测刷新基准
- uninstall.sh：一键恢复全部原始文件
- test/：pinyin-pro GJS 兼容性验证、分组排序模拟、Clutter API introspection
