// ArcMenu Pinyin — 拼音分组开关判定（纯逻辑模块）
//
// 保持排序包装器与显示包装器使用同一套 ArcMenu 布局/设置门控；未知布局
// 或设置读取失败时回退到官方行为。

import {sortEntriesByLetter} from './pinyinIndex.js';

/**
 * Return whether ArcMenu's alphabetical grouping is enabled for this layout.
 *
 * _createSortedAppsList() feeds All Apps, while _displayAppList() receives
 * the category explicitly. The two wrappers share this predicate so pinyin
 * sorting and pinyin headers cannot be enabled by different conditions.
 */
export function pinyinGroupingEnabled(ctx, layout) {
    const displayType = ctx.constants?.DisplayType;
    let settingKey;
    if (layout?.display_type === displayType?.LIST)
        settingKey = 'group-apps-alphabetically-list-layouts';
    else if (layout?.display_type === displayType?.GRID)
        settingKey = 'group-apps-alphabetically-grid-layouts';
    else
        return false;

    try {
        const settings = typeof ctx.getSettings === 'function' ? ctx.getSettings() : null;
        if (!settings || typeof settings.get_boolean !== 'function')
            return false;
        return settings.get_boolean(settingKey) === true;
    } catch (e) {
        try {
            ctx.log?.(`grouping setting read failed, using official order: ${e}`);
        } catch {
            // Logging must not turn the safe fallback into a menu failure.
        }
        return false;
    }
}

/**
 * Wrap ArcMenu's official All Apps sort. The method has no category argument;
 * _createSortedAppsList() is the source used for the All Apps category.
 */
export function makeSortWrapper(ctx) {
    return original => function (...args) {
        const list = original.apply(this, args);
        if (!Array.isArray(list) || list.length === 0)
            return list;

        // Keep the official order unless the current layout has ArcMenu's
        // matching alphabetical grouping setting enabled.
        if (!pinyinGroupingEnabled(ctx, this))
            return list;

        try {
            const entries = list.map(app => ({
                app,
                name: ctx.utils.getAppDisplayName(app),
            }));
            return sortEntriesByLetter(entries, ctx.index.letterForName)
                .map(entry => entry.app);
        } catch (e) {
            // 拼音层任何异常都退回官方排序结果，绝不让菜单失效
            ctx.log(`sort wrapper failed, falling back to official order: ${e}`);
            return list;
        }
    };
}
