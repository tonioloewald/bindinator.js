/**
# Object Path Methods
Copyright ©2016-2017 Tonio Loewald

    getByPath(obj, 'path.to.value')

Obtains a value inside an object by a path, e.g.
getByPath(obj, "foo.bar") is the equivalent of obj.foo.bar
if path is not set or is set to '/' then obj is returned.

    setByPath(obj, 'path.to.value', new_value)

sets a value inside an object by a path,
e.g. setByPath(obj, "foo.bar", 17) is the equivalent of obj.foo.bar = 17.

    deleteByPath(obj, 'path.to.value');

if a value exists at the stipulated path it will be deleted. If not, nothing will happen.

## Examples

Given:

    const obj = {
      foo: 17,
      bar: [1,2,3],
      baz: [
        {id: 17, name: "fred"},
        {id: 42, name: "bloggs"},
        {id: 99, name: "feldon", deeper: {and_deeper: 4}}
      ]
    }

The following paths work:

    foo → 17
    bar[1] → 2
    baz[1].id → 42
    baz[id=17].name → "fred"
    baz[deeper.and_deeper=4].name → "fred"

The last two examples are examples of **id paths**…

## id paths

Arrays of objects, including heterogenous objects, are a common pattern
in web applications. E.g. you might have an array of messages and the messages
may have different types.

Using id paths, it is possible to reference elements by an id path and
corresponding value rather than simple indices. This allows efficient updating
of lists, e.g.

```
<p>Inspect the DOM to see what's going on!</p>
<ul>
  <li
    data-list="_component_.list:id"
    data-bind="text=.name"
  ></li>
</ul>
<input data-bind="value=_component_.list[id=12].name">
<script>
  list = [
    {id: 5, name: "Tom"},
    {id: 75, name: 'Dick'},
    {id: 12, name: 'Harry'}
  ];
  set({list});
</script>
```

## Type Matching

setByPath tries to match the type of values that are replaced, e.g.

    const obj = {foo: 17};
    setByPath(obj, 'foo', '2'); // '2' will be converted to a Number

This can be tricky when dealing with nullable objects, in particular:

    const obj = {foo: false};
    setByPath(obj, {bar: 17}); // {bar: 17} will be converted to Boolean true

In this case, you want the absence of an object to be either undefined
(or a missing value) or `null`:

    const obj = {foo: null};
    setByPath(obj, {bar: 17}); // {bar: 17} will not be converted

~~~~
const {getByPath, setByPath, pathParts} = require('source/b8r.byPath.js');
const obj = {
  foo: 17,
  bar: {baz: 'hello'},
  list: [
    {id: 17, name: 'fred'},
    {id: 100, name: 'boris'}
  ],
  bool: false,
  obj: null,
};

const list = [
  {id: 17, name: 'fred'},
  {id: 100, name: 'boris'},
  obj
]

Test(() => getByPath(obj, 'foo')).shouldBe(17);
Test(() => getByPath(obj, 'bar.baz')).shouldBe('hello');
Test(() => getByPath(list, '[0].id')).shouldBe(17);
Test(() => getByPath(list, '[id=100].name')).shouldBe('boris');
Test(() => getByPath(list, '[bar.baz=hello].foo')).shouldBe(17);
Test(() => getByPath(list, '[bar.baz=hello].list[id=17].name')).shouldBe('fred');
Test(() => {
  setByPath(obj, 'foo', '42');
  return obj.foo;
}).shouldBe(42);
Test(() => {
  setByPath(obj, 'bool', {bar: 17});
  return obj.bool;
}).shouldBe(true);
Test(() => {
  setByPath(obj, 'obj', {bar: 17});
  return obj.obj.bar;
}).shouldBe(17);
Test(() => {
  setByPath(obj, 'obj', null);
  return obj.obj;
}).shouldBe(null);
~~~~
*/
/* jshint latedef:false */
/* global module, console */

'use strict';

function pathSplit(full_path) {
  let [, model,, start, path] = full_path.match(/^(.*?)(([\.\[])(.*))?$/);
  if (start === '[') {
    path = '[' + path;
  }
  return [model, path];
}

function pathParts(path) {
  if (!path || path === '/') {
    return [];
  }

  if (Array.isArray(path)) {
    return path;
  } else {
    const parts = [];
    while (path.length) {
      var index = path.search(/\[[^\]]+\]/);
      if (index === -1) {
        parts.push(path.split('.'));
        break;
      } else {
        const part = path.substr(0, index);
        path = path.substr(index);
        if (part) {
          parts.push(part.split('.'));
        }
        index = path.indexOf(']') + 1;
        parts.push(path.substr(1, index - 2));
        // handle paths dereferencing array element like foo[0].id
        if (path.substr(index, 1) === '.') {
          index += 1;
        }
        path = path.substr(index);
      }
    }
    return parts;
  }
}

let _keypath_maps = []; // {array, key_path, value_map{}, key_filter}

function getKeypathMap (array, key_path) {
  return _keypath_maps.find(item => item.array === array && item.key_path === key_path) || buildKeypathMap(array, key_path);
}

function buildKeypathValueMap(array, key_path) {
  const map = {};
  array.forEach((item, idx) => map[getByPath(item, key_path) + ''] = idx);
  return map;
}

function buildKeypathMap(array, key_path) {
  const value_map = buildKeypathValueMap(array, key_path);
  const record = {
    array,
    key_path,
    key_filter: item => getByPath(item, key_path),
    value_map,
  };
  _keypath_maps.push(record);
  return record;
}

function byKeyPath(array, key_path, key_value) {
  const _keypath_map = getKeypathMap(array, key_path);
  let idx = _keypath_map.value_map[key_value];
  if (idx === undefined || getByPath(array[idx], key_path) + '' !== key_value + '') {
    _keypath_map.value_map = buildKeypathValueMap(array, key_path);
    idx = _keypath_map.value_map[key_value];
  }
  /*
  let idx = array.findIndex(item => getByPath(item, key_path) + '' == key_value);
  */
  return array[idx];
}

function getByPath(obj, path) {

  const parts = pathParts(path);
  var found = obj;
  var i, max_i, j, max_j;
  for (i = 0, max_i = parts.length; found && i < max_i; i++) {
    var part = parts[i];
    if (Array.isArray(part)) {
      for (j = 0, max_j = part.length; found && j < max_j; j++) {
        var key = part[j];
        found = found[key];
      }
    } else {
      if (!found.length) {
        found = undefined;
      } else if (part.indexOf('=') > -1) {
        const [key_path, ...tail] = part.split('=');
        found = byKeyPath(found, key_path, tail.join('='));
      } else {
        j = parseInt(part, 10);
        found = found[j];
      }
    }
  }
  return found === undefined ? null : found;
}

// unique token passed to set by path to delete properties
const _delete_ = {};

function setByPath(orig, path, val) {
  let obj = orig;
  const parts = pathParts(path);

  while (obj && parts.length) {
    const part = parts.shift();
    if (typeof part === 'string') {
      if (!Array.isArray(obj)) {
        console.error('setByPath failed: expected array, found', obj);
        throw 'setByPath failed: expected array';
      }
      const equals_offset = part.indexOf('=');
      if (equals_offset > -1) {
        const key_path = part.substr(0, equals_offset);
        const key_value = part.substr(equals_offset + 1);
        obj = byKeyPath(obj, key_path, key_value);
        if (!parts.length) {
          if (typeof obj === 'object') {
            Object.assign(obj, val);
            return true;
          } else {
            console.error('setByPath failed): expected object, found', obj);
            throw 'setByPath failed: expected object';
          }
        }
      } else {
        const idx = parseInt(part, 10);
        if (parts.length) {
          obj = obj[idx];
        } else {
          if (val !== _delete_) {
            obj[idx] = matchTypes(val, obj[idx]);
          } else {
            delete obj[idx];
          }
          return true;
        }
      }
    } else if (Array.isArray(part) && part.length) {
      while (part.length) {
        var key = part.shift();
        if (part.length || parts.length) {
          if (!obj[key]) {
            obj[key] = {};
          }
          obj = obj[key];
        } else {
          if (val !== _delete_) {
            obj[key] = matchTypes(val, obj[key]);
          } else {
            delete obj[key];
          }
          return true;
        }
      }
    } else {
      console.error('setByPath failed: bad path', path);
      throw 'setByPath failed';
    }
  }
  console.error(`setByPath failed): "${path}" not found in`, orig);
  throw `setByPath(${orig}, ${path}, ${val}) failed`;
}

function deleteByPath(orig, path) {
  if (getByPath(orig, path) !== null) {
    setByPath(orig, path, _delete_);
  }
}

function matchTypes(value, oldValue) {
  if (value == null || oldValue == null || typeof value === typeof oldValue) { //jshint ignore:line
    return value;
  } else if (typeof value === 'string' && typeof oldValue === 'number') {
    return parseFloat(value);
  } else if (typeof oldValue === 'string') {
    return value + '';
  } else if (typeof oldValue === 'boolean') {
    return value === 'false' ?
                      false :
                      !!value;  // maps undefined || null || '' || 0 => false
  } else if (oldValue !== undefined && oldValue !== null) {
    console.warn('setByPath found non-matching types');
  }
  return value;
}

module.exports = {getByPath, setByPath, deleteByPath, matchTypes, pathParts, pathSplit};

