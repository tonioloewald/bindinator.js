/**
# Windows

This *b8r-dependent* library is intended to provide tools for multi-window / tab web applications.

You can create a new window with a component loaded at root level like this:

    const w = windows.option('path/to/component-name', {...});

And you can send data to and pull data from the new window via:

    w.set(path, value);       // returns a promise of the result
    w.get(path);              // returns a promise of the requested data

You can create an automatically synchronized child window by passing a list of paths to be
shared with the child:

    const w = windows.open(
      url,
      options,                                    // window options
      ['model-to-sync', 'other-model-to-sync']    // paths (if any) to sync to window
    );

(`get` and `set` will still work too.)

The `url` needs to get you to an html file that loads `b8r.js` and `windows.js` at minimum.
The `b8r` default index.html will load a component passed to it
as part of its `hashtag`, so e.g. `path/to/index.html#body=components/kitchen-sink` will
load the `kitchen-sink` demo component (instead of the default `documentation` component).

If you look at the kitchen-sink demo, it spawns a new window thus:

    windows.open(
      window.location.href.split('#')[0] + '#body=components/kitchen-sink',
      { minWidth: 600, minHeight: 400 },
      ['kitchen-sink-demo']
    );

This loads b8r's `index.html` with the hashtag that tells it to load the `kitchen-sink`
demo component, which in turn is wired to a registry path `kitchen-sink-demo` which is explicitly
synced by the third parameter.

## Under the Hood

The `get` and `set` methods are  calls to b8r (exposed as a global, using `getJSON` and
`setJSON` to deal with the different execution contexts) and wrapped in promises (because in
Electron the underlying calls will be asynchronous).

The automatic syncing is handled by creating an observer in the parent and child windows that
checks for changes to a synced path and propagates it accordingly.

- If a child sees a local change on a path:
  - it notifies the parent to `receive` it.
  - the parent starts ignoring all messages about that path
  - the parent updates itself and all other children
  - the parent stops ignoring all messages about that path
- If a parent sees a local change on a path:
  - it starts ignoring all messages about that path
  - it updates all its children
  - it stops ignoring all messages about the path

The process of notifying changes is debounced.

Because DOM elements are updated asynchronously (*very* asynchronously in the case of some elements
such as `<select>`), there can be false positive changes so these are filtered out by brute force
(comparing before and after JSON serializations) in the `window.set` method.

**tl;dr** if you're doing frequent, expensive data changes don't use automatic synchonization.

## Background

When a web application opens up a new window (via `window.open(....)`) the result is
(assuming it doesn't get blocked by browser sandboxing) a window (or tab) which is just
like any other window or tab except that it has an `opener` property that points back
to the `window` from which it was spawned.

In **nwjs** you can do the same thing via `window.open` or `nw.Window.open()` and window.opener
will work as in a browser.

In **Electron** `window.open` opens a *browser* window (which is almost certainly not
what you want) while using `BrowserWindow` creates a new window with its own thread, etc.
*/

import b8r from '../source/b8r.js'
import uuid from '../source/uuid.js'
import { isElectron } from './runtime-environment.js'
const { nw } = window
const electron = isElectron ? require('electron') : {}

window.b8r = b8r

const isParent = () => !window._b8rWindowId
const childWindows = []

const ignoreTouches = {}
const ignoringTouches = path => ignoreTouches[path]
const disableTouches = path => {
  ignoreTouches[path] = true
}
const enableTouches = path => b8r.afterUpdate(() => {
  ignoreTouches[path] = false
})

b8r.set('_b8r_.syncPaths', [])

class Window {
  constructor (url, options = {}, syncPaths = []) {
    this.id = uuid()
    this.syncPaths = syncPaths
    const observedPaths = b8r.get('_b8r_.syncPaths')
    syncPaths.forEach(path => observedPaths.indexOf(path) === -1 && observedPaths.push(path))
    childWindows[this.id] = this
    if (isElectron) {
      this.window = new electron.remote.BrowserWindow(options)
      this.window.loadURL(url)
      const id = electron.remote.getCurrentWindow().webContents.id
      if (syncPaths.length) {
        const wc = this.window.webContents
        this.window.on('closed', () => {
          this.window = false
        })
        this.window.webContents.on('dom-ready', () => {
          wc.executeJavaScript(`
            window._b8rOpenerId = ${id};
            window._b8rWindowId = '${this.id}';
          `)
          childWindows.push(this)
        })
      }
      this.isAlive = () => !!this.window
    } else if (nw) {
      /*
        creating a newInstance window is the Right Thing to Do, but there doesn't seem to be an
        equivalent in nwjs to window.webContents.executeJavaScript(...) -> promise
      */
      // options.newInstance = true;
      nw.Window.open(url, options, w => {
        this.window = w.window
        this.isAlive = () => !!w.window.document
        if (syncPaths.length) {
          w.window._b8rWindowId = this.id
          childWindows.push(this)
        }
      })
    } else {
      this.window = window.open(url, options)
      if (syncPaths.length) {
        this.window._b8rWindowId = this.id
        childWindows.push(this)
      }
      this.isAlive = () => !!this.window.document
    }
  }

