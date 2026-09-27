// 集成恢复点守卫测试（Node / GJS 双跑）
//
// 覆盖验收要求的确定性场景：
//   start _integrate → await audit → 期间 disable/teardown → audit 返回
//   → skip（不注入、无空引用、无未处理 rejection）
//
// extension.js 本体依赖 resource:// 与 gi://，无法在纯测试中导入；
// 守卫决策被提取为 src/integrationGuard.js（生产代码直接使用），
// 这里验证的正是生产实现本身。
import assert from './assert.mjs';

import {
    evaluateResumption,
    RESUME_POSTPONE,
    RESUME_PROCEED,
    RESUME_SKIP,
} from '../arcmenu-pinyin@ymt200120/src/integrationGuard.js';

const ACTIVE = 1;    // ExtensionState.ACTIVE（misc/extensionUtils.js）
const INACTIVE = 2;  // ExtensionState.INACTIVE
const ARC_PATH = '/ext/arcmenu@arcmenu.com';

function base({teardown = false, manager = {}, stateNow = ACTIVE, pathNow = ARC_PATH} = {}) {
    return {
        teardown,
        injectionManager: manager,
        arcmenuStateNow: stateNow,
        arcmenuActiveState: ACTIVE,
        arcmenuPathNow: pathNow,
        auditedPath: ARC_PATH,
    };
}

export const tests = [
    ['guard: disable 发生于 await 期间（teardown 完成）→ skip，绝不注入', () => {
        assert.strictEqual(evaluateResumption(base({teardown: true})), RESUME_SKIP);
    }],

    ['guard: disable 执行中段（manager 已置空、state 尚未置位）→ skip', () => {
        assert.strictEqual(evaluateResumption(base({manager: null})), RESUME_SKIP);
    }],

    ['guard: ArcMenu 在 await 期间被停用 → postpone（等待下一次 ACTIVE 事件）', () => {
        assert.strictEqual(evaluateResumption(base({stateNow: INACTIVE})), RESUME_POSTPONE);
    }],

    ['guard: ArcMenu 路径变化（重装/升级）→ postpone', () => {
        assert.strictEqual(evaluateResumption(base({pathNow: '/ext/other-install'})), RESUME_POSTPONE);
    }],

    ['guard: 本扩展与 ArcMenu 状态均未变化 → proceed', () => {
        assert.strictEqual(evaluateResumption(base()), RESUME_PROCEED);
    }],

    ['guard: ArcMenu 状态变化且本扩展 teardown 同时发生 → skip 优先（静默退出）', () => {
        assert.strictEqual(
            evaluateResumption(base({teardown: true, stateNow: INACTIVE})), RESUME_SKIP);
    }],

    ['guard: 常量两两不同', () => {
        assert.notStrictEqual(RESUME_SKIP, RESUME_POSTPONE);
        assert.notStrictEqual(RESUME_POSTPONE, RESUME_PROCEED);
        assert.notStrictEqual(RESUME_SKIP, RESUME_PROCEED);
    }],
];
