/**
# DOM Interval

Creates an interval timer that automatically destroys itself when the specified DOM element is gone.

Usage:

    domInterval(element, interval_ms, callback_method);
*/
/* global module */
(function(module){
  'use strict';

  module.exports = (element, callback, interval) => {
    const interval_id = setInterval(() => {
      callback();
      if(!element.closest('body')) {
        clearInterval(interval_id);
      }
    }, interval);
  };
}(module));