#!/bin/bash

rm -rfd bin

npm install
npm run package
npm run make
