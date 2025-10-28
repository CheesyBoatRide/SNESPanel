var button_color = '#54585a';
var error_state = '#C1121C';
var running_state = '#007243';


const ipcRenderer = require('electron').ipcRenderer;

document.onkeydown = () => false; // no keyboard presses right now

function resetSnes() {
  ipcRenderer.send("resetSnes");
}

function resetSnesToMenu() {
  ipcRenderer.send("resetSnesToMenu");
}

function toggleDynamicApp(app) {
  ipcRenderer.send("toggleApp", app);
}

function toggleApplet(app) {
  ipcRenderer.send("toggleApplet", app);
}

function updateButtonStatus(text, status) {
  let button = document.getElementById(text + "_button");
  button.style.border = '0px solid #000'

  if (status === 'running') {
    button.textContent = text;
    button.style.backgroundColor = running_state;
    button.style.border = '4px solid #000'
  } else if (status === 'stopped' || status === undefined) {
    button.textContent = text;
    button.style.backgroundColor = button_color;
  } else if (status === 'error') {
    button.textContent = text + ' (Invalid)';
    button.style.backgroundColor = error_state;
    button.disabled = true;
  } else {
    // error
    console.log("Invalid app status");
  }
}

ipcRenderer.on('initAppList', (_event, apps) => {
  for (const app of apps) {
    let drawer = document.getElementById("customAppDrawer");
    let app_button = document.getElementById(app.name + "_button");
    if (app_button === undefined || app_button === null) {
      app_button = document.createElement("button");
      drawer.appendChild(app_button);
      app_button.id = app.name + "_button";
      app_button.className = "appbutton";
      app_button.app = app;
      app_button.appDisplay = app.name;
      app_button.addEventListener("click", () => {
        toggleDynamicApp(app_button.app);
      });
    }
    updateButtonStatus(app.name, app.error === 'ok' || app.error === undefined ? 'stopped' : 'error');
  }
})

ipcRenderer.on('updateButtonStatus', (_event, app, status) => {
  updateButtonStatus(app, status);
});

function addEmbeddedPage(applet_description) {
    let name = applet_description.name;
    let url = applet_description.html;
    let button = document.createElement("button");
    button.className = 'collapsible active';
    button.textContent = name;
    button.id = name;
    let section = document.createElement("section");
    section.className = 'content';
    let embed = document.createElement("EMBED");
    embed.width = "100%";
    embed.height = "600px";
    embed.src = url;
    embed.console = function () { };
    section.appendChild(embed);
    document.body.appendChild(button);
    document.body.appendChild(section);

    // refresh
    button.addEventListener("contextmenu", function () {
      embed.src = url;
    });
}

function addAppletButton(app) {
    let drawer = document.getElementById("appletDrawer");
    let app_button = document.getElementById(app.name + "_button");
    if (app_button === undefined || app_button === null) {
      app_button = document.createElement("button");
      drawer.appendChild(app_button);
      app_button.id = app.name + "_button";
      app_button.className = "appbutton";
      app_button.app = app;
      app_button.appDisplay = app.name;
      app_button.addEventListener("click", () => {
        toggleApplet(app_button.app);
      });
    }
    updateButtonStatus(app.name, app.error === 'ok' || app.error === undefined ? 'stopped' : 'error');
}

ipcRenderer.on('initApplets', (_event, applet_descriptions) => {
  if(applet_descriptions === undefined || !Array.isArray(applet_descriptions) || applet_descriptions.length === 0) {
    return;
  }

  for(applet_description of applet_descriptions) {
    if(applet_description.embedded) {
      addEmbeddedPage(applet_description);
    } else {
      addAppletButton(applet_description);
    }
  }
});

ipcRenderer.on('snesConnectionStatus', (_event, connected) => {
  let elements = document.querySelectorAll('.controlbutton');
  for (element of elements) {
    element.style.backgroundColor = connected ? button_color : error_state;
    element.disabled = !connected;
  }
});

ipcRenderer.on('applyCollapseSettings', (_event, settings) => {

  function toggleGroup(e) {
    this.classList.toggle("active");
    const content = this.nextElementSibling;
    content.classList.toggle('hide');
  }

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
  const col = document.querySelectorAll(".collapsible");

  for (let c of col) {
    c.addEventListener("click", toggleGroup);
    if(!settings.includes(c.id)) {
        c.classList.toggle("active");
        const content = c.nextElementSibling;
        content.classList.toggle('hide');
    }
  }

  const all = document.querySelector(".all");

  all.addEventListener('click', collapseAll);
});
