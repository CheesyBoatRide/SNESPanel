const { app, BrowserWindow, Menu, ipcMain } = require('electron')
// include the Node.js 'path' module at the top of your file
const path = require('node:path')

const isDev = process.env.NODE_ENV !== 'production'

const fs = require('node:fs');

let configData = null;
let mainWindow = null;

function loadSettings() {
    var toml = require('toml');
    fs.readFile(path.join(__dirname, 'config.toml'), 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        configData = toml.parse(data);
        console.log(configData);
        mainWindow.webContents.send("initAppList", configData.apps);
        mainWindow.webContents.send("initBrowserWindowList", configData.webpages);

        for(const app_name of Object.values(configData.start.apps)) {
            let path = configData.apps[app_name];
            if(path !== undefined) {
                startProcess(app_name, configData.apps[app_name]);
            } else {
                console.log("failed to find startup app " + app_name);
            }
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

    mainWindow.loadFile(path.join(__dirname, './render/index.html'));

    // open devtools in dev
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

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
                label: 'Quit',
                click: () => app.quit(),
            }
        ]
    }
]

app.whenReady().then(() => {
    createMainWindow()

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

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

let processes = {};

function updateAppStatus(appName) {
    if(appName in processes) {
        if(processes[appName].childProcess.pid === undefined || processes[appName].childProcess.exitCode !== null) {
            killProcess(appName);
        }
    }
    mainWindow.webContents.send("updateAppStatus", appName, appName in processes)
}

function startProcess(appName, cmd) {
    const { spawn } = require('child_process');
    let process = spawn(cmd, {
        cwd: require('path').dirname(cmd)
      });
    process.on('exit', () => {
        updateAppStatus(appName);
    });

    let entry = {
        childProcess: process
    };

    processes[appName] = entry;

    updateAppStatus(appName);
}

function killProcess(appName) {
    processes[appName].childProcess.kill();
    delete processes[appName];
}

ipcMain.on('toggleApp', (_event, appName, cmd) => {
    if(processes[appName] === undefined) {
        startProcess(appName, cmd);
    } else {
        killProcess(appName);
    }
})

const snesControls = require(path.join(__dirname, './snes_controller/controller.cjs'))

ipcMain.on('connectToSnes', (_event) => {
    snesControls.connect(configData.snes_controller.usb2snes_address);
});

ipcMain.on('resetSnes', (_event) => {
    snesControls.reset();
});

ipcMain.on('resetSnesToMenu', (_event) => {
    snesControls.resetToMenu();
});