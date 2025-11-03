var pose_ram_address = "F513E0"
var pose_ram_size = 1


var snes_connected = false;
var last_pose = 0x0;
var death_count = 0;

const ipcRenderer = require('electron').ipcRenderer;

document.onkeydown = () => false; // no keyboard presses right now

function refreshValues() {
    if(snes_connected) {
        ipcRenderer.send("snesRequestMemoryValue", pose_ram_address, pose_ram_size);
    } else {
        console.error("Not connected");
    }
    
    setTimeout(function () { refreshValues(); }, 16);
}

refreshValues();

ipcRenderer.on('snesConnectionStatus', (_event, connected) => {
    snes_connected = connected;
});

ipcRenderer.on('snesAddressValue', (_event, address, msg) => {
    let pose = msg[0];
    if (last_pose !== pose && pose === 0x3E) {
        death_count++;
        let text = document.getElementById("death_text");
        text.textContent = "Deaths: " + death_count;
    }
    last_pose = pose;
})

