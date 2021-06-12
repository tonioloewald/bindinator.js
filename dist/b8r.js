'use strict';

function _interopNamespace(e) {
  if (e && e.__esModule) { return e; } else {
    var n = {};
    if (e) {
      Object.keys(e).forEach(function (k) {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      });
    }
    n['default'] = e;
    return n;
  }
}

const observerShouldBeRemoved = {};
const isMacOS = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

var constants = /*#__PURE__*/Object.freeze({
  __proto__: null,
  observerShouldBeRemoved: observerShouldBeRemoved,
  isMacOS: isMacOS
});

/**
# Object Path Methods
Copyright ©2016-2019 Tonio Loewald

> Note that these are low-level methods that `b8r` does not expose.
> `b8r.getByPath` and `b8r.setByPath` are deprecated (use `b8r.set` and `b8r.get` instead).
> See the [Data Registry](?source=source/b8r.registry.js) documentation for more useful information.

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
// title: getByPath, setByPath, and pathParts tests

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

const error = console.error; // prevent errors from leaking to console
errors = []
console.error = message => errors.push(message)

Test(() => getByPath(obj, '')).shouldBe(obj);
Test(() => getByPath(obj, '/')).shouldBe(obj);
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
Test(() => errors, 'bad list bindings reported').shouldBeJSON(["inconsistent id-path 'bar.baz' used for array, expected 'id'"]);

console.error = error
~~~~
*/
/* global console */

// unique tokens passed to set by path to delete or create properties

let uniqueId = 0;
const unique = () => uniqueId++;

const _delete_ = {};
const _newObject_ = {};

