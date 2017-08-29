/* global require, __dirname */
'use strict';

const SOCKET = 8017;
const CERT_PATH = 'localhost-ssl/public.pem';
const KEY_PATH = 'localhost-ssl/private.pem';
const WEB_ROOT = __dirname;

const https = require('https');
const fs = require('fs');
const url = require('url');

const options = {
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH)
};

const handler_map = []; // { handler },
  // handler is a function;
  // handler.test is an endpoint test,
  // handler.methods is array of methods

const on = (methods, endpoint, handler) => {
  handler.methods = Array.isArray(methods) ? methods : [methods];

  if (typeof endpoint === 'function') {
    handler.test = endpoint;
  } else if (endpoint instanceof RegExp) {
    handler.test = path => endpoint.test(path);
  } else if (typeof endpoint === 'string') {
    handler.test = path => path === endpoint;
  } else {
    throw 'expect endpoint to be a string, RegExp, or test function';
  }

  handler_map.push(handler);
};

const mime_types = {
  svg: 'image/svg+xml',
  css: 'text/css',
  jpg: 'image/jpeg',
  png: 'image/png',
  json: 'application/json',
};

const handle_static_request = (req, res) => {
  const url_obj = url.parse(req.url);
  fs.readFile(WEB_ROOT + url_obj.pathname, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
    } else {
      const file_extension = url_obj.pathname.split('.').pop();
      const mime_type = mime_types[file_extension];
      if (mime_type) {
        res.setHeader('content-type', mime_type);
      }
      res.writeHead(200);
      res.end(data);
    }
  });
};

on('GET', '/api', (req, res) => {
  res.writeHead(200);
  res.end('hello api\n');
});

on('GET', /\/api\/files\/.*/, (req, res) => {
  res.writeHead(200);
  res.end('hello files\n');
});

// TODO
// Pass url_obj rather than generate it twice
// Allow request handlers to see the server and subdomain
const request_handler = (req, res) => {
  const url_obj = url.parse(req.url);
  // console.log(req.method, url_obj.pathname, url_obj.query);
  const handler = handler_map.find(
    handler => handler.test(url_obj.pathname) && handler.methods.indexOf(req.method) !== -1
  ) || handle_static_request;
  handler(req, res);
};

https.createServer(options, request_handler).listen(SOCKET);
