// 排序与分组边界测试（Node / GJS 双跑）
import assert from './assert.mjs';

import {createPinyinIndex, sortEntriesByLetter} from '../arcmenu-pinyin@ymt200120/src/pinyinIndex.js';

const idx = createPinyinIndex();

function keys(entries) {
    return entries.map(e => idx.letterForName(e.name)).join('');
}

export const tests = [
    ['sort: 中英文混合按拼音分组排序', () => {
        const entries = [
            {key: 'firefox', name: 'Firefox'},
            {key: 'weixin', name: '微信'},
            {key: 'bili', name: '哔哩哔哩'},
            {key: 'calc', name: '计算器'},
            {key: 'alpha', name: 'Alpha App'},
        ];
        const sorted = sortEntriesByLetter(entries, idx.letterForName);
        // Alpha(A) Firefox(F) 哔哩哔哩(B)... → A, F?? — 不对：哔哩哔哩=B 应在 F 前
        assert.strictEqual(keys(sorted), 'ABFJW');
        assert.strictEqual(sorted[0].name, 'Alpha App');
        assert.strictEqual(sorted[1].name, '哔哩哔哩');
        assert.strictEqual(sorted[2].name, 'Firefox');
        assert.strictEqual(sorted[3].name, '计算器');
    }],

    ['sort: # 桶固定最后', () => {
        const entries = [
            {key: 'd1', name: '9 Safari'},
            {key: 'c1', name: 'C App'},
            {key: 'p1', name: '(Parens)'},
            {key: 'w1', name: '微信'},
        ];
        const sorted = sortEntriesByLetter(entries, idx.letterForName);
        assert.strictEqual(keys(sorted), 'CW##');
    }],

    ['sort: 同桶内次序确定（zh 排序）', () => {
        const entries = [
            {key: 'w1', name: '网易云音乐'},
            {key: 'w2', name: 'WebStorm'},
            {key: 'w3', name: '微信'},
        ];
        const sorted = sortEntriesByLetter(entries, idx.letterForName);
        assert.strictEqual(keys(sorted), 'WWW');
        // 拉丁字/汉字在 zh collation 下的先后次序因 ICU 版本而异
        // （Node 与 GJS 不一致），此处只断言确定性：两次排序结果一致。
        const again = sortEntriesByLetter(entries, idx.letterForName);
        assert.deepStrictEqual(again.map(e => e.name), sorted.map(e => e.name));
        // 且三个应用都仍处于 W 桶内
        assert.deepStrictEqual(new Set(sorted.map(e => e.name)),
            new Set(['WebStorm', '网易云音乐', '微信']));
    }],

    ['sort: 空列表与单元素', () => {
        assert.deepStrictEqual(sortEntriesByLetter([], idx.letterForName), []);
        const single = [{key: 'a', name: '微信'}];
        assert.strictEqual(sortEntriesByLetter(single, idx.letterForName)[0].key, 'a');
    }],

    ['sort: 分组边界——桶字母序列单调且 # 结尾', () => {
        const names = ['微信', '哔哩哔哩', 'Firefox', '腾讯会议', '1Password', '知乎',
            'Chrome', '设置', '终端', '(Parens)', 'Java', '摘 要'];
        const entries = names.map((name, i) => ({key: String(i), name}));
        const sorted = sortEntriesByLetter(entries, idx.letterForName);
        const ks = sorted.map(e => idx.letterForName(e.name));
        for (let i = 1; i < ks.length; i++) {
            const prev = ks[i - 1];
            const cur = ks[i];
            if (prev === cur)
                continue;
            if (prev === '#')
                throw new Error(`# 出现在 ${cur} 之前`);
            if (cur !== '#' && prev > cur)
                throw new Error(`桶序列逆序: ${prev} > ${cur}`);
        }
    }],
];
