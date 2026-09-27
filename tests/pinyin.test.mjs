// 拼音首字母映射测试（Node / GJS 双跑）
import assert from './assert.mjs';

import {createPinyinIndex} from '../arcmenu-pinyin@ymt200120/src/pinyinIndex.js';

export const tests = [
    ['pinyin: 核心中文应用映射', () => {
        const idx = createPinyinIndex();
        const cases = [
            ['微信', 'W'],
            ['腾讯会议', 'T'],
            ['哔哩哔哩', 'B'],
            ['网易云音乐', 'W'],
            ['计算器', 'J'],
            ['设置', 'S'],
            ['文件', 'W'],
            ['终端', 'Z'],
        ];
        for (const [name, want] of cases)
            assert.strictEqual(idx.letterForName(name), want, `${name} -> ${want}`);
    }],

    ['pinyin: 多音字按词定音（整串转换）', () => {
        const idx = createPinyinIndex();
        // 旧补丁仅转换首字会得到 Z/S；整串分词转换应得 C/X
        assert.strictEqual(idx.letterForName('重庆银行'), 'C');
        assert.strictEqual(idx.letterForName('厦门银行'), 'X');
        assert.strictEqual(idx.letterForName('长沙银行'), 'C');
    }],

    ['pinyin: 英文与数字、特殊字符', () => {
        const idx = createPinyinIndex();
        assert.strictEqual(idx.letterForName('Chrome'), 'C');
        assert.strictEqual(idx.letterForName('firefox'), 'F');
        assert.strictEqual(idx.letterForName('1Password'), '#');
        assert.strictEqual(idx.letterForName('(Test Paren'), '#');
        assert.strictEqual(idx.letterForName('ocs-url'), 'O');
    }],

    ['pinyin: 空名与空串', () => {
        const idx = createPinyinIndex();
        assert.strictEqual(idx.letterForName(''), '#');
        assert.strictEqual(idx.letterForName(null), '#');
        assert.strictEqual(idx.letterForName(undefined), '#');
    }],

    ['pinyin: 缓存一致性', () => {
        const idx = createPinyinIndex();
        const a = idx.letterForName('微信');
        const b = idx.letterForName('微信');
        assert.strictEqual(a, b);
        idx.clear();
        assert.strictEqual(idx.letterForName('微信'), a);
    }],
];
