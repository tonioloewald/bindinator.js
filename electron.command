#!/bin/sh

cd "`dirname "$0"`"
cp electron/package.json package.json
npm install
./node_modules/.bin/electron .