function pathSplit (fullPath) {
  const [, model,, start, path] = fullPath.match(/^(.*?)(([.[])(.*))?$/);
  return [model, start === '[' ? '[' + path : path]
}

function pathParts (path) {
  if (!path || path === '/') {
    return []
  }

  if (Array.isArray(path)) {
    return path
  } else {
    const parts = [];
    while (path.length) {
      var index = path.search(/\[[^\]]+\]/);
      if (index === -1) {
        parts.push(path.split('.'));
        break
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
    return parts
  }
}

function buildIdPathValueMap (array, idPath) {
  if (array && !array._b8r_id_path) {
    array._b8r_id_path = idPath;
  } else if (array._b8r_id_path !== idPath) {
    console.error(`inconsistent id-path '${idPath}' used for array, expected '${array._b8r_id_path}'`);
  }
  if (!array._b8r_value_maps) {
    // hide the map of maps in a closure that is returned by a computed property so that
    // the source objects are not "polluted" upon serialization
    const maps = {};
    Object.defineProperty(array, '_b8r_value_maps', { get: () => maps });
  }
  const map = {};
  if (idPath === '_auto_') {
    array.forEach((item, idx) => {
      if (item._auto_ === undefined) item._auto_ = unique();
      map[item._auto_ + ''] = idx;
    });
  } else {
    array.forEach((item, idx) => {
      map[getByPath(item, idPath) + ''] = idx;
    });
  }
  array._b8r_value_maps[idPath] = map;
  return map
}

function getIdPathMap (array, idPath) {
  if (!array._b8r_value_maps || !array._b8r_value_maps[idPath]) {
    return buildIdPathValueMap(array, idPath)
  } else {
    return array._b8r_value_maps[idPath]
  }
}

function keyToIndex (array, idPath, idValue) {
  idValue = idValue + '';
  /*
  if (array.length > 200) {
    return array.findIndex(a => getByPath(a, idPath) + '' === idValue)
  } */
  let idx = getIdPathMap(array, idPath)[idValue];
  if (idx === undefined || getByPath(array[idx], idPath) + '' !== idValue) {
    idx = buildIdPathValueMap(array, idPath)[idValue];
  }
  return idx
}

function byKey (obj, key, valueToInsert) {
  if (!obj[key]) {
    obj[key] = valueToInsert;
  }
  return obj[key]
}

function byIdPath (array, idPath, idValue, valueToInsert) {
  let idx = idPath ? keyToIndex(array, idPath, idValue) : idValue;
  if (valueToInsert === _delete_) {
    if (!idPath) {
      delete array[idx];
    } else {
      array.splice(idx, 1);
    }
    return null
  } else if (valueToInsert === _newObject_) {
    if (!idPath && !array[idx]) {
      array[idx] = {};
    }
  } else if (valueToInsert) {
    if (idx !== undefined) {
      array[idx] = valueToInsert;
    } else if (idPath && getByPath(valueToInsert, idPath) + '' === idValue + '') {
      array.push(valueToInsert);
      idx = array.length - 1;
    } else {
      throw new Error(`byIdPath insert failed at [${idPath}=${idValue}]`)
    }
  }
  return array[idx]
}

function expectArray (obj) {
  if (!Array.isArray(obj)) {
    console.error('setByPath failed: expected array, found', obj);
    throw new Error('setByPath failed: expected array')
  }
}

function expectObject (obj) {
  if (!obj || obj.constructor !== Object) {
    console.error('setByPath failed: expected Object, found', obj);
    throw new Error('setByPath failed: expected object')
  }
}

function getByPath (obj, path) {
  const parts = pathParts(path);
  var found = obj;
  var i, iMax, j, jMax;
  for (i = 0, iMax = parts.length; found && i < iMax; i++) {
    var part = parts[i];
    if (Array.isArray(part)) {
      for (j = 0, jMax = part.length; found && j < jMax; j++) {
        var key = part[j];
        found = found[key];
      }
    } else {
      if (!found.length) {
        if (part[0] === '=') {
          found = found[part.substr(1)];
        } else {
          found = undefined;
        }
      } else if (part.indexOf('=') > -1) {
        const [idPath, ...tail] = part.split('=');
        found = byIdPath(found, idPath, tail.join('='));
      } else {
        j = parseInt(part, 10);
        found = found[j];
      }
    }
  }
  return found === undefined ? null : found
}

function setByPath (orig, path, val) {
  let obj = orig;
  const parts = pathParts(path);

  while (obj && parts.length) {
    const part = parts.shift();
    if (typeof part === 'string') {
      const equalsOffset = part.indexOf('=');
      if (equalsOffset > -1) {
        if (equalsOffset === 0) {
          expectObject(obj);
        } else {
          expectArray(obj);
        }
        const idPath = part.substr(0, equalsOffset);
        const idValue = part.substr(equalsOffset + 1);
        obj = byIdPath(obj, idPath, idValue, parts.length ? _newObject_ : val);
        if (!parts.length) {
          return true
        }
      } else {
        expectArray(obj);
        const idx = parseInt(part, 10);
        if (parts.length) {
          obj = obj[idx];
        } else {
          if (val !== _delete_) {
            obj[idx] = val;
          } else {
            obj.splice(idx, 1);
          }
          return true
        }
      }
    } else if (Array.isArray(part) && part.length) {
      expectObject(obj);
      while (part.length) {
        const key = part.shift();
        if (part.length || parts.length) {
          // if we're at the end of part.length then we need to insert an array
          obj = byKey(obj, key, part.length ? {} : []);
        } else {
          if (val !== _delete_) {
            obj[key] = val;
          } else {
            delete obj[key];
          }
          return true
        }
      }
    } else {
      console.error('setByPath failed: bad path', path);
      throw new Error('setByPath failed')
    }
  }
  console.error(`setByPath failed: "${path}" not found in`, orig);
  throw new Error(`setByPath(${orig}, ${path}, ${val}) failed`)
}

function deleteByPath (orig, path) {
  if (getByPath(orig, path) !== null) {
    setByPath(orig, path, _delete_);
  }
}

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

const makeArray = arrayish => [...arrayish];

const forEach = (array, method) => {
  for (let i = 0; i < array.length; i++) {
    if (method(array[i], i) === false) {
      break
    }
  }
};

const last = array => array.length ? array[array.length - 1] : null;

const forEachKey = (object, method) => {
  const keys = Object.keys(object);
  for (const key of keys) if (method(object[key], key) === false) break
};

const deepClone = object => {
  if (typeof object !== 'object' || object === null) {
    return object
  }
  if (Array.isArray(object)) {
    return object.map(item => deepClone(item))
  }
  const clone = {};
  forEachKey(object, (value, key) => {
    clone[key] = deepClone(value);
  });
  return clone
};

const mapKeys = (object, method) => {
  const keys = Object.keys(object);
  const map = [];
  for (const key of keys) map.push(method(object[key], key));
  return map
};

const mapEachKey = (object, method) => {
  const keys = Object.keys(object);
  const map = {};
  for (const key of keys) map[key] = method(object[key], key);
  return map
};

const findKey = (object, test) => {
  const keys = Object.keys(object);
  for (const key of keys) if (test(object[key], key)) return key
  return null
};

const findValue = (object, test) => {
  const key = findKey(object, test);
  return key ? object[key] : null
};

const filterInPlace = (list, test) => {
  for (let i = list.length - 1; i >= 0; i--) {
    if (!test(list[i], i)) list.splice(i, 1);
  }
};

const filterKeys = (object, test) => {
  const keys = Object.keys(object);
  const filtered = [];
  for (const key of keys) if (test(object[key], key)) filtered.push(key);
  return filtered
};

const filterObject = (object, test) => {
  const keys = Object.keys(object);
  const filtered = {};
  for (const key of keys) if (test(object[key], key)) filtered[key] = object[key];
  return filtered
};

const filterObjectInPlace = (object, test) => {
  const keys = Object.keys(object);
  for (const key of keys) if (!test(object[key], key)) delete object[key];
};

const assignValues = (object, ancestor) => {
  forEachKey(ancestor, (val, key) => {
    if (typeof val !== 'function') {
      if (val && val.constructor === Object) {
        object[key] = assignValues({}, val);
      } else {
        object[key] = val;
      }
    }
  });
  return object
};

var _iterators = /*#__PURE__*/Object.freeze({
  __proto__: null,
  makeArray: makeArray,
  last: last,
  forEach: forEach,
  forEachKey: forEachKey,
  deepClone: deepClone,
  mapKeys: mapKeys,
  mapEachKey: mapEachKey,
  findKey: findKey,
  findValue: findValue,
  filterInPlace: filterInPlace,
  filterKeys: filterKeys,
  filterObject: filterObject,
  filterObjectInPlace: filterObjectInPlace,
  assignValues: assignValues
});

/**
# DOM Methods
Copyright ©2016-2017 Tonio Loewald

    find(selector);

document.querySelectorAll(selector) converted to a true array

    findOne(selector);

document.querySelector(selector)

    findWithin(element, selector, includeSelf);

element.querySelectorAll(selector) converted to a true array

    findOneWithin(element, selector, includeSelf);

element.querySelector(selector)

    isInBody(element); // document.body.contains(element)

returns true if the element is in the document (versus "virtual")

    isVisible(element); // getComputedStyle(element).display !== 'none'
    isVisible(element, true); // as above, but check ancestors as well

returns true if the element is not hidden by virtue of having its `display` set to 'none'

    isInView(element [, view]);

returns true if the element is within the bounds of a specified view (or the window)

    rectsOverlap(r, s);

returns true if two rectangles (per `element.getBoundingClientRect()`) overlap. This is used
by isInView, but is also useful if you need to check a lot of rect intersections and
minimize calls to `getBoundingClientRect` (which isn't cheap). Note that it uses `width` and
`height` versus `right` and `bottom` because for some clipped elements (such as document.body in
many cases) these will not agree.

~~~~
// title: create, isInView, rectsOverlap tests

div = b8r.create('div');
div.style.position = 'absolute';
div.style.top = '-200px';
div.style.left = 0;
div.style.width = '100px';
div.style.height = '100px';
document.body.appendChild(div);
Test(() => b8r.isInView(div), 'div is above clipping region').shouldBe(false);
div.style.top = 0;
Test(() => b8r.isInView(div), 'div is top-left of clipping region').shouldBe(true);
div.style.top = '99999px';
Test(() => b8r.isInView(div), 'div is waaaay below clipping region').shouldBe(false);
div.remove();
const r = {left: 0, top: 0, width: 100, height: 100};
const s = {left: 0, top: 0, width: 100, height: 100};
Test(() => b8r.rectsOverlap(r,s), 'identical').shouldBe(true);
r.left = 90;
Test(() => b8r.rectsOverlap(r,s), 'offset but overlapping').shouldBe(true);
s.top = 101;
Test(() => b8r.rectsOverlap(r,s), 'second is below').shouldBe(false);
s.top = 0;
s.left = -101;
Test(() => b8r.rectsOverlap(r,s), 'second is above').shouldBe(false);
~~~~
    id(id_string)

document.getElementById(id_string)

    text(textContent)

document.createTextNode(textContent)

    fragment()

document.createDocumentFragment()

    empty()

remove all child elements from the element

    classes(element, map);

takes a map of class names to booleans and adds / removes those classes accordingly.

    styles(element, map);

takes a map of style settings to values and sets those styles accordingly. Note that you'll
need to camelcase hypenated settings, so 'font-family' becomes `fontFamily`.

    cssVar(name); // obtains the value of a :root css-variable.
    cssVar(name, value); // sets the value of a :root css-variable.
    cssVar(element, name); // obtains the value of a css-variable at a specified element
    cssVar(element, name, value); // sets hte value of a css-variable at a specified element

`cssVar` allows you to access and modify css-variables -- really nice for creating themes or
pushing computed dimensions (e.g. based on window size) through your CSS.

    create(tagName)

document.createElement(tagName)

    succeeding(element, selector);

next sibling matching selector

    copyChildren(source, dest);

copies children of source to dest (by cloning)

    moveChildren(source, dest);

moves children of source to dest

    offset(element); // returns {x,y}

obtain the offset position of the element relative to the top-left of the window.

    within(element, mouseEvent);
    within(element, mouseEvent, margin); // true | false

did the event occur within the element (with added margin)?

```
<div
  style="padding: 50px; background: white;"
  data-event="mousemove:_component_.within"
>
  <div class="inner" style="width: 100px; height: 100px; background: #faa; box-shadow: 0 0 0 20px #fcc;">
  </div>
</div>
<script>
  const div = findOne('.inner');
  set({
    within: evt => {
      if (b8r.within(div, evt, 20)) {
        div.textContent = 'mouse within 20px'
      } else {
        div.textContent = 'mouse well outside';
      }
    }
  })
</script>
```

    wrap(element, wrapper_element [, destination_selector]);

wraps the element with a wrapper element. If a destination_selector is provided then
the wrapped element is inserted within the indicated child, otherwise it is appended directly to
the wrapper.

    unwrap(element [, wrapperSelector]);

unwraps the element of its immediate parent or its closest `wrapperSelector` if provided.

```
<button
  data-event="
    click:_component_.toggle_wrap;
  "
>
  Click Me to toggle wrapping
</button><br>
<button
  data-event="
    click:_component_.toggle_deep_wrap;
  "
>
  Click Me to toggle deep wrapping
</button>
<div class="wrapper" style="background-color: yellow; padding: 10px;">
</div>
<div class="deep-wrapper" style="background-color: red; padding: 10px;">
  <div style="background-color: white; padding: 10px;">
    <div class="dest" style="background-color: blue; padding: 10px;">
    </div>
  </div>
</div>
<script>
  const target = findOne('.target');
  const wrapper = findOne('.wrapper');
  const deep_wrapper = findOne('.deep-wrapper');

  wrapper.remove();
  deep_wrapper.remove();

  set ({
    toggle_wrap: (evt, element) => {
      if (element.closest('.wrapper')) {
        b8r.unwrap(element);
      } else {
        b8r.wrap(element, wrapper);
      }
    },
    toggle_deep_wrap: (evt, element) => {
      if (element.closest('.deep-wrapper')) {
        b8r.unwrap(element, '.deep-wrapper');
      } else {
        b8r.wrap(element, deep_wrapper, '.dest');
      }
    }
  })
</script>
```
*/

const isVisible = (element, includeParents) => element &&
  getComputedStyle(element).display !== 'none' &&
  ((!includeParents) || element === document.body || isVisible(element.parentElement, true));

const isInView = (element, view) => {
  if (!element || !isVisible(element, true)) {
    return false
  }
  const r = element.getBoundingClientRect();
  const s = view ? view.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  return rectsOverlap(r, s)
};

const rectsOverlap = (r, s) => !(
  r.top > s.top + s.height ||
  r.top + r.height < s.top ||
  r.left > s.left + s.width ||
  r.left + r.width < s.left
);

const find = selector => makeArray(document.querySelectorAll(selector));

const findOne = document.querySelector.bind(document);

const findWithin = (element, selector, includeSelf) => {
  const list = makeArray(element.querySelectorAll(selector));
  if (includeSelf && element.matches(selector)) {
    list.unshift(element);
  }
  return list
};

const findOneWithin = (element, selector, includeSelf) =>
  includeSelf &&
  element.matches(selector) ? element : element.querySelector(selector);

const succeeding = (element, selector) => {
  while (element.nextElementSibling && !element.nextElementSibling.matches(selector)) {
    element = element.nextElementSibling;
  }
  return element.nextElementSibling
};

const preceding = (element, selector) => {
  while (element.previousElementSibling && !element.previousElementSibling.matches(selector)) {
    element = element.previousElementSibling;
  }
  return element.previousElementSibling
};

const findAbove = (elt, selector, untilElt, includeSelf) => {
  let currentElt = includeSelf ? elt : elt.parentElement;
  const found = [];
  while (currentElt) {
    if (currentElt === document.body) {
      break
    }
    if (typeof untilElt === 'string' && currentElt.matches(untilElt)) {
      break
    } else if (currentElt === untilElt) {
      break
    }
    if (currentElt.matches(selector)) {
      found.push(currentElt);
    }
    currentElt = currentElt.parentElement;
  }
  return found
};

const id = document.getElementById.bind(document);

const text = document.createTextNode.bind(document);

const fragment = document.createDocumentFragment.bind(document);

const create = document.createElement.bind(document);

const classes = (element, settings) => {
  forEachKey(settings, (onOff, className) => {
    if (onOff) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  });
};

const styles = (element, settings) => {
  forEachKey(settings, (value, key) => {
    element.style[key] = value;
  });
};

const empty = (element) => {
  while (element.lastChild) {
    element.lastChild.remove();
  }
};

const elementIndex = (element) => [...element.parentElement.children].indexOf(element);

const moveChildren = (source, dest) => {
  while (source.firstChild) {
    dest.appendChild(source.firstChild);
  }
};

const copyChildren = (source, dest) => {
  let element = source.firstChild;
  while (element) {
    dest.appendChild(element.cloneNode(true));
    element = element.nextSibling;
  }
};

const wrap = (element, wrappingElement, destSelector) => {
  try {
    const parent = element.parentElement;
    const destination = destSelector ? wrappingElement.querySelector(destSelector) : wrappingElement;
    parent.insertBefore(wrappingElement, element);
    destination.appendChild(element);
  } catch (e) {
    throw new Error('wrap failed')
  }
};

const unwrap = (element, wrapperSelector) => {
  try {
    const wrapper = wrapperSelector ? element.closest(wrapperSelector) : element.parentElement;
    const parent = wrapper.parentElement;
    parent.insertBefore(element, wrapper);
    wrapper.remove();
  } catch (e) {
    throw new Error('unwrap failed')
  }
};

const within = (element, mouseEvent, margin) => {
  const r = element.getBoundingClientRect();
  const { clientX, clientY } = mouseEvent;
  return (
    clientX + margin > r.left &&
    clientX - margin < r.right &&
    clientY + margin > r.top &&
    clientY - margin < r.bottom
  )
};

const isInBody = (element) => element && document.body.contains(element);

const cssVar = (element, name, value) => {
  /* global HTMLElement */
  if (!(element instanceof HTMLElement)) {
    [element, name, value] = [document.documentElement, element, name];
  }
  if (value === undefined) {
    const htmlStyles = getComputedStyle(element);
    return htmlStyles.getPropertyValue(name).trim()
  } else {
    element.style.setProperty(name, value);
  }
};

/**
    findHighestZ(selector = 'body *') // returns highest z-index of elements matching selector
*/
const findHighestZ = (selector = 'body *') => [...document.querySelectorAll(selector)]
  .map(elt => parseFloat(getComputedStyle(elt).zIndex))
  .reduce((z, highest = Number.MIN_SAFE_INTEGER) =>
    isNaN(z) || z < highest ? highest : z
  );

var _dom = /*#__PURE__*/Object.freeze({
  __proto__: null,
  isVisible: isVisible,
  isInView: isInView,
  rectsOverlap: rectsOverlap,
  find: find,
  findOne: findOne,
  findWithin: findWithin,
  findOneWithin: findOneWithin,
  succeeding: succeeding,
  preceding: preceding,
  findAbove: findAbove,
  id: id,
  text: text,
  fragment: fragment,
  create: create,
  classes: classes,
  styles: styles,
  empty: empty,
  elementIndex: elementIndex,
  moveChildren: moveChildren,
  copyChildren: copyChildren,
  wrap: wrap,
  unwrap: unwrap,
  within: within,
  isInBody: isInBody,
  cssVar: cssVar,
  findHighestZ: findHighestZ
});

/**
# dispatch

    dispatch('click', target, ...args);

Synthesizes a native event. Don't use it for custom events. Use `trigger` instead.
*/
/* global Event */

// TODO -- provide better support for keyboard, mouse, touch events
const dispatch = (type, target, ...args) => {
  const event = new Event(type);
  event.args = args;
  target.dispatchEvent(event);
  if (event.target !== target) {
    // in some cases dispatchEvent will fail to set an event's target property (!)
    return { type, target, args }
  } else {
    return event
  }
};

/**
# Async Update Queue

`b8r` queues DOM updates and then performs them at the next animation frame. Generally,
you don't need to worry about how this works. Just use [registry](?source=source/b8r.register.js)
methods such as `b8r.set` (and `set` inside components) to change bound values and
everything *should just work*.

If you change values directly (e.g. because you need to make lots of deep changes
to a big dataset efficiently) you can just use `b8r.touch` to inform `b8r` of the changes.

## Manipulating the Update Queue Directly

To add updates for a path to `b8r`'s async update queue use `touchByPath`.

    touchByPath('path.to.data'); // tells b8r to update anything bound to that path
    touchByPath('path.to.data', sourceElement); // as above, but exclude sourceElement
    touchByPath('path.to.list[id=abcd]'); // updates the specified list
    touchByPath('path.to.list[id=abcd].bar.baz'); // updates the underlying list

Similarly, to add an element to the update queue:

    touchElement(element); // tell b8r the element in question needs updating

If you want to precisely update a list item without updating the list it belongs to,
the simplest option is to `b8r.bindAll` the list element or `touchElement` the list element.
This is a tradeoff of worst-case performance (lots of updates to a list) against best-case
performance (a simple update to one item of a list).

All of these updates are asynchronous, so the DOM won't actually change immediately. If you do
want the DOM to change immediately:

    b8r.forceUpdate(); // flushes all queued updates to the DOM synchronously

If you'd prefer to wait for the update(s) to complete and then do something, you can
pass a callback to `afterUpdate`:

    afterUpdate(() => { ... }); // does stuff after forceUpdate fires

afterUpdate fires immediately (and synchronously) if there are no pending updates.
*/
let _updateFrame = null;
const _updateList = [];
const _afterUpdateCallbacks = [];
let _forceUpdate = () => {};

const requestAnimationFrameWithTimeout = callback => {
  let done = false;
  const finishIt = () => {
    done || callback();
    done = true;
  };
  requestAnimationFrame(finishIt);
  setTimeout(finishIt, 20);
  return {
    cancel: () => {
      done = true;
    }
  }
};

const getUpdateList = () => {
  if (_updateFrame) {
    _updateFrame.cancel();
    _updateFrame = null;
    return _updateList.splice(0)
  } else {
    if (_updateList.length) {
      throw new Error('_updateList is not empty but no _updateFrame set')
    }
    return false
  }
};

const _afterUpdate = () => {
  while (_afterUpdateCallbacks.length) {
    let fn;
    try {
      fn = _afterUpdateCallbacks.shift();
      fn();
    } catch (e) {
      console.error('_afterUpdate_callback error', e, fn);
    }
  }
};

const asyncUpdate = (path, source) => {
  const item = path
    ? _updateList.find(item => path.startsWith(item.path))
    : _updateList.find(item => (!item.path) && item.source && item.source === source);
  if (!item) {
    if (!_updateFrame) {
      _updateFrame = requestAnimationFrameWithTimeout(_forceUpdate);
    }
    _updateList.push({ path, source });
  } else if (path) {
    // if the path was already marked for update, then the new source element is (now) correct
    item.source = source;
  }
};

const afterUpdate = callback => {
  if (_updateList.length) {
    if (_afterUpdateCallbacks.indexOf(callback) === -1) {
      _afterUpdateCallbacks.push(callback);
    }
  } else {
    callback();
  }
};

const touchElement = element => asyncUpdate(false, element);

const touchByPath = (...args) => {
  let fullPath, sourceElement, name, path;

  if (args[1] instanceof HTMLElement) {
    [fullPath, sourceElement] = args;
  } else {
    [name, path, sourceElement] = args;
    fullPath = !path || path === '/' ? name : name + (path[0] !== '[' ? '.' : '') + path;
  }

  asyncUpdate(fullPath, sourceElement);
};

const _setForceUpdate = (fn) => {
  _forceUpdate = fn;
};

const _expectedCustomElements = [];
const expectCustomElement = async tagName => {
  tagName = tagName.toLocaleLowerCase();
  if (window.customElements.get(tagName) || _expectedCustomElements.includes(tagName)) return
  _expectedCustomElements.push(tagName);
  await window.customElements.whenDefined(tagName);
  find(tagName).forEach(elt => {
    delete elt._b8rBoundValues;
    touchElement(elt);
  });
};

/**
# Data Bindings

Data binding is implemented via the `data-bind` and `data-list` attributes. Bindings tie
[registered data](?source=source/b8r.registry.js) to and from view (DOM) elements.

```
<h3 data-bind="text=binding-example.text"></h3>
<ul>
  <li
    data-list="binding-example.list"
    data-bind="text=.name"
  ></li>
</ul>
<script>
  b8r.register('binding-example', {
    text: 'hello, world',
    list: [
      {name: 'Discovery'},
      {name: 'Enterprise'},
      {name: 'Deep Space 9'},
      {name: 'Voyager'},
      {name: 'Next Generation'},
      {name: 'Star Trek'},
    ],
  })
</script>
```

The key public methods are:

    b8r.bindAll(target); // binds all elements within target; loads available components

And:

    b8r.bindList(target); // bind a list to a target with a data-list attribute

These two functions have variants (mostly used internally) for explicitly passing a path
for use in dynamically resolved bindings.

## Binding Elements with data-bind

The simplest way to bind data to DOM elements is by using `data-bind` attributes.

Usage:

    <div
      data-bind="
        text=path.to.text;
        style(backgroundColor)=path.to.htmlColor;
      "
    >
      <input data-bind="value=path.to.value">
      <input type="checkbox" data-bind="checked=path.to.checked">
    </div>

> **Note** for multiline bindings you can use newlines instead of semicolons.

In a binding the part before the `=` sign is the "target" and the part after
it is the source. If the target looks like a function call, e.g.

    style(backgroundColor)

the part in the parentheses is the `target key`.

Finally, the path is a `data path` (i.e. a reference to a value in the `registry`).

A data path can be complete:

    path.to.value

Or relative:

    .my.value

Or determined at runtime:

    _component_.foo
    _data_.bar

Or be targeted to the _component_ (the component's private data) or _data_ (the
component's data path, which by default is inherited from its parent, and failing
that is the component's private data).

E.g. if you load a "foo" component, it might end up having the component id
`c#foo#17` which is where its private data is registered. `_component_.bar` thus
becomes `c#foo#17.bar`. If this component inherited a data_path of `example` then
`_data_.baz` would become `example.baz` but if not it would default to `c#foo#17.baz`.

A target can be a **toTarget** (meaning it sends bound data *to* the DOM) and/or a
**fromTarget** (meaning it updates bound data *from* the DOM). Most targets are
toTargets only. E.g. you can bind an HTML color inside a registered object
to a style property (style is a toTarget) but if you update the value in the DOM
you'll need to update the value manually.

The most important **fromTargets** are `value`, `checked`, `selected`, and `text`
-- DOM properties that are typically user-editable and changes to which trigger
events. And `text` relies on your sending the `change` or  `input` events.

You can programmatically add a data binding using:

    addDataBinding(element, toTarget, path);

And remove a data binding using:

    removeDataBinding(element, toTarget, path);

These methods literally just add the attributes. There's no behind-the-scenes
magic data structure to maintain. *The attribute is the binding*.

## Dynamic Binding

If a given component could only be bound to a single path, data-binding would
be OK but kind of painful. In fact, data-bind has several mechanisms for dynamic
binding.

`_component_` allows binding to a component's private object.

`_data_` allows binding to an inherited data-path (this is probably the simplest and most
useful mechanism).

When binding to **Lists**, there is also **relative** binding. See below.

**Note**: right now _component_ and _data_ get replaced in data bindings (not event
bindings) when a component is inserted. This will be replaced with truly dynamic behavior
in future.

## String Interpolation

**New**: the new template literals in ES6 are awesome. b8r implements something
similar in data bindings:

    <div data-bind="style(backgroundImage)=url(${_data_.imageUrl})">
      ...
    </div>

Multiple data references are supported too, so you can replace:

    <span data-bind="text=_component_.firstName">First</span>
    <span data-bind="text=_component_.lastName">Last</span>
    <script>
      set({
        firstName: 'Juanita',
        lastName: 'Citizen',
      })
    </script>

with:

    <span
      data-bind="
        text=${_component_.firstName}
        ${_component_.lastName}
      "
    >
      First Last
    </span>

```
<span data-bind="
  text=${_component_.firstName}
  ${_component_.lastName}
"
>
  First Last
</span>
<script>
  set({
    firstName: 'Juanita',
    lastName: 'Citizen',
  })
</script>
```

This only works in to-bindings (it won't parse DOM contents back into data
structures for you!).

You can access the underlying method directly:

    b8r.interpolate('string with ${data.to.path} and ${data.with.other.path}');
    b8r.interpolate('string with ${data.to.path} and ${data.with.other.path}', element);

The second argument is required if any path used is relative (e.g. `.foo.bar`),
data-relative (e.g. `_data_.foo.bar`), or component-relative (e.g. `_component_.foo.bar`).

In essence, if you want to use string interpolation, bindinator uses the ES6-style
interpolations for data paths (javascript is not supported, just data paths). Data
paths are evaluated normally, so _data_, _component_, and relative paths should
work exactly as expected.

## Binding Lists with data-list

If you want to create one instance of an element for every member of a list
you can use a list binding. Again, this is just an attribute (`data-list`):

This example simply creates one instance of the `<img>` element for each
item in the registered list, which might look like: [{url: '...'}, ...].

Note the *relative* data binding.

    <img
      data-list="path.to.image_list"
      data-bind="img=.url"
    >

Here's a more complex example, showing that the element and its children
will be instanced for each element of the list.

    <ul>
      <li
        data-list="path.to.list:path.to.id"
        data-bind="class(separator)=.separator"
      >
        <img
          data-bind="
            img=.image_url;
            attr(alt)=.image_name;
          "
        >
        <span data-bind="text=.caption">Caption</span>
      </li>
    </ul>

### Efficient List Updates

The part of the list-binding after the `:` is the *id path* which is used to
identify list instances and minimize dom updates. Where possible, use an
*id path* for list binding. Also, consistently use the same *id-path* for
all instances of a given list.

To update a list instance and have all renderings of that list instance
be efficiently updated:

    b8r.setListInstance(elt, (existing) => {
      ...
      return modified // the modified instance or a replacement
    })

**Note** that you shouldn't modify the id-path of the instance (if
you're doing that, rebind the list).

For more information on *id paths* see the `byPath` documentation.

    b8r.removeListInstance(element);

Removes a data-list-instance's corresponding list member and any other bound
data-list-instances.

## Mystery Methods

Most of the other methods in this module are used internally. They're not
secret, private methods and their purposes should be self-explanatory.

## Finding Bound Data

To get a component's id (which you should not need to do very often)
you can call getComponentId:

    b8r.getComponentId(elt)

The component id looks like c# _component name_ # _n_ where _n_ is the
simply the creation order. It follows that component ids are guaranteed
to be unique.

To quickly obtain bound data a component from an element inside it:

    b8r.getComponentData(elt [, type]); // gives you the component data

In effect this simply gets the component id and then finds the corresponding
registered data object (or "model").

    b8r.getComponentDataId(elt [, type]); // gives you the component path

If you just need the component id (i.e. its data-path).

To quickly obtain bound data a list instance from an element inside it:

    b8r.getListInstance(elt)
*/

const addDataBinding = (element, toTarget, path) => {
  path = path.replace(/_component_/g, getComponentId(element));
  const binding = `${toTarget}=${path}`;
  const existing = (element.dataset.bind || '')
    .split(';').map(s => s.trim()).filter(s => !!s);
  if (existing.indexOf(binding) === -1) {
    existing.push(binding);
    element.dataset.bind = existing.join(';');
    delete element._b8rBoundValues;
    touchElement(element);
  }
};

const removeDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  var existing =
      (element.dataset.bind || '').split(';').map(s => s.trim());
  if (existing.indexOf(binding) > -1) {
    existing = existing.filter(exists => exists !== binding);
    if (existing.length) {
      element.dataset.bind = existing.join(';');
    } else {
      if (element.dataset.bind) {
        delete element.dataset.bind;
      }
    }
    delete element._b8rBoundValues;
  }
};

const parseBinding = binding => {
  if (!binding.trim()) {
    throw new Error('empty binding')
  }
  if (binding.indexOf('=') === -1) {
    throw new Error(`binding "${binding}" is missing = sign; probably need a source or target`)
  }
  const [, targetsRaw, path] =
      binding.trim().match(/^([^=]*)=([^;]*)$/m).map(s => s.trim());
  const targets = targetsRaw.split(',').map(target => {
    var parts = target.match(/([\w#\-.]+)(\(([^)]+)\))?/);
    if (!parts) {
      console.error('bad target', target, 'in binding', binding);
      return
    }
    if (!parts) return null
    if (parts[1].includes('.')) return { target: 'method', key: parts[1] }
    return { target: parts[1], key: parts[3] }
  });
  if (!path) {
    console.error('binding does not specify source', binding);
  }
  return { targets, path }
};

/**
    splitPaths('foo.bar.baz,foo[id=17].bar.baz,path.to.method(foo.bar,foo[id=17].baz)');
      // returns ['foo.bar.baz', 'foo[id=17].bar.baz', 'path.to.method(foo.bar,foo[id=17].baz)']

splitPaths is used to prise apart data-paths in bindings.

~~~~
// title: splitpaths tests

const {splitPaths, getBindings, parseBinding} = await import('../source/b8r.bindings.js');

Test(() => splitPaths('foo.bar')).shouldBeJSON(["foo.bar"]);
Test(() => splitPaths('foo,bar,baz')).shouldBeJSON(["foo", "bar", "baz"]);
Test(() => splitPaths('foo.bar,foo[path.to.id=this is not a test],path.to.method(foo.bar[id=17])')).
  shouldBeJSON(["foo.bar", "foo[path.to.id=this is not a test]", "path.to.method(foo.bar[id=17])"]);
Test(() => splitPaths('foo.bar,foo[path.to.id=this is, not a test],path.to.method(foo.bar[id=17])')).
  shouldBeJSON(["foo.bar", "foo[path.to.id=this is, not a test]", "path.to.method(foo.bar[id=17])"]);
Test(() => splitPaths('path.to.value,path.to[id=17].value,path.to.method(path.to.value,path[11].to.value)')).
  shouldBeJSON(["path.to.value", "path.to[id=17].value", "path.to.method(path.to.value,path[11].to.value)"]);
Test(() => splitPaths('path.to.method(path.to.value,path[11].to.value),path.to.value,path.to[id=17].value')).
  shouldBeJSON(["path.to.method(path.to.value,path[11].to.value)", "path.to.value", "path.to[id=17].value"]);

Test(() => parseBinding("this(is)=a.test")).shouldBeJSON({
  "targets": [
    {
      "target": "this",
      "key": "is"
    }
  ],
  "path": "a.test"
})

Test(() => parseBinding("this.is,another=test")).shouldBeJSON({
  "targets": [
    {
      "target": "method",
      "key": "this.is"
    },
    {
      "target": "another"
    }
  ],
  "path": "test"
})

Test(() => parseBinding("c#foo-10.bar.baz=another.test"), 'automatic methods').shouldBeJSON({
  "targets": [
    {
      "target": "method",
      "key": "c#foo-10.bar.baz"
    }
  ],
  "path": "another.test"
})

const div = document.createElement('div')
div.dataset.bind = `
  text=$\{_component_.firstName}
       $\{_component_.lastName}
  class_map(
    happy:happy-class
    |sad:sad-class
    |indifferent-class
  )=_component_.emotion
  show_if=_component_.visible
`
Test(() => getBindings(div).length, 'newlines can separate bindings').shouldBe(3)

const bindings =  [
  {
    "targets": [
      {
        "target": "method",
        "key": "path.to.foo"
      }
    ],
    "path": "path.to.bar"
  }
]
div.dataset.bind = 'method(path.to.foo)=path.to.bar'
Test(() => getBindings(div), 'method binding is parsed correctly').shouldBeJSON(bindings)

div.dataset.bind = 'path.to.foo=path.to.bar'
Test(() => getBindings(div), 'implicit method binding is parsed correctly').shouldBeJSON(bindings)
~~~~
*/

const splitPaths = paths => paths.match(/(([^,([]+\.?)|(\[[^\]]+\]\.?)|\([^)]+\))+/g);

const findBindables = element => findWithin(element, '[data-bind]', true);

const findLists = element => findWithin(element, '[data-list]', true);

const getBindings = element => {
  try {
    return element.dataset.bind
      // separate bindings with ';' for consistency
      .replace(/\n\s*([\w#\-.,]+)(\([^)]*\))?=/g, ';$1$2=')
      .split(';')
      .filter(s => !!s.trim())
      .map(parseBinding)
  } catch (e) {
    console.error(element, e);
    return []
  }
};

const getDataPath = element => {
  const dataParent = element ? element.closest('[data-path],[data-list-instance]') : false;
  const path = dataParent ? (dataParent.dataset.path || dataParent.dataset.listInstance) : '';
  return ['.', '['].indexOf(path[0]) === -1 ? path : getDataPath(dataParent.parentElement) + path
};

const getListPath = element => {
  const listInstanceElement = element.closest('[data-list-instance]');
  const listTemplate = listInstanceElement && succeeding(listInstanceElement, '[data-list]');
  return listTemplate && listTemplate.dataset.list.split(':')[0]
};

const getListInstancePath = element => {
  const component = element.closest('[data-list-instance]');
  return component ? component.dataset.listInstance : null
};

const getComponentId = (element, type) => {
  if (type) {
    element = element.closest(`.${type}-component`);
  }
  const component = element.closest('[data-component-id]');
  return component ? component.dataset.componentId : null
};

const replaceInBindings = (element, needle, replacement) => {
  const needleRegexp = new RegExp(needle, 'g');
  findWithin(element, `[data-bind*="${needle}"],[data-list*="${needle}"],[data-path*="${needle}"]`)
    .forEach(elt => {
      ['data-bind', 'data-list', 'data-path'].forEach(attr => {
        const val = elt.getAttribute(attr);
        if (val) {
          elt.setAttribute(attr, val.replace(needleRegexp, replacement));
        }
      });
    });
};

const resolveListInstanceBindings = (instanceElt, instancePath) => {
  findWithin(instanceElt, '[data-bind]', true)
    .filter(elt => !elt.closest('[data-list]'))
    .forEach(elt => {
      const bindingSource = elt.dataset.bind;
      if (bindingSource.indexOf('=.') > -1) {
        elt.dataset.bind = bindingSource
          .replace(/=\.([^;\s]+)/g, `=${instancePath}.$1`)
          .replace(/=\./g, `=${instancePath}`);
      }
      if (bindingSource.indexOf('${.') > -1) {
        elt.dataset.bind = bindingSource
          .replace(/\$\{(\.[^}]+)\}/g, '${' + instancePath + '$1}');
      }
    });
};

/**
# Type Checking, Mocks By Example

The goal of this module is to provide simple, effective type-checking "by example" -- i.e. in
most cases an example of a type can function as a type.

Certain specialized types — enumerations in particular — are supported in a way that still allows types
to be encoded as JSON. These types are specified using a string starting with a '#'. (It follows that
you shouldn't use strings starting with '#' as examples of strings.)

## Work in Progress

Ultimately, this module is intended to afford both static analysis of `b8r` code and components and efficient
run-time checking of application state -- see [The Registry](?source=source/b8r.registry.js)
documentation for more information.

As a side-benefit, it is also capable of driving mock-data and optimistic rendering.
Annotations in example data can provide hints as to how to generate mock data for
testing purposes and for rendering user interfaces before live data is available.

General usage is:

    matchType(example, subject) // returns empty list if subject has same type as example
      // returns a list of problems discovered otherwise
E.g.

    matchType(0, 17) // [] -- no errors
    matchType('foo', 17) // ["was number, expected string"]

This is most useful when comparing objects, e.g.

    matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 'world'}) // [] -- no errors
    matchType({foo: 17, bar: 'hello'}, {bar: 'world'}) // [".foo was undefined, expected number"]
    matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 17}) // [".bar was number, expected string"]

If the example includes arrays, the elements in the array are assumed to be the valid examples
for items in the array, e.g.

    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], []) // [] -- no errors
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{x: 10, y: 10}, {x: -1, y: -1}]) // []
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{lat: -20, long: 40, alt: 100}]) // []
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{x: 5, y: -5}, {long: 20}])
      // ["[1] had no matching type"]
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{x: 5}, {long: 20}])
      // ["[0] had no matching type", "[1] had no matching type"]

For efficiency, put the most common example elements in example arrays first (since checks are
performed in order) and do not include unnecessary elements in example arrays.

## Specific Types

Some specific types can be defined using strings that start with '#'. (It follows that you should not
use strings starting with '#' as type examples.)

`specficTypeMatch` is the function that evaluates matches against specific types. (Typically you
won't use it directly, but use matchType instead.)

    specificTypeMatch('#int [0,10]', 5) === true   // 0 ≤ 5 ≤ 10
    specificTypeMatch('#int [0', -5)    === false  // -5 is less than 0
    specificTypeMatch('#int', Math.PI)  === false  // Math.PI is not a whole number

### #enum

    specificTypeMatch('#enum true|null|false', null)                      === true
    specificTypeMatch('#enum true|null|false', 0)                         === false
    specificTypeMatch('#enum "get"|"post"|"put"|"delete"|"head"', 'head') === true
    specificTypeMatch('#enum "get"|"post"|"put"|"delete"|"head"', 'save') === false

You can specify an enum type simply using a bar-delimited sequence of JSON strings
(if you're transmitting a type as JSON you'll need to escape the '"' characters).

### #int and #number

    specificTypeMatch('#int [0,10]', 5)          === true   // 0 ≤ 5 ≤ 10
    specificTypeMatch('#int [0,∞]', -5)          === false  // -5 is less than 0
    specificTypeMatch('#int [0', -5)             === false  // -5 is less than 0
    specificTypeMatch('#int', Math.PI)           === false  // Math.PI is not a whole number
    specificTypeMatch('#number (0,4)', Math.PI)  === true   // 0 < Math.PI < 4

You can specify whole number types using '#int', and you can restrict #int and #number values
to **ranges** using, for example, '#int [0,10]' to specify any integer from 0 to 10 (inclusive).

Use parens to indicate exclusive bounds, so '#number [0,1)' indicates a number ≥ 0 and < 1.
(In case you're wondering, this is standard Mathematical notation.)

You can specify just a lower bound or just an upper bound, e.g. '#number (0' specifies a positive
number.

### #any

You can specify any (non-null, non-undefined) value via '#any'.

### #instance — built-in types

You can specify a built-in type, e.g. `HTMLElement` value via '#instance ConstructorName', in
this example '#instance HTMLElement'.

    matchType('#instance HTMLElement', document.body) // returns [] (no errors)

### #?... — optional types

You can denote an optional type using '#?<type>'. Both `null` and `undefined` are acceptable.

> #### More Types and Custom Types
>
> This mechanism will likely add new types as the need arises, and similarly may afford a
> convenient mechanism for defining custom types that require test functions to verify.

### #regexp — string tests

You can specify a regular expression test for a string value by providing the string you'd use
to create a `RegExp` instance. E.g. '#regexp ^\\d{5,5}$' for a simple zipcode type.

    matchType('#regexp ^\\d{5,5}$', '90210') // returns [] (no errors)
    matchType('#regexp ^\\d{5,5}$', '2350') // returns ["was "2350", expected #regexp \d{5,5}"]

## `describe`

A simple and useful wrapper for `typeof` is provided in the form of `describe` which
gives the typeof the value passed unless it's an `Array` (in which case it returns
'array') or `null` (in which case it returns 'null')

    describe([]) // 'array'
    describe(null) // 'null'
    describe(NaN) // 'NaN'
    describe(-Infinity) // 'number'

~~~~
// title: matchType tests
const {
  matchType,
  describe,
  exampleAtPath,
} = await import('./b8r.byExample.js');

Test(() => matchType(0, 17)).shouldBeJSON([])
Test(() => matchType(0, 'hello')).shouldBeJSON(['was \"hello\", expected number'])
Test(() => matchType(false, true)).shouldBeJSON([])
Test(() => matchType(false, null)).shouldBeJSON(["was null, expected boolean"])
Test(() => matchType('#int', 17)).shouldBeJSON([])
Test(() => matchType('#int [-5,5]', 5)).shouldBeJSON([])
Test(() => matchType('#int [-5,5)', 5)).shouldBeJSON(['was 5, expected #int [-5,5)'])
Test(() => matchType('#int [-5,5]', 6)).shouldBeJSON(['was 6, expected #int [-5,5]'])
Test(() => matchType('#int [-5,5)', -5)).shouldBeJSON([])
Test(() => matchType('#int (-5,5)', -5)).shouldBeJSON(['was -5, expected #int (-5,5)'])
Test(() => matchType('#int [-5,5]', -6)).shouldBeJSON(['was -6, expected #int [-5,5]'])
Test(() => matchType('#number (0', 6)).shouldBeJSON([])
Test(() => matchType('#number (0', -6)).shouldBeJSON(['was -6, expected #number (0'])
Test(() => matchType('#number (0,∞)', 6)).shouldBeJSON([])
Test(() => matchType('#number (0,∞)', -6)).shouldBeJSON(['was -6, expected #number (0,∞)'])
Test(() => matchType('#number (0,∞)', Infinity)).shouldBeJSON(['was Infinity, expected #number (0,∞)'])
Test(() => matchType('#number [-∞,∞)', -Infinity)).shouldBeJSON([])
Test(() => matchType('#number 0]', 6)).shouldBeJSON(['was 6, expected #number 0]'])
Test(() => matchType('#number 0]', -6)).shouldBeJSON([])
Test(() => matchType('#number [-∞,0]', 6)).shouldBeJSON(['was 6, expected #number [-∞,0]'])
Test(() => matchType('#number [-∞,0]', -6)).shouldBeJSON([])
Test(() => matchType('#number [0,5]', Math.PI)).shouldBeJSON([])
Test(() => matchType('#number [0,2]', Math.PI)).shouldBeJSON([`was ${Math.PI}, expected #number [0,2]`])
Test(() => matchType('#number', 6.022e+23)).shouldBeJSON([])
Test(() => matchType('#?number')).shouldBeJSON([])
Test(() => matchType('#any', {})).shouldBeJSON([])
Test(() => matchType('#?any', null)).shouldBeJSON([])
Test(() => matchType('#any', null)).shouldBeJSON(['was null, expected #any'])
Test(() => matchType('#any')).shouldBeJSON(['was undefined, expected #any'])
Test(() => matchType('#int', Math.PI)).shouldBeJSON([`was ${Math.PI}, expected #int`])
Test(() => matchType('#enum false|null|17|"hello"', null)).shouldBeJSON([])
Test(() => matchType('#enum false|null|17|"hello"', 17)).shouldBeJSON([])
Test(() => matchType('#enum false|null|17|"hello"', undefined)).shouldBeJSON(['was undefined, expected #enum false|null|17|"hello"'])
Test(() => matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 'world'}))
  .shouldBeJSON([])
Test(() => matchType({foo: 17, bar: 'hello'}, {bar: 'world'}))
  .shouldBeJSON([".foo was undefined, expected number"])
Test(() => matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 17}))
  .shouldBeJSON([".bar was 17, expected string"])
Test(() => matchType({foo: 17, bar: 'hello'}, {bar: 17}))
  .shouldBeJSON([".bar was 17, expected string", ".foo was undefined, expected number"])
Test(() => matchType({foo: {bar: {baz: true}}}, {foo: {bar: {baz: false}}}))
  .shouldBeJSON([])
Test(() => matchType({foo: {bar: {baz: true}}}, {foo: {bar: {baz: 17}}}))
  .shouldBeJSON([".foo.bar.baz was 17, expected boolean"])
Test(() => matchType([], []))
  .shouldBeJSON([])
Test(() => matchType([1], []))
  .shouldBeJSON([])
Test(() => matchType([], [1]))
  .shouldBeJSON([])
Test(() => matchType([], []))
  .shouldBeJSON([])
Test(() => matchType([], {}))
  .shouldBeJSON(["was object, expected array"])
Test(() => matchType({}, {}))
  .shouldBeJSON([])
Test(() => matchType({}, []))
  .shouldBeJSON(["was array, expected object"])
Test(() => matchType(['hello'], ['world']))
  .shouldBeJSON([])
Test(() => matchType([false], ['world']))
  .shouldBeJSON(["[0] was \"world\", expected boolean"])
Test(() => matchType([{x: 0, y: 17}], [{y: 0, x: 17}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}], [{y: 0}]))
  .shouldBeJSON(["[0].x was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}], [{x: 'world'}]))
  .shouldBeJSON(["[0].x was \"world\", expected number", "[0].y was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: 'baz'}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: false}]))
  .shouldBeJSON(["[0] had no matching type"])
Test(() => matchType('#instance HTMLElement', document.body))
  .shouldBeJSON([])
Test(() => matchType('#instance HTMLElement', {}))
  .shouldBeJSON(["was object, expected #instance HTMLElement"])

const requestType = '#enum "get"|"post"|"put"|"delete"|"head"'
Test(() => matchType(requestType, 'post'))
  .shouldBeJSON([])
Test(() => matchType(requestType, 'save'))
  .shouldBeJSON(['was \"save\", expected #enum "get"|"post"|"put"|"delete"|"head"'])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '12345'),
  'zipcode type'
).shouldBeJSON([])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '12345-6789'),
  'zipcode type'
).shouldBeJSON([])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '2350'),
  'australian postcodes are not zipcodes'
).shouldBeJSON(['was "2350", expected #regexp ^\\d{5,5}(-\\d{4,4})?$'])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '12345-679'),
  'extended zipcodes have a 4-digit extension'
).shouldBeJSON(['was "12345-679", expected #regexp ^\\d{5,5}(-\\d{4,4})?$'])

Test(() => exampleAtPath({foo: 17}, 'foo')).shouldBe(17)
Test(() => exampleAtPath({bar: 'hello'}, 'foo')).shouldBe(undefined)
Test(() => exampleAtPath({foo: [{bar: 'hello'}]}, 'foo')).shouldBeJSON([{"bar":"hello"}])
Test(() => exampleAtPath({foo: [{bar: 'hello'}]}, 'foo[]')).shouldBeJSON({"bar":"hello"})
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[]'))
  .shouldBeJSON({"bar":"hello",baz:17})
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[].bar'))
  .shouldBe('hello')
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[].baz'))
  .shouldBe(17)
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[].hello'))
  .shouldBe(undefined)
~~~~

## Notes on Performance

I've done some rough performance testing of `typeSafe` and added a simple
optimization. The test code simply performed an add operation 1,000,000
times inline, wrapped in a function, wrapped in a trivial wrapper function, and
using a `typeSafe` function.

In essence, the overhead for typeSafe functions (on my recent, pretty fast,
Windows laptop) is about 350ms/million calls checked by typeSafe.

Note that many frameworks end up wrapping all your functions several times
for various reasons, doing non-trivial work in the wrapper. In any event,
if even _this_ much of an overhead is abhorrent, simply don't use typeSafe
in performance critical situations, or call it outside a loop rather than inside.

(E.g. if you're iterating across a lot of data in an array, typecheck a function
that takes the array, not a function that processes all the elements -- matchType
does not check every element of a large array.)

The obvious place to use typeSafe functions is when communicating with services,
and here any overhead is insignificant compared with network or I/O.
*/

const describe = x => {
  if (x === null) return 'null'
  if (Array.isArray(x)) return 'array'
  if (typeof x === 'number') {
    if (isNaN(x)) return 'NaN'
  }
  if (typeof x === 'string' && x.startsWith('#')) return x
  return typeof x
};

const parseFloatOrInfinity = x => {
  if (x === '-∞') {
    return -Infinity
  } else if (x[0] === '∞') {
    return Infinity
  } else {
    return parseFloat(x)
  }
};

const inRange = (spec, x) => {
  let lower, upper;
  if (spec === undefined) return true
  try {
    [, lower, upper] = (spec || '').match(/^([[(]-?[\d.∞]+)?,?(-?[\d.∞]+[\])])?$/);
  } catch (e) {
    throw new Error(`bad range ${spec}`)
  }
  if (lower) {
    const min = parseFloatOrInfinity(lower.substr(1));
    if (lower[0] === '(') {
      if (x <= min) return false
    } else {
      if (x < min) return false
    }
  }
  if (upper) {
    const max = parseFloatOrInfinity(upper);
    if (upper.endsWith(')')) {
      if (x >= max) return false
    } else {
      if (x > max) return false
    }
  }
  return true
};

const regExps = {};

const regexpTest = (spec, subject) => {
  const regexp = regExps[spec] ? regExps[spec] : regExps[spec] = new RegExp(spec);
  return regexp.test(subject)
};

const specificTypeMatch = (type, subject) => {
  const [, optional, baseType, , spec] = type.match(/^#([?]?)([^\s]+)(\s(.*))?$/) || [];
  if (optional && (subject === null || subject === undefined)) return true
  const subjectType = describe(subject);
  switch (baseType) {
    case 'any':
      return subject !== null && subject !== undefined
    case 'function':
      if (subjectType !== 'function') return false
      // todo allow for typeSafe functions with param/result specified by name
      return true
    case 'number':
      if (subjectType !== 'number') return false
      return inRange(spec, subject)
    case 'int':
      if (subjectType !== 'number' || subject !== Math.floor(subject)) return false
      return inRange(spec, subject)
    case 'enum':
      try {
        return spec.split('|').map(JSON.parse).includes(subject)
      } catch (e) {
        throw new Error(`bad enum specification (${spec}), expect JSON strings`)
      }
    case 'regexp':
      return subjectType === 'string' && regexpTest(spec, subject)
    case 'array':
      return Array.isArray(subject)
    case 'instance':
      return subject instanceof window[spec]
    case 'object':
      return !!subject && typeof subject === 'object' && !Array.isArray(subject)
    default:
      if (subjectType !== baseType) {
        throw new Error(`unrecognized type specifier ${type}`)
      } else {
        return true
      }
  }
};

const describeType = (x) => {
  const scalarType = describe(x);
  switch (scalarType) {
    case 'array':
      return x.map(describeType)
    case 'object':
    {
      const _type = {};
      Object.keys(x).forEach((key) => { _type[key] = describeType(x[key]); });
      return _type
    }
    default:
      return scalarType
  }
};

const typeJSON = (x) => JSON.stringify(describeType(x));
const typeJS = (x) => typeJSON(x).replace(/"(\w+)":/g, '$1:');

const quoteIfString = (x) => typeof x === 'string' ? `"${x}"` : (typeof x === 'object' ? describe(x) : x);

// when checking large arrays, only check a maximum of 111 elements
function * arraySampler (a) {
  let i = 0;
  // 101 is a prime number so hopefully we'll avoid sampling fixed patterns
  const increment = Math.ceil(a.length / 101);
  while (i < a.length) {
    // first five
    if (i < 5) {
      yield { sample: a[i], i };
      i++;
    // last five
    } else if (i > a.length - 5) {
      yield { sample: a[i], i };
      i++;
    } else {
    // ~1% of the ones in the middle
      yield { sample: a[i], i };
      i = Math.min(i + increment, a.length - 4);
    }
  }
}

const matchType = (example, subject, errors = [], path = '') => {
  const exampleType = describe(example);
  const subjectType = describe(subject);
  const typesMatch = exampleType.startsWith('#')
    ? specificTypeMatch(exampleType, subject)
    : exampleType === subjectType;
  if (!typesMatch) {
    errors.push(`${path ? path + ' ' : ''}was ${quoteIfString(subject)}, expected ${exampleType}`);
  } else if (exampleType === 'array') {
    // only checking first element of subject for now
    const sampler = subject.length ? arraySampler(subject) : false;
    if (example.length === 1 && sampler) {
      // assume homogenous array
      for (const { sample, i } of sampler) matchType(example[0], sample, errors, `${path}[${i}]`);
    } else if (example.length > 1 && sampler) {
      // assume heterogeneous array
      for (const { sample, i } of sampler) {
        let foundMatch = false;
        for (const specificExample of example) {
          if (matchType(specificExample, sample, [], '').length === 0) {
            foundMatch = true;
            break
          }
        }
        if (!foundMatch) errors.push(`${path}[${i}] had no matching type`);
      }
    }
  } else if (exampleType === 'object') {
    matchKeys(example, subject, errors, path);
  }
  return errors
};

const exampleAtPath = (example, path) => {
  const parts = Array.isArray(path)
    ? [...path]
    : path.replace(/\[[^\]]*\]/g, '.*').split('.');
  if (example === null || example === undefined || parts.length === 0) {
    return example
  } else {
    const part = parts.shift();
    if (part === '*') {
      if (Array.isArray(example)) {
        return example.length === 1
          ? exampleAtPath(example[0], parts)
          : exampleAtPath(Object.assign({}, ...example), parts)
      } else {
        return undefined
      }
    } else {
      return exampleAtPath(example[part], parts)
    }
  }
};

const matchKeys = (example, subject, errors = [], path = '') => {
  for (const key of Object.keys(example).sort()) {
    matchType(example[key], subject[key], errors, path + '.' + key);
  }
  return errors
};

/**
## Strongly Typed Functions

`typeSafe` adds run-time type-checking to functions, verifying the type of both
their inputs and outputs:

    import {typeSafe} from 'path/to/b8r.js'
    const safeFunc = typeSafe(func, paramTypes, resultType, name)

- `func` is the function you're trying to type-check.
- `paramTypes` is an array of types.
- `resultType` is the type the function is expected to return (it's optional).
- `name` is optional (defaults to func.name || 'anonymous')

For example:

    const safeAdd = typeSafe((a, b) => a + b, [1, 2], 3, 'add')

A typeSafe function that is passed an incorrect set of parameters, whose original
function returns an incorrect set of paramters will return an instance of `TypeError`.

`TypeError` is a simple class to wrap the information associated with a type-check failure.
Its instances five properties and one method:
- `functionName` is the name of the function (or 'anonymous' if none was provided)
- `isParamFailure` is true if the failure was in the inputs to a function,
- `expected` is what was expected,
- `found` is what was found,
- `errors` is the array of type errors.
- `toString()` renders the `TypeError` as a string

A typeSafe function that is passed or more `TypeError` instances in its parameters will return
the first error it sees without calling the wrapped function.

typeSafe functions are self-documenting. They have two read-only properties `paramTypes` and
`resultType`.

typeSafe functions are intended to operate like
[monads](https://en.wikipedia.org/wiki/Monad_(functional_programming)),
so if you call `safe_f(safe_g(...))` and `safe_g` fails, `safe_f` will _short-circuit_ execution and
return the error directly -- which should help with debugging and prevent code executing
on data known to be bad.

~~~~
const {
  matchParamTypes,
  typeSafe,
  TypeError,
} = await import('./b8r.byExample.js');

Test(() => matchParamTypes([1,2,3], [1,2,3])).shouldBeJSON([])
Test(() => matchParamTypes([1,'a',{}], [0,'b',{}])).shouldBeJSON([])
Test(() => matchParamTypes([1,'a'], [0,'b',{}]), 'extra parameters are ok').shouldBeJSON([])

const safeAdd = typeSafe((a, b) => a + b, [1, 2], 3, 'add')
Test(() => safeAdd(1,2), 'typesafe function works when used correctly').shouldBe(3)
Test(() => safeAdd(1).toString()).shouldBeJSON('add failed: bad parameter, [[],["was undefined, expected number"]]')

const badAdd = typeSafe((a, b) => `${a + b}`, [1, 2], 3, 'badAdd')
Test(() => badAdd(1,2).toString(), 'typesafe function fails with wrong return type')
  .shouldBeJSON('badAdd failed: bad result, ["was \\"3\\", expected number"]')

const labeller = typeSafe((label, number) => `${label}: ${number}`, ['label', 0], 'label: 17', 'labeller')
Test(() => labeller.paramTypes, 'typeSafe function has paramTypes').shouldBeJSON(['label',0])
Test(() => labeller.resultType, 'typeSafe function has resultType').shouldBe('label: 17')
Test(() => labeller.resultType = 'foo', 'typeSafe function props are read-only').shouldThrow()

const safeVectorAdd = typeSafe((a, b) => a.map((x, i) => x + b[i]), [[1], [2]], [3], 'vectorAdd')
Test(() => safeVectorAdd([1,2],[3,4])).shouldBeJSON([4,6])
Test(() => safeVectorAdd([1,2],[3,'x']).toString()).shouldBeJSON('vectorAdd failed: bad parameter, [[],["[1] was \\"x\\", expected number"]]')
Test(() => safeVectorAdd([1,2],[3]).toString()).shouldBeJSON('vectorAdd failed: bad result, ["[1] was NaN, expected number"]')
Test(() => safeVectorAdd([1,2], safeVectorAdd([1,2],[1,1])), 'chaining works').shouldBeJSON([3,5])
Test(() => safeVectorAdd([1,2],[1]) instanceof TypeError, 'failed function returns TypeError').shouldBe(true)
const inner = typeSafe((a, b) => a.map((x, i) => x + b[i]), [[1], [2]], [3], 'inner')
Test(() => inner([1,2],[1]) instanceof TypeError, 'failed function returns TypeError').shouldBe(true)
Test(() => inner([1,2],[1]).functionName, 'failed function returns name').shouldBe('inner')
Test(() => safeVectorAdd([1,2], inner([1,2],[1])).toString(), 'short circuit works').shouldBeJSON('inner failed: bad result, ["[1] was NaN, expected number"]')
~~~~
 */

class TypeError {
  constructor ({
    functionName,
    isParamFailure,
    expected,
    found,
    errors
  }) {
    Object.assign(this, {
      functionName,
      isParamFailure,
      expected,
      found,
      errors
    });
  }

  toString () {
    const {
      functionName,
      isParamFailure,
      errors
    } = this;
    return `${functionName} failed: bad ${isParamFailure ? 'parameter' : 'result'}, ${JSON.stringify(errors)}`
  }
}

const assignReadOnly = (obj, propMap) => {
  propMap = { ...propMap };
  for (const key of Object.keys(propMap)) {
    const value = propMap[key];
    Object.defineProperty(obj, key, {
      enumerable: true,
      get () {
        return value
      },
      set (value) {
        throw new Error(`${key} is read-only`)
      }
    });
  }
  return obj
};

const matchParamTypes = (types, params) => {
  for (let i = 0; i < params.length; i++) {
    if (params[i] instanceof TypeError) {
      return params[i]
    }
  }
  const errors = types.map((type, i) => matchType(type, params[i]));
  return errors.flat().length ? errors : []
};

// TODO async function support

const _typeSafe = (func, paramTypes = [], resultType = undefined, functionName = undefined) => {
  if (!functionName) functionName = func.name || 'anonymous';
  let callCount = 0;
  return assignReadOnly(function (...params) {
    callCount += 1;
    const paramErrors = matchParamTypes(paramTypes, params);
    // short circuit failures
    if (paramErrors instanceof TypeError) return paramErrors

    if (paramErrors.length === 0) {
      const result = func(...params);
      const resultErrors = matchType(resultType, result);
      if (resultErrors.length === 0) {
        return result
      } else {
        return new TypeError({
          functionName,
          isParamFailure: false,
          expected: resultType,
          found: result,
          errors: resultErrors
        })
      }
    }
    return new TypeError({
      functionName,
      isParamFailure: true,
      expected: paramTypes,
      found: params,
      errors: paramErrors
    })
  }, {
    paramTypes,
    resultType,
    getCallCount: () => callCount
  })
};

const typeSafe = _typeSafe(_typeSafe, ['#function', '#?array', '#?any', '#?string'], '#function');

var _byExample = /*#__PURE__*/Object.freeze({
  __proto__: null,
  describe: describe,
  specificTypeMatch: specificTypeMatch,
  describeType: describeType,
  typeJSON: typeJSON,
  typeJS: typeJS,
  matchType: matchType,
  exampleAtPath: exampleAtPath,
  TypeError: TypeError,
  matchParamTypes: matchParamTypes,
  typeSafe: typeSafe
});

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

const _requestsInFlight = [];

const observers = [];
const onRequest = method => {
  if (observers.indexOf(method) === -1) observers.push(method);
};
const offRequest = method => {
  const index = observers.indexOf(method);
  if (index > -1) observers.splice(index, 1);
};
const triggerObservers = () => {
  observers.forEach(observer => observer());
};

const _removeInFlightRequest = request => {
  const idx = _requestsInFlight.indexOf(request);
  if (idx > -1) {
    _requestsInFlight.splice(idx, 1);
  }
  triggerObservers();
};

const ajax = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    config = config || {};
    if (!config.headers) {
      config.headers = {};
    }
    var request = new XMLHttpRequest();
    _requestsInFlight.push(request);
    triggerObservers();
    request.open(method || 'GET', url, true);
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
            _removeInFlightRequest(request);
            reject(request);
            break
          case 3:
            // redirect of some kind
            break
          case 2:
            _removeInFlightRequest(request);
            resolve(request.responseText);
            break
        }
      }
    };
    if (typeof requestData === 'object') {
      requestData = JSON.stringify(requestData);
      config.headers['Content-Type'] = 'application/json; charset=utf-8';
    }
    for (var prop in config.headers) {
      request.setRequestHeader(prop, config.headers[prop]);
    }
    request.send(requestData);
  })
};

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
        resolve(new DOMParser().parseFromString(data, 'text/xml'));
      } catch (e) {
        console.error('Failed to parse data', data, e);
        reject(e, data);
      }
    }, reject);
  })
};

