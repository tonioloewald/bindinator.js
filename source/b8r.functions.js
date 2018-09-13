/**
# functions

Utility functions for preventing a method from being called too frequently.
Not recommended for use on methods which take arguments!

    b8r.debounce(method, min_interval_ms) => debounced method

From a function `f`, create a function that will call f after the provided interval has passed,
the interval being reset if the function is called again.

E.g. you want to call a query "as the user types" but don't want to call until the user pauses
typing for a while or at least has a chance to type a few keys.

A debounced method will call the original function at least once after the debounced version is
called.

    b8r.throttle(method, min_interval_ms) => throttled method

From a function `f`, create a function that will call f if and only if the function hasn't
been called in the last interval.

If you call f several times within the interval, *only the first call will fire*.
*/
/* global module */
'use strict';

const debounce = (orig_fn, min_interval) => {
  let debounce_id;
  return (...args) => {
    if (debounce_id) {
      clearTimeout(debounce_id);
    }
    debounce_id = setTimeout(() => orig_fn(...args), min_interval);
  };
};

const throttle = (orig_fn, min_interval) => {
  let last_call = Date.now() - min_interval;
  return (...args) => {
    const now = Date.now();
    if (now - last_call > min_interval) {
      last_call = now;
      orig_fn(...args);
    }
  };
};

module.exports = { debounce, throttle };
