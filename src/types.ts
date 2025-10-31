import { ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';

export type AppId = string;

/// Configuration for a child process to be launched via button press on the SNES panel
export type AppDescription = {
    name: AppId;
    error: string;
    cmd: string;
    working_directory: string;
    env: Map<string, string>;
    args: string[];
    launch_on_start: boolean;
}

/// Configuration for an applet to be launched via button press on the SNES panel
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

/// Settings for hotkeys for various usb2snes actions
/// https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts#accelerators
export type HotKeyConfig = {
    reset: string;
    menu: string;
}

/// Settings for usb2snes connection
export type SnesUsbConfig = {
    usb2snes_address: string;
    hotkeys: HotKeyConfig;
}

/// Object representing the entire `config.json`
export type SnesPanelConfig = {
    apps: AppDescription[]; // List of app descriptions to add custom buttons for
    applets: AppletDescription[]; // List of applets (embedded or popup html - local or remote)
    usb2snes: SnesUsbConfig; // Config for usb2snes connection
    expanded_groups: string[]; // List of groups to be expanded
}