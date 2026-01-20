/* extension.js */
/**
 * Icon Switcher - GNOME Shell Extension
 * This file handles the UI indicator and the logic for scanning/applying icon themes.
 */

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

// Standard extension imports for GNOME 45+ ESM environment
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Constants for interacting with GNOME's desktop-wide interface settings
const INTERFACE_SETTINGS = 'org.gnome.desktop.interface';
const ICON_KEY = 'icon-theme';

/**
 * Scans standard Linux icon directories to find valid themes.
 * It looks for folders containing an 'index.theme' file.
 * @returns {Array} A sorted list of unique theme names.
 */
function getAvailableIconThemes() {
    let themes = [];
    // Standard search paths: User-specific (~/.local/share/icons) and System-wide (/usr/share/icons)
    let paths = [
        GLib.get_home_dir() + '/.local/share/icons',
        '/usr/share/icons'
    ];

    paths.forEach(path => {
        let dir = Gio.File.new_for_path(path);
        try {
            // Read children of the directory
            let enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                // Only process directories
                if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                    // A folder is only a valid icon theme if it contains an 'index.theme'
                    let indexFile = dir.get_child(info.get_name()).get_child('index.theme');
                    if (indexFile.query_exists(null)) {
                        themes.push(info.get_name());
                    }
                }
            }
        } catch (e) {
            // Silently ignore paths that don't exist (like ~/.local/share/icons if empty)
        }
    });

    // Remove duplicates and sort alphabetically for a clean UI menu
    return [...new Set(themes)].sort();
}

/**
 * The Indicator class defines the icon appearing in the Top Bar.
 * Inherits from PanelMenu.Button to integrate with the GNOME Shell panel.
 */
const Indicator = GObject.registerClass({
    GTypeName: 'IconSwitcherIndicator',
}, class Indicator extends PanelMenu.Button {
    
    _init() {
        // Initialize the panel button with a label for accessibility
        super._init(0.0, _('Icon Theme Switcher'));

        // references to store menu items and system settings
        this._menuItems = {};
        this._interfaceSettings = new Gio.Settings({ schema_id: INTERFACE_SETTINGS });

        // Create the status bar icon using Adwaita's symbolic 'user-available' icon
        this.add_child(new St.Icon({
            gicon: new Gio.FileIcon({
                file: Gio.File.new_for_path('/usr/share/icons/Adwaita/symbolic/status/user-available-symbolic.svg')
            }),
            style_class: 'system-status-icon',
        }));
        
        try {
            const themes = getAvailableIconThemes();
            const currentTheme = this._interfaceSettings.get_string(ICON_KEY);

            // Dynamically build the popup menu based on discovered themes
            themes.forEach(themeName => {
                let item = new PopupMenu.PopupImageMenuItem(_(themeName), 'object-select-symbolic');
                
                // Set initial opacity of the checkmark icon to 0 (hidden)
                if (item._icon) {
                    item._icon.opacity = 0; 
                }
                
                // When a theme is clicked: update GSettings and the UI checkmarks
                item.connect('activate', () => {
                    this._interfaceSettings.set_string(ICON_KEY, themeName);
                    this._updateMenuChecks(themeName);
                });

                this.menu.addMenuItem(item);
                this._menuItems[themeName] = item;
            });

            // Set the initial visual state based on current system theme
            this._updateMenuChecks(currentTheme);
            
            // Sync UI if the theme is changed outside of the extension (e.g., via GNOME Tweaks)
            this._settingsSignal = this._interfaceSettings.connect(`changed::${ICON_KEY}`, () => {
                const newTheme = this._interfaceSettings.get_string(ICON_KEY);
                this._updateMenuChecks(newTheme);
            });

        } catch (e) {
            console.error(`IconSwitcher Error: ${e}`);
        }
    }

    /**
     * Toggles the visibility of checkmarks in the menu.
     * @param {string} activeTheme - The name of the theme that should be marked as active.
     */
    _updateMenuChecks(activeTheme) {
        for (let themeName in this._menuItems) {
            let item = this._menuItems[themeName];
            
            // If theme matches active, set opacity to full (255), otherwise hide (0)
            if (item._icon) {
                item._icon.opacity = (themeName === activeTheme) ? 255 : 0;
            }
        }
    }
    
    /**
     * Clean up resources when the extension is disabled to avoid memory leaks.
     */
    destroy() {
        if (this._settingsSignal) {
            this._interfaceSettings.disconnect(this._settingsSignal);
            this._settingsSignal = 0;
        }
        super.destroy();
    }
});

/**
 * Main entry point for the GNOME Extension.
 */
export default class IndicatorExampleExtension extends Extension {
    enable() {
        // Instantiate the UI and add it to the 'Status Area' of the top panel
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        // Properly destroy the indicator to remove it from the panel
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
