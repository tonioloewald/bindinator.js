/* global require, __dirname */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');

const settings = {
  socket: 8017,
  web_root: __dirname,
  cert_path: 'localhost-ssl/public.pem',
  key_path: 'localhost-ssl/private.pem',
};

process.argv.slice(2).forEach(arg => {
  const parts = arg.split(':').map(s => s.trim());
  if (parts[0]) {
    settings[parts[0]] = parts.length === 2 ? parts[1] : true;
  }
});

console.log(settings);

const options = settings.https ? 
  {
    key: fs.readFileSync(settings.key_path),
    cert: fs.readFileSync(settings.cert_path),
  } : 
  {};

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
  js: 'text/javascript',
};

const handle_static_request = (req, res) => {
  const url_obj = url.parse(req.url);
  fs.readFile(settings.web_root + url_obj.pathname, (err, data) => {
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

if (settings.https) {
  https.createServer(options, request_handler).listen(settings.socket);
} else {
  http.createServer({}, request_handler).listen(settings.socket);
}
