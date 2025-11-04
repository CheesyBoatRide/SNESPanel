let snes_connected = false;

const resource_addr = "F509C2";
const resource_size = 22;

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


const beams_addr = "F509A6";
const beams_size = 4;
let beams_equipped = 0;
let beams_collected = 0;

const FLAG_WAVE = 0x01;
const FLAG_ICE = 0x02;
const FLAG_SPAZER = 0x04;
const FLAG_PLASMA = 0x08;
const FLAG_CHARGE = 0x1000;

const ipcRenderer = require('electron').ipcRenderer;

document.onkeydown = (event) => {
    if (event.key == "F5") {
        location.reload();
    }
}

function refreshValues() {
    if (snes_connected) {
        refreshResources();
        refreshItems();
        refreshBeams();
    } else {
        setTimeout(function () { refreshValues(); }, 100);
    }
}

refreshValues();

ipcRenderer.on('snesConnectionStatus', (_event, connected) => {
    if(connected && !snes_connected) {
        // Just connected, start refreshing values
        refreshValues();
    }
    snes_connected = connected;
});

ipcRenderer.on('snesAddressValue', (_event, address, msg) => {
    if (address == resource_addr) {
        updateResources(msg);
    } else if (address == items_addr) {
        updateItems(msg);
    } else if (address == beams_addr) {
        updateBeams(msg);
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

    setTimeout(function () { refreshItems(); }, 100);
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

    let equipped = items_equipped & 0xFFFF;
    let collected = items_collected & 0xFFFF;

    let equipped_now = (equipped & flag) ? 1 : 0;
    let collected_now = (collected & flag) ? 1 : 0;

    if(equipped_now && !collected_now) {
        console.error("Inconsistent state: item is equipped but not collected");
        return;
    } else if (!equipped_now && collected_now) {
        // Currently collected, not equipped -> equip it
        equipped = (equipped | flag) & 0xFFFF;
    } else if (equipped_now && collected_now) {
        // Currently equipped -> remove both equipped and collected
        equipped = (equipped & ~flag) & 0xFFFF;
        collected = (collected & ~flag) & 0xFFFF;
    } else {
        // Currently not collected -> collect it and equip it
        equipped = (equipped | flag) & 0xFFFF;
        collected = (collected | flag) & 0xFFFF;
    }

    // Send updated values to SNES
    if (snes_connected) {
        let msg = new Uint8Array(4);
        msg[0] = equipped & 0xFF;
        msg[1] = (equipped >> 8) & 0xFF;
        msg[2] = collected & 0xFF;
        msg[3] = (collected >> 8) & 0xFF;
        ipcRenderer.send("snesSetMemoryValue", items_addr, msg);
    }

}

const childItemCheckboxes = document.getElementsByClassName("triStateCheck_Item");
for (let i = 0; i < childItemCheckboxes.length; i++) {
    childItemCheckboxes[i].addEventListener('click', (event) => {
        const checkbox = event.target;
        setItemState(checkbox);
        event.preventDefault(); // Prevent the default checkbox toggle behavior     
    });
}


function refreshBeams() {
    if (snes_connected) {
        ipcRenderer.send("snesRequestMemoryValue", beams_addr, beams_size);
    }
}

function updateBeams(msg) {

    let offset = 0;
    beams_equipped = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    beams_collected = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;

    let wave_equipped = (beams_equipped & FLAG_WAVE) ? 1 : 0;
    let ice_equipped = (beams_equipped & FLAG_ICE) ? 1 : 0;
    let spazer_equipped = (beams_equipped & FLAG_SPAZER) ? 1 : 0;
    let plasma_equipped = (beams_equipped & FLAG_PLASMA) ? 1 : 0;
    let charge_equipped = (beams_equipped & FLAG_CHARGE) ? 1 : 0;

    let wave_collected = (beams_collected & FLAG_WAVE) ? 1 : 0;
    let ice_collected = (beams_collected & FLAG_ICE) ? 1 : 0;
    let spazer_collected = (beams_collected & FLAG_SPAZER) ? 1 : 0;
    let plasma_collected = (beams_collected & FLAG_PLASMA) ? 1 : 0;
    let charge_collected = (beams_collected & FLAG_CHARGE) ? 1 : 0;

    updateTriStateCheckbox("charge", charge_equipped, charge_collected);
    updateTriStateCheckbox("spazer", spazer_equipped, spazer_collected);
    updateTriStateCheckbox("ice", ice_equipped, ice_collected);
    updateTriStateCheckbox("wave", wave_equipped, wave_collected);
    updateTriStateCheckbox("plasma", plasma_equipped, plasma_collected);

    setTimeout(function () { refreshBeams(); }, 100);
}

function setBeamState(checkbox) {
    let flag = 0;
    switch (checkbox.id) {
        case "charge":
            flag = FLAG_CHARGE; 
            break;
        case "spazer":
            flag = FLAG_SPAZER;
            break;
        case "ice":
            flag = FLAG_ICE;
            break;
        case "wave":
            flag = FLAG_WAVE;
            break;
        case "plasma":
            flag = FLAG_PLASMA; 
            break;
        default:
            console.error("Unknown checkbox id: " + checkbox.id);
            return;
    }

    let equipped = beams_equipped & 0xFFFF;
    let collected = beams_collected & 0xFFFF;

    let equipped_now = (equipped & flag) ? 1 : 0;
    let collected_now = (collected & flag) ? 1 : 0;

    if(equipped_now && !collected_now) {
        console.error("Inconsistent state: beam is equipped but not collected");
        return;
    } else if (!equipped_now && collected_now) {
        // Currently collected, not equipped -> equip it
        equipped = (equipped | flag) & 0xFFFF;
    } else if (equipped_now && collected_now) {
        // Currently equipped -> remove both equipped and collected
        equipped = (equipped & ~flag) & 0xFFFF;
        collected = (collected & ~flag) & 0xFFFF;
    } else {
        // Currently not collected -> collect it and equip it
        equipped = (equipped | flag) & 0xFFFF;
        collected = (collected | flag) & 0xFFFF;
    }

    // Send updated values to SNES
    if (snes_connected) {
        let msg = new Uint8Array(4);
        msg[0] = equipped & 0xFF;
        msg[1] = (equipped >> 8) & 0xFF;
        msg[2] = collected & 0xFF;
        msg[3] = (collected >> 8) & 0xFF;
        ipcRenderer.send("snesSetMemoryValue", beams_addr, msg);
    }

}

const childBeamCheckboxes = document.getElementsByClassName("triStateCheck_Beam");
for (let i = 0; i < childBeamCheckboxes.length; i++) {
    childBeamCheckboxes[i].addEventListener('click', (event) => {
        const checkbox = event.target;
        setBeamState(checkbox);
        event.preventDefault(); // Prevent the default checkbox toggle behavior     
    });
}

function refreshResources() {
    if (snes_connected) {
        ipcRenderer.send("snesRequestMemoryValue", resource_addr, resource_size);
    }
}

function bytesToNumber16(low, high) {
    return (high << 8) | low;
}

let userUpdatingResources = false;

function updateResources(msg) {
    if(userUpdatingResources) {
        setTimeout(function () { refreshResources(); }, 100);
        return;
    }

    let offset = 0;
    let energy = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let energy_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let missiles = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let missiles_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let super_missiles = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let super_missiles_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let power_bombs = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let power_bombs_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;

    offset += 2; // Skip HUD item index

    let reserves_max = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;
    let reserves = bytesToNumber16(msg[offset], msg[offset + 1]); offset += 2;


    document.getElementById("energy_count").value = energy;
    document.getElementById("missile_count").value = missiles;
    document.getElementById("super_missile_count").value = super_missiles;
    document.getElementById("power_bomb_count").value = power_bombs;
    document.getElementById("reserves_count").value = reserves;

    document.getElementById("energy_max").value = energy_max;
    document.getElementById("missile_max").value = missiles_max;
    document.getElementById("super_missile_max").value = super_missiles_max;
    document.getElementById("power_bomb_max").value = power_bombs_max;
    document.getElementById("reserves_max").value = reserves_max;

    setTimeout(function () { refreshResources(); }, 100);
}

function setResourceValue(id, value) {
    const addr_map = {
        "energy_count": "F509C2",
        "energy_max": "F509C4",
        "missile_count": "F509C6",
        "missile_max": "F509C8",
        "super_missile_count": "F509CA",
        "super_missile_max": "F509CC",
        "power_bomb_count": "F509CE",
        "power_bomb_max": "F509D0",
        "reserves_count": "F509D6",
        "reserves_max": "F509D4"
    };
    const addr = addr_map[id];
    if (snes_connected) {
        let int_value = value & 0xFFFF;
        let msg = new Uint8Array(2);
        msg[0] = int_value & 0xFF;
        msg[1] = (int_value >> 8) & 0xFF;
        ipcRenderer.send("snesSetMemoryValue", addr, msg);
    }
}

const childInputs = document.getElementsByClassName("resource_box");
for (let i = 0; i < childInputs.length; i++) {
    childInputs[i].addEventListener('change', (event) => {
        const input = event.target;
        setResourceValue(input.id, input.value);
    });
    childInputs[i].addEventListener('focus', () => {
        userUpdatingResources = true;
    });

    childInputs[i].addEventListener('blur', () => {
        userUpdatingResources = false;
        // Optional: Sync the value with the latest programmatic value here if needed
        // or trigger an action with the final user input.
    });
}