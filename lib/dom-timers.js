/**
# DOM Timers

Replacements for setInterval and setTimeout that tie to a DOM element.

Usage:

    domInterval(element, callback, interval_ms); // returns the interval id
    domTimeout(element, callback, delay_ms);     // returns the timer id
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
  return interval_id;
};


const domTimeout = (element, callback, delay_ms) => {
  return setTimeout(() => {
    if (element && element.closest('body')) {
      callback();
    }
  }, delay_ms);
};

module.exports = {domInterval, domTimeout};
