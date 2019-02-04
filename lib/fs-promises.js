/*
# fs promises

Note: this is a nodejs/electron library!

promise wrappers for fs readFile and writeFile
*/
/* global module, process, require */

const fs = require.electron ? require.globalRequire('fs') // electron
  : process ? require('fs') // node
    : false

module.exports = fs ? {
  load: (path, fallback) => new Promise((resolve, reject) =>
    fs.readFile(path, 'utf8', (err, data) => err && fallback === undefined
      ? reject(err)
      : resolve(data || fallback))),

  save: (path, content) => new Promise((resolve, reject) =>
    fs.writeFile(path, content, err => err ? reject(err) : resolve()))
} : false
