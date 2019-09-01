/**
# Ajax Methods

`b8r` provides some simple utilities for interacting with REST/json services.

    ajax(url, method, requestData, config)
    json(url, method, requestData, config)
    jsonp(url, method, requestData, config)

All parameters except `url` are optional.

These methods are all async (they return) `promises` of the specified response).

Usage:

    json('path/to/endpoint', 'PUT', {...}).then(response => { ...});

or:

    const myData = await jason('path/to/endpoint', ...)

Also note that these methods are folded into `b8r` by default, so available as
`b8r.ajax`, etc.
*/
/* global console, XMLHttpRequest */

'use strict'

const _requestsInFlight = []

const _removeInFlightRequest = request => {
  const idx = _requestsInFlight.indexOf(request)
  if (idx > -1) {
    _requestsInFlight.splice(idx, 1)
  }
}

const ajax = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    config = config || {}
    if (!config.headers) {
      config.headers = {}
    }
    var request = new XMLHttpRequest()
    _requestsInFlight.push(request)
    request.open(method || 'GET', url, true)
    request.onreadystatechange = () => {
      if (request.readyState === XMLHttpRequest.DONE) {
        switch (Math.floor(request.status / 100)) {
          case 0:
          case 5:
          case 4:
            _removeInFlightRequest(request)
            reject(request)
            break
          case 3:
            // redirect of some kind
            break
          case 2:
            _removeInFlightRequest(request)
            resolve(request.responseText)
            break
        }
      }
    }
    if (typeof requestData === 'object') {
      if (method === 'GET') {
        throw new Error('GET requests do not support request body data')
      }
      requestData = JSON.stringify(requestData)
      config.headers['Content-Type'] = 'application/json; charset=utf-8'
    }
    for (var prop in config.headers) {
      request.setRequestHeader(prop, config.headers[prop])
    }
    request.send(requestData)
  })
}

const json = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    ajax(url, method, requestData, config).then(data => {
      try {
        resolve(JSON.parse(data || 'null'))
      } catch (e) {
        console.error('Failed to parse data', data, e)
        reject(e, data)
      }
    }, reject)
  })
}

const jsonp = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    ajax(url, method, requestData, config).then(data => {
      let parsed = 'null'
      try {
        parsed = JSON.parse(data)
      } catch (e) {
        console.error('Failed to parse data', data, e)
        reject(e, data)
      }
      resolve(parsed)
    }, reject)
  })
}

const ajaxRequestsInFlight = () => _requestsInFlight

export { ajax, json, jsonp, ajaxRequestsInFlight }
