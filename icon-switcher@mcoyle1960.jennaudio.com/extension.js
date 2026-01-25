/* extension.js */
/**
 * Icon Switcher - GNOME Shell Extension
 *This extension provides a quick-access menu in the GNOME Top Bar to switch
 * between installed icon themes.
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
 * Scans standard Linux icon directories to find valid themes.
 * It looks for folders containing an 'index.theme' file, which identifies 
 * a directory as a legitimate icon theme.
 * * @returns {Array} A sorted list of unique theme names.
 */
function getAvailableIconThemes() {
    let themes = [];
    
    // Define standard search paths: User-local and System-wide
    let paths = [
        GLib.get_home_dir() + '/.local/share/icons',
        '/usr/share/icons'
    ];

    paths.forEach(path => {
        let dir = Gio.File.new_for_path(path);
        try {
            // Enumerate directory children to find theme folders
            let enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                // Only process items that are actually directories
                if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                    // Check for the presence of 'index.theme' to validate the theme
                    let indexFile = dir.get_child(info.get_name()).get_child('index.theme');
                    if (indexFile.query_exists(null)) {
                        themes.push(info.get_name());
                    }
                }
            }
        } catch (e) {
            // Silently ignore permission errors or non-existent paths
        }
    });

    // Use a Set to ensure unique entries and sort alphabetically for the UI
    return [...new Set(themes)].sort();
}

/**
 * The Indicator class defines the icon appearing in the Top Bar.
 */
const Indicator = GObject.registerClass({
    GTypeName: 'IconSwitcherIndicator',
}, class Indicator extends PanelMenu.Button {
    
    /**
     * Component Constructor
     * Initializes UI elements and setting listeners.
     */
    _init() {
        // Initialize the panel button (0.0 alignment)
        super._init(0.0, _('Icon Theme Switcher'));

        // Object to store references to menu items for checkmark updates
        this._menuItems = {};
        
        // Access the GNOME interface settings schema
        this._interfaceSettings = new Gio.Settings({ schema_id: INTERFACE_SETTINGS });

        // Add the visual icon to the panel button using Adwaita symbolics
        this.add_child(new St.Icon({
            gicon: new Gio.FileIcon({
                // Picked this inoffensive icon because it's available on all Gnome systems.
                file: Gio.File.new_for_path('/usr/share/icons/Adwaita/symbolic/status/user-available-symbolic.svg')
            }),
            style_class: 'system-status-icon',
        }));

        // Initial build of the popup menu
        this._buildMenu();
        
        // Listen for external changes (like from GNOME Tweaks) to keep the UI in sync
        this._settingsSignal = this._interfaceSettings.connect(`changed::${ICON_KEY}`, () => {
            const newTheme = this._interfaceSettings.get_string(ICON_KEY);
            this._updateMenuChecks(newTheme);
        });
    }

    /**
     * Reconstructs the popup menu by scanning the filesystem.
     * This is called both during startup and when clicking 'Refresh'.
     */
    _buildMenu() {
        // Remove existing items to prevent duplicates if user clicks 'Refresh'
        this.menu.removeAll();
        this._menuItems = {};

        //  Refresh button
        let refreshItem = new PopupMenu.PopupImageMenuItem(_('Refresh Icon List…'), 'view-refresh-symbolic', {});
        refreshItem.connect('activate', () => {
            this._buildMenu();
        });
        this.menu.addMenuItem(refreshItem);

        // Visual separator between controls and the theme list
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        try {
            const themes = getAvailableIconThemes();
            const currentTheme = this._interfaceSettings.get_string(ICON_KEY);

            // Create a menu item for every theme found on the disk
            themes.forEach(themeName => {
                let item = new PopupMenu.PopupImageMenuItem(_(themeName), 'object-select-symbolic');
                
                // Hide the selection icon by default (opacity 0)
                if (item._icon) {
                    item._icon.opacity = 0; 
                }
                
                // When clicked, update the system setting and the UI checkmarks
                item.connect('activate', () => {
                    this._interfaceSettings.set_string(ICON_KEY, themeName);
                    this._updateMenuChecks(themeName);
                });

                this.menu.addMenuItem(item);
                
                // Store reference to update checkmark later
                this._menuItems[themeName] = item;
            });

            // Highlight the theme that is currently active
            this._updateMenuChecks(currentTheme);

        } catch (e) {
            console.error(`IconSwitcher Error building menu: ${e}`);
        }
    }

    /**
     * Manages the visibility of selection icons (checkmarks).
     * @param {string} activeTheme - The theme name currently selected in GSettings.
     */
    _updateMenuChecks(activeTheme) {
        for (let themeName in this._menuItems) {
            let item = this._menuItems[themeName];
            
            // If theme matches active, show icon (255), otherwise hide it (0)
            if (item._icon) {
                item._icon.opacity = (themeName === activeTheme) ? 255 : 0;
            }
        }
    }
    
    /**
     * Cleanup method called when the extension is disabled.
     * Prevents memory leaks by disconnecting signals.
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
 * Extension Entry Point
 * This class handles the lifecycle of the extension (Enable/Disable).
 */
export default class IndicatorExampleExtension extends Extension {
    /**
     * Runs when the extension is turned on.
     * Adds the indicator to the Shell's status area.
     */
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    /**
     * Runs when the extension is turned off.
     * Properly destroys the indicator to clean up the UI.
     */
    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
