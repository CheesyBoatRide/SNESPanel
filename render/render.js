

const ipcRenderer = require('electron').ipcRenderer;

const startSNI = () => {
    ipcRenderer.send("startSNI");
} 

ipcRenderer.on('startedSNI', () => {
    document.getElementById("startSNIButton").textContent="Stop SNI";
})