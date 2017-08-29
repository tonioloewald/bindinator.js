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
/* global module, console */

'use strict';

function ajax(url, method, request_data, config) {
  return new Promise(function(resolve, reject) {
    config = config || {};
    if (!config.headers) {
      config.headers = [];
    }
    var request = new XMLHttpRequest();
    request.open(method || 'GET', url, true);
    request.onreadystatechange = () => {
      if (request.readyState === XMLHttpRequest.DONE) {
        switch (Math.floor(request.status / 100)) {
          case 0:
          case 5:
          case 4:
            reject(request);
            break;
          case 3:
            // redirect of some kind
            break;
          case 2:
            resolve(request.responseText);
            break;
        }
      }
    };
    if (typeof request_data === 'object') {
      if (method === 'GET') {
        throw 'GET requests do not support request body data';
      }
      request_data = JSON.stringify(request_data);
      config.headers.push(
          {prop: 'Content-Type', value: 'application/json; charset=utf-8'});
    }
    config.headers.forEach(
        header => request.setRequestHeader(header.prop, header.value));
    request.send(request_data);
  });
}

function json (url, method, request_data, config) {
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
}

function jsonp (url, method, request_data, config) {
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
}

module.exports = {ajax, json, jsonp};

