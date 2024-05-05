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
        for(childProcess of procs) {
            killProcess(childProcess);
        }
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
})

function updateAppStatus(appDesc) {
    if (appDesc.display in processes) {
        for (child_process of processes[appDesc.display]) {
            if (child_process.pid === undefined || child_process.exitCode !== null) {
                killProcess(child_process);
            }
        }
    }

    console.log(appDesc);

    let status = 'error';
    if (appDesc.display in processes) {
        status = 'running';
    } else if (appDesc.error === 'ok') {
        status = 'stopped';
    }

    mainWindow.webContents.send("updateAppStatus", appDesc.display, status)
}

function startProcess(appDesc) {
    const { spawn } = require('child_process');

    let working_dir = appDesc.working_directory !== undefined ? appDesc.working_directory :
        require('path').dirname(appDesc.cmd);
    let env = appDesc.env !== undefined ? appDesc.env : "";
    let args = appDesc.args !== undefined ? appDesc.args : [];

    console.log(appDesc.cmd);
    console.log(args);

    try {

        let child_process = spawn(appDesc.cmd, args, {
            cwd: working_dir,
            env: { ...env, ...process.env },
            stdio: 'inherit',
            detached: true
        });
        child_process.on('exit', () => {
            if (processes[appDesc.display] !== undefined) {
                let index = processes[appDesc.display].indexOf(child_process);
                if (index > -1) {
                    processes[appDesc.display].splice(index, 1);
                }
                if (processes[appDesc.display].length == 0) {
                    delete processes[appDesc.display];
                }
            }
            updateAppStatus(appDesc);
        });

        if (processes[appDesc.display] === undefined) {
            processes[appDesc.display] = [];
        }
        processes[appDesc.display].push(child_process);

    } catch {
        appDesc.error = 'error';
    }

    updateAppStatus(appDesc);
}

function killProcessGroup(groupName) {
    if (groupName in processes) {
        for (child_process of processes[groupName]) {
            killProcess(child_process);
        }
    }
}

function killProcess(child_process) {
    if (process.platform === "win32") {
        const { spawn } = require('child_process');

        let cmd = 'taskkill';
        let args = ['/pid', child_process.pid, '/t'];

        spawn(cmd, args, {
            detached: true
        });
    } else {
        child_process.kill();
    }

}

ipcMain.on('toggleApp', (_event, appList, display) => {
    if (processes[display] === undefined) {
        for(appDesc of appList) {
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