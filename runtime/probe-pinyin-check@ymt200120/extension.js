// 运行时探针扩展 —— 仅用于隔离 headless GNOME Shell 的自动化验证，
// 不随产品分发、不面向日常使用。
//
// 确定性阶段状态机（轮询收敛，避免状态事件噪声/时序竞态）：
//   phase 1: shell 启动 +12s 后，轮询验证“注入态拼音分桶”（产品在
//            ArcMenu ACTIVE 后约 1.5-2.5s 完成注入）；
//   phase 2: 收到产品扩展 INACTIVE 事件后 2.5s，轮询验证“官方分桶恢复”；
//   phase 3: 收到产品扩展 ACTIVE 事件后 4s，轮询验证“拼音分桶恢复”。
// 每个阶段最多轮询 15 次（每秒一次），记录首个收敛样本。
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {isPinyinLettersMonotonic} from './monotonic.js';

const ARC_UUID = 'arcmenu@arcmenu.com';
const PRODUCT_UUID = 'arcmenu-pinyin@ymt200120';
const RUN_DIR = GLib.getenv('AMP_RUN') ?? '/tmp/amp-verify';
const ACTIVE = 1;
const INACTIVE = 2;

const R = {stages: [], errors: []};

function dump() {
    try {
        GLib.file_set_contents(`${RUN_DIR}/results.json`, JSON.stringify(R, null, 2));
    } catch (e) {
        R.errors.push(`dump failed: ${e}`);
    }
}

function record(stage, data) {
    R.stages.push({stage, ts: new Date().toISOString(), ...data});
    dump();
}

function marker(name) {
    try {
        GLib.file_set_contents(`${RUN_DIR}/${name}`, new Date().toISOString());
    } catch { /* ignore */ }
}

const sleep = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms,
    () => { resolve(); return GLib.SOURCE_REMOVE; }));

export default class ProbeExtension extends Extension {
    enable() {
        // GNOME 禁用其他扩展时会“rebase”：把本扩展临时 disable 再 enable。
        // 状态机必须跨 enable/disable 周期保持，不能在这里重置。
        record('probe-enable', {phase: this._phase ?? null});
        if (this._started) {
            record('probe-reenable-resume', {phase: this._phase});
            return;
        }
        this._started = true;
        this._phase = 1;
        this._done = false;
        this._watchId = Main.extensionManager.connectObject(
            'extension-state-changed', (_mgr, ext) => this._onStateChanged(ext), this);

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 12000, () => {
            this._runPhase1();
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        // 故意不撤销事件监听：rebase 周期内仍需接收产品扩展的状态事件
        record('probe-disable', {phase: this._phase});
    }

    _onStateChanged(ext) {
        if (ext?.uuid === ARC_UUID || ext?.uuid === PRODUCT_UUID)
            record('state-event', {uuid: ext.uuid, state: ext.state});

        if (this._done || !ext || ext.uuid !== PRODUCT_UUID)
            return;

        if (this._phase === 2 && ext.state === INACTIVE) {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2500, () => {
                this._runPhase2();
                return GLib.SOURCE_REMOVE;
            });
        } else if (this._phase === 3 && ext.state === ACTIVE) {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 4000, () => {
                this._runPhase3();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    async _getLayout() {
        const arc = Main.extensionManager.lookup(ARC_UUID);
        const product = Main.extensionManager.lookup(PRODUCT_UUID);
        const idxMod = await import(Gio.File.new_for_path(
            `${product.path}/src/pinyinIndex.js`).get_uri());
        const idx = idxMod.createPinyinIndex();

        const mgrMod = await import(Gio.File.new_for_path(
            `${arc.path}/arcmenuManager.js`).get_uri());
        const controllers = mgrMod.ArcMenuManager.menuControllers ?? [];
        let layout = null;
        for (const mc of controllers)
            layout ??= mc.menuButton?._menuLayout ?? mc.menuButton?.menuButtonWidget?._menuLayout;
        return {idx, layout};
    }

    async _inspectOnce() {
        const {idx, layout} = await this._getLayout();
        if (!layout)
            return {layoutFound: false};

        // 强制走“所有应用”分组视图，使 bucket 数据确定性刷新
        layout.displayAllApps();

        const names = layout._sortedAppsList.map(a => a.get_name());
        const buckets = [...layout._bucketJumpListDialog._bucketChars.keys()];
        const gridButtons = layout._bucketJumpListDialog._grid.get_children().length;
        const letters = names.map(n => idx.letterForName(n));

        const monotonic = isPinyinLettersMonotonic(letters);

        const targets = {};
        for (const [name, want] of [['微信', 'W'], ['腾讯会议', 'T'], ['哔哩哔哩', 'B'],
            ['重庆银行', 'C'], ['厦门银行', 'X']]) {
            const i = names.indexOf(name);
            targets[name] = {found: i >= 0, bucket: i >= 0 ? letters[i] : null, expected: want};
        }

        return {
            layoutFound: true,
            appCount: names.length,
            buckets,
            gridButtons,
            allPinyinBuckets: buckets.length > 5 && buckets.every(k => /^[A-Z#]$/.test(k)),
            hasCjkBuckets: buckets.some(k => /[\u3400-\u9fff]/.test(k)),
            monotonic,
            targets,
        };
    }

    // 轮询直到条件满足或超时
    async _pollUntil(predicate, maxTries = 15) {
        let last = null;
        for (let i = 0; i < maxTries; i++) {
            const t0 = Date.now();
            last = await this._inspectOnce();
            record('poll-sample', {bucketCount: last?.buckets?.length, pinyin: last?.allPinyinBuckets ?? null,
                cjk: last?.hasCjkBuckets ?? null, ms: Date.now() - t0});
            if (last.layoutFound && predicate(last))
                return {converged: true, tries: i + 1, state: last};
            await sleep(1000);
        }
        return {converged: false, tries: maxTries, state: last};
    }

    async _runPhase1() {
        const res = await this._pollUntil(s => s.allPinyinBuckets && s.monotonic &&
            Object.values(s.targets).every(t => t.found && t.bucket === t.expected));
        record('phase1-injected-state', {...res.state, converged: res.converged, tries: res.tries});
        marker('stage1-injected');
        this._phase = 2;
    }

    async _runPhase2() {
        const res = await this._pollUntil(s => s.hasCjkBuckets);
        record('phase2-after-product-disable', {...res.state, converged: res.converged, tries: res.tries});
        marker('stage2-disabled');
        this._phase = 3;
    }

    async _runPhase3() {
        const res = await this._pollUntil(s => s.allPinyinBuckets);
        record('phase3-after-product-reenable', {...res.state, converged: res.converged, tries: res.tries});
        marker('stage3-reenabled');
        marker('final');
        this._done = true;
    }
}
