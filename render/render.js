

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

        let drawer = document.getElementById("customAppDrawer");

        drawer.appendChild(app_button);
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
        button.className = 'collapsible active';
        button.textContent = name;
        let section = document.createElement("section");
        section.className = 'content';
        let embed = document.createElement("EMBED");
        embed.width = "100%";
        embed.height = "600px";
        embed.src = url;
        embed.console = function() {};
        section.appendChild(embed);
        document.body.appendChild(button);
        document.body.appendChild(section);
    }

    const col = document.querySelectorAll(".collapsible");

    for (let c of col) {
      c.addEventListener("click", collapse);
    }
    
    function collapse(e) {
      this.classList.toggle("active");
      const content = this.nextElementSibling;
      content.classList.toggle('hide');
    }
    
    const all = document.querySelector(".all");
    
    all.addEventListener('click', collapseAll);
    
    function collapseAll(e) {
      const col = document.querySelectorAll('.collapsible');
      const con = document.querySelectorAll('.content');
    
      if (e.target.matches('.all')) {
        this.classList.toggle("active");
    
        col.forEach((button, index) => {
          if (e.target.matches('.active')) {
            button.classList.add('active');
            con[index].classList.remove('hide');
          } else {
            button.classList.remove('active');
            con[index].classList.add('hide');
          }
        });
      }
    }
})

