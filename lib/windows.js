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

const is_parent = ! window._b8r_window_id;
const child_windows = [];
let ignore_touches = {};

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
      const id = require.electron_remote.getCurrentWindow().webContents.id;
      if (sync_paths.length) {
        this.window.webContents.executeJavaScript(`
          window._b8r_opener_id = ${id};
          window._b8r_window_id = '${this.id}';
        `);
      }
    } else if (nw) {
      // options.new_instance = true; // this is The Right Thing to Do, but breaks window<->window comms AFAICT
      nw.Window.open(url, options, w => {
        this.window = w.window;
        this.isAlive = () => !! w.window.document;
        if (sync_paths.length) {
          w.window._b8r_window_id = this.id;
        }
      });
    } else {
      this.window = window.open(url, options);
      window.onload = () => {
        if (sync_paths.length) {
          this.window._b8r_window_id = this.id;
        }
        this.isAlive = () => !! this.window.document;
      };
    }

    if (sync_paths.length) {
      child_windows.push(this);
    }
  }

  get (path) {
    if (require.electron_remote) {
      return this.window.webContents.executeJavaScript(`b8r.get('${path}')`);
    } else {
      return new Promise(resolve => resolve(JSON.parse(this.window.b8r.getJSON(path))));
    }
  }

  set (path, value) {
    const json = JSON.stringify(value);
    let promise;
    if (require.electron_remote) {
      promise = this.window.webContents.executeJavaScript(`b8r.set('${path}', ${json})`);
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
  return new Promise(resolve => {
    if (! is_parent) {
      throw 'windows.send not allowed from child window';
    }
    ignore_touches[path] = true;
    const syncs = child_windows.
                  filter(w => w.sync_paths.indexOf(path) > -1).
                  map(w => w.set(path, b8r.get(path)));
    if (syncs.length) {
      Promise.all(syncs).then(() => {
        ignore_touches[path] = false;
        resolve();
      });
    } else {
      const observed_paths = b8r.get('_b8r_.sync_paths');
      const idx = observed_paths.indexOf(path);
      if (idx > -1) {
        delete observed_paths[idx];
      }
      ignore_touches[path] = false;
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
  if (ignore_touches[path]) {
    return;
  }
  const sender = child_windows.find(w => w.id === id);
  sender.get(path).then(data => {
    b8r.set(path, data);
    child_windows.
    filter(w => w.id !== id && w.sync_paths.indexOf(path) > -1).
    forEach(w => w.set(path, data));
  });
};

if (is_parent) {
  b8r.register('windows-sync-parent', {init, send, receive});
} else {
  window.opener.b8r.call('windows-sync-parent.init', window._b8r_window_id);
}

const _open = (...args) => new Window(...args);

const update = path => {
  if (is_parent) {
    send(path);
  } else if (require.electron_remote) {

  } else {
    window.opener.b8r.call('windows-sync-parent.receive', window._b8r_window_id, path);
  }
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

module.exports = {open: _open, update, is_parent: () => is_parent};
