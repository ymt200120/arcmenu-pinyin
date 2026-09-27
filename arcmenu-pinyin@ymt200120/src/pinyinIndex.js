// ArcMenu Pinyin — 拼音首字母索引与排序（纯逻辑模块）
// 本模块不依赖任何 GNOME Shell / GJS API，可在 Node 与 GJS 下运行同一份测试。
import {pinyin} from '../vendor/pinyin-pro/index.mjs';

// CJK 统一表意文字（含扩展 A 与兼容表意区）
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const LATIN_RE = /[a-zA-Z]/;
const DIGIT_RE = /[0-9]/;
const LETTER_RE = /^[a-zA-Z]$/;

/**
 * 创建拼音索引器。
 *
 * 字母判定规则（与 Windows 中文环境一致，A-Z 桶 + # 桶）：
 * - 英文首字母 → 大写字母桶；
 * - 中文 → 对整个名称做拼音转换（pinyin-pro 分词），取首个字母。
 *   采用整串而非仅首字，可借助词库修正首字多音字（重庆→C、厦门→X）；
 * - 数字与其余字符 → # 桶（排在最后）。
 *
 * 已知局限：多音字处理依赖 pinyin-pro 内置词库，未收录的词可能取到
 * 非预期读音（例如冷门专名）；转换失败的字符统一归入 # 桶。
 */
export function createPinyinIndex({cacheLimit = 4096} = {}) {
    const cache = new Map();

    function convertFirstLetter(name) {
        let letter = '#';
        try {
            const arr = pinyin(name, {pattern: 'first', toneType: 'none', type: 'array'});
            const first = arr?.[0];
            if (typeof first === 'string' && LETTER_RE.test(first))
                letter = first.toUpperCase();
        } catch {
            letter = '#';
        }
        return letter;
    }

    return {
        /**
         * 返回应用显示名对应的分桶字母（A-Z 或 '#'）。
         */
        letterForName(name) {
            if (!name)
                return '#';

            const first = name.charAt(0);
            if (LATIN_RE.test(first))
                return first.toUpperCase();
            if (DIGIT_RE.test(first) || !CJK_RE.test(first))
                return '#';

            if (cache.has(name))
                return cache.get(name);

            const letter = convertFirstLetter(name);
            if (cache.size >= cacheLimit)
                cache.clear();
            cache.set(name, letter);
            return letter;
        },

        clear() {
            cache.clear();
        },
    };
}

/**
 * 依据分桶字母重排应用条目：
 * - 主键：分桶字母升序，'#' 固定最后；
 * - 次键：同桶内 localeCompare(name, 'zh')（zh 排序：拉丁先于汉字，汉字按拼音）。
 *
 * @param {Array<{key: string, name: string}>} entries 应用条目（key 用于还原原对象）
 * @param {(name: string) => string} letterForName 字母判定函数
 * @returns {Array<{key: string, name: string}>} 排序后的条目数组
 */
export function sortEntriesByLetter(entries, letterForName) {
    const decorated = entries.map(entry => {
        const name = entry.name ?? '';
        return {...entry, bucket: letterForName(name)};
    });

    decorated.sort((a, b) => {
        if (a.bucket !== b.bucket) {
            if (a.bucket === '#')
                return 1;
            if (b.bucket === '#')
                return -1;
            return a.bucket < b.bucket ? -1 : 1;
        }
        return a.name.localeCompare(b.name, 'zh');
    });

    return decorated;
}
