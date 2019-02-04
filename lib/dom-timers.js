/**
# DOM Timers

Replacements for `setInterval` and `setTimeout` that tie to a DOM element (clearing
themselves when the element is gone).

Usage:

    domInterval(element, callback, intervalMs); // returns the interval id
    domTimeout(element, callback, delayMs);     // returns the timer id
*/

import { isInBody } from '../source/b8r.dom.js'

export const domInterval = (element, callback, intervalMs) => {
  const intervalId = setInterval(() => {
    if (!isInBody(element)) {
      clearInterval(intervalId)
    } else {
      callback()
    }
  }, intervalMs)
  return intervalId
}

export const domTimeout = (element, callback, delayMs) => {
  return setTimeout(() => {
    if (element && isInBody(element)) {
      callback()
    }
  }, delayMs)
}
