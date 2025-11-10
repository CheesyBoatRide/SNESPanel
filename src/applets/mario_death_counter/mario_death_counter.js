let pose_ram_address = "F513E0";
var pose_ram_size = 1;

let snes_connected = false;
let last_pose = 0x0;
let death_count = 0;

const default_background_color = window.getComputedStyle(document.body).getPropertyValue('background-color');
let background_color = default_background_color;
const death_background_color = "rgba(255, 0, 0, 0.5)";
const disconnected_background_color = "rgba(128, 128, 128, 0.5)";

const ipcRenderer = require('electron').ipcRenderer;

document.onkeydown = () => false; // no keyboard presses right now

function refreshValues() {
    if (snes_connected) {
        ipcRenderer.send("snesRequestMemoryValue", pose_ram_address, pose_ram_size);
    } else {
        console.error("Not connected");
    }
}

ipcRenderer.on('snesConnectionStatus', (_event, connected) => {

    let was_connected = snes_connected;
    snes_connected = connected;

    if(connected && !was_connected) {
        // Just connected, start refreshing values
        console.log("Connected to SNES, starting value refresh");
        refreshValues();
    }
    
    if(!snes_connected) {
        document.body.style.backgroundColor = disconnected_background_color;
    } else {
        document.body.style.backgroundColor = background_color;
    }
});

ipcRenderer.on('snesAddressValue', (_event, address, msg) => {
    if(address !== pose_ram_address) {
        return;
    }
    
    // we're detecting death by checking if Mario's pose changes to the death pose (red face and falling)

    const death_pose = 0x3E; // Mario's death pose value

    let pose = msg[0];
    if (last_pose !== pose) {
        if (pose === death_pose) {
            death_count++;
            let text = document.getElementById("death_text");
            text.textContent = "Deaths: " + death_count;
            document.body.style.backgroundColor = death_background_color;
            background_color = death_background_color;
        } else if (last_pose === death_pose) {
            document.body.style.backgroundColor = default_background_color;
            background_color = default_background_color;
        }
    }
    last_pose = pose;

    refreshValues();
})

