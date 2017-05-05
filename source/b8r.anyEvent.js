/**
# Any Event

Utility methods for intercepting ANY event before anything else sees it. Note
that if you don't return true from the handler the event will be stopped.

    b8r.onAny(event_type, object, method) => handlerRef

creates an event handler that will get first access to any event; returns a
reference for purposes of removal

    b8r.offAny(handlerRef,...)

removes all the handlerRefs passed

    b8r.anyListeners()

returns active any listeners.

**Note** that this works *exactly* like an invisible element in front of
everything else for purposes of propagation.

*/
/* global module, require */
'use strict';

const {on, off, getEventHandlers} = require('./b8r.events.js');
const {create} = require('./b8r.dom.js');

const anyArgs = args => {
  var event_type, object, method, path;
  if (args.length === 2) {
    [event_type, path] = args;
  } else {
    [event_type, object, method] = args;
    path = object + '.' + method;
  }
  return {event_type, path};
};

var _anyElement = null;
const onAny = function(...args) {
  const {event_type, path} = anyArgs(args);
  if (!_anyElement) {
    _anyElement = create('div');
  }
  on(_anyElement, event_type, path);
};

const offAny = function(...args) {
  const {event_type, path} = anyArgs(args);
  if (_anyElement) {
    off(_anyElement, event_type, path);
    if (!_anyElement.getAttribute('data-event')) {
      _anyElement = null;
    }
  }
};

const anyListeners = () => _anyElement ? getEventHandlers(_anyElement) : [];

const anyElement = () => _anyElement;

module.exports = {
  anyListeners,
  anyArgs,
  onAny,
  offAny,
  anyElement
};
