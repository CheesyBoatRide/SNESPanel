let snes_connected = false;

const resource_addr = "F509C2";
const resource_size = 16;

const items_addr = "F509A2";
const items_size = 4;
let items_equipped = 0;
let items_collected = 0;

const FLAG_VARIA = 0x01;
const FLAG_SPRING_BALL = 0x02;
const FLAG_MORPH = 0x04;
const FLAG_SCREW_ATTACK = 0x08;
const FLAG_GRAVITY = 0x20;
const FLAG_HI_JUMP = 0x100;
const FLAG_SPACE_JUMP = 0x200;
const FLAG_BOMBS = 0x1000;
const FLAG_SPEED_BOOSTER = 0x2000;
const FLAG_GRAPPLE_BEAM = 0x4000;
const FLAG_XRAY_SCOPE = 0x8000;


const ipcRenderer = require('electron').ipcRenderer;

document.onkeydown = (event) => {
    if (event.key == "F5") {
        location.reload();
    }
    return false; // no keyboard presses right now
}

function refreshValues() {
    if (snes_connected) {
        refreshResources();
        refreshItems();
    }

    setTimeout(function () { refreshValues(); }, 100);
}

refreshValues();

ipcRenderer.on('snesConnectionStatus', (_event, connected) => {
    snes_connected = connected;
});

ipcRenderer.on('snesAddressValue', (_event, address, msg) => {
    if (address == resource_addr) {
        updateResources(msg);
    } else if (address == items_addr) {
        updateItems(msg);
    }
});

function giveBlueSuit() {
    const blue_suit_addr = "F50B3F";
    const blue_suit_value = 0x04;
    if (snes_connected) {
        let msg = new Uint8Array([blue_suit_value]);
        ipcRenderer.send("snesSetMemoryValue", blue_suit_addr, msg);
    }
}

function giveSpikeSuit() {
    const spike_suit_addr = "F50A68";
    const spike_suit_value = 0x01;
    if (snes_connected) {
        let msg = new Uint8Array([spike_suit_value]);
        ipcRenderer.send("snesSetMemoryValue", spike_suit_addr, msg);
    }
}

function refreshResources() {
    if (snes_connected) {
        ipcRenderer.send("snesRequestMemoryValue", resource_addr, resource_size);
    }
}

function bytesToNumber16(low, high) {
    return (high << 8) | low;
}

function updateResources(msg) {
    let offset = 0;
    let energy = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let energy_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let missiles = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let missiles_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let super_missiles = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let super_missiles_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let power_bombs = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let power_bombs_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;

    document.getElementById("energy_count").value = energy;
    document.getElementById("missile_count").value = missiles;
    document.getElementById("super_missile_count").value = super_missiles;
    document.getElementById("power_bomb_count").value = power_bombs;
}


function refreshItems() {
    if (snes_connected) {
        ipcRenderer.send("snesRequestMemoryValue", items_addr, items_size);
    }
}

function updateTriStateCheckbox(elementId, equipped, collected) {
    const element = document.getElementById(elementId);
    if (equipped) {
        element.checked = true;
        element.indeterminate = false;
    } else if (collected) {
        element.checked = false;
        element.indeterminate = true;
    } else {
        element.checked = false;
        element.indeterminate = false;
    }
}

