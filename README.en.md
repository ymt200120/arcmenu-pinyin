# ArcMenu Pinyin

A standalone GNOME Shell extension that adds **Chinese pinyin alphabetical grouping** to the official [ArcMenu](https://gitlab.com/arcmenu/ArcMenu) extension. Once enabled, Chinese apps in ArcMenu's "All Apps" list are grouped under A-Z buckets by their pinyin first letter, reusing ArcMenu 70.0's official Bucket Jump popup for A-Z quick navigation:

- 微信 (WeChat) → **W**
- 腾讯会议 (Tencent Meeting) → **T**
- 哔哩哔哩 (Bilibili) → **B**
- 重庆银行 → **C** (polyphones resolved word-wise)

**It never modifies ArcMenu's files.** Disable or uninstall this extension and ArcMenu instantly returns to stock behaviour — no re-login needed.

> **Independence**: this is an independent third-party project, not affiliated with or endorsed by ArcMenu.
> The Alphabet Jump List from this repository was upstreamed via [MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284)
> (renamed "Bucket Jump List" by upstream); this extension reuses that official component at runtime, which does not constitute endorsement.

## Demo

![Historical demo: A-Z jump panel](legacy/demo.gif)
*Historical recording (pre-v1.0.0 patch era) of the A-Z jump panel, now an official ArcMenu feature.*

## How it works

```
┌──────────────────────────── GNOME Shell ────────────────────────────┐
│  ArcMenu (official, untouched)        ArcMenu Pinyin (this ext)     │
│  ┌────────────────────┐              ┌──────────────────────────┐   │
│  │ BaseMenuLayout      │  prototype   │ While enabled, wraps 2    │   │
│  │  _createSortedApps  │◄-override--  │  methods:                 │   │
│  │  _displayAppList    │◄-override--  │  · sort: pinyin-first     │   │
│  └────────────────────┘              │  · group: bucket letter    │   │
│                                      │    from pinyin             │   │
│  BucketJumpListDialog (official) ◄── registers pinyin letters;       │
│                                       jump/scroll all official code │
└─────────────────────────────────────────────────────────────────────┘
```

- Locates the running ArcMenu via `Main.extensionManager.lookup()` and imports its ES modules by absolute URI. GJS caches modules per URI, so we get **the exact same class objects** and a prototype method wrap affects live layout instances.
- Only the "All Apps + alphabetical grouping enabled" view is taken over; pinned apps, categories and search paths keep using the official implementation.
- Pinyin conversion uses the bundled [pinyin-pro](https://github.com/zh-lx/pinyin-pro) (MIT). Whole-string segmented conversion fixes first-character polyphones (重庆→C, 厦门→X).
- **Compatibility gating**: before injecting, every integration point is structurally audited and the ArcMenu major version must be verified (70.x). On mismatch the extension refuses to inject, logs diagnostics, and ArcMenu stays 100% stock.
- On disable, prototype methods are precisely restored and ArcMenu views are rebuilt, so the official behaviour returns immediately.

## Requirements

| Component | Requirement |
| --- | --- |
| GNOME Shell | 45–49 (**46 verified**, see compatibility table) |
| ArcMenu | **70.0** (other versions: injected only if the structure audit passes AND the major version is verified) |
| ArcMenu setting | "Group apps alphabetically" (list/grid) enabled |

## Install

Script (recommended):

```bash
git clone https://github.com/ymt200120/arcmenu-pinyin.git
cd arcmenu-pinyin
scripts/install.sh          # writes only this extension's own directory
# Log out and back in (required on Wayland), then:
gnome-extensions enable arcmenu-pinyin@ymt200120
```

Manual:

```bash
scripts/build.sh            # produces dist/arcmenu-pinyin-v1.0.0.zip
mkdir -p ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
unzip dist/arcmenu-pinyin-v1.0.0.zip -d ~/.local/share/gnome-shell/extensions/arcmenu-pinyin@ymt200120
# Log out and back in (Wayland), then:
gnome-extensions enable arcmenu-pinyin@ymt200120
```

> No `curl … | bash` remote execution. Download the zip from GitHub Releases or build locally.

## Update / Enable / Disable

- **Update**: re-run `scripts/install.sh` with the new version (it replaces only this extension's own directory and keeps your ArcMenu settings); log out/in once afterwards (GNOME module-cache limitation, applies to all extensions);
- **Disable**: `gnome-extensions disable arcmenu-pinyin@ymt200120`;
- **Enable**: `gnome-extensions enable arcmenu-pinyin@ymt200120`.

## Uninstall

```bash
scripts/uninstall.sh        # removes only this extension; ArcMenu needs no restoration
```

## Verified compatibility

| ArcMenu | GNOME Shell | Result |
| --- | --- | --- |
| 70.0 (version 74) | 46.0 (Ubuntu 24.04) | ✅ inject / buckets / jump / disable-restore / re-enable-restore all pass (isolated headless verification, see `docs/verification/`) |
| other 70.x | 45/47/48/49 | ⚠️ untested; structure audit + version gate protect the shell, otherwise safely refuses |

Notes:

- Polyphones rely on pinyin-pro's built-in dictionary; rare proper nouns may land on an unexpected letter (or in `#`) — grouping position only, functionality unaffected.
- Names starting with digits/punctuation go to the `#` bucket placed **first** (Windows-style); the jump popup always shows all `#` + A–Z keys (27), with empty buckets greyed out and non-clickable, so key positions never drift.
- GNOME temporarily cycles extensions enabled after the one being disabled ("rebase"); this extension's state machine is idempotent under such cycles.

## Feedback

[GitHub Issues](https://github.com/ymt200120/arcmenu-pinyin/issues) — please include
the output of `journalctl --user -b | grep arcmenu-pinyin` and reproduction steps.

## Troubleshooting

All diagnostics are prefixed with `[arcmenu-pinyin]`:

```bash
journalctl --user -b | grep 'arcmenu-pinyin'
```

| Log | Meaning |
| --- | --- |
| `injected into ArcMenu 70.0` | injection active |
| `failed structure audit — refusing to inject` | ArcMenu internals differ from the audited version (upgrade/mod) — safe refusal; please open an issue with the full log |
| `is not verified yet` | ArcMenu version not in the verified list yet |
| `injection removed (N method(s) restored)` | official behaviour restored (on disable/uninstall) |

If nothing happens, check in order: ArcMenu is 70.0 and running (`gnome-extensions info arcmenu@arcmenu.com`); this extension is enabled; ArcMenu's "Group apps alphabetically" is on; you are in the "All Apps" view.

## Development

```bash
node tests/run-tests.mjs    # pinyin/sort/injection tests (Node 20+)
gjs -m tests/run-tests.mjs  # the same suite on GJS (same runtime as the Shell)
runtime/run-isolated-check.sh   # isolated headless GNOME Shell end-to-end verification
scripts/build.sh            # build release zip
```

`runtime/run-isolated-check.sh` boots `gnome-shell --headless` inside a private DBus session with isolated HOME/XDG directories, loads the real ArcMenu + this extension + a probe, and verifies "inject → CLI disable → stock restored → re-enable → pinyin restored" end to end without touching your desktop. See `runtime/README.md`.

## Credits

- Requirements, design decisions and all on-device acceptance led by [ymt200120](https://github.com/ymt200120);
- Code implemented by an AI coding agent (ZCode / GLM) under those requirements, acceptance criteria and safety constraints;
- Pinyin conversion uses [pinyin-pro](https://github.com/zh-lx/pinyin-pro) v3.29.3 (MIT, see `arcmenu-pinyin@ymt200120/vendor/pinyin-pro/PROVENANCE.md`);
- Alphabet Jump List was designed/implemented by ymt200120 and upstreamed via [MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284).

## License

- This project: **GPL-2.0** (derivative of ArcMenu, see `LICENSE`)
- `vendor/pinyin-pro/`: MIT (© zh-lx, see `vendor/pinyin-pro/LICENSE`)
- History: the Alphabet Jump List part landed upstream via [MR !284](https://gitlab.com/arcmenu/ArcMenu/-/merge_requests/284) and ships in ArcMenu 70.0; the old overlay patches are archived under `legacy/`.