const json = (url, method, requestData, config) => {
  return new Promise(function (resolve, reject) {
    ajax(url, method, requestData, config).then(data => {
      try {
        resolve(JSON.parse(data || 'null'));
      } catch (e) {
        console.error('Failed to parse data', data, e);
        reject(e, data);
      }
    }, reject);
  })
};

let callbackCount = 0;
const jsonp = (url, callbackParam = 'callback', timeout = 2000) => {
  return new Promise(function (resolve, reject) {
    const callbackId = `_b8r_jsonp_callback_${++callbackCount}`;
    const script = document.createElement('script');
    const cleanup = () => {
      delete window[callbackId];
      document.body.removeChild(script);
    };

    window[callbackId] = (data) => {
      cleanup();
      resolve(data);
    };

    setTimeout(() => {
      if (script.parentElement) {
        cleanup();
        reject(new Error('request timed out'));
      }
    }, timeout);

    script.src = url + `&${callbackParam}=${callbackId}`;
    document.body.appendChild(script);
  })
};

const ajaxRequestsInFlight = () => _requestsInFlight;

var _ajax = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ajax: ajax,
  xml: xml,
  json: json,
  jsonp: jsonp,
  ajaxRequestsInFlight: ajaxRequestsInFlight,
  onRequest: onRequest,
  offRequest: offRequest
});

/**
# Stylesheets

Two utilities for dynamically adding style sheets to the document head.

Usage:

    import makeStyleSheet from 'path/to/makeStylesheet.js';
    makeStylesheet('h1 { font-size: 100px; }', 'my style sheet');

inserts:

    <style title="my style sheet">
      h1 { font-size: 100px; }
    </style>

in the document `<head>`.

    import {viaLink} from 'path/to/makeStyleSheet.js';
    viaLink('path/to/styles.css'); // inserts a <link> tag with appropriate href

inserts:

    <link rel="stylesheet" type="text/css" href="path/to/styles.css">

in the document <head> if (and only if) no such `<link>` tag is already present (it only checks for
`<link>` tags with the same `href`, so if you're doing something *really weird* with links this
might lead to duplicate links.)
*/

const makeStyleSheet = (source, title) => {
  const style = source ? create('style') : false;
  if (style) {
    style.type = 'text/css';
    style.dataset.title = title;
    style.appendChild(text(source));
    document.head.appendChild(style);
  }
  return style
};

/**
# uuid

A simple method for creading uuids. Usage:

        import {uuid} = from 'path/to/uuid.js';
        const some_uuid = uuid();

Also provides a simpler `unique` method that returns a unique
counter every time it's called — for when `uuid()` is overkill.

    import {unique} from 'path/to/uuid.js'

~~~~
const {uuid, unique} = await import('../source/uuid.js');
Test(() => uuid().match(/[0-9a-f]+/g).length).shouldBe(5);
Test(() => uuid().match(/[0-9a-f]+/g).map(s => s.length)).shouldBeJSON([8,4,4,4,12]);
Test(() => uuid().length).shouldBe(36);
Test(() => uuid()).shouldNotBe(uuid());
Test(() => unique()).shouldNotBe(unique());
~~~~
*/

const randomBytes =
  typeof window === 'undefined'
    ? () => {
      const nodeCrypto = require('crypto');
      return nodeCrypto.randomBytes(16)
    }
    : () => {
      const bs = new Uint8Array(16);
      window.crypto.getRandomValues(bs);
      return bs
    };

const uuid = () => {
  // RFC 4122 version 4
  const ud = randomBytes();
  ud[8] = ud[8] >> 2 | (0b10 << 6); // clock_seq_hi_and_reserved
  ud[6] = ud[6] >> 4 | (0b0100 << 4); // time_hi_and_version
  let i = 0;
  return 'xxxx-xx-xx-xx-xxxxxx'.replace(/x/g, () =>
    (0xf00 | ud[i++]).toString(16).slice(1)
  )
};

/**
# functions

This module provides convenient access to the `AsyncFunction` constructor.

    const f = new b8r.AsyncFunction(...args, code)

Utility functions for preventing a method from being called too frequently.
Not recommended for use on methods which take arguments!

    b8r.debounce(method, minInterval_ms) => debounced function

From a function `f`, create a function that will call f after the provided interval has passed,
the interval being reset if the function is called again.

E.g. you want to call a query "as the user types" but don't want to call until the user pauses
typing for a while or at least has a chance to type a few keys.

> A debounced method will call the original function at least once after the debounced version is
called.

    b8r.throttle(method, minInterval_ms) => throttled function

From a function `f`, create a function that will call f if and only if the function hasn't
been called in the last interval.

> If you call f several times within the specified interval, *only the first call will fire*.

    b8r.throttleAndDebounce(method, minInterval_ms) => throttled and debounced function

This combines the two concepts. If called repeatedly, it will not fire more often than once
per interval, and will fire after the interval has passed since the last call.

E.g. if you want to respond 'live' to a user dragging something around or resizing an object,
but you don't want to do it 60 times per second, `throttleAndDebounce` will ensure that it
updates throughout the operation and fires one last time after the operation stops.

    await b8r.delay(milliseconds, value=null)

`delay` is a simple utility function that resolves after the specified amount of time to
the value specified (null by default).

~~~~
// title: throttle and debounce tests

const {debounce, delay, throttle, throttleAndDebounce} = await import('../source/b8r.functions.js')

Test(async () => {
  const failures = []
  const delayMs = Math.random() * 1000 + 1000
  let outcome
  outcome = await delay(delayMs, 'foo')
  if(outcome !== 'foo') failures.push('expected "foo" to be passed through')
  const start = Date.now()
  outcome = await delay(delayMs)
  if(Date.now() - start - delayMs > 50) failures.push(`delay should be roughly ${delayMs}ms, was ${Date.now() - start}ms`)
  return failures
}, 'delay works').shouldBeJSON([])

Test(async () => {
  const outcomes = []
  const boing = debounce((x) => { outcomes.push(x) }, 100)
  const failures = []

  boing(1)
  boing(2)
  boing(3)
  if(outcomes.length > 0) failures.push('no boing should have fired yet')
  await delay(1000)
  if(outcomes[0] !== 3) failures.push('boing(3) should have fired first')
  boing(4)
  boing(5)
  if(outcomes.length > 1) failures.push('only one boing should have fired')
  await delay(130)
  if(outcomes[1] !== 5) failures.push('boing(5) should have fired second')
  await delay(130)
  await delay(200)
  if(outcomes.length > 2) failures.push('only two boings should ever fire')
  return failures
}, 'debounce works').shouldBeJSON([])

Test(async () => {
  const outcomes = []
  const buzz = throttle((x) => {
    outcomes.push(x)
  }, 100)
  const failures = []

  buzz(1)
  buzz(2)
  buzz(3)
  if(outcomes[0] !== 1 || outcomes.length !== 1) failures.push('only buzz(1) should have fired')
  await delay(130)
  if(outcomes.length !== 1) failures.push('no more buzzes should have fired')
  buzz(4)
  buzz(5)
  if(outcomes[1] !== 4 || outcomes.length !== 2) failures.push('buzz(4) should have fired second')
  await delay(200)
  if(outcomes.length > 2) failures.push('only two buzzes should ever fire')
  return failures
}, 'throttle works').shouldBeJSON([])

Test(async () => {
  const outcomes = []
  const buzz = throttleAndDebounce((x) => {
    outcomes.push(x)
  }, 100)
  const failures = []
  buzz(1)
  buzz(2)
  buzz(3)
  if(outcomes[0] !== 1 || outcomes.length !== 1) failures.push('only buzz(1) should have fired')
  await delay(130)
  if(outcomes[1] !== 3 || outcomes.length !== 2) failures.push('buzz(3) should have fired via debounce')
  buzz(4)
  if(outcomes[2] !== 4 || outcomes.length !== 3) failures.push('buzz(4) should have fired immediately')
  buzz(5)
  buzz(6)
  await delay(200)
  if(outcomes[3] !== 6 || outcomes.length !== 4) failures.push('buzz(6) should have fired via debounce')
  await delay(200)
  if(outcomes.length > 4) failures.push('no more buzzes should have fired')
  return failures
}, 'throttleAndDebounce works').shouldBeJSON([])
~~~~
*/

const delay = (delayMs, value = null) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(value), delayMs);
});

const debounce = (origFn, minInterval) => {
  let debounceId;
  return (...args) => {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      origFn(...args);
    }, minInterval);
  }
};

const throttle = (origFn, minInterval) => {
  let previousCall = Date.now() - minInterval;
  let inFlight = false;
  return (...args) => {
    const now = Date.now();
    if (!inFlight && now - previousCall >= minInterval) {
      inFlight = true;
      try {
        origFn(...args);
      } finally {
        previousCall = now;
        inFlight = false;
      }
    }
  }
};

const throttleAndDebounce = (origFn, minInterval) => {
  let debounceId;
  let previousCall = Date.now() - minInterval;
  let inFlight = false;
  return (...args) => {
    clearTimeout(debounceId);
    debounceId = setTimeout(async () => origFn(...args), minInterval);
    if (!inFlight && Date.now() - previousCall >= minInterval) {
      inFlight = true;
      try {
        origFn(...args);
        inFlight = false;
        previousCall = Date.now();
      } finally {}
    }
  }
};

const AsyncFunction = async function () {}.constructor;

const memoize = f => {
  if (f._isMemoized) return f
  let previousArgs = [];
  let previousResult;
  const memoized = function (...args) {
    const newArgs = [this, ...args];
    const differences = previousResult === undefined || newArgs.filter((item, index) => item !== previousArgs[index]).length;
    if (differences) {
      previousArgs = newArgs;
      previousResult = f.call(this, ...args);
    }
    return previousResult
  };
  memoized._isMemoized = true;
  return memoized
};

var _functions = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AsyncFunction: AsyncFunction,
  debounce: debounce,
  delay: delay,
  throttle: throttle,
  throttleAndDebounce: throttleAndDebounce,
  memoize: memoize
});

/**
# Components

Load a component from a specified url (and give it the name specified). If no
name is specified, it will be inferred from the url (the part of the file name
before the first period).

    b8r.component([name,] url)

Load component at `path/to/foo.component.html` and name it 'foo':

    b8r.component('path/to/foo')
    // or
    b8r.component('path/to/foo.component.html')

Load component at `path/to/foo.component.html` and name it 'bar':

    b8r.component('bar', 'path/to/foo')

Load (javascript) component from `path/to/foo.js` and name it 'foo':

    b8r.component('path/to/foo.js')

Load (javascript) component from `path/to/bar.component.js` and name it 'bar':

    b8r.component('path/to/bar.component.js')

`b8r.component(...)` returns a promise of the component once loaded. Components
are not stored in the registry so don't worry about their names conflicting with
registry entries.

**Why would you rename a component?** You might be trying to use components from
different sources that share a name, or you might want to style the same component
differently in different contexts. Any component instance will be given the
class `<component-name>-component`.

As soon as a component is loaded, instances of the component will automatically be
inserted where-ever they were specified.

    b8r.insertComponent(component, element, data);

Insert a component by name or by passing a component record (e.g. promised by
component() or produced by makeComponent)

If no element is provided, insertComponent will be append the instance to `document.body`.

Data will be passed to the component's load method and registered as the
component's private instance data. (Usually data is passed automatically
from parent components or via binding, e.g. `data-path="path.to.data` binds that
data to the component).

    b8r.removeComponent(elt); // removes the component's class and instance and empties the element

If elt has a component in it (i.e. has the attribute `data-component-id`) removes the
element's contents, removes the component-id, and removes any class that ends with '-component'.
Note that `removeComponent` does not preserve children!

## Creating Components Programmatically

Instead of writing `something.component.html` and loading it using `b8r.component`
you can make component's programmatically (i.e. using Javascript) and simply `import()`
the file to load the component.

### Version 2 Components

Version 2 components are pure Javascript and support type-checking. (The latter is
work in progress.) They also do not provide you with `data` as a `load` parameter
(use `get()` instead if you must).

The best way to create components programmatically (and, arguably, the best way to
create components period) is using the new `makeComponent(name, specObject)` syntax.
Unlike the old method, the new version doesn't use `eval` and lints without needing
global declarations.

    export default const componentName = makeComponent('component-name', {
      css: '._component_ > div { color: yellow }',
      html: '<div>this text will be yellow</div>',
      initialValue: {...},
                   // specify the component's initial value
                   // or you can provide an [async] function
                   // ({b8r, get, set, touch, on, component, findOne, findOneWithin}) => { ... } // return intial value
      load: async ({
        component, // this is the element that the component is inserted into
        b8r,       // it's b8r!
        find,      // b8r.findWithin(component, ...)
        findOne,   // b8r.findOneWithin(component, ...)
        register,  // replace the component's private data object
        get,       // get (within the component's private data)
        set,       // set (within the component's private data)
        on,        // b8r.on(component, ...)
        touch      // force updates of paths inside the component
      }) => {
        // your javascript goes here
      },
      type: {...}, // specify the component's type
    })

All of these properties are optional. `type` is [by example](?source=source/b8r.byExample.js).

```
<b8r-component name="typed"></b8r-component>
<script>
  b8r.makeComponent('typed', {
    html: `
      <p data-bind="text=_component_.caption"></p>
      <button data-event="click:_component_.typeError">Generates Type Error in Console</button>
      <button data-event="click:_component_.resetCaption">No Type Error</button>
    `,
    load({get, set, data}) {
      set({
        typeError: () => set('caption', 17),
        resetCaption: () => set('caption', 'I\'m a string again!')
      })
    },
    initialValue: {
      caption: 'this is ok',
    },
    type: { caption: 'string' }
  })
</script>
```

You only need to destructure the parameters you want to use (to avoid linter complaints
about unused variables).

```
<b8r-component name="no-eval"></b8r-component>
<script>
  b8r.makeComponent('no-eval', {
    css: '._component_ > span { color: yellow; }',
    html: '<span></span>',
    load: async ({findOne}) => {
      findOne('span').textContent = 'Hello Pure Component'
    }
  })
</script>
```
### Making a Component from HTML Source

This is how `b8r` makes components from `.html` files (and also in its inline "fiddles").

    makeComponent(name, source, url, preserveSource); // preserveSource are optional

Create a component with the specified name, source code, and url. Use preserveSource if
you want the component's source code kept for debugging purposes.

`makeComponent` is used internally by component to create components, and by the documentation
system to create components interactively. In general you won't need to use this method at all.

## `b8r.insertComponent`

You can programmatically insert a component instance thus:

    b8r.insertComponent(component, target, data)

`component` can be a component name or a loaded component definition, while target is
the element you want to insert the element into, and `data` is the initial value of
the component. Only the first argument is required.

If `target` is not provided, a new element is appended to document.body and the
component is inserted into it.

## `b8r.componentOnce`

If you want to make sure there's exactly one instance of a component:

    b8r.componentOnce(url [,name]);

This loads the component (if necessary) and then if there is no instance of the component
in the DOM it creates one. It replaces the pattern:

    b8r.component(url).then(c => b8r.insertComponent(c));

And doesn't run the risk of leaking multiple instances of components into the DOM.

## Composing Components

By default, a component replaces the content of the element it is inserted into.
If a component has an element with the `data-children` attribute then this element
will contain the children of the original element.

```
<b8r-component name="translucent-parent">
  <h2>Hello</h2>
  <b8r-component name="translucent-parent">
    world
  </b8r-component>
</b8r-component>
<script>
    b8r.makeComponent('translucent-parent', {
      css: `._component_ {
        display: block;
        background: rgba(255,0,0,0.1);
      }`,
      html: `<div data-children></div>`
    })
</script>
```

## Container Components

    b8r.wrapWithComponent(component, element [, data_path [, attributes]]);

Sometimes you want a component *outside* an element rather than inside it.
The most common example is trying to create a specific modal or floater wrapped
inside a generic modal or floater "wrapper". You could simply use the
generic component inside the specific component but then the generic component
has no simple way to "clean itself up".

`b8r.wrapWithComponent()` returns the wrapping element.

    <div
      class="my-custom-dialog"
      data-component="modal"
    >
      <button
        data-event="click:_component_.terrific"
      >Terrific</button>
    </div>
    <script>
      set('terrific', () => alert('This is terrific!'));
    </script>

In the above example the modal ends up inside the `my-custom-dialog` div. Supposing
that the modal's behavior includes removing itself on close, it will leave behind the
component itself (with nothing inside).

Instead with `wrapWithComponent` you could do this (in a component):

    <button>Terrific</button>
    <script>
      b8r.component('components/modal');
      b8r.wrapWithComponent('modal', component);
      set('terrific', () => alert('This is terrific!'));
    </script>

(Note that this example doesn't play well with the inline-documentation system!)

## Destructors

Component instances are automatically cleaned up once the component element is
removed from the DOM or its id changes (e.g. a new component is loaded over it).
If you want to force a cleanup, you can call:

    b8r.cleanupComponentInstances();

If a component has a method named `destroy` it will be called just before the instance
is removed from the registry.
*/

const components = {};
const componentTimeouts = [];
const componentPromises = {};
const componentTypes = {};

const processComponent = (css, html, name) => {
  const view = create('div');
  view.innerHTML = html || '';
  const className = `${name}-component`;
  const style = css ? makeStyleSheet(css.replace(/_component_/g, className), className) : false;
  for (const elt of findWithin(view, '[class*="_component_"]')) {
    elt.setAttribute(
      'class',
      elt.getAttribute('class').replace(/_component_/g, className)
    );
  }
  return { style, view }
};

const makeComponentNoEval = function (name, { css, html, load, initialValue, type }) {
  const {
    style,
    view
  } = processComponent(css, html, name);
  const component = {
    version: 2,
    name,
    style,
    view,
    path: `inline-${name}`,
    initialValue,
    type
  };

  if (type) {
    if (!type || typeof type !== 'object') {
      throw new Error(`component ${name} has bad type, object expected`)
    }
    componentTypes[name] = type;
  }

  if (load) {
    // _register is masked because it shouldn't be used any more
    component.load = async (_component, b8r, find, findOne, data, _register, get, set, on, touch) => {
      load({ component: _component, b8r, data, find, findOne, get, set, on, touch });
    };
  }

  if (componentTimeouts[name]) {
    clearInterval(componentTimeouts[name]);
  }

  find(`[data-component="${name}"]`).forEach(element => {
    // somehow things can happen in between find() and here so the
    // second check is necessary to prevent race conditions
    if (!element.closest('[data-list]') && element.dataset.component === name) {
      asyncUpdate(false, element);
    }
  });
  if (components[name]) console.warn('component %s has been redefined', name);
  components[name] = component;
  return component
};

