// ArcMenu Pinyin — 独立 GNOME Shell 扩展入口
//
// 为官方 ArcMenu 的“所有应用”列表提供中文拼音首字母分组（微信 → W、
// 腾讯会议 → T、哔哩哔哩 → B），并复用官方 Bucket Jump 弹窗实现 A-Z
// 快速跳转。不修改 ArcMenu 的任何文件；禁用本扩展后立即恢复官方行为。
//
// 生命周期状态机：
//   idle ──(enable)──> 观察模式 ──(ArcMenu ACTIVE)──> active（已注入）
//     ▲                    │                            │
//     │                    └──(ArcMenu 非 ACTIVE)────────┘
//     └──(disable 本扩展)── 恢复官方原型并触发 ArcMenu 重建
//
// 每次状态迁移都重新校验 ArcMenu 当前状态（避免在间隙内状态翻转导致
// 对已销毁单例操作）；注入仅在结构审计 + 版本白名单同时通过时进行。

import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
    ARCMENU_UUID,
    ExtensionState,
    VERIFIED_ARCMENU_MAJORS,
    auditArcMenu,
    lookupArcMenu,
} from './src/compat.js';
import {evaluateResumption, RESUME_POSTPONE, RESUME_SKIP} from './src/integrationGuard.js';
import {InjectionManager} from './src/injection.js';
import {makeDisplayWrapper, makePopulateMenuWrapper, makeSortWrapper} from './src/displayPatch.js';
import {createPinyinIndex} from './src/pinyinIndex.js';

const TAG = '[arcmenu-pinyin]';
const INTEGRATE_DELAY_MS = 1500; // ArcMenu enable 完成后，等菜单按钮构建完毕

const log = msg => console.log(`${TAG} ${msg}`);
const warn = msg => console.warn(`${TAG} ${msg}`);

export default class ArcMenuPinyinExtension extends Extension {
    enable() {
        this._state = 'idle';
        this._injectionManager = new InjectionManager();
        this._index = createPinyinIndex();
        this._modules = null;
        this._integrateTimeoutId = 0;

        this._stateChangedId = Main.extensionManager.connectObject(
            'extension-state-changed', (mgr, ext) => this._onExtensionStateChanged(ext), this);

        const arc = lookupArcMenu(Main);
        log(`enabled; ArcMenu ${arc ? `found (state=${arc.state})` : 'not installed'}`);
        if (arc && arc.state === ExtensionState.ACTIVE)
            this._scheduleIntegrate();
        else
            this._state = 'waiting-for-arcmenu';
    }

    disable() {
        this._withdraw();
        if (this._stateChangedId) {
            Main.extensionManager.disconnectObject(this);
            this._stateChangedId = 0;
        }
        this._cancelIntegrateTimer();
        this._index?.clear();
        this._index = null;
        this._injectionManager = null;
        this._modules = null;
        this._state = 'disabled';
        log('disabled; official ArcMenu behaviour restored');
    }

    _onExtensionStateChanged(ext) {
        if (!ext || ext.uuid !== ARCMENU_UUID)
            return;

        if (ext.state === ExtensionState.ACTIVE) {
            log(`ArcMenu became active; integrating in ${INTEGRATE_DELAY_MS}ms`);
            this._scheduleIntegrate();
        } else if (ext.state === ExtensionState.INACTIVE ||
                   ext.state === ExtensionState.UNINSTALLED) {
            if (this._injectionManager?.hasOverrides()) {
                log('ArcMenu disabled/uninstalled; withdrawing injection');
                this._withdraw();
            } else if (this._state !== 'disabled') {
                this._state = 'waiting-for-arcmenu';
            }
        }
        // ACTIVATING/DEACTIVATING/ERROR 等过渡态不处理，等稳定态事件
    }

