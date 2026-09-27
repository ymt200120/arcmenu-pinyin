# legacy/ — 旧覆盖式补丁存档

本目录是仓库历史形态（`arcmenu-alphabet-jump` v1.0.0 覆盖式补丁套件）的存档，
**已被取代，请勿使用**：

- `install.sh` / `uninstall.sh`：直接修改已安装 ArcMenu 的文件——该方式随 ArcMenu
  自动升级即失效，且无法保证与新版本兼容；
- `az.js.patch`、`baseMenuLayout.js.patch`、`stylesheet.css.patch`、`menulayouts/`、
  `stylesheet.css`、`backup/`：针对 ArcMenu v69/v70 的旧文件级补丁；
- `libs/pinyin-pro/`：旧捆绑位置（现移至 `arcmenu-pinyin@ymt200120/vendor/pinyin-pro/`）；
- `test/`：旧的临时验证脚本（现为仓库根 `tests/`，Node + GJS 双跑）；
- `README-old-patch.md`：旧项目说明；`demo.gif`：Alphabet Jump 功能演示。

## 与上游的关系

- Alphabet Jump List（字母分组标题点击 → A-Z 面板 → 精确跳转）已通过
  [上游 MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284)
  合入 ArcMenu，并随 70.0 发布（官方更名为 Bucket Jump List，
  `BucketJumpListDialog`，见 `menuWidgets.js`）。
- 拼音分组部分演进为本仓库根目录的独立扩展 `arcmenu-pinyin@ymt200120/`，
  不再覆盖任何官方文件。
