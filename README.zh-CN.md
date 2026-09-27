# ArcMenu Pinyin

为官方 [ArcMenu](https://gitlab.com/arcmenu/ArcMenu)（GNOME Shell 扩展）提供**中文拼音首字母分组**的独立扩展。安装启用后，ArcMenu"所有应用"列表中的中文应用将按拼音首字母归入 A-Z 分组，并直接复用 ArcMenu 70.0 官方 Bucket Jump 弹窗进行 A-Z 快速跳转：

- 微信 → **W**
- 腾讯会议 → **T**
- 哔哩哔哩 → **B**
- 重庆银行 → **C**（多音字按词定音）

**不修改 ArcMenu 的任何文件**；禁用/卸载本扩展后，ArcMenu 立即恢复官方行为，无需注销重登。

English: [README.en.md](README.en.md)

## 工作原理（一图流）

```
┌──────────────────────────── GNOME Shell ────────────────────────────┐
│  ArcMenu（官方，未修改）              ArcMenu Pinyin（本扩展）        │
│  ┌────────────────────┐              ┌──────────────────────────┐   │
│  │ BaseMenuLayout      │   原型方法   │ 启用时临时包裹两个方法：    │   │
│  │  _createSortedApps  │◄──覆写────  │  · 排序：拼音字母优先      │   │
│  │  _displayAppList    │◄──覆写────  │  · 分组：分桶字母=拼音首字母│   │
│  └────────────────────┘              └──────────────────────────┘   │
│  BucketJumpListDialog（官方）◄── 直接注册拼音字母，跳转全部官方实现   │
└─────────────────────────────────────────────────────────────────────┘
```

- 本扩展通过 `Main.extensionManager.lookup()` 定位运行中的 ArcMenu，按绝对 URI 导入其 ES 模块（GJS 按 URI 缓存模块 → 拿到的是**同一个类对象**），对 `BaseMenuLayout.prototype` 的两个方法做临时覆写；
- 只接管"所有应用 + 已开启字母分组"视图；固定应用、分类、搜索等路径全部走官方原实现；
- 拼音转换使用内嵌的 [pinyin-pro](https://github.com/zh-lx/pinyin-pro)（MIT），整串分词转换取首字母，可修正首字多音字（重庆→C、厦门→X）；
- **兼容性门控**：注入前对 ArcMenu 的模块结构做逐项审计，且仅信任已验证的 ArcMenu 大版本（70.x）。审计不通过或版本未知 → 拒绝注入并输出诊断日志，ArcMenu 保持官方行为不受任何影响；
- 禁用本扩展时精确还原原型方法并触发 ArcMenu 重建视图，立即恢复官方效果。

## 环境要求

| 组件 | 要求 |
| --- | --- |
| GNOME Shell | 45–49（**46 实测验证**，见下方兼容性表） |
| ArcMenu | **70.0**（其他版本：结构审计通过且在已验证列表内才注入） |
| 分组设置 | ArcMenu 设置 "Group apps alphabetically"（列表/网格）保持开启 |

## 安装

方式一（脚本，推荐）：

```bash
git clone https://github.com/ymt200120/arcmenu-alphabet-jump.git
cd arcmenu-alphabet-jump
scripts/install.sh          # 只写入本扩展自己的目录
# 注销重新登录（Wayland 必须），然后：
gnome-extensions enable arcmenu-pinyin@ymt200120
```

方式二（手动）：

```bash
scripts/build.sh            # 生成 dist/arcmenu-pinyin-v1.0.0.zip
mkdir -p ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
unzip dist/arcmenu-pinyin-v1.0.0.zip -d ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
# 注销重新登录（Wayland 必须），然后：
gnome-extensions enable arcmenu-pinyin@ymt200120
```

> 禁止 `curl … | bash` 之类的远程脚本直装；请从 GitHub Releases 下载 zip 或自行构建。

## 卸载

```bash
scripts/uninstall.sh        # 只移除本扩展目录；ArcMenu 无需任何恢复操作
```

## 已验证兼容性

| ArcMenu | GNOME Shell | 结果 |
| --- | --- | --- |
| 70.0 (version 74) | 46.0 (Ubuntu 24.04) | ✅ 注入/分桶/跳转/禁用恢复/再启用恢复 全部通过（隔离实机验证，见 `docs/verification/`） |
| 70.x 其他小版本 | 45/47/48/49 | ⚠️ 未实测；结构审计 + 版本门控保护，不通过则安全拒绝 |

已知行为：

- 多音字按 pinyin-pro 词库处理，未收录的冷门词可能归入非预期字母（仅影响分组位置，不影响使用）；
- 数字、标点开头的名称进入 `#` 桶（排在最后），与 Windows 中文环境习惯一致；
- GNOME 在禁用"任何扩展"时会临时循环其后启用的扩展（rebase 机制，`_callExtensionDisable` 的防冲突设计），本扩展的状态机对此幂等，无副作用。

## 故障排查

1. 查看诊断日志（本扩展所有输出带 `[arcmenu-pinyin]` 前缀）：

   ```bash
   journalctl --user -b | grep 'arcmenu-pinyin'
   ```

2. 常见日志：

   | 日志 | 含义 |
   | --- | --- |
   | `injected into ArcMenu 70.0` | 注入成功，功能生效 |
   | `failed structure audit — refusing to inject` | ArcMenu 结构与已审计版本不一致（升级/魔改），安全拒绝；请提 issue 附完整日志 |
   | `is not verified yet` | ArcMenu 版本不在已验证列表，等待适配 |
   | `injection removed (N method(s) restored)` | 已还原官方行为（随禁用/卸载） |

3. 没有效果时依次确认：ArcMenu 为 70.0 且在运行（`gnome-extensions info arcmenu@arcmenu.com`）；本扩展已启用；ArcMenu 设置中"按字母分组应用"已开启；当前视图是"所有应用"。

## 开发与测试

```bash
node tests/run-tests.mjs    # 拼音/排序/注入管理器（Node 20+）
gjs -m tests/run-tests.mjs  # 同一套测试跑在 GJS（与 Shell 同运行时）
runtime/run-isolated-check.sh   # 隔离 headless GNOME Shell 端到端验证（需本机装有 ArcMenu 70）
scripts/build.sh            # 构建发布 zip
```

`runtime/run-isolated-check.sh` 会在独立 DBus 会话 + 独立 HOME/XDG 目录中启动 `gnome-shell --headless`，加载真实 ArcMenu + 本扩展 + 探针，自动验证"注入 → CLI 禁用 → 官方行为恢复 → 再启用 → 拼音恢复"全链路，不触碰日常桌面。详见 `runtime/README.md`。

## 项目结构

```
arcmenu-pinyin@ymt200120/   扩展源码
├── extension.js            入口：生命周期状态机
├── src/compat.js           ArcMenu 检测 + 结构审计 + 版本门控
├── src/injection.js        注入管理器（防重复注入、精确还原）
├── src/displayPatch.js     排序/分组包装器（官方路径的复刻与替换）
├── src/pinyinIndex.js      拼音索引纯逻辑（Node/GJS 双跑测试）
└── vendor/pinyin-pro/      pinyin-pro v3.29.3（MIT）
tests/                      Node + GJS 双跑测试
runtime/                    隔离 headless Shell 端到端验证套件
scripts/                    安装/卸载/构建
docs/                       兼容性表、验证证据、故障排查
legacy/                     旧覆盖式补丁（已被上游 MR !284 取代，仅存档）
```

## License

- 本项目代码：**GPL-2.0**（衍生自 ArcMenu 项目，见 `LICENSE`）
- `vendor/pinyin-pro/`：MIT（© zh-lx，见 `vendor/pinyin-pro/LICENSE`）
- 历史：Alphabet Jump List 部分已通过上游 [MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284) 进入 ArcMenu 70.0；本仓库 `legacy/` 保留旧覆盖式补丁存档。
