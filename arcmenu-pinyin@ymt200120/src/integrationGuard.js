// ArcMenu Pinyin — 集成恢复点守卫（纯逻辑，Node/GJS 可确定性测试）
//
// `_integrate()` 在 `await auditArcMenu()` 前后各有一次生命周期检查点。
// await 期间 disable() 会同步完成 teardown（置空 _injectionManager、
// 置 _state='disabled'、断开信号），已进入 await 的 async 函数只能在
// 恢复点感知这些变化。本模块把恢复点的继续/退出决策集中为纯函数，
// 供 extension.js 直接使用，并被 tests/integration.test.mjs 覆盖
// —— 测试与生产代码共用同一实现，避免"测试复制实现"失效问题。

export const RESUME_PROCEED = 'proceed';
// 静默退出：本扩展已 teardown，绝不注入（disable-during-await 竞态）
export const RESUME_SKIP = 'skip';
// 退出并等待下一次 ArcMenu ACTIVE 事件（await 期间 ArcMenu 被停用/更换路径）
export const RESUME_POSTPONE = 'postpone';

/**
 * @param {object} p
 * @param {boolean} p.teardown 本扩展是否已完成 disable/teardown
 *   （_state === 'disabled'）
 * @param {object|null} p.injectionManager teardown 后为 null；
 *   disable 执行中段可能"manager 已置空而 state 尚未置位"，两者任一即 skip
 * @param {number|undefined} p.arcmenuStateNow 恢复点重新读取的 ArcMenu 状态
 * @param {number} p.arcmenuActiveState ExtensionState.ACTIVE 数值
 * @param {string|undefined} p.arcmenuPathNow 恢复点重新读取的 ArcMenu 安装路径
 * @param {string} p.auditedPath 实际完成结构审计的路径
 * @returns {string} RESUME_PROCEED | RESUME_SKIP | RESUME_POSTPONE
 */
export function evaluateResumption({
    teardown,
    injectionManager,
    arcmenuStateNow,
    arcmenuActiveState,
    arcmenuPathNow,
    auditedPath,
}) {
    if (teardown || !injectionManager)
        return RESUME_SKIP;

    if (arcmenuStateNow !== arcmenuActiveState || arcmenuPathNow !== auditedPath)
        return RESUME_POSTPONE;

    return RESUME_PROCEED;
}
