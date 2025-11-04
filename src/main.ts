import { AppId, AppDescription, AppletDescription, ProcessMap, AppletMap, SnesPanelConfig } from './types';
import { app, globalShortcut, BrowserWindow, Menu, ipcMain } from 'electron';
import { ChildProcess, spawn } from 'child_process';

import * as path from 'path';
import * as fs from 'fs';

import * as snesControls from './usb2snes/snes_interface';

let mainWindow: BrowserWindow | null;
let processes: ProcessMap = new Map();
let subWindows: AppletMap = new Map();

/// Parse and process settings from `config.json` file
/// Must be called after the main window is valid
function loadSettings() {
    if (mainWindow === null) {
        console.error("Invalid main window");
        return;
    }

    mainWindow.webContents.send("snesConnectionStatus", false);

    let configFile = './config.json';
    if (!fs.existsSync(configFile)) {
        configFile = path.join(app.getAppPath(), 'config.json');
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

        // Read the config file and interpret it as a SnesPanelConfig type
        const json_config = JSON.parse(data);
        let configData: SnesPanelConfig = json_config as SnesPanelConfig;
        console.log(configData);

        // TODO - verify that all processes and applets are valid and update UI as such

        // Initialize the UI for apps and applets
        mainWindow.webContents.send("initAppList", configData.apps);
        mainWindow.webContents.send("initApplets", configData.applets);

        // Kick off any apps or applets set to launch on start
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

        // Initialize the usb2snes connection for our commands
        snesControls.snesAddWindow(mainWindow);
        snesControls.snesConnect(configData.usb2snes.usb2snes_address);

        // Initialize the UI state of specified groups
        mainWindow.webContents.send("applyCollapseSettings", configData.expanded_groups);

        // Register hotkeys for SNES controls
        if(configData.usb2snes.hotkeys.reset !== undefined && configData.usb2snes.hotkeys.reset.length > 0) {
            globalShortcut.register(configData.usb2snes.hotkeys.reset, () => {
                snesControls.snesReset();
            });
        }
        if(configData.usb2snes.hotkeys.menu !== undefined && configData.usb2snes.hotkeys.reset.length > 0) {
            globalShortcut.register(configData.usb2snes.hotkeys.menu, () => {
                snesControls.snesResetToMenu();
            });
        }
    });

}

/// Create the main SNES Control Panel window
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

    // Load the HTML for the UI
    mainWindow.loadFile('./src/render/index.html');

    // Wait until the UI html/js is fully loaded to start sending it settings
    mainWindow.webContents.on('did-finish-load', function () {
        loadSettings();
    });

    mainWindow.on('close', () => {
        if (mainWindow !== null) {
            // Shut down our hooks to the usb2snes connection
            snesControls.snesRemoveWindow(mainWindow);
            snesControls.snesDisconnect();
        }

        // Kill any lingering processes
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

    // Build the menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    // TODO - I think this was a suggested pattern - why are we calling this in two places below?
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createMainWindow();
    })

})

app.on('window-all-closed', () => {
    // Electron says to do this for expected behavior on MacOS
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

/// Find the status of the given child process and report its state to the UI
function updateAppStatus(appDesc: AppDescription) {
    if (processes.has(appDesc.name)) {
        for (const [id, childProcess] of processes.entries()) {
            if (childProcess.pid === undefined || childProcess.exitCode !== null) {
                killProcess(childProcess);
            }
        }
    }

    // Default to an error state
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

/// Find the status of the given applet and report its state to the UI
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

/// Check if a URL is a remote destination - This function was generated by AI
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

function createAppletWindow(appDesc: AppletDescription) {
    // Calculate window geometry
    let width: number = appDesc.width !== undefined ? appDesc.width : 300;
    let height: number = appDesc.height !== undefined ? appDesc.height : 250;

    let window = new BrowserWindow({
        title: appDesc.name,
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // If we enable context isolation the IPC no longer works
            backgroundThrottling: false // Disable throttling for this window
        }
    });

    // For now this is a setting - maybe could be a hotkey in the future?
    if (appDesc.dev_tools === true) {
        window.webContents.openDevTools();
    }

    // Fetch the html
    let html = appDesc.html;
    if (isRemoteUrl(html)) {
        window.loadURL(html);
    } else {
        if (!fs.existsSync(html)) {
            html = path.join(app.getAppPath(), html);
        }
        html = fs.realpathSync(html);
        window.loadFile(html);
    }

    // No menu for now
    window.setMenu(null);

    // register this window's JS to receive callbacks from the usb2snes integration
    snesControls.snesAddWindow(window);

    // Clean up on close
    window.on('close', () => {
        subWindows.delete(appDesc.name);
        snesControls.snesRemoveWindow(window);
        updateAppletStatus(appDesc);
    });

    // Add to cache
    subWindows.set(appDesc.name, window);
}

/// Launch an applet with the given description
function startApplet(appDesc: AppletDescription) {
    if (appDesc.html !== undefined) {
        createAppletWindow(appDesc);
        updateAppletStatus(appDesc);
    }
}

/// Start a child process with the given description
function startProcess(appDesc: AppDescription) {

    // Search for the relevant command
    // First check for an absolute path.  Failing that, assume a relative
    // path from a given working directory.  If none was specified, assume
    // a path relative to the working directory of the SNES panel itself
    let cmd = appDesc.cmd;
    let working_dir = appDesc.working_directory

    if (!fs.existsSync(cmd)) {
        if (working_dir !== undefined) {
            if (!fs.existsSync(working_dir)) {
                working_dir = path.join(app.getAppPath(), working_dir);
            }
            cmd = path.join(working_dir, cmd);
        } else {
            cmd = path.join(app.getAppPath(), cmd);
        }
    }

    // Default the working directory of the launched app to be the directory it lives in
    if (working_dir === undefined) {
        working_dir = path.dirname(cmd);
    }

    // Allow the filesystem to clean up our paths
    cmd = fs.realpathSync(cmd);
    working_dir = fs.realpathSync(working_dir);

    console.log("Command: %s", cmd);
    console.log("Working Directory: %s", working_dir);

    // Build the environment as an object
    let env = process.env;
    if (appDesc.env !== undefined) {
        Object.assign(env, appDesc.env);
    }

    // Build args as an array of strings
    let args: string[] = appDesc.args !== undefined ? appDesc.args : [];

    let childProcess: ChildProcess | undefined;

    try {

        // Attempt to launch the process
        childProcess = spawn(cmd, args, {
            cwd: working_dir,
            env: { ...env, ...process.env },
            stdio: 'inherit',
            detached: true
        });

        // Error occured - mark it as invalid and clean up any remaining resources
        childProcess.on('error', (err) => {
            if (childProcess !== undefined) {
                childProcess.kill();
            }

            console.log("Process %s failed", cmd);

            appDesc.error = 'error';
            stopApp(appDesc.name);
            updateAppStatus(appDesc);
        });

        // This is a graceful exit, we just clean up the cache and update the UI
        childProcess.on('exit', () => {
            stopApp(appDesc.name);
            updateAppStatus(appDesc);
        });

        // Mark this process as valid and add it to the cache
        appDesc.error = 'ok';
        processes.set(appDesc.name, childProcess);
        console.log("Successfully ran cmd %s", cmd);
    } catch {
        // Something went wrong - kill it and flag it as invalid
        if (childProcess !== undefined) {
            childProcess.kill();
        }
        appDesc.error = 'error';
        console.log("Caught an exception running %s", cmd);
    }

    // Whatever happens, update the UI with the results
    updateAppStatus(appDesc);
}

/// Kill the provided child process
function killProcess(childProcess: ChildProcess) {
    // On Windows, we use `taskkill` which sends an event to the application to close gracefully.
    // This allows, for instance, Livesplit to ask if you want to save your splits
    if (process.platform === "win32") {
        const { spawn } = require('child_process');

        let cmd = 'taskkill';
        let args = ['/pid', childProcess.pid, '/t'];

        spawn(cmd, args, {
            detached: true
        });
    } else {
        // All other platforms just kill the process
        // TODO - is there a better way to handle this for Linux/MacOS?
        childProcess.kill();
    }

}

// Stop the referenced app and remove it from our cache
function stopApp(id: AppId) {
    if (processes.has(id)) {
        let childProcess: ChildProcess | undefined = processes.get(id);
        if (childProcess !== undefined) {
            killProcess(childProcess);
        }
        processes.delete(id);
    }
}

// Stop the referenced applet and remove it from our cache
function stopApplet(id: AppId) {
    if (subWindows.has(id)) {
        let window: BrowserWindow | undefined = subWindows.get(id);
        if (window !== undefined) {
            window.close();
            subWindows.delete(id);
        }
    }
}

// Event from the UI to toggle the state of an app
ipcMain.on('toggleApp', (_event, appDesc: AppDescription) => {
    if (!processes.has(appDesc.name)) {
        startProcess(appDesc);
    } else {
        stopApp(appDesc.name);
    }
});

// Event from the UI to toggle the state of an applet
ipcMain.on('toggleApplet', (_event, appDesc: AppletDescription) => {
    if (!subWindows.has(appDesc.name)) {
        startApplet(appDesc);
    } else {
        stopApplet(appDesc.name);
    }
});

// Event from the UI to send a reset event over usb2snes
ipcMain.on('snesReset', (_event) => {
    snesControls.snesReset();
});

// Event from the UI to send a menu event over usb2snes
ipcMain.on('snesResetToMenu', (_event) => {
    snesControls.snesResetToMenu();
});

// Event from the UI to get RAM values over usb2snes
ipcMain.on('snesRequestMemoryValue', (_event, address, offset) => {
    snesControls.snesRequestMemoryValue(address, offset);
});

// Event from the UI to send RAM values over usb2snes
ipcMain.on('snesSetMemoryValue', (_event, address, data) => {
    snesControls.snesSetMemoryValue(address, data);
});