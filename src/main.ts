import { AppId, AppDescription, AppletDescription, ProcessMap, AppletMap, SnesUsbConfig, SnesPanelConfig } from './types';
import { app, globalShortcut, BrowserWindow, Menu, ipcMain } from 'electron';
import { ChildProcess, spawn } from 'child_process';

import * as path from 'path';
import * as fs from 'fs';

import * as snesControls from './usb2snes/snes_interface';

let mainWindow: BrowserWindow | null;
let execPath: string;
let processes: ProcessMap = new Map();
let subWindows: AppletMap = new Map();


function loadSettings() {
    if (mainWindow === null) {
        console.error("Invalid main window");
        return;
    }

    execPath = app.getAppPath();

    mainWindow.webContents.send("snesConnectionStatus", false);

    let configFile = './config.json';
    if (!fs.existsSync(configFile)) {
        configFile = path.join(execPath, 'config.json');
    }

    if (!fs.existsSync(configFile)) {
        alert("Unable to find config.json file.  See ReadMe for help.");
        app.exit();
    }

    fs.readFile(configFile, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        if (mainWindow === null) {
            console.error("Invalid main window");
            return;
        }

        const json_config = JSON.parse(data);
        let configData: SnesPanelConfig = json_config as SnesPanelConfig;
        console.log(configData);

        mainWindow.webContents.send("initAppList", configData.apps);
        mainWindow.webContents.send("initApplets", configData.applets);

        for (const app_data of configData.apps) {
            if (app_data.launch_on_start === true) {
                startProcess(app_data);
            }
        }

        for (const applet_data of configData.applets) {
            if (applet_data.launch_on_start === true && applet_data.embedded !== true) {
                startApplet(applet_data);
            }
        }

        snesControls.snesAddWindow(mainWindow);
        snesControls.snesConnect(configData.usb2snes.usb2snes_address);

        mainWindow.webContents.send("applyCollapseSettings", configData.expanded_groups);

        if(configData.usb2snes.hotkeys.reset !== undefined) {
            globalShortcut.register(configData.usb2snes.hotkeys.reset, () => {
                snesControls.snesReset();
            });
        }
        if(configData.usb2snes.hotkeys.menu !== undefined) {
            globalShortcut.register(configData.usb2snes.hotkeys.menu, () => {
                snesControls.snesResetToMenu();
            });
        }
    });

}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'SNES Control Panel',
        width: 1080,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('./src/render/index.html');

    mainWindow.webContents.on('did-finish-load', function () {
        loadSettings();
    });

    mainWindow.on('close', () => {
        if (mainWindow !== null) {
            snesControls.snesRemoveWindow(mainWindow);
        }

        for (const [id, childProcess] of processes.entries()) {
            killProcess(childProcess);
        }

        app.quit();
    });

}

// Menu template
const menu = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Dev Tools',
                click: () => {
                    if (mainWindow !== null) {
                        mainWindow.webContents.openDevTools();
                    }
                },
            },
            {
                label: 'Quit',
                click: () => app.quit(),
            }
        ]
    }
]

app.whenReady().then(() => {
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createMainWindow();
    })

})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

function updateAppStatus(appDesc: AppDescription) {
    if (processes.has(appDesc.name)) {
        for (const [id, childProcess] of processes.entries()) {
            if (childProcess.pid === undefined || childProcess.exitCode !== null) {
                killProcess(childProcess);
            }
        }
    }

    let status = 'error';
    if (appDesc.error === 'ok' || appDesc.error === undefined) {
        if (processes.has(appDesc.name)) {
            status = 'running';
        } else {
            status = 'stopped';
        }
    }

    if (mainWindow !== null) {
        mainWindow.webContents.send("updateButtonStatus", appDesc.name, status);
    }
}

function updateAppletStatus(appDesc: AppletDescription) {
    let status = 'error';
    if (appDesc.error === 'ok' || appDesc.error === undefined) {
        if (subWindows.has(appDesc.name)) {
            status = 'running';
        } else {
            status = 'stopped';
        }
    }

    if (mainWindow !== null) {
        mainWindow.webContents.send("updateButtonStatus", appDesc.name, status);
    }
}

function isRemoteUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        // A remote URL typically has a protocol (like http:, https:, ftp:)
        // and a hostname. File URLs (file:) are technically absolute but might not be considered "remote"
        // in all contexts. This example focuses on common web protocols.
        return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
    } catch (error) {
        // If the URL constructor throws an error, it's likely not a valid absolute URL
        // and therefore not a remote URL.
        return false;
    }
}

