

const ipcRenderer = require('electron').ipcRenderer;

const startSNI = () => {
    ipcRenderer.send("startSNI");
} 

ipcRenderer.on('startedSNI', () => {
    alert("Started SNI");
})