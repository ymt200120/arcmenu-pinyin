import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';

export class AlphabetJumpList extends PopupMenu.PopupMenu {
    constructor(menuLayout) {
        const dummyCursor = new St.Widget({width: 0, height: 0, opacity: 0});
        super(dummyCursor, 0.5, St.Side.TOP);

        this.dummyCursor = dummyCursor;
        Main.uiGroup.add_child(this.dummyCursor);

        this._menuLayout = menuLayout;
        this._arcMenu = menuLayout.arcMenu;

        this.actor.add_style_class_name('popup-menu arcmenu-menu');
        this.actor.add_style_class_name('arcmenu-alphabet-popup');
        this.box.add_style_class_name('arcmenu-alphabet-panel');

        this._openStateId = this.connect('open-state-changed', this._onOpenStateChanged.bind(this));
        menuLayout.subMenuManager.addMenu(this);
        Main.uiGroup.add_child(this.actor);
        this.actor.hide();

        this.connectObject('notify::mapped', () => {
            if (!this.mapped)
                this.close();
        }, this);

        this._letters = [];
    }

    openAt(letters) {
        this._letters = letters;
        this._rebuildButtons();

        const [sourceX, sourceY] = this._arcMenu.actor.get_transformed_position();
        const [, naturalHeight] = this.actor.get_preferred_height(-1);
        const positionX = sourceX + (this._arcMenu.actor.width / 2);
        const positionY = sourceY + (this._arcMenu.actor.height / 2) - (naturalHeight / 2);

        this.dummyCursor.set_position(Math.round(positionX), Math.round(positionY));
        this.open();
    }

    destroy() {
        if (this._openStateId) {
            this.disconnect(this._openStateId);
            this._openStateId = null;
        }
        this.close();
        if (this.dummyCursor) {
            this.dummyCursor.destroy();
            this.dummyCursor = null;
        }
        this._menuLayout = null;
        this._arcMenu = null;
        this._letters = [];
        super.destroy();
    }

    _onOpenStateChanged(menu, isOpen) {
        if (isOpen) {
            this.box.set({
                scale_x: 0.6,
                scale_y: 0.6,
                opacity: 0,
            });
            this.box.ease({
                scale_x: 1,
                scale_y: 1,
                opacity: 255,
                duration: 150,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    _rebuildButtons() {
        this.box.destroy_all_children();

        const grid = new St.BoxLayout({
            vertical: true,
            style_class: 'arcmenu-alphabet-grid',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.box.add_child(grid);

        const columns = 6;
        for (let i = 0; i < this._letters.length; i += columns) {
            const row = new St.BoxLayout({
                vertical: false,
                style_class: 'arcmenu-alphabet-row',
            });

            const rowEnd = Math.min(i + columns, this._letters.length);
            for (let j = i; j < rowEnd; j++) {
                const {letter, active} = this._letters[j];
                const styleClass = active ? 'button arcmenu-alphabet-button'
                    : 'button arcmenu-alphabet-button arcmenu-alphabet-button-disabled';

                const button = new St.Button({
                    label: letter,
                    style_class: styleClass,
                    reactive: active,
                    can_focus: active,
                    x_expand: true,
                });

                if (active) {
                    button.connect('clicked', () => {
                        this.close();
                        this._menuLayout?._onAlphabetLetterSelected(letter);
                    });
                }

                row.add_child(button);
            }

            grid.add_child(row);
        }
    }
}