function loadSubWindow(appDesc: AppletDescription) {
    let width: number = appDesc.width !== undefined ? appDesc.width : 300;
    let height: number = appDesc.height !== undefined ? appDesc.height : 250;

    let window = new BrowserWindow({
        title: appDesc.name,
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false // Disable throttling for this window
        }
    });

    if (appDesc.dev_tools === true) {
        window.webContents.openDevTools();
    }

    let html = appDesc.html;
    if (isRemoteUrl(html)) {
        window.loadURL(html);
    } else {
        if (!fs.existsSync(html)) {
            html = path.join(execPath, html);
        }
        html = fs.realpathSync(html);

        window.loadFile(html);
    }

    window.setMenu(null)
    snesControls.snesAddWindow(window);

    window.on('close', () => {
        subWindows.delete(appDesc.name);
        snesControls.snesRemoveWindow(window);
        updateAppletStatus(appDesc);
    });

    subWindows.set(appDesc.name, window);
}


function startApplet(appDesc: AppletDescription) {
    if (appDesc.html !== undefined) {
        loadSubWindow(appDesc);
        updateAppletStatus(appDesc);
    }
}

function startProcess(appDesc: AppDescription) {
    let cmd = appDesc.cmd;
    let working_dir = appDesc.working_directory

    if (!fs.existsSync(cmd)) {
        if (working_dir !== undefined) {
            if (!fs.existsSync(working_dir)) {
                working_dir = path.join(execPath, working_dir);
            }
            cmd = path.join(working_dir, cmd);
        } else {
            cmd = path.join(execPath, cmd);
        }
    }

    if (working_dir === undefined) {
        working_dir = path.dirname(cmd);
    }

    cmd = fs.realpathSync(cmd);
    working_dir = fs.realpathSync(working_dir);

    console.log("Command: %s", cmd);
    console.log("Working Directory: %s", working_dir);

    let env = process.env;
    if (appDesc.env !== undefined) {
        Object.assign(env, appDesc.env);
    }
    let args: string[] = appDesc.args !== undefined ? appDesc.args : [];

    let childProcess: ChildProcess | undefined;

    try {

        childProcess = spawn(cmd, args, {
            cwd: working_dir,
            env: { ...env, ...process.env },
            stdio: 'inherit',
            detached: true
        });
        childProcess.on('error', (err) => {
            if (childProcess !== undefined) {
                childProcess.kill();
            }

            console.log("Process %s failed", cmd);

            appDesc.error = 'error';
            stopApp(appDesc.name);
            updateAppStatus(appDesc);
        });
        childProcess.on('exit', () => {
            processes.delete(appDesc.name);
            updateAppStatus(appDesc);
        });

        appDesc.error = 'ok';
        processes.set(appDesc.name, childProcess);
        console.log("Successfully ran cmd %s", cmd);
    } catch {
        if (childProcess !== undefined) {
            childProcess.kill();
        }
        appDesc.error = 'error';
        console.log("Caught an exception running %s", cmd);
    }

    updateAppStatus(appDesc);
}

function killProcess(childProcess: ChildProcess) {
    if (process.platform === "win32") {
        const { spawn } = require('child_process');

        let cmd = 'taskkill';
        let args = ['/pid', childProcess.pid, '/t'];

        spawn(cmd, args, {
            detached: true
        });
    } else {
        childProcess.kill();
    }

}

function stopApp(id: AppId) {
    if (processes.has(id)) {
        let childProcess: ChildProcess | undefined = processes.get(id);
        if (childProcess !== undefined) {
            killProcess(childProcess);
        }
        processes.delete(id);
    }
}

function stopApplet(id: AppId) {
    if (subWindows.has(id)) {
        let window: BrowserWindow | undefined = subWindows.get(id);
        if (window !== undefined) {
            window.close();
            subWindows.delete(id);
        }
    }
}

ipcMain.on('toggleApp', (_event, appDesc: AppDescription) => {
    if (!processes.has(appDesc.name)) {
        startProcess(appDesc);
    } else {
        stopApp(appDesc.name);
    }
});

ipcMain.on('toggleApplet', (_event, appDesc: AppletDescription) => {
    if (!subWindows.has(appDesc.name)) {
        startApplet(appDesc);
    } else {
        stopApplet(appDesc.name);
    }
});

ipcMain.on('resetSnes', (_event) => {
    snesControls.snesReset();
});

ipcMain.on('resetSnesToMenu', (_event) => {
    snesControls.snesResetToMenu();
});

ipcMain.on('snesGetAddress', (_event, address, offset) => {
    snesControls.snesRequestMemoryValue(address, offset);
});