/**
# Ajax Methods

Copyright ©2016-2017 Tonio Loewald

    ajax(url, method, request_data, config)
    json(url, method, request_data, config)
    jsonp(url, method, request_data, config)

All parameters except url are optional.

These methods generate promises of the specified response. Usage:

    json('path/to/endpoint', 'PUT', {...}).then(response => { ...});

Also note that these methods are folded into b8r by default, so available as
b8r.ajax, etc.
*/
/* global require, module, console */

'use strict';

const {logStart, logEnd} = require('./b8r.perf.js');

const _requests_in_flight = [];

const _remove_in_flight_request = request => {
  const idx = _requests_in_flight.indexOf(request);
  if (idx > -1) {
    _requests_in_flight.splice(idx, 1);
  }
};

const ajax = (url, method, request_data, config) => {
  return new Promise(function(resolve, reject) {
    config = config || {};
    if (!config.headers) {
      config.headers = [];
    }
    var request = new XMLHttpRequest();
    _requests_in_flight.push(request);
    logStart('ajax (request)', url);
    request.open(method || 'GET', url, true);
    request.onreadystatechange = () => {
      if (request.readyState === XMLHttpRequest.DONE) {
        switch (Math.floor(request.status / 100)) {
          case 0:
          case 5:
          case 4:
            _remove_in_flight_request(request);
            logEnd('ajax (request)', url);
            reject(request);
            break;
          case 3:
            // redirect of some kind
            break;
          case 2:
            _remove_in_flight_request(request);
            logEnd('ajax (request)', url);
            logStart('ajax (callback)', url);
            resolve(request.responseText);
            logEnd('ajax (callback)', url);
            break;
        }
      }
    };
    if (typeof request_data === 'object') {
      if (method === 'GET') {
        throw 'GET requests do not support request body data';
      }
      request_data = JSON.stringify(request_data);
      config.headers.push({prop: 'Content-Type', value: 'application/json; charset=utf-8'});
    }
    config.headers.forEach(
        header => request.setRequestHeader(header.prop, header.value));
    request.send(request_data);
  });
};

const json = (url, method, request_data, config) => {
  return new Promise(function(resolve, reject) {
    ajax(url, method, request_data, config).then(data => {
      try {
        resolve(JSON.parse(data || 'null'));
      } catch(e) {
        console.error('Failed to parse data', data, e);
        reject(e, data);
      }
    }, reject);
  });
};

const jsonp = (url, method, request_data, config) => {
  return new Promise(function(resolve, reject) {
    ajax(url, method, request_data, config).then(data => {
      let parsed = 'null';
      try {
        parsed = JSON.parse(data);
      } catch(e) {
        console.error('Failed to parse data', data, e);
        reject(e, data);
      }
      resolve(parsed);
    }, reject);
  });
};

const ajax_requests_in_flight = () => _requests_in_flight;

module.exports = {ajax, json, jsonp, ajax_requests_in_flight};

