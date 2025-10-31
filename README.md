# SNES Control Panel

SNES Control Panel is a centralized user interface for managing various USB2SNES services, as well as a starting point for adding extra capabilities.

![](screenshot.png)

### Quick Start
In order to utilize the SNES Control Panel, you will need to modify the `config.json` file that lives next to the application.  This file is where you will add all of the apps and applets to your panel for use, as well as other various preferences.

- Definitions
    - App - A child process to be launched and hosted by the SNES control panel.  Configure an app in `config.json` and a button will appear on the panel for it.  Clicking it will toggle between launching and killing the process.  Apps will be killed when the panel is exited.
        - Add any applications that you'd like on your panel by adding a new entry for each app, e.g.:
            ```
                "apps": [
                        {
                            "name": "SNI",
                            "args": [],
                            "cmd": "./sni.exe",
                            "working_directory": "./sni-v0.0.96-windows-amd64",
                            "env": {
                                "SNI_USB2SNES_LISTEN_ADDRS": "0.0.0.0:23074,0.0.0.0:8080"
                            },
                            "launch_on_start": true
                        }
                    ]
    - Applet - A piece of html/js (local or remote) to be either launched like an app or embedded in a group tab in the panel.  There is a work-in-progress API for creating your own applets via HTML and JS to communicate with the usb2snes connection.  You can also use this to launch any HTML you wish for things like Funtoon or various browser based usb2snes item trackers.  The `embedded` flag will embed the HTML into a tab on the panel if true, and put it in a pop up window if false (defaults to false).
        - Add any applets that you'd like on your panel by adding a new entry for each applets, e.g.:
            ```
                "applets": [
                        {
                            "name": "Subversion Tracker",
                            "html": "https://cout.github.io/sm_subversion_tracker/",
                            "width": 800,
                            "height": 600,
                            "dev_tools": true,
                            "launch_on_start": true,
                            "embedded": false,
                        }
                    ]

- Tips:
    - If no working_directory is supplied, the working directory will default to the location of the app
    - "name" is a required field and must be unique per entry
    - You can specify arguments in a list (use this to make various configs of the same application, e.g.multiple buttons to open different splits in livesplit)
    - Setting "launch_on_start" to `true` will cause the app or applet to be launched on start of the panel


See the json schema provided for all possible fields.

- The `usb2snes_address` key in the `usb2snes` group is only used by the controls natively supplied by the panel, such as reset and go to menu.
