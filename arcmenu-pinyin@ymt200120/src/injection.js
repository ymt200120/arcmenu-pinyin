// ArcMenu Pinyin — 运行时注入管理器
//
// GNOME Shell 46 不提供 resource:///org/gnome/shell/misc/injectionManager.js
// （该文件自 GNOME 47 起内置），故内置一份最小实现。语义与上游一致：
// 在原型上包裹目标方法并保存原函数，clear/restore 时精确还原。
//
// 安全性质：
// - 同一 (对象, 方法) 只允许一个生效的覆写（防重复注入/多层包裹）；
// - restore 精确还原到注入时观察到的函数，不假设原型初始状态；
// - 若覆写对象上原本不存在该方法，restore 时删除新增属性。
export class InjectionManager {
    constructor() {
        this._overrides = new Map(); // `${ownerId}#${methodName}` -> record
    }

    /**
     * 覆写 prototype[methodName]。wrapperFactory(original) 返回替代函数。
     * 若同一方法已被本管理器覆写，返回 false 并拒绝（不叠加包裹层）。
     *
     * @returns {boolean} 是否成功覆写
     */
    overrideMethod(owner, methodName, wrapperFactory) {
        const key = `${this._ownerId(owner)}#${methodName}`;
        if (this._overrides.has(key))
            return false;

        const original = owner[methodName];
        if (typeof original !== 'function')
            return false;

        owner[methodName] = wrapperFactory(original);
        this._overrides.set(key, {
            owner,
            methodName,
            original,
            hadOwn: Object.prototype.hasOwnProperty.call(owner, methodName),
        });
        return true;
    }

    /**
     * 是否存在生效的覆写。
     */
    hasOverrides() {
        return this._overrides.size > 0;
    }

    /**
     * 还原全部覆写，返回还原数量。
     */
    clear() {
        let restored = 0;
        for (const {owner, methodName, original, hadOwn} of this._overrides.values()) {
            try {
                if (hadOwn || original !== undefined)
                    owner[methodName] = original;
                else
                    delete owner[methodName];
                restored++;
            } catch (e) {
                console.warn(`[arcmenu-pinyin] restore failed for ${methodName}: ${e}`);
            }
        }
        this._overrides.clear();
        return restored;
    }

    _ownerId(owner) {
        // 原型对象没有稳定 id，用构造器名 + 引用序号近似标识
        if (!this._ownerIds)
            this._ownerIds = new Map();
        if (!this._ownerIds.has(owner))
            this._ownerIds.set(owner, `${owner?.constructor?.name ?? 'unknown'}@${this._ownerIds.size}`);
        return this._ownerIds.get(owner);
    }
}
