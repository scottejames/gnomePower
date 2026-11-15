# gnomePower

A small GNOME Shell extension that shows charging power in the top bar.

- **Charging:** `⚡60W · +32W`, the wattage the USB-C charger is negotiated for and the watts going into the battery
- **On the charger, not charging:** `⚡60W`
- **On battery:** `−14W`, the watts being drawn from the battery
- **Click** for details: charger volts × amps and port, and battery % and status

It refreshes every 5 seconds and reads values from `/sys/class/power_supply`.

> The charger figure is the negotiated USB Power Delivery contract (for example 20 V × 3 A), not a measured draw.
> Battery watts are `voltage_now × current_now` (or `power_now` where available).

## Install

```sh
git clone https://github.com/scottejames/gnomePower ~/projects/gnomePower
ln -s ~/projects/gnomePower ~/.local/share/gnome-shell/extensions/power-watts@scottejames.local
gnome-extensions enable power-watts@scottejames.local   # on Wayland: log out and back in first
```

Tested on GNOME Shell 51 (Fedora 45). If a GNOME upgrade marks it incompatible, add the new version to `shell-version` in `metadata.json`.

## Debugging

```sh
journalctl --user -b | grep -i -A5 power-watts
```