function updateItems(msg) {

    let offset = 0;
    items_equipped = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    items_collected = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;

    let varia_equipped = (items_equipped & FLAG_VARIA) ? 1 : 0;
    let gravity_equipped = (items_equipped & FLAG_GRAVITY) ? 1 : 0;
    let morph_equipped = (items_equipped & FLAG_MORPH) ? 1 : 0;
    let bombs_equipped = (items_equipped & FLAG_BOMBS) ? 1 : 0;
    let spring_ball_equipped = (items_equipped & FLAG_SPRING_BALL) ? 1 : 0;
    let screw_attack_equipped = (items_equipped & FLAG_SCREW_ATTACK) ? 1 : 0;
    let hi_jump_equipped = (items_equipped & FLAG_HI_JUMP) ? 1 : 0;
    let space_jump_equipped = (items_equipped & FLAG_SPACE_JUMP) ? 1 : 0;
    let speed_booster_equipped = (items_equipped & FLAG_SPEED_BOOSTER) ? 1 : 0;
    let grapple_equipped = (items_equipped & FLAG_GRAPPLE_BEAM) ? 1 : 0;
    let xray_equipped = (items_equipped & FLAG_XRAY_SCOPE) ? 1 : 0;

    let varia_collected = (items_collected & FLAG_VARIA) ? 1 : 0;
    let gravity_collected = (items_collected & FLAG_GRAVITY) ? 1 : 0;
    let morph_collected = (items_collected & FLAG_MORPH) ? 1 : 0;
    let bombs_collected = (items_collected & FLAG_BOMBS) ? 1 : 0;
    let spring_ball_collected = (items_collected & FLAG_SPRING_BALL) ? 1 : 0;
    let screw_attack_collected = (items_collected & FLAG_SCREW_ATTACK) ? 1 : 0;
    let hi_jump_collected = (items_collected & FLAG_HI_JUMP) ? 1 : 0;
    let space_jump_collected = (items_collected & FLAG_SPACE_JUMP) ? 1 : 0;
    let speed_booster_collected = (items_collected & FLAG_SPEED_BOOSTER) ? 1 : 0;
    let grapple_collected = (items_collected & FLAG_GRAPPLE_BEAM) ? 1 : 0;
    let xray_collected = (items_collected & FLAG_XRAY_SCOPE) ? 1 : 0;

    updateTriStateCheckbox("varia", varia_equipped, varia_collected);
    updateTriStateCheckbox("gravity", gravity_equipped, gravity_collected);
    updateTriStateCheckbox("morph", morph_equipped, morph_collected);
    updateTriStateCheckbox("bombs", bombs_equipped, bombs_collected);
    updateTriStateCheckbox("spring_ball", spring_ball_equipped, spring_ball_collected);
    updateTriStateCheckbox("screw_attack", screw_attack_equipped, screw_attack_collected);
    updateTriStateCheckbox("hi_jump", hi_jump_equipped, hi_jump_collected);
    updateTriStateCheckbox("space_jump", space_jump_equipped, space_jump_collected);
    updateTriStateCheckbox("speed_booster", speed_booster_equipped, speed_booster_collected);
    updateTriStateCheckbox("grapple", grapple_equipped, grapple_collected);
    updateTriStateCheckbox("x_ray", xray_equipped, xray_collected);

}

function setItemState(checkbox) {
    let flag = 0;
    switch (checkbox.id) {
        case "varia":
            flag = FLAG_VARIA;
            break;
        case "gravity":
            flag = FLAG_GRAVITY;
            break;
        case "morph":
            flag = FLAG_MORPH;
            break;
        case "bombs":
            flag = FLAG_BOMBS;
            break;
        case "spring_ball":
            flag = FLAG_SPRING_BALL;
            break;
        case "screw_attack":
            flag = FLAG_SCREW_ATTACK;
            break;
        case "hi_jump":
            flag = FLAG_HI_JUMP;
            break;
        case "space_jump":
            flag = FLAG_SPACE_JUMP;
            break;
        case "speed_booster":
            flag = FLAG_SPEED_BOOSTER;
            break;
        case "grapple":
            flag = FLAG_GRAPPLE_BEAM;
            break;
        case "x_ray":
            flag = FLAG_XRAY_SCOPE;
            break;
        default:
            console.error("Unknown checkbox id: " + checkbox.id);
            return;
    }
    if (checkbox.indeterminate) {
        // Currently collected, not equipped -> equip it
        items_equipped |= flag;
    } else if (checkbox.checked) {
        // Currently equipped -> remove both equipped and collected
        items_equipped &= ~flag;
        items_collected &= ~flag;
    } else {
        // Currently not collected -> collect and equip it
        items_collected |= flag;
        items_equipped |= flag;
    }
    // Send updated values to SNES
    if (snes_connected) {
        let msg = new Uint8Array(4);
        msg[0] = items_equipped & 0xFF;
        msg[1] = (items_equipped >> 8) & 0xFF;
        msg[2] = items_collected & 0xFF;
        msg[3] = (items_collected >> 8) & 0xFF;
        ipcRenderer.send("snesSetMemoryValue", items_addr, msg);
    }

}

const childCheckboxes = document.getElementsByClassName("triStateCheck_Item");
for (let i = 0; i < childCheckboxes.length; i++) {
    childCheckboxes[i].addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default checkbox toggle behavior     
        const checkbox = event.target;
        setItemState(checkbox);
    });
}
