// 拼音排序/显示的布局与设置门控测试（Node / GJS 双跑）
import assert from './assert.mjs';

import {
    makeSortWrapper,
    pinyinGroupingEnabled,
} from '../arcmenu-pinyin@ymt200120/src/displayGate.js';

import {createPinyinIndex} from '../arcmenu-pinyin@ymt200120/src/pinyinIndex.js';

const constants = {
    DisplayType: {LIST: 'list', GRID: 'grid'},
};

function context(values, calls = [], logs = []) {
    return {
        constants,
        getSettings: () => ({
            get_boolean: key => {
                calls.push(key);
                return values[key];
            },
        }),
        log: message => logs.push(message),
    };
}

export const tests = [
    ['sort wrapper: grouping off preserves official order', () => {
        const calls = [];
        const apps = [{name: '微信'}, {name: 'Alpha'}, {name: '哔哩哔哩'}];
        const ctx = {
            ...context({'group-apps-alphabetically-list-layouts': false,
                'group-apps-alphabetically-grid-layouts': true}, calls),
            utils: {getAppDisplayName: app => app.name},
            index: createPinyinIndex(),
        };
        const official = function () {
            return apps;
        };
        const result = makeSortWrapper(ctx)(official).call({display_type: constants.DisplayType.LIST});
        assert.strictEqual(result, apps);
        assert.deepStrictEqual(result.map(app => app.name), ['微信', 'Alpha', '哔哩哔哩']);
        assert.deepStrictEqual(calls, ['group-apps-alphabetically-list-layouts']);
    }],

    ['sort wrapper: grouping on applies pinyin bucket order', () => {
        const calls = [];
        const apps = [{name: '微信'}, {name: 'Alpha'}, {name: '哔哩哔哩'}];
        const ctx = {
            ...context({'group-apps-alphabetically-list-layouts': true,
                'group-apps-alphabetically-grid-layouts': false}, calls),
            utils: {getAppDisplayName: app => app.name},
            index: createPinyinIndex(),
            log: () => {},
        };
        const official = function () {
            return apps.slice();
        };
        const result = makeSortWrapper(ctx)(official).call({display_type: constants.DisplayType.LIST});
        assert.deepStrictEqual(result.map(app => app.name), ['Alpha', '哔哩哔哩', '微信']);
        assert.deepStrictEqual(calls, ['group-apps-alphabetically-list-layouts']);
    }],

    ['display gate: list layout follows list grouping setting', () => {
        const calls = [];
        const ctx = context({'group-apps-alphabetically-list-layouts': true,
            'group-apps-alphabetically-grid-layouts': false}, calls);
        assert.strictEqual(pinyinGroupingEnabled(ctx, {display_type: constants.DisplayType.LIST}), true);
        assert.deepStrictEqual(calls, ['group-apps-alphabetically-list-layouts']);
    }],

    ['display gate: list layout preserves official behavior when list grouping is off', () => {
        const calls = [];
        const ctx = context({'group-apps-alphabetically-list-layouts': false,
            'group-apps-alphabetically-grid-layouts': true}, calls);
        assert.strictEqual(pinyinGroupingEnabled(ctx, {display_type: constants.DisplayType.LIST}), false);
        assert.deepStrictEqual(calls, ['group-apps-alphabetically-list-layouts']);
    }],

    ['display gate: grid layout follows grid grouping setting', () => {
        const calls = [];
        const ctx = context({'group-apps-alphabetically-list-layouts': true,
            'group-apps-alphabetically-grid-layouts': false}, calls);
        assert.strictEqual(pinyinGroupingEnabled(ctx, {display_type: constants.DisplayType.GRID}), false);
        assert.deepStrictEqual(calls, ['group-apps-alphabetically-grid-layouts']);
    }],

    ['display gate: grid layout enables pinyin when grid grouping is on', () => {
        const calls = [];
        const ctx = context({'group-apps-alphabetically-list-layouts': false,
            'group-apps-alphabetically-grid-layouts': true}, calls);
        assert.strictEqual(pinyinGroupingEnabled(ctx, {display_type: constants.DisplayType.GRID}), true);
        assert.deepStrictEqual(calls, ['group-apps-alphabetically-grid-layouts']);
    }],

    ['display gate: unknown display type preserves official behavior without reading settings', () => {
        const calls = [];
        const ctx = context({'group-apps-alphabetically-list-layouts': true,
            'group-apps-alphabetically-grid-layouts': true}, calls);
        assert.strictEqual(pinyinGroupingEnabled(ctx, {}), false);
        assert.deepStrictEqual(calls, []);
    }],

    ['display gate: settings failure preserves official behavior', () => {
        const logs = [];
        const ctx = {
            constants,
            getSettings: () => {
                throw new Error('settings unavailable');
            },
            log: message => logs.push(message),
        };
        assert.strictEqual(pinyinGroupingEnabled(ctx, {display_type: constants.DisplayType.LIST}), false);
        assert.strictEqual(logs.length, 1);
        assert.ok(logs[0].includes('official order'));
    }],
];