const makeComponent = (name, source, url, preserveSource) => {
  if (typeof source === 'object' && url === undefined) {
    return makeComponentNoEval(name, source)
  }
  let css = false; let content; let script = false; let parts; let remains;

  if (!url) url = uuid();

  // nothing <style> css </style> rest-of-component
  parts = source.split(/<style>|<\/style>/);
  if (parts.length === 3) {
    [, css, remains] = parts;
  } else {
    remains = source;
  }

  // content <script> script </script> nothing
  parts = remains.split(/<script[^>\n]*>|<\/script>/);
  if (parts.length >= 3) {
    [content, script] = parts;
  } else {
    content = remains;
  }

  const {
    style,
    view
  } = processComponent(css, content, name);
  /* jshint evil: true */
  let load = () => console.error('component', name, 'cannot load properly');
  // check for legacy components
  if (script && script.match(/[\b_]require\b/) && !script.match(/\belectron-require\b/)) {
    console.error(`in component "${name}" replace require with await import()`);
    script = false;
  }
  try {
    load = script
      ? new AsyncFunction(
        'component',
        'b8r',
        'find',
        'findOne',
        'data',
        'register',
        'get',
        'set',
        'on',
        'touch',
        `${script}\n//# sourceURL=${name}(component)`
      )
      : false;
  } catch (e) {
    console.error('error creating load method for component', name, e, script);
    throw new Error(`component ${name} load method could not be created`)
  }
  /* jshint evil: false */
  const component = {
    name,
    style,
    view,
    load,
    path: url.split('/').slice(0, -1).join('/')
  };
  if (component.path === 'undefined') {
    debugger // eslint-disable-line no-debugger
  }
  if (preserveSource) {
    component._source = source;
  }
  if (componentTimeouts[name]) {
    clearInterval(componentTimeouts[name]);
  }
  if (components[name]) {
    // don't want to leak stylesheets
    if (components[name].style) {
      components[name].style.remove();
    }
    console.warn('component %s has been redefined', name);
  }
  components[name] = component;

  find(`[data-component="${name}"]`).forEach(element => {
    // somehow things can happen in between find() and here so the
    // second check is necessary to prevent race conditions
    if (!element.closest('[data-list]') && element.dataset.component === name) {
      asyncUpdate(false, element);
    }
  });
  return component
};

// path/to/../foo -> path/foo
const collapse = path => {
  while (path.match(/([^/]+\/\.\.\/)/)) {
    path = path.replace(/([^/]+\/\.\.\/)/g, '');
  }
  return path
};

/**
~~~~
// title: component (v1) loading tests
const {name} = await b8r.component('../test/custom-test.html')
Test(async () => {
  return name
}).shouldBe('custom-test')
Test(async () => {
  await b8r.componentOnce('custom-test')
  b8r.findOne('.custom-test-component').style.display = 'none'
  return b8r.find('.custom-test-component').length
}).shouldBe(1)
Test(async () => {
  await b8r.componentOnce('custom-test')
  return b8r.find('.custom-test-component').length
}).shouldBe(1)
~~~~
*/

const component = (name, url, preserveSource = false) => {
  if (url === undefined) {
    url = name;
    name = url.split('/').pop().split('.').shift();
  }
  if (!componentPromises[name] || preserveSource) {
    if (!url) throw new Error(`expected component ${name} to be defined`)
    url = collapse(url);
    componentPromises[name] = new Promise(function (resolve, reject) {
      if (components[name] && !preserveSource) {
        resolve(components[name]);
      } else if (url.match(/\.m?js$/)) {
        new Promise(function (resolve) { resolve(_interopNamespace(require(url))); }).then(exports => {
          if (components[name]) {
            resolve(components[name]);
          } else if (exports.default && typeof exports.default === 'object') {
            resolve(makeComponent(name, exports.default));
          } else {
            const err = `cannot define component "${name}", ${url} does not export a component definition as default`;
            console.error(err);
            reject(err);
          }
        }).catch(err => {
          delete componentPromises[name];
          console.error(err, `failed to import component ${url}`);
          reject(err);
        });
      } else {
        const finalUrl = url.match(/\.\w+$/) ? url : `${url}.component.html`;
        ajax(finalUrl)
          .then(source => resolve(makeComponent(name, source, url, preserveSource)))
          .catch(err => {
            delete componentPromises[name];
            console.error(err, `failed to load component ${url}`);
            reject(err);
          });
      }
    });
  }
  return componentPromises[name]
};

/**
## `_b8r_` — Built-in Event Handlers

The `_b8r_` object is registered by default as a useful set of always available
methods, especially for handling events.

You can use them the obvious way:

    <button data-event="click:_b8r_.echo">
      Click Me, I cause console spam
    </button>

    _b8r_.echo // logs events to the console
    _b8r_.stopEvent // use this to simply catch an event silently
    _b8r_._update_ // this is used by b8r to update models automatically
*/
let set;
const _insertSet = f => { set = f; };
let fromTargets;
const _insertFromTargets = t => { fromTargets = t; };

const hasFromTarget = (t) => fromTargets[t.target];

const _b8r_ = {
  echo: evt => console.log(evt) || true,
  stopEvent: () => {},
  _update_: evt => {
    let elements = findAbove(evt.target, '[data-bind]', null, true);
    // update elements with selected fromTarget
    if (evt.target.tagName === 'SELECT') {
      const options = findWithin(evt.target, 'option[data-bind]:not([data-list])');
      elements = elements.concat(options);
    }
    elements.filter(elt => !elt.matches('[data-list]')).forEach(elt => {
      const bindings = getBindings(elt);
      for (let i = 0; i < bindings.length; i++) {
        const { targets, path } = bindings[i];
        const boundTargets = targets.filter(hasFromTarget);
        const processFromTargets = t => { // jshint ignore:line
          // all bets are off on bound values!
          const value = fromTargets[t.target](elt, t.key);
          if (value !== undefined) {
            delete elt._b8rBoundValues;
            set(path, value, elt);
          }
        };
        boundTargets.forEach(processFromTargets);
      }
    });
    return true
  }
};

/**
# The Registry

Bindinator is built around the idea of registering objects under unique names
and binding events and element properties to paths based on those names.

## `reg`—better living through Proxies

### How it started

    b8r.register('my-object', {foo: 17, bar: {baz: 'lurman'}})
    const text = b8r.get('path.to.text')
    b8r.set('path.to.text', 'new string')
    b8r.pushByPath('path.to.array', {id: 17, name: 'new item'})
    const itemByIdPath = b8r.get('path.to.array[id=17]') // one of b8r's coolest features

### How it's going

    b8r.reg['my-object'] = {foo: 17, bar: {baz: 'lurman'}}
    const text = b8r.reg.path.to.text
    b8r.reg.path.to.text = 'new string'
    b8r.reg.path.to.array.push({id: 17, name: 'new item'})   // also sort, find, forEach, etc.
    const itemByIdPath = b8r.reg.path.to.array['id=17']      // works!

Thanks to the magic of ES6 Proxy, `b8r` can finally have the syntax I
always wanted. Thank you to [Steven Williams](https://www.linkedin.com/in/steven-williams-2ba1124b/)
for the suggestion.

`b8r.reg` is a proxy for its `registry`, providing syntax-sugar for `get` and `set` via
an ES6 Proxy. The registry object is wrapped with a proxy that returns its object properties as
proxies, and so on (recursively), each knowing the path of the value it wraps.

    import {reg} from 'path/to/b8r.js'
    const obj = {
      bar: 17,
      baz: {lurman: 'hello world'},
      list: [{id: 1, name: 'marco'}, {id: 2, name: 'polo'}],
      func(message) {
        alert(message)
      }
    }

    reg.foo = obj               // registers the obj as 'foo'
    reg.foo                     // is now a proxy for obj
    reg.foo.baz                 // proxy for obj.baz
    reg.foo.bar                 // 17
    reg.foo.baz.lurman          // 'hello world'
    reg.foo.bar = -1            // b8r.set('foo.bar', -1)
    reg.foo.list[0].name        // 'marco'
    reg.foo.list['id=2'].name   // 'polo'
    reg.foo.func('hello world') // calls the function

You can tell whether a value is a "real" value or a reg proxy by seeing if it has a
`_b8r_sourcePath`. You can obtain its underlying value (i.e. the value bound to its path)
via `_b8r_value`.

<b8r-component path="components/fiddle" data-source="components/list"></b8r-component>

You can try the following in the console:

    const {example2} = b8r.reg

    example2.fleet = 'My Own Fleet'
    example2.list['id=ncc1701'].name = 'Free Enterprise'

### "You cannot put reg proxies into the registry"

`b8r` will block any attempt to bind a reg proxy! Binding a reg proxy can lead to
very odd side-effects. (And, in general, binding the same object to multiple paths
is a "bad idea" anyway.)

~~~~
// title: proxy

b8r.reg.proxyTest = {
  foo: 17,
  bar: {baz: 'world'},
  ships: [
      {id: 'ncc-1701', name: 'Enterprise'},
      {id: 'ncc-1031', name: 'Discovery'},
      {id: 'ncc-74656', name: 'Voyager'},
  ]
}

Test(() => b8r.get('proxyTest.foo'), 'registration works').shouldBe(17)
b8r.reg.proxyTest.foo = Math.PI
Test(() => b8r.get('proxyTest.foo'), 'setting path works').shouldBe(Math.PI)
Test(() => b8r.reg.proxyTest.ships["id=ncc-1031"].name, 'getting id-path works').shouldBe("Discovery")
b8r.reg.proxyTest.ships["id=ncc-1031"].name = 'Clear Air Turbulence'
Test(() => b8r.reg.proxyTest.ships["id=ncc-1031"].name, 'setting id-path works').shouldBe("Clear Air Turbulence")
Test(() => b8r.get('proxyTest.ships[id=ncc-1031].name'), 'get agrees').shouldBe("Clear Air Turbulence")
let changes = 0
b8r.observe('proxyTest.bar', () => changes++)
b8r.reg.proxyTest.bar.baz = 'hello'
Test(() => b8r.get('proxyTest.bar.baz'), 'setting deep path works').shouldBe('hello')
b8r.reg.proxyTest.bar = {baz: 'fred'}
Test(() => b8r.get('proxyTest.bar.baz'), 'setting object works').shouldBe('fred')
Test(() => changes, 'changes were detected').shouldBe(2)
b8r.reg.proxyTest.ships.sort(b8r.makeAscendingSorter(ship => ship.name))
Test(() => b8r.reg.proxyTest.ships[0].name, 'array sort works').shouldBe('Clear Air Turbulence')
Test(() => b8r.reg.proxyTest.ships.slice(1)[0].name, 'slice works').shouldBe('Enterprise')
b8r.reg.proxyTest.ships.splice(1, 0, {id: 17, name: 'Death Star'})
Test(() => b8r.reg.proxyTest.ships[1].name, 'splice works').shouldBe('Death Star')
b8r.reg.proxyTest.ships.push({id: 1, name: 'Galactica'}, {id: 2, name: 'No More Mr Nice Guy'})
Test(() => b8r.reg.proxyTest.ships.length, 'push works').shouldBe(6)
Test(() => b8r.reg.proxyTest.ships[5].id, 'push works').shouldBe(2)
const ship = b8r.reg.proxyTest.ships.pop()
b8r.reg.proxyTest.ships.unshift(ship)
Test(() => ship.id, 'pop works').shouldBe(2)
Test(() => b8r.reg.proxyTest.ships[0].id, 'unshift works').shouldBe(2)
Test(() => {
  b8r.reg.proxyError = b8r.reg.proxyTest
}, 'putting reg proxies into the registry via assignment is blocked').shouldThrow()
Test(() => {
  b8r.set('proxyError', b8r.reg.proxyTest)
}, 'putting reg proxies into the registry via assignment is blocked').shouldThrow()
~~~~

**How does it work?** [ES6 Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
objects allow you to intercept property lookups and handle them programmatically.
In essence, they're computed properties where the name is passed to `get()` and `set()`.
This is supported by all the major browsers (except IE) since ~2016.

### TODO
- might we want to implement `b8r.obs.path.to.whatever` that provides a proxied `Observable`?
- it would be cool if changing an array element by index triggered changes in id-path
  bindings and vice-versa

## register, get, set, replace, and touch

Both of these lines register an object under the name 'root':

    register('root', object_value);
    set('root', object_value);

You can set values deep inside objects using `paths`:

    set('root.path.to.value', new_value); // sets the value

Note that `set` overlays values onto what's there, so:

    register('foo', {})
    set('foo.bar', 17)
    set('foo', {baz: 'hello'})
    get('foo') // {bar: 17, baz: 'hello'}

If you want to completely replace an object at a path, use `replace`:

    replace('foo', {baz: 'lurman'})
    get('foo.bar') // null

Under the hood, `replace('path.to.object', obj)` is simply `b8r.set('path.to.object', null)`
followed by `b8r.set('path.to.object', obj)`.

~~~~
// title: register, set, replace tests

b8r.register('replace-test', {})
b8r.set('replace-test.foo', 17)
b8r.set('replace-test', {bar: 'baz'})
Test(() => b8r.get('replace-test.bar')).shouldBe('baz')
Test(() => b8r.get('replace-test.foo')).shouldBe(17)
b8r.replace('replace-test', {bar: 'replaced'})
Test(() => b8r.get('replace-test.bar')).shouldBe('replaced')
Test(() => b8r.get('replace-test.foo')).shouldBe(null)
b8r.remove('replace-test')
~~~~

You can set the registry's properties by path. Root level properties must be objects.

    get('root.path.to.value'); // gets the value

You can get a property by path.

    b8r.remove("name-of-registry-item"); // removes a registered object
    b8r.remove("path.to.value"); // removes a value at path

Remove a registered (named) object. deregister also removes component instance objects
for components no longer in the DOM.

## Paths

Data inside the registry is [accessed by path](?source=source/b8r.byPath.js).
A path is a text string that resembles javascript object references, e.g.

    const foo = {
      bar: [{
        id: 17,
        baz: 'lurman'
      }]
    }

    console.log(foo.bar[0].baz) // "lurman"

    b8r.register('foo', foo)
    console.log(b8r.get('foo.bar[0].baz')) // "lurman"

The big differences are that array references can be by `index` or
by a `path expression`, e.g.

    b8r.get('foo.bar[id=17].baz') // "lurman"

**Note** that the `only` comparison allowed is `=` and it's a stringified
comparison. In practice this has never been a problem since it's usually
used to match primary key ids or uuids.

`b8r` also accepts **relative** bindings inside element bindings (e.g.
 `data-path`, `data-list`, and `data-event` attributes)

A binding that starts with a `.` is bound to the array member the closest containing
list-instance is bound to.

    // assuming that 'foo' was registered as above
    <ul>
      <li data-list="foo.bar" data-bind="text=.baz"></li>
    </ul>

A binding that starts with `_component_.` is bound to the component instance
data. Here's a simple component example:

```
<!-- a component -->
<div data-bind="text=_component_.foo.bar[id=17].baz"></div>
<script>
  data.foo = {
    bar: [{id: 17, baz: 'hello world'}]
  }
</script>
```

## Calling functions in the registry

The new way:

    const result = b8r.reg.root.path.to.method(...args)

The old way:

    const result = call('root.path.to.method', ...args)

Either of these methods allows you to call a function by path.
You can always do the following, of course:

    const result = get('root.path.to.method')(...args)

Note that this is equivalent to:

    const {method} = get('root.path.to')
    method(...args)

So if the method relies on being bound to its container, it will
fail.

## Triggering Updates

Normally, if you bind something to a path it will automatically receive its values
when the root object is registered. If the object is changed by the user (vs. code)
then the registry should automatically be updated and propagate the changes to other bound objects.
If you set a value by path, it should automatically propagate the changes.

But, there will be times when you need to change values directly and notify the registry
afterwards.

    touch(path [, sourceElement]);

Triggers all observers as though the value at path has changed. Useful
if you change a property independently of the registry.

The `sourceElement` parameter is used to indicate that the source of the
change is a particular element. That element will not be updated by `b8r`.
(You probably don't need to worry about this, but it prevents unnecessary
updates to, for example, an `<input>` control that the user is editing which
can interfere with selection and focus.)

    touch(path);

Triggers all observers asynchronousely (on requestAnimationFrame).

## Type Checking

You can enforce type checking on registry entries using `registerType`.

    b8r.registerType('foo', {bar: 17})

This will use `matchType` (see [Type Checking by Example](?source=source/b8r.byExample.js))
to compare the specified registry entry when that entry is initialized or changed. So, if you
registered the type of 'foo' as above, then:

    b8r.register('foo', {bar: 100}) // no problem
    b8r.set('foo.bar', 0) // no problem
    b8r.set('foo.bar', 'hello') // generates a console error

There is a *small* overhead to doing this type checking, and it will not *prevent*
incorrect values being added to the register (yet), but it will do a pretty good
job of telling you exactly what went wrong.

(PLANNED) I plan to make type checking more efficient and have it throw
on erroneous changes rather than simply complain about them. The mechanism will
be if you change `path.to.value` then `b8r` will attempt to do with most specific
check possible (e.g. compare what's at `path.to.value` with the new value rather
than the resultant registry entry for `path` with whatever is there after the change.

THe trick is to deal with (a) `Match` instances in the hierarchy and (b) arrays.

### Custom Handling of Type Errors

By default, type errors are simply spammed to the console. You can override
this behavior by using `b8r.onTypeError(callback)` to set your own handler (e.g. to
log the failure or trigger an alarm.) This handler will receiving two arguments:

- `errors` -- an array of descriptions of type failures, and
- `action` -- a string

describing the operation that failed.

For example:

    const typeErrorHandler = (errors, action) => {
      b8r.json('/logerror', 'post', {timestamp: Data.now(), action, errors})
    }
    b8r.onTypeError(typeErrorHandler)   // adds your type error handler (returns true on success)
                                        // also removes the default typeErrorHandler (which simply prints to console)
    b8r.offTypeError(typeErrorHandler)  // removes the error handler (returns true on success)

~~~~
// title: type errors
Test(
  async () => {
    let _errors
    const errorHandler = errors => { _errors = errors }
    b8r.registerType('error-handling-test', {
      number: 17
    })
    b8r.register('error-handling-test', {
      number: 0
    })
    b8r.onTypeError(errorHandler)
    b8r.set('error-handling-test.number', false)
    b8r.offTypeError(errorHandler, true)
    b8r.remove('error-handling-test')
    return _errors
  },
  'verify custom handler for type errors works'
).shouldBeJSON(["error-handling-test.number was false, expected number"])
~~~~

### Component Type Checks (PLANNED)

A component can register a type for its private data by calling `registerType()`
and then all its instances will be checked against this type and static
analysis can check internal bindings, e.g.:

    <div data-bind="text=_component_.caption">Caption</div>
    <script>
      componentType('{"caption": "hello"}')
      ...
    </script>

The component-type can be inline JSON (as above) or a named reference to a type
defined in `b8r-registry-types.js`:

    componentType('hasCaption')

### Static Type Checks (PLANNED)

If you provide `b8r-registry-types.js`, which might look like this:

    export const documents = {
      ...
    }
    export const app = {
      ...
    }

Then you can then do something like:

    import {app, documents} from './b8r-registry-types.js'
    b8r.registerType('app', app)
    b8r.registerType('documents', documents)

I'll probably add a convenience function so you could write something like this:

    import * as types from './b8r-registry-types.js'
    b8r.registerTypes(types)

`b8r` will provide static analysis tools in the form of an ESLint plugin and an
HTMLHint plugin/fork that will identify type errors based on the exported
examples in `b8r-registry-types.js`, the goal being to flag any bad bindings
in components, and in general identify as many errors as possible before they occur.

## JSON Utilities

Two convenience methods are provided for working with JSON data:

    getJSON('path.to.value' [, element]);
    setJSON('path.to.value', json_string);

    isValidPath(path);

`isValidPath` returns true if the path looks OK, false otherwise.

~~~~
// title: paths
Test(() => b8r.isValidPath(''), 'NO empty paths').shouldBe(false);
Test(() => b8r.isValidPath('.'), 'NO bare period').shouldBe(false);
Test(() => b8r.isValidPath('.foo'), 'list-instance binding').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[id=1234].'), 'NO trailing period').shouldBe(false);
Test(() => b8r.isValidPath('foo'), 'simple variable names').shouldBe(true);
Test(() => b8r.isValidPath('_foo'), 'simple variable names').shouldBe(true);
Test(() => b8r.isValidPath('foo_17'), 'simple variable names').shouldBe(true);
Test(() => b8r.isValidPath('foo.bar'), 'simple.paths').shouldBe(true);
Test(() => b8r.isValidPath('path.to.value,another.path'), 'NO comma-delimited paths').shouldBe(false);
Test(() => b8r.isValidPath('foo()'), 'NO method calls').shouldBe(false);
Test(() => b8r.isValidPath('foo(path.to.value,another.path)'), 'NO method calls').shouldBe(false);
Test(() => b8r.isValidPath('/'), 'root path').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[1234]'), 'array index').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[=abcd]'), 'object key paths').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[/=abcd]'), 'array lookup by element value').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[id=1234]'), 'simple id-path').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[url=https://foo.bar/baz?x=y]'), 'id-path with nasty value').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[url=https://foo.bar/baz?x=y&foo=this, that, and the other.jpg]'), 'id-path with nastier value').shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms]'), 'NO failed to open brackets').shouldBe(false);
Test(() => b8r.isValidPath('airtime-rooms[id=1234'), 'NO fail to close brackets').shouldBe(false);
Test(() => b8r.isValidPath('airtime-rooms[id]'), 'NO non-numeric array index / missing comparison').shouldBe(false);
Test(() => b8r.isValidPath('airtime-rooms[id=1234]]'), 'NO extra close bracket').shouldBe(false);
Test(() => b8r.isValidPath('airtime-rooms[]]'), 'NO failure to provide index').shouldBe(false);
~~~~

## Examples

    b8r.set('model.data.path', value);
    b8r.setByPath('model', 'data.path, value);
    b8r.setByPath('model.data.path', value);

Set a registered object's property by path; bound elements will be updated automatically.

    b8r.get('model.data.path');
    b8r.getByPath('model', 'data.path');
    b8r.getByPath('model.data.path');

Get a registered object's property by path.

    b8r.pushByPath('model', 'data.path', item, callback);
    b8r.pushByPath('model.data.path', item, callback);

As above, but unshift (and no callback).

    b8r.unshiftByPath('model', 'data.path', item);
    b8r.unshiftByPath('model.data.path', item);

Insert an item into the specified array property. (Automatically updates bound
lists).

> ### Note
>
> I'm always looking at ways to streamline `b8r` code, usually without breaking
> anything, and ideally making the resulting code easier to read, write, and grok.
>
> <pre>
> b8r.getByPath('path', 'to.value')                // original
> b8r.setByPath('path', 'to.value', new_value)
>
> b8r.get('path.to.value')                         // simplified
> b8r.set('path.to.value', new_value)
>
> b8r.reg.path.to.value                            // using Proxy
> b8r.reg.path.to.value = new_value
> </pre>
> The older APIs (setByPath, etc.) will ultimately be deprecated. Even now they
> are little more than wrappers for set/get. See the *Registry* docs.

*/

const registry = { _b8r_ };
const registeredTypes = {};
const listeners = []; // { path_string_or_test, callback }
const validPath = /^\.?([^.[\](),])+(\.[^.[\](),]+|\[\d+\]|\[[^=[\](),]*=[^[\]()]+\])*$/;

const isValidPath = path => validPath.test(path);

class Listener {
  constructor (test, callback) {
    this._orig_test = test; // keep it around for unobserve
    if (typeof test === 'string') {
      this.test = t => typeof t === 'string' && t.startsWith(test);
    } else if (test instanceof RegExp) {
      this.test = test.test.bind(test);
    } else if (test instanceof Function) {
      this.test = test;
    } else {
      throw new Error('expect listener test to be a string, RegExp, or test function')
    }
    if (typeof callback === 'string') {
      this.callback = (...args) => {
        if (get(callback)) {
          call(callback, ...args);
        } else {
          unobserve(this);
        }
      };
    } else if (typeof callback === 'function') {
      this.callback = callback;
    } else {
      throw new Error('expect callback to be a path or function')
    }
    listeners.push(this);
  }
}

const resolvePath = (path, element) => {
  if (path[0] === '.') {
    if (!element) {
      throw new Error('cannot evaluate relative path without element')
    }
    path = getDataPath(element) + path;
  } else if (path.substr(0, 6) === '_data_') {
    if (!element) {
      throw new Error('cannot evaluate _data_ path without element')
    }
    path = getDataPath(element) + path.substr(6);
  } else if (path.substr(0, 11) === '_component_') {
    if (!element) {
      throw new Error('cannot evaluate _component_ path without element')
    }
    path = getComponentId(element) + path.substr(11);
  }
  return path
};

const _compute = (expressionPath, element) => {
  const [, methodPath, valuePaths] = expressionPath.match(/([^(]+)\(([^)]+)\)/);
  return valuePaths.indexOf(',') === -1
    ? call(methodPath, get(valuePaths, element))
    : call(methodPath, ...get(valuePaths, element))
};

const _get = (path, element) => {
  if (path.substr(-1) === ')') {
    return _compute(path, element)
  } else if (path.startsWith('.')) {
    const elt = element && element.closest('[data-list-instance]');
    if (!elt && element.closest('body')) {
      console.error(`relative data-path ${path} used without list instance`, element);
    }
    return elt ? getByPath(registry, `${elt.dataset.listInstance}${path}`) : undefined
  } else {
    path = resolvePath(path, element);
    if ( !isValidPath(path)) {
      console.error(`getting invalid path ${path}`);
    } else {
      return getByPath(registry, path)
    }
  }
};

