const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('node:path')
const fs = require('node:fs');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, 'docs/icon.ico'),
    extraResource: [
      path.resolve(__dirname, 'docs/icon.ico'),
    ],
    afterExtract:[
      async (buildPath, electronVersion, platform, arch, callback) => {
        fs.copyFileSync(path.resolve(__dirname, 'config.json'), path.join(buildPath, 'config.json'));
        fs.copyFileSync(path.resolve(__dirname, 'config.schema.json'), path.join(buildPath, 'config.schema.json'));
        fs.copyFileSync(path.resolve(__dirname, 'README.md'), path.join(buildPath, 'README.md'));
        fs.copyFileSync(path.resolve(__dirname, 'screenshot.png'), path.join(buildPath, 'screenshot.png'));
        fs.copyFileSync(path.resolve(__dirname, 'LICENSE'), path.join(buildPath, 'LICENSE'));

        fs.cpSync(path.resolve(__dirname, 'src/applets'), path.join(buildPath, 'src/applets'), { recursive: true });

        // Call the callback when done
        callback();
      }
    ]
  },
  rebuildConfig: {},
  outDir: 'bin',
  makers: [
    {
      name: '@electron-forge/maker-zip',
      config: {
        icon: path.resolve(__dirname, 'docs/icon.ico')
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
