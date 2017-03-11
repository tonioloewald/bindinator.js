/**
# Performance

Simple tools for logging performance.

To log a single event:

    log(log_name, log_entry_name);

To time an event:

    logStart(log_name, log_entry_name);
    ... do stuff
    logEnd(log_name, log_entry_name);

The log entry name need not be unique, but it should be consistent.

To look at results:

    showLogs(); // => list of available logs
    showLogs(log_name); // => shows log as a table in console
    showLogs(log_name, minimum_total_ms); // => shows log filtered

Each log entry will be displayed with a minimum, maximum, and median
time value.
*/
/* global module, require, console */
'use strict';

const logs = {};
const {mapEachKey, filterObject} = require('./b8r.iterators.js');

const medianOfSortedArray = values => (
  values[Math.floor(values.length / 2)] +
  values[Math.floor(values.length / 2 - 0.5)]
)/2;

const perf = {
  log: (log_name, entry_name) => {
    if(!logs[log_name]) {
      logs[log_name] = {};
    }
    const log = logs[log_name];
    if (!log[entry_name]) {
      log[entry_name] = {count: 0, times: [], total_time: 0};
    }
    log[entry_name].count += 1;
    return log[entry_name];
  },

  logStart: (log_name, entry_name) => {
    perf.log(log_name, entry_name).start = Date.now();
  },

  logEnd: (log_name, entry_name) => {
    const log = logs[log_name][entry_name];
    const elapsed = Date.now() - log.start;
    delete(log.start);
    log.times.push(elapsed);
    log.total_time += elapsed;
  },

  showLogs: (which, threshold) => {
    if (which) {
      var mapped = mapEachKey(logs[which], val => {
        const {count, times, total_time} = val;
        var best, worst, median;
        if (times.length) {
          const sorted = times.sort();
          best = sorted[0];
          worst = sorted[sorted.length - 1];
          median = medianOfSortedArray(sorted);
        } else {
          best = worst = median = '';
        }
        return {count, best, median, worst, total_time};
      });
      if(threshold) {
        mapped = filterObject(mapped, entry => entry.total_time > threshold);
      }
      console.table(mapped, ['count', 'best', 'median', 'worst', 'total_time']);
    } else {
      console.table(logs, []);
    }
  },
};

module.exports = perf;
