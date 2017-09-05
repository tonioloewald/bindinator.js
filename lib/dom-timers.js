/**
# DOM Timers

Replacements for setInterval and setTimeout that tie to a DOM element.

Usage:

    domInterval(element, callback, interval_ms);
    domTimeout(element, callback, delay_ms);

*/
/* global module */
'use strict';

const domInterval = (element, callback, interval_ms) => {
  const interval_id = setInterval(() => {
    if (!element.closest('body')) {
      clearInterval(interval_id);
    } else {
      callback();
    }
  }, interval_ms);
};


const domTimeout = (element, callback, delay_ms) => {
  setTimeout(() => {
    if (element && element.closest('body')) {
      callback();
    }
  }, delay_ms);
};

module.exports = {domInterval, domTimeout};
