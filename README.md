# Icon Theme Switcher

A lightweight GNOME Shell extension that adds a quick-access menu to the Top Bar for switching between installed icon themes. 

![Icon Switcher Demo](IconSwitcher.gif)

## Features
* **Auto-Discovery**: Scans both system-wide (`/usr/share/icons`) and user-local (`~/.local/share/icons`) directories.
* **Smart Validation**: Only displays valid icon themes (folders containing an `index.theme` file).
* **Live Refresh**: Update the theme list on the fly without restarting GNOME Shell.
* **Native Integration**: Synchronizes automatically with GNOME Tweaks and System Settings.
* **Localization**: Full support for English, Spanish, and French.

## Installation

### Option 1: Using git (Recommended)
```shell
git clone [https://github.com/mcoyle1960/icon-switcher.git](https://github.com/mcoyle1960/icon-switcher.git)
mkdir -p ~/.local/share/gnome-shell/extensions/
cp -Rf icon-switcher/icon-switcher@mcoyle1960.jennaudio.com ~/.local/share/gnome-shell/extensions/

After testing to make sure it's installed correctly, clean up with 

```shell
cd ~
rm -Rf ~/icon-switcher/
