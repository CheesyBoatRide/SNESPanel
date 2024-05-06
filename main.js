const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('node:path')

const fs = require('node:fs');

let configData = null;
let mainWindow = null;

function loadSettings() {

    mainWindow.webContents.send("snesConnectionStatus", false);

    var toml = require('toml');

    let configFile = './config.toml';
    if (!fs.existsSync(configFile)) {
        configFile = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'config.toml');
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

        snesControls.init(mainWindow);
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
        if (appDesc.display in processes) {
            status = 'running';
        } else if (appDesc.error === 'ok') {
            status = 'stopped';
        }
    }

    mainWindow.webContents.send("updateAppStatus", appDesc.display, status)
}

function untrackProcess(childProcess) {
    if (processes[appDesc.display] !== undefined) {
        let index = processes[appDesc.display].indexOf(childProcess);
        if (index > -1) {
            processes[appDesc.display].splice(index, 1);
        }
        if (processes[appDesc.display].length == 0) {
            delete processes[appDesc.display];
        }
    }
}

function startProcess(appDesc) {
    const { spawn } = require('child_process');

    let working_dir = appDesc.working_directory !== undefined ? appDesc.working_directory :
        require('path').dirname(appDesc.cmd);
    let env = appDesc.env !== undefined ? appDesc.env : "";
    let args = appDesc.args !== undefined ? appDesc.args : [];

    let childProcess = {};

    try {

        childProcess = spawn(appDesc.cmd, args, {
            cwd: working_dir,
            env: { ...env, ...process.env },
            stdio: 'inherit',
            detached: true
        });
        childProcess.on('error', (err) => {
            if (childProcess !== undefined) {
                childProcess.kill();
            }
            appDesc.error = 'error';
            killProcessGroup(appDesc.display);
            updateAppStatus(appDesc);
        });
        childProcess.on('exit', () => {
            untrackProcess(childProcess);
            updateAppStatus(appDesc);
        });

        if (processes[appDesc.display] === undefined) {
            processes[appDesc.display] = [];
        }
        processes[appDesc.display].push(childProcess);

    } catch {
        if (childProcess !== undefined) {
            childProcess.kill();
        }
        appDesc.error = 'error';
    }

    updateAppStatus(appDesc);
}

function killProcessGroup(groupName) {
    if (groupName in processes) {
        for (childProcess of processes[groupName]) {
            killProcess(childProcess);
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
    if (processes[display] === undefined) {
        for (appDesc of appList) {
            startProcess(appDesc);
        }
    } else {
        killProcessGroup(display);
    }
})

const snesControls = require('./snes_controller/controller.cjs')

ipcMain.on('resetSnes', (_event) => {
    snesControls.reset();
});

ipcMain.on('resetSnesToMenu', (_event) => {
    snesControls.resetToMenu();
});