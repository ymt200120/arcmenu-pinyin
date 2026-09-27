// 跳转面板固定键位模型测试（Node / GJS 双跑）
import assert from './assert.mjs';

import {
    buildPopupEntries,
    FIXED_BUCKETS,
    maxColumnsFor,
} from '../arcmenu-pinyin@ymt200120/src/bucketGrid.js';

export const tests = [
    ['bucketgrid: 固定序列为 27 键且 # 在 A 前（Windows 式）', () => {
        assert.strictEqual(FIXED_BUCKETS.length, 27);
        assert.strictEqual(FIXED_BUCKETS[0], '#');
        assert.deepStrictEqual(FIXED_BUCKETS.slice(1), [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
    }],

    ['bucketgrid: present/absent 标记正确', () => {
        const entries = buildPopupEntries(['W', 'C', '#']);
        assert.strictEqual(entries.length, 27);
        const byChar = new Map(entries.map(e => [e.char, e.active]));
        assert.strictEqual(byChar.get('#'), true);
        assert.strictEqual(byChar.get('W'), true);
        assert.strictEqual(byChar.get('C'), true);
        assert.strictEqual(byChar.get('A'), false);
        assert.strictEqual(byChar.get('H'), false);
        assert.strictEqual(byChar.get('Z'), false);
    }],

    ['bucketgrid: 空集全灰 / 满集全亮', () => {
        assert.ok(buildPopupEntries([]).every(e => !e.active));
        assert.ok(buildPopupEntries(FIXED_BUCKETS).every(e => e.active));
    }],

    ['bucketgrid: 键位顺序不随 present 集变化（防漂移核心性质）', () => {
        const a = buildPopupEntries(['Z']);
        const b = buildPopupEntries(['A', '#', 'M']);
        assert.deepStrictEqual(a.map(e => e.char), b.map(e => e.char));
        assert.deepStrictEqual(a.map(e => e.char), FIXED_BUCKETS);
    }],

    ['bucketgrid: maxColumns 沿用官方公式', () => {
        assert.strictEqual(maxColumnsFor(27), 6);
        assert.strictEqual(maxColumnsFor(2), 2);
        assert.strictEqual(maxColumnsFor(1), 2);
        assert.strictEqual(maxColumnsFor(64), 8);
        assert.strictEqual(maxColumnsFor(65), 8);
    }],
];