/**
## Computed Bindings

If you want to do some more specialized binding than is provided by b8r's binding "targets"
then you can bind to methods.

    <div data-bind="path.to.method=foo.bar.baz,lerp.derp"></div>

The signature of a custom binding function is:

    (element, value) => { ... anything you like ... }

If one parameter is passed, then the method will be passed the `element` and the
value of the binding.

If *more than one parameter* is passed, then the `value` will be an `array` of the values.

These computed bindings will automatically keep themselves up-to-date if any
paths they depend on are updated.

```
<p data-bind="_component_.fullName=_component_.firstName,_component_.lastName"></p>
<label>
  First Name
  <input data-bind="value=_component_.firstName"
</label><br>
<label>
  Last Name
  <input data-bind="value=_component_.lastName"
</label>
<script>
  data.firstName = 'Juanita'
  data.lastName = 'Citizen'
  data.fullName = (element, [firstName, lastName]) => {
    element.textContent = `${firstName}, ${lastName}`
  }
</script>
```
### Computed Lists

This works similarly for `data-list` bindings:

    <li data-list="path.to.method(foo.list,bar.filters):id"></li>

The signature of a list filtering function is:

    (list, ...args) => {
      ... anything you lke ...
      // return elements from the original list
    }

The method is expected to return an array of members of the original list (not just
any old things).

`b8r` expects items bound in a list-binding to be somewhere in its registry, the
obvious placing being the source list. If you want to bind to some synthetic list
(e.g. an "outer join") simply compute the list, put it in the registry, and bind to it.

    function computeList () {
      const list1 = b8r.reg.path.to.list1
      const list2 = b8r.reg.path.to.list2
      const computedList = []
      ... build list from list1 and list2
      b8r.reg.path.to.computedList = computedList
    }

    b8r.observe('path.to.list1', computeList)
    b8r.observe('path.to.list2', computeList)

A data-list binding to path.to.computedList will be updated whenever the
list is updated, and computeList will update computedList whenever its constituents
are updated.

What is more difficult is having changes to values in the computed list result
in changes in the constituent lists. This obviously can't be automatic, but
in order for it to work, the computedList items must contain information or
pointers back to their sources.

```
<label>
  Filter
  <input data-bind="value=_component_.needle">
</label>
<ul>
  <li
    data-list="_component_.filter(_component_.things,_component_.needle):id"
    data-bind="text=.description"
  ></li>
</ul>
<script>
  data.things = [
    {id: 1, description: 'A loaf of bread'},
    {id: 2, description: 'A quart of milk'},
    {id: 3, description: 'A stick of butter'}
  ]
  data.filter = (list, needle) => {
    console.log({list, needle})
    return needle ? list.filter(item => item.description.includes(needle)) : list
  }
</script>
```

### Using b8r method-paths

We can do this:

    b8r.register('message-controller', {
      user_online: user => b8r.get(`users[id=${this.user}].online`),
    })

And the binding now looks like this:

    <div class="message" data-bind="class(online)=message-controller.user_online(.user)">...

So we have several immediate wins over javascript computed properties:

- we write less code
- we don't need to decorate every object
- we don't touch the objects at all (no figuring out which properties are "real")
- we don't perform *any work* for stuff that isn't actually displayed
- you can see the dependencies in the bindings (and so can b8r) so updates mostly work for free

At this point, if we're merely computing properties from an object's own properties, we're done.
But in this case the property is being computed based on the state of a completely different object.

So, what happens if the user's online state changes? There's no trivial solution, but there's one
fairly straightforward option, we can rewrite the binding so that it has the correct path
dependency, then everything "just works"™:

    <div class="message">
    ...
    <script>
      const div = findOne('.component');
      const {user} = b8r.getListInstance(component);
      div.addDataBinding(div, 'class(online)', `message-controller.user_online(users[id=${user}])`);
    </script>

There's one final issue that hasn't been discussed, and that is the convenience of simply using
a computed property in ordinary code:

    foo = {a: 17}
    Object.defineProperty(foo, 'bar', {
      get: function(){ return this.a; },
      set: function(x){ this.a = x; }
    });
    const x = foo.bar; // x is now 17;
    foo.bar = Math.PI; // foo.a is now Math.PI

If we instead use the "controller" strategy we end up with something like:

    foo = {a: 17}
    b8r.register('foo-controller', {bar(foo, x) => x === undefined ? foo.a : foo.a = x});
    const x = b8r.call('foo-controller.bar', foo);
    b8r.call('foo-controller.bar', foo, Math.PI);

Clearly, the approach outlined is (slightly) less cumbersome to set up, but (slightly) more
cumbersome to use -- unless you're targeting values in the registry, then, something like:

    b8r.get('foo-controller.bar(list-of-foo[id=${which_foo}],path.to.something.else)');

is actually pretty slick.

```
<style>
  .offline { opacity: 0.5; }
</style>
<div><b>People</b></div>
<div style="display: flex">
  <div style="flex: 1 0 20%">
    <div data-list="computed-properties.people:id">
      <input type="checkbox" data-bind="checked=.online">
      <span data-bind="text=[${.id}] ${.name}"></span>
    </div>
  </div>
  <div style="margin-left: 10px">
    If you toggle the online state of the users, observe that the
    statically bound list instances do not automatically update.<br>
    <button data-event="click:computed-properties.update">Force Update</button>
  </div>
</div>
<div style="display: flex">
  <div>
    <div><b>Static binding to .from</b></div>
    <div
      data-list="computed-properties.messages:id"
      data-bind="
        text=${computed-properties.sender_name(.from)}: ${.body};
        class(offline)=computed-properties.is_offline(.from);
      "
    ></div>
  </div>
  <div style="margin-left: 10px" class="foreign-path">
    <div><b>Programmatically bound to correct path</b></div>
    <div
      data-list="computed-properties.messages:id"
      data-bind="
        text=${computed-properties.sender_name(.from)}: ${.body};
      "
    ></div>
  </div>
</div>
<script>
  b8r.register('computed-properties', {
    is_offline: user => {
      return ! b8r.get(`computed-properties.people[id=${user}].online`);
    },
    not: bool => !bool,
    sender_name: user => {
      return b8r.get(`computed-properties.people[id=${user}].name`);
    },
    people: [
      {id: 1, name: 'Tomasina', online: true},
      {id: 2, name: 'Carlita', online: false},
    ],
    messages: [
      {id: 1, from: 1, body: 'hello world!'},
      {id: 2, from: 2, body: 'is anybody there?'},
      {id: 3, from: 1, body: 'i\'m here!'},
      {id: 4, from: 2, body: 'thank goodness'},
    ],
    update: () => b8r.touch('computed-properties.message'),
  });

  b8r.afterUpdate(() => {
    find('.foreign-path [data-list-instance]').forEach(elt => {
      const message = b8r.getListInstance(elt);
      b8r.addDataBinding(elt, 'class(offline)', `computed-properties.not(computed-properties.people[id=${message.from}].online)`);
    });
  });
</script>
```

### Tests

These tests cover the low-level functionality necessary to make all this work. Notice
that more complex cases than discussed above are handled, such as computed properties which
look at multiple parameters from multiple different places.
~~~~
// title: low level
b8r.register('_data', {
  location: 'a',
  other_location: 'b',
  person: {
      name: 'juanita',
      online: false,
      location: 'a',
  },
  people: [
    {
      name: 'juanita',
      online: false,
      location: 'a',
    },
    {
      name: 'tomasina',
      online: true,
      location: 'b',
    },
    {
      name: 'benito',
      online: true,
      location: 'a',
    },
    {
      name: 'carlita',
      online: false,
      location: 'b',
    },
  ]
});
b8r.register('_controller', {
  is_in_location: (where, online, location) => {
    return online && where === location;
  },
});
Test(() => b8r.get('_data.location,_data.person.online,_data.person.location')).shouldBeJSON(["a", false, "a"]);
Test(() => b8r.get('_controller.is_in_location(_data.location,_data.person.online,_data.person.location)')).shouldBe(false);
Test(() => b8r.get('_controller.is_in_location(_data.location,_data.people[0].online,_data.people[0].location)')).shouldBe(false);
Test(() => b8r.get('_controller.is_in_location(_data.other_location,_data.people[name=tomasina].online,_data.people[name=tomasina].location)')).shouldBe(true);
Test(() => b8r.get('_controller.is_in_location(_data.location,_data.people[2].online,_data.people[2].location)')).shouldBe(true);
b8r.remove('_data')
b8r.remove('_controller')
~~~~
*/

const get = (path, element) => {
  const paths = splitPaths(path);
  return paths.length === 1
    ? _get(paths[0], element)
    : paths.map(path => _get(path, element))
};

const getJSON = (path, element, pretty) => {
  const obj = get(path, element);
  const objects = [];
  const replacer = (key, value) => {
    if (!value || typeof value !== 'object') {
      return value
    } else if (typeof value === 'object') {
      if (value.constructor !== Object && value.constructor !== Array) {
        return `[${value.constructor.name}]`
      } else if (objects.indexOf(value) === -1) {
        objects.push(value);
        return value
      } else {
        return '[duplicate or circular reference]'
      }
    }
  };
  return JSON.stringify(obj, replacer, pretty ? 2 : 0)
};

const touch = (path, sourceElement) => {
  listeners.filter(listener => {
    let heard;
    try {
      heard = listener.test(path);
    } catch (e) {
      console.error(listener, 'test threw exception', e);
    }
    if (heard === observerShouldBeRemoved) {
      unobserve(listener);
      return false
    }
    return !!heard
  })
    .forEach(listener => {
      try {
        if (listener.callback(path, sourceElement) === observerShouldBeRemoved) {
          unobserve(listener);
        }
      } catch (e) {
        console.error(listener, 'callback threw exception', e);
      }
    });
};

const _defaultTypeErrorHandler = (errors, action) => {
  console.error(`registry type check(s) failed after ${action}`, errors);
};
let typeErrorHandlers = [_defaultTypeErrorHandler];
const onTypeError = (callback) => {
  offTypeError(_defaultTypeErrorHandler);
  if (typeErrorHandlers.indexOf(callback) === -1) {
    typeErrorHandlers.push(callback);
    return true
  }
  return false
};
const offTypeError = (callback, restoreDefault = false) => {
  const handlerCount = typeErrorHandlers.length;
  typeErrorHandlers = typeErrorHandlers.filter(f => f !== callback);
  if (restoreDefault) onTypeError(_defaultTypeErrorHandler);
  return typeErrorHandlers.length !== handlerCount - 1
};

const checkType = (action, name) => {
  const referenceType = name.startsWith('c#') ? componentTypes[name.split('#')[1]] : registeredTypes[name];
  if (!referenceType || !registry[name]) return
  const errors = matchType(referenceType, registry[name], [], name);
  if (errors.length) {
    typeErrorHandlers.forEach(f => f(errors, action));
  }
};

const set$1 = (path, value, sourceElement) => {
  if (value && value._b8r_sourcePath) {
    throw new Error('You cannot put reg proxies into the registry')
  }
  if ( !isValidPath(path)) {
    console.error(`setting invalid path ${path}`);
  }
  const pathParts = path.split(/\.|\[/);
  const [name] = pathParts;
  const model = pathParts[0];
  const existing = getByPath(registry, path);
  if (pathParts.length > 1 && !registry[model]) {
    console.error(`cannot set ${path} to ${value}, ${model} does not exist`);
  } else if (pathParts.length === 1 && typeof value !== 'object') {
    throw new Error(`cannot set ${path}; you can only register objects at root-level`)
  } else if (value === existing) {
    // if it's an array then it might have gained or lost elements
    if (Array.isArray(value) || Array.isArray(existing)) {
      touch(path, sourceElement);
    }
  } else if (value && value.constructor) {
    if (pathParts.length === 1 && !registry[path]) {
      register(path, value);
    } else {
      // we only overlay vanilla objects, not custom classes or arrays
      if (value.constructor === Object && existing && existing.constructor === Object) {
        setByPath(registry, path, Object.assign(value, Object.assign(existing, value)));
      } else {
        setByPath(registry, path, value);
      }
      touch(path, sourceElement);
    }
  } else {
    setByPath(registry, path, value);
    touch(path, sourceElement);
  }
  checkType(`set('${path}',...)`, name);
  return value // convenient for push (see below) but maybe an anti-feature?!
};

const replace = (path, value) => {
  if (typeof value === 'object') setByPath(registry, path, null); // skip type checking
  set$1(path, value);
  return value
};

const types = () => JSON.parse(JSON.stringify({
  registeredTypes,
  componentTypes
}));

const registerType = (name, example) => {
  registeredTypes[name] = example;
  checkType(`registerType('${name}')`, name);
};

const _register = (name, obj) => {
  if (registry[name] && registry[name] !== obj) {
    console.warn(`${name} already registered; if intended, remove() it first`);
    return
  }
  registry[name] = obj;
  checkType(`register('${name}')`, name);
};

const register = (name, obj, blockUpdates) => {
  if (name.match(/^_[^_]*_$/)) {
    throw new Error('cannot register object as ' + name +
      ', all names starting and ending with a single \'_\' are reserved.')
  }

  _register(name, obj);

  if (!blockUpdates) {
    touch(name);
  }
};

const setJSON = (path, value) => set$1(path, JSON.parse(value));

/**
    push('path.to.array', item [, callback]);

To add an item to an array (and trigger the expected UI updates) simply push the
item to the path. `callback`, if provided, will be passed the list with its new addition
(useful for sorting, for example).

    unshift('path.to.array', item);

Just like push but the new element gets unshifted to the beginning of the array.

~~~~
// title: push
const {register, push, unshift, get} = b8r;
register('test-list', [1,2,3]);
push('test-list', Math.PI);
Test(() => get('test-list[3]')).shouldBe(Math.PI);
unshift('test-list', 17);
Test(() => get('test-list[0]')).shouldBe(17);
Test(() => get('test-list').length).shouldBe(5);
register('test-obj', {});
push('test-obj.list', 17);
Test(() => get('test-obj.list[0]')).shouldBe(17);
Test(() => get('test-obj.list').length).shouldBe(1);
b8r.remove('test-list')
b8r.remove('test-obj')
~~~~
*/

const push = (path, value, callback) => {
  const list = get(path) || [];
  if (Array.isArray(list)) {
    list.push(value);
    if (callback) {
      callback(list);
    }
  }
  set$1(path, list);
};

const unshift = (path, value) => {
  const list = get(path) || [];
  if (Array.isArray(list)) {
    list.unshift(value);
  }
  set$1(path, list);
};

/**
    sort('path.to.array', comparison_fn);

For example:

    sort('file-list', (a, b) => b8r.sortAscending(a.name, b.name));

Sorts the array at path using the provided sorting function. (And b8r provides
[two convenience methods for creating sort functions](?source=source/b8r.sort.js).)

```
<table>
  <thead>
    <tr data-event="click:_component_.sort">
      <th>Name</th><th>Age</th>
    </tr>
  </thead>
  <tbody>
    <tr data-list="test-people:id">
      <td data-bind="text=.name"></td>
      <td data-bind="text=.age"></td>
    </tr>
  </tbody>
</table>
<p>Click column heading to sort.</p>
<script>
  b8r.register('test-people', [
    { id: 0, name: 'Tom', age: 41 },
    { id: 1, name: 'Deirdre', age: 47 },
    { id: 2, name: 'Harriet', age: 39 },
    { id: 3, name: 'Simon', age: 52 }
  ]);

  set('sort', evt => {
    const prop_name = evt.target.textContent.toLowerCase();
    b8r.sort('test-people', (a, b) => b8r.sortAscending(a[prop_name], b[prop_name]));
  });

  b8r.remove('test-people')
</script>
```
*/

const sort = (path, comparison) => {
  const list = get(path) || [];
  if (Array.isArray(list)) {
    list.sort(comparison);
  }
  set$1(path, list);
};

/**
    call('path.to.method', ...args);

Call a method by path with the arguments provided (and return result).
*/

const call = (path, ...args) => {
  const method = get(path);
  if (method instanceof Function) {
    return method(...args)
  } else {
    console.error(`cannot call ${path}; not a method`);
  }
};

/**
    callIf('path.to.method', ...args);

If a method is found at path, call it and return result, otherwise return null.
*/

const callIf = (path, ...args) => {
  const f = get(path);
  return f instanceof Function ? f(...args) : null
};

/**

##  Observing Paths Directly

    const listener = observe(observedPath, callback)

Both `observedPath` and `callbackPath` can be paths (strings) or functions.

When something in the registry is changed, the `path` of the change
is either compared to the observedPath. If the `observedPath` matches
the start of the path changed, or the test function evaleates to `true`
the `callback` will be fired.

When `callback` is fired it will be passed *the exact path* that changed
(and nothing else) *and the change will have occurred*.

`callback` can also be a `path` to a function in the registry.

    observe(/root.path.[^\.]+.value/, callback);

Instead of a constant path, you can pass a RegExp which will fire the callback
when a path matching the test changes.

    observe(path => path.split('.').length === 1, callback);

Finally you can observe a path test `function`.

    const listener = observe(test, callback);

The `callback` can be a function or a path. If a path, the listener will
automatically be removed if the path is no longer registered (so, for example,
you can hook up a component method as a listener and it will be
'garbage collected' with the compoent.

You can remove a listener (if you kept the reference handy).

    unobserve(listener);

You can also remove a listener using the test parameter, but it will remove _all_
listeners which use that test.

Finally, you can have an observer **remove itself** by returning
`b8r.constants.observerShouldBeRemoved` from either the test method (if you use one)
or the callback.

~~~~
// title: observe
b8r.register('listener_test1', {
  flag_changed: () => {
    b8r.set('listener_test2.counter', b8r.get('listener_test2.counter') + 1);
  }
});
b8r.register('listener_test2', {counter: 0, flag: false});
b8r.observe('listener_test2.flag', 'listener_test1.flag_changed');
b8r.set('listener_test2.flag', true);
Test(() => b8r.get('listener_test2.counter'), 'observer counted flag set to true').shouldBe(1);
b8r.set('listener_test2.flag', false);
Test(() => b8r.get('listener_test2.counter'), 'observer counted flag set to false').shouldBe(2);
b8r.set('listener_test2.flag', false);
Test(() => b8r.get('listener_test2.counter'), 'observer ignored flag set to false').shouldBe(2);
b8r.set('listener_test2.flag', true);
Test(() => b8r.get('listener_test2.counter'), 'observer counted flag set to true').shouldBe(3);
b8r.remove('listener_test1');
b8r.set('listener_test2.flag', false);
Test(() => b8r.get('listener_test2.counter'), 'observer automatically removed').shouldBe(3);
b8r.remove('listener_test2')
~~~~
*/

const observe = (test, callback) => {
  return new Listener(test, callback)
};

const unobserve = test => {
  let index;
  let found = false;
  if (test instanceof Listener) {
    index = listeners.indexOf(test);
    if (index > -1) {
      listeners.splice(index, 1);
    } else {
      console.error('unobserve failed, listener not found');
    }
  } else if (test) {
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i]._orig_test === test) {
        listeners.splice(i, 1);
        found = true;
      }
    }
  }

  return found
};

/**
    registered('root-name'); // => true | false

You can get a list of root level objects:

    models();

You can obtain a value using a path.
*/

const models = () => Object.keys(registry);

const registered = path => !!registry[path.split('.')[0]];

/**
    remove('path.to.property', update=true);

Will remove the specified property from the registry (including root-level objects). If the object
does not exist, has no effect. By default, will update objects bound to the path. So:

~~~~
// title: remove
const {register, remove, get} = b8r;
register('remove-test', {bar: 17, baz: {lurman: true}});
Test(() => {remove('remove-test.bar'); return get('remove-test.bar');}).shouldBe(null);
Test(() => {remove('remove-test.boris.yeltsin'); return get('remove-test.boris')}).shouldBe(null);
Test(() => {remove('remove-test.baz.lurman'); return Object.keys(get('remove-test.baz')).length}).shouldBe(0);
b8r.remove('remove-test')
~~~~
*/
const remove = (path, update = true) => {
  deleteByPath(registry, path);
  if (update) {
    touch(path);
    /* touch array containing the element if appropriate */
    [, path] = (path.match(/^(.+)\[[^\]]+\]$/) || []);
    if (path) { touch(path); }
  }
};

/**

### Convenience Methods for Counters

    zero(path);

sets value at path to zero

    increment(path);

adds 1 to the value at path

    decrement(path);

subtracts 1 from the value at path

~~~~
// title: increment, decrement, zero
const {register, increment, decrement, zero, get, remove} = b8r;
register('counter-test', {count: 3});
increment('counter-test.count');
increment('counter-test.count');
Test(() => get('counter-test.count'), 'increment').shouldBe(5);
decrement('counter-test.count');
Test(() => get('counter-test.count'), 'decrement').shouldBe(4);
zero('counter-test.count');
decrement('counter-test.count');
Test(() => get('counter-test.count'), 'zero and decrement').shouldBe(-1);
zero('counter-test.other_count');
Test(() => get('counter-test.other_count'), 'zero a new path').shouldBe(0);
remove('counter-test')
~~~~
*/

const zero = path => set$1(path, 0);

const increment = path => set$1(path, get(path) + 1);

const decrement = path => set$1(path, get(path) - 1);

const deregister = path => {
  console.warn('deregister is deprecated, use b8r.remove');
  remove(path);
};

const _getByPath = (model, path) =>
  get(path ? model + (path[0] === '[' ? path : '.' + path) : model);

const extendPath = (path, prop) => {
  if (path === '') {
    return prop
  } else {
    if (prop.match(/^\d+$/) || prop.includes('=')) {
      return `${path}[${prop}]`
    } else {
      return `${path}.${prop}`
    }
  }
};

const regHandler = (path = '') => ({
  get (target, prop) {
    if (prop === '_b8r_sourcePath') {
      return path
    }
    if (prop === '_b8r_value') {
      return target
    }
    if (Object.prototype.hasOwnProperty.call(target, prop) || (Array.isArray(target) && prop.includes('='))) {
      let value;
      if (prop.includes('=')) {
        const [idPath, needle] = prop.split('=');
        value = target.find(candidate => `${getByPath(candidate, idPath)}` === needle);
      } else {
        value = target[prop];
      }
      if (value && typeof value === 'object' && value.constructor) {
        const currentPath = extendPath(path, prop);
        const proxy = new Proxy(value, regHandler(currentPath));
        return proxy
      } else {
        return value
      }
    } else if (Array.isArray(target)) {
      switch (prop) {
        case 'push':
        case 'pop':
        case 'shift':
        case 'unshift':
        case 'sort':
        case 'splice':
        case 'forEach':
          return (...items) => {
            const result = Array.prototype[prop].apply(target, items);
            touch(path);
            return result
          }
        default:
          return target[prop]
      }
    } else {
      return target[prop]
    }
  },
  set (target, prop, value) {
    set$1(extendPath(path, prop), value);
    return true // success (throws error in strict mode otherwise)
  }
});

const reg = new Proxy(registry, regHandler());

var _registry = /*#__PURE__*/Object.freeze({
  __proto__: null,
  onTypeError: onTypeError,
  offTypeError: offTypeError,
  get: get,
  getJSON: getJSON,
  getByPath: _getByPath,
  set: set$1,
  replace: replace,
  setJSON: setJSON,
  increment: increment,
  decrement: decrement,
  zero: zero,
  push: push,
  unshift: unshift,
  sort: sort,
  call: call,
  callIf: callIf,
  touch: touch,
  observe: observe,
  unobserve: unobserve,
  models: models,
  _register: _register,
  checkType: checkType,
  reg: reg,
  registerType: registerType,
  types: types,
  register: register,
  registered: registered,
  remove: remove,
  deregister: deregister,
  resolvePath: resolvePath,
  isValidPath: isValidPath
});

/**
# pixel.js
*/

const render = (color) => {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  const g = c.getContext('2d');
  g.fillStyle = color || 'rgba(255,255,255,0.3)';
  g.fillRect(0, 0, 1, 1);
  return c.toDataURL()
};

/**
# images
Copyright ©2016-2017 Tonio Loewald

    imgSrc(img, url, cors=true)

Gracefully populates an `<img>` element's src attribute to a url,
sets the element to `opacity: 0`, and then fades it in when the image
is loaded.

    imagePomise(url, cors=true)

Returns a promise of an image (used by imgSrc), and it's memoized.
*/

const images = {};
const pixel = new Image();
pixel.src = render();
const pixelPromise = new Promise(resolve => resolve(pixel));

const imagePromise = (url, cors = true) => {
  if (!url) {
    return pixelPromise
  } else if (images[url]) {
    return images[url]
  } else {
    images[url] = new Promise(resolve => {
      const image = new Image();

      // Cross-origin is necessary if you want to use the image data from JavaScript, in WebGL
      // for example, but you can't indiscriminately use it on all images. If you use
      // `crossorigin` on images from a source that doesn't reply with the
      // `Access-Control-Allow-Origin` header, the browser won't render them.
      if (cors) { image.setAttribute('crossorigin', 'anonymous'); }

      image.src = url;
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        resolve(pixel);
      };
    });
    return images[url]
  }
};

const imgSrc = (img, url, cors = true) => {
  if (img instanceof HTMLImageElement && img.src === url) {
    return
  }
  img.src = pixel.src;
  img.style.opacity = 0.1;
  imagePromise(url, cors).then(image => {
    if (!getComputedStyle(img).transition) {
      img.style.transition = 'var(--hover-transition)';
    }
    img.style.opacity = '';
    img.classList.add('-b8r-rendered');
    if (img instanceof HTMLCanvasElement) {
      img.width = img.offsetWidth;
      img.height = img.offsetHeight;
      const ctx = img.getContext('2d');
      const w = img.offsetWidth;
      const h = img.offsetHeight;
      const scale = Math.max(w / image.width, h / image.height);
      const sw = w / scale;
      const sh = h / scale;
      const sx = (image.width - sw) * 0.5;
      const sy = (image.height - sh) * 0.5;
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
    } else {
      img.setAttribute('src', image.src);
    }
  });
};

/**
# anyElement
*/

const anyElement = document.createElement('div');

/**
# Keystroke

Leverages the modern browser's `event.code` to identify keystrokes,
and uses a normalized representation of modifier keys (in alphabetical)
order.

* **alt** represents the alt or option keys
* **ctrl** represents the control key
* **meta** represents the windows, command, or meta keys
* **shift** represents the shift keys

To get a normalized representation of a keystroke:

    keystroke(event) // => produces normalized keystroke of the form alt-X

`b8r`'s keyboard event handling provides a convenient feature to specify
one or more specified keystrokes for an event to handle, e.g.

    <body data-event="
      keyup(meta-Q):app.quit;
      keyup(Tab,ctrl-Space):app.togglePalettes
    ">

```
<label>
  Type in here
  <input style="width: 60px;" data-event="keydown:_component_.key">
</label>
<div data-bind="text=_component_.keystroke"></div>
<script>
  const {keystroke} = await import('../source/b8r.keystroke.js');
  const key = evt => {
    set('keystroke', keystroke(evt));
    return true; // process keystroke normally
  };
  set ({key});
</script>
```
## Modifier Keys

Also provides `modifierKeys`, a map from the modifier strings (e.g. alt) to
the relevant unicode glyphs (e.g. '⌥').
*/

const keycode = evt => {
  if (evt.code) {
    return evt.code.replace(/Key|Digit/, '')
  } else {
    let syntheticCode = evt.key;
    if (syntheticCode.substr(0, 2) === 'U+') {
      syntheticCode = String.fromCharCode(parseInt(evt.key.substr(2), 16));
    }
    return syntheticCode
  }
};

const keystroke = evt => {
  const code = [];
  if (evt.altKey) {
    code.push('alt');
  }
  if (evt.ctrlKey) {
    code.push('ctrl');
  }
  if (evt.metaKey) {
    code.push('meta');
  }
  if (evt.shiftKey) {
    code.push('shift');
  }
  code.push(keycode(evt));
  return code.join('-')
};

const modifierKeys = isMacOS ? {
  meta: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  escape: '⎋',
  shift: '⇧'
} : {
  meta: 'Meta',
  ctrl: 'Ctrl',
  alt: 'Alt',
  escape: 'Esc',
  shift: 'Shift'
};

/**
~~~~
// title: dispatch tests

function dispatch(target, eventType, key) {
  const evt = new KeyboardEvent({
    key
  })
  target.dispatchEvent(evt)
}
const input = document.createElement('input')
document.body.append(input)
const results = []
b8r.register('_keystroke_test_', {
  first(evt){
    console.log('first', evt)
    results.push({first: input.vaue})
  },
  second(evt){ results.push({second: input.vaue}) },
  third(evt){ results.push({third: input.vaue}) },
})
b8r.on(input, 'keydown(A)', '_keystroke_test_.first')
b8r.on(input, 'keydown(0,1)', '_keystroke_test_.second')
b8r.on(input, 'keydown(C,D,E)', '_keystroke_test_.third')
dispatch(input, 'keydown', 'C')
dispatch(input, 'keydown', 'D')
dispatch(input, 'keydown', 'E')
dispatch(input, 'keydown', '1')
dispatch(input, 'keydown', '0')
dispatch(input, 'keydown', '\n')
dispatch(input, 'keydown', '\t')
input.remove()
// b8r.remove('_keystroke_test_')
~~~~
*/

/**
# event type b8r handles implicitly

These are the event types which b8r handles by default. (`b8r` inserts *one* event
handler for each of these event types at the `document.body` level and then routes
events from the original target.)

To add other types of events, you can call `b8r.implicitlyHandleEventsOfType('type')`

## Mouse Events

- `mousedown`, `mouseup`, `click`, `dblclick`, `contextmenu`
- `mouseleave`, `mouseenter`, `mousemove`, `mouseover`, `mouseout`
- `mousewheel`, `scroll`

## Drag Events

- `dragstart`, `dragenter`, `dragover`, `dragleave`, `dragend`, `drop`

## CSS Animations

- `transitionend`, `animationend`

## User Input

- `keydown`, `keyup`
- `input`, `change`
- `cut`, `copy`, `paste`
- `focus`, `blur`, `focusin`, `focusout`

*/

var implicitEventTypes = [
  'mousedown', 'mouseup', 'click', 'dblclick',
  'mouseleave', 'mouseenter', 'mousemove', 'mouseover', 'mouseout',
  'mousewheel', 'scroll', // FIXEME passive?!
  'contextmenu',
  'dragstart', 'dragenter', 'dragover', 'dragleave', 'dragend', 'drop',
  'transitionend', 'animationend',
  'input', 'change',
  'keydown', 'keyup',
  'cut', 'copy', 'paste',
  'focus', 'blur', 'focusin', 'focusout' // more to follow
];

/**
# Events
*/

const onOffArgs = args => {
  var element; var eventType; var object; var method; var prepend = false;
  if (typeof args[2] === 'object') {
    console.warn('b8r.on(element, type, OBJECT) is deprecated');
    [element, eventType, object] = args;
    return on(element, eventType, object.model, object.method)
  } else if (args.length > 4 || typeof args[3] === 'string') {
    [element, eventType, object, method, prepend] = args;
    if (typeof object !== 'string' || typeof method !== 'string') {
      console.error('implicit bindings are by name, not', object, method);
      return
    }
    method = object + '.' + method;
  } else {
    [element, eventType, method, prepend] = args;
  }
  if (!(element instanceof Element)) {
    console.error('bind bare elements please, not', element);
    throw new Error('bad argument')
  }
  return { element, eventType, path: method, prepend }
};

const getEventHandlers = (element) => {
  const source = element.dataset.event;
  const existing = source
    ? source
      .replace(/\s*(^|$|[,:;])\s*/g, '$1').split(/[;\n]/)
      .filter(handler => handler.trim())
    : [];
  return existing
};

/**

    b8r.getParsedEventHandlers(element)

returns an array of parsed implicit event handlers for an element, e.g.

    data-event="type1:model1.method1;type2,type3:model2.method2"

is returned as

    [
      { types: ["type1"], model: "model1", method: "method1"},
      { types: ["type2", "type3"], model: "model2", method: "method2"}
    ]
*/

