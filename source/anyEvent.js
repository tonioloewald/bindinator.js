/**
# anyEvents — priority access

`b8r` provides a mechanism for intercepting events before they do anything
else. This is incredibly powerful for dealing with complex user interface interactions.

> **Caution** if you don't return `true` from the handler the event will be stopped.

    b8r.onAny(eventType, object, method) => handlerRef

creates an event handler that will get first access to any event; returns a
reference for purposes of removal

    b8r.offAny(handlerRef,...)

removes all the handlerRefs passed

    b8r.anyListeners()

returns active any listeners.

**Note** that this works *exactly* like an invisible element in front of
everything else for purposes of propagation.

*/

import { on, off, getEventHandlers } from './events.js'
import anyElement from './anyElement.js'

const anyArgs = args => {
  var eventType, object, method, path
  if (args.length === 2) {
    [eventType, path] = args
  } else {
    [eventType, object, method] = args
    path = object + '.' + method
  }
  return { eventType, path }
}

const onAny = function (...args) {
  const { eventType, path } = anyArgs(args)
  on(anyElement, eventType, path)
}

const offAny = function (...args) {
  const { eventType, path } = anyArgs(args)
  off(anyElement, eventType, path)
}

const anyListeners = () => getEventHandlers(anyElement)

export {
  anyListeners,
  anyArgs,
  onAny,
  offAny
}
