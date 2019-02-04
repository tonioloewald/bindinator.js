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

    resize.trigger();

Use this to fire all resize handlers (e.g. if you've done a bunch of layout work);
*/

import b8r from '../source/b8r.js'
let resizeListeners = []

let lastResize = 0
export const handleResize = () => {
  clearTimeout(lastResize)
  lastResize = setTimeout(() => {
    resizeListeners = resizeListeners.filter(target => b8r.isInBody(target))
    resizeListeners.forEach(target => b8r.trigger('resize', target))
  }, 100)
}

window.addEventListener('resize', handleResize)

export const relayTo = (element) => {
  if (resizeListeners.indexOf(element) === -1) {
    resizeListeners.push(element)
  }
}

export const resize = (element, ...args) => {
  relayTo(element)
  b8r.on(element, 'resize', ...args)
}
