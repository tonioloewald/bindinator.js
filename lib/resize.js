/**
# Resize

Request resize events be channeled to specific DOM elements, resize events are
automatically throttled down to once per 100ms.

Usage:

    resize(element, 'path.to.method');

Convenience method for creating a b8r resize event handler and automatically
relaying resize events to the element.

    resize.relayTo(element);

Relays (throttled) resize events from the window to the specified element if you
want to handle them yourself.
Only does this once per element. If the element is removed from the DOM then it
will be deregistered automatically.
*/

/* global require, module */

(function(module) {
  'use strict';

  const b8r = require('source/b8r.js');
  var resizeListeners = [];

  var lastResize = 0;
  function handleResize(evt) {
    clearTimeout(lastResize);
    lastResize = setTimeout(() => {
      resizeListeners =
          resizeListeners.filter(target => !!target.closest('body'));
      resizeListeners.forEach(target => {
        b8r.trigger('resize', target);
      });
    }, 100);
  }

  window.addEventListener('resize', handleResize);

  function relayTo(element) {
    if (resizeListeners.indexOf(element) === -1) {
      resizeListeners.push(element);
    }
  }

  function resize(element, ...args) {
    relayTo(element);
    b8r.on(element, 'resize', ...args);
  }

  resize.relayTo = relayTo;

  module.exports = resize;
}(module));