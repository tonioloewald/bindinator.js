/**
# Ajax Methods

> **Note**: these methods were implemented before `fetch` became available.
> I would recommend using `fetch` for any new code you write.
> [`fetch` documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

`b8r` provides some simple utilities for interacting with REST/json services.

    ajax(url, method='GET', requestData, config)
    json(url, method='GET', requestData, config)
    jsonp(url, callbackParam='callback', timeout=200)
    xml(url, method='GET', requestData, config)

`url` is required; other parameters are optional.

These methods are all `async` (they return `promises` of the specified response).

Usage:

    json('path/to/endpoint', 'PUT', {...}).then(response => { ...});

or:

    const myData = await json('path/to/endpoint', ...)

Also note that these methods are folded into `b8r` by default, so available as
`b8r.ajax`, etc.

`b8r` automatically registers all requests while they're in flight in the registry
entry `b8rRequestsInFlight`. This registry entry is a simple array of the
[XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) objects.

If you want to add your own observers for requests you can use:

    onRequest(method) // to have method called whenever a request updates
    offRequest(method) // to remove the observer method
*/
/* global console, XMLHttpRequest */

const _requestsInFlight = []

const observers = []
const onRequest = method => {
  if (observers.indexOf(method) === -1) observers.push(method)
}
const offRequest = method => {
  const index = observers.indexOf(method)
  if (index > -1) observers.splice(index, 1)
}
const triggerObservers = () => {
  observers.forEach(observer => observer())
}

const _removeInFlightRequest = request => {
  const idx = _requestsInFlight.indexOf(request)
  if (idx > -1) {
    _requestsInFlight.splice(idx, 1)
  }
  triggerObservers()
}

const ajax = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    config = config || {}
    if (!config.headers) {
      config.headers = {}
    }
    var request = new XMLHttpRequest()
    _requestsInFlight.push(request)
    triggerObservers()
    request.open(method || 'GET', url, true)
    /*
there's now a better way of tracking XHRs in flight
https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
This would allow straightforward monitoring of progress for any or all requests in flight
*/
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
      requestData = JSON.stringify(requestData)
      config.headers['Content-Type'] = 'application/json; charset=utf-8'
    }
    for (var prop in config.headers) {
      request.setRequestHeader(prop, config.headers[prop])
    }
    request.send(requestData)
  })
}

/*
note that XHR can parse the response directly if you set
responseType = 'document' before firing trhe request
https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
*/

/* global DOMParser */
const xml = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    ajax(url, method, requestData, config).then(data => {
      try {
        resolve(new DOMParser().parseFromString(data, 'text/xml'))
      } catch (e) {
        console.debug('b8r-error', 'Failed to parse data', data, e)
        reject(e, data)
      }
    }, reject)
  })
}

const json = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    ajax(url, method, requestData, config).then(data => {
      try {
        resolve(JSON.parse(data || 'null'))
      } catch (e) {
        console.debug('b8r-error', 'Failed to parse data', data, e)
        reject(e, data)
      }
    }, reject)
  })
}

let callbackCount = 0
const jsonp = (url, callbackParam = 'callback', timeout = 2000) => {
  return new Promise(function (resolve, reject) {
    const callbackId = `_b8r_jsonp_callback_${++callbackCount}`
    const script = document.createElement('script')
    const cleanup = () => {
      delete window[callbackId]
      document.body.removeChild(script)
    }

    window[callbackId] = (data) => {
      cleanup()
      resolve(data)
    }

    setTimeout(() => {
      if (script.parentElement) {
        cleanup()
        reject(new Error('request timed out'))
      }
    }, timeout)

    script.src = url + `&${callbackParam}=${callbackId}`
    document.body.appendChild(script)
  })
}

const ajaxRequestsInFlight = () => _requestsInFlight

export { ajax, xml, json, jsonp, ajaxRequestsInFlight, onRequest, offRequest }
