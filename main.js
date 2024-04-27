const { app, BrowserWindow, Menu, ipcMain } = require('electron')
// include the Node.js 'path' module at the top of your file
const path = require('node:path')

const isDev = process.env.NODE_ENV !== 'production'

const fs = require('node:fs');

let configData = null;
let mainWindow = null;

function loadSettings() {
    
    mainWindow.webContents.send("snesConnectionStatus", false);

    var toml = require('toml');
    fs.readFile(path.join(__dirname, 'config.toml'), 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        configData = toml.parse(data);
        console.log(configData);

        for (const app_name of Object.keys(configData.apps)) {
            if(configData.apps[app_name].display === undefined) {
                configData.apps[app_name].display = app_name;
            }
        }

        mainWindow.webContents.send("initAppList", configData.apps);
        mainWindow.webContents.send("initBrowserWindowList", configData.webpages);

        for(const app_name of Object.values(configData.start.apps)) {
            if(configData.apps[app_name] !== undefined) {
                startProcess(configData.apps[app_name]);
            } else {
                console.log("failed to find startup app " + app_name);
            }
        }

        mainWindow.webContents.send("setSNESControllerNotesBlurb", configData.snes_controller.notes_blurb);

        snesControls.init(mainWindow);
        snesControls.connect(configData.snes_controller.usb2snes_address);
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

function startProcess(app_desc) {
    const { spawn } = require('child_process');

    let working_dir = app_desc.working_directory !== undefined ? app_desc.working_directory :
        require('path').dirname(app_desc.cmd);

    let process = spawn(app_desc.cmd, {
        cwd: working_dir
      });
    process.on('exit', () => {
        updateAppStatus(app_desc.display);
    });

    let entry = {
        childProcess: process
    };

    processes[app_desc.display] = entry;

    updateAppStatus(app_desc.display);
}

function killProcess(appName) {
    processes[appName].childProcess.kill();
    delete processes[appName];
}

ipcMain.on('toggleApp', (_event, app_desc) => {
    if(processes[app_desc.display] === undefined) {
        startProcess(app_desc);
    } else {
        killProcess(app_desc.display);
    }
})

const snesControls = require(path.join(__dirname, './snes_controller/controller.cjs'))

ipcMain.on('resetSnes', (_event) => {
    snesControls.reset();
});

ipcMain.on('resetSnesToMenu', (_event) => {
    snesControls.resetToMenu();
});