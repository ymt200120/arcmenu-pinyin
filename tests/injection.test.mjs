// 注入管理器生命周期测试（Node / GJS 双跑）
// 模拟 ArcMenu 的类原型场景，验证 InjectionManager 的安全性质。
import assert from './assert.mjs';

import {InjectionManager} from '../arcmenu-pinyin@ymt200120/src/injection.js';

class BaseMenuLayout {
    constructor() {
        this.apps = [];
    }

    _createSortedAppsList() {
        return [...this.apps].sort();
    }

    _displayAppList(apps) {
        return apps.map(a => a.charAt(0).toUpperCase());
    }
}

class AzLayout extends BaseMenuLayout {
}

export const tests = [
    ['injection: 覆写影响已存在的实例（原型补丁语义）', () => {
        const inst = new BaseMenuLayout();
        inst.apps = ['beta', 'alpha'];
        const mgr = new InjectionManager();
        const ok = mgr.overrideMethod(BaseMenuLayout.prototype, '_createSortedAppsList',
            original => function (...args) {
                return original.apply(this, args).reverse();
            });
        assert.ok(ok);
        assert.deepStrictEqual(inst._createSortedAppsList(), ['beta', 'alpha']);
        mgr.clear();
    }],

    ['injection: restore 精确还原且不影响子类链', () => {
        const inst = new AzLayout();
        inst.apps = ['b', 'a'];
        const mgr = new InjectionManager();
        mgr.overrideMethod(BaseMenuLayout.prototype, '_createSortedAppsList',
            original => function (...args) {
                return original.apply(this, args).reverse();
            });
        assert.ok(mgr.hasOverrides());
        assert.strictEqual(mgr.clear(), 1);
        assert.ok(!mgr.hasOverrides());
        // 还原后子类实例走回官方实现
        assert.deepStrictEqual(inst._createSortedAppsList(), ['a', 'b']);
    }],

    ['injection: 拒绝重复注入（防多层包裹）', () => {
        const mgr = new InjectionManager();
        const first = mgr.overrideMethod(BaseMenuLayout.prototype, '_displayAppList',
            original => original);
        assert.ok(first);
        const second = mgr.overrideMethod(BaseMenuLayout.prototype, '_displayAppList',
            original => original);
        assert.ok(!second, '同一方法的第二次覆写必须被拒绝');
        assert.strictEqual(mgr.clear(), 1);
        const third = mgr.overrideMethod(BaseMenuLayout.prototype, '_displayAppList',
            original => original);
        assert.ok(third, 'clear 后可重新注入（模拟再次启用）');
        mgr.clear();
    }],

    ['injection: 还原计数与幂等 clear', () => {
        const mgr = new InjectionManager();
        mgr.overrideMethod(BaseMenuLayout.prototype, '_displayAppList', original => original);
        mgr.overrideMethod(BaseMenuLayout.prototype, '_createSortedAppsList', original => original);
        assert.strictEqual(mgr.clear(), 2);
        assert.strictEqual(mgr.clear(), 0, '二次 clear 应为幂等空操作');
    }],

    ['injection: 拒绝为不存在的方法创建新属性', () => {
        const mgr = new InjectionManager();
        const proto = BaseMenuLayout.prototype;
        const ok = mgr.overrideMethod(proto, '_pinyinTempHelper', () => () => 'x');
        assert.ok(!ok, '只允许包裹已存在的函数，不得在原型上新增属性');
        assert.ok(!Object.prototype.hasOwnProperty.call(proto, '_pinyinTempHelper'));
    }],

    ['injection: 官方实现为非函数时拒绝覆写', () => {
        const mgr = new InjectionManager();
        const ok = mgr.overrideMethod(BaseMenuLayout.prototype, '_nonexistentMethod',
            () => () => {});
        assert.ok(!ok);
    }],
];
