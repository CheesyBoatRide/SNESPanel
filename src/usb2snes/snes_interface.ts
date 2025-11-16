

import { BrowserWindow } from 'electron';
import WebSocket from 'ws';


let wsConnection: WebSocket | null;
let lastRequest: string = "";
let snesAddress: string = "";
let windows: BrowserWindow[] = [];
let connected = false;
let timerId: ReturnType<typeof setTimeout>; // Type for the timeout ID
let statusTimerId: ReturnType<typeof setTimeout>; // Type for the timeout ID

let messageQueue: Function[] = [];
let lastAddressRequested: string = "";
let lastAddressRequestedSize: number = 0;
let addressRequestInProgress: boolean = false;
let addressRequestResult: Uint8Array | null = null;

///////////////////////////////////////////////////////////
//////////////// Internal Functions ///////////////////////
///////////////////////////////////////////////////////////

function updateConnectionStatus() {
    clearTimeout(statusTimerId);
    for (let i = 0; i < windows.length; i++) {
        windows[i].webContents.send("snesConnectionStatus", connected);
    }
    statusTimerId = setTimeout(function () { updateConnectionStatus(); }, 1000);
}

function recievedDeviceList(msg: string) {
    if (connected) {
        return;
    }

    let device_list = JSON.parse(msg);
    let Results = device_list.Results;
    if (Results === undefined || Results.length == 0) {
        reconnect();
    } else if (wsConnection !== null) {
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

function concatenateUint8Arrays(arr1: Uint8Array, arr2: Uint8Array): Uint8Array {
    const totalLength = arr1.length + arr2.length;
    const result = new Uint8Array(totalLength);

    result.set(arr1, 0); // Copy arr1 starting at index 0
    result.set(arr2, arr1.length); // Copy arr2 starting after arr1

    return result;
}

function recievedAddress(msg: ArrayBuffer) {
    const byteArray = new Uint8Array(msg);
    addressRequestResult = concatenateUint8Arrays(addressRequestResult!, byteArray);

    if (addressRequestResult!.length >= lastAddressRequestedSize) {
        addressRequestInProgress = false;
        for (let i = 0; i < windows.length; i++) {
            windows[i].webContents.send("snesAddressValue", lastAddressRequested, addressRequestResult);
        }
    }
}

function decodeMsg(msg: string) {
    if (lastRequest === "DeviceList") {
        recievedDeviceList(msg)
    }
    lastRequest = "";
}

function reconnect() {
    snesDisconnect();
    updateConnectionStatus();
    timerId = setTimeout(function () { snesConnect(snesAddress); }, 1000);
}

function wsConnected() {

    if (wsConnection === null) {
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

function queueMessage(func: Function) {
    messageQueue.push(func);
    processQueue();
}

function processQueue() {
    if (addressRequestInProgress) {
        return;
    }
    if (messageQueue.length === 0) {
        return;
    }
    const func = messageQueue.shift();
    if (func) {
        func();
    }
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
        processQueue();
    };
}

export function snesDisconnect() {
    wsConnection?.terminate();
    wsConnection = null;
    connected = false;
}

export function snesReset() {
    queueMessage(() => {
        if (wsConnection === null || connected === false) {
            return;
        }

        let request = {
            Opcode: "Reset",
            Space: "SNES"
        };
        lastRequest = "Reset";
        wsConnection.send(JSON.stringify(request));
    });
}

export function snesResetToMenu() {
    queueMessage(() => {
        if (wsConnection === null || connected === false) {
            return;
        }

        let request = {
            Opcode: "Menu",
            Space: "SNES"
        };
        lastRequest = "Menu";
        wsConnection.send(JSON.stringify(request));
    });
}

export function snesRequestMemoryValue(address: string, offset: number) {
    queueMessage(() => {
        if (wsConnection === null || connected === false) {
            return;
        }

        let request = {
            Opcode: "GetAddress",
            Space: "SNES",
            Operands: [address, offset.toString(16)]
        };
        lastRequest = "GetAddress";
        wsConnection.send(JSON.stringify(request));

        addressRequestResult = new Uint8Array(0);
        addressRequestInProgress = true;
        lastAddressRequested = address;
        lastAddressRequestedSize = offset;
    });
}

export function snesSetMemoryValue(address: string, data: Uint8Array) {
    /*
    PutAddress [offset, size]
    The arguments work like GetAddress. 
    After sending the json request as text message, send your binary data as binary message(s). 
    Again with the original usb2snes server don't send more than 1024 bytes per binary message, send the data in chunks of 1024.
    */
    queueMessage(() => {
        if (wsConnection === null || connected === false) {
            return;
        }
        let request = {
            Opcode: "PutAddress",
            Space: "SNES",
            Operands: [address, JSON.stringify(data.length)]
        };
        lastRequest = "PutAddress";
        wsConnection.send(JSON.stringify(request));

        const dataChunkSize: number = 1024;
        for (let i = 0; i < data.length; i += dataChunkSize) {
            // Use subarray() to create a view of the portion of the data
            const chunk = data.subarray(i, i + dataChunkSize);
            wsConnection.send(chunk.buffer);
        }
    });


}