  /*
  escape / unescape are necessary to handle common edge-cases such as \n inside strings.
*/

  getJSON (path) {
    if (isElectron) {
      return new Promise(resolve => {
        this.window.webContents
          .executeJavaScript(`escape(b8r.getJSON('${path}'))`)
        /* global unescape */
          .then(escapedJson => {
            resolve(unescape(escapedJson))
          })
      })
    } else {
      return new Promise(resolve => resolve(this.window.b8r.getJSON(path)))
    }
  }

  get (path) {
    return new Promise(resolve => this.getJSON(path).then(json => resolve(JSON.parse(json))))
  }

  setJSON (path, json) {
    let promise
    if (isElectron) {
      promise = new Promise(resolve => {
        this.getJSON(path).then(result => {
          if (result !== json) {
            /* global escape */
            const escapedJson = escape(json)
            promise = this.window.webContents.executeJavaScript(`
              b8r.setJSON('${path}', unescape('${escapedJson}'))
            `).then(resolve)
          } else {
            resolve(result)
          }
        })
      })
    } else {
      promise = new Promise(resolve => {
        let result = this.window.b8r.getJSON(path)
        if (result !== json) {
          result = this.window.b8r.setJSON(path, json)
          this.window.b8r.touch(path)
        }
        resolve(result)
      })
    }
    return promise
  }

  set (path, value) {
    return new Promise(resolve => this.setJSON(path, JSON.stringify(value)).then(resolve))
  }
}

const removeDead = () => {
  for (let i = childWindows.length - 1; i >= 0; i--) {
    if (!childWindows[i].isAlive()) {
      childWindows.splice(i, 1)
    }
  }
}

const send = path => {
  removeDead()
  disableTouches(path)
  return new Promise(resolve => {
    if (!isParent()) {
      throw new Error('windows.send not allowed from child window')
    }
    const syncs = childWindows
      .filter(w => w.syncPaths.indexOf(path) > -1)
      .map(w => w.set(path, b8r.get(path)))
    if (syncs.length) {
      Promise.all(syncs).then(() => {
        enableTouches(path)
        resolve()
      })
    } else {
      const observedPaths = b8r.get('_b8r_.syncPaths')
      const idx = observedPaths.indexOf(path)
      if (idx > -1) {
        delete observedPaths[idx]
      }
      enableTouches(path)
      resolve()
    }
  })
}

const init = id => {
  const w = childWindows.find(w => w.id === id)
  Promise.all(w.syncPaths.map(send)).then(() => {
    w.set('_b8r_.syncPaths', w.syncPaths)
  })
}

const receive = (id, path) => {
  removeDead()
  if (ignoringTouches(path)) {
    return
  }
  disableTouches(path)
  const sender = childWindows.find(w => w.id === id)
  sender.getJSON(path).then(json => {
    if (json === b8r.getJSON(path)) {
      enableTouches(path)
      return
    }
    b8r.set(path, JSON.parse(json))
    const syncs = childWindows
      .filter(w => w.id !== id && w.syncPaths.indexOf(path) > -1)
      .map(w => w.setJSON(path, json))
    Promise.all(syncs).then(() => enableTouches(path))
  })
}

if (isParent()) {
  b8r.register('windows-sync-parent', { init, send, receive })
} else {
  if (isElectron) {
    const w = electron.remote.BrowserWindow.fromId(window._b8rOpenerId)
    w.webContents.executeJavaScript(`
      window.b8r.call('windows-sync-parent.init', '${window._b8rWindowId}');
    `)
  } else {
    window.opener.b8r.call('windows-sync-parent.init', window._b8rWindowId)
  }
}

const _open = (...args) => new Window(...args)

const _dirtyPathList = []
const updateDirtyPaths = b8r.debounce(() => {
  while (_dirtyPathList.length) {
    const path = _dirtyPathList.shift()
    if (isParent()) {
      if (!ignoringTouches(path)) send(path)
    } else if (isElectron) {
      const w = electron.remote.BrowserWindow.fromId(window._b8rOpenerId)
      w.webContents.executeJavaScript(`
        window.b8r.call('windows-sync-parent.receive', '${window._b8rWindowId}', '${path}');
      `)
    } else {
      window.opener.b8r.call('windows-sync-parent.receive', window._b8rWindowId, path)
    }
  }
}, 100)

/*
  tracking 'dirty' paths and then debouncing has all kinds of benefits and also
  fixes problems caused by multiple indirect bindings (e.g. a value bound to a component
  value that causes cascades of asynchronous updates to-and-fro between windows). The alternative
  would be to force synchronous cross-window updates, do something incredibly complicated with
  asynchronous multi-level locking across windows, or this.
*/

const update = path => {
  _dirtyPathList.push(path)
  updateDirtyPaths()
}

b8r.observe(
  path => {
    const model = path.split(/[.\]]/)[0]
    return b8r.get('_b8r_.syncPaths').indexOf(model) > -1
  },
  path => {
    const model = path.split(/[.\]]/)[0]
    update(model)
  }
)

export { _open as open, update, isParent }
