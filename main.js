const { app, BrowserWindow, Menu, ipcMain } = require('electron/main')
const path = require('node:path')

const fs = require('node:fs');

const snesControls = require('./snes_controller/controller.cjs')

let configData = null;
let mainWindow = null;
let execPath;

function loadSettings() {

    execPath = app.getAppPath();

    mainWindow.webContents.send("snesConnectionStatus", false);

    var toml = require('toml');

    let configFile = './config.toml';
    if (!fs.existsSync(configFile)) {
        configFile = path.join(execPath, 'config.toml');
    }

    if (!fs.existsSync(configFile)) {
        alert("Unable to find config.toml file.  See ReadMe for help.");
        app.exit();
    }

    fs.readFile(configFile, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        configData = toml.parse(data);
        console.log(configData);

        for (const app_name of Object.keys(configData.apps)) {
            if (configData.apps[app_name].display === undefined) {
                configData.apps[app_name].display = app_name;
            }
            configData.apps[app_name].error = 'ok';
        }

        mainWindow.webContents.send("initAppList", configData.apps);
        mainWindow.webContents.send("initBrowserWindowList", configData.webpages);

        for (const app_name of Object.values(configData.start.apps)) {
            if (configData.apps[app_name] !== undefined) {
                startProcess(configData.apps[app_name]);
            } else {
                console.log("failed to find startup app " + app_name);
            }
        }

        mainWindow.webContents.send("setSNESControllerNotesBlurb", configData.snes_controller.notes_blurb);

        snesControls.addWindow(mainWindow);
        snesControls.connect(configData.snes_controller.usb2snes_address);

        mainWindow.webContents.send("applyCollapseSettings", configData.expanded_groups)
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

    mainWindow.loadFile('./render/index.html');

    mainWindow.webContents.on('did-finish-load', function () {
        loadSettings();
    });

    mainWindow.on('close', () => {
        snesControls.removeWindow(mainWindow);
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
                click: () => mainWindow.webContents.openDevTools(),
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

let processes = {};
let subWindows = {};

app.on('window-all-closed', () => {

    for (const procs of Object.values(processes)) {
        for (childProcess of procs) {
            killProcess(childProcess);
        }
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
})

function updateAppStatus(appDesc) {
    if (appDesc.display in processes) {
        for (childProcess of processes[appDesc.display]) {
            if (childProcess.pid === undefined || childProcess.exitCode !== null) {
                killProcess(childProcess);
            }
        }
    }

    console.log(appDesc);

    let status = 'error';
    if(appDesc.error === 'ok') {
        if (appDesc.display in processes || appDesc.display in subWindows) {
            status = 'running';
        } else if (appDesc.error === 'ok') {
            status = 'stopped';
        }
    }

    mainWindow.webContents.send("updateAppStatus", appDesc.display, status)
}

function untrackProcess(display, childProcess) {
    if (processes[display] !== undefined) {
        let index = processes[display].indexOf(childProcess);
        if (index > -1) {
            processes[display].splice(index, 1);
        }
        if (processes[display].length == 0) {
            delete processes[display];
        }
    }
}

function untrackWindow(display, childWindow) {
    if (subWindows[display] !== undefined) {
        let index = subWindows[display].indexOf(childWindow);
        if (index > -1) {
            subWindows[display].splice(index, 1);
        }
        if (subWindows[display].length == 0) {
            delete subWindows[display];
        }
    }
    snesControls.removeWindow(childWindow);
}

function loadSubWindow(appDesc) {
    let window = new BrowserWindow({
        title: appDesc.display,
        width: 300,
        height: 250,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    let html = appDesc.html;
    if (!fs.existsSync(html)) {
        html = path.join(execPath, html);
    }
    html = fs.realpathSync(html);

    window.loadFile(html);
    window.setMenu(null)
    snesControls.addWindow(window);

    if (subWindows[appDesc.display] === undefined) {
        subWindows[appDesc.display] = [];
    }

    window.on('close', () => {
        untrackWindow(appDesc.display, window);
        updateAppStatus(appDesc);
    });

    subWindows[appDesc.display].push(window);
}

function startProcess(appDesc) {

    if(appDesc.html !== undefined) {
        loadSubWindow(appDesc);
        updateAppStatus(appDesc);
        return;
    }

    const { spawn } = require('child_process');

    let cmd = appDesc.cmd;
    let working_dir = appDesc.working_directory 

    if (!fs.existsSync(cmd)) {
        if(working_dir !== undefined) {
            if (!fs.existsSync(working_dir)) {
                working_dir = path.join(execPath, working_dir);
            }
            cmd = path.join(working_dir, cmd);
        } else {
            cmd = path.join(execPath, cmd);
        }
    }

    if(working_dir === undefined) {
        working_dir = path.dirname(cmd);
    }

    cmd = fs.realpathSync(cmd);
    working_dir = fs.realpathSync(working_dir);

    console.log("Command: %s", cmd);
    console.log("Working Directory: %s", working_dir);
 
    let env = appDesc.env !== undefined ? appDesc.env : "";
    let args = appDesc.args !== undefined ? appDesc.args : [];

    let childProcess = {};

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
            killProcessGroup(appDesc.display);
            updateAppStatus(appDesc);
        });
        childProcess.on('exit', () => {
            untrackProcess(appDesc.display, childProcess);
            updateAppStatus(appDesc);
        });

        if (processes[appDesc.display] === undefined) {
            processes[appDesc.display] = [];
        }
        processes[appDesc.display].push(childProcess);
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

function killProcessGroup(groupName) {
    if (groupName in processes) {
        for (childProcess of processes[groupName]) {
            killProcess(childProcess);
            untrackProcess(groupName, childProcess);
        }
    }
    if(groupName in subWindows) {
        for (window of subWindows[groupName]) {
            window.close();
            untrackWindow(groupName, window);
        }
    }
}

function killProcess(childProcess) {
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

ipcMain.on('toggleApp', (_event, appList, display) => {
    if (processes[display] === undefined && subWindows[display] === undefined) {
        for (appDesc of appList) {
            startProcess(appDesc);
        }
    } else {
        killProcessGroup(display);
    }
})

ipcMain.on('resetSnes', (_event) => {
    snesControls.reset();
});

ipcMain.on('resetSnesToMenu', (_event) => {
    snesControls.resetToMenu();
});

ipcMain.on('snesGetAddress', (_event, address, offset) => {
    snesControls.requestMemoryValue(address, offset);
});