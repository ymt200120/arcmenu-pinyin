# pinyin-pro vendor notes

This directory contains the ESM build of [pinyin-pro](https://github.com/zh-lx/pinyin-pro)
used by ArcMenu Pinyin. The extension vendors the build because GJS does not provide the
normal npm runtime or package loading workflow.

| Field | Details |
| --- | --- |
| Upstream project | <https://github.com/zh-lx/pinyin-pro> |
| Version | 3.29.3. The upstream ESM build does not embed a version string; this is the version recorded for the copy used by the project. |
| License | MIT; see [`LICENSE`](LICENSE), which retains the upstream copyright and license text. |
| Changes | No functional changes were made to the vendored code in this repository. CRLF/LF line endings were normalized to LF when the files were committed (`core.autocrlf=input`); this does not change JavaScript behavior. |
| Layout | `index.mjs`, dictionary shards under `data/`, tokenization helpers under `common/`, and conversion code under `core/`. The build is plain JavaScript and has no Node-only API. |
| Import | `src/pinyinIndex.js` imports `pinyin` from `../vendor/pinyin-pro/index.mjs`; no other project code imports the vendor directly. |

## Updating the copy

Download the matching ESM build from an upstream release and replace the contents of this
directory. Keep this file and update the version entry above. From the repository root, run
the Node and GJS test suites before committing the replacement:

```bash
node tests/run-tests.mjs
gjs -m tests/run-tests.mjs
```
