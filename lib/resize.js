/**
# Resize

> A simple wrapper library for the new
> [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) 
> class. It triggers 'resize' events on elements whose size has changed using a single
> observer, and unobserves elements that have been removed from the DOM.

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

const elements = []

const cleanup = () => {
  b8r.filterInPlace(elements, element => {
    if (document.body.contains(element)) {
      return true
    }
    observer.unobserve(element)
    return false
  })
}

const observer = new ResizeObserver(entries => {
  for(const entry of entries) {
    const element = entry.target
    if (document.body.contains(element)) {
      b8r.trigger('resize', element)
    } else {
      cleanup()
    }
  }
})

export const relayTo = (element) => {
  if (elements.includes(element)) return
  elements.push(element)
  observer.observe(element)
  cleanup()
}

export const resize = (element, ...args) => {
  relayTo(element)
  b8r.on(element, 'resize', ...args)
}
