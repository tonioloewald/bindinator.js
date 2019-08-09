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
    [=foo] → 17
    bar[1] → 2
    baz[1].id → 42
    [=baz][1][=id] → 42
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
const {getByPath, setByPath, pathParts} = await import('../source/b8r.byPath.js');
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
Test(() => getByPath(obj, '[=foo]')).shouldBe(17);
Test(() => getByPath(obj, 'bar.baz')).shouldBe('hello');
Test(() => getByPath(obj, '[=bar][=baz]')).shouldBe('hello');
Test(() => getByPath(list, '[0].id')).shouldBe(17);
Test(() => getByPath(list, '[id=100].name')).shouldBe('boris');
Test(() => getByPath(list, '[bar.baz=hello].foo')).shouldBe(17);
Test(() => getByPath(list, '[bar.baz=hello].list[id=17].name')).shouldBe('fred');
Test(() => {
  setByPath(obj, 'obj', {bar: 17});
  return obj.obj.bar;
}).shouldBe(17);
Test(() => {
  setByPath(obj, 'obj', null);
  return obj.obj;
}).shouldBe(null);
Test(() => {
  setByPath(obj, '[=obj]', {hello: 'world'});
  return obj.obj.hello;
}).shouldBe('world');
Test(() => {
  setByPath(obj, '[=obj][=hello]', 'mars');
  return obj.obj.hello;
}).shouldBe('mars');
Test(() => {
  setByPath(obj, 'list[id=17]', {id: 17, name: 'vlad'});
  return getByPath(obj, 'list[id=17].name');
}).shouldBe('vlad');
Test(() => {
  setByPath(obj, 'list[id=17]', {id: 17, name: 'vlad'});
  return getByPath(obj, 'list[id=17].name');
}).shouldBe('vlad');
Test(() => {
  setByPath(obj, 'list[id=13]', {id:13, name:'success'});
  return getByPath(obj, 'list[id=13].name');
}, 'insert-by-id works for new elements').shouldBe('success');
Test(() => {
  setByPath(obj, 'list[id=13].name', 'replaced');
  return getByPath(obj, 'list[id=13].name');
}, 'id-path in middle of path works').shouldBe('replaced');
Test(() => {
  setByPath(obj, 'list[id=13]', {id:13, name:'overwrite'});
  return getByPath(obj, 'list').length;
}, 'insert-by-id works does not create duplicates').shouldBe(3);
Test(() => {
  let caught = 0;
  try {
    setByPath(obj, 'list[id=20]', {name: 'failure'});
  } catch(e) {
    caught++;
  }
  return caught;
}, 'item inserted at idPath must satisfy it').shouldBe(1);
~~~~
*/
/* jshint latedef:false */
/* global module, console */

'use strict'

// unique tokens passed to set by path to delete or create properties
const _delete_ = {}
const _newObject_ = {}

function pathSplit (fullPath) {
  const [, model,, start, path] = fullPath.match(/^(.*?)(([.[])(.*))?$/)
  return [model, start === '[' ? '[' + path : path]
}

function pathParts (path) {
  if (!path || path === '/') {
    return []
  }

  if (Array.isArray(path)) {
    return path
  } else {
    const parts = []
    while (path.length) {
      var index = path.search(/\[[^\]]+\]/)
      if (index === -1) {
        parts.push(path.split('.'))
        break
      } else {
        const part = path.substr(0, index)
        path = path.substr(index)
        if (part) {
          parts.push(part.split('.'))
        }
        index = path.indexOf(']') + 1
        parts.push(path.substr(1, index - 2))
        // handle paths dereferencing array element like foo[0].id
        if (path.substr(index, 1) === '.') {
          index += 1
        }
        path = path.substr(index)
      }
    }
    return parts
  }
}

function buildKeypathValueMap (array, keyPath) {
  if (!array._b8r_value_maps) {
    // hide the map of maps in a closure that is returned by a computed property so that
    // the source objects are not "polluted" upon serialization
    const maps = {}
    Object.defineProperty(array, '_b8r_value_maps', { get: () => maps })
  }
  const map = {}
  array.forEach((item, idx) => {
    map[getByPath(item, keyPath) + ''] = idx
  })
  array._b8r_value_maps[keyPath] = map

  return map
}

function getKeypathMap (array, keyPath) {
  if (!array._b8r_value_maps || !array._b8r_value_maps[keyPath]) {
    return buildKeypathValueMap(array, keyPath)
  } else {
    return array._b8r_value_maps[keyPath]
  }
}

