# ArcMenu Pinyin

[中文文档](README.zh-CN.md)

ArcMenu Pinyin is an independent third-party GNOME Shell extension that groups Chinese app names by pinyin initial in the official [ArcMenu](https://gitlab.com/arcmenu/ArcMenu) **All Apps** view.

Examples:

- 微信 → `W`
- 腾讯会议 → `T`
- 哔哩哔哩 → `B`
- 重庆银行 → `C` (polyphones are resolved from the word)

The extension wraps selected ArcMenu methods at runtime; it does not edit files in the ArcMenu installation. Disabling the extension removes the wrappers and rebuilds the current menu view. This project is independent of ArcMenu and is not affiliated with or endorsed by the ArcMenu project.

The original Alphabet Jump List from this repository was upstreamed through [MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284) and is now called Bucket Jump List upstream. ArcMenu Pinyin reuses that component's structure and navigation behavior while providing a fixed set of jump keys.

## Features

- Applies to ArcMenu's **All Apps** view when ArcMenu's “Group apps alphabetically” setting is enabled. Pinned apps, categories, and search continue through ArcMenu's own paths.
- Sorts apps into `#` and `A`–`Z` buckets, with `#` first. Names beginning with a digit or punctuation mark go into `#`.
- Keeps the jump panel at 27 keys: `#` followed by `A`–`Z`. The extension wraps `BucketJumpListDialog.populateMenu` to build these keys, while clicks still use ArcMenu's scrolling logic. Empty buckets are greyed out and cannot be clicked, so adding or removing an app does not move the other keys.
- Uses the bundled [pinyin-pro](https://github.com/zh-lx/pinyin-pro) 3.29.3 library (MIT). Whole-name segmentation helps resolve common polyphones such as 重庆 → `C` and 厦门 → `X`.
- Audits ArcMenu's module shape before injection and currently allows only the verified ArcMenu major version 70. If the audit or version gate fails, the extension logs the reason and leaves ArcMenu's code path alone.

Historical jump-panel recording from the pre-v1.0.0 patch version:

![Historical demo: A-Z jump panel](legacy/demo.gif)

It does not show the current fixed 27-key panel.

## Requirements and compatibility

| Component | Current information |
| --- | --- |
| GNOME Shell | Metadata declares 45–49; full runtime verification currently covers 46.0 |
| ArcMenu | 70.x; ArcMenu 70.0 (version 74) was verified on GNOME Shell 46.0 / Ubuntu 24.04 |
| ArcMenu setting | “Group apps alphabetically” must be enabled for the list or grid layout |

GNOME Shell 45, 47, 48, and 49, along with other ArcMenu 70.x minor versions, have not had full runtime verification. Other ArcMenu major versions are not injected. Polyphone handling follows the pinyin-pro dictionary, so uncommon names may land in an unexpected bucket; this affects placement only. GNOME may temporarily cycle extensions enabled after the one being disabled; this extension handles those repeated lifecycle callbacks.

## Install

Install and enable the official ArcMenu extension first.

### From a source checkout

In a terminal, move to the directory where you want to keep the repository and run:

```bash
git clone https://github.com/ymt200120/arcmenu-pinyin.git
cd arcmenu-pinyin
scripts/install.sh
```

The install script writes only this extension's directory. After it finishes, log out and back in first (required on Wayland; also needed after updating code), then enable the extension:

```bash
gnome-extensions enable arcmenu-pinyin@ymt200120
```

### Install from a zip

Download a zip from [GitHub Releases](https://github.com/ymt200120/arcmenu-pinyin/releases), or build one from a source checkout. `scripts/build.sh` is only available in the source checkout:

```bash
scripts/build.sh
```

Then use the downloaded archive or the one just built:

```bash
# When using a release zip, set ZIP_PATH to its file path
ZIP_PATH=dist/arcmenu-pinyin-v1.1.0.zip
mkdir -p ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
unzip "$ZIP_PATH" \
  -d ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
```

`scripts/build.sh` also writes `dist/arcmenu-pinyin-v1.1.0.zip.sha256` for a local build. To verify it from the output directory:

```bash
cd dist
sha256sum -c arcmenu-pinyin-v1.1.0.zip.sha256
```

After extracting, log out and back in first (required on Wayland), then run the `gnome-extensions enable` command above.

## Update, enable, disable, and uninstall

The update command depends on how the extension was installed:

- From a source checkout, pull the new code and run `scripts/install.sh` again.
- From a zip, extract the new archive over the same extension directory. For a locally built archive:

  ```bash
  unzip -o dist/arcmenu-pinyin-v1.1.0.zip \
    -d ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
  ```

Log out and back in after updating code so GNOME Shell reloads the modules.

Enable or disable:

```bash
gnome-extensions enable arcmenu-pinyin@ymt200120
gnome-extensions disable arcmenu-pinyin@ymt200120
```

Disabling removes the runtime injection and returns the active ArcMenu view to its official path.

For a source checkout, run:

```bash
scripts/uninstall.sh
```

If you installed from a zip, remove the extension directory with:

```bash
gnome-extensions disable arcmenu-pinyin@ymt200120
rm -rf ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
```

Both methods remove only this extension's directory; ArcMenu files do not need to be restored. If the extension was enabled, log out and back in after uninstalling to clear any remaining runtime state.

## Troubleshooting

View this extension's diagnostic messages with:

```bash
journalctl --user -b | grep 'arcmenu-pinyin'
```

Common messages:

- `injected into ArcMenu 70.0`: injection completed.
- `failed structure audit — refusing to inject`: ArcMenu's internals do not match the audited shape, so no injection was applied.
- `is not verified yet`: the ArcMenu major version is not currently allowed.
- `injection removed (N method(s) restored)`: the runtime methods were removed.

If nothing changes, check that ArcMenu is running (`gnome-extensions info arcmenu@arcmenu.com`), this extension is enabled, alphabetical grouping is enabled, and you are in **All Apps**. When opening a [GitHub Issue](https://github.com/ymt200120/arcmenu-pinyin/issues), include the log output and reproduction steps.

## Development and verification

```bash
node tests/run-tests.mjs       # Node 20+
gjs -m tests/run-tests.mjs     # run the same suite under GJS
scripts/build.sh               # build the release zip and sha256 file
runtime/run-isolated-check.sh  # isolated headless GNOME Shell check
```

`runtime/run-isolated-check.sh` requires ArcMenu 70.x to be installed locally. It starts headless GNOME Shell with a private DBus session and temporary `HOME`/XDG directories, then checks injection, the official behavior after disable, and pinyin grouping after re-enable. Results are kept in the temporary directory created by the script. See [runtime/README.md](runtime/README.md).

Directory overview:

```text
arcmenu-pinyin@ymt200120/  extension source and bundled pinyin-pro
tests/                     Node/GJS tests
runtime/                   isolated headless Shell verification
scripts/                   install, uninstall, and build scripts
docs/                      compatibility and verification records
legacy/                    archived overlay patches
```

## Credits and license

- Requirements, design decisions, and on-device acceptance were led by [ymt200120](https://github.com/ymt200120).
- Code was developed with assistance from an AI coding agent (ZCode / GLM).
- Pinyin conversion uses [pinyin-pro](https://github.com/zh-lx/pinyin-pro) v3.29.3 under the MIT license; see [`PROVENANCE.md`](arcmenu-pinyin@ymt200120/vendor/pinyin-pro/PROVENANCE.md) for source details.
- This project's code is GPL-2.0; see [`LICENSE`](LICENSE). The vendored `pinyin-pro` files retain their MIT license and copyright notice.
