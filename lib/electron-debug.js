/**
# electron debug utils

If you alt-right-click an element in electron it will reveal it in the inspector.
*/
/* global require */
'use strict'

if (require.electron) {
  const b8r = require('../source/b8r.js')

  b8r.onAny('contextmenu', 'electron-debug.inspect')

  b8r.register('electron-debug', {
    inspect: evt => {
      if (evt.altKey) {
        const w = require.electron.remote.getCurrentWindow()
        if (require.electron.remote.process.defaultApp || w.isDevToolsOpened()) {
          w.inspectElement(evt.clientX, evt.clientY)
        }
      } else {
        return true
      }
    }
  })
}
