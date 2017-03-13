/**
# Object Registry

The object registry is an observable object.

    set('root', object_value); // registers the object with the name
    set('root.path.to.value', new_value); // sets the value

You can set the registry's properties by path. Root level properties must
themselves be objects, and are referred to as _registry__.

    get('root.path.to.value'); // gets the value

You can get a property by path.

    call('root.path.to.method', ...args); // returns value as appropriate

You can call a method by path.
*/
/* global module, require, console */
'use strict';

const {getByPath, setByPath} = require('./b8r.byPath.js');
const registry = {};
let listeners = [];  // { path_string_or_test, callback }

class Listener {
  constructor(test, callback) {
    if (typeof test === 'string') {
      this.test = t =>
          t.length >= test.length && test === t.substr(0, test.length);
    } else if (test instanceof RegExp) {
      this.test = test.test;
    } else if (test instanceof Function) {
      this.test = test;
    } else {
      throw 'expect listener test to be a string, RegExp, or test function';
    }
    this.callback = callback;
    listeners.push(this);
  }
}

const get = path => getByPath(registry, path);

const set = (path, value, source_element) => {
  const path_parts = path.split('.');
  const model = path_parts[0];
  if (path_parts.length > 1 && !registry[model]) {
    console.error(`cannot set ${path} to ${value}, ${model} does not exist`);
  } else if (path_parts.length === 1 && typeof value !== 'object') {
    throw 'cannot set ${path}; you can only register objects at root-level';
  } else if (setByPath(registry, path, value)) {
    touch(path, source_element);
  }
};

const call = (path, ...args) => {
  const method = get(path);
  if (method instanceof Function) {
    return method(...args);
  } else {
    throw `cannot call ${path}; not a method`;
  }
};

/**
    touch(path [, source_element]); //

Triggers all observers as though the value at path has changed. Useful
if you change a property independently of the registry.
*/
const touch = (path, source_element) => {
  listeners.filter(listener => listener.test(path))
      .forEach(listener => listener.callback(path, source_element));
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

    unobserve(listener);

You can remove a listener (if you kept the reference handy).

    unobserve(test);

You can remove a listener by test, but it will remove _all_ listeners which use
that test.
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
  set,
  call,
  touch,
  observe,
  unobserve,
  models,
  registered,
  remove
};
