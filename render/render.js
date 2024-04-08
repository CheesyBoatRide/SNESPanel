

const ipcRenderer = require('electron').ipcRenderer;

const toggleSNI = () => {
    ipcRenderer.send("toggleSNI");
};

const startTracker = () => {
};

const startInputViewer = () => {
};

const openFuntoon = () => {
    ipcRenderer.send("openFuntoon");
};

ipcRenderer.on('sniRunning', () => {
    let button = document.getElementById("toggleSNIButton");
    button.textContent = "Stop SNI";
    button.style.backgroundColor = '#000000';}
);

ipcRenderer.on('sniNotRunning', () => {
    let button = document.getElementById("toggleSNIButton");
    button.textContent = "Start SNI";
    button.style.backgroundColor = '#000000';
});

ipcRenderer.on('sniError', () => {
    let button = document.getElementById("toggleSNIButton");
    button.textContent = "SNI Failed :(";
    button.style.backgroundColor = '#444444';
});