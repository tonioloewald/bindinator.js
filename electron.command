#!/bin/sh

cd "`dirname "$0"`"
cp electron/package.json package.json
./node_modules/.bin/electron .
