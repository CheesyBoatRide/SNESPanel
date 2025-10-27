

import { BrowserWindow } from 'electron';
import WebSocket from 'ws';


let wsConnection: WebSocket | null;
let lastRequest: string = "";
let snesAddress: string = "";
let windows: BrowserWindow[] = [];
let connected = false;
let timerId: ReturnType<typeof setTimeout>; // Type for the timeout ID

function updateConnectionStatus() {
    for (let i = 0; i < windows.length; i++) {
        windows[i].webContents.send("snesConnectionStatus", connected);
    }
}

function recievedDeviceList(msg: string) {
    if(connected) {
        return;
    }

    let device_list = JSON.parse(msg);
    let Results = device_list.Results;
    if (Results === undefined || Results.length == 0) {
        reconnect();
    } else if(wsConnection !== null) {
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
            updateConnectionStatus();
        }
    }
}

function recievedAddress(msg: ArrayBuffer) {
    for (let i = 0; i < windows.length; i++) {
        windows[i].webContents.send("receiveSnesAddress", Buffer.from(msg));
    }
}

function decodeMsg(msg: string) {
    if (lastRequest === "DeviceList") {
        recievedDeviceList(msg)
    }
    lastRequest = "";
}

function reconnect() {
    wsConnection?.terminate();
    wsConnection = null;
    connected = false;
    updateConnectionStatus();
    timerId = setTimeout(function () { snesConnect(snesAddress); }, 1000);
}

function wsConnected() {

    if( wsConnection === null) {
        return;
    }

    console.log('WebSocket Client Connected');

    let device_list = {
        Opcode: "DeviceList",
        Space: "SNES"
    };
    lastRequest = "DeviceList";
    console.log(JSON.stringify(device_list));
    wsConnection.send(JSON.stringify(device_list));
}

///////////////////////////////////////////////////////////
//////////////// Exports //////////////////////////////////
///////////////////////////////////////////////////////////

export function snesAddWindow(window: BrowserWindow) {
    windows.push(window);
}

export function snesRemoveWindow(window: BrowserWindow) {
    const index = windows.indexOf(window);
    if (index > -1) {
        windows.splice(index, 1);
    }
}

export function snesConnect(address: string) {
    if (wsConnection !== null) {
        console.error("Dangling websocket client");
    }
    
    clearTimeout(timerId);

    snesAddress = address;
    wsConnection = new WebSocket(address);
    wsConnection.binaryType = 'arraybuffer';

    wsConnection.onopen = function () {
        wsConnected();
    };

    wsConnection.onclose = function (event) {
        console.log('ws is closed with code: ' + event.code + ' reason: ' + event.reason);
        reconnect();
    };

    wsConnection.onerror = function (error) {
        console.log("Connection Error: " + error);
        reconnect();
    };

    wsConnection.onmessage = function (event: WebSocket.MessageEvent) {
        if (event.data instanceof ArrayBuffer) {
            if (lastRequest === "GetAddress") {
                recievedAddress(event.data)
            }
        } else {
            try {
                const parsedMessage = event.data as string;
                console.log('Parsed JSON message:', parsedMessage);
                decodeMsg(parsedMessage);
            } catch (e) {
                console.log('Received non-JSON message:', event.data);
            }
        }
    };
}

export function snesReset() {
    if(wsConnection === null || connected === false) {
        return;
    }

    let request = {
        Opcode: "Reset",
        Space: "SNES"
    };
    lastRequest = "Reset";
    wsConnection.send(JSON.stringify(request));
}

export function snesResetToMenu() {
    if(wsConnection === null || connected === false) {
        return;
    }

    let request = {
        Opcode: "Menu",
        Space: "SNES"
    };
    lastRequest = "Menu";
    wsConnection.send(JSON.stringify(request));
}

export function snesRequestMemoryValue(address: string, offset: number) {
    if(wsConnection === null || connected === false) {
        return;
    }

    let request = {
        Opcode: "GetAddress",
        Space: "SNES",
        Operands: [address, JSON.stringify(offset)]
    };
    lastRequest = "GetAddress";
    wsConnection.send(JSON.stringify(request));
}
