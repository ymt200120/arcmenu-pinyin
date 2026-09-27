// ArcMenu Pinyin — ArcMenu 检测与结构审计（兼容性门控）
//
// 核心原则：本扩展不修改 ArcMenu 文件，而是通过 GNOME Shell 扩展管理器
// 定位正在运行的 ArcMenu，按绝对 file:// URI 导入其 ES 模块。GJS 按 URI
// 缓存模块，因此本扩展拿到的是与运行中 ArcMenu 完全相同的类对象——
// 对类原型做方法覆写即可影响已存在的布局实例（已在隔离 GNOME Shell 46
// 会话中实测验证，见仓库 runtime/ 目录）。
//
// 注入前必须通过结构审计：确认目标方法存在且其实现与我们审计过的
// ArcMenu 70.0 形状一致。任何一项不满足即拒绝注入（官方行为不受影响，
// 仅失去拼音分组能力），避免在未知版本上造成崩溃。

import Gio from 'gi://Gio';

export const ARCMENU_UUID = 'arcmenu@arcmenu.com';

/** 已验证可注入的 ArcMenu version-name 主版本（与隔离实机验证一致）。 */
export const VERIFIED_ARCMENU_MAJORS = ['70'];

/** GNOME Shell ExtensionState（misc/extensionUtils.js）。 */
export const ExtensionState = {
    ACTIVE: 1,
    INACTIVE: 2,
    ERROR: 3,
    OUT_OF_DATE: 4,
    DOWNLOADING: 5,
    INITIALIZED: 6,
    DEACTIVATING: 7,
    ACTIVATING: 8,
    UNINSTALLED: 99,
};

/**
 * 从 GNOME Shell 扩展管理器查找 ArcMenu。
 * @param {object} Main resource:///org/gnome/shell/ui/main.js 的命名空间
 */
export function lookupArcMenu(Main) {
    try {
        return Main.extensionManager.lookup(ARCMENU_UUID) ?? null;
    } catch {
        return null;
    }
}

/**
 * 结构审计：按绝对路径导入 ArcMenu 模块并验证注入点形状。
 * 通过时返回 {ok: true, modules, checks}，失败时返回 {ok: false, problems}。
 *
 * 审计项与 ArcMenu 70.0 (version 74) 对应：
 * - BaseMenuLayout.prototype._createSortedAppsList / _displayAppList /
 *   _createLabelWithSeparator / setDefaultMenuView / _destroyMenuItems 存在；
 * - _displayAppList 源码包含 charAt(0).toUpperCase() / addBucketChar /
 *   populateMenu 标记（说明分组与 BucketJump 收集逻辑未被重构）；
 * - utils.getAppDisplayName 可用（显示名来源与官方一致）；
 * - constants.js 命名空间含 CategoryType/DisplayType。
 */
export async function auditArcMenu(arcPath) {
    const problems = [];
    const modules = {};

    const importModule = async rel => {
        const file = Gio.File.new_for_path(`${arcPath}/${rel}`);
        return import(file.get_uri());
    };

    try {
        modules.baseMenuLayout = await importModule('menulayouts/baseMenuLayout.js');
        modules.arcmenuManager = await importModule('arcmenuManager.js');
        modules.constants = await importModule('constants.js');
        modules.menuWidgets = await importModule('menuWidgets.js');
        modules.utils = await importModule('utils.js');
    } catch (e) {
        return {ok: false, problems: [`module import failed: ${e}`]};
    }

    const proto = modules.baseMenuLayout?.BaseMenuLayout?.prototype;
    if (!proto) {
        problems.push('BaseMenuLayout class not found');
        return {ok: false, problems};
    }

    const checks = {
        hasCreateSortedAppsList: typeof proto._createSortedAppsList === 'function',
        hasDisplayAppList: typeof proto._displayAppList === 'function',
        hasCreateLabelWithSeparator: typeof proto._createLabelWithSeparator === 'function',
        hasSetDefaultMenuView: typeof proto.setDefaultMenuView === 'function',
        hasDestroyMenuItems: typeof proto._destroyMenuItems === 'function',
        hasGetAppDisplayName: typeof modules.utils?.getAppDisplayName === 'function',
        hasCategoryType: typeof modules.constants?.CategoryType === 'object',
        hasDisplayType: typeof modules.constants?.DisplayType === 'object',
    };

    const displaySrc = typeof proto._displayAppList === 'function'
        ? proto._displayAppList.toString() : '';
    checks.displayUsesRawFirstChar = displaySrc.includes('charAt(0).toUpperCase()');
    checks.displayRegistersBuckets = displaySrc.includes('addBucketChar');
    checks.displayPopulatesBucketMenu = displaySrc.includes('populateMenu');

    for (const [name, ok] of Object.entries(checks))
        if (!ok)
            problems.push(`check failed: ${name}`);

    const manager = modules.arcmenuManager?.ArcMenuManager;
    if (typeof manager?.getDefault !== 'function')
        problems.push('check failed: ArcMenuManager singleton accessor');

    return {ok: problems.length === 0, problems, checks, modules};
}
