const { app, BrowserWindow, Menu, ipcMain } = require('electron')
// include the Node.js 'path' module at the top of your file
const path = require('node:path')

const isDev = process.env.NODE_ENV !== 'production'

const fs = require('node:fs');
let configData = null;

let mainWindow = null;
let funtoonWindow = null;
let inputViewerWindow = null;

let sniInstance = null;

function updateSNIStatus() {
    if(sniInstance === null) {
        mainWindow.webContents.send("sniNotRunning");
    } else if(sniInstance.pid === undefined) {
        mainWindow.webContents.send("sniError");
    } else {
        mainWindow.webContents.send("sniRunning");
    }
}

function loadSettings() {
    var toml = require('toml');
    fs.readFile(path.join(__dirname, 'config.toml'), 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        configData = toml.parse(data);
    });
}

function startSNI() {
    const { spawn } = require('child_process');
    sniInstance = spawn(configData.apps.SNI);
}

function killSNI() {
    sniInstance.kill()
    sniInstance = null;
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

    loadSettings();
    
    updateSNIStatus();
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

ipcMain.on('toggleSNI', (event, data) => {
    // start SNI
    if(sniInstance === null) {
        startSNI();
    } else {
        killSNI();
    }

    updateSNIStatus();
})

function createInputViewerWindow() {
    mainWindow = new BrowserWindow({
        title: 'SNES Input Viewer',
        width: 300,
        height: 150,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, './render/inputviewer.html'));
}

ipcMain.on('openTracker', (event, data) => {

})

ipcMain.on('openFuntoon', (event, data) => {
    if(funtoonWindow === null) {
        funtoonWindow = new BrowserWindow({
            title: 'Funtoon',
            width: 800,
            height: 600
        });
    
        funtoonWindow.loadURL('https://funtoon.party/qusb/');
    }
})