/**
# Data Bindings

You can programmatically add a data binding using:

    addDataBinding(element, toTarget, path);

And remove a data binding using:

    removeDataBinding(element, toTarget, path);
*/
/* global module */
'use strict';

const addDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  const existing = (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if(existing.indexOf(binding) === -1) {
    existing.push(binding);
    element.setAttribute('data-bind', existing.join(';'));
  }
};

const removeDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  var existing = (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if(existing.indexOf(binding) > -1) {
    existing = existing.filter(exists => exists !== binding);
    if (existing.length) {
      element.setAttribute('data-bind', existing.join(';'));
    } else {
      element.removeAttribute('data-bind');
    }
  }
};

const parseBinding = (binding) => {
  if(!binding.trim()) {
    throw 'empty binding';
  }
  if(binding.indexOf('=') === -1) {
    throw 'binding is missing = sign; probably need a source or target';
  }
  var [,targets, path] = binding.trim().match(/^([^=]*)=(.*)$/m).map(s => s.trim());
  targets = targets.split(',').map(function(target){
    var parts = target.match(/(\w+)(\(([^)]+)\))?/);
    if(!parts) {
      console.error('bad target', target, 'in binding', binding);
      return;
    }
    return parts ? { target: parts[1], key: parts[3] } : null;
  });
  if (!path) {
    console.error('binding does not specify source', binding);
  }
  return {targets, path};
}

module.exports = {addDataBinding, removeDataBinding, parseBinding};
