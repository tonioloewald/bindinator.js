/* global requestAnimationFrame, electron */

// do this immediately so the page refresh occurs seamlessly
import './vfs.js'

import b8r from './source/b8r.js'
import { isElectron, isNwjs } from './lib/runtime-environment.js'
// for convenience when debugging
window.b8r = b8r
// if the # contains 'body=path/to/component' load that
// otherwise load 'components/documentation'
const componemtPath = (window.location.href.match(/\bbody=([^=&]+)/) || [])[1] ||
                      'components/documentation'
const root = b8r.elements._comp()

window.dump = obj => {
  const w = window.open()
  const pre = w.document.createElement('pre')
  if (typeof obj === 'string') {
    pre.textContent = obj
  } else {
    try {
      pre.textContent = JSON.stringify(obj, false, 2)
    } catch (e) {
      pre.textContent = obj.toString()
    }
  }
  w.document.body.append(pre)
}

// sometimes document.body doesn't exist yet
requestAnimationFrame(() => {
  root.path = componemtPath
  if (componemtPath !== 'components/documentation') document.body.classList.add('fullscreen')
  document.body.append(root)
})

// debug tools
b8r.set('_b8r_.toggleDebug', async () => {
  if (isNwjs) {
    const win = window.nw.Window.get()
    // bizarrely, isDevToolsOpen requires the SDK build of nwjs but show/close does not
    const showDevTools = !(win.isDevToolsOpen && win.isDevToolsOpen())
    if (showDevTools) win.showDevTools(); else win.closeDevTools()
  } else if (isElectron) {
    await import('./lib/electron-debug.js')
    electron.remote.getCurrentWindow().toggleDevTools()
  }
})
b8r.onAny('keydown(alt-meta-I)', '_b8r_.toggleDebug')

// iOS body size fix
// https://stackoverflow.com/questions/43575363/css-100vh-is-too-tall-on-mobile-due-to-browser-ui
const fixBodySize = b8r.debounce(() => {
  document.body.style.height = window.innerHeight + 'px'
}, 100)
window.addEventListener('resize', fixBodySize)
fixBodySize()
