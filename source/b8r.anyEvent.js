/**
# Any Event

Utility methods for intercepting __ANY__ event before anything else sees it. Note
that if you don't return `true` from the handler the event will be stopped.

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

import {on, off, getEventHandlers} from './b8r.events.js';
import anyElement from './b8r.anyElement.js';

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

const onAny = function(...args) {
  const {event_type, path} = anyArgs(args);
  on(anyElement, event_type, path);
};

const offAny = function(...args) {
  const {event_type, path} = anyArgs(args);
  off(anyElement, event_type, path);
};

const anyListeners = () => getEventHandlers(anyElement);

export {
  anyListeners,
  anyArgs,
  onAny,
  offAny
};
