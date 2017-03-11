/**
# Object Registry

*/
/* global module, require, console */
'use strict';

const {getByPath, setByPath} = require('./b8r.byPath.js');
const _models = {};
let listeners = []; // { path_string_or_test, callback }

class Listener {
  constructor (test, callback) {
    if (typeof test === 'string') {
      this.test = t => t.length >= test.length && test === t.substr(0, test.length);
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

const get = path => getByPath(_models, path);

const set = (path, value, source_element) => {
  const path_parts = path.split('.');
  const model = path_parts[0];
  if (path_parts.length > 1 && !_models[model]) {
    console.error(`cannot set ${path} to ${value}, ${model} does not exist`);
  } else if (path_parts.length === 1 && typeof value !== 'object') {
    throw 'cannot set ${path}; you can only register objects at root-level';
  } else if (setByPath(_models, path, value)) {
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

const touch = (path, source_element) => {
  listeners.
      filter(listener => listener.test(path)).
      forEach(listener => listener.callback(path, source_element));
};

const observe = (test, callback) => {
  new Listener(test, callback);
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
    for(let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i].test === test) {
        listeners.splice(i, 1);
        found = true;
      }
    }
  }
  return found;
};

const models = () => Object.keys(_models);

const registered = path => !!_models[path.split('.')[0]];

const remove = name => {
  if (_models[name]) {
    delete _models[name];
  } else {
    console.error(`remove model ${name} failed; does not exist`);
  }
};

module.exports = {get, set, call, touch, observe, unobserve, models, registered, remove};
