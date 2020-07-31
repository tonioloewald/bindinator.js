/**
# Resize

> A simple wrapper library for the new
> [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
> class. It triggers 'resize' events on elements whose size has changed using a single
> observer, and unobserves elements that have been removed from the DOM.

`relayTo` causes `resize` events to be sent to an element when it changes size.
`resize` does this and also adds a `resize` event binding to the element.

Resize events are throttled and debounced to 250ms.

Usage:

    relayTo(element);

`relayTo` dispatches resize events to the specified element, if you want to handle the events
or bind event handlers yourself.

    resize(element, 'path.to.method');

`resize` is a convenience method for creating a b8r resize event handler and automatically
relaying resize events to the element.
*/

import b8r from '../source/b8r.js'

const elements = []
const resizedQueue = []

const cleanup = () => {
  b8r.filterInPlace(elements, element => {
    if (document.body.contains(element)) {
      return true
    }
    observer.unobserve(element)
    return false
  })
}

const fireResizeEvents = b8r.throttleAndDebounce(() => {
  let cleanupNeeded = false
  for (const element of resizedQueue) {
    if (document.body.contains(element)) {
      b8r.trigger('resize', element)
    } else {
      cleanupNeeded = true
    }
  }
  if (cleanupNeeded) {
    cleanup()
  }
  resizedQueue.splice(0)
}, 250)

/* global ResizeObserver */
const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    const element = entry.target
    if (!resizedQueue.includes(element)) {
      resizedQueue.push(element)
    }
  }
  fireResizeEvents()
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
