# Icon Switcher
Gnome Extension the puts an icon in the topbar allowing you to quickly switch between icon sets.
It looks in both /urs/share/icons & ~/.local/share/icons for folders with an index.theme.

If you add new themes just hit refresh. Once selected you'll see the new icon theme immediately.


![Icon Switcher Demo](IconSwitcher.gif)


### Installation

#### Option 1: Using git (Recommended)
```shell
git clone [https://github.com/mcoyle1960/icon-switcher.git](https://github.com/mcoyle1960/icon-switcher.git)
cp -Rf ~/icon-switcher/icon-switcher@mcoyle1960.jennaudio.com ~/.local/share/gnome-shell/extensions/
```

After testing to make sure it's installed correctly, clean up with 

```shell
cd ~
rm -Rf ~/icon-switcher/
```

#### Option 2: Manual Download
1. Download the [Source ZIP](https://github.com/mcoyle1960/icon-switcher/archive/refs/heads/main.zip).
2. Extract the archive.
3. Copy the extension folder to your local extensions directory:

```shell
   cp -Rf ~/Downloads/icon-switcher-main/icon-switcher@mcoyle1960.jennaudio.com ~/.local/share/gnome-shell/extensions/
```


Log out and back in to load the extension.

