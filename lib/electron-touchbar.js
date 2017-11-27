/**
# Touchbar support for Electron

Convenience wrapper for Electron `TouchBar` library. Will do nothing if 
not running inside an electron browserWindow on a Mac.

Simple Example:

    const touchbar = require('lib/touchbar.js');
    touchbar.createForWindow([
      {
        label: 'Example',
        click: () => b8r.call('path.to.method')
      }
    ]);
*/
/* global require, module */
'use strict';

const {remote} = require.globalRequire('electron');
const {TouchBar, process} = remote;
const {TouchBarButton, TouchBarPopover, TouchBarSpacer} = TouchBar;

const button = options => new TouchBarButton(options);
const popover = options => new TouchBarPopover(options);
const spacer = options => new TouchBarSpacer(options);

const create = (options, window) => {
  if (process.platform !== 'darwin') {
    return false;
  }
  if (Array.isArray(options)) {
    options = {items: options};
  }
  options.items.forEach((item, idx) => {
    if (item.constructor === Object) {
      options.items[idx] = button(item);
    }
  });
  if (options.escapeItem && options.escapeItem.constructor === Object) {
    options.escapeItem = button(options.escapeItem);
  }
  const touchBar = new TouchBar(options);
  if (window) {
    window.setTouchBar(touchBar);
  }
  return touchBar;
};

module.exports = {
  create,
  createForWindow: (items, window) => create(items, window || remote.getCurrentWindow()),
  button, popover, spacer,
  TouchBar, TouchBarButton,
};