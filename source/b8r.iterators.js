/**
# Iterators

    makeArray(arrayish) // => [array]

Creates a proper array from annoying array-like objects,
like *NodeLists* and *arguments* (although *don't use arguments, use ...args**).

    forEachKey(object, method)

Exactly like forEach except it iterates on the object's keys.

    mapEachKey(object, method) // => {map}

Just like map, except it creates an object from an object instead of an array from an array.

~~~~
Test(() => document.querySelectorAll('div') instanceof Array).shouldBe(false);
Test(() => b8r.makeArray(document.querySelectorAll('div')) instanceof Array).shouldBe(true);
Test(() => {
  const obj = {a: 10, b: 5};
  const s = [];
  b8r.forEachKey(obj, (val, key) => s.push(key + '=' + val));
  return s.join(',');
}).shouldBe('a=10,b=5');
Test(() => {
  const obj = {a: 10, b: 5};
  const map = b8r.mapEachKey(obj, (val, key) => key.charCodeAt(0) + val);
  return JSON.stringify(map);
}).shouldBe('{"a":107,"b":103}');
~~~~
*/
/* global module */

(function(module){
  'use strict';

  const makeArray = arrayish => [].slice.apply(arrayish);

  const forEachKey = (object, method) => {
    var key;
    for(var i = 0, keys = Object.keys(object); i < keys.length; i++) {
      key = keys[i];
      method(object[key], key);
    }
  };

  const mapEachKey = (object, method) => {
    const map = {};
    forEachKey(object, (val, key) => map[key] = method(val, key));
    return map;
  };

  module.exports = {makeArray, forEachKey, mapEachKey};
}(module));
