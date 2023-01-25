/**
# Iterators

    makeArray(arrayish) // => [array]

(**Deprecated**, just use `[...arrayish]`.) Creates a proper array from annoying
array-like objects, like *NodeLists* and *arguments* (although *don't use
arguments, use ...args**).

    last(array) // => last element of array or null

Returns the last element of the array passed, or null if the array is empty.

    forEach(array, (val, idx) => {...});

Just like `Array.prototype.forEach` except you can interrupt it by returning `false`.

    forEachKey(object, (value, key) => {...});

Exactly like forEach except it iterates on the object's keys.

    deepClone(anything)

If `anything` is an object, returns a deepClone, otherwise it returns `anything`.

    mapKeys(object, (value, key) => {... return ...}) // => [map]

Just like map, except it creates an array from an object (using its keys).

    mapEachKey(object, (value, key) => {... return ...}) // => {map}

Just like map, except it creates an object from an object instead of an array
from an array.

    findKey(object, value => { ... return true|false } )
    // => first key whose corresponding value passes the test.

Like findIndex for arrays, but returns key instead.

    filterInPlace(array, value => ... test conditions ...); // filters array in place

Just like filter except it modifies the array in place (using splice).

    filterKeys(object, value => { ... return true|false })
    // => array of keys whose corresponding values pass the test

Returns a list of keys whose corresponding values pass the test.

    filterObject(object, (value, key) => {});

Returns an filtered version of object whose key:value pairs passed the test.

    filterObjectInPlace(object, (value, key) => {});

Removes keys from object if they do not pass a test.

    findValue(object, predicateMethod) // => returns first value that passes
predicateMethod

Like find for arrays, but iterates over keys to find the value.

    assignValues(dest, source); // returns modified dest

This works like object.assign but skips the functions. (It does this
recursively, except for class instances.)

~~~~
// title: iterator tests

Test(() => document.querySelectorAll('div') instanceof Array).shouldBe(false);
Test(() => b8r.makeArray(document.querySelectorAll('div')) instanceof
Array).shouldBe(true);
Test(() => {
  const obj = {a: 10, b: 5};
  const s = [];
  b8r.forEachKey(obj, (val, key) => s.push(key + '=' + val));
  return s.join(',');
}).shouldBe('a=10,b=5');
Test(() => {
  const obj = {a: 10, b: 12, c: 5};
  const map = b8r.mapKeys(obj, (val, key) => `${key} ${val}`);
  return JSON.stringify(map)
}).shouldBe('["a 10","b 12","c 5"]');
Test(() => {
  const obj = {a: 10, b: 5};
  const map = b8r.mapEachKey(obj, (val, key) => key.charCodeAt(0) + val);
  return JSON.stringify(map);
}).shouldBe('{"a":107,"b":103}');
Test(() => {
  const obj = {a: 10, b: 12, c: 5};
  return b8r.findKey(obj, val => val % 3 === 0);
}).shouldBe('b');
Test(() => {
  const a = [1,2,3,4,5,6,7,8,9];
  b8r.filterInPlace(a, x => x % 2 && x % 3);
  return a;
}).shouldBeJSON([1,5,7]);
Test(() => {
  const obj = {a: 10, b: 12, c: 5};
  return JSON.stringify(b8r.filterKeys(obj, val => val % 5 === 0));
}).shouldBe('["a","c"]');
Test(() => {
  const obj = {foo: {a: 1, b: 'hello'}, bar: {a: 17, b: 'world'}};
  return b8r.findValue(obj, value => value.a === 17).b;
}).shouldBe('world');
Test(() => {
  const obj = {a: 10, b: 12, c: 5};
  return JSON.stringify(b8r.filterObject(obj, val => val % 5 === 0));
}).shouldBe('{"a":10,"c":5}');
Test(() => {
  const obj = {a: 10, b: 12, c: 5};
  return JSON.stringify(b8r.filterObject(obj, (val, key) => ['b', 'c'].includes(key)));
}).shouldBe('{"b":12,"c":5}');
Test(() => {
  const obj = {a: 10, b: 12, c: 5};
  b8r.filterObjectInPlace(obj, val => val % 5 === 0);
  return JSON.stringify(obj);
}).shouldBe('{"a":10,"c":5}');
Test(() => {
  const obj = {a: 10, b: 12, c: 5};
  b8r.filterObjectInPlace(obj, (val, key) => ['b', 'c'].includes(key));
  return JSON.stringify(obj);
}).shouldBe('{"b":12,"c":5}');
~~~~
*/

const makeArray = arrayish => [...arrayish]

const forEach = (array, method) => {
  for (let i = 0; i < array.length; i++) {
    if (method(array[i], i) === false) {
      break
    }
  }
}

const last = array => array.length ? array[array.length - 1] : null

const forEachKey = (object, method) => {
  const keys = Object.keys(object)
  for (const key of keys) if (method(object[key], key) === false) break
}

const deepClone = object => {
  if (typeof object !== 'object' || object === null) {
    return object
  }
  if (Array.isArray(object)) {
    return object.map(item => deepClone(item))
  }
  const clone = {}
  forEachKey(object, (value, key) => {
    clone[key] = deepClone(value)
  })
  return clone
}

const mapKeys = (object, method) => {
  const keys = Object.keys(object)
  const map = []
  for (const key of keys) map.push(method(object[key], key))
  return map
}

const mapEachKey = (object, method) => {
  const keys = Object.keys(object)
  const map = {}
  for (const key of keys) map[key] = method(object[key], key)
  return map
}

const findKey = (object, test) => {
  const keys = Object.keys(object)
  for (const key of keys) if (test(object[key], key)) return key
  return null
}

const findValue = (object, test) => {
  const key = findKey(object, test)
  return key ? object[key] : null
}

const filterInPlace = (list, test) => {
  for (let i = list.length - 1; i >= 0; i--) {
    if (!test(list[i], i)) list.splice(i, 1)
  }
}

const filterKeys = (object, test) => {
  const keys = Object.keys(object)
  const filtered = []
  for (const key of keys) if (test(object[key], key)) filtered.push(key)
  return filtered
}

const filterObject = (object, test) => {
  const keys = Object.keys(object)
  const filtered = {}
  for (const key of keys) if (test(object[key], key)) filtered[key] = object[key]
  return filtered
}

const filterObjectInPlace = (object, test) => {
  const keys = Object.keys(object)
  for (const key of keys) if (!test(object[key], key)) delete object[key]
}

const assignValues = (object, ancestor) => {
  forEachKey(ancestor, (val, key) => {
    if (typeof val !== 'function') {
      if (val && val.constructor === Object) {
        object[key] = assignValues({}, val)
      } else {
        object[key] = val
      }
    }
  })
  return object
}

export {
  makeArray,
  last,
  forEach,
  forEachKey,
  deepClone,
  mapKeys,
  mapEachKey,
  findKey,
  findValue,
  filterInPlace,
  filterKeys,
  filterObject,
  filterObjectInPlace,
  assignValues
}