const getParsedEventHandlers = element => {
  const handlers = getEventHandlers(element);
  try {
    return handlers.map(function (instruction) {
      const [type, handler] = instruction.split(':');
      if (!handler) {
        if (instruction.indexOf('.')) {
          console.error('bad event handler (missing event type)', instruction, 'in', element);
        } else {
          console.error('bad event handler (missing handler)', instruction, 'in', element);
        }
        return { types: [] }
      }
      const handlerParts = handler.trim().match(/^([^.]+)\.(.+)$/);
      if (!handlerParts) throw new Error(`bad event handler "${handler}"`)
      const [, model, method] = handlerParts;
      const types = type.split(',').sort();
      return {
        types: types.map(s => s.split('(')[0].trim()),
        typeArgs: types.map(s => {
          if (s.substr(0, 3) === 'key') {
            s = s.replace(/Key|Digit/g, '');
            // Allows for a key to be Cmd in Mac and Ctrl in Windows
            s = s.replace(/CmdOrCtrl/g, navigator.userAgent.indexOf('Macintosh') > -1 ? 'meta' : 'ctrl');
          }
          var args = s.match(/\(([^)]+)\)/);
          return args && args[1] ? args[1].split(',') : false
        }),
        model,
        method
      }
    })
  } catch (e) {
    console.error('fatal error in event handler', e);
    return []
  }
};

const makeHandler = (eventType, method) => {
  if (typeof eventType === 'string') {
    eventType = [eventType];
  }
  if (!Array.isArray(eventType)) {
    console.error('makeHandler failed; bad eventType', eventType);
    return
  }
  return eventType.sort().join(',') + ':' + method
};

/**
    on(element, eventType, model_name, method_name);

creates an implicit event-binding data attribute:

    data-event="eventType:module_name.method_name"

Multiple handlers are semicolon-delimited (or you can use newlines), e.g.

    data-event="mouseover:_component_.show;mouseover:_component_.hide"

or:

    data-event="
      mouseover:_component_.show
      mouseover:_component_.hide
    "

You can bind multiple event types separated by commas, e.g.

    data-event="click,keyup:do.something"

**Note**: if you link two event types to the same method separately they will NOT be collated.

You can remove an implicit event binding using:

    off(element, eventType, model_name, method_name);

### Keyboard Events

To make it easy to handle specific keystrokes, you can bind to keystrokes by name, e.g.

    data-bind="keydown(meta-KeyS)"

For your convenience, there's a *Keyboard Event Utility*.
*/

// TODO use parsed event handlers to do this properly
function on (...args) {
  const { element, eventType, path, prepend } = onOffArgs(args);
  const handler = makeHandler(eventType, path);
  const existing = getEventHandlers(element);
  if (existing.indexOf(handler) === -1) {
    if (prepend) {
      existing.unshift(handler);
    } else {
      existing.push(handler);
    }
    element.dataset.event = existing.join(';');
  }
}

// TODO use parsed event handlers to do this properly
function off (...args) {
  var element, eventType, object, method;
  if (args.length === 4) {
    [element, eventType, object, method] = args;
    method = object + '.' + method;
  } else if (args.length === 3) {
    [element, eventType, method] = args;
  } else {
    throw new Error('b8r.off requires three or four arguments')
  }
  const existing = element.dataset.event.split(';');
  const handler = makeHandler(eventType, method);
  const idx = existing.indexOf(handler);
  if (idx > -1) {
    existing.splice(idx, 1);
    if (existing.length) {
      element.dataset.event = existing.join(';');
    } else {
      if (element.dataset.event) {
        delete element.dataset.event;
      }
    }
  }
}

/**
## Enabling and Disabling Event Handlers

Convenience methods for (temporarily) enabling and disabling event handlers.

Will not play nicely with event handler creation / removal.

    enable(element, includeChildren); // includeChildren defaults to false

Returns data-event-disabled attributes to data-event attributes.

    disable(element, includeChildren);

Finds all data-event bindings on elements within the specified target and
turns them into data-event-disabled attributes;
*/

const disable = (element, includeChildren) => {
  const elements = includeChildren ? findWithin(element, '[data-event]', true) : [element];
  elements.forEach(elt => {
    if (elt.dataset.event) {
      elt.dataset.eventDisabled = elt.dataset.event;
      if (elt.dataset.event) {
        delete elt.dataset.event;
      }
    }
    if (!elt.disabled) {
      elt.disabled = true;
    }
  });
};

const enable = (element, includeChildren) => {
  const elements = includeChildren ? findWithin(element, '[data-event-disabled]', true) : [element];
  elements.forEach(elt => {
    if (elt.dataset.eventDisabled) {
      elt.dataset.event = elt.dataset.eventDisabled;
      if (elt.dataset.eventDisabled) {
        delete elt.dataset.eventDisabled;
      }
    }
    if (elt.disabled) {
      elt.disabled = false;
    }
  });
};

// add touch events if needed
if (window.TouchEvent) {
  ['touchstart', 'touchcancel', 'touchmove', 'touchend'].forEach(
    type => implicitEventTypes.push(type));
}

const getComponentWithMethod = function (element, path) {
  var componentId = false;
  element = element.closest('[data-component-id]');
  while (element instanceof Element) {
    if (get(`${element.dataset.componentId}.${path}`) instanceof Function) {
      componentId = element.dataset.componentId;
      break
    }
    element = element.parentElement.closest('[data-component-id]');
  }
  return componentId
};

/**
## Calling Event Handlers

You can, of course, call any registered function via `b8r.get('path.to.function')(...args)`
and there's a convenience function that reduces this to `b8r.call('path.to.function', ...args)`.
Finally, there's `callMethod` which is provided for convenience (e.g. when calling a component's
methods, given its `componentId`):

    b8r.callMethod('path', 'to.method', ...args)

It also supports the same syntax as `b8r.call(…)`:

    b8r.callMethod('path.to.function', ...args)
*/

const callMethod = (...args) => {
  var model, method;
  try {
    if (args[0].match(/[[.]/)) {
      [method, ...args] = args;
      [model, method] = pathSplit(method);
    } else {
      [model, method, ...args] = args;
    }
  } catch (e) {
    throw new Error('callMethod has bad arguments')
  }
  return call(`${model}.${method}`, ...args)
};

const handleEvent = (evt) => {
  // early exit for events triggered on elements inside [data-list] template elements and unloaded components
  if (evt.target.closest('[data-list],b8r-component:not([data-component-id]),[data-component]:not([data-component-id])')) return
  var target = anyElement;
  var args = evt.args || [];
  var keystroke$1 = evt instanceof KeyboardEvent ? keystroke(evt) : {};
  while (target) {
    var handlers = getParsedEventHandlers(target);
    var result = false;
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      for (var typeIndex = 0; typeIndex < handler.types.length;
        typeIndex++) {
        if (handler.types[typeIndex] === evt.type &&
            (!handler.typeArgs[typeIndex] ||
             handler.typeArgs[typeIndex].indexOf(keystroke$1) > -1)) {
          if (handler.model && handler.method) {
            if (handler.model === '_component_') {
              handler.model = getComponentWithMethod(target, handler.method);
            }
            if (handler.model) {
              result = callMethod(handler.model, handler.method, evt, target, ...args);
            } else {
              console.warn(`_component_.${handler.method} not found`, target);
            }
          } else {
            console.error('incomplete event handler on', target);
            break
          }
          if (result !== true) {
            evt.stopPropagation();
            evt.preventDefault();
            return
          }
        }
      }
    }
    target = target === anyElement ? evt.target.closest('[data-event]') : target.parentElement.closest('[data-event]');
  }
};

/**
# Triggering Events

Sometimes you will want to simulate a user action, e.g. click a button as though
the user clicked it, rather than call a handler directly. In vanilla javascript you can to
this specifically via `button.click()` but in a more general sense you can use
`element.dispatchEvent(new Event('click'))`.

b8r provides a convenience method that wraps all this stuff up but, more importantly, is
aware of which events b8r itself handles so it can short-circuit the event propagation system
(effectively route the call directly to the relevant event-handler and pass arguments directly
to it).

    b8r.trigger(type, target, ...args); //

Trigger a synthetic implicit (only!) event. Note that you can trigger and
handle completely made-up events, but if you trigger events that occur
naturally the goal is for them to be handled exactly as if they were "real".
*/

const trigger = (type, target, ...args) => {
  if (
    typeof type !== 'string' ||
    (!(target instanceof Element))
  ) {
    console.error(
      'expected trigger(eventType, targetElement)',
      type,
      target
    );
    return
  }
  if (target) {
    const event = dispatch(type, target, ...args);
    if (target instanceof Element && implicitEventTypes.indexOf(type) === -1) {
      handleEvent(event);
    }
  } else {
    console.warn('b8r.trigger called with no specified target');
  }
};

/**
## Handling Other Event Types

  b8r.implicitlyHandleEventsOfType(type_string)

Adds implicit event handling for a new event type. E.g. you might want
to use `data-event` bindings for the seeking `media` event, which you
could do with `b8r.implicitlyHandleEventsOfType('seeking')`.
*/

const implicitlyHandleEventsOfType = type => {
  if (implicitEventTypes.indexOf(type) === -1) {
    implicitEventTypes.push(type);
    document.body.addEventListener(type, handleEvent, true);
  }
};

/**
# describe

A simple function for describing the values of things.

    const description = describe(variable_name, maxUniques=4, generic=false);

`maxUniques` determines how many items/keys it checks before giving up. If  `max_unqiues` is `-1`
then everything will be handled.

`generic` determines whether it returns `string` and `#` instead of literals.

**Note**: describe only checks the first two elements against each other to see if the array
is homogeneous.

~~~~
const {describe} = await import('../source/describe.js');
Test(() => describe(undefined)).shouldBe('undefined');
Test(() => describe(null)).shouldBe('null');
Test(() => describe(NaN)).shouldBe('NaN');
Test(() => describe(17)).shouldBe('17');
Test(() => describe(17, 4, true)).shouldBe('#');
Test(() => describe(true,)).shouldBe('true');
Test(() => describe(true, 4, true)).shouldBe('bool');
Test(() => describe(true)).shouldBe('true');
Test(() => describe('hello, world')).shouldBe('"hello, world"');
Test(() => describe('hello, world', 4, true)).shouldBe('string');
Test(() => describe([])).shouldBe('[]');
Test(() => describe({})).shouldBe('{}');
Test(() => describe([{x: 0, y: 0}, 17])).shouldBe('[{x,y}, 17]');
Test(() => describe([{x: 0, y: 0}]), 'handles single element').shouldBe('[{x,y} × 1]');
Test(() => describe([1,2,'a']), 'only checks first two elements').shouldBe('[1 × 3]');
Test(() => describe(["a",2,{}])).shouldBe('["a", 2, {}]');
Test(() => describe(["a",2,{}], 4, true)).shouldBe('[string, #, {}]');
Test(() => describe(["a",2,{},false,[]])).shouldBe('[* × 5]');
Test(() => describe(["a",2,{},false,[]], 5, true)).shouldBe('[string, #, {}, bool, []]');
Test(() => describe(["a",2,{}], 2)).shouldBe('[* × 3]');
Test(() => describe([1,2,3])).shouldBe('[1 × 3]');
Test(() => describe([1,2,3], 4, true)).shouldBe('[# × 3]');
Test(() => describe({y: 0, x: 1}) === describe({x: -2, y: 17})).shouldBe(true);
Test(() => describe([{x:0,y:0},{x:0,y:0},{x:0,y:0}])).shouldBe('[{x,y} × 3]');
Test(() => describe({a:0,b:1,c:2,d:3,e:4})).shouldBe('{a,b,c,d,…}');
Test(() => describe({a:0,b:1,c:2,d:3,e:4}, 5)).shouldBe('{a,b,c,d,e}');
Test(() => describe({a:0,b:1,c:2,d:3,e:4}, -1)).shouldBe('{a,b,c,d,e}');
Test(() => describe(function(x){})).shouldBe('function(x){...}');
Test(() => describe(window.open)).shouldBe('function(){[native code]}');
Test(() => describe(() => {})).shouldBe('()=>{...}');
Test(() => describe(x => {
  // newline in method body for test purposes
})).shouldBe('(x)=>{...}');
Test(() => describe((a, b=3) => {})).shouldBe('(a, b=3)=>{...}');
Test(() => describe((a, b={x: 17}) => {})).shouldBe('(a, b={x: 17})=>{...}');
Test(() => describe(async function(x,y,z){})).shouldBe('async (x,y,z)=>{...}');
~~~~
*/

function describe$1 (x, maxUniques = 4, generic = false) {
  if (x === undefined) {
    return 'undefined'
  } else if (Array.isArray(x)) {
    if (x.length === 0) {
      return '[]'
    } else if (x.length === 1 || typeof x[0] === typeof x[1]) {
      return `[${describe$1(x[0], maxUniques, generic)} × ${x.length}]`
    } else if (typeof x[0] !== typeof x[1]) {
      return x.length <= maxUniques || maxUniques < 0
        ? '[' + x.map(v => describe$1(v, maxUniques, generic)).join(', ') + ']'
        : `[* × ${x.length}]`
    }
  } else if (x && x.constructor === Object) {
    const keys = Object.keys(x);
    if (maxUniques >= 0 && keys.length > maxUniques) {
      keys.splice(maxUniques);
      keys.push('…');
    }
    return `{${keys.sort().join(',')}}`
  } else if (typeof x === 'string') {
    return generic ? 'string' : `"${x}"`
  } else if (x instanceof Function) {
    const source = x.toString();
    const args = source.match(/^(async\s+)?(function[^(]*\()?\(?(.*?)(\)\s*\{|\)\s*=>|=>)/m)[3].trim();
    const native = source.match(/\[native code\]/);
    const inside = native ? '[native code]' : '...';
    let desc = x.prototype || native ? `function(${args}){${inside}}` : `(${args})=>{${inside}}`;
    if (source.startsWith('async')) {
      desc = 'async ' + desc;
    }
    return desc
  } else if (isNaN(x)) {
    return 'NaN'
  } else if (typeof x === 'boolean') {
    return generic ? 'bool' : '' + x
  } else if (typeof x === 'number') {
    return generic ? '#' : '' + x
  } else {
    return JSON.stringify(x)
  }
}

/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * http://blog.stevenlevithan.com/archives/date-time-format
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

// modified to ES6 module form by sticking it against a board and banging nails through it
// Tonio Loewald 2020

const dateFormat = (function () {
  var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;

  var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;

  var timezoneClip = /[^-+\dA-Z]/g;

  var pad = function (val, len) {
    val = String(val);
    len = len || 2;
    while (val.length < len) val = '0' + val;
    return val
  };

  // Regexes and supporting functions are cached through closure
  return function (date, mask, utc) {
    var dF = dateFormat;

    // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
    if (arguments.length == 1 && Object.prototype.toString.call(date) == '[object String]' && !/\d/.test(date)) {
      mask = date;
      date = undefined;
    }

    // Passing date through Date applies Date.parse, if necessary
    date = date ? new Date(date) : new Date();
    if (isNaN(date)) throw SyntaxError('invalid date')

    mask = String(dF.masks[mask] || mask || dF.masks['default']);

    // Allow setting the utc argument via the mask
    if (mask.slice(0, 4) == 'UTC:') {
      mask = mask.slice(4);
      utc = true;
    }

    var _ = utc ? 'getUTC' : 'get';

    var d = date[_ + 'Date']();

    var D = date[_ + 'Day']();

    var m = date[_ + 'Month']();

    var y = date[_ + 'FullYear']();

    var H = date[_ + 'Hours']();

    var M = date[_ + 'Minutes']();

    var s = date[_ + 'Seconds']();

    var L = date[_ + 'Milliseconds']();

    var o = utc ? 0 : date.getTimezoneOffset();

    var flags = {
      d: d,
      dd: pad(d),
      ddd: dF.i18n.dayNames[D],
      dddd: dF.i18n.dayNames[D + 7],
      m: m + 1,
      mm: pad(m + 1),
      mmm: dF.i18n.monthNames[m],
      mmmm: dF.i18n.monthNames[m + 12],
      yy: String(y).slice(2),
      yyyy: y,
      h: H % 12 || 12,
      hh: pad(H % 12 || 12),
      H: H,
      HH: pad(H),
      M: M,
      MM: pad(M),
      s: s,
      ss: pad(s),
      l: pad(L, 3),
      L: pad(L > 99 ? Math.round(L / 10) : L),
      t: H < 12 ? 'a' : 'p',
      tt: H < 12 ? 'am' : 'pm',
      T: H < 12 ? 'A' : 'P',
      TT: H < 12 ? 'AM' : 'PM',
      Z: utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
      o: (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
      S: ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
    };

    return mask.replace(token, function ($0) {
      return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1)
    })
  }
}());

// Some common format strings
dateFormat.masks = {
  'default': 'ddd mmm dd yyyy HH:MM:ss',
  shortDate: 'm/d/yy',
  mediumDate: 'mmm d, yyyy',
  longDate: 'mmmm d, yyyy',
  fullDate: 'dddd, mmmm d, yyyy',
  shortTime: 'h:MM TT',
  mediumTime: 'h:MM:ss TT',
  longTime: 'h:MM:ss TT Z',
  isoDate: 'yyyy-mm-dd',
  isoTime: 'HH:MM:ss',
  isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
  isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
  dayNames: [
    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ],
  monthNames: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
  return dateFormat(this, mask, utc)
};

/**
# toTargets
Copyright ©2016-2017 Tonio Loewald

## Binding data to the DOM

The following targets (attributes of a DOM element) can be bound to object data:

### value

    data-bind="value=message.text"

This is the value of `<input>`, `<textarea>`, and `<select>` elements.)
If attached to an `<input type="radio">` button it tries to "do the right thing".

If you bind to a **component instance**'s value it will map directly to the component's
value.

> ### Two-Way Bindings
>
> `value` is also a ["from"-binding](?source=source/b8r.fromTargets.js). which means that
> if the user changes the value of an element (that normally has a value) the change will
> automatically be picked up by b8r and the bound data updated -- per the example below.

```
<label>
  <input data-bind="value=_component_.test">
  bound to "_component_.test"
</label><br>
<label>
  <input data-bind="value=_component_.test">
  also bound to "_component_.test"
</label><br>
<label>
  <input type="number" data-bind="value=_component_.number">
  also bound to "_component_.number"
</label><br>
<label>
  <input type="range" data-bind="value=_component_.number">
  also bound to "_component_.number"
</label><br>
<script>
  set('test', 'hello, world');
  set('number', 3);
</script>
```

### text

    data-bind="text=message.sender.name"

This sets the `textContent` property of most standard elements.

Note that b8r allows you to use ES6-flavored interpolated strings on the
right-hand-side of data-bind bindings. E.g.

    data-bind="text=${message.sender.lastname}, ${message.sender.firstname}"

These aren't true ES6 interpolated strings (you can't just stick code in them)
because one of b8r's design goals is not to create new places to hide complex
code. If you want complexity, put it in your code.

**But** there is one thing you can do with b8r's interpolated strings you can't
do in regular javascript, which is nest references, e.g.

    data-bind="text=hello ${path.to.list[id=${path.to.user.id}].name}"

`b8r.interplate` will perform substitutions from the inside out (so inner
references are resolved first).

Note that once you have any interpolated value in the right-hand-side of a data-bind
then the whole thing is interpolated, so **this will not work**:

    data-bind="text=path.to.list[id=${path.to.user.id}].name" // will render "path.to.list[id=17]"

```
<h2 data-bind="text=_component_.message"></h2>
<script>
  set('message', 'hello, world');
</script>
```

### format

    data-bind="format=**${error.type}** ${error.detail}"

This populates the element with html that is rendered by converting markdown-style
bold or italics to tags (e.g. replacing `**bold**` or `_italic_` with `<b>bold</b>`
and `<i>italic</i>`).

*No other formatting is supported* and if the string contains a `<` or `>` character
no formatting is applied and the `textContent` of the element is set instead (a
precaution against script injection).
```
<h2 data-bind="format=_component_.message"></h2>
<script>
  set('message', '**hello**, world (_are you there_?)');
</script>
```

### checked

    data-bind="checked=message.private"

This is the `checked` property on `<input type="checked">` and `<input
type="radio">` elements. The `checked` to and from targets support the
[indeterminate state on checkboxes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox)
via `null` (not `undefined`).

```
<style>
  ._component_ label { display: block; }
</style>
<label>
  <input type="checkbox" data-bind="checked=_component_.first">
  <span data-bind="json=_component_.first"></span>
</label>
<label>
  <input type="checkbox" data-bind="checked=_component_.second">
  <span data-bind="json=_component_.second"></span>
</label>
<label>
  <input type="checkbox" data-bind="checked=_component_.third">
  <span data-bind="json=_component_.third"></span>
</label>
<script>
  set({
    first: true,
    second: false,
    third: null,
  })
</script>
```

### selected

    data-bind="selected=message.selected"

This is the selected attribute of `<option>` elements.

> ## Note
> `value`, `checked`, `selected`, and `text` are also "fromTargets",
> which means bindings are two-way (changes in the DOM will be copied to the
> bound object). In the case of text bindings, unless an input or change event
> occurs, bound data will not be updated.

### bytes

    data-bind="bytes=path.to.size.in.bytes"

Sets the `textContent` of element to the file size in appropriate units,
rounded to one decimal place. E.g. `600` => "600 B", `4096` => "4.0 kB". Calculations
are in binary "k" (so 1 kB === 1024 B, and so on). Annotation stops at `EB` (exabytes).

```
<input data-bind="value=_component_.number"> is <span data-bind="bytes=_component_.number"></span>
<script>
  set('number', 50000);
</script>
```

### timestamp

    data-bind="timestamp=path.to.zulu"
    data-bind="timestamp(m-d-yy)=path.to.milliseconds"

Sets the `textContent` of the element to a human readable timestamp, using
`new Date(...).localeString()` by default, but supporting
[date.format](http://blog.stevenlevithan.com/archives/date-time-format)
options if supplied.

```
<span data-bind="timestamp(longDate)=_component_.timestamp"></span>
<script>
  set('timestamp', Date.now());
</script>
```

### attr()

    data-bind="attr(alt)=image.name"

This is the specified attribute. This can also be used to set "special"
properties like id, class, and style.

### prop()

    data-bind="prop(currentTime)=_component_.video.position"
    ...
    b8r.implicitlyHandleEventsOfType('timeupdate'); // ask b8r to intercept timeupdate events
    b8r.onAny('timeupdate', '_b8r_._update_'); // ask b8r to trigger updates on timeupdate

This is the specified element property.

### data()

    data-bind="data(imageUrl)=".image.url"

This allows you to set data attributes using camelcase. (The example shown
would set the `data-image-url` attribute.)

### style()

    data-bind="style(color)=message.textColor"
    data-bind="style(padding-left)=${message.leftPad}px"
    data-bind="style(padding-left|px)=message.leftPad"

```
<div data-bind="style(color)=_component_.color">color</div>
<div data-bind="style(padding)=${_component_.padding}px">padding</div>
<div data-bind="style(padding|px)=_component_.padding">padding</div>
<script>
  set({
    color: 'purple',
    padding: 10,
  })
</script>
```

This sets styles (via `element.style[stringValue]`) so be warned that hyphenated
properties (in CSS) become camelcase in Javascript (e.g. background-color is
backgroundColor).

The optional second parameter lets you specify *units* (such as px, %, etc.).

### class(), class\_unless(), class\_map()

    data-bind="class(name)=message.truthyValue"
    data-bind="class_unless(name)=message.truthyValue"

This lets you toggle a class based on a bound property.

    data-bind="class(true_class|false_class)=.message.booleanValue";

You can also provide the `class()` toTarget with a pair of classes
separated by a bar and it will assign the first if the value is truthy
and the second otherwise.

    data-bind="class_map(happy:happy-class|sad:sad-class|indifferent-class)"

```
<style>
  .happy-class:before {
    content: "😀";
  }
  .sad-class:before {
    content: "😢";
  }
  .indifferent-class:before {
    content: "😑";
  }
</style>
<label>
  <input type="checkbox" data-bind="checked=_component_.on">
  Toggle Me!
</label>
<ul>
  <li>
    icon displayed if checked:
    <span data-bind="class(icon-umbrella)=_component_.on"></span>
  </li>
  <li>
    icon displayed if NOT checked:
    <span data-bind="class_unless(icon-wrench)=_component_.on"></span>
  </li>
  <li>
    icon changes depending on checked:
    <span data-bind="class(icon-umbrella|icon-wrench)=_component_.on"></span>
  </li>
</ul>
<label>
  <span style="font-size: 32px" data-bind="class_map(
    happy:happy-class
    |sad:sad-class
    |indifferent-class
  )=_component_.emotion"></span><br>
  <select data-bind="value=_component_.emotion">
    <option>happy</option>
    <option>sad</option>
    <option>indifferent</option>
  </select>
</label>
<script>
  set('emotion', 'sad');
</script>
```

This lets you pick between two classes.

### show\_if, show\_if(), hide\_if, hide\_if()

    data-bind="hide_if(_undefined_)=message.priority"

### enabled\_if, enabled\_if(), disabled\_if, disabled\_if()

    data-bind="enabled_if=path.to.editable"

This shows (or hides) an element based on whether a bound value is truthy or
matches the provided parameter.

### img

    <img data-bind="img=path.to.imageUrl">

The `<img>` element will have its src attribute set after the image has been preloaded
(and it will fade in). Leverage's b8r's [imgSrc library](?source=source/b8r.imgSrc.js)

**Note**: This can cause problems with cross-domain policies. If you just want to set the src
to the specified string, you can use a simple `attr()` binding:

    <img data-bind="attr(src)=path.to.imageUrl"

### bgImg

    <div data-bind="bgImg=path.to.imageUrl">...</div>

The `<div>` will have its style.backgroundImage set to `url(the-path-provided)` or
nothing (if the path is falsey).

### method()

    data-bind="method(model.notify)=message.priority"

Calls the specified method, passing it the bound value. The method will receive
the **element**, **value**, and **data source** as parameters. (This means that methods
also registered as event handlers will need to deal with being passed a naked
element instead of an event).

If you just include a method path as the target and it includes a period,
`b8r` will implicitly treat the target as a method-path. So you could write
the previous example as just:

    data-bind="model.notify=message.priority"

~~~~
const span = b8r.create('span')
let callCount = 0
b8r.register('test_', {
  method: (element, x) => {
    element.textContent = x
    callCount++
  },
  value: 'hello',
})
span.dataset.bind = 'test_.method=test_.value'
document.body.append(span)
b8r.forceUpdate()
Test(() => span.textContent, 'implicit method binding works').shouldBe('hello')
Test(() => callCount, 'method called once').shouldBe(1)
b8r.set('test_.value', 'hello')
b8r.forceUpdate()
b8r.set('test_.value', 'hello')
b8r.forceUpdate()
Test(() => callCount, 'no unnecessary call to method').shouldBe(1)
b8r.set('test_.value', 'good-bye')
b8r.forceUpdate()
Test(() => span.textContent, 'update works').shouldBe('good-bye')
Test(() => callCount, 'exactly one more call to method').shouldBe(2)
span.remove()
b8r.remove('test_')
~~~~

```
<input type="range" data-bind="value=_component_.num">
<span data-bind="method(_component_.order)=_component_.num"></span>
<script>
  const is_prime = x => {
    const max = Math.sqrt(x);
    for(let i = 2; i < max; i++) {
      if (x % i === 0) { return false; }
    }
  }
  set('order', (elt, val) => {
    const info = [];
    info.push(val % 2 ? 'odd' : 'even');
    if (Math.floor(Math.sqrt(val)) === Math.sqrt(val)) {
      info.push('perfect square');
    }
    if (is_prime(val)) {
      info.push('prime');
    }
    elt.textContent = val + ' is ' + info.join(', ');
  });
  set('num', 1);
</script>
```

#### Passing multiple values to a bound method

You can pass an multiple values to a bound method by comma-delimiting the paths, e.g.

    data-bind="method(path.to.method)=path.to.value,path.to.other,another.path"

In this case, the **value** passed to the method will be an array of values
corresponding to the paths.

```
<style>
  pre {
    lineheight: 1
  }
</style>
<pre>
<input data-bind="value=_component_.a">+
<input data-bind="value=_component_.b">=
<span data-bind="method(_component_.sum)=_component_.a,_component_.b"></span>
</pre>
<script>
  set({
    a: 17,
    b: Math.PI,
    sum: (elt, values) => elt.textContent = values.reduce((a, b) => a + parseFloat(b), 0)
  })
</script>
```

### component\_map()

    data-bind="component_map(
        value:componentName|
        other_value:other_name|
        default_component
    )=message.type"

This allows a component to be bound dynamically based on a property. (The bound value
will be assigned to the component's private data.)

### json

    data-bind="json=path.to.object"

Dumps a nicely formatted stringified object in an element (for debugging
purposes);

### pointer\_events\_if, pointer\_events\_off\_if

    data-bind="pointer_events_if=path.to.enabled"

Sets the style rule pointer-events to 'none' as appropriate (very simple way of disabling
the content of an element)

### data\_path

    data-bind="data_path=path.to.dataPath"

You can use this to-target to set the `data-path` attribute of a DOM element
to a registered value (presumably a path).

**TO DO**: master-detail implementation with single source of truth as example.

### component

    data-bind="component(options)=path.to.options"

The `component` target lets you set (and get) component properties.

## Comparison Values

These terms are used for comparison to certain values in conditional toTargets.

* `_true_`
* `_false_`
* `_undefined_`
* `_null_`
* `_empty_`
*/

function _toTargets (b8r) {
  const specialValues = {
    _true_: v => v === true,
    _false_: v => v === false,
    _undefined_: v => v === undefined,
    _null_: v => v === null,
    _empty_: v => typeof v === 'string' && !!v.trim()
  };

  const equals = (valueToMatch, value) => {
    if (typeof value === 'string') {
      value = value.replace(/&nbsp;/g, '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(specialValues, valueToMatch)) {
      return specialValues[valueToMatch](value)
    } else if (valueToMatch !== undefined) {
      return value == valueToMatch // eslint-disable-line eqeqeq
    } else {
      return !!value
    }
  };

  const parseOptions = source => {
    if (!source) {
      throw new Error('expected options')
    }
    return source.split('|').map(s => s.trim()).filter(s => !!s).map(s => {
      s = s.split(':').map(s => s.trim());
      return s.length === 1 ? { value: s[0] } : { match: s[0], value: s[1] }
    })
  };

  return {
    value: function (element, value) {
      if (element.dataset.type === 'number') value = parseFloat(value);
      switch (element.getAttribute('type')) {
        case 'radio':
          if (element.checked !== (element.value == value)) { // eslint-disable-line eqeqeq
            element.checked = element.value == value; // eslint-disable-line eqeqeq
          }
          break
        case 'checkbox':
          element.checked = value;
          break
        default:
          if (element.dataset.componentId) {
            b8r.set(`${element.dataset.componentId}.value`, value);
          } else if (element.value !== undefined) {
            element.value = value;
            // <select> element will not take value if no matching option exists
            if (element instanceof HTMLSelectElement) {
              if (value && !element.value) {
                element.dataset.pendingValue = JSON.stringify(value);
              } else if (element.dataset.pendingValue) {
                delete element.dataset.pendingValue;
              }
            }
          } else {
            if (!element.tagName.includes('-')) {
              console.error('could not set component value', element, value);
            }
          }
      }
    },
    checked: (element, value) => {
      if (value === null) {
        element.checked = false;
        element.indeterminate = true;
      } else {
        element.indeterminate = false;
        element.checked = !!value;
      }
    },
    selected: (element, value) => {
      element.selected = !!value;
    },
    text: (element, value) => {
      element.textContent = value;
    },
    format: (element, value) => {
      let content = value || '';
      if (typeof content !== 'string') {
        throw new Error('format only accepts strings or falsy values')
      }
      let template = false;
      // only honor formatting if there's no change it's code
      if (content.match(/[*_]/) && !content.match(/<|>/)) {
        template = true;
        content = content.replace(/[*_]{2,2}(.*?)[*_]{2,2}/g, '<b>$1</b>')
          .replace(/[*_](.*?)[*_]/g, '<i>$1</i>');
      }
      if (content.indexOf('${') > -1) {
        content = b8r.interpolate(content, element);
      }
      if (template) {
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }
    },
    fixed: (element, value, dest) => {
      element.textContent = parseFloat(value).toFixed(dest || 1);
    },
    bytes: (element, value) => {
      if (!value) {
        element.textContent = '';
        return
      }
      const suffixes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];
      let suffix = suffixes.shift();
      element.title = `${value} bytes`;
      while (value > 1024 && suffix.length) {
        value = (value / 1024).toFixed(1);
        suffix = suffixes.shift();
      }
      element.textContent = `${value} ${suffix}`;
    },
    attr: function (element, value, dest) {
      if (value === undefined || value === null || value === false) {
        element.removeAttribute(dest);
      } else {
        element.setAttribute(dest, value);
        // workaround for iOS bug where canplaythrough does not fire
        // if load has not been explicitly called after setting src
        if (dest === 'src' && typeof element.load === 'function') element.load();
      }
    },
    prop: function (element, value, property) {
      element[property] = value;
    },
    data: function (element, value, dest) {
      if (value === undefined || value === null || value === false) {
        delete element.dataset[dest];
      } else {
        element.dataset[dest] = value;
      }
    },
    img: imgSrc,
    bgImg: (element, value) => {
      if (value) {
        element.style.backgroundImage = `url("${value}")`;
      } else {
        element.style.backgroundImage = '';
      }
    },
    style: function (element, value, dest) {
      if (!dest) {
        if (typeof value === 'string') {
          element.setAttribute('style', dest);
        } else if (typeof value === 'object') {
          Object.assign(element.style, value);
        }
      } else if (value !== undefined) {
        const [prop, units] = dest.split('|');
        element.style[prop] = units ? `${value}${units}` : value;
      }
    },
    class: function (element, value, classToToggle) {
      if (!classToToggle) {
        throw new Error('class toTarget requires a class to be specified')
      }
      const options = parseOptions(classToToggle);
      element.classList.toggle(options[0].value, !!value);
      if (options.length > 1) {
        element.classList.toggle(options[1].value, !value);
      }
    },
    class_unless: function (element, value, classToToggle) {
      if (!classToToggle) {
        throw new Error('class_unless toTarget requires a class to be specified')
      }
      element.classList.toggle(classToToggle, !value);
    },
    class_map: function (element, value, map) {
      const classOptions = parseOptions(map);
      let done = false;
      classOptions.forEach(item => {
        if (done || (item.match && !equals(item.match, value))) {
          element.classList.remove(item.value);
        } else {
          element.classList.add(item.value);
          done = true;
        }
      });
    },
    contenteditable: function (element, value, dest) {
      if (equals(dest, value)) {
        element.setAttribute('contenteditable', true);
      } else {
        element.removeAttribute('contenteditable');
      }
    },
    enabled_if: function (element, value, dest) {
      if (equals(dest, value)) {
        b8r.enable(element);
      } else {
        b8r.disable(element);
      }
    },
    disabled_if: function (element, value, dest) {
      if (!equals(dest, value)) {
        b8r.enable(element);
      } else {
        b8r.disable(element);
      }
    },
    pointer_events_if: function (element, value) {
      element.style.pointerEvents = value ? 'auto' : 'none';
    },
    pointer_events_off_if: function (element, value) {
      element.style.pointerEvents = !value ? 'auto' : 'none';
    },
    show_if: function (element, value, dest) {
      equals(dest, value) ? b8r.show(element) : b8r.hide(element);
    },
    hide_if: function (element, value, dest) {
      equals(dest, value) ? b8r.hide(element) : b8r.show(element);
    },
    method: function (element, value, dest) {
      let [model, ...method] = dest.split('.');
      method = method.join('.');
      if (model === '_component_') {
        model = getComponentWithMethod(element, method);
      }
      if (model) {
        b8r.callMethod(model, method, element, value);
      } else if (element.closest('body')) {
        console.warn(`method ${method} not found in`, element);
      }
    },
    timestamp: function (element, zulu, format) {
      if (!zulu) {
        element.textContent = '';
      } else if (!format) {
        const date = new Date(zulu);
        element.textContent = date.toLocaleString();
      } else {
        const date = new Date(zulu);
        element.textContent = date.format(format);
      }
    },
    json: function (element, value) {
      try {
        element.textContent = JSON.stringify(value, false, 2);
      } catch (_) {
        const obj = {};
        Object.keys(value).forEach(key => {
          obj[key] = describe$1(value[key]);
        });
        element.textContent = '/* partial data -- could not stringify */\n' + JSON.stringify(obj, false, 2);
      }
    },
    data_path: function (element, value) {
      if (!element.dataset.path || (value && element.dataset.path.substr(-value.length) !== value)) {
        element.dataset.path = value;
        b8r.bindAll(element);
      }
    },
    component: function (element, value, dest) {
      const componentId = b8r.getComponentId(element);
      b8r.setByPath(componentId, dest, value);
    },
    component_map: function (element, value, map) {
      const componentOptions = parseOptions(map);
      const option = componentOptions.find(item => !item.match || item.match == value); // eslint-disable-line eqeqeq
      if (option) {
        const componentName = option.value;
        const existing = element.dataset.componentId || '';
        if (existing.indexOf(`c#${componentName}#`) === -1) {
          b8r.removeComponent(element);
          b8r.insertComponent(componentName, element);
        }
      }
    }
  }
}

/**
# Sort Utilities

These are convenient methods that behave a bit like the "spaceship" operator in PHP7.

### Usage

    import {sortAscending, sortDescending} from 'path/to/b8r.sort.js';

    const a = ['b', 'a', 'c'];
    const ascending = a.sort(sortAscending); // ['a', 'b', 'c'];
    const descending = a.sort(sortDescending); // ['c', 'b', 'a'];

    import {makeAscendingSorter, makeDescendingSorter} from 'path/to/b8r.sort.js'
    const beatles = [{name: 'paul'}, {name: 'john'}, {name: 'george'}, {name: 'ringo'}]
    beatles.sort(makeAscendingSorter(beatle => beatle.name)) // [{name: 'george'}, ...]

They're also useful for building custom sort methods:

    // sort an array of objects by title property
    const sorted = array_of_objs.sort((a, b) => sortAscending(a.title, b.title));

~~~~
// title: sortAscending & sortDescending tests
const {sortAscending, sortDescending, makeAscendingSorter, makeDescendingSorter} = b8r;
Test(() => ['c', 'a', 'B'].sort(sortAscending), 'sort strings, ascending').shouldBeJSON(['a','B','c']);
Test(() => ['c', 'a', 'B'].sort(sortDescending), 'sort strings, descending').shouldBeJSON(['c','B','a']);
Test(() => ['3', 1, 2].sort(sortAscending), 'sort mixed types, ascending').shouldBeJSON([1,2,'3']);
Test(() => ['3', 1, 2].sort(sortDescending), 'sort mixed types, descending').shouldBeJSON(['3',2,1]);
const beatles = [{name: 'paul'}, {name: 'john'}, {name: 'george'}, {name: 'ringo'}]
beatles.sort(makeAscendingSorter(beatle => beatle.name))
Test(() => beatles[2].name, 'makeAscendingSorter works').shouldBe('paul')
beatles.sort(makeDescendingSorter(beatle => beatle.name))
Test(() => beatles[3].name, 'makeDescendingSorter works').shouldBe('george')
~~~~
*/

const sortAscending = (a, b) =>
  typeof a === 'string' || typeof b === 'string'
    ? `${a}`.localeCompare(b) : a > b ? 1 : b > a ? -1 : 0;

const sortDescending = (a, b) =>
  typeof a === 'string' || typeof b === 'string'
    ? `${b}`.localeCompare(a) : a > b ? -1 : b > a ? 1 : 0;

const identity = x => x;

const makeAscendingSorter = (getter = identity) => {
  return (a, b) => sortAscending(getter(a), getter(b))
};

const makeDescendingSorter = (getter = identity) => {
  return (a, b) => sortDescending(getter(a), getter(b))
};

var _sort = /*#__PURE__*/Object.freeze({
  __proto__: null,
  sortAscending: sortAscending,
  sortDescending: sortDescending,
  makeAscendingSorter: makeAscendingSorter,
  makeDescendingSorter: makeDescendingSorter
});

/**
# fromTargets
Copyright ©2016-2017 Tonio Loewald

## Getting bound data from the DOM

The following binding *targets* will automatically copy data from the DOM to bound objects
when an input or change event fires on the bound element:

### value

The **value** of `<input>` and `<textarea>` elements; it will correctly return
the value of `<input type="radio" ...>` elements.

If you bind to a **component instance**'s value it will map directly to the component's
value.

#### forcing value to be a number

`<input type="number">` and `<input type="range">` will have their values returned as numbers
(rather than strings). Likewise, if you add `data-type="number"` to an element with a value
(e.g. `<select>`), its value will be returned as numeric.

> ### Two-Way Bindings
>
> `value` and most "from"-bindings are also ["to"-bindings](?source=source/b8r.toTargets.js).
> which means that an element will automatically be populated with bound data, and updated
> when it is set or changed *by path* (e.g. `set('path.to.data', newValue)`) or the path to that
> data is `touch()`ed (e.g. `touch('path.to.data'))`).

### checked

The **checked** of an `<input type="checkbox">` or `<input type="radio">` element.

### selected

The **selected** attribute on an `<option>`.

### text

The **textContent** of a typical element (including div, span, and so forth). Note
that these elements will only get change events if you send them.

### prop

Allows you to get data from element properties (e.g. the `currentTime` of an `HTMLMediaElement`).

### component

    data-bind="component(options)=path.to.options"

The `component` target lets you get (and set) component properties.
*/

const value = (element) => {
  let pendingValue = element.dataset.pendingValue;
  if (pendingValue) {
    pendingValue = JSON.parse(pendingValue);
    element.value = pendingValue;
    if (element.value === pendingValue) {
      // console.log('restored pending value', element, pendingValue);
      if (element.dataset.pendingValue) {
        delete element.dataset.pendingValue;
      }
    }
  }
  if (element.matches('input[type=radio]')) {
    const name = element.getAttribute('name');
    const checked = find(`input[type=radio][name=${name}]`).find(elt => elt.checked);
    return checked ? checked.value : null
  } else if (element.matches('[data-type=number],input[type=number],input[type=range]')) {
    return parseFloat(element.value)
  } else {
    if (element.dataset.componentId) {
      return get(`${element.dataset.componentId}.value`)
    } else {
      return element.value
    }
  }
};

const checked = (element) => element.indeterminate ? null : element.checked;

const selected = (element) => element.selected;

const text$1 = (element) => element.textContent;

const currentTime = (element) => element.currentTime;

const playbackRate = (element) => element.playbackRate;

const prop = (element, property) => element[property];

const component$1 = (element, path) => {
  const componentId = element.dataset.componentId;
  return _getByPath(componentId, path)
};

const fromMethod = (element, path) => {
  let [model, ...method] = path.split('.');
  method = method.join('.');
  return _getByPath(model, method)(element)
};

var fromTargets$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  value: value,
  checked: checked,
  selected: selected,
  text: text$1,
  currentTime: currentTime,
  playbackRate: playbackRate,
  prop: prop,
  component: component$1,
  fromMethod: fromMethod
});

