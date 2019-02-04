/**
# electron captureWindow

    captureWindow(id, callback);

Pass the id of the window you want (e.g. `require.electron.remote.getCurrentWindow().id`)
and a callback. The callback will be passed a `NativeImage`.
*/
/* global require, module */
'use strict'

const captureWindow = (id, callback) => {
  if (!require.electron) {
    return null
  }

  const [win] = require.electron.remote.BrowserWindow.getAllWindows().filter(w => w.id === id)
  if (win) {
    win.capturePage(callback)
  } else {
    console.error(`could not find window ${id}`)
  }
}

module.exports = captureWindow
