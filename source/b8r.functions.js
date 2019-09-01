/**
# functions

This module provides convenient access to the `AsyncFunction` constructor.

    const f = new b8r.AsyncFunction(...args, code)

Utility functions for preventing a method from being called too frequently.
Not recommended for use on methods which take arguments!

    b8r.debounce(method, minInterval_ms) => debounced method

From a function `f`, create a function that will call f after the provided interval has passed,
the interval being reset if the function is called again.

E.g. you want to call a query "as the user types" but don't want to call until the user pauses
typing for a while or at least has a chance to type a few keys.

> A debounced method will call the original function at least once after the debounced version is
called.

    b8r.throttle(method, minInterval_ms) => throttled method

From a function `f`, create a function that will call f if and only if the function hasn't
been called in the last interval.

> If you call f several times within the specified interval, *only the first call will fire*.
*/
/* global module */
'use strict'

const debounce = (origFn, minInterval) => {
  let debounceId
  return (...args) => {
    if (debounceId) clearTimeout(debounceId)
    debounceId = setTimeout(() => origFn(...args), minInterval)
  }
}

const throttle = (origFn, minInterval) => {
  let previousCall = Date.now() - minInterval
  return (...args) => {
    const now = Date.now()
    if (now - previousCall > minInterval) {
      previousCall = now
      origFn(...args)
    }
  }
}

const AsyncFunction = async function () {}.constructor

export { AsyncFunction, debounce, throttle }
