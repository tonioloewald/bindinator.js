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
      'path/to/component-name',
      options,                                    // window options
      ['model-to-sync', 'other-model-to-sync']    // paths (if any) to sync to window
    );

(`get` and `set` will still work too.)

## Under the Hood

The `get` and `set` methods are simply calls to b8r (exposed as a global, using `getJSON` and
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

Because DOM elements are updated asynchronously (very asynchronously in the case of some elements
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
'use strict';
/* global module, require */

const {nw} = window;
const b8r = require('../source/b8r.js');
const uuid = require('./uuid.js');

window.b8r = b8r;

const is_parent = () => ! window._b8r_window_id;
const child_windows = [];

let ignore_touches = {};
const ignoring_touches = path => ignore_touches[path];
const disable_touches = path => ignore_touches[path] = true;
const enable_touches = path => b8r.after_update(() => ignore_touches[path] = false);

b8r.set('_b8r_.sync_paths', []);

class Window {
  constructor(url, options={}, sync_paths=[]) {
    this.id = uuid();
    this.sync_paths = sync_paths;
    const observed_paths = b8r.get('_b8r_.sync_paths');
    sync_paths.forEach(path => observed_paths.indexOf(path) === -1 && observed_paths.push(path));
    child_windows[this.id] = this;
    if (require.electron_remote) {
      this.window = new require.electron_remote.BrowserWindow(options);
      this.window.loadURL(url);
      const id = require.electron_remote.getCurrentWindow().webContents.id;
      if (sync_paths.length) {
        const wc = this.window.webContents;
        this.window.on('closed', () => this.window = false);
        this.window.webContents.on('dom-ready', () => {
          wc.executeJavaScript(`
            window._b8r_opener_id = ${id};
            window._b8r_window_id = '${this.id}';
          `);
          child_windows.push(this);
        });
      }
      this.isAlive = () => !! this.window;
    } else if (nw) {
/*
  creating a new_instance window is the Right Thing to Do, but there doesn't seem to be an
  equivalent in nwjs to window.webContents.executeJavaScript(...) -> promise
*/
      // options.new_instance = true;
      nw.Window.open(url, options, w => {
        this.window = w.window;
        this.isAlive = () => !! w.window.document;
        if (sync_paths.length) {
          w.window._b8r_window_id = this.id;
          child_windows.push(this);
        }
      });
    } else {
      this.window = window.open(url, options);
      window.onload = () => {
        if (sync_paths.length) {
          this.window._b8r_window_id = this.id;
          child_windows.push(this);
        }
        this.isAlive = () => !! this.window.document;
      };
    }
  }

/*
  escape / unescape are necessary to handle common edge-cases such as \n inside strings.
*/

  getJSON (path) {
    if (require.electron_remote) {
      return new Promise(resolve => {
        this.window.webContents.
          executeJavaScript(`escape(b8r.getJSON('${path}'))`).
            /* global unescape */
            then(escaped_json => {
              resolve(unescape(escaped_json));
            });
      });
    } else {
      return new Promise(resolve => resolve(this.window.b8r.getJSON(path)));
    }
  }

  get (path) {
    return new Promise(resolve => this.getJSON(path).then(json => resolve(JSON.parse(json))));
  }

  setJSON (path, json) {
    let promise;
    if (require.electron_remote) {
      promise = new Promise(resolve => {
        this.getJSON(path).then(result => {
          if (result !== json) {
            /* global escape */
            const escaped_json = escape(json);
            promise = this.window.webContents.executeJavaScript(`
              b8r.setJSON('${path}', unescape('${escaped_json}'))
            `).then(resolve);
          } else {
            resolve(result);
          }
        });
      });
    } else {
      promise = new Promise(resolve => {
        let result = this.window.b8r.getJSON(path);
        if (result !== json) {
          result = this.window.b8r.setJSON(path, json);
          this.window.b8r.touch(path);
        }
        resolve(result);
      });
    }
    return promise;
  }

  set (path, value) {
    return new Promise(resolve => this.setJSON(path, JSON.stringify(value)).then(resolve));
  }
}

const remove_dead = () => {
  for(let i = child_windows.length - 1; i >= 0; i--) {
    if (! child_windows[i].isAlive()) {
      child_windows.splice(i, 1);
    }
  }
};

const send = path => {
  remove_dead();
  disable_touches(path);
  return new Promise(resolve => {
    if (! is_parent()) {
      throw 'windows.send not allowed from child window';
    }
    const syncs = child_windows.
                  filter(w => w.sync_paths.indexOf(path) > -1).
                  map(w => w.set(path, b8r.get(path)));
    if (syncs.length) {
      Promise.all(syncs).then(() => {
        enable_touches(path);
        resolve();
      });
    } else {
      const observed_paths = b8r.get('_b8r_.sync_paths');
      const idx = observed_paths.indexOf(path);
      if (idx > -1) {
        delete observed_paths[idx];
      }
      enable_touches(path);
      resolve();
    }
  });
};

const init = id => {
  const w = child_windows.find(w => w.id === id);
  Promise.all(w.sync_paths.map(send)).then(() => {
    w.set('_b8r_.sync_paths', w.sync_paths);
  });
};

const receive = (id, path) => {
  remove_dead();
  if (ignoring_touches(path)) {
    return;
  }
  disable_touches(path);
  const sender = child_windows.find(w => w.id === id);
  sender.getJSON(path).then(json => {
    if (json === b8r.getJSON(path)) {
      enable_touches(path);
      return;
    }
    b8r.set(path, JSON.parse(json));
    const syncs = child_windows.
                    filter(w => w.id !== id && w.sync_paths.indexOf(path) > -1).
                    map(w => w.setJSON(path, json));
    Promise.all(syncs).then(() => enable_touches(path));
  });
};

if (is_parent()) {
  b8r.register('windows-sync-parent', {init, send, receive});
} else {
  if (require.electron_remote) {
    const w = require.electron_remote.BrowserWindow.fromId(window._b8r_opener_id);
    w.webContents.executeJavaScript(`
      window.b8r.call('windows-sync-parent.init', '${window._b8r_window_id}');
    `);
  } else {
    window.opener.b8r.call('windows-sync-parent.init', window._b8r_window_id);
  }
}

const _open = (...args) => new Window(...args);

const _dirty_path_list = [];
const update_dirty_paths = b8r.debounce(() => {
  while(_dirty_path_list.length) {
    const path = _dirty_path_list.shift();
    if (is_parent()) {
      if (! ignoring_touches(path)) send(path);
    } else if (require.electron_remote) {
      const w = require.electron_remote.BrowserWindow.fromId(window._b8r_opener_id);
      w.webContents.executeJavaScript(`
        window.b8r.call('windows-sync-parent.receive', '${window._b8r_window_id}', '${path}');
      `);
    } else {
      window.opener.b8r.call('windows-sync-parent.receive', window._b8r_window_id, path);
    }
  }
}, 100);

/*
  tracking 'dirty' paths and then debouncing has all kinds of benefits and also
  fixes problems caused by multiple indirect bindings (e.g. a value bound to a component
  value that causes cascades of asynchronous updates to-and-fro between windows). The alternative
  would be to force synchronous cross-window updates, do something incredibly complicated with
  asynchronous multi-level locking across windows, or this.
*/

const update = path => {
  _dirty_path_list.push(path);
  update_dirty_paths();
};

b8r.observe(
  path => {
    const model = path.split(/[\.\]]/)[0];
    return b8r.get('_b8r_.sync_paths').indexOf(model) > -1;
  },
  path => {
    const model = path.split(/[\.\]]/)[0];
    update(model);
  }
);

module.exports = {open: _open, update, is_parent};