function keyToIndex (array, keyPath, keyValue) {
  let idx = getKeypathMap(array, keyPath)[keyValue]
  if (idx === undefined || getByPath(array[idx], keyPath) + '' !== keyValue + '') {
    idx = buildKeypathValueMap(array, keyPath)[keyValue]
  }
  return idx
}

function byKey (obj, key, valueToInsert) {
  if (!obj[key]) {
    obj[key] = valueToInsert
  }
  return obj[key]
}

function byKeyPath (array, keyPath, keyValue, valueToInsert) {
  let idx = keyPath ? keyToIndex(array, keyPath, keyValue) : keyValue
  if (valueToInsert === _delete_) {
    if (!keyPath) {
      delete array[idx]
    } else {
      array.splice(idx, 1)
    }
    return null
  } else if (valueToInsert === _newObject_) {
    if (!keyPath && !array[idx]) {
      array[idx] = {}
    }
  } else if (valueToInsert) {
    if (idx !== undefined) {
      array[idx] = valueToInsert
    } else if (keyPath && getByPath(valueToInsert, keyPath) + '' === keyValue + '') {
      array.push(valueToInsert)
      idx = array.length - 1
    } else {
      throw new Error(`byKeyPath insert failed at [${keyPath}=${keyValue}]`)
    }
  }
  return array[idx]
}

function expectArray (obj) {
  if (!Array.isArray(obj)) {
    console.error('setByPath failed: expected array, found', obj)
    throw new Error('setByPath failed: expected array')
  }
}

function expectObject (obj) {
  if (!obj || obj.constructor !== Object) {
    console.error('setByPath failed: expected Object, found', obj)
    throw new Error('setByPath failed: expected object')
  }
}

function getByPath (obj, path) {
  const parts = pathParts(path)
  var found = obj
  var i, iMax, j, jMax
  for (i = 0, iMax = parts.length; found && i < iMax; i++) {
    var part = parts[i]
    if (Array.isArray(part)) {
      for (j = 0, jMax = part.length; found && j < jMax; j++) {
        var key = part[j]
        found = found[key]
      }
    } else {
      if (!found.length) {
        if (part[0] === '=') {
          found = found[part.substr(1)]
        } else {
          found = undefined
        }
      } else if (part.indexOf('=') > -1) {
        const [keyPath, ...tail] = part.split('=')
        found = byKeyPath(found, keyPath, tail.join('='))
      } else {
        j = parseInt(part, 10)
        found = found[j]
      }
    }
  }
  return found === undefined ? null : found
}

function setByPath (orig, path, val) {
  let obj = orig
  const parts = pathParts(path)

  while (obj && parts.length) {
    const part = parts.shift()
    if (typeof part === 'string') {
      const equalsOffset = part.indexOf('=')
      if (equalsOffset > -1) {
        if (equalsOffset === 0) {
          expectObject(obj)
        } else {
          expectArray(obj)
        }
        const keyPath = part.substr(0, equalsOffset)
        const keyValue = part.substr(equalsOffset + 1)
        obj = byKeyPath(obj, keyPath, keyValue, parts.length ? _newObject_ : val)
        if (!parts.length) {
          return true
        }
      } else {
        expectArray(obj)
        const idx = parseInt(part, 10)
        if (parts.length) {
          obj = obj[idx]
        } else {
          if (val !== _delete_) {
            obj[idx] = val
          } else {
            obj.splice(idx, 1)
          }
          return true
        }
      }
    } else if (Array.isArray(part) && part.length) {
      expectObject(obj)
      while (part.length) {
        const key = part.shift()
        if (part.length || parts.length) {
          // if we're at the end of part.length then we need to insert an array
          obj = byKey(obj, key, part.length ? {} : [])
        } else {
          if (val !== _delete_) {
            obj[key] = val
          } else {
            delete obj[key]
          }
          return true
        }
      }
    } else {
      console.error('setByPath failed: bad path', path)
      throw new Error('setByPath failed')
    }
  }
  console.error(`setByPath failed: "${path}" not found in`, orig)
  throw new Error(`setByPath(${orig}, ${path}, ${val}) failed`)
}

function deleteByPath (orig, path) {
  if (getByPath(orig, path) !== null) {
    setByPath(orig, path, _delete_)
  }
}

export { getByPath, setByPath, deleteByPath, pathParts, pathSplit }
