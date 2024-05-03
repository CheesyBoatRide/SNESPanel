const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('node:path')

const fs = require('node:fs');

let configData = null;
let mainWindow = null;

function loadSettings() {
    
    mainWindow.webContents.send("snesConnectionStatus", false);

    var toml = require('toml');

    let configFile = './config.toml';
    if(!fs.existsSync(configFile)) {
        configFile = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'config.toml');
    }

    if(!fs.existsSync(configFile)) {
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
            if(configData.apps[app_name].display === undefined) {
                configData.apps[app_name].display = app_name;
            }
            configData.apps[app_name].exists = fs.existsSync(configData.apps[app_name].cmd);
        }

        mainWindow.webContents.send("initAppList", configData.apps);
        mainWindow.webContents.send("initBrowserWindowList", configData.webpages);

        for(const app_name of Object.values(configData.start.apps)) {
            if(configData.apps[app_name] !== undefined && configData.apps[app_name].exists !== undefined && configData.apps[app_name].exists) {
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

    for (const proc of Object.values(processes)) {
        const { spawn } = require('child_process');
        let cmd = 'taskkill';
        let args = ['/pid', proc.childProcess.pid];

        spawn(cmd, args, {
            detached: true
          });
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
})

function updateAppStatus(app_desc) {
    if(app_desc.display in processes) {
        if(processes[app_desc.display].childProcess.pid === undefined || processes[app_desc.display].childProcess.exitCode !== null) {
            killProcess(app_desc.display);
        }
    }

    let status = 'error';
    if( app_desc.display in processes) {
        status = 'running';
    } else if(app_desc.exists) {
        status = 'stopped';
    }

    mainWindow.webContents.send("updateAppStatus", app_desc.display, status)
}

function startProcess(app_desc) {
    const { spawn } = require('child_process');

    let working_dir = app_desc.working_directory !== undefined ? app_desc.working_directory :
        require('path').dirname(app_desc.cmd);
    let env = app_desc.env !== undefined ? app_desc.env : "";
    let args = app_desc.args !== undefined ? app_desc.args : [];

    console.log(app_desc.cmd);
    console.log(args);

    let child_process = spawn(app_desc.cmd, args, {
        cwd: working_dir,
        env: {...env, ...process.env},
        stdio: 'inherit',
        detached: true
      });
    child_process.on('exit', () => {
        delete processes[app_desc.display];
        updateAppStatus(app_desc);
    });

    let entry = {
        childProcess: child_process
    };

    processes[app_desc.display] = entry;

    updateAppStatus(app_desc);
}

function killProcess(appName) {
    if(process.platform === "win32") {
        const { spawn } = require('child_process');

        let cmd = 'taskkill';
        let args = ['/pid', processes[appName].childProcess.pid, '/t'];

        spawn(cmd, args, {
            detached: true
          });
    } else {
        processes[appName].childProcess.kill();
    }

}

ipcMain.on('toggleApp', (_event, app_desc) => {
    if(processes[app_desc.display] === undefined) {
        startProcess(app_desc);
    } else {
        killProcess(app_desc.display);
    }
})

const snesControls = require('./snes_controller/controller.cjs')

ipcMain.on('resetSnes', (_event) => {
    snesControls.reset();
});

ipcMain.on('resetSnesToMenu', (_event) => {
    snesControls.resetToMenu();
});