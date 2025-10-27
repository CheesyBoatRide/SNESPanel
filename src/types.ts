import { ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';

export type AppId = string;

export type AppDescription = {
    name: AppId;
    error: string;
    html: string;
    cmd: string;
    working_directory: string;
    env: Map<string, string>;
    args: string[];
}

export type ProcessMap = Map<AppId, ChildProcess>;
export type AppletMap = Map<AppId, BrowserWindow>;

export type SnesUsbConfig = {
    usb2snes_address: string;
}

export type SnesPanelConfig = {
    apps: AppDescription[]; // List of app descriptions to add custom buttons for
    webpages: Map<string, string>; // List of embedded websites to make groups for
    start: string[]; // List of apps to start on launch of panel
    usb2snes: SnesUsbConfig; // Config for usb2snes connection
    expanded_groups: string[]; // List of groups to be expanded
}