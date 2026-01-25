/* extension.js */
/**
 * Icon Switcher - GNOME Shell Extension
 * Quick-access menu to switch between installed icon themes.
 */

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const INTERFACE_SETTINGS = 'org.gnome.desktop.interface';
const ICON_KEY = 'icon-theme';

/**
 * Scans standard directories for folders containing an 'index.theme' file.
 */
function getAvailableIconThemes() {
    const themes = new Set();
    const paths = [
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'icons']),
        '/usr/share/icons'
    ];

    for (const path of paths) {
        const dir = Gio.File.new_for_path(path);
        try {
            const enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let info;
            while ((info = enumerator.next_file(null))) {
                if (info.get_file_type() !== Gio.FileType.DIRECTORY)
                    continue;

                const name = info.get_name();
                const indexFile = dir.get_child(name).get_child('index.theme');
                
                if (indexFile.query_exists(null))
                    themes.add(name);
            }
        } catch (e) {
            // Path doesn't exist or isn't readable; skip
        }
    }

    return [...themes].sort((a, b) => a.localeCompare(b));
}

const Indicator = GObject.registerClass({
    GTypeName: 'IconSwitcherIndicator',
}, class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Icon Theme Switcher'));

        this.accessible_name = _('Icon Theme Switcher');
        this._menuItems = {};
        this._interfaceSettings = new Gio.Settings({ schema_id: INTERFACE_SETTINGS });

        this.add_child(new St.Icon({
            icon_name: 'preferences-desktop-theme-symbolic',
            style_class: 'system-status-icon',
        }));

        this._buildMenu();
        
        this._settingsSignal = this._interfaceSettings.connect(`changed::${ICON_KEY}`, () => {
            this._updateMenuChecks(this._interfaceSettings.get_string(ICON_KEY));
        });
    }

    _buildMenu() {
        this.menu.removeAll();
        this._menuItems = {};

        const refreshItem = new PopupMenu.PopupImageMenuItem(_('Refresh Icon List…'), 'view-refresh-symbolic');
        refreshItem.connect('activate', () => this._buildMenu());
        this.menu.addMenuItem(refreshItem);
        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const themes = getAvailableIconThemes();
        const currentTheme = this._interfaceSettings.get_string(ICON_KEY);

        themes.forEach(themeName => {
            const item = new PopupMenu.PopupMenuItem(themeName);
            item.connect('activate', () => {
                this._interfaceSettings.set_string(ICON_KEY, themeName);
            });

            this.menu.addMenuItem(item);
            this._menuItems[themeName] = item;
        });

        this._updateMenuChecks(currentTheme);
    }

    _updateMenuChecks(activeTheme) {
        Object.entries(this._menuItems).forEach(([name, item]) => {
            item.setOrnament(name === activeTheme 
                ? PopupMenu.Ornament.CHECK 
                : PopupMenu.Ornament.NONE);
        });
    }
    
    destroy() {
        if (this._settingsSignal) {
            this._interfaceSettings.disconnect(this._settingsSignal);
            this._settingsSignal = 0;
        }
        super.destroy();
    }
});

export default class IconSwitcherExtension extends Extension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
