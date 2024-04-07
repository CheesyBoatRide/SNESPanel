const { app, BrowserWindow, Menu, ipcMain } = require('electron')
// include the Node.js 'path' module at the top of your file
const path = require('node:path')

const isDev = process.env.NODE_ENV !== 'production'

let win = null;

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
    win.webContents.send("startedSNI");
})