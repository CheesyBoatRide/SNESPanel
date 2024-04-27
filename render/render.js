var button_color = '#54585a';
var error_state = '#C1121C';
var running_state = '#007243';


const ipcRenderer = require('electron').ipcRenderer;

function resetSnes() {
    ipcRenderer.send("resetSnes");
}

function resetSnesToMenu() {
    ipcRenderer.send("resetSnesToMenu");
}

function toggleDynamicApp(app_desc) {
    ipcRenderer.send("toggleApp", app_desc);
}

ipcRenderer.on('setSNESControllerNotesBlurb', (_event, blurb) => {
  let pre = document.getElementById("SNESControllerNotesBlurb");
  pre.textContent = blurb;
});

ipcRenderer.on('initAppList', (_event, apps) => {
    for (const [key, value] of Object.entries(apps)) {
        let app_button = document.createElement("button");
        app_button.id = value.display + "_button";
        app_button.className = "appbutton";
        app_button.textContent = "Start " + value.display;
        app_button.style.backgroundColor = button_color;
        app_button.addEventListener("click", () => {
            toggleDynamicApp(value);
        });

        let drawer = document.getElementById("customAppDrawer");

        drawer.appendChild(app_button);
    }
})

ipcRenderer.on('updateAppStatus', (_event, app, running) => {
    let button = document.getElementById(app + "_button");
    if (running) {
        button.textContent = "Stop " + app;
        button.style.backgroundColor = running_state;
    } else {
        button.textContent = "Start " + app;
        button.style.backgroundColor = button_color;
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

        // refresh
        button.addEventListener("contextmenu", function () {
          embed.src = url;
        });
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

ipcRenderer.on('snesConnectionStatus', (_event, connected) => {
  let elements = document.querySelectorAll('.controlbutton');
  for(element of elements) {
    element.style.backgroundColor = connected ? button_color : error_state;
    element.disabled = !connected;
  }
});