/**
# Data for Element
*/

const dataWaitingForComponents = []; // { targetElement, data }

const saveDataForElement = (targetElement, data) => {
  if (data) {
    removeDataForElement(targetElement);
    dataWaitingForComponents.push({ targetElement, data });
  }
};

const removeDataForElement = (targetElement) => {
  for (var i = 0; i < dataWaitingForComponents.length; i++) {
    if (dataWaitingForComponents[i].targetElement === targetElement) {
      delete dataWaitingForComponents[i].data;
    }
  }
};

const dataForElement = (targetElement, _default) => {
  var data;
  for (var i = 0; i < dataWaitingForComponents.length; i++) {
    if (dataWaitingForComponents[i].targetElement === targetElement) {
      data = dataWaitingForComponents[i].data;
      removeDataForElement(targetElement);
      return data
    }
  }

  const json = targetElement.dataset.json;
  if (json) {
    return JSON.parse(json)
  }

  return _default
};

/**
# anyEvents — priority access

`b8r` provides a mechanism for intercepting events before they do anything
else. This is incredibly powerful for dealing with complex user interface interactions.

> **Caution** if you don't return `true` from the handler the event will be stopped.

    b8r.onAny(eventType, object, method) => handlerRef

creates an event handler that will get first access to any event; returns a
reference for purposes of removal

    b8r.offAny(handlerRef,...)

removes all the handlerRefs passed

    b8r.anyListeners()

returns active any listeners.

**Note** that this works *exactly* like an invisible element in front of
everything else for purposes of propagation.

*/

const anyArgs = args => {
  var eventType, object, method, path;
  if (args.length === 2) {
    [eventType, path] = args;
  } else {
    [eventType, object, method] = args;
    path = object + '.' + method;
  }
  return { eventType, path }
};

const onAny = function (...args) {
  const { eventType, path } = anyArgs(args);
  on(anyElement, eventType, path);
};

const offAny = function (...args) {
  const { eventType, path } = anyArgs(args);
  off(anyElement, eventType, path);
};

const anyListeners = () => getEventHandlers(anyElement);

/**
# Show and Hide

    show(element, ...); // show the element

Shows the element (via the CSS `display` value -- restoring a previously altered value where
appropriate). Triggers a synthetic `show` event on any elements with `show` event handlers
passing any additional arguments.

    hide(element, ...); // hide the element

Hides the element (storing its original `display` value in an attribute). Triggers a synthetic
`hide` event on any elements with `hide` event handlers passing any additional arguments.

## `data-orig-display`

If you're wondering what `data-orig-display` is, it's an artifact of `show` and `hide`. When
an element is hidden, `hide` sets `.style.display = "none"` and records its previous value as
the `data-orig-display` attribute.
*/

const show = (element, ...args) => {
  // used to check if the element was in fact hidden, but that turns out to be expensive
  // probably because of the cost of getComputedStyle
  if (element.dataset.origDisplay === undefined) {
    element.dataset.origDisplay = element.style.display === 'none' ? '' : element.style.display;
  }
  element.style.display = element.dataset.origDisplay;
  findWithin(element, '[data-event*="show"]', true)
    .forEach(elt => trigger('show', elt, ...args));
};

const hide = (element, ...args) => {
  if (isVisible(element)) {
    if (element.dataset.origDisplay === undefined) {
      element.dataset.origDisplay = element.style.display;
      findWithin(element, '[data-event*="hide"]', true)
        .forEach(elt => trigger('hide', elt, ...args));
    }
    element.style.display = 'none';
  }
};

/**
# Custom Elements
<h2 style="margin-top: -10px">a.k.a web-components</h2>

> ## Confused?
>
> This document has been retitled _Custom Elements_ to make a clearer distinction between
> documentation on `b8r` _components_ and _web-components_. Nothing has changed under the
> hood. The terms "web-component" and "custom element" are used interchangeably here, and
> everywhere else.
>
> Just to add to the confusion, `b8r` components are themselves instances of a custom
> element `<b8r-component>`.

This library provides helper functions for creating [Custom Elements](https://www.webcomponents.org/).
The terms "web-component" and "custom element" are used interchangeably everywhere.

## Example

```
// you cannot redefine an existing web-component so we need a unique name for refreshes
const componentName = 'simple-button-' + b8r.unique()
const {makeWebComponent, div} = b8r.webComponents
const elt = b8r.create(componentName)
elt.textContent = 'Click Me'
makeWebComponent(componentName, {
  style: {
    ':host': {
      cursor: 'default',
      display: 'inline-block',
      borderRadius: '4px',
      background: '#55f',
      color: 'white',
      padding: '5px 10px',
    },
    ':host(:hover)': {
      background: '#44e',
    },
    ':host(:active)': {
      background: '#228',
    },
  },
  methods: {
    onAction() {
      alert(this.textContent + ' was clicked')
    },
    render () {
      this.onclick = this.onAction
    }
  }
})
example.append(elt)
```

## Methods

### makeWebComponent

    // where appropriate, default values are shown
    makeWebComponent('tag-name', {
      superClass: undefined,   // the class you're extending, if any
      style: false,            // expect object
      props: {},               // map names to default values / functions
      methods: {},             // map names to class methods
      eventHandlers: {},       // map eventTypes to event handlers
      attributes: {},          // map attributes to default values
      content: slot(),         // HTMLElement or DocumentFragment or falsy
      role: false,             // expect string
    })                        // returns the class

Defines a new _custom element_.

Returns the component `class` (in case you want to subclass it, use the constructor
for comparison, or whatever).

- `style` can be CSS source or a map of selector rules to maps of css rules.
  If no style is passed, no shadowRoot will be created
- `props` are direct properties added to the element; if you pass a function
  then if it takes no parameters a computed read-only property of that name
  will map to the function. If the function takes a parameter, it will
  be treated as a computed setter as well. Unlike attributes, props don't
  appear in the DOM.
- `methods` will become class methods, notably `render`
  - `render` is where the widget gets expressed in the DOM, based on its state
    it will fire automatically when a value or attribute changes
- `eventHandlers` will be bound to the DOM element (i.e. `this` will refer to the
  expected instance)
  - the usual events work as expected (e.g. `click`, `mouseleave`)
  - `onConnectedCallback` will be called by the parent class at the right time
  - `childListChange` will be called when something inside the element is changed
  - `resize` will be called when the element changes size (which is triggered by a
    ResizeObserver) -- you may want to throttle your handler
- `attributes` will be converted into object setters and getters.
  - the default value is assumed to be the correct type (if string or number);
    for any other type (e.g. null or an object) the value is preserved as an element
    property and not reflected in the DOM, and if an attribute is found, it's treated
    as JSON.
  - `value` is treated like any other attribute
    - boolean values are encoded by the value attribute being present or absent
    - when `value` is changed, a change event is triggered
  - a DOM mutation observer will automatically update the element (i.e. the `render`
    method will fire if the attributes are changed).
  - **Note**: if you specify any attributes, a `MutationObserver` will be created
    to trigger `render()` when attributes are changed.
  - a boolean attribute will be reflected as a boolean attribute in the DOM (e.g.
    the way `disabled` works).
- `content` will default to being a `<slot>` (pass explicit `false` or content that
  explicitly does not include a `<slot>` element and you'll create a sealed element,
  i.e. an element that ignores its content).
  - you can be lazy and pass a string to content (it will become a `TextNode`) or
    an array of `HTMLElement` and (you can wrap them in a `DocumentFragment` but
    you don't have to).
- `role` will do the expected thing
- by default, setting the `hidden` attribute will hide a styled component (this is
  implemented via styles), not attributes, so there's no MutationObserver oberhead.

The class has a single static method, `defaultAttributes()` which returns (shockingly)
the a clone of the `atrributes` array used to construct the component. This is useful
for introspection (e.g. if you're building a UI builder that needs to know what attributes
a given custom element has).

### Component Lifecycle

makeComponent copies all methods provided into the component's prototype, so the
standard lifecycle methods `connectedCallback`, `disconnectedCallback`,
`adoptedCallback`, and `attributeChangedCallback` work as normal, with one minor
caveat — this library creates component classes with a default `connectedCallback`
that will call any `connectedCallback` passed as a method afterwards.

### Performance Notes

The "lightest" web-components have no `style` (and hence **no shadowDOM**) or `attributes`.
- supporting attributes involves creating a `MutationObserver`, which has an overhead.
- adding a `style` object has a larger perf overhead.

Even so, in general web-components should perform better than components implemented using
Javascript frameworks. Well, not `b8r` components, at least at time of writing, but
the great thing about using native browser functionality is that it generally just
gets _faster_. Which gets us to...

### The Shadow DOM

You've heard of it, right? It can be fantastically useful (it's useful for creating
structural behavior that is immune to the outside world, such as dialog boxes and
floating elements) but it's also a huge performance issue if you have too many of
them around (I imagine that the overhead is some fraction of an `<iframe>`...).

More information is provided in [this blog entry](http://loewald.com/blog/2019/01/more-on-web-components-and-perf/).

### makeElement

    const makeElement = (tagType, {
      content: false,  // text, or something that can be appended to an HTMLElement
      attributes: {},  // attribute map
      styles: {},      // style object
      classes: [],     // list of classes
    })                // returns the element

A handy method for creating a DOM element with specified properties. Content can
be an `HTMLElement` or `DocumentFragment` or a string (which is converted to a text
node).

If you want to create a reusable element 'factory' you can simply write
something like:

    const div = (settings={}) => makeElement('div', settings);

This is how the convenience methods below were created, and affords lightweight
rendering of DOM structures in vanilla javascript without requiring transpilation, etc.

E.g. instead of writing this:

    import {styled} from "styletron-react";
    const StyledElement = styled('div', {
      ... css stuff ...
    });
    ...
    <StyledElement>
      <div></div>
      <div></div>
      <div></div>
    </StyledElement>

…and relying on transpilation, you can write:

    import {makeElement, div} from "web-components";
    const styledElement = makeElement('div', {
      styles: {
        ... css stuff ...
      }
    });
    ...
    styledElement({ content: [div(), div(), div()] });

…and it will work transparently in any modern browser.

### dispatch

The recommended way for custom-elements to notify the rest of the world that
they've changed in some way is by triggering events.

    dipatch(target, type) // triggers an event of type on the target element

### div, span, input, slot

These are convenience methods wrapped around makeElement, so instead of writing:

    makeElement('span', {...});

You can write:

    span({...}); // and the object is optional, so span() works too.

### fragment

    fragment(...elements)

Creates a document fragment containing the elements passed to it.

#### Example

This is from an older version of the `<b8r-select>` control:

    fragment(
      makeElement('div', {classes: ['selection']}),
      makeElement('div', {content: '▾', classes: ['indicator']}),
      makeElement('div', {classes: ['menu'], content: makeElement('slot', {})}),
    )

Convenience methods allow this to be simplified to:

    fragment(
      div({classes: ['selection']}),
      div({content: '▾', classes: ['indicator']}),
      div({classes: ['menu'], content: slot()}),
    )

If you build multiple similar elements and want to reuse them, don't forget
to `cloneNode(true)` something you want another copy of.

## TODO

- Provide the option of inserting a stylesheet when the first component instance is inserted
  into the DOM (see below) as an alternative to using the shadow DOM or being unstyled.
- Migrate all style customization in library components to css-variables with sane defaults.

### Styling

In my opinion, the best way to style custom elements in a way that allows easy
customization is to use [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties).
(**Note**: this was controversial when I wrote it, and now seems to be accepted wisdom. Yay!)

- [Styling a Web Component](https://css-tricks.com/styling-a-web-component/)

The above is more of a "how to" than best practices. Take it with a grain of salt.

I think the jury is out on whether creating _complex views_ as web-components is a good
idea. (Angular does this under the hood and it's torpid, but that might just be Angular.)
So far, creating views with `b8r` components seems much simpler, quicker, and
more flexible. `b8r` components themselves are implemented as instances of the
`<b8r-component>` custom element. That said, creating complex views using
precompilers (e.g. [TypeScript with .jsx support](https://www.typescriptlang.org/docs/handbook/jsx.html))
the way Google's [litElement](https://lit-element.polymer-project.org/)
does may potentially make web-components easier to write.

Creating components with minimal styling and no shadowDOM is another possibility.
Instead of creating an internal style node, they could simply insert a singleton
stylesheet in the `<header>` the way `b8r` components do.

## Recommended Reading

### Best Practices

I do not follow these slavishly (some I flat out disagree with) but include them for
reference purposes.

- [Custom Elements Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices)
- [Web Components Best Practices](https://www.webcomponents.org/community/articles/web-components-best-practices)

### Other Resources

- [Polymer Project](https://www.polymer-project.org/), the source of
  [litElement](https://lit-element.polymer-project.org/) et al
- [webcomponents.org](https://www.webcomponents.org/libraries) strives to be a portal to
  the world of custom-elements, but so far is not inspiring.

*/
/* global Event, MutationObserver, HTMLElement, requestAnimationFrame */

const makeElement = (tagType, {
  content = false,
  attributes = {},
  styles = {},
  classes = []
}) => {
  const elt = document.createElement(tagType);
  appendContentToElement(elt, content);
  Object.keys(attributes).forEach((attributeName) => elt.setAttribute(attributeName, attributes[attributeName]));
  Object.keys(styles).forEach((styleName) => {
    elt.style[styleName] = styles[styleName];
  });
  classes.forEach((className) => elt.classList.add(className));
  return elt
};

const dispatch$1 = (target, type) => {
  const event = new Event(type);
  target.dispatchEvent(event);
};

/* global ResizeObserver */
const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    const element = entry.target;
    dispatch$1(element, 'resize');
  }
});

const button = (settings = {}) => makeElement('button', settings);
const div = (settings = {}) => makeElement('div', settings);
const input = (settings = {}) => makeElement('input', settings);
const label = (settings = {}) => makeElement('label', settings);
const slot = (settings = {}) => makeElement('slot', settings);
const span = (settings = {}) => makeElement('span', settings);
const text$2 = s => document.createTextNode(s);

const appendContentToElement = (elt, content) => {
  if (content) {
    if (typeof content === 'string') {
      elt.textContent = content;
    } else if (Array.isArray(content)) {
      content.forEach(node => {
        elt.appendChild(node.cloneNode ? node.cloneNode(true) : text$2(node));
      });
    } else if (content.cloneNode) {
      elt.appendChild(content.cloneNode(true));
    } else {
      throw new Error('expect text content or document node')
    }
  }
};

const fragment$1 = (...elements) => {
  const container = document.createDocumentFragment();
  elements.forEach(element => container.appendChild(element.cloneNode(true)));
  return container
};

const _hyphenated = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

const _css = (obj) => {
  if (typeof obj === 'object') {
    const selectors = Object.keys(obj).map((selector) => {
      const body = obj[selector];
      const rule = Object.keys(body)
        .map((prop) => `  ${_hyphenated(prop)}: ${body[prop]};`)
        .join('\n');
      return `${selector} {\n${rule}\n}`
    });
    return selectors.join('\n\n')
  } else {
    return obj
  }
};

const makeWebComponent = (tagName, {
  superClass = HTMLElement, // the class you're exetending
  value = false, // expect boolean
  style = false, // expect object
  methods = {}, // map names to functions
  eventHandlers = {}, // map eventTypes to event handlers
  props = {}, // map of instance properties to defaults
  attributes = {}, // map attributes to default values
  content = slot(), // HTMLElement or DocumentFragment
  role = false // expect string
}) => {
  let styleNode = null;
  if (style) {
    style = Object.assign({ ':host([hidden])': { display: 'none !important' } }, style);
    styleNode = makeElement('style', { content: _css(style) });
  } else if (style) {
    console.error(`style for a web-component ${tagName} with now shadowRoot is not supported`);
  }
  if (methods.render) {
    methods = Object.assign({
      queueRender (change = false) {
        if (!this._changeQueued) this._changeQueued = change;
        if (!this._renderQueued) {
          this._renderQueued = true;
          requestAnimationFrame(() => {
            if (this._changeQueued) dispatch$1(this, 'change');
            this._changeQueued = false;
            this._renderQueued = false;
            this.render();
          });
        }
      }
    }, methods);
  }

  const componentClass = class extends superClass {
    constructor () {
      super();
      for (const prop of Object.keys(props)) {
        const value = props[prop]; // local copy that won't change
        if (typeof value !== 'function') {
          this[prop] = value;
        } else {
          Object.defineProperty(this, prop, {
            enumerable: false,
            get () {
              return value.call(this)
            },
            set (x) {
              if (value.length === 1) {
                value.call(this, x);
              } else {
                throw new Error('cannot set read-only prop')
              }
            }
          });
        }
      }
      if (styleNode) {
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(styleNode.cloneNode(true));
        appendContentToElement(shadow, content);
      } else {
        appendContentToElement(this, content);
      }
      Object.keys(eventHandlers).forEach(eventType => {
        const passive = eventType.startsWith('touch') ? { passive: true } : false;
        this.addEventListener(eventType, eventHandlers[eventType].bind(this), passive);
      });
      if (eventHandlers.childListChange) {
        const observer = new MutationObserver(eventHandlers.childListChange.bind(this));
        observer.observe(this, { childList: true });
      }
      const attributeNames = Object.keys(attributes);
      if (attributeNames.length) {
        const attributeValues = {};
        const observer = new MutationObserver((mutationsList) => {
          let triggerChange = false;
          let triggerRender = false;
          mutationsList.forEach((mutation) => {
            triggerChange = mutation.attributeChange === 'value';
            triggerRender = triggerRender || triggerChange || attributeNames.includes(mutation.attributeName);
          });
          if (triggerRender && this.queueRender) this.queueRender(triggerChange);
        });
        observer.observe(this, { attributes: true });
        attributeNames.forEach(attributeName => {
          Object.defineProperty(this, attributeName, {
            enumerable: false,
            get () {
              if (typeof attributes[attributeName] === 'boolean') {
                return this.hasAttribute(attributeName)
              } else {
                if (this.hasAttribute(attributeName)) {
                  return typeof attributes[attributeName] === 'number'
                    ? parseFloat(this.getAttribute(attributeName))
                    : this.getAttribute(attributeName)
                } else if (attributeValues[attributeName] !== undefined) {
                  return attributeValues[attributeName]
                } else {
                  return attributes[attributeName]
                }
              }
            },
            set (value) {
              if (typeof attributes[attributeName] === 'boolean') {
                if (value !== this[attributeName]) {
                  if (value) {
                    this.setAttribute(attributeName, '');
                  } else {
                    this.removeAttribute(attributeName);
                  }
                  if (this.queueRender) this.queueRender(attributeName === 'value');
                }
              } else if (typeof attributes[attributeName] === 'number') {
                if (value !== parseFloat(this[attributeName])) {
                  this.setAttribute(attributeName, value);
                  if (this.queueRender) this.queueRender(attributeName === 'value');
                }
              } else {
                if (typeof value === 'object' || `${value}` !== `${this[attributeName]}`) {
                  if (value === null || value === undefined || typeof value === 'object') {
                    this.removeAttribute(attributeName);
                  } else {
                    this.setAttribute(attributeName, value);
                  }
                  attributeValues[attributeName] = value;
                  if (this.queueRender) this.queueRender(attributeName === 'value');
                }
              }
            }
          });
        });
      }
      if (this.queueRender) this.queueRender();
    }

    connectedCallback () {
      // super annoyingly, chrome loses its shit if you set *any* attributes in the constructor
      if (role) this.setAttribute('role', role);
      if (eventHandlers.resize) {
        observer.observe(this);
      }
      if (methods.connectedCallback) methods.connectedCallback.call(this);
    }

    disconnectedCallback () {
      observer.unobserve(this);
    }

    static defaultAttributes () {
      return { ...attributes }
    }
  };

  Object.keys(methods).forEach(methodName => {
    if (methodName !== 'connectedCallback') {
      componentClass.prototype[methodName] = methods[methodName];
    }
  });

  // if-statement is to prevent some node-based "browser" tests from breaking
  if (window.customElements) window.customElements.define(tagName, componentClass);

  return componentClass
};

var webComponents = /*#__PURE__*/Object.freeze({
  __proto__: null,
  fragment: fragment$1,
  makeElement: makeElement,
  makeWebComponent: makeWebComponent,
  div: div,
  slot: slot,
  input: input,
  button: button,
  label: label,
  span: span,
  text: text$2,
  dispatch: dispatch$1
});

/**
#bindinator
Copyright ©2016-2017 Tonio Loewald

Bindinator (b8r) binds data and methods to the DOM and lets you quickly turn chunks of
markup, style, and code into reusable components so you can concentrate on your project.

b8r leverages your understanding of the DOM and the browser rather than trying to
implement some kind of virtual machine to replace it.

## Core Functionality
- [The Registry](?source=source/b8r.registry.js)
- [Binding Data](?source=source/b8r.bindings.js)
  - [sending data to the DOM](?source=source/b8r.toTargets.js)
  - [capturing data changes from the DOM](?source=source/b8r.fromTargets.js)
- [Events](?source=source/b8r.events.js)
  - [keystroke](?source=source/b8r.keystroke.js)
- [Components](?source=source/b8r.component.js)

## Utilities
- [AJAX](?source=source/b8r.ajax.js)
- [DOM Utilities](?source=source/b8r.dom.js)
- [Functions](?source=source/b8r.functions.js)
- [Iterators](?source=source/b8r.iterators.js)
- [Showing and Hiding](?source=source/b8r.show.js)
*/

let uniqueId$1 = 0;
const unique$1 = () => uniqueId$1++;

// TODO seal b8r after it's been built

const b8r = { constants, unique: unique$1 };
const UNLOADED_COMPONENT_SELECTOR = '[data-component],b8r-component:not([data-component-id])';
const UNREADY_SELECTOR = `[data-list],${UNLOADED_COMPONENT_SELECTOR}`;

Object.assign(b8r, _dom);
Object.assign(b8r, _iterators);
Object.assign(b8r, { on, off, enable, disable, trigger, callMethod, implicitlyHandleEventsOfType });
Object.assign(b8r, { addDataBinding, removeDataBinding, getDataPath, getComponentId, getListPath, getListInstancePath });
Object.assign(b8r, { onAny, offAny, anyListeners });
Object.assign(b8r, _registry);
Object.assign(b8r, _byExample);
b8r.observe(() => true, (path, sourceElement) => touchByPath(path, sourceElement));
b8r.keystroke = keystroke;
b8r.modifierKeys = modifierKeys;
b8r.webComponents = webComponents;
Object.assign(b8r, _functions);

b8r.cleanupComponentInstances = b8r.debounce(() => {
  // garbage collect models
  b8r.forEachKey(_componentInstances, (element, componentId) => {
    if (!b8r.isInBody(element) || element.dataset.componentId !== componentId) {
      delete _componentInstances[componentId];
    }
  });
  b8r.models().forEach(model => {
    if (model.substr(0, 2) === 'c#' && !_componentInstances[model]) {
      b8r.callIf(`${model}.destroy`);
      b8r.remove(model, false);
    }
  });
}, 100);
Object.assign(b8r, { asyncUpdate, afterUpdate, touchElement });

b8r.forceUpdate = () => {
  let updateList;

  while (updateList = getUpdateList()) { // eslint-disable-line no-cond-assign
    const lists = b8r.find('[data-list]')
      .map(elt => ({ elt, listBinding: elt.dataset.list }));
    let binds = false; // avoid collecting elements before big list updates

    while (updateList.length) {
      const { path, source } = updateList.shift();
      try {
        if (path) {
          lists
            .filter(bound => bound.elt !== source && bound.listBinding.includes(path))
            .forEach(({ elt }) => bindList(elt));

          if (!binds) {
            binds = b8r.find('[data-bind]')
              .map(elt => { return { elt, data_binding: elt.dataset.bind } });
          }

          binds
            .filter(bound => bound.elt !== source && bound.data_binding.includes(path))
            .forEach(rec => {
              rec.dirty = true;
            });
        } else {
          b8r.bindAll(source);
        }
      } catch (e) {
        console.error('update error', e, { path, source });
      }
    }
    if (binds) binds.forEach(({ elt, dirty }) => dirty && bind(elt));
  }

  b8r.cleanupComponentInstances();

  _afterUpdate();
};

_setForceUpdate(b8r.forceUpdate);

b8r.setByPath = function (...args) {
  let name, path, value, sourceElement;
  if (args.length === 2 && typeof args[1] === 'object' && !Array.isArray(args[1])) {
    [name, value] = args;
    b8r.forEachKey(value, (val, path) => b8r.setByPath(name, path, val));
    return
  } else if (args.length === 2 || args[2] instanceof Element) {
    [path, value, sourceElement] = args;
    path = b8r.resolvePath(path, sourceElement);
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, sourceElement] = args;
  }
  if (b8r.registered(name)) {
    if (typeof path === 'object') {
      b8r.set(name, path, sourceElement);
    } else {
      b8r.set(
        path[0] === '[' || !path
          ? `${name}${path}`
          : `${name}.${path}`, value, sourceElement
      );
    }
  } else {
    console.error(`setByPath failed; ${name} is not a registered model`);
  }
};

_insertSet(b8r.set);
_insertFromTargets(fromTargets$1);

const _touchPath = (model, path) => {
  b8r.touch(model + (path.startsWith('[') ? path : '.' + path));
};

b8r.pushByPath = function (...args) {
  let name, path, value, callback;
  if (args.length === 2 || typeof args[2] === 'function') {
    [path, value, callback] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, callback] = args;
  }
  if (b8r.registered(name)) {
    const list = b8r.get(path ? `${name}.${path}` : name);
    list.push(value);
    if (callback) {
      callback(list);
    }
    _touchPath(name, path);
  } else {
    console.error(`pushByPath failed; ${name} is not a registered model`);
  }
};

b8r.unshiftByPath = function (...args) {
  let name, path, value;
  if (args.length === 2) {
    [path, value] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value] = args;
  }
  if (b8r.registered(name)) {
    const list = getByPath(b8r.get(name), path);
    list.unshift(value);
    _touchPath(name, path);
  } else {
    console.error(`unshiftByPath failed; ${name} is not a registered model`);
  }
};

b8r.removeListInstance = function (elt) {
  elt = elt.closest('[data-list-instance]');
  if (elt) {
    const ref = elt.dataset.listInstance;
    try {
      const [, model, path, key] = ref.match(/^([^.]+)\.(.+)\[([^\]]+)\]$/);
      b8r.removeByPath(model, path, key);
    } catch (e) {
      console.error('cannot find list item for instance', ref);
    }
  } else {
    console.error('cannot remove list instance for', elt);
  }
};

function indexFromKey (list, key) {
  if (typeof key === 'number') {
    return key
  }
  const [idPath, value] = key.split('=');
  return list.findIndex(elt => `${getByPath(elt, idPath)}` === value)
}

b8r.removeByPath = function (...args) {
  let name, path, key;
  if (args.length === 2) {
    [path, key] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, key] = args;
  }
  if (b8r.registered(name)) {
    const list = getByPath(b8r.get(name), path);
    const index = indexFromKey(list, key);
    if (Array.isArray(list) && index > -1) {
      list.splice(index, 1);
    } else {
      delete list[key];
    }
    _touchPath(name, path);
  }
};

b8r.listItems = element =>
  b8r.makeArray(element.children)
    .filter(elt => elt.matches('[data-list-instance]'));

b8r.listIndex = element =>
  b8r.listItems(element.parentElement).indexOf(element);

b8r.getComponentData = (elt, type) => {
  const id = getComponentId(elt, type);
  return id ? b8r.get(id) : null
};

b8r.setComponentData = (elt, path, value) => {
  const id = getComponentId(elt);
  b8r.setByPath(id, path, value);
};

b8r.getData = elt => {
  const dataPath = b8r.getDataPath(elt);
  return dataPath ? b8r.get(dataPath, elt) : null
};

b8r.getListInstance = elt => {
  const instancePath = b8r.getListInstancePath(elt);
  return instancePath ? b8r.get(instancePath, elt) : null
};

b8r.setListInstance = (elt, mutation) => {
  const instance = b8r.getListInstance(elt);
  const path = b8r.getListInstancePath(elt);
  const mutated = mutation(instance);
  b8r.set(path, mutated);
  b8r.find(`[data-list-instance="${path}"]`).forEach(b8r.touchElement);
};

b8r.getListTemplate = elt => {
  elt = elt.closest('[data-list-instance]');
  do {
    elt = elt.nextElementSibling;
  } while (!elt.matches('[data-list]'))
  return elt
};

if (document.body) {
  implicitEventTypes
    .forEach(type => document.body.addEventListener(type, handleEvent, true));
} else {
  document.addEventListener('DOMContentLoaded', () => {
    implicitEventTypes
      .forEach(type => document.body.addEventListener(type, handleEvent, true));
  });
}

const toTargets = _toTargets(b8r);

b8r.onAny(['change', 'input'], '_b8r_._update_');

b8r.interpolate = (template, elt) => {
  let formatted;
  if (template.match(/\$\{[^{]*?\}/)) {
    formatted = template;
    do {
      formatted = formatted.replace(/\$\{([^{]*?)\}/g, (_, path) => {
        const value = b8r.get(path, elt);
        return value !== null ? value : ''
      });
    } while (formatted.match(/\$\{[^{]*?\}/))
  } else {
    const paths = splitPaths(template);
    if (paths.indexOf('') > -1) {
      throw new Error(`empty path in binding ${template}`)
    }
    formatted = paths.map(path => b8r.get(path, elt));
    if (formatted.length === 1) {
      formatted = formatted[0];
    }
  }
  return formatted
};

const _unequal = (a, b) => (a !== b) || (a && typeof a === 'object');

function bind (element) {
  if (element.tagName.includes('-') && element.constructor === HTMLElement) {
    expectCustomElement(element.tagName);
    return // do not attempt to bind to custom components before they are defined
  }
  if (element.closest(UNREADY_SELECTOR)) {
    return
  }
  const bindings = getBindings(element);
  const boundValues = element._b8rBoundValues || (element._b8rBoundValues = {});
  const newValues = {};
  for (let i = 0; i < bindings.length; i++) {
    const { targets, path } = bindings[i];
    const value = b8r.interpolate(path, element);
    const existing = boundValues[path];
    if (_unequal(existing, value)) {
      newValues[path] = value;
      const _toTargets = targets.filter(t => toTargets[t.target]);
      if (_toTargets.length) {
        _toTargets.forEach(t => {
          toTargets[t.target](element, value, t.key);
        });
      } else {
        console.warn('unrecognized toTarget in binding', element, bindings[i]);
      }
    }
  }
  Object.assign(boundValues, newValues);
}
b8r.show = show;
b8r.hide = hide;

const forEachItemIn = (obj, idPath, func) => {
  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      const item = obj[i];
      func(item, idPath ? `${idPath}=${getByPath(item, idPath)}` : i);
    }
  } else if (obj.constructor === Object) {
    if (idPath) {
      throw new Error('id-path is not supported for objects bound as lists')
    }
    const keys = Object.keys(obj);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      func(obj[key], `=${key}`);
    }
  } else if (obj !== null) {
    throw new Error('can only bind Array and Object instances as lists')
  }
};

function bindList (listTemplate) {
  listTemplate.classList.add('-b8r-empty-list');
  if (
    !listTemplate.parentElement || // skip if disembodied
    listTemplate.parentElement.closest(UNREADY_SELECTOR)
  ) {
    return
  }
  const [sourcePath, idPath] = listTemplate.dataset.list.split(':');
  let methodPath, listPath, argPaths;
  try {
    // parse computed list method if any
    [, , methodPath, argPaths] =
      sourcePath.match(/^(([^()]*)\()?([^()]*)(\))?$/);
    argPaths = argPaths.split(',');
    listPath = argPaths[0];
  } catch (e) {
    console.error('bindList failed; bad source path', sourcePath);
  }
  const resolvedPath = b8r.resolvePath(listPath, listTemplate);
  // rewrite the binding if necessary (otherwise nested list updates fail)
  if (resolvedPath !== listPath) {
    let listBinding = listPath = resolvedPath;
    if (methodPath) {
      argPaths.shift();
      argPaths = [listPath, ...argPaths.map(path => b8r.resolvePath(path, listTemplate))];
      listBinding = `${methodPath}(${argPaths.join(',')})`;
    }
    listTemplate.dataset.list = idPath ? `${listBinding}:${idPath}` : listBinding;
  }
  let list = b8r.get(listPath);
  if (!list) {
    return
  }
  if (methodPath && !idPath) {
    throw new Error(`data-list="${listTemplate.dataset.list}" -- computed list requires id-path`)
  }
  // compute list
  if (methodPath) {
    if (!b8r.get(methodPath)) {
      // methodPath is not yet available; when it becomes available it will trigger
      // the binding so we can ignore it for now
      return
    }
    (() => {
      try {
        const args = argPaths.map(b8r.get);
        const filteredList = b8r.callMethod(methodPath, ...args, listTemplate);
        // debug warning for lists that get "filtered" into new objects
        if (
          Array.isArray(list) &&
          filteredList.length &&
          list.indexOf(filteredList[0]) === -1
        ) {
          console.warn(
            `list filter ${methodPath} returned a new object` +
            ' (not from original list); this will break updates!'
          );
        }
        list = filteredList;
      } catch (e) {
        console.error(`bindList failed, ${methodPath} threw error`, e);
      }
    })();
    if (!list) {
      throw new Error('could not compute list; async filtered list methods not supported (yet)')
    }
  }
  // assign unique ids if _auto_ id-path is specified
  if (idPath === '_auto_') {
    for (let i = 0; i < list.length; i++) {
      if (list[i]._auto_ === undefined) {
        list[i]._auto_ = unique$1();
      }
    }
  }

  b8r.show(listTemplate);
  // efficient list update:
  // if we have an idPath we grab existing instances, and re-use those with
  // matching ids
  const existingListInstances = listTemplate._b8rListInstances || {};
  const listInstances = listTemplate._b8rListInstances = {};

  const template = listTemplate.cloneNode(true);
  template.classList.remove('-b8r-empty-list');
  if (template.classList.length === 0) template.removeAttribute('class');
  delete template.dataset.list;

  /* Safari refuses to hide hidden options */
  if (listTemplate.tagName === 'OPTION') {
    listTemplate.setAttribute('disabled', '');
    listTemplate.textContent = '';
    template.removeAttribute('disabled');
  }

  let previousInstance = listTemplate;
  let instance;
  let listContentChanged = false;

  const ids = {};
  listTemplate.classList.toggle('-b8r-empty-list', !list.length);
  forEachItemIn(list, idPath, (item, id) => {
    if (ids[id]) {
      console.warn(`${id} not unique ${idPath} in ${listTemplate.dataset.list}`);
      return
    }
    ids[id] = true;
    const itemPath = `${listPath}[${id}]`;
    instance = existingListInstances[itemPath];
    if (instance === undefined) {
      listContentChanged = true;
      instance = template.cloneNode(true);
      instance.dataset.listInstance = itemPath;
      instance._b8rListInstance = item;
      listTemplate.parentElement.insertBefore(instance, previousInstance);
      resolveListInstanceBindings(instance, itemPath);
      b8r.bindAll(instance);
    } else {
      delete existingListInstances[itemPath];
      if (instance.nextSibling !== previousInstance) {
        listTemplate.parentElement.insertBefore(instance, previousInstance);
      }
    }
    listInstances[itemPath] = instance;
    previousInstance = instance;
  });
  b8r.forEachKey(existingListInstances, elt => {
    listContentChanged = true;
    elt.remove();
  });
  // for <select> elements and components whose possible values may be dictated by their children
  // we trigger a 'change' event in the parent element.
  if (listContentChanged) b8r.trigger('change', listTemplate.parentElement);
  b8r.hide(listTemplate);
}

b8r.bindAll = element => {
  loadAvailableComponents(element);
  findBindables(element).forEach(bind);
  findLists(element).forEach(bindList);
};

Object.assign(b8r, _ajax);
Object.assign(b8r, _sort);

b8r.onRequest(() => {
  if (b8r.registered('b8rRequestInFlight')) {
    b8r.set('b8rRequestInFlight', b8r.ajaxRequestsInFlight());
  } else {
    b8r.register('b8rRequestInFlight', b8r.ajaxRequestsInFlight());
  }
});

const _pathRelativeB8r = _path => {
  return !_path ? b8r : Object.assign({}, b8r, {
    _path,
    component: (...args) => {
      const pathIndex = args[1] ? 1 : 0;
      let url = args[pathIndex];
      if (url.indexOf('://') === -1) {
        url = `${_path}/${url}`;
        args[pathIndex] = url;
      }
      return b8r.component(...args)
    }
  })
};
Object.assign(b8r, { component, makeComponent, makeComponentNoEval });

b8r.components = () => Object.keys(components);

function loadAvailableComponents (element) {
  b8r.findWithin(element || document.body, UNLOADED_COMPONENT_SELECTOR, true)
    .forEach(target => {
      if (!target.closest('[data-list]')) {
        const name = target.tagName === 'B8R-COMPONENT'
          ? target.name
          : target.dataset.component;
        if (name) b8r.insertComponent(name, target);
      }
    });
}

b8r._DEPRECATED_COMPONENTS_PASS_DOWN_DATA = false;
const inheritData = element => {
  const reserved = ['destroy']; // reserved lifecycle methods
  const selector = b8r._DEPRECATED_COMPONENTS_PASS_DOWN_DATA
    ? '[data-path],[data-list-instance],[data-component-id]'
    : '[data-path],[data-list-instance]';
  const source = element.closest(selector);
  if (!source) {
    return null
  } else {
    const data = b8r.get(source.dataset.componentId || b8r.getDataPath(source));
    return b8r.filterObject(
      data || {},
      (v, k) => (!reserved.includes(k)) || typeof v !== 'function'
    )
  }
};

let componentCount = 0;
const _componentInstances = {};
b8r.insertComponent = async function (component, element, data) {
  if (!component) {
    throw new Error('insertComponent requires a component')
  }
  const dataPath = typeof data === 'string' ? data : b8r.getDataPath(element);
  if (!element) {
    element = b8r.create('div');
  } else if (!b8r.isInBody(element)) {
    return
  }
  if (typeof component === 'string') {
    if (!components[component]) {
      if (!componentTimeouts[component]) {
        // if this doesn't happen for five seconds, we have a problem
        componentTimeouts[component] = setTimeout(
          () => console.error('component timed out: ', component), 5000);
      }
      if (data) {
        saveDataForElement(element, data);
      }
      element.dataset.component = component;
      return
    }
    component = components[component];
  }
  const className = component.name + '-component';
  if (element.classList.contains(className)) return
  if (element.dataset.component) {
    delete element.dataset.component;
  }
  if (!data || dataPath) {
    data = dataForElement(element) || inheritData(element) || {};
  }
  if (element.parentElement === null) {
    document.body.appendChild(element);
  }
  const children = b8r.fragment();
  /*
    * if you're replacing a component, it should get the replaced component's children.
    * we probably want to be able to remove a component (i.e. pull out an instance's
      children and then delete element's contents, replace the children, and remove
      its id)
    * note that components with no DOM nodes present a problem since they may have
      passed-through child elements that aren't distinguishable from a component's
      original body
  */
  const componentId = 'c#' + component.name + '#' + (++componentCount);
  if (component.view.children.length) {
    if (element.dataset.componentId) {
      if (element.querySelector('[data-children]')) {
        b8r.moveChildren(element.querySelector('[data-children]'), children);
      } else {
        b8r.empty(element);
      }
    } else {
      b8r.moveChildren(element, children);
    }
    // [data-parent] supports DOM elements such as <tr> that can only "live" in a specific context
    const source = component.view.querySelector('[data-parent]') || component.view;
    b8r.copyChildren(source, element);
    replaceInBindings(element, '_component_', componentId);
    if (dataPath) {
      replaceInBindings(element, '_data_', dataPath);
    }
    const childrenDest = b8r.findOneWithin(element, '[data-children]');
    if (children.firstChild && childrenDest) {
      b8r.empty(childrenDest);
      b8r.moveChildren(children, childrenDest);
    }
  }
  b8r.makeArray(element.classList).forEach(c => {
    if (c.substr(-10) === '-component') {
      element.classList.remove(c);
    }
  });
  const get = path => b8r.getByPath(componentId, path);
  const set = (...args) => {
    b8r.setByPath(componentId, ...args);
    // updates value bindings
    if (args[0] === 'value' || Object.prototype.hasOwnProperty.call(args[0], 'value')) {
      b8r.trigger('change', element);
    }
  };
  const register = componentData => {
    console.warn('use of register withi components is deprecated, use set() instead');
    set(componentData);
  };
  const touch = path => _touchPath(componentId, path);
  const on = (...args) => b8r.on(element, ...args);
  const find = selector => b8r.findWithin(element, selector);
  const findOne = selector => b8r.findOneWithin(element, selector);
  const initialValue = typeof component.initialValue === 'function'
    ? await component.initialValue({ b8r, get, set, touch, on, component: element, findOne, find })
    : b8r.deepClone(component.initialValue) || data;
  data = {
    ...(component.type ? b8r.deepClone(component.type) : {}),
    ...initialValue,
    dataPath,
    componentId
  };
  b8r.register(componentId, data, true);
  element.classList.add(className);
  element.dataset.componentId = componentId;
  _componentInstances[componentId] = element;
  if (component.load) {
    try {
      await component.load(
        element, _pathRelativeB8r(component.path), find, findOne,
        b8r.reg[componentId], register, get, set, on, touch, component
      );
    } catch (e) {
      debugger // eslint-disable-line no-debugger
      console.error('component', component.name, 'failed to load', e);
    }
  }
  b8r.bindAll(element);
};

b8r.Component = b8r.webComponents.makeWebComponent('b8r-component', {
  attributes: {
    name: '',
    path: ''
  },
  content: false,
  props: {
    componentId () {
      return this.dataset.componentId
    },
    value (x) {
      if (x === undefined) {
        return this.state.value
      } else {
        if (this.state.value !== undefined) {
          this.state.value = x;
        }
      }
    },
    data () {
      return b8r.reg[this.dataset.componentId]
    }
  },
  methods: {
    connectedCallback () {
      const { path } = this;
      if (path) {
        if (!this.name) this.name = path.split('/').pop().split('.').shift();
        b8r.component(this.name, path);
      }
    },
    get (path = '.') {
      return b8r.getByPath(this.componentId)
    },
    set (...args) {
      b8r.setByPath(this.componentId, ...args);
    },
    render () {
      if (!this.isConnected) return
      const unready = this.parentElement && this.parentElement.closest(UNREADY_SELECTOR);
      if (unready) return
      if (this.name) {
        b8r.insertComponent(this.name, this);
      } else {
        b8r.removeComponent(this);
      }
    }
  }
});

b8r.wrapWithComponent = (component, element, data, attributes) => {
  const wrapper = b8r.create('div');
  if (attributes) {
    b8r.forEachKey(attributes, (val, prop) => wrapper.setAttribute(prop, val));
  }
  b8r.wrap(element, wrapper);
  b8r.insertComponent(component, wrapper, data);
  return wrapper
};

b8r.removeComponent = elt => {
  if (elt.dataset.componentId) {
    delete elt.dataset.componentId;
    b8r.makeArray(elt.classList).forEach(c => {
      if (/-component$/.test(c)) {
        elt.classList.remove(c);
        b8r.empty(elt);
      }
    });
    b8r.cleanupComponentInstances();
  }
};

b8r.componentOnce = async (...args) => {
  const c = await b8r.component(...args);
  if (!b8r.findOne(`[data-component-id*="${c.name}"]`)) {
    await b8r.insertComponent(c);
  }
};

Object.freeze(b8r);

module.exports = b8r;
