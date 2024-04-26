

var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();
var wsConnection = {};

var lastRequest = "";

var snesAddress = "";

var mainWindow = undefined;

function init(window) {
    mainWindow = window;
}

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
    reconnect();
});

function recievedDeviceList(msg) {
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

            mainWindow.webContents.send("snesConnectionStatus", true);
        }
    }
}

function decodeMsg(msg) {
    if (lastRequest == "DeviceList") {
        recievedDeviceList(msg)
    }
    lastRequest = "";
}

function reconnect() {
    mainWindow.webContents.send("snesConnectionStatus", false);
    setTimeout(function () { snesConnect(snesAddress); }, 1000);
}

client.on('connect', function (connection) {

    console.log('WebSocket Client Connected');

    wsConnection = connection;

    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
        reconnect();
    });

    connection.on('close', function () {
        console.log('echo-protocol Connection Closed');
        reconnect();
    });

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            decodeMsg(JSON.parse(message.utf8Data));
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

module.exports = {
    init: init,
    connect: snesConnect,
    reset: snesReset,
    resetToMenu: snesResetToMenu
}