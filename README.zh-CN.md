# ArcMenu Pinyin

[English](README.en.md)

ArcMenu Pinyin 是一个独立的第三方 GNOME Shell 扩展，为官方 [ArcMenu](https://gitlab.com/arcmenu/ArcMenu) 的“所有应用”视图增加中文拼音首字母分组。

例如：

- 微信 → `W`
- 腾讯会议 → `T`
- 哔哩哔哩 → `B`
- 重庆银行 → `C`（按词库处理多音字）

扩展只在运行时包裹 ArcMenu 的相关方法，不修改 ArcMenu 目录中的文件。禁用扩展时会撤销这些包裹并重建当前菜单视图。它与 ArcMenu 没有隶属关系，也没有得到 ArcMenu 官方认证或背书。

本仓库早期的 Alphabet Jump List 曾通过 [MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284) 合入 ArcMenu 上游；上游现在称它为 Bucket Jump List。本扩展运行时复用该组件的结构和跳转行为，同时为跳转面板提供固定键位。

## 功能

- 仅接管 ArcMenu“所有应用”视图，并且需要开启 ArcMenu 的“按字母分组应用”设置。固定应用、分类和搜索等路径继续使用 ArcMenu 的实现。
- 应用列表按 `#`、`A`–`Z` 分桶，`#` 始终排在最前面。以数字或标点开头的名称进入 `#` 桶。
- 跳转面板固定显示 27 个键：`#` 加 `A`–`Z`。扩展包裹 `BucketJumpListDialog.populateMenu` 来生成这些键，点击跳转仍使用 ArcMenu 的滚动逻辑；没有对应应用的字母会置灰并且不可点击，因此应用增删不会改变键位顺序。
- 拼音转换使用内嵌的 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) 3.29.3（MIT）。整串分词后取首字母，可以处理“重庆”→`C`、“厦门”→`X`这类常见多音字。
- 启用前会检查 ArcMenu 的模块结构，并只允许当前已验证的 ArcMenu 主版本 70。检查或版本门控未通过时，扩展记录诊断日志，不进行注入。

历史补丁时期录制的跳转面板示例：

![历史演示：A-Z 跳转面板](legacy/demo.gif)

该图片来自 v1.0.0 之前的补丁版本，不展示当前的固定 27 键面板。

## 环境要求与兼容性

| 组件 | 当前信息 |
| --- | --- |
| GNOME Shell | 元数据声明支持 45–49；目前已完成的完整运行时验证为 46.0 |
| ArcMenu | 70.x；ArcMenu 70.0（version 74）已在 GNOME Shell 46.0 / Ubuntu 24.04 上验证 |
| ArcMenu 设置 | “Group apps alphabetically”（列表或网格）需要开启 |

GNOME Shell 45、47、48、49，以及 ArcMenu 70.x 的其他小版本尚未完成运行时实测。ArcMenu 其他主版本当前不会注入。拼音多音字的结果取决于 pinyin-pro 词库，冷门专名可能落入意料之外的字母桶；这只影响分组位置。 GNOME 在禁用扩展时可能短暂循环其后的扩展；本扩展可以处理这种重复的生命周期回调。

## 安装

先安装并启用官方 ArcMenu。

### 从源码安装

在终端中进入你准备存放仓库的目录，执行：

```bash
git clone https://github.com/ymt200120/arcmenu-pinyin.git
cd arcmenu-pinyin
scripts/install.sh
```

安装脚本只写入 `arcmenu-pinyin@ymt200120` 自己的扩展目录。安装完成后先注销并重新登录（Wayland 会话必须；更新代码后也需要），然后启用扩展：

```bash
gnome-extensions enable arcmenu-pinyin@ymt200120
```

### 使用 zip 安装

