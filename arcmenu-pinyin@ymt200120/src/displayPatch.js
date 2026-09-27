// ArcMenu Pinyin — BaseMenuLayout 注入包装器
//
// 只接管“所有应用 + 已开启字母分组”的显示路径，其余路径（固定应用、
// 分类列表、搜索、常用）一律委托官方实现。排序通过包裹
// _createSortedAppsList 完成；分组显示复刻官方 _displayAppList 的分组
// 分支（ArcMenu 70.0, baseMenuLayout.js:904-971），仅把分桶字母的来源
// 从 charAt(0) 换成拼音索引。BucketJump 弹窗、点击跳转、组标题样式全部
// 复用官方代码（_createLabelWithSeparator / enableClickGesture /
// addBucketChar / populateMenu）。

import St from 'gi://St';

import {buildPopupEntries, maxColumnsFor, FIXED_BUCKETS} from './bucketGrid.js';
import {sortEntriesByLetter} from './pinyinIndex.js';

/**
 * @param {object} ctx 上下文：
 *   constants  — ArcMenu constants.js 命名空间
 *   utils      — ArcMenu utils.js 命名空间（getAppDisplayName）
 *   getSettings — () => ArcMenuManager.settings
 *   index      — createPinyinIndex() 实例
 *   log        — (msg: string) => void
 */
export function makeSortWrapper(ctx) {
    return original => function (...args) {
        const list = original.apply(this, args);
        if (!Array.isArray(list) || list.length === 0)
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

export function makeDisplayWrapper(ctx) {
    const {constants} = ctx;
    const ALL_PROGRAMS = constants.CategoryType.ALL_PROGRAMS;

    return original => function (apps, category, grid) {
        const settings = ctx.getSettings();
        const groupList = settings.get_boolean('group-apps-alphabetically-list-layouts');
        const groupGrid = settings.get_boolean('group-apps-alphabetically-grid-layouts');
        const isGrid = this.display_type === constants.DisplayType.GRID;
        const isList = this.display_type === constants.DisplayType.LIST;

        const grouped = category === ALL_PROGRAMS &&
            ((groupList && isList) || (groupGrid && isGrid));

        if (!grouped)
            return original.call(this, apps, category, grid);

        return displayPinyinGroupedList.call(this, ctx, apps, grid);
    };
}

// 复刻 ArcMenu 70.0 BaseMenuLayout._displayAppList 的字母分组分支，
// 仅将 currentCharacter 的计算替换为拼音分桶字母。
function displayPinyinGroupedList(ctx, apps, grid) {
    const {constants, utils} = ctx;

    this.activeCategoryType = constants.CategoryType.ALL_PROGRAMS;
    if (grid.removeAllItems)
        grid.removeAllItems();
    else
        grid.remove_all_children();

    this.activeMenuItem = null;
    this._bucketJumpListDialog.clearAll();
    this._setGridColumns(grid);

    let currentBucket = null;
    for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        let item = this.applicationsMap.get(app);
        if (!item) {
            item = new ctx.MW.ApplicationMenuItem(this, app, this.display_type);
            this.applicationsMap.set(app, item);
        }

        const parent = item.get_parent();
        if (parent)
            parent.remove_child(item);

        const bucket = ctx.index.letterForName(utils.getAppDisplayName(app));
        if (currentBucket !== bucket) {
            currentBucket = bucket;
            const label = this._createLabelWithSeparator(bucket);
            label.enableClickGesture();
            this._bucketJumpListDialog.addBucketChar(bucket, label);
            grid.appendItem(label);
        }

        grid.appendItem(item);

        if (!this.activeMenuItem && grid === this.applicationsGrid)
            this.activeMenuItem = item;
    }

    this._bucketJumpListDialog.populateMenu();

    if (this.applicationsBox && grid === this.applicationsGrid &&
        !this.applicationsBox.contains(this.applicationsGrid))
        this.applicationsBox.add_child(this.applicationsGrid);
}

/**
 * 跳转面板固定键位版 populateMenu：
 * 覆写官方 BucketJumpListDialog.populateMenu，使弹窗固定显示
 * '#' + A–Z 共 27 键（顺序与应用列表一致，'#' 在最前）；
 * 无对应应用的键置灰（reactive:false + 半透明）且不可点击。
 * 官方实现（menuWidgets.js:3005-3038）的行为在“有应用的键”上逐行保留：
 * clicked → toggle() + _scrollToItem(header)，header 'activate' → toggle()。
 */
export function makePopulateMenuWrapper(ctx) {
    return original => function () {
        if (!this._bucketChars)
            return;

        this._grid.destroy_all_children();

        const maxColumns = maxColumnsFor(FIXED_BUCKETS.length);
        let row = 0;
        let column = 0;

        for (const entry of buildPopupEntries([...this._bucketChars.keys()])) {
            const button = new St.Button({
                label: entry.char,
                style_class: 'button arcmenu-alphabet-button',
                x_expand: false,
                reactive: entry.active,
                can_focus: entry.active,
            });

            if (entry.active) {
                const header = this._bucketChars.get(entry.char);
                button.connectObject('clicked', () => {
                    this.toggle();
                    this._scrollToItem(header);
                }, this);

                header.connectObject('activate', () => this.toggle(), this);
            } else {
                button.style = 'opacity: 0.4;';
            }

            this._grid.layout_manager.attach(button, column, row, 1, 1);
            column++;
            if (column >= maxColumns) {
                column = 0;
                row++;
            }
        }
    };
}
