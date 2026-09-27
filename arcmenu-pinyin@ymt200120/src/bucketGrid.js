// ArcMenu Pinyin — 跳转面板固定键位模型（纯逻辑，Node/GJS 可测）
//
// 设计目标：跳转面板（Bucket Jump 弹窗）固定显示 '#' + 26 个字母共 27 键，
// '#' 在 'A' 之前（Windows 式，与应用列表中 '#' 组位置一致）。
// 无对应应用的键由调用方置灰（reactive:false + 半透明），
// 键位因此永不随应用增删而漂移。

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** 跳转面板固定键位序列：['#', 'A', …, 'Z'] */
export const FIXED_BUCKETS = ['#', ...LETTERS];

/**
 * 按固定键位顺序生成弹窗按钮模型。
 *
 * @param {Iterable<string>} presentChars 当前实际存在的分桶字母（如 'W'、'#'）
 * @returns {Array<{char: string, active: boolean}>} 固定长度 27 的按钮模型
 */
export function buildPopupEntries(presentChars) {
    const present = new Set(presentChars ?? []);
    return FIXED_BUCKETS.map(char => ({char, active: present.has(char)}));
}

/**
 * 弹窗网格列数——沿用 ArcMenu 70.0 populateMenu 的官方公式
 * （menuWidgets.js:3014）：min(8, max(2, ceil(sqrt(itemCount))))。
 * 27 键 → 6 列 × 5 行。
 *
 * @param {number} itemCount 键数
 * @returns {number} 列数
 */
export function maxColumnsFor(itemCount) {
    return Math.min(8, Math.max(2, Math.ceil(Math.sqrt(itemCount))));
}
