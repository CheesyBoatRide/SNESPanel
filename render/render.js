

const ipcRenderer = require('electron').ipcRenderer;

function connectToSnes() {
    ipcRenderer.send("connectToSnes");
}

function resetSnes() {
    ipcRenderer.send("resetSnes");
}

function resetSnesToMenu() {
    ipcRenderer.send("resetSnesToMenu");
}

function toggleDynamicApp(app, cmd) {
    ipcRenderer.send("toggleApp", app, cmd);
}

ipcRenderer.on('initAppList', (_event, apps) => {
    for (const [key, value] of Object.entries(apps)) {
        let app_button = document.createElement("button");
        app_button.id = key + "_button";
        app_button.className = "appbutton";
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

ipcRenderer.on('initBrowserWindowList', (_event, pages) => {
    for (const [name, url] of Object.entries(pages)) {
        let button = document.createElement("button");
        button.className = 'collapsible';
        button.textContent = name;
        let div = document.createElement("div");
        div.className = 'content';
        let embed = document.createElement("EMBED");
        embed.width = "100%";
        embed.height = "600px";
        embed.src = url;
        embed.console = function() {};
        div.appendChild(embed);
        document.body.appendChild(button);
        document.body.appendChild(div);
    }

    var coll = document.getElementsByClassName("collapsible");
    var i;

    for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = "100%";
            }
        });
    }
})

