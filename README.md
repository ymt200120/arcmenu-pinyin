# ArcMenu Alphabet Jump List

Windows 10/11 风格的字母快速跳转 + az 布局拼音分组，为 [ArcMenu](https://gitlab.com/arcmenu/ArcMenu)（GNOME Shell 扩展）打造的补丁套件。

> **状态**：v1.0.0 ｜ 上游 MR 准备中（MR 合并后本仓库将只剩拼音分组部分）

## 功能演示

TODO: 录制 10 秒演示 GIF（打开菜单 → All Apps → 点击字母标题 → 面板 → 跳转）放入本节。

## 功能

### Alphabet Jump List（所有列表布局通用）

- 点击"所有应用"列表中的**字母分组标题**（A、B、C…、#），菜单中央弹出 A-Z 选择面板
- 面板 6 列网格；有应用的字母可点击，无应用的字母置灰禁用
- 点击字母 → 面板关闭 → 列表精确滚动到对应分组（自校准缩放，HiDPI/分数缩放下准确）
- 关闭方式：点击字母跳转后自动关 / 点击面板外 / 按 Esc / 再次点击分组标题
  ——全部由 GNOME 自带的 PopupMenuManager 托管，与 ArcMenu 自带弹层（文件夹弹窗等）互斥
- 面板继承 ArcMenu 当前主题（`popup-menu arcmenu-menu`），按钮 hover/active 跟随主题
- 仅在"所有应用"视图且开启 ArcMenu 的 "Group Apps Alphabetically" 设置时生效

### 拼音分组（az 布局）

- "所有应用"按**拼音首字母**重排与分组：微信 → W、腾讯会议 → T、哔哩哔哩 → B
- 数字/符号/未收录字符归入 `#` 组（排在最后）
- 运行时汉字转拼音使用 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) v3.29.3（MIT，纯 JS ESM，无 Node 依赖，GJS 兼容）

## 兼容性

| 组件 | 版本 |
| --- | --- |
| ArcMenu | v69.2 (v73)，其他版本重装本补丁时会自动刷新基准备份 |
| GNOME Shell | 46（实测）；代码仅用 45+ 稳定 API，理论上 45-50 可用 |
| 输入架构 | Wayland / X11 均可（重登方式按桌面而定） |

Jump List 部分挂钩在 `baseMenuLayout.js` 的分组标题创建处，凡使用字母分组列表的布局
（az / eleven / windows / mint / redmond 等）均自动生效。

## 安装 / 更新 / 卸载

```bash
git clone https://github.com/ymt200120/arcmenu-alphabet-jump.git
cd arcmenu-alphabet-jump
./install.sh      # 自动备份 + 检测 ArcMenu 版本更新并刷新基准
# 注销重新登录（Wayland 下 disable/enable 无法热载 JS 代码）
./uninstall.sh    # 一键恢复全部原始文件
```

`install.sh` 可重复执行：以补丁标识字符串检测目标文件，发现 ArcMenu 已被升级时
自动刷新 `.orig` 基准备份后再打补丁。

## 文件结构

```
menulayouts/alphabetJumpList.js    A-Z 面板（PopupMenu + dummyCursor，复刻上游 FolderDialog 模式）
menulayouts/baseMenuLayout.js      header 注册 / 面板开关 / 自校准滚动（约 +90 行）
menulayouts/az.js                  az 布局：拼音排序分组（可选，PINYIN_GROUPING 常量开关）
stylesheet.css                     .arcmenu-alphabet-* 样式类
libs/pinyin-pro/                   拼音库 ESM 构建（MIT）
backup/                            打补丁前的原始文件
*.patch                            各文件相对原始版本的 unified diff
install.sh / uninstall.sh          安装卸载（增量备份 + 版本检测）
test/                              GJS 验证脚本（拼音库可用性 / 分组排序模拟）
```

## 工作原理（简）

1. `baseMenuLayout._displayAppList()` 创建字母分组标题（`ArcMenuSeparator`）时，
   以 `button-press-event` 挂钩（注意：shell 的 PopupBaseMenuItem 以构造参数一次性
   决定 ClickAction.enabled，事后置 reactive 不会让 `activate` 发射，故不用该信号）
2. 建立 `字母 → 组标题 actor` 映射，与实际存在的字母集合（每次列表重建时刷新）
3. 面板为 `PopupMenu.PopupMenu` 子类：dummyCursor 定位到菜单中心，注册进 ArcMenu
   自有的 `subMenuManager` → Esc / 点击外部 / 与其他弹层互斥全部托管，零自研事件捕获
4. 跳转时用 `(targetY - gridY) / (transformedHeight / height)` 实测比值换算滚动量，
   不依赖假设的 scale 因子，任意缩放下准确

## 排错

- 登录后异常：`journalctl --user -b | grep -iE 'arcmenu|JS ERROR'`
- 语法探针（无需登录）：
  `gjs -c 'import("file://<扩展路径>/menulayouts/baseMenuLayout.js").catch(e => print(e))'`
  报 `ImportError: resource://...` 即语法与相对导入正常（resource:// 仅存在于 Shell 进程）
- ArcMenu 升级后功能消失：重跑 `./install.sh` 即可

## License

- 本项目代码：**GPL-2.0**（衍生自 ArcMenu，见 LICENSE）
- `libs/pinyin-pro/`：MIT（上游 © zh-lx，见 libs/pinyin-pro/LICENSE）
