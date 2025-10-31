import { ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';

export type AppId = string;

export type AppDescription = {
    name: AppId;
    error: string;
    cmd: string;
    working_directory: string;
    env: Map<string, string>;
    args: string[];
    launch_on_start: boolean;
}

export type AppletDescription = {
    name: AppId;
    error: string;
    html: string;
    launch_on_start: boolean;
    embedded: boolean;
    dev_tools: boolean;
    width: number;
    height: number;
}

export type ProcessMap = Map<AppId, ChildProcess>;
export type AppletMap = Map<AppId, BrowserWindow>;

// https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts#accelerators
export type HotKeyConfig = {
    reset: string;
    menu: string;
}

export type SnesUsbConfig = {
    usb2snes_address: string;
    hotkeys: HotKeyConfig;
}

export type SnesPanelConfig = {
    apps: AppDescription[]; // List of app descriptions to add custom buttons for
    applets: AppletDescription[]; // List of applets (embedded or popup html - local or remote)
    usb2snes: SnesUsbConfig; // Config for usb2snes connection
    expanded_groups: string[]; // List of groups to be expanded
}