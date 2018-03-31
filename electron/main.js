/* global require, __dirname */
'use strict';

const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

function createWindow () {
  // Create the browser window.
  const win = new BrowserWindow({
    minWidth: 640,
    minHeight: 360,
    width: 800,
    height: 600
  });

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, '../index.html'),
    protocol: 'file:',
    slashes: true
  }));
}

app.on('ready', createWindow);