    _scheduleIntegrate() {
        this._cancelIntegrateTimer();
        this._integrateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, INTEGRATE_DELAY_MS, () => {
            this._integrateTimeoutId = 0;
            // 显式 .catch：集成链上的意外异常必须经统一前缀输出，
            // 且不得留下 partially-injected 状态（见 _onIntegrationFailure）。
            this._integrate().catch(e => this._onIntegrationFailure(e));
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * 集成链的兜底错误处理：记录完整诊断、还原任何已生效的部分覆写、
     * 复位状态等待下一次集成时机。生命周期竞态（disable-during-await）
     * 不走这里——它们在恢复点守卫中被静默处理。
     */
    _onIntegrationFailure(error) {
        warn(`integration failed: ${error?.stack ?? error}`);
        try {
            if (this._injectionManager?.hasOverrides()) {
                const restored = this._injectionManager.clear();
                warn(`integration cleanup: ${restored} override(s) restored`);
                this._rebuildLayouts();
            }
        } catch (cleanupError) {
            warn(`integration cleanup failed: ${cleanupError?.stack ?? cleanupError}`);
        }
        if (this._state !== 'disabled')
            this._state = 'waiting-for-arcmenu';
    }

    _cancelIntegrateTimer() {
        if (this._integrateTimeoutId) {
            GLib.source_remove(this._integrateTimeoutId);
            this._integrateTimeoutId = 0;
        }
    }

    /**
     * 延迟后的集成入口：重新校验 ArcMenu 状态（可能在延迟期内被停用），
     * 然后审计 + 版本门控 + 注入 + 重建布局。
     */
    async _integrate() {
        // 入口守卫：disable() 会先取消未触发的定时器再完成 teardown，
        // 但为防任何路径在 teardown 后调用，此处同样静默退出。
        if (this._state === 'disabled' || !this._injectionManager)
            return;

        const arc = lookupArcMenu(Main);
        if (!arc || arc.state !== ExtensionState.ACTIVE) {
            this._state = 'waiting-for-arcmenu';
            return;
        }

        if (this._injectionManager.hasOverrides()) {
            log('injection already active; skipping');
            return;
        }

        const audit = await auditArcMenu(arc.path);

        // ---- 恢复点守卫：await 期间生命周期可能已变化 ----
        // disable-during-await：teardown 已置空 _injectionManager / 置
        // _state='disabled'，此时必须静默退出、绝不注入；ArcMenu 若被
        // 停用或更换路径则推迟，等待下一次状态事件。
        const arcNow = lookupArcMenu(Main);
        const resumption = evaluateResumption({
            teardown: this._state === 'disabled',
            injectionManager: this._injectionManager,
            arcmenuStateNow: arcNow?.state,
            arcmenuActiveState: ExtensionState.ACTIVE,
            arcmenuPathNow: arcNow?.path,
            auditedPath: arc.path,
        });
        if (resumption === RESUME_SKIP)
            return;
        if (resumption === RESUME_POSTPONE) {
            log('ArcMenu state changed during integration; waiting for next transition');
            this._state = 'waiting-for-arcmenu';
            return;
        }

        if (!audit.ok) {
            this._state = 'incompatible';
            warn(`ArcMenu at "${arc.path}" failed structure audit — refusing to inject. ` +
                 `Official behaviour stays untouched. Problems: ${audit.problems.join('; ')}`);
            return;
        }

        const major = String(arc.metadata?.['version-name'] ?? '').split('.')[0] ??
            String(arc.metadata?.version ?? '');
        if (!VERIFIED_ARCMENU_MAJORS.includes(major)) {
            this._state = 'incompatible';
            warn(`ArcMenu version ${arc.metadata?.['version-name'] ?? arc.metadata?.version} ` +
                 `is not verified yet (verified: ${VERIFIED_ARCMENU_MAJORS.join(', ')}). ` +
                 'Refusing to inject — official behaviour stays untouched. ' +
                 'See the compatibility table in the project README.');
            return;
        }

        this._modules = audit.modules;
        const ctx = {
            constants: audit.modules.constants,
            utils: audit.modules.utils,
            MW: audit.modules.menuWidgets,
            getSettings: () => audit.modules.arcmenuManager.ArcMenuManager.settings,
            index: this._index,
            log: warn,
        };

        const proto = audit.modules.baseMenuLayout.BaseMenuLayout.prototype;
        const dialogProto = audit.modules.menuWidgets.BucketJumpListDialog.prototype;
        const okSort = this._injectionManager.overrideMethod(proto, '_createSortedAppsList',
            makeSortWrapper(ctx));
        const okDisplay = this._injectionManager.overrideMethod(proto, '_displayAppList',
            makeDisplayWrapper(ctx));
        const okPopup = this._injectionManager.overrideMethod(dialogProto, 'populateMenu',
            makePopulateMenuWrapper(ctx));

        if (!okSort || !okDisplay || !okPopup) {
            warn('unexpected injection failure (double inject?); rolling back');
            this._withdraw();
            return;
        }

        this._state = 'active';
        log(`injected into ArcMenu ${arc.metadata?.['version-name']} at ${arc.path}`);
        this._rebuildLayouts();
    }

    /**
     * 撤销注入并让 ArcMenu 以官方行为重建当前视图。
     * 幂等：未注入时调用无副作用。
     */
    _withdraw() {
        this._cancelIntegrateTimer();
        if (this._injectionManager?.hasOverrides()) {
            const restored = this._injectionManager.clear();
            log(`injection removed (${restored} method(s) restored)`);
            this._rebuildLayouts();
        }
        this._state = this._state === 'disabled' ? 'disabled' : 'waiting-for-arcmenu';
        this._modules = null;
    }

    /**
     * 触发所有活着的布局实例重建（对齐官方 _reloadApplications 的路径：
     * _destroyMenuItems → loadCategories → loadPinnedApps → setDefaultMenuView），
     * 使注入/撤销立即反映到已打开过的菜单，无需注销重登。
     */
    _rebuildLayouts() {
        const AM = this._modules?.arcmenuManager?.ArcMenuManager;
        if (!AM)
            return;

        let controllers;
        try {
            controllers = AM.menuControllers ?? [];
        } catch {
            return; // ArcMenu 单例已销毁（disabled 中），无需重建
        }

        for (const controller of controllers) {
            const layout = controller?.menuButton?._menuLayout ??
                controller?.menuButton?.menuButtonWidget?._menuLayout;
            if (!layout)
                continue;

            try {
                layout._destroyMenuItems?.();
                layout.loadCategories();
                layout.loadPinnedApps?.();
                layout.setDefaultMenuView?.();
            } catch (e) {
                warn(`layout rebuild failed: ${e}`);
            }
        }
    }
}
