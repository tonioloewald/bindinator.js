/**
# Data Bindings

You can programmatically add a data binding using:

    addDataBinding(element, toTarget, path);

And remove a data binding using:

    removeDataBinding(element, toTarget, path);
*/
/* global module, require, console */
'use strict';

const {findWithin} = require('./b8r.dom.js');

const addDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  const existing =
      (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if (existing.indexOf(binding) === -1) {
    existing.push(binding);
    element.setAttribute('data-bind', existing.join(';'));
  }
};

const removeDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  var existing =
      (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if (existing.indexOf(binding) > -1) {
    existing = existing.filter(exists => exists !== binding);
    if (existing.length) {
      element.setAttribute('data-bind', existing.join(';'));
    } else {
      element.removeAttribute('data-bind');
    }
  }
};

const parseBinding = binding => {
  if (!binding.trim()) {
    throw 'empty binding';
  }
  if (binding.indexOf('=') === -1) {
    throw 'binding is missing = sign; probably need a source or target';
  }
  var [, targets, path] =
      binding.trim().match(/^([^=]*)=(.*)$/m).map(s => s.trim());
  targets = targets.split(',').map(function(target) {
    var parts = target.match(/(\w+)(\(([^)]+)\))?/);
    if (!parts) {
      console.error('bad target', target, 'in binding', binding);
      return;
    }
    return parts ? {target: parts[1], key: parts[3]} : null;
  });
  if (!path) {
    console.error('binding does not specify source', binding);
  }
  return {targets, path};
};

const findBindables = element => {
  return findWithin(element, '[data-bind]', true).filter(elt => {
    var list = elt.closest('[data-list],[data-list-instance]');
    return !list || list === element || !element.contains(list);
  });
};

const findLists = element => {
  return findWithin(element, '[data-list]').filter(elt => {
    var list = elt.parentElement.closest('[data-list]');
    return !list || !element.contains(list);
  });
};

const getBindings = element => {
  var binding_source = element.getAttribute('data-bind');
  if (!element.matches('[data-list]') && binding_source.indexOf('=.') > -1) {
    const instance_path = getListInstancePath(element);
    if (instance_path) {
      binding_source = binding_source.replace(/\=\./g, `=${instance_path}.`);
      element.setAttribute('data-bind', binding_source);
    }
  }
  return binding_source.split(';').filter(s => !!s.trim()).map(parseBinding);
};

const getListInstancePath = element => {
  const component = element.closest('[data-list-instance]');
  return component ? component.getAttribute('data-list-instance') : null;
};

const replaceInBindings = (element, needle, replacement) => {
  const needle_regexp = new RegExp(needle, 'g');
  findWithin(element, `[data-bind*="${needle}"],[data-list*="${needle}"]`)
      .forEach(elt => {
        ['data-bind', 'data-list'].forEach(attr => {
          const val = elt.getAttribute(attr);
          if (val) {
            elt.setAttribute(attr, val.replace(needle_regexp, replacement));
          }
        });
      });
};

module.exports = {
  addDataBinding,
  removeDataBinding,
  getListInstancePath,
  parseBinding,
  findLists,
  findBindables,
  getBindings,
  replaceInBindings
};
