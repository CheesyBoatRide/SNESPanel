const { app, BrowserWindow, Menu, ipcMain } = require('electron')
// include the Node.js 'path' module at the top of your file
const path = require('node:path')

const isDev = process.env.NODE_ENV !== 'production'

let win = null;

function checkForSNI() {
    var ps = require('ps-node');
    
    // A simple pid lookup 
    ps.lookup({
        command: 'node',
        psargs: 'ux'
    }, function (err, resultList) {
        if (err) {
            throw new Error(err);
        }

        resultList.forEach(function (process) {
            if (process) {
                console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
                win.webContents.send("startedSNI");
            }
        });
    });
}

const createWindow = () => {
    win = new BrowserWindow({
        title: 'SNES Control Panel',
        width: 1080,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // open devtools in dev
    if (isDev) {
        win.webContents.openDevTools();
    }

    checkForSNI();
    win.loadFile(path.join(__dirname, './render/index.html'))
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
    createWindow()

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    })
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('startSNI', (event, data) => {
    // start SNI
    checkForSNI();
})