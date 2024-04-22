

const ipcRenderer = require('electron').ipcRenderer;


function toggleDynamicApp(app, cmd) {
    ipcRenderer.send("toggleApp", app, cmd);
}

ipcRenderer.on('initAppList', (_event, apps) => {
    console.log(apps);
    for(const [key, value] of Object.entries(apps)) {
        let app_button = document.createElement("button");
        app_button.id = key + "_button";
        app_button.textContent = "Start " + key;
        app_button.style.backgroundColor = '#000000'
        app_button.addEventListener("click", () => {
            toggleDynamicApp(key, value);
        });
        document.body.appendChild(app_button);
    }
})

ipcRenderer.on('updateAppStatus', (_event, app, running) => {
    let button = document.getElementById(app + "_button");
    if (running) {
        button.textContent = "Stop " + app;
    } else {
        button.textContent = "Start " + app;
    }
})

