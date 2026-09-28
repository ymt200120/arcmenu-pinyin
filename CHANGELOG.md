# Changelog

## arcmenu-pinyin 1.1.1（2026-09-29）

- runtime 验证默认使用唯一的 `/tmp/amp-verify.XXXXXX` 目录；显式 `AMP_RUN` 只接受尚不存在的
  `/tmp` 直接子目录，不会清理或覆盖已有路径；
- 隔离断言覆盖 `dbus-run-session` 可能创建的私有 `/tmp/dbus-*` socket；
- `scripts/build.sh` 在 zip 旁生成 `.sha256` 校验文件，CI 会用它验证发布包；
- 分组设置关闭时保留 ArcMenu 的官方排序和显示路径；
- `InjectionManager` 精确还原注入前的方法，并避免覆盖注入期间出现的外部替换；
- 探针单调性检查明确要求 `#` 位于字母之前，并覆盖错误顺序。

## arcmenu-pinyin 1.1.0（2026-09-27）

- `#` 分组移到列表最前。排序比较器负责这个顺序，ArcMenu 默认排序不变；
- Bucket Jump 面板固定显示 `#` + A–Z 共 27 个键，`#` 位于 `A` 之前。没有应用的字母
  置灰且不可点击，因此安装或卸载应用不会改变键位；
- 运行时包装官方 `BucketJumpListDialog.populateMenu`，继续使用 ArcMenu 的网格列数
  公式（27 个键时为 6 列 × 5 行）；
- 新增 `src/bucketGrid.js` 和对应的键位、状态及网格逻辑测试；

## arcmenu-pinyin 1.0.0（2026-09-27）

这是第一个独立扩展版本。它不修改 ArcMenu 文件，运行时通过
`Main.extensionManager.lookup()` 找到 ArcMenu，再按 URI 导入其 ES 模块，对
`BaseMenuLayout.prototype` 的 `_createSortedAppsList` 和 `_displayAppList` 做临时包装。

其他基础功能包括：

- 复用 ArcMenu 的 Bucket Jump 列表，把拼音字母注册到 `addBucketChar()`；
- 在注入前做结构审计和 ArcMenu 主版本白名单检查，审计或版本不匹配时跳过注入；
- 在 ArcMenu 或本扩展的启用状态变化时管理注入和还原，并处理 GNOME 扩展禁用时的
  rebase 周期；
- 使用 pinyin-pro 对完整名称分词后取首字母，因此重庆银行→C、厦门银行→X；旧补丁
  只转换第一个汉字。

1.0.0 发布时，Node/GJS 测试和隔离 headless GNOME Shell 端到端流程均已通过；当时的
运行证据保存在 `docs/verification/`。

## 与上游的关系

- Alphabet Jump List 已通过上游 [MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284)
  进入 ArcMenu 70.0，上游后来将其称为 Bucket Jump List；本项目在运行时复用该组件；
- 旧的覆盖式补丁和安装脚本保留在 `legacy/` 中，只用于查阅，不应再使用。
