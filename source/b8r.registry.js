/**
# Object Registry

Bindinator is built around the idea of registering objects under unique names
and binding events and element properties to paths based on those names.

b8r's registry is an observable object that b8r uses to keep track of objects.
Once an object is registered, its properties will automatically be bound
to events and DOM properties by path.

    set('root', object_value); // registers the object with the name
    set('root.path.to.value', new_value); // sets the value

You can set the registry's properties by path. Root level properties must
themselves be objects.

    get('root.path.to.value'); // gets the value

You can get a property by path.

Two convenience methods are provided for working with JSON data:

    getJSON('path.to.value' [, element]);
    setJSON('path.to.value', json_string);

Note that unlike set, setJSON does not accept an optional element argument.

    call('root.path.to.method', ...args); // returns value as appropriate

You can call a method by path.

    touch(path [, source_element]);

Triggers all observers as though the value at path has changed. Useful
if you change a property independently of the registry.

    async_touch(path);

Triggers all observers asynchronousely (on requestAnimationFrame).
*/
/* jshint latedef:false */
/* global module, require, console */
'use strict';

const {getByPath, setByPath} = require('./b8r.byPath.js');
const {getDataPath, getComponentInstancePath} = require('./b8r.bindings.js');
const {logStart, logEnd} = require('./b8r.perf.js');
const registry = {};
let listeners = [];  // { path_string_or_test, callback }

class Listener {
  constructor(test, callback) {
    if (typeof test === 'string') {
      this.test = t =>
          t.length >= test.length && test === t.substr(0, test.length);
    } else if (test instanceof RegExp) {
      this.test = test.test.bind(test);
    } else if (test instanceof Function) {
      this.test = test;
    } else {
      throw 'expect listener test to be a string, RegExp, or test function';
  }
    if (typeof callback === 'string') {
      this.callback = (...args) => {
        if (get(callback)) {
          call(callback, ...args);
        } else {
          unobserve(this);
        }
      };
    } else if (typeof callback === 'function') {
      this.callback = callback;
    } else {
      throw 'expect callback to be a path or function';
    }
    listeners.push(this);
  }
}

const resolvePath = (path, element) => {
  if (path[0] === '.') {
    if (!element) {
      throw 'cannot evaluate relative path without element';
    }
    path = getDataPath(element) + path;
  } else if (path.substr(0, 6) === '_data_') {
    if (!element) {
      throw 'cannot evaluate _data_ path without element';
    }
    path = getDataPath(element) + path.substr(6);
  } else if (path.substr() === '_component_') {
    if (!element) {
      throw 'cannot evaluate _component_ path without element';
    }
    path = getComponentInstancePath(element) + path;
  }
  return path;
};

const get = (path, element) => {
  path = resolvePath(path, element);
  return getByPath(registry, path);
};

const getJSON = (path, element) => JSON.stringify(get(path, element));

const touch = (path, source_element) => {
  logStart('touch', path);
  listeners.filter(listener => listener.test(path))
      .forEach(listener => listener.callback(path, source_element));
  logEnd('touch', path);
};

const _async_touch_dirty_list = [];
let _async_touch_id = null;

const _async_touch = () => {
  _async_touch_dirty_list.forEach(touch);
  _async_touch_dirty_list.splice(0);
};

const async_touch = path => {
  if (_async_touch_dirty_list.indexOf(path) === -1) {
    _async_touch_dirty_list.push(path);
  }
  if (!_async_touch_id) {
    _async_touch_id = requestAnimationFrame(_async_touch);
  }
};

