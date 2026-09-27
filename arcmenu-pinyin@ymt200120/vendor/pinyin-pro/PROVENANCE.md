# pinyin-pro — vendored copy provenance

本目录是 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) 的 ESM 构建产物拷贝，
供 ArcMenu Pinyin 扩展内嵌使用（GJS 无 npm 生态，采用 vendor 方式分发）。

| 项 | 内容 |
| --- | --- |
| 上游项目 | https://github.com/zh-lx/pinyin-pro |
| 版本 | 3.29.3（依据本仓库 v1.0.0 记录；上游 ESM 构建未内嵌版本号字符串，无法从产物直接读取） |
| 许可证 | MIT（见同目录 `LICENSE`，保留上游版权声明） |
| 修改 | **内容未修改**（去 `\r` 后与 v1.0.0 时期经真机验证的拷贝逐行一致）。行尾说明：上游原始产物为 CRLF/LF 混合行尾；本仓库因 `core.autocrlf=input` 在入库时规范化为 LF，CI 与源码构建产物因此均为 LF 形态，JS 语义不变 |
| 形式 | 上游 ESM 构建产物：`index.mjs` + `data/`（词典分片）、`common/`（分词等）、`core/`（转换逻辑）；纯 JS，无 Node 专属 API、无 GJS 之外的依赖 |
| 引用方式 | 仅 `src/pinyinIndex.js` 通过相对路径 `import {pinyin} from '../vendor/pinyin-pro/index.mjs'` 引用 |

## 更新方式

从上游 release 下载对应版本的 ESM 构建产物，整目录替换本目录（保留本文件并更新版本号），
然后运行 `node tests/run-tests.mjs && gjs -m tests/run-tests.mjs` 回归拼音映射用例。
