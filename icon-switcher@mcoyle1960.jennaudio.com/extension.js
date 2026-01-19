/* extension.js */
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
 * Helper: Get current theme name
 */
function getCurrentIconTheme() {
    const settings = new Gio.Settings({ schema_id: INTERFACE_SETTINGS });
    return settings.get_string(ICON_KEY);
}

/**
 * Helper: Scan for available themes
 */
function getAvailableIconThemes() {
    let themes = [];
    let paths = [
        GLib.get_home_dir() + '/.local/share/icons',
        '/usr/share/icons'
    ];

    paths.forEach(path => {
        let dir = Gio.File.new_for_path(path);
        try {
            let enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                    let indexFile = dir.get_child(info.get_name()).get_child('index.theme');
                    if (indexFile.query_exists(null)) {
                        themes.push(info.get_name());
                    }
                }
            }
        } catch (e) {
            // Path doesn't exist, ignore
        }
    });

    return [...new Set(themes)].sort();
}

/**
 * The UI Indicator in the Top Bar
 */
const Indicator = GObject.registerClass({
    GTypeName: 'IconSwitcherIndicator',
}, class Indicator extends PanelMenu.Button {
_init() {
        super._init(0.0, _('Icon Theme Switcher'));

        // 1. Initialize our storage and settings references
        this._menuItems = {};
        this._interfaceSettings = new Gio.Settings({ schema_id: INTERFACE_SETTINGS });

this.add_child(new St.Icon({
            gicon: new Gio.FileIcon({
                file: Gio.File.new_for_path('/usr/share/icons/Adwaita/symbolic/status/user-available-symbolic.svg')
            }),
            style_class: 'system-status-icon',
        }));
        
        
        try {
            const themes = getAvailableIconThemes();
            const currentTheme = this._interfaceSettings.get_string(ICON_KEY);

themes.forEach(themeName => {
                let item = new PopupMenu.PopupImageMenuItem(_(themeName), 'object-select-symbolic');
                
                // Use the property-based access here too for consistency and safety
                if (item._icon) {
                    item._icon.opacity = 0; 
                }
                
                item.connect('activate', () => {
                    this._interfaceSettings.set_string(ICON_KEY, themeName);
                    this._updateMenuChecks(themeName);
                });

                this.menu.addMenuItem(item);
                this._menuItems[themeName] = item;
            });

            // 2. Set the initial checkmark
            this._updateMenuChecks(currentTheme);
            
            // Listen for changes to the icon theme from outside this extension
            this._settingsSignal = this._interfaceSettings.connect(`changed::${ICON_KEY}`, () => {
                const newTheme = this._interfaceSettings.get_string(ICON_KEY);
                this._updateMenuChecks(newTheme);
            });

} catch (e) {
            console.error(e);
        }
    }

_updateMenuChecks(activeTheme) {
        for (let themeName in this._menuItems) {
            let item = this._menuItems[themeName];
            
            // PopupImageMenuItem stores the icon in an internal _icon property
            if (item._icon) {
                item._icon.opacity = (themeName === activeTheme) ? 255 : 0;
            }
        }
    }
    
    destroy() {
        if (this._settingsSignal) {
            this._interfaceSettings.disconnect(this._settingsSignal);
            this._settingsSignal = 0;
        }
        super.destroy();
    }
});


export default class IndicatorExampleExtension extends Extension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