const set = (path, value, source_element) => {
  const path_parts = path.split(/\.|\[/);
  const model = path_parts[0];
  if (path_parts.length > 1 && !registry[model]) {
    console.error(`cannot set ${path} to ${value}, ${model} does not exist`);
  } else if (path_parts.length === 1 && typeof value !== 'object') {
    throw 'cannot set ${path}; you can only register objects at root-level';
  } else if (typeof value === 'object' || value !== getByPath(registry, path)) {
    setByPath(registry, path, value);
    touch(path, source_element);
  }
};

const register = (name, obj, block_updates) => {
  if (name.match(/^_[^_]*_$/)) {
    throw 'cannot register object as ' + name +
      ', all names starting and ending with a single \'_\' are reserved.';
  }
  registry[name] = obj;
  if (!block_updates) {
    touch(name);
    require.lazy('./b8r.events.js').then(({play_saved_messages}) => play_saved_messages(name));
  }
};

const setJSON = (path, value) => set(path, JSON.parse(value));

const push = (path, value) => {
  const list = get(path);
  if(Array.isArray(list)) {
    list.push(value);
    async_touch(path);
  }
};

const call = (path, ...args) => {
  const method = get(path);
  if (method instanceof Function) {
    return method(...args);
  } else {
    console.error(`cannot call ${path}; not a method`);
  }
};

/**
    observe('root.path.to', callback); // returns a Listener instance

You can observe a path (string). The callback will fire whenever any path
matching or starting
with the string changes. The callback will be passed the exact path that
changed.

    observe(/root.path.[^\.]+.value/, callback);

Instead of a constant path, you can pass a RegExp which will fire the callback
when a path
matching the test changes. The callback will be passed the exact path that
changed.

    observe(path => path.split('.').length === 1, callback);

Finally you can observe a path test function.

    const listener = observe(test, callback);

The `callback` can be a function or a path. If a path, the listener will
automatically be removed if the path is no longer registered (so, for example,
you can hook up a component method as a listener and it will be
'garbage collected' with the compoent.

You can remove a listener (if you kept the reference handy).

    unobserve(listener);

You can remove a listener by test, but it will remove _all_ listeners which use
that test.

~~~~
b8r.register('listener_test1', {
  flag_changed: () => {
    console.log('flag changed');
    b8r.set('listener_test2.counter', b8r.get('listener_test2.counter') + 1);
  }
});
b8r.register('listener_test2', {counter: 0, flag: false});
b8r.observe('listener_test2.flag', 'listener_test1.flag_changed');
b8r.set('listener_test2.flag', true);
Test(() => b8r.get('listener_test2.counter'), 'observer counted flag set to true').shouldBe(1);
b8r.set('listener_test2.flag', false);
Test(() => b8r.get('listener_test2.counter'), 'observer counted flag set to false').shouldBe(2);
b8r.set('listener_test2.flag', false);
Test(() => b8r.get('listener_test2.counter'), 'observer ignored flag set to false').shouldBe(2);
b8r.set('listener_test2.flag', true);
Test(() => b8r.get('listener_test2.counter'), 'observer counted flag set to true').shouldBe(3);
b8r.remove('listener_test1');
b8r.set('listener_test2.flag', false);
Test(() => b8r.get('listener_test2.counter'), 'observer automatically removed').shouldBe(3);
~~~~
*/

const observe = (test, callback) => {
  return new Listener(test, callback);
};

const unobserve = test => {
  let index;
  let found = false;
  if (test instanceof Listener) {
    index = listeners.indexOf(test);
    if (index > -1) {
      listeners.splice(index, 1);
    } else {
      console.error('unobserve failed, listener not found');
    }
  } else {
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i].test === test) {
        listeners.splice(i, 1);
        found = true;
      }
    }
  }
  return found;
};

/**
    registered('root-name'); // => true | false

You can get a list of root level objects:

    models();

You can obtain a value using a path.
*/

const models = () => Object.keys(registry);

const registered = path => !!registry[path.split('.')[0]];

/**
    remove('root');

You can remove a root-level object ("model-name").
*/
const remove = name => {
  if (registry[name]) {
    delete registry[name];
  } else {
    console.error(`remove model ${name} failed; does not exist`);
  }
};

module.exports = {
  get,
  getJSON,
  set,
  setJSON,
  push,
  call,
  touch,
  async_touch,
  observe,
  unobserve,
  models,
  register,
  registered,
  remove,
  resolvePath,
};
