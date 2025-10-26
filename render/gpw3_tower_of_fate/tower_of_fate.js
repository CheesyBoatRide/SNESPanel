var room_data_ram_address = "F6B600"
var room_data_ram_size = 104
var current_room_digits_offset = 256
var current_room_digits = 1;
var current_room_digit_one_offset = 257
var current_room_digit_one = 0;
var current_room_digit_two_offset = 259
var current_room_digit_two = 0;

var snes_connected = false;
var room_pb = 0;
var last_current_count = 0;
var last_ten_rooms = [];

const ipcRenderer = require('electron').ipcRenderer;

document.onkeydown = () => false; // no keyboard presses right now

function refreshValues() {
    if(snes_connected) {
        ipcRenderer.send("snesGetAddress", room_data_ram_address, room_data_ram_size);
    }
    
    setTimeout(function () { refreshValues(); }, 100);
}

refreshValues();

ipcRenderer.on('snesConnectionStatus', (_event, connected) => {
    snes_connected = connected;
});

ipcRenderer.on('receiveSnesAddress', (_event, msg) => {

    var current_count = 0;
    var num_digits = msg[current_room_digits_offset];
    if(num_digits > 1) {
        var current_count_tens = msg[current_room_digit_one_offset];
        current_count = msg[current_room_digit_two_offset];
        current_count = current_count + ((current_count_tens) * 10);
    } else {
        current_count = msg[current_room_digit_one_offset];
    }
    if(current_count > 81) {
        current_count = 0;
    }

    if(last_current_count !== current_count && last_current_count !== 0 && current_count === 1) {
        last_ten_rooms.push(last_current_count-1);
        if(last_ten_rooms.length > 10) {
            last_ten_rooms.shift();
        }
        let room_avg = 0;
        for(let i = 0; i < last_ten_rooms.length; ++i) {
            room_avg += last_ten_rooms[i];
        }
        room_avg = room_avg / last_ten_rooms.length;
        let avg_text = document.getElementById("avg_text");
        avg_text.textContent = "Avg (Last " + last_ten_rooms.length + " Runs): " + room_avg.toFixed(2);
    }
    last_current_count = current_count;

    let text = document.getElementById("current_text");
    text.textContent = "Current Room: " + current_count;

    if(current_count > room_pb) {
        let text = document.getElementById("pb_text");
        text.textContent = "PB: " + (current_count-1);
        room_pb = current_count;
    }

    var address = 0;
    var rooms_needed = 0;
    while (true) {
        var room = msg[address];
        if(room === 0x6E || room === 0x6F) {
            break;
        }
        if(rooms_needed > 82) {
            break;
        }
        ++rooms_needed;
        address = address + 1;
    }

    let rooms_needed_text = document.getElementById("rooms_needed_text");
    if(rooms_needed < 82) {
        rooms_needed_text.textContent = "Rooms Needed: " + rooms_needed;
    } else {
        rooms_needed_text.textContent = "Rooms Needed: Invalid";
    }
})

