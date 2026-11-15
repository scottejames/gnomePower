import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const PS = '/sys/class/power_supply';
const dec = new TextDecoder();

function read(path) {
    try {
        const [ok, bytes] = GLib.file_get_contents(path);
        return ok ? dec.decode(bytes).trim() : null;
    } catch (e) {
        return null;
    }
}
const num = p => { const v = read(p); return v === null ? null : Number(v); };

function sample() {
    let charger = null, bat = null;
    let dir;
    try {
        dir = GLib.Dir.open(PS, 0);
    } catch (e) {
        return {charger, bat};
    }
    let name;
    while ((name = dir.read_name()) !== null) {
        const p = `${PS}/${name}`;
        const type = read(`${p}/type`);
        if (type === 'Battery' && !bat) {
            let w = num(`${p}/power_now`);
            if (w === null) {
                const v = num(`${p}/voltage_now`), a = num(`${p}/current_now`);
                if (v !== null && a !== null) w = v * a / 1e6;
            }
            bat = {
                status: read(`${p}/status`),
                pct: num(`${p}/capacity`),
                watts: w === null ? null : Math.abs(w) / 1e6,
            };
        } else if (type === 'USB' && read(`${p}/online`) === '1') {
            const v = num(`${p}/voltage_now`), a = num(`${p}/current_now`);
            if (v && a) charger = {volts: v / 1e6, amps: a / 1e6, watts: v * a / 1e12, port: name};
        }
    }
    dir.close();
    return {charger, bat};
}

export default class PowerWattsExtension extends Extension {
    enable() {
        this._button = new PanelMenu.Button(0.0, 'Power Watts');
        this._label = new St.Label({text: '…', y_align: Clutter.ActorAlign.CENTER});
        this._button.add_child(this._label);
        this._chargerItem = new PopupMenu.PopupMenuItem('', {reactive: false});
        this._batItem = new PopupMenu.PopupMenuItem('', {reactive: false});
        this._button.menu.addMenuItem(this._chargerItem);
        this._button.menu.addMenuItem(this._batItem);
        Main.panel.addToStatusArea(this.uuid, this._button, 0, 'right');
        this._update();
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
            this._update();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _update() {
        const {charger, bat} = sample();
        const bw = bat && bat.watts !== null ? Math.round(bat.watts) : null;
        let text;
        if (charger && bat && bat.status === 'Charging')
            text = `⚡${Math.round(charger.watts)}W · +${bw}W`;
        else if (charger)
            text = `⚡${Math.round(charger.watts)}W`;
        else if (bat && bw !== null && bat.status === 'Discharging')
            text = `−${bw}W`;
        else
            text = bw !== null ? `${bw}W` : '';
        this._label.set_text(text);

        this._chargerItem.label.set_text(charger
            ? `Charger: ${charger.volts.toFixed(0)} V × ${charger.amps.toFixed(1)} A = ${charger.watts.toFixed(0)} W max (${charger.port})`
            : 'Charger: not connected (USB-C)');
        this._batItem.label.set_text(bat
            ? `Battery: ${bat.pct}% ${bat.status}${bw !== null ? `, ${bat.watts.toFixed(1)} W` : ''}`
            : 'Battery: not found');
    }

    disable() {
        if (this._timer) {
            GLib.source_remove(this._timer);
            this._timer = null;
        }
        this._button?.destroy();
        this._button = null;
        this._label = null;
        this._chargerItem = null;
        this._batItem = null;
    }
}