可以从 [GitHub Releases](https://github.com/ymt200120/arcmenu-pinyin/releases) 下载 zip，也可以从源码仓库构建。下面的 `scripts/build.sh` 只适用于源码仓库：

```bash
scripts/build.sh
```

然后使用下载的或刚生成的 zip：

```bash
# 下载 release zip 时，把 ZIP_PATH 改为该文件的路径
ZIP_PATH=dist/arcmenu-pinyin-v1.1.1.zip
mkdir -p ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
unzip "$ZIP_PATH" \
  -d ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
```

`scripts/build.sh` 还会为本地构建生成 `dist/arcmenu-pinyin-v1.1.1.zip.sha256`。如需校验，在 `dist/` 目录运行：

```bash
cd dist
sha256sum -c arcmenu-pinyin-v1.1.1.zip.sha256
```

解压后先注销并重新登录（Wayland 会话必须），然后运行上面的 `gnome-extensions enable` 命令。

## 更新、启用、禁用与卸载

更新方式取决于安装来源：

- 从源码仓库安装：拉取新代码后再次运行 `scripts/install.sh`。
- 只下载或构建 zip：将新 zip 解压覆盖到同一个扩展目录。例如在仓库中构建时：

  ```bash
  unzip -o dist/arcmenu-pinyin-v1.1.1.zip \
    -d ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
  ```

更新代码后请注销并重新登录一次，让 GNOME Shell 重新加载模块。

启用或禁用：

```bash
gnome-extensions enable arcmenu-pinyin@ymt200120
gnome-extensions disable arcmenu-pinyin@ymt200120
```

禁用时扩展会撤销运行时注入并恢复 ArcMenu 的官方路径。

从源码仓库安装的用户可以运行：

```bash
scripts/uninstall.sh
```

如果只有 zip 安装包，则运行下面的命令删除本扩展目录：

```bash
gnome-extensions disable arcmenu-pinyin@ymt200120
rm -rf ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
```

两种方式都只删除本扩展目录，不需要恢复 ArcMenu 文件。如果之前启用过本扩展，卸载后建议注销并重新登录一次。

## 故障排查

查看本扩展的诊断日志：

```bash
journalctl --user -b | grep 'arcmenu-pinyin'
```

常见信息包括：

- `injected into ArcMenu 70.0`：注入已完成。
- `failed structure audit — refusing to inject`：ArcMenu 内部结构与当前审计基准不符，扩展没有注入。
- `is not verified yet`：ArcMenu 主版本不在当前允许列表中。
- `injection removed (N method(s) restored)`：运行时方法已撤销。

没有效果时，依次确认 ArcMenu 正在运行（`gnome-extensions info arcmenu@arcmenu.com`）、本扩展已启用、分组设置已开启，并且当前位于“所有应用”视图。提交 [GitHub Issues](https://github.com/ymt200120/arcmenu-pinyin/issues) 时，请附上日志输出和复现步骤。

## 开发与验证

```bash
node tests/run-tests.mjs       # Node 20+
gjs -m tests/run-tests.mjs     # 在 GJS 中运行同一套测试
scripts/build.sh               # 构建发布 zip 和 sha256 校验文件
runtime/run-isolated-check.sh  # 隔离的 headless GNOME Shell 验证
```

`runtime/run-isolated-check.sh` 需要本机已有 ArcMenu 70.x。它使用独立 DBus 会话以及临时的 `HOME`/XDG 目录启动 headless GNOME Shell，验证注入、禁用后的官方行为、再次启用后的拼音分组；结果保存在脚本创建的临时目录中。详见 [runtime/README.md](runtime/README.md)。

主要目录：

```text
arcmenu-pinyin@ymt200120/  扩展源码和内嵌的 pinyin-pro
tests/                     Node/GJS 测试
runtime/                   隔离的 headless Shell 验证
scripts/                   安装、卸载和构建脚本
docs/                      兼容性与验证记录
legacy/                    旧覆盖式补丁，仅作存档
```

## 致谢与许可

- 需求、设计决策和真机验收由 [ymt200120](https://github.com/ymt200120) 主导。
- 代码在 AI coding agent（ZCode / GLM）协助下完成。
- 拼音转换使用 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) v3.29.3，许可证为 MIT；来源说明见 [`PROVENANCE.md`](arcmenu-pinyin@ymt200120/vendor/pinyin-pro/PROVENANCE.md)。
- 本项目代码使用 GPL-2.0，完整文本见 [`LICENSE`](LICENSE)。`vendor/pinyin-pro/` 保留其 MIT 许可证和版权声明。
