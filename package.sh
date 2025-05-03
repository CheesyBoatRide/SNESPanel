#!/bin/bash

npm install
npm run package

mkdir -p ./bin/stage
mkdir -p ./bin/package
cp -R "./out/SNES Control Panel-win32-x64/*" ./bin/stage
cp ./config.toml ./bin/stage
cp ./README.md ./bin/stage
cp ./screenshot.png ./bin/stage
cp ./LICENSE ./bin/stage

 7z a -tzip -r ./bin/package/SNESControlPanel_Win64.zip ./bin/stage/*