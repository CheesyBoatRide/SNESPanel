
// https://smwc.me/m/smw/ram/7E0071
const player_animation_state_address = "F50071";
const death_animation_state_value = 0x09; // End level without activating overworld events. (Dying)
let death_animation_state_detected = false;

// https://smwc.me/m/smw/ram/7E13E0
const mario_pose_address = "F513E0";
const death_pose = 0x3E; // Mario's death pose value
let death_pose_detected = false;

const ram_address_size = 1; // both addresses are 1 byte

let snes_connected = false;
let death_count = 0;
let player_was_previously_dead = false;

const default_background_color = window.getComputedStyle(document.body).getPropertyValue('background-color');
let background_color = default_background_color;
const death_background_color = "#ff3939";
const disconnected_background_color = "rgba(128, 128, 128, 0.5)";

const ipcRenderer = require('electron').ipcRenderer;

function updatePoseValue() {
    if(snes_connected)
    {
        ipcRenderer.send("snesRequestMemoryValue", mario_pose_address, ram_address_size);
    }
}

function updateAnimationValue() {
    if(snes_connected)
    {
        ipcRenderer.send("snesRequestMemoryValue", player_animation_state_address, ram_address_size);
    }
}
  
ipcRenderer.on('snesConnectionStatus', (_event, connected) => {

    let was_connected = snes_connected;
    snes_connected = connected;

    if(connected && !was_connected) {
        // Just connected, start refreshing values
        console.log("Connected to SNES, starting value refresh");
        updatePoseValue();
        updateAnimationValue();
    }
    
    if(!snes_connected) {
        document.body.style.backgroundColor = disconnected_background_color;
    } else {
        document.body.style.backgroundColor = background_color;
    }
});

// Listen for memory value responses
// Here we decide if the player is dead based on two different values.  This is because
// for some hacks with very fast retry, one or more of these states may only be set for a single frame.
// So by checking both we increase the chances of detecting a death.  Set update rate to 10ms to esure we don't miss a frame,
// while avoiding overloading the USB2SNES with requests.
ipcRenderer.on('snesAddressValue', (_event, address, msg) => {
    let player_is_dead = false;

    if(address === player_animation_state_address) {
        death_animation_state_detected = (msg[0] === death_animation_state_value);
        setTimeout(function () { updateAnimationValue(); }, 10);
    } else if(address === mario_pose_address) {
        death_pose_detected = (msg[0] === death_pose);
        setTimeout(function () { updatePoseValue(); }, 10);
    } else {
        return;
    }

    player_is_dead = death_animation_state_detected || death_pose_detected;

    if(player_is_dead && !player_was_previously_dead) {
        death_count++;
        let text = document.getElementById("death_text");
        text.textContent = "Deaths: " + death_count;
        document.body.style.backgroundColor = death_background_color;
        background_color = death_background_color;
    } else if(!player_is_dead && player_was_previously_dead) {
        document.body.style.backgroundColor = default_background_color;
        background_color = default_background_color;
    }
    player_was_previously_dead = player_is_dead;
});

const myDialog = document.getElementById('myDialog');
document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    myDialog.showModal();
    const submitButton = document.getElementById('submitNumber');

    myDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default browser behavior (e.g., newline in textareas)
        submitButton.click(); // Programmatically click the submit button
        }
    });

    submitButton.onclick = function () {
        const input = document.getElementById('numberInput');
        const value = parseInt(input.value, 10);
        if (!isNaN(value) && value >= 0) {
            death_count = value;
            let text = document.getElementById("death_text");
            text.textContent = "Deaths: " + death_count;
        }
        myDialog.close();
    };

    const cancelButton = document.getElementById('cancelDialog');
    cancelButton.onclick = function () {
        myDialog.close();
    };

    const resetButton = document.getElementById('resetButton');
    resetButton.addEventListener('click', function () {
        death_count = 0;
        let text = document.getElementById("death_text");
        text.textContent = "Deaths: " + death_count;
        myDialog.close();
    });

});


