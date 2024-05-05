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

function updateAppStatus(app, status) {
  let button = document.getElementById(app + "_button");
  button.style.border = '0px solid #000'
  if (status === 'running') {
    button.textContent = app;
    button.style.backgroundColor = running_state;
    button.style.border = '4px solid #000'
  } else if (status === 'stopped') {
    button.textContent = app;
    button.style.backgroundColor = button_color;
  } else if (status === 'error') {
    button.textContent = app + ' (Invalid)';
    button.style.backgroundColor = error_state;
    button.disabled = true;
  } else {
    // error
    console.log("Invalid app status");
  }
}

ipcRenderer.on('initAppList', (_event, apps) => {
  for (const [key, value] of Object.entries(apps)) {
    let drawer = document.getElementById("customAppDrawer");
    let app_button = document.getElementById(value.display + "_button");
    if (app_button === undefined || app_button === null) {
      app_button = document.createElement("button");
      drawer.appendChild(app_button);
    }

    app_button.id = value.display + "_button";
    app_button.className = "appbutton";
    app_button.addEventListener("click", () => {
      toggleDynamicApp(value);
    });

    updateAppStatus(value.display, value.exists ? 'stopped' : 'error');
  }
})

ipcRenderer.on('updateAppStatus', (_event, app, status) => {
  updateAppStatus(app, status);
})


ipcRenderer.on('initBrowserWindowList', (_event, pages) => {
  for (const [name, url] of Object.entries(pages)) {
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
})

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
  }

  const all = document.querySelector(".all");

  all.addEventListener('click', collapseAll);

  // For now, everything starts active, so just toggle if false
  for (const [key, value] of Object.entries(settings)) {
    let group = document.getElementById(key);
    console.log(key);
    console.log(group);
    if (group !== undefined) {
      if (!value) {
        group.classList.toggle("active");
        const content = group.nextElementSibling;
        content.classList.toggle('hide');
      }
    }
  }
});
