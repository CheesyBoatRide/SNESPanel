

var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();
var wsConnection = {};

var lastRequest = "";

var snesAddress = "";

var windows = [];

var connected = false;

function addWindow(window) {
    windows.push(window);
}

function removeWindow(window) {
    const index = windows.indexOf(window);
    if (index > -1) {
        windows.splice(index, 1);
    }
}

function updateConnectionStatus() {
    for (let i = 0; i < windows.length; i++) {
        windows[i].webContents.send("snesConnectionStatus", connected);
    }
    setTimeout(function () { updateConnectionStatus(); }, 1000);
}

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
    reconnect();
});

function recievedDeviceList(msg) {
    if(connected) {
        return;
    }

    let Results = msg.Results;
    if (Results === undefined || Results.length == 0) {
        reconnect();
    } else {
        for (const result of Results) {
            // for now just do the first one
            let attach_to_device = {
                Opcode: "Attach",
                Space: "SNES",
                Operands: [result]
            };
            lastRequest = "Attach";
            console.log(JSON.stringify(attach_to_device));
            wsConnection.send(JSON.stringify(attach_to_device));
            connected = true;
        }
    }
}

function recievedAddress(msg) {
    for (let i = 0; i < windows.length; i++) {
        windows[i].webContents.send("receiveSnesAddress", msg);
    }
}

function decodeMsg(msg) {
    if (lastRequest === "DeviceList") {
        recievedDeviceList(msg)
    }
    lastRequest = "";
}

function reconnect() {
    connected = false;
    setTimeout(function () { snesConnect(snesAddress); }, 1000);
}

client.on('connect', function (connection) {

    console.log('WebSocket Client Connected');

    wsConnection = connection;

    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
        reconnect();
    });

    connection.on('close', function (code, reason) {
        console.log('ws is closed with code: ' + code + ' reason: ' + reason);
        reconnect();
    });

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            decodeMsg(JSON.parse(message.utf8Data));
        } else {
            // memory data
            //console.log("Received: '" + message.binaryData + "'");
            if(lastRequest === "GetAddress") {
                recievedAddress(message.binaryData)
            }
        }
    });



    let device_list = {
        Opcode: "DeviceList",
        Space: "SNES"
    };
    lastRequest = "DeviceList";
    console.log(JSON.stringify(device_list));
    connection.send(JSON.stringify(device_list));
});

function snesConnect(address) {
    snesAddress = address;
    client.connect(address);
    updateConnectionStatus();
}

function snesReset() {
    let request = {
        Opcode: "Reset",
        Space: "SNES"
    };
    lastRequest = "Reset";
    wsConnection.send(JSON.stringify(request));
}

function snesResetToMenu() {
    let request = {
        Opcode: "Menu",
        Space: "SNES"
    };
    lastRequest = "Menu";
    wsConnection.send(JSON.stringify(request));
}

function snesRequestMemoryValue(address, offset) {
    let request = {
        Opcode: "GetAddress",
        Space: "SNES",
        Operands: [address, JSON.stringify(offset)]
    };
    lastRequest = "GetAddress";
    //console.log(JSON.stringify(request));
    wsConnection.send(JSON.stringify(request));
}

module.exports = {
    addWindow: addWindow,
    removeWindow: removeWindow,
    connect: snesConnect,
    reset: snesReset,
    resetToMenu: snesResetToMenu,
    requestMemoryValue: snesRequestMemoryValue
}