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
}, 'item inserted at id_path must satisfy it').shouldBe(1);
~~~~
*/

// unique tokens passed to set by path to delete or create properties
const _delete_ = {};
const _new_object_ = {};

function pathSplit(full_path) {
  const [, model,, start, path] = full_path.match(/^(.*?)(([\.\[])(.*))?$/);
  return [model, start === '[' ? '[' + path : path];
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

function buildKeypathValueMap(array, key_path) {
  if (! array._b8r_value_maps) {
    // hide the map of maps in a closure that is returned by a computed property so that
    // the source objects are not "polluted" upon serialization
    const maps = {};
    Object.defineProperty(array, '_b8r_value_maps', {get: () => maps});
  }
  const map = {};
  array.forEach((item, idx) => map[getByPath(item, key_path) + ''] = idx);
  array._b8r_value_maps[key_path] = map;

  return map;
}

function getKeypathMap (array, key_path) {
  if (! array._b8r_value_maps || ! array._b8r_value_maps[key_path]) {
    return buildKeypathValueMap(array, key_path);
  } else {
    return array._b8r_value_maps[key_path];
  }
}

function keyToIndex (array, key_path, key_value) {
  let idx = getKeypathMap(array, key_path)[key_value];
  if (idx === undefined || getByPath(array[idx], key_path) + '' !== key_value + '') {
    idx = buildKeypathValueMap(array, key_path)[key_value];
  }
  return idx;
}

function byKey(obj, key, value_to_insert) {
  if (!obj[key]) {
    obj[key] = value_to_insert;
  }
  return obj[key];
}

function byKeyPath(array, key_path, key_value, value_to_insert) {
  let idx = key_path ? keyToIndex(array, key_path, key_value) : key_value;
  if (value_to_insert === _delete_) {
    if (!key_path) {
      delete array[idx];
    } else {
      array.splice(idx, 1);
    }
    return null;
  } else if (value_to_insert === _new_object_) {
    if (!key_path && !array[idx]) {
      array[idx] = {};
    }
  } else if (value_to_insert) {
    if (idx !== undefined) {
      array[idx] = matchTypes(value_to_insert, array[idx]);
    } else if (key_path && getByPath(value_to_insert, key_path) + '' === key_value + '') {
      array.push(value_to_insert);
      idx = array.length - 1;
    } else {
      throw `byKeyPath insert failed at [${key_path}=${key_value}]`;
    }
  }
  return array[idx];
}

function expectArray (obj) {
  if (!Array.isArray(obj)) {
    console.error('setByPath failed: expected array, found', obj);
    throw 'setByPath failed: expected array';
  }
}

function expectObject (obj) {
  if (!obj || obj.constructor !== Object) {
    console.error('setByPath failed: expected Object, found', obj);
    throw 'setByPath failed: expected object';
  }
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
        if (part[0] === '=') {
          found = found[part.substr(1)];
        } else {
          found = undefined;
        }
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

function setByPath(orig, path, val) {
  let obj = orig;
  const parts = pathParts(path);

  while (obj && parts.length) {
    const part = parts.shift();
    if (typeof part === 'string') {
      const equals_offset = part.indexOf('=');
      if (equals_offset > -1) {
        if (equals_offset === 0) {
          expectObject(obj);
        } else {
          expectArray(obj);
        }
        const key_path = part.substr(0, equals_offset);
        const key_value = part.substr(equals_offset + 1);
        obj = byKeyPath(obj, key_path, key_value, parts.length ? _new_object_ : val);
        if (!parts.length) {
          return true;
        }
      } else {
        expectArray(obj);
        const idx = parseInt(part, 10);
        if (parts.length) {
          obj = obj[idx];
        } else {
          if (val !== _delete_) {
            obj[idx] = matchTypes(val, obj[idx]);
          } else {
            obj.splice(idx, 1);
          }
          return true;
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
  console.error(`setByPath failed: "${path}" not found in`, orig);
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
    console.warn('setByPath replaced', oldValue, 'with', value);
  }
  return value;
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
      break;
    }
  }
};

const last = array => array.length ? array[array.length - 1] : null;

const forEachKey = (object, method) => {
  const keys = Object.keys(object);
  for (const key of keys) if (method(object[key], key) === false) break;
};

const mapKeys = (object, method) => {
  const keys = Object.keys(object);
  const map = [];
  for (const key of keys) map.push(method(object[key], key));
  return map;
};

const mapEachKey = (object, method) => {
  const keys = Object.keys(object);
  const map = {};
  for (const key of keys) map[key] = method(object[key], key);
  return map;
};

const findKey = (object, test) => {
  const keys = Object.keys(object);
  for(const key of keys) if (test(object[key], key)) return key;
  return null;
};

const findValue = (object, test) => {
  const key = findKey(object, test);
  return key ? object[key] : null;
};

const filterInPlace = (list, test) => {
  for(let i = list.length - 1; i >= 0; i--) {
    if (! test(list[i], i)) list.splice(i, 1);
  }
};

const filterKeys = (object, test) => {
  const keys = Object.keys(object);
  const filtered = [];
  for(const key of keys) if (test(object[key], key)) filtered.push(key);
  return filtered;
};

const filterObject = (object, test) => {
  const keys = Object.keys(object);
  const filtered = {};
  for(const key of keys) if (test(object[key], key)) filtered[key] = object[key];
  return filtered;
};

const filterObjectInPlace = (object, test) => {
  const keys = Object.keys(object);
  for(const key of keys) if (! test(object[key], key)) delete object[key];
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
  return object;
};

var _iterators = /*#__PURE__*/Object.freeze({
  makeArray: makeArray,
  last: last,
  forEach: forEach,
  forEachKey: forEachKey,
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

    findWithin(element, selector, include_self);

element.querySelectorAll(selector) converted to a true array

    findOneWithin(element, selector, include_self);

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

    within(element, mouse_event);
    within(element, mouse_event, margin); // true | false

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

    unwrap(element [, wrapper_selector]);

unwraps the element of its immediate parent or its closest `wrapper_selector` if provided.

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

const isVisible = (element, include_parents) => element &&
  getComputedStyle(element).display !== 'none' &&
  ((! include_parents) || element === document.body || isVisible(element.parentElement, true));

const isInView = (element, view) => {
  if (! element || ! isVisible(element, true)) {
    return false;
  }
  const r = element.getBoundingClientRect();
  const s = view ? view.getBoundingClientRect()
                 : {left: 0, top: 0, width: window.innerWidth, height: window.innerHeight};
  return rectsOverlap(r, s);
};

const rectsOverlap = (r, s) => ! (
                                 r.top > s.top + s.height ||
                                 r.top + r.height < s.top ||
                                 r.left > s.left + s.width ||
                                 r.left + r.width < s.left
                               );

const find = selector => makeArray(document.querySelectorAll(selector));

const findOne = document.querySelector.bind(document);

const findWithin = (element, selector, include_self) => {
  const list = makeArray(element.querySelectorAll(selector));
  if (include_self && element.matches(selector)) {
    list.unshift(element);
  }
  return list;
};

const findOneWithin = (element, selector, include_self) =>
  include_self &&
  element.matches(selector) ? element : element.querySelector(selector);

const succeeding = (element, selector) => {
  while(element.nextElementSibling && !element.nextElementSibling.matches(selector)){
    element = element.nextElementSibling;
  }
  return element.nextElementSibling;
};

const preceding = (element, selector) => {
  while(element.previousElementSibling && !element.previousElementSibling.matches(selector)){
    element = element.previousElementSibling;
  }
  return element.previousElementSibling;
};

const findAbove = (elt, selector, until_elt, include_self) => {
  let current_elt = include_self ? elt : elt.parentElement;
  const found = [];
  while(current_elt) {
    if (current_elt === document.body) {
      break;
    }
    if (typeof until_elt === 'string' && current_elt.matches(until_elt)) {
      break;
    } else if (current_elt === until_elt) {
      break;
    }
    if(current_elt.matches(selector)) {
      found.push(current_elt);
    }
    current_elt = current_elt.parentElement;
  }
  return found;
};

const id = document.getElementById.bind(document);

const text = document.createTextNode.bind(document);

const fragment = document.createDocumentFragment.bind(document);

const create = document.createElement.bind(document);

const classes = (element, settings) => {
  forEachKey(settings, (on_off, class_name) => {
    if (on_off) {
      element.classList.add(class_name);
    } else {
      element.classList.remove(class_name);
    }
  });
};

const styles = (element, settings) => {
  forEachKey(settings, (value, key) => element.style[key] = value);
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

const wrap = (element, wrapping_element, dest_selector) => {
  try {
    const parent = element.parentElement;
    const destination = dest_selector ? wrapping_element.querySelector(dest_selector) : wrapping_element;
    parent.insertBefore(wrapping_element, element);
    destination.appendChild(element);
  } catch(e) {
    throw 'wrap failed';
  }
};

const unwrap = (element, wrapper_selector) => {
  try {
    const wrapper = wrapper_selector ? element.closest(wrapper_selector) : element.parentElement;
    const parent = wrapper.parentElement;
    parent.insertBefore(element, wrapper);
    wrapper.remove();
  } catch(e) {
    throw 'unwrap failed';
  }
};

const within = (element, mouse_event, margin) => {
  const r = element.getBoundingClientRect();
  const {clientX, clientY} = mouse_event;
  return (
    clientX + margin > r.left &&
    clientX - margin < r.right &&
    clientY + margin > r.top &&
    clientY - margin < r.bottom
  );
};

const isInBody = (element) => element && document.body.contains(element);

const cssVar = (name, value) => {
  if (value === undefined) {
    const htmlStyles = getComputedStyle(document.querySelector('html'));
    return htmlStyles.getPropertyValue(name);
  } else {
    document.querySelector('html').style.setProperty(name, value);
  }
};

var _dom = /*#__PURE__*/Object.freeze({
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
  cssVar: cssVar
});

/**
# Performance

Simple tools for logging performance.

To log a single event:

    log(log_name, log_entry_name);

To time an event:

    logStart(log_name, log_entry_name);
    ... do stuff
    logEnd(log_name, log_entry_name);

The log entry name need not be unique, but it should be consistent.

To look at results:

    showLogs(); // => list of available logs
    showLogs(log_name); // => shows log as a table in console
    showLogs(log_name, minimum_total_ms); // => shows log filtered

Each log entry will be displayed with a minimum, maximum, and median
time value.

## Methods

    log (log-name, entry-name);
    ...
    logEnd(log-name, entry-name);

This logs the execution time within table `log-name` in row `log-end`.

    elementSignature(element);

This tries to identify an element sufficiently for perf analysis. If the
element has classes, it uses those, otherwise it tries to identify the
element based on its position in a hierarchy.

    showLogs(); // lists perf tables in console
    showLogs(which-log); // shows table `which-log` in console and returns it
    showLogs(which-log, threshold); // as above but filters out rows where the
                                    // worst instance is over the threshold

## Example

    log('bindAll', elementSignature(element));
    ...
    logEnd('bindAll', elementSignature(element));

or (in case the intervening code changes the element signature):

    const logArgs = ['bindAll', elementSignature(element)];
    log(...logArgs);
    ...
    logEnd(...logArgs);

*/

const logs = []; // {name, total_time, entries: [{name,count, times, total_time}]}

const medianOfSortedArray = values =>
    (values[Math.floor(values.length / 2)] +
     values[Math.floor(values.length / 2 - 0.5)]) /
    2;

var _perf = {
  log: (log_name, entry_name, truncate_logs=false) => {
    let log = logs.find(log => log.name === log_name);
    if (!log) {
      log = {name: log_name, total_time: 0, entries: []};
      logs.push(log);
    }
    let entry = log.entries.find(entry => entry.name === entry_name);
    if (!entry) {
      entry = {name: entry_name, count: 0, times: [], total_time: 0, starts: []};
      log.entries.push(entry);
    }

    if (truncate_logs && log.entries.length > 200) {
      console.log('truncating log entries for', log_name);
      log.entries.splice(log.entries.length - 100);
    }
    return entry;
  },

  logStart: (log_name, entry_name) => {
    const entry = perf.log(log_name, entry_name);
    entry.count += 1;
    entry.starts.push(performance.now());
  },

  logEnd: (log_name, entry_name) => {
    const entry = perf.log(log_name, entry_name, true);
    const start = entry.starts.pop();
    const log = logs.find(log => log.name === log_name);
    if (start === undefined) {
      console.error('logEnd without corresponding logStart', log_name, entry_name, entry);
    }
    const elapsed = performance.now() - start;
    log.total_time += elapsed;
    entry.total_time += elapsed;
    entry.times.push(elapsed);
  },

  elementSignature: element => {
    let signature = element.tagName;
    if (element.classList.value) {
      signature += '.' + element.classList.value.split(' ').join('.');
    } else if (element.parentElement) {
      signature = perf.elementSignature(element.parentElement) + '>' + signature;
    }
    return signature;
  },

  showLogs: (which, threshold) => {
    if (which) {
      const log = logs.find(log => log.name === which);
      var mapped = log.entries.map(entry => {
        const {name, count, times, total_time} = entry;
        var best, worst, median;
        if (times.length) {
          const sorted = times.sort((a, b) => a - b);
          best = sorted[0];
          worst = sorted[sorted.length - 1];
          median = medianOfSortedArray(sorted);
        } else {
          best = worst = median = '';
        }
        return {name, count, best, median, worst, total_time};
      });
      if (threshold) {
        mapped = mapped.filter(mapped => mapped.worst > threshold);
      }
      console.table(mapped, ['name', 'count', 'best', 'median', 'worst', 'total_time']);
      return mapped;
    } else {
      console.table(logs, ['name', 'total_time']);
      return logs;
    }
  },
};

/**
# dispatch

    dispatch('click', target, ...args);

Synthesizes a native event. Don't use it for custom events. Use `trigger` instead.
*/

const dispatch = (type, target, ...args) => {
  const event = new Event(type);
  event.args = args;
  target.dispatchEvent(event);
  if (event.target !== target) {
    // in some cases dispatchEvent will fail to set an event's target property (!)
    return {type, target, args};
  } else {
    return event;
  }
};

/**
# Async Update Queue

When data changes "out of b8r's sight" you may need to inform b8r of the change so it can
make appropriate changes to the DOM.

    touchByPath('path.to.data'); // tells b8r to update anything bound to that path
    touchByPath('path.to.data', source_element); // as above, but exclude source_element
    touchElement(element); // tell b8r the element in question needs updating
    touchByPath('path.to.list[id=abcd]'); // updates the specified list
    touchByPath('path.to.list[id=abcd].bar.baz'); // updates the underlying list

If you want to precisely update a list item without updating the list it belongs to,
the simplest option is to `b8r.bindAll` the list element or `touchElement` the list element.
This is a tradeoff of worst-case performance (lots of updates to a list) against best-case
performance (a simple update to one item of a list).

All of these updates are asynchronous, so the DOM won't actually change immediately. If you do
want the DOM to change immediately:

    b8r.force_update(); // flushes all queued updates to the DOM synchronously

If you'd prefer to wait for the update(s) to complete and then do something, you can
pass a callback to `after_update`:

    after_update(() => { ... }); // does stuff after force_update fires

after_update fires immediately (and synchronously) if there are no pending updates.
*/
let _update_frame = null;
const _update_list = [];
const _after_update_callbacks = [];
let _force_update = () => {};

const requestAnimationFrameWithTimeout = callback => {
  let done = false;
  const finishIt = () => {
    done || callback();
    done = true;
  };
  requestAnimationFrame(finishIt);
  setTimeout(finishIt, 20);
  return {cancel: () => done=true};
};

const get_update_list = () => {
  if (_update_frame) {
    _update_frame.cancel();
    _update_frame = null;
    return _update_list.splice(0);
  } else {
    if (_update_list.length) {
      throw '_update_list is not empty but no _update_frame set';
    }
    return false;
  }
};

const _after_update = () => {
  while(_after_update_callbacks.length) {
    let fn;
    try {
      fn = _after_update_callbacks.shift();
      fn();
    } catch(e) {
      console.error('_after_update_callback error', e, fn);
    }
  }
};

const async_update = (path, source) => {
  const item = path ?
               _update_list.find(item => path.startsWith(item.path)) :
               _update_list.find(item => (! item.path) && item.source && item.source === source);
  if (! item) {
    if (!_update_frame) {
      _update_frame = requestAnimationFrameWithTimeout(_force_update);
    }
    _update_list.push({ path, source });
  } else if (path) {
    // if the path was already marked for update, then the new source element is (now) correct
    item.source = source;
  }
};

const after_update = callback => {
  if (_update_list.length) {
    if (_after_update_callbacks.indexOf(callback) === -1) {
      _after_update_callbacks.push(callback);
    }
  } else {
    callback();
  }
};

const touchElement = element => async_update(false, element);

const touchByPath = (...args) => {
  let full_path, source_element, name, path;

  if (args[1] instanceof HTMLElement) {
    [full_path, source_element] = args;
  } else {
    [name, path, source_element] = args;
    full_path = !path || path === '/' ? name : name + (path[0] !== '[' ? '.' : '') + path;
  }

  async_update(full_path, source_element);
};

const _set_force_update = (fn) => _force_update = fn;

/**
# Data Bindings

Data binding is implemented via the `data-bind` and `data-list` attributes. Bindings tie
[registered data](#source=source/b8r.registry.js) to and from view (DOM) elements.

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

    b8r.bindAll(target, 'path.to.data'); // as above, but uses path for dynamic bindings

Or:

    b8r.bindList(target, 'path.to.list'); // as above, but uses path for dynamic bindings

Note (FIXME): bindAll only applies its path to components and lists; it doesn't do it to
individual elements, which it probably should.

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
<span data-bind=
  "
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
*id path* for list binding.

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
    Promise.resolve().then(function () { return b8r$2; }).then(b8r => {
      delete element._b8r_boundValues;
      touchElement(element);
    });
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
    delete element._b8r_boundValues;
  }
};

const parseBinding = binding => {
  if (!binding.trim()) {
    throw 'empty binding';
  }
  if (binding.indexOf('=') === -1) {
    throw 'binding is missing = sign; probably need a source or target';
  }
  const [, targets_raw, path] =
      binding.trim().match(/^([^=]*)=([^;]*)$/m).map(s => s.trim());
  const targets = targets_raw.split(',').map(target => {
    var parts = target.match(/(\w+)(\(([^)]+)\))?/);
    if (!parts) {
      console.error('bad target', target, 'in binding', binding);
      return;
    }
    return parts ? {target: parts[1], key: parts[3]} : null;
  });
  if (!path) {
    console.error('binding does not specify source', binding);
  }
  return {targets, path};
};

/**
    splitPaths('foo.bar.baz,foo[id=17].bar.baz,path.to.method(foo.bar,foo[id=17].baz)');
      // returns ['foo.bar.baz', 'foo[id=17].bar.baz', 'path.to.method(foo.bar,foo[id=17].baz)']

splitPaths is used to prise apart data-paths in bindings.
~~~~
const {splitPaths} = await import('../source/b8r.bindings.js');

Test(() => splitPaths('foo.bar')).shouldBeJSON(["foo.bar"]);
Test(() => splitPaths('foo,bar,baz')).shouldBeJSON(["foo", "bar", "baz"]);
Test(() => splitPaths('foo.bar,foo[path.to.id=this is not a test],path.to.method(foo.bar[id=17])')).
  shouldBeJSON(["foo.bar", "foo[path.to.id=this is not a test]", "path.to.method(foo.bar[id=17])"]);
Test(() => splitPaths('path.to.value,path.to[id=17].value,path.to.method(path.to.value,path[11].to.value)')).
  shouldBeJSON(["path.to.value", "path.to[id=17].value", "path.to.method(path.to.value,path[11].to.value)"]);
Test(() => splitPaths('path.to.method(path.to.value,path[11].to.value),path.to.value,path.to[id=17].value')).
  shouldBeJSON(["path.to.method(path.to.value,path[11].to.value)", "path.to.value", "path.to[id=17].value"]);
~~~~
*/
const splitPaths = paths => paths.match(/(([^,(]+\([^)]+\))|([^,()]+))/g);

const findBindables = element => findWithin(element, '[data-bind]', true);

const findLists = element => findWithin(element, '[data-list]', true);

const getBindings = element => {
  return element.dataset.bind.split(';')
                             .filter(s => !!s.trim())
                             .map(parseBinding);
};

const getDataPath = element => {
  const data_parent = element ? element.closest('[data-path],[data-list-instance]') : false;
  const path = data_parent ? (data_parent.dataset.path || data_parent.dataset.listInstance) : '';
  return ['.', '['].indexOf(path[0]) === -1 ? path : getDataPath(data_parent.parentElement) + path;
};

const getListInstancePath = element => {
  const component = element.closest('[data-list-instance]');
  return component ? component.dataset.listInstance : null;
};

const getComponentId = (element, type) => {
  if (type) {
    element = element.closest(`.${type}-component`);
  }
  const component = element.closest('[data-component-id]');
  return component ? component.dataset.componentId : null;
};

const replaceInBindings = (element, needle, replacement) => {
  const needle_regexp = new RegExp(needle, 'g');
  findWithin(element, `[data-bind*="${needle}"],[data-list*="${needle}"],[data-path*="${needle}"]`).
  forEach(elt => {
    ['data-bind', 'data-list', 'data-path'].forEach(attr => {
      const val = elt.getAttribute(attr);
      if (val) {
        elt.setAttribute(attr, val.replace(needle_regexp, replacement));
      }
    });
  });
};

const resolveListInstanceBindings = (instance_elt, instance_path) => {
  findWithin(instance_elt, '[data-bind]', true).
  filter(elt => !elt.closest('[data-list]')).
  forEach(elt => {
    const binding_source = elt.dataset.bind;
    if (binding_source.indexOf('=.') > -1) {
      elt.dataset.bind = binding_source.
                         replace(/\=\.([^;\s]+)/g, `=${instance_path}.$1`).
                         replace(/\=\./g, `=${instance_path}`);
    }
    if (binding_source.indexOf('${.') > -1) {
      elt.dataset.bind = binding_source.
                         replace(/\$\{(\.[^\}]+)\}/g, '${' + instance_path + '$1}');
    }
  });
};

/**
# The Registry

Bindinator is built around the idea of registering objects under unique names
and binding events and element properties to paths based on those names.

b8r's registry is an observable object that b8r uses to keep track of objects.
Once an object is registered, its properties will automatically be bound
to events and DOM properties by path.

Both of these lines register an object under the name 'root'

    register('root', object_value);
    set('root', object_value);

You can set values deep inside objects using `paths`:

    set('root.path.to.value', new_value); // sets the value

You can set the registry's properties by path. Root level properties must
themselves be objects.

    get('root.path.to.value'); // gets the value

You can get a property by path.

    b8r.remove("name-of-registry-item"); // removes a registered object
    b8r.remove("path.to.value"); // removes a value at path

Remove a registered (named) object. deregister also removes component instance objects
for components no longer in the DOM.

## Calling functions in the registry

    call('root.path.to.method', ...args); // returns value as appropriate

You can call a method by path.

## Triggering Updates

Normally, if you bind something to a path it will automatically receive its values
when the root object is registered. If the object is changed by the user (vs. code)
then the registry should automatically be updated and propagate the changes to other bound objects.
If you set a value by path, it should automatically propagate the changes.

But, there will be times when you need to change values directly and notify the registry
afterwards.

    touch(path [, source_element]);

Triggers all observers as though the value at path has changed. Useful
if you change a property independently of the registry.

    touch(path);

Triggers all observers asynchronousely (on requestAnimationFrame).

## JSON Utilities

Two convenience methods are provided for working with JSON data:

    getJSON('path.to.value' [, element]);
    setJSON('path.to.value', json_string);

    isValidPath(path);

`isValidPath` returns true if the path looks OK, false otherwise.

~~~~
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
> Having gained experience with the framework, I am doubling down
> on object paths and simplifying the API in favor of:
> <pre>
> b8r.get('path.to.value');
> b8r.set('path.to.value', new_value);
> </pre>
> The older APIs (setByPath, etc.) will ultimately be deprecated. Even now they
> are little more than wrappers for set/get. See the *Registry* docs.

*/
const registry = {};
const listeners = [];  // { path_string_or_test, callback }
const valid_path = /^\.?([^.[\](),])+(\.[^.[\](),]+|\[\d+\]|\[[^=[\](),]*\=[^[\]()]+\])*$/;

const isValidPath = path => valid_path.test(path);

class Listener {
  constructor(test, callback) {
    this._orig_test = test; // keep it around for unobserve
    if (typeof test === 'string') {
      this.test = t =>
          t.length >= test.length && test === t.substr(0, test.length);
    } else if (test instanceof RegExp) {
      this.test = test.test.bind(test);
    } else if (test instanceof Function) {
      this.test = test;
    } else {
      throw 'expect listener test to be a string, RegExp, or test function';
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
      throw 'expect callback to be a path or function';
    }
    listeners.push(this);
  }
}

const resolvePath = (path, element) => {
  if (path[0] === '.') {
    if (!element) {
      throw 'cannot evaluate relative path without element';
    }
    path = getDataPath(element) + path;
  } else if (path.substr(0, 6) === '_data_') {
    if (!element) {
      throw 'cannot evaluate _data_ path without element';
    }
    path = getDataPath(element) + path.substr(6);
  } else if (path.substr(0, 11) === '_component_') {
    if (!element) {
      throw 'cannot evaluate _component_ path without element';
    }
    path = getComponentId(element) + path.substr(11);
  }
  return path;
};

const _compute = (expression_path, element) => {
  const [,method_path, value_paths] = expression_path.match(/([^(]+)\(([^)]+)\)/);
  return value_paths.indexOf(',') === -1 ?
         call(method_path, get(value_paths, element)) :
         call(method_path, ...get(value_paths, element));
};

const _get = (path, element) => {
  if (path.substr(-1) === ')') {
    return _compute(path, element);
  } else if (path.startsWith('.')) {
    const elt = element.closest('[data-list-instance]');
    return elt ? getByPath(elt._b8r_listInstance, path.substr(1)) : undefined;
  } else {
    path = resolvePath(path, element);
    if (! isValidPath(path)) {
      console.error(`getting invalid path ${path}`);
    } else {
      return getByPath(registry, path);
    }
  }
};

/**
## Computed Properties, b8r-style

Computed properties are a newish feature in Javascript, but for various reasons they don't play
well with b8r.

First, `b8r.set('foo', bar)` is implemented as:

    registry.foo = Object.assign(bar, Object.assign({}, registry.foo, bar));

It's possible this can be improved, but it's not for no reason.

Second, there's no obvious way for b8r to "know" when something changes that would change
the evaluation of a computed property. For example:

    const foo = {
      a: Math.PI,
      get bar() { return this.a; }
    };
    register('foo', foo);
    set('foo.a', 17); // how does b8r know to update something bound to foo.bar?

Also note that if we naively do something like:

    set('foo.b', 17); // we've killed it!

You can immunize yourself from the latter by (for example) putting in an explicit
set method:

    const foo = {
      a: Math.PI,
      get bar() { return this.a; },
      set bar(_) { console.error('bar is read only') }
    };

But that won't save you from lots of problems, notably foo being deep in the
hierarchy of a shallow-cloned object.

To solve this, b8r's path-bindings have been made *slightly* more powerful.

Originally, b8r supported binding to a simple path like this:

    <div data-bind="text=path.to.text">I will be replaced!</div>

You can put a method on the left-side of a binding using the method() binding:

    <div data-bind="method(path.to.method)=path.to.text">Who knows?!</div>

This is actually enough to do everything we want, but there are some downsides.

First, the syntax sucks. (And it will be improved!)

Second, it makes the simple case more complex (e.g. in this case not only does the method need
to know what to do with the text but it also needs to modify the DOM directly; aside from the
extra work, who knows what whacky edge-cases the underlying `text` toTarget handles which the
method won't.) More code, more work, more bugs.

So instead let's suppose we `register` a controller object of some kind:

    b8r.register('text-controller', {
      decode: text => decodeURIComponent(text),
    });

We can now write:

    <div data-bind="text=text-controller.decode(path.to.text)">I will be replaced!</div>

OK, so let's look at a more concrete and realistic example. Suppose you have a giant message
list that is constantly being updated. So initially you do something like:

    b8r.json('messages').then(data => b8r.register('messages'));

Except you have some extra properties you need to synthesize. E.g. you might want to dim the
messages of a user who is offline, and the user is off in the users list:

    b8r.json('users').then(data => b8r.register('users'));

### Without computed properties

You might end up doing something like this:

    b8r.json('messages').then(messages => {
      messages.forEach(message => {
        message._user_online = b8r.get(`users[id=${message.user}].online`);
      });
    });

Also, if you receive a new/updated message you'll need to set the value (and do it via
'set' so that if the message is already in the DOM it gets updated properly), e.g.

    socket.on('message', message => {
      message._user_online = b8r.get(`users[id=${message.user}].online`);
      b8r.set(`messages[id=${message.id}]`, message);
    });

Oh, and if a user's online status changes you need to remember to update all the messages.

Note that the property name has a leading underscore because we're using some kind of
convention to make locally added properties look different from stuff we got from the server
(e.g. in case we want to mutate them back to the server and strip the crap out first).

And the binding looks like this:

    <div class="message" data-bind="class(online)=._user_online">...

### With computed properties

Although you don't need to perform calculations on every message you receive, you do need to
"decorate" every message:

    const message_decorator = message => {
      Object.defineProperty(
        message,
        '_user_online',
        { get: function() { return b8r.get(`users[id=${this.user}].online`) } }
      );
      return message;
    };

    b8r.json('messages').then(messages => {
      b8r.register('messages', messages.map(message_decorator));
    });

    socket.on('message', message => {
      b8r.set(`messages[id=${message.id}]`, message_decorator(message));
    });

And again, you'll need to do this when you get new messages (but not necessarily
when you update existing messages, modulo the b8r issue mentioned at the outset).

Also, you need to deal with the user list being updated just as before.

And we still need to know how to strip out crap before sending it back to the server because
the computed property looks like a property on first inspection (and after `JSON.stringify`).

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

  b8r.after_update(() => {
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
~~~~
*/

const get = (path, element) => {
  const paths = splitPaths(path);
  return paths.length === 1 ?
         _get(paths[0], element) :
         paths.map(path => _get(path, element));
};

const getJSON = (path, element, pretty) => {
  const obj = get(path, element);
  const objects = [];
  const replacer = (key, value) => {
    if (!value || typeof value !== 'object') {
      return value;
    } else if (typeof value === 'object') {
      if (value.constructor !== Object && value.constructor !== Array) {
        return `[${value.constructor.name}]`;
      } else if (objects.indexOf(value) === -1) {
        objects.push(value);
        return value;
      } else {
        return '[duplicate or circular reference]';
      }
    }
  };
  return JSON.stringify(obj, replacer, pretty ? 2 : 0);
};

const touch = (path, source_element) => {
  listeners.filter(listener => listener.test(path))
           .forEach(listener => listener.callback(path, source_element));
};

const set = (path, value, source_element) => {
  if (! isValidPath(path)) {
    console.error(`setting invalid path ${path}`);
  }
  const path_parts = path.split(/\.|\[/);
  const model = path_parts[0];
  const existing = getByPath(registry, path);
  if (path_parts.length > 1 && !registry[model]) {
    console.error(`cannot set ${path} to ${value}, ${model} does not exist`);
  } else if (path_parts.length === 1 && typeof value !== 'object') {
    throw `cannot set ${path}; you can only register objects at root-level`;
  } else if (value === existing) {
    // if it's an array then it might have gained or lost elements
    if (Array.isArray(value) || Array.isArray(existing)) {
      touch(path, source_element);
    }
  } else if (value && value.constructor) {
    if (path_parts.length === 1 && ! registry[path]) {
      register(path, value);
    } else {
      // we only overlay vanilla objects, not custom classes or arrays
      if (value.constructor === Object && existing && existing.constructor === Object) {
        // we want the final object to be a reference to value (not existing)
        // but
        // - we don’t want to lose values in existing that aren’t in value
        // - we don’t want to damage the original object in case other references exist
        setByPath(registry, path, Object.assign(value, Object.assign({}, existing, value)));
      } else {
        setByPath(registry, path, value);
      }
      touch(path, source_element);
    }
  } else {
    setByPath(registry, path, value);
    touch(path, source_element);
  }
  return value; // convenient for things push (see below) but maybe an anti-feature?!
};

const _register = (name, obj) => {
  registry[name] = obj;
};

const register = (name, obj, block_updates) => {
  if (name.match(/^_[^_]*_$/)) {
    throw 'cannot register object as ' + name +
      ', all names starting and ending with a single \'_\' are reserved.';
  }

  _register(name, obj, block_updates);

  if (!block_updates) {
    touch(name);
    Promise.resolve().then(function () { return b8r_events; }).then(({play_saved_messages}) => play_saved_messages(name));
  }
};

const setJSON = (path, value) => set(path, JSON.parse(value));

/**
    push('path.to.array', item [, callback]);

To add an item to an array (and trigger the expected UI updates) simply push the
item to the path. `callback`, if provided, will be passed the list with its new addition
(useful for sorting, for example).

    unshift('path.to.array', item);

Just like push but the new element gets unshifted to the beginning of the array.

~~~~
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
~~~~
*/

const push = (path, value, callback) => {
  const list = get(path) || set(path, []);
  if(Array.isArray(list)) {
    list.push(value);
    if (callback) {
      callback(list);
    }
    touch(path);
  }
};

const unshift = (path, value) => {
  const list = get(path) || set(path, []);
  if(Array.isArray(list)) {
    list.unshift(value);
    touch(path);
  }
};

/**
    sort('path.to.array', comparison_fn);

For example:

    sort('file-list', (a, b) => a.name < b.name ? -1 : 1);

Sorts the array at path using the provided sorting function.

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
<script>
  b8r.register('test-people', [
    { id: 0, name: 'Tom', age: 41 },
    { id: 1, name: 'Deirdre', age: 47 },
    { id: 2, name: 'Harriet', age: 39 },
    { id: 3, name: 'Simon', age: 52 }
  ]);

  set('sort', evt => {
    const prop_name = evt.target.textContent.toLowerCase();
    b8r.sort('test-people', (a, b) => a[prop_name] < b[prop_name] ? -1 : 1);
  });
</script>
```
*/

const sort = (path, comparison) => {
  const list = get(path) || set(path, []);
  if(Array.isArray(list)) {
    list.sort(comparison);
    touch(path);
  }
};

/**
    call('path.to.method', ...args);

Call a method by path with the arguments provided (and return result).
*/

const call = (path, ...args) => {
  const method = get(path);
  if (method instanceof Function) {
    return method(...args);
  } else {
    console.error(`cannot call ${path}; not a method`);
  }
};

/**
    call_if('path.to.method', ...args);

If a method is found at path, call it and return result, otherwise return null.
*/

const call_if = (path, ...args) => {
  const f = get(path);
  return f instanceof Function ? f(...args) : null;
};

/**
    observe('root.path.to', callback); // returns a Listener instance

You can observe a path (string). The callback will fire whenever any path
matching or starting
with the string changes. The callback will be passed the exact path that
changed.

    observe(/root.path.[^\.]+.value/, callback);

Instead of a constant path, you can pass a RegExp which will fire the callback
when a path
matching the test changes. The callback will be passed the exact path that
changed.

    observe(path => path.split('.').length === 1, callback);

Finally you can observe a path test function.

    const listener = observe(test, callback);

The `callback` can be a function or a path. If a path, the listener will
automatically be removed if the path is no longer registered (so, for example,
you can hook up a component method as a listener and it will be
'garbage collected' with the compoent.

You can remove a listener (if you kept the reference handy).

    unobserve(listener);

You can remove a listener by test, but it will remove _all_ listeners which use
that test.

~~~~
b8r.register('listener_test1', {
  flag_changed: () => {
    console.log('flag changed');
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
~~~~
*/

const observe = (test, callback) => {
  return new Listener(test, callback);
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

  return found;
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
const {register, remove, get} = b8r;
register('foo', {bar: 17, baz: {lurman: true}});
Test(() => {remove('foo.bar'); return get('foo.bar');}).shouldBe(null);
Test(() => {remove('foo.boris.yeltsin'); return get('foo.boris')}).shouldBe(null);
Test(() => {remove('foo.baz.lurman'); return Object.keys(get('foo.baz')).length}).shouldBe(0);
~~~~
*/
const remove = (path, update=true) => {
  deleteByPath(registry, path);
  if (update) {
    touch(path);
    /* touch array containing the element if appropriate */
    [,path] = (path.match(/^(.+)\[[^\]]+\]$/) || []);
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
const {register, increment, decrement, zero, get} = b8r;
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
~~~~
*/


const zero = path => set(path, 0);

const increment = path => set(path, get(path) + 1);

const decrement = path => set(path, get(path) - 1);

const deregister = path => {
  console.warn('deregister is deprecated, use b8r.remove');
  remove(path);
};

const _getByPath = (model, path) => 
  get(path ? model + (path[0] === '[' ? path : '.' + path) : model);

var _registry = /*#__PURE__*/Object.freeze({
  get: get,
  getJSON: getJSON,
  getByPath: _getByPath,
  set: set,
  setJSON: setJSON,
  increment: increment,
  decrement: decrement,
  zero: zero,
  push: push,
  unshift: unshift,
  sort: sort,
  call: call,
  call_if: call_if,
  touch: touch,
  observe: observe,
  unobserve: unobserve,
  models: models,
  _register: _register,
  register: register,
  registered: registered,
  remove: remove,
  deregister: deregister,
  resolvePath: resolvePath,
  isValidPath: isValidPath
});

/**
# functions

This module provides convenient access to the `AsyncFunction` constructor.

    const f = new b8r.AsyncFunction(...args, code)

Utility functions for preventing a method from being called too frequently.
Not recommended for use on methods which take arguments!

    b8r.debounce(method, min_interval_ms) => debounced method

From a function `f`, create a function that will call f after the provided interval has passed,
the interval being reset if the function is called again.

E.g. you want to call a query "as the user types" but don't want to call until the user pauses
typing for a while or at least has a chance to type a few keys.

A debounced method will call the original function at least once after the debounced version is
called.

    b8r.throttle(method, min_interval_ms) => throttled method

From a function `f`, create a function that will call f if and only if the function hasn't
been called in the last interval.

If you call f several times within the interval, *only the first call will fire*.
*/

const debounce = (orig_fn, min_interval) => {
  let debounce_id;
  return (...args) => {
    if (debounce_id) {
      clearTimeout(debounce_id);
    }
    debounce_id = setTimeout(() => orig_fn(...args), min_interval);
  };
};

const throttle = (orig_fn, min_interval) => {
  let last_call = Date.now() - min_interval;
  return (...args) => {
    const now = Date.now();
    if (now - last_call > min_interval) {
      last_call = now;
      orig_fn(...args);
    }
  };
};

const AsyncFunction = (async function(){}).constructor;

var _functions = /*#__PURE__*/Object.freeze({
  AsyncFunction: AsyncFunction,
  debounce: debounce,
  throttle: throttle
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
  g.fillRect(0,0,1,1);
  return c.toDataURL();
};

/**
# imgSrc
Copyright ©2016-2017 Tonio Loewald

    imgSrc(img, url, cors=true)

Gracefully populates an `<img>` element's src attribute to a url,
sets the element to `opacity: 0`, and then fades it in when the image
is loaded.
*/

const images = {};
const pixel = new Image();
pixel.src = render();
const pixelPromise = new Promise(resolve => resolve(pixel));

const imagePromise = (url, cors=true) => {
  if (!url) {
    return pixelPromise;
  } else if (images[url]) {
    return images[url];
  } else {
    images[url] = new Promise(resolve => {
      const image = new Image();
      if (cors)
        // Cross-origin is necessary if you want to use the image data from JavaScript, in WebGL
        // for example, but you can't indiscriminately use it on all images. If you use
        // `crossorigin` on images from a source that doesn't reply with the
        // `Access-Control-Allow-Origin` header, the browser won't render them.
        image.setAttribute('crossorigin', 'anonymous');
      image.src = url;
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        resolve(pixel);
      };
    });
    return images[url];
  }
};

const imgSrc = (img, url, cors=true) => {
  if(img instanceof HTMLImageElement && img.src === url) {
    return;
  }
  img.src = pixel.src;
  img.style.opacity = 0.1;
  imagePromise(url, cors).then(image => {
    if(!getComputedStyle(img).transition) {
      img.style.transition = '0.25s ease-out';
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

Leverages the modern browser's event "code" to identify keystrokes,
and uses a normalized representation of modifier keys (in alphabetical)
order.

* **alt** represents the alt or option keys
* **ctrl** represents the control key
* **meta** represents the windows, command, or meta keys
* **shift** represents the shift keys

To get a normalized representation of a keystroke:

    keystroke(event) // => produces normalized keystroke of the form alt-X

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

Also provides modifierKeys, a map from the modifier strings (e.g. alt) to
the relevant unicode glyphs (e.g. '⌥').
*/

const keycode = evt => {
  if (evt.code) {
    return evt.code.replace(/Key|Digit/, '');
  } else {
    let synthetic_code = evt.keyIdentifier;
    if (synthetic_code.substr(0, 2) === 'U+') {
      synthetic_code =
          String.fromCharCode(parseInt(evt.keyIdentifier.substr(2), 16));
    }
    return synthetic_code;
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
  return code.join('-');
};

const modifierKeys = {
  meta: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  escape: '⎋',
  shift: '⇧',
};

var implicit_event_types = [
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'click', 'dblclick',
  'mouseleave', 'mouseenter',
  'mousewheel', 'scroll', // FIXEME passive?!
  'contextmenu',
  'dragstart', 'dragenter', 'dragover', 'dragleave', 'dragend', 'drop',
  'transitionend', 'animationend',
  'input', 'change',
  'keydown', 'keyup',
  'cut', 'copy', 'paste',
  'focus', 'blur' // more to follow
];

/**
# Events
*/

const onOffArgs = args => {
  var element, event_type, object, method, prepend = false;
  if(typeof args[2] === 'object') {
    console.warn('b8r.on(element, type, OBJECT) is deprecated');
    [element, event_type, object] = args;
    return on(element, event_type, object.model, object.method);
  } else if(args.length > 4 || typeof args[3] === 'string') {
    [element, event_type, object, method, prepend] = args;
    if(typeof object !== 'string' || typeof method !== 'string') {
      console.error('implicit bindings are by name, not', object, method);
      return;
    }
    method = object + '.' + method;
  } else {
    [element, event_type, method, prepend] = args;
  }
  if (!(element instanceof Element)) {
    console.error('bind bare elements please, not', element);
    throw 'bad argument';
  }
  return {element, event_type, path: method, prepend};
};

const getEventHandlers = (element) => {
  const source = element.dataset.event;
  const existing = source ?
                   source.
                   replace(/\s*(^|$|[,:;])\s*/g, '$1').split(';').
                   filter(handler => handler.trim()) :
                   [];
  return existing;
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
    return handlers.map(function(instruction){
      const [type, handler] = instruction.split(':');
      if (!handler) {
        if(instruction.indexOf('.')) {
          console.error('bad event handler (missing event type)', instruction, 'in', element);
        } else {
          console.error('bad event handler (missing handler)', instruction, 'in', element);
        }
        return { types: [] };
      }
      const [, model, method] = handler.trim().match(/^([^\.]+)\.(.+)$/);
      const types = type.split(',').sort();
      return {
        types: types.map(s => s.split('(')[0].trim()),
        type_args: types.map(s => {
          if (s.substr(0,3) === 'key') {
            s = s.replace(/Key|Digit/g, '');
            // Allows for a key to be CMD in Mac and Ctrl in Windows
            s = s.replace(/CmdOrCtrl/g, navigator.userAgent.indexOf('Macintosh') > -1 ? 'meta' : 'ctrl');
          }
          var args = s.match(/\(([^)]+)\)/);
          return args && args[1] ? args[1].split(',') : false;
        }),
        model,
        method,
      };
    });
  } catch(e) {
    console.error('fatal error in event handler', e);
    return [];
  }
};

const makeHandler = (event_type, method) => {
  if (typeof event_type === 'string') {
    event_type = [event_type];
  }
  if(!Array.isArray(event_type)) {
    console.error('makeHandler failed; bad event_type', event_type);
    return;
  }
  return event_type.sort().join(',') + ':' + method;
};

/**
    on(element, event_type, model_name, method_name);

creates an implicit event-binding data attribute:

    data-event="event_type:module_name.method_name"

Multiple handlers are semicolon-delimited, e.g.

    data-event="mouseover:_component_.show;mouseover:_component_.hide"

You can bind multiple event types separated by commas, e.g.

    data-event="click,keyup:do.something"

**Note**: if you link two event types to the same method separately they will NOT be collated.

You can remove an implicit event binding using:

    off(element, event_type, model_name, method_name);

### Keyboard Events

To make it easy to handle specific keystrokes, you can bind to keystrokes by name, e.g.

    data-bind="keydown(meta-KeyS)"

For your convenience, there's a *Keyboard Event Utility*.
*/

// TODO use parsed event handlers to do this properly
function on (...args) {
  const {element, event_type, path, prepend} = onOffArgs(args);
  const handler = makeHandler(event_type, path);
  const existing = getEventHandlers(element);
  if(existing.indexOf(handler) === -1) {
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
  var element, event_type, object, method;
  if(args.length === 4) {
    [element, event_type, object, method] = args;
    method = object + '.' + method;
  } else if (args.length === 3) {
    [element, event_type, method] = args;
  } else {
    throw 'b8r.off requires three or four arguments';
  }
  const existing = element.dataset.event.split(';');
  const handler = makeHandler(event_type, method);
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

    enable(element, include_children); // include_children defaults to false

Returns data-event-disabled attributes to data-event attributes.

    disable(element, include_children);

Finds all data-event bindings on elements within the specified target and
turns them into data-event-disabled attributes;
*/

const disable = (element, include_children) => {
  const elements = include_children ? findWithin(element, '[data-event]', true) : [element];
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

const enable = (element, include_children) => {
  const elements = include_children ? findWithin(element, '[data-event-disabled]', true) : [element];
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
      type => implicit_event_types.push(type));
}

const get_component_with_method = function(element, path) {
  var component_id = false;
  element = element.closest('[data-component-id]');
  while (element instanceof Element) {
    if (get(`${element.dataset.componentId}.${path}`) instanceof Function) {
      component_id = element.dataset.componentId;
      break;
    }
    element = element.parentElement.closest('[data-component-id]');
  }
  return component_id;
};

/**
## Calling Event Handlers

You can, of course, call any registered method via `b8r.get('path.to.function')(...args)`
and there's even a convenient method that reduces this to `b8r.call('path.to.function', ...args)`.
But `b8r.callMethod` is specifically used to call event handlers because it allows for the case
where the event occurs *before the handler has been registered*. So, in particular, if you
load component which calls a method that the component's script will register *afterwards* or which
relies on, say, a library that is being asynchronously loaded, you can still just write the handler
as normal and, under the hood, it will be saved and executed when the method is registered.

    b8r.callMethod(method_path, ...args)
    b8r.callMethod(model, method, ...args);

Call a method by name from a registered method. If the relevant model has not
yet been registered (e.g. it's being loaded asynchronously) it will get the
message when it's registered.
*/

var saved_messages = [];  // {model, method, evt}

function saveMethodCall(model, method, args) {
  saved_messages.push({model, method, args});
}

const play_saved_messages = for_model => {
  var playbackQueue = [];
  for (var i = saved_messages.length - 1; i >= 0; i--) {
    if (saved_messages[i].model === for_model) {
      playbackQueue.push(saved_messages[i]);
      saved_messages.splice(i, 1);
    }
  }
  while (playbackQueue.length) {
    var {model, method, args} = playbackQueue.pop();
    callMethod(model, method, ...args);
  }
};

const callMethod = (...args) => {
  var model, method;
  try {
    if (args[0].match(/[\[.]/)) {
      [method, ...args] = args;
      [model, method] = pathSplit(method);
    } else {
      [model, method, ...args] = args;
    }
  } catch (e) {
    debugger;  // eslint-disable-line no-debugger
  }
  var result = null;
  if (registered(model)) {
    result = call(`${model}.${method}`, ...args);
  } else {
    // TODO queue if model not available
    // event is stopped from further propagation
    // provide global wrappers that can e.g. put up a spinner then call the
    // method
    saveMethodCall(model, method, args);
  }
  return result;
};

const handle_event = evt => {
  var target = anyElement;
  var args = evt.args || [];
  var keystroke$$1 = evt instanceof KeyboardEvent ? keystroke(evt) : {};
  while (target) {
    var handlers = getParsedEventHandlers(target);
    var result = false;
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      for (var type_index = 0; type_index < handler.types.length;
           type_index++) {
        if (handler.types[type_index] === evt.type &&
            (!handler.type_args[type_index] ||
             handler.type_args[type_index].indexOf(keystroke$$1) > -1)) {
          if (handler.model && handler.method) {
            if (handler.model === '_component_') {
              handler.model = get_component_with_method(target, handler.method);
            }
            if (handler.model) {
              result = callMethod(handler.model, handler.method, evt, target, ...args);
            } else {
              console.warn(`_component_.${handler.method} not found`, target);
            }
          } else {
            console.error('incomplete event handler on', target);
            break;
          }
          if (result !== true) {
            evt.stopPropagation();
            evt.preventDefault();
            return;
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
    (target && !(target.dispatchEvent instanceof Function))
  ) {
    console.error(
      'expected trigger(event_type, target_element)',
      type,
      target
    );
    return;
  }
  if (target) {
    const event = dispatch(type, target, ...args);
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
  if (implicit_event_types.indexOf(type) === -1) {
    implicit_event_types.push(type);
    document.body.addEventListener(type, handle_event, true);
  }
};

var b8r_events = /*#__PURE__*/Object.freeze({
  makeHandler: makeHandler,
  getEventHandlers: getEventHandlers,
  getParsedEventHandlers: getParsedEventHandlers,
  dispatch: dispatch,
  trigger: trigger,
  on: on,
  off: off,
  enable: enable,
  disable: disable,
  callMethod: callMethod,
  implicitlyHandleEventsOfType: implicitlyHandleEventsOfType,
  implicit_event_types: implicit_event_types,
  get_component_with_method: get_component_with_method,
  handle_event: handle_event,
  play_saved_messages: play_saved_messages
});

/**
# describe

A simple function for describing the values of things.

    const description = describe(variable_name, max_uniques=4, generic=false);

`max_uniques` determines how many items/keys it checks before giving up. If  `max_unqiues` is `-1`
then everything will be handled.

`generic` determines whether it returns `string` and `#` instead of literals.

**Note**: describe only checks the first two elements against each other to see if the array
is homogeneous.

~~~~
const {describe} = await import('../lib/describe.js');
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
function describe(x, max_uniques=4, generic=false) {
  if (x === undefined) {
    return 'undefined';
  } else if (Array.isArray(x)) {
    if (x.length === 0) {
      return '[]';
    } else if (x.length === 1 || typeof x[0] === typeof x[1]) {
      return `[${describe(x[0], max_uniques, generic)} × ${x.length}]`;
    } else if (typeof x[0] !== typeof x[1]) {
      return x.length <= max_uniques || max_uniques < 0
                         ? '[' + x.map(v => describe(v, max_uniques, generic)).join(', ') + ']'
                         : `[* × ${x.length}]`;
    }
  } else if (x && x.constructor === Object) {
    const keys = Object.keys(x);
    if (max_uniques >= 0 && keys.length > max_uniques) {
      keys.splice(max_uniques);
      keys.push('…');
    }
    return `{${keys.join(',')}}`;
  } else if (typeof x === 'string') {
    return generic ? 'string' : `"${x}"`;
  } else if (x instanceof Function) {
    const source = x.toString();
    const args = source.match(/^(async\s+)?(function[^(]*\()?\(?(.*?)(\)\s*\{|\)\s*=>|=>)/m)[3].trim();
    const native = source.match(/\[native code\]/);
    const inside = native ? '[native code]' : '...';
    let desc = x.prototype || native ? `function(${args}){${inside}}` : `(${args})=>{${inside}}`;
    if (source.startsWith('async')) {
      desc = 'async ' + desc;
    }
    return desc;
  } else if (isNaN(x)) {
    return 'NaN';
  } else if (typeof x === 'boolean') {
    return generic ? 'bool' :'' + x;
  } else if (typeof x === 'number') {
    return generic ? '#' : '' + x;
  } else {
    return JSON.stringify(x);
  }
}

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
> `value` is also a ["from"-binding](#source=source/b8r.fromTargets.js). which means that
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
no formatting is applied and the `textContent` of the element is set instead.
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
  label { display: block; }
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
`new Date(...).localString()` by default, but supporting
[data.format](http://blog.stevenlevithan.com/archives/date-time-format)
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

    data-bind="enabled_if=_data_.editable"

This shows (or hides) an element based on whether a bound value is truthy or
matches the provided parameter.

### method()

    data-bind="method(model.notify)=message.priority"

Calls the specified method, passing it the bound value. The method will receive
the element, value, and data source as parameters. (This means that methods
registered as event handlers will need to deal with being passed a naked element
instead of an event)

```
<input type="range" data-bind="value=_component_.num">
<span data-bind="method(_component_.order)=_component_.num"></span>
<script>
  const is_prime = x => {
    const max = Math.sqrt(x);
    for(let i = 2; i < max; i++) {
      if (x % i === 0) { return false; }
    }
    return true;
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

You can pass an array of values to a bound method by comma-delimiting the paths, e.g.

    data-bind="method(path.to.method)=path.to.value,path.to.other,another.path"

### component\_map()

    data-bind="component_map(
        value:component_name|
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

### component

    data-bind="component(options)=path.to.options"

The `component` target lets you set (and get) component properties.

## Comparison Values

These terms are used for comparison to certain values in conditional toTargets.

* `_true_`
* `_false_`
* `_undefined_`
* `_null_`
*/

function _toTargets(b8r) {
  const special_values = {
    '_true_': true,
    '_false_': false,
    '_undefined_': undefined,
    '_null_': null,
  };

  const equals = (value_to_match, value) => {
    if (typeof value === 'string') {
      value = value.replace(/\&nbsp;/g, '').trim();
    }
    if (special_values.hasOwnProperty(value_to_match)) {
      return value === special_values[value_to_match];
    } else if (value_to_match !== undefined) {
      return value == value_to_match;
    } else {
      return !!value;
    }
  };

  const parse_options = source => {
    if (!source) {
      throw 'expected options';
    }
    return source.split('|').map(s => s.trim()).filter(s => !!s).map(s => {
      s = s.split(':').map(s => s.trim());
      return s.length === 1 ? {value: s[0]} : {match: s[0], value: s[1]};
    });
  };

  return {
    value: function(element, value) {
      switch (element.getAttribute('type')) {
        case 'radio':
          if (element.checked !== (element.value == value)) {
            element.checked = element.value == value;
          }
          break;
        case 'checkbox':
          element.checked = value;
          break;
        default:
          if (element.value !== undefined) {
            element.value = value;
            // <select> element will not take value if no matching option exists
            if (value && ! element.value) {
              element.dataset.pendingValue = JSON.stringify(value);
              // console.warn('set value deferred', element, value);
            } else if (element.dataset.pendingValue) {
              delete element.dataset.pendingValue;
            }
          } else {
            if (element.dataset.componentId) {
              b8r.set(`${element.dataset.componentId}.value`, value);
            } else {
              // <b8r-component> does not support value if it does
              // not have a loaded component
              if (element.tagName !== 'B8R-COMPONENT') {
                console.error('could not set component value', element, value); 
              }
            }
          }
      }
    },
    checked: (element, value) => {
      if (value === null) {
        element.checked = false;
        element.indeterminate = true;
      } else {
        element.checked = !! value;
      }
    },
    selected: (element, value) => {
      element.selected = !! value;
    },
    text: (element, value) => element.textContent = value,
    format: (element, value) => {
      let content = value || '';
      if (typeof content !== 'string') {
        throw 'format only accepts strings or falsy values';
      }
      let template = false;
      if (content.match(/[*_]/) && !content.match(/<|>/)) {
        template = true;
        content = content.replace(/[*_]{2,2}(.*?)[*_]{2,2}/g, '<b>$1</b>')
                                   .replace(/[*_](.*?)[*_]/g, '<i>$1</i>');
      }
      if(content.indexOf('${') > -1){
        content = b8r.interpolate(content, element);
      }
      if (template) {
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }
    },
    fixed: (element, value, dest) => element.textContent = parseFloat(value).toFixed(dest || 1),
    bytes: (element, value) => {
      if (!value) {
        element.textContent = '';
        return;
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
    attr: function(element, value, dest) {
      if (value === undefined || value === null || value === false) {
        element.removeAttribute(dest);
      } else {
        element.setAttribute(dest, value);
      }
    },
    prop: function(element, value, property) {
      element[property] = value;
    },
    data: function(element, value, dest) {
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
    style: function(element, value, dest) {
      if (!dest) {
        if (typeof value === 'string') {
          element.setAttribute('style', dest);
        } else if (typeof value === 'object') {
          Object.assign(element.style, value);
        }
      } else if (value !== undefined) {
        element.style[dest] = value;
      }
    },
    class: function(element, value, class_to_toggle) {
      if (!class_to_toggle) {
        throw 'class toTarget requires a class to be specified';
      }
      const options = parse_options(class_to_toggle);
      element.classList.toggle(options[0].value, !!value);
      if (options.length > 1) {
        element.classList.toggle(options[1].value, !value);
      }
    },
    class_unless: function(element, value, class_to_toggle) {
      if (!class_to_toggle) {
        throw 'class_unless toTarget requires a class to be specified';
      }
      if (! value) {
        element.classList.add(class_to_toggle);
      } else {
        element.classList.remove(class_to_toggle);
      }
    },
    class_map: function(element, value, map) {
      const class_options = parse_options(map);
      let done = false;
      class_options.forEach(item => {
        if (done || (item.match && !equals(item.match, value))) {
          element.classList.remove(item.value);
        } else {
          element.classList.add(item.value);
          done = true;
        }
      });
    },
    contenteditable: function(element, value, dest) {
      if (equals(dest, value)) {
        element.setAttribute('contenteditable', true);
      } else {
        element.removeAttribute('contenteditable');
      }
    },
    enabled_if: function(element, value, dest) {
      if(equals(dest, value)) {
        b8r.enable(element);
      } else {
        b8r.disable(element);
      }
    },
    disabled_if: function(element, value, dest) {
      if(!equals(dest, value)) {
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
    show_if: function(element, value, dest) {
      equals(dest, value) ? b8r.show(element) : b8r.hide(element);
    },
    hide_if: function(element, value, dest) {
      equals(dest, value) ? b8r.hide(element) : b8r.show(element);
    },
    method: function(element, value, dest) {
      let [model, ...method] = dest.split('.');
      method = method.join('.');
      if (model === '_component_') {
        model = get_component_with_method(element, method);
      }
      if (model) {
        b8r.callMethod(model, method, element, value);
      } else if (element.closest('body')) {
        console.warn(`method ${method} not found in`, element);
      }
    },
    timestamp: function(element, zulu, format) {
      if (!zulu) {
        element.textContent = '';
      } else if (!format) {
        const date = new Date(zulu);
        element.textContent = date.toLocaleString();
      } else {
        Promise.resolve().then(function () { return date_format; }).then(() => {
          const date = new Date(zulu);
          element.textContent = date.format(format);
        });
      }
    },
    json: function(element, value) {
      try {
        element.textContent = JSON.stringify(value, false, 2); 
      } catch (_) {
        const obj = {};
        Object.keys(value).forEach(key => {
          obj[key] = describe(value[key]);
        });
        element.textContent = '/* partial data -- could not stringify */\n' + JSON.stringify(obj, false, 2);
      }
    },
    data_path: function(element, value) {
      if (!element.dataset.path || value && element.dataset.path.substr(-value.length) !== value) {
        element.dataset.path = value;
        b8r.bindAll(element);
      }
    },
    component: function(element, value, dest) {
      const component_id = b8r.getComponentId(element);
      b8r.setByPath(component_id, dest, value);
    },
    component_map: function(element, value, map) {
      const component_options = parse_options(map);
      const option = component_options.find(item => !item.match || item.match == value);
      if (option) {
        const component_name = option.value;
        const existing = element.dataset.componentId || '';
        if (existing.indexOf(`c#${component_name}#`) === -1) {
          b8r.removeComponent(element);
          b8r.insertComponent(component_name, element);
        }
      }
    }
  };
}

/**
# Ajax Methods

Copyright ©2016-2017 Tonio Loewald

    ajax(url, method, request_data, config)
    json(url, method, request_data, config)
    jsonp(url, method, request_data, config)

All parameters except url are optional.

These methods generate promises of the specified response. Usage:

    json('path/to/endpoint', 'PUT', {...}).then(response => { ...});

Also note that these methods are folded into b8r by default, so available as
b8r.ajax, etc.
*/

const _requests_in_flight = [];

const _remove_in_flight_request = request => {
  const idx = _requests_in_flight.indexOf(request);
  if (idx > -1) {
    _requests_in_flight.splice(idx, 1);
  }
};

const ajax = (url, method, request_data, config) => {
  return new Promise(function(resolve, reject) {
    config = config || {};
    if (!config.headers) {
      config.headers = {};
    }
    var request = new XMLHttpRequest();
    _requests_in_flight.push(request);
    request.open(method || 'GET', url, true);
    request.onreadystatechange = () => {
      if (request.readyState === XMLHttpRequest.DONE) {
        switch (Math.floor(request.status / 100)) {
          case 0:
          case 5:
          case 4:
            _remove_in_flight_request(request);
            reject(request);
            break;
          case 3:
            // redirect of some kind
            break;
          case 2:
            _remove_in_flight_request(request);
            resolve(request.responseText);
            break;
        }
      }
    };
    if (typeof request_data === 'object') {
      if (method === 'GET') {
        throw 'GET requests do not support request body data';
      }
      request_data = JSON.stringify(request_data);
      config.headers['Content-Type'] = 'application/json; charset=utf-8';
    }
    for(var prop in config.headers) {
      request.setRequestHeader(prop, config.headers[prop]);
    }
    request.send(request_data);
  });
};

const json = (url, method, request_data, config) => {
  return new Promise(function(resolve, reject) {
    ajax(url, method, request_data, config).then(data => {
      try {
        resolve(JSON.parse(data || 'null'));
      } catch(e) {
        console.error('Failed to parse data', data, e);
        reject(e, data);
      }
    }, reject);
  });
};

const jsonp = (url, method, request_data, config) => {
  return new Promise(function(resolve, reject) {
    ajax(url, method, request_data, config).then(data => {
      let parsed = 'null';
      try {
        parsed = JSON.parse(data);
      } catch(e) {
        console.error('Failed to parse data', data, e);
        reject(e, data);
      }
      resolve(parsed);
    }, reject);
  });
};

const ajax_requests_in_flight = () => _requests_in_flight;

var _ajax = /*#__PURE__*/Object.freeze({
  ajax: ajax,
  json: json,
  jsonp: jsonp,
  ajax_requests_in_flight: ajax_requests_in_flight
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

> ### Two-Way Bindings
>
> `value` and most "from"-bindings are also ["to"-bindings](#source=source/b8r.toTargets.js).
> which means that an element will automatically be populated with bound data, and updated
> when it is set or changed *by path* (e.g. `set('path.to.data', new_value)`) or the path to that
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
  let pending_value = element.dataset.pendingValue;
  if (pending_value) {
    pending_value = JSON.parse(pending_value);
    element.value = pending_value;
    if (element.value === pending_value) {
      // console.log('restored pending value', element, pending_value);
      if (element.dataset.pendingValue) {
        delete element.dataset.pendingValue;
      }
    }
  }
  if(element.matches('input[type=radio]')){
    const name = element.getAttribute('name');
    const checked = find(`input[type=radio][name=${name}]`).find(elt => elt.checked);
    return checked ? checked.value : null;
  } else {
    if (element.dataset.componentId) {
      return get(`${element.dataset.componentId}.value`);
    } else {
      return element.value;
    }
  }
};

const checked = (element) => element.indeterminate ? null : element.checked;

const selected = (element) => element.selected;

const text$1 = (element) => element.textContent;

const currentTime = (element) => element.currentTime;

const playbackRate = (element) => element.playbackRate;

const prop = (element, property) => element[property];

const component = (element, path) => {
  const component_id = element.dataset.componentId;
  return _getByPath(component_id, path);
};

const fromMethod = (element, path) => {
  let [model, ...method] = path.split('.');
  method = method.join('.');
  return _getByPath(model, method)(element);
};

var fromTargets = /*#__PURE__*/Object.freeze({
  value: value,
  checked: checked,
  selected: selected,
  text: text$1,
  currentTime: currentTime,
  playbackRate: playbackRate,
  prop: prop,
  component: component,
  fromMethod: fromMethod
});

/**
## `_b8r_` — Built-in Event Handlers

The _b8r_ object is registered by default as a useful set of always available
methods, especially for handling events.

You can use them the obvious way:

    <button data-event="click:_b8r_.echo">
      Click Me, I cause console spam
    </button>

    _b8r_.echo // logs events to the console
    _b8r_.stopEvent // use this to simply catch an event silently
    _b8r_._update_ // this is used by b8r to update models automatically
*/

var _b8r_ = (b8r) => {
  const hasFromTarget = (t) => fromTargets[t.target];

  b8r._register('_b8r_', {
    echo : evt => console.log(evt) || true,
    stopEvent : () => {},
    _update_ : evt => {
      let elements = b8r.findAbove(evt.target, '[data-bind]', null, true);
      // update elements with selected fromTarget
      if (evt.target.tagName === 'SELECT') {
        const options = b8r.findWithin(evt.target, 'option[data-bind]:not([data-list])');
        elements = elements.concat(options);
      }
      elements.filter(elt => !elt.matches('[data-list]')).forEach(elt => {
        const bindings = getBindings(elt);
        for (let i = 0; i < bindings.length; i++) {
          const { targets, path } = bindings[i];
          const bound_targets = targets.filter(hasFromTarget);
          const processFromTargets = t => { // jshint ignore:line
            // all bets are off on bound values!
            const value$$1 = fromTargets[t.target](elt, t.key);
            if (value$$1 !== undefined) {
              delete elt._b8r_boundValues;
              b8r.setByPath(path, value$$1, elt);
            }
          };
          bound_targets.forEach(processFromTargets);
        }
      });
      return true;
    },
  });
};

/**
# Sort Utilities

These are convenient methods that behave a bit like the "spaceship" operator in PHP7.

### Usage

    import {sortAscending, sortDescending} from 'path/to/b8r.sort.js';
    const a = ['b', 'a', 'c'];
    const ascending = a.sort(sortAscending); // ['a', 'b', 'c'];
    const descending = a.sort(sortDescending); // ['c', 'b', 'a'];

They're also useful for building custom sort methods:

    // sort an array of objects by title property
    const sorted = array_of_objs.sort((a, b) => sortAscending(a.title, b.title));

~~~~
    const {sortAscending, sortDescending} = b8r;
    Test(() => ['c', 'a', 'B'].sort(sortAscending), 'sort strings, ascending').shouldBeJSON(['a','B','c']);
    Test(() => ['c', 'a', 'B'].sort(sortDescending), 'sort strings, descending').shouldBeJSON(['c','B','a']);
    Test(() => ['3', 1, 2].sort(sortAscending), 'sort mixed types, ascending').shouldBeJSON([1,2,'3']);
    Test(() => ['3', 1, 2].sort(sortDescending), 'sort mixed types, descending').shouldBeJSON(['3',2,1]);
~~~~
*/

const sortAscending = (a, b) => 
    typeof a === 'string' || typeof b === 'string' ? 
    `${a}`.localeCompare(b) : a > b ? 1 : b > a ? -1 : 0;
    
const sortDescending = (a, b) => 
    typeof a === 'string' || typeof b === 'string' ? 
    `${b}`.localeCompare(a) : a > b ? -1 : b > a ? 1 : 0;

var _sort = /*#__PURE__*/Object.freeze({
  sortAscending: sortAscending,
  sortDescending: sortDescending
});

/**
# catPath

    const path = catPath('file://path', '/to/', '../target');

Concatenate paths (generally assumed to be urls).

~~~~
const {catPath} = await import('../lib/cat-path.js');
Test(() => catPath('file://path/', '/to/data/')).shouldBe('file://path/to/data/');
Test(() => catPath('file://path/', '/to/data/', '../foo')).shouldBe('file://path/to/foo');
Test(() => catPath('file://path/to/data/', '../../foo')).shouldBe('file://path/foo');
~~~~
*/

/**
# Data for Element
*/

const data_waiting_for_components = [];  // { target_element, data }

const saveDataForElement = (target_element, data) => {
  if (data) {
    removeDataForElement(target_element);
    data_waiting_for_components.push({target_element, data});
  }
};

const removeDataForElement = (target_element) => {
  for (var i = 0; i < data_waiting_for_components.length; i++) {
    if (data_waiting_for_components[i].target_element === target_element) {
      delete data_waiting_for_components[i].data;
    }
  }
};

const dataForElement = (target_element, _default) => {
  var data;
  for (var i = 0; i < data_waiting_for_components.length; i++) {
    if (data_waiting_for_components[i].target_element === target_element) {
      data = data_waiting_for_components[i].data;
      removeDataForElement(target_element);
      return data;
    }
  }

  const json = target_element.dataset.json;
  if (json) {
    return JSON.parse(json);
  }

  return _default;
};

/**
# Any Event

Utility methods for intercepting __ANY__ event before anything else sees it. Note
that if you don't return `true` from the handler the event will be stopped.

    b8r.onAny(event_type, object, method) => handlerRef

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
  var event_type, object, method, path;
  if (args.length === 2) {
    [event_type, path] = args;
  } else {
    [event_type, object, method] = args;
    path = object + '.' + method;
  }
  return {event_type, path};
};

const onAny = function(...args) {
  const {event_type, path} = anyArgs(args);
  on(anyElement, event_type, path);
};

const offAny = function(...args) {
  const {event_type, path} = anyArgs(args);
  off(anyElement, event_type, path);
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
*/

const show = (element, ...args) => {
  if (! isVisible(element)) {
    if(element.dataset.origDisplay === undefined) {
      element.dataset.origDisplay = element.style.display === 'none' ? '' : element.style.display;
    }
    element.style.display = element.dataset.origDisplay;
    findWithin(element, '[data-event*="show"]', true)
        .forEach(elt => trigger('show', elt, ...args));
  }
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
# Make Stylesheet

Usage:

    import makeStyleSheet from 'path/to/makeStylesheet.js';
    makeStylesheet('h1 { font-size: 100px; }', 'my style sheet');

Inserts the source in a `<style>` tag and sticks in in the document head. It will have the
supplied title as its `data-title` attribute;

    import {viaLink} from 'path/to/makeStyleSheet.js';
    viaLink('path/to/styles.css'); // returns a <link> tag with appropriate href

Adds:

    <link rel="stylesheet" type="text/css" href="path/to/styles.css">

to the document header if (and only if) no such tag is already present (it only checks for
`<link>` tags with the same href, so if you're doing something *really weird* with links this
might lead to problems.)
*/

const makeStyleSheet = (source, title) => {
  const style = source ? create('style') : false;
  if (style) {
    style.type = 'text/css';
    style.dataset.title = title;
    style.appendChild(text(source));
    document.head.appendChild(style);
  }
  return style;
};

/**
# uuid

A simple method for creading uuids. Usage:

        const uuid = require('path/to/uuid.js');
        const some_uuid = uuid();

~~~~
const {uuid} = await import('../lib/uuid.js');
Test(() => uuid().match(/[0-9a-f]+/g).length).shouldBe(5);
Test(() => uuid().match(/[0-9a-f]+/g).map(s => s.length)).shouldBeJSON([8,4,4,4,12]);
Test(() => uuid().length).shouldBe(36);
Test(() => uuid()).shouldNotBe(uuid());
~~~~
*/

const randomBytes =
  typeof window === 'undefined' ?
  () => {
    const node_crypto = require('crypto');
    return node_crypto.randomBytes(16);
  } :
  () => {
    const bs = new Uint8Array(16);
    window.crypto.getRandomValues(bs);
    return bs;
  };

const uuid = () => {
  // RFC 4122 version 4
  const ud = randomBytes();
  ud[8] = ud[8] >> 2 | (0b10 << 6); // clock_seq_hi_and_reserved
  ud[6] = ud[6] >> 4 | (0b0100 << 4); // time_hi_and_version
  let i = 0;
  return 'xxxx-xx-xx-xx-xxxxxx'.replace(/x/g, () =>
      (0xf00 | ud[i++]).toString(16).slice(1)
  );
};

/**
# web-components.js

Helper methods for creating Web Components.

## Methods

### makeWebComponent

    makeWebComponent(tagName, {
      superClass=HTMLElement, // the class you're extending
      style=false,            // expect object
      methods={},             // map names to class methods
      eventHandlers={},       // map event_types to event handlers
      attributes={},          // map attributes to default values
      content=slot(),         // HTMLElement or DocumentFragment or falsy
      ariaRole=false,         // expect string
    })                        // returns the class

Defines a new [Web Component](https://www.webcomponents.org/)).

Returns the component class (in case you want to subclass it).

- `style` can be CSS source or a map of selector rules to maps of css rules.
  If no style is passed, no shadowRoot will be created
- `methods` will become class methods, notably `render` and `childListChange`
  - `render` is where the widget gets expressed in the DOM, based on its state
  - `childListChange` indicates that children of the (original) DOM node have changed
- `eventHandlers` will be bound to the DOM element (i.e. `this` will refer to the
  expected instance)
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
- `ariaRole` will do the expected thing
- by default, setting the `hidden` attribute will hide a styled component (this is
  implemented via styles), not attributes, so there's no MutationObserver oberhead.

#### Component Lifecycle

- if it exists, `methods.onMount` will be called when an instance is created.
- if it exists, `methods.unMount` will be called when an instance is removed 
  from the DOM.

#### Performance Notes

The "lightest" web-components have no `style` (and hence no shadowDOM) or `attributes`.
- supporting attributes involves creating a MutationObserver, which has an overhead.
- adding a `style` object has a larger perf overhead.

Even so, in general web-components should perform better than components implemented using
Javascript frameworks (including `b8r` components).

More information is provided in [this blog entry](http://loewald.com/blog/2019/01/more-on-web-components-and-perf/).

### makeElement

    const makeElement = (tagType, {
      content=false,  // text, or something that can be appended to an HTMLElement
      attributes={},  // attribute map
      styles={},      // style object
      classes=[],     // list of classes
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

### div, span, input, slot

These are convenience methods wrapped around makeElement, so instead of writing:

    makeElement('span', {...});

You can write:

    span({...}); // and the object is optional, so span() works too.

### fragment

    fragment(...elements)

Creates a document fragment containing the elements passed to it.

### Example

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

## TODO

- Resize events
- Component styling scope (see below)

## Recommended Reading

### Best Practices

I do not follow these slavishly (some I flat out disagree with) but include them for
reference purposes.

- [Custom Elements Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices)
- [Web Components Best Practices](https://www.webcomponents.org/community/articles/web-components-best-practices)

### Styling

- [Styling a Web Component](https://css-tricks.com/styling-a-web-component/)

The above is more of a "how to" than best practices. I'm still trying to figure
out best practices myself. Right now, I'd say that **the best way to style
web-components is as little as possible** -- unless they're actual views
(and my jury is out on whether building views as web-components is at all a
good idea).

Creating components with minimal styling and no shadowDOM is another possibility.
Instead of creating an internal style node, they could simply insert a singleton
stylesheet in the `<header>` the way `b8r` components do.

*/
/* global module */

const appendContentToElement = (elt, content) => {
  if (content) {
    if (typeof content === 'string') {
      elt.textContent = content;
    } else if (Array.isArray(content)) {
      content.forEach(node => elt.appendChild(node.cloneNode(true)));
    } else if (content.cloneNode) {
      elt.appendChild(content.cloneNode(true));
    } else {
      throw 'expect text content or document node';
    }
  }
};

const makeElement = (tagType, {
  content=false, 
  attributes={}, 
  styles={}, 
  classes=[],
}) => {
  const elt = document.createElement(tagType);
  appendContentToElement(elt, content);
  Object.keys(attributes).forEach((attributeName) => elt.setAttribute(attributeName, attributes[attributeName]));
  Object.keys(styles).forEach((styleName) => elt.style[styleName] = styles[styleName]);
  classes.forEach((className) => elt.classList.add(className));
  return elt;
};
const slot = (settings={}) => makeElement('slot', settings);

const _hyphenated = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

const _css = (obj) => {
  if (typeof obj === 'object') {
    const selectors = Object.keys(obj).map((selector) => {
      const body = obj[selector];
      const rule = Object.keys(body)
                         .map((prop) => `  ${_hyphenated(prop)}: ${body[prop]};`)
                         .join('\n');
      return `${selector} {\n${rule}\n}`;
    });
    return selectors.join('\n\n');
  } else {
    return obj;
  }
};

const unmountWatchList = [];
const unmountObserver = new MutationObserver((mutationsList) => {
  if (unmountWatchList.length === 0) return;
  for(let i = 0; i < mutationsList.length; i++) {
    const mutation = mutationsList[i];
    if (mutation.removedNodes.length) {
      break;
    }
  }
  for(let i = unmountWatchList.length - 1; i >= 0; i--) {
    const elt = unmountWatchList[i];
    if (!document.body.contains(elt)) {
      elt.unMount();
      unmountWatchList.splice(i, 1);
    }
  }
});

unmountObserver.observe(document.body, {childList: true, attributes: true, subtree: true});

const makeWebComponent = (tagName, {
    superClass=HTMLElement, // the class you're exetending
    value=false,            // expect boolean
    style=false,            // expect object
    methods={},             // map names to functions
    eventHandlers={},       // map event_types to event handlers
    props={},               // map of instance properties to defaults
    attributes={},          // map attributes to default values
    content=slot(),         // HTMLElement or DocumentFragment
    ariaRole=false,         // expect string
}) => {
  let styleNode = null;
  if (style) {
    style = Object.assign({':host([hidden])': {display: 'none !important'}}, style);
    styleNode = makeElement('style', {content: _css(style)});
  } else if (style) {
    console.error(`style for a web-component ${tagName} with now shadowRoot is not supported`);
  }
  if (methods.render) methods = Object.assign({
    queueRender(change=false){
      if(!this._changeQueued) this._changeQueued = change;
      if(!this._renderQueued) {
        this._renderQueued = true;
        requestAnimationFrame(() => {
          if (this._changeQueued) {
            this.dispatchEvent(new Event('change'));
          }
          this._changeQueued = false;
          this._renderQueued = false;
          this.render(); 
        });
      }
    }
  }, methods);

  const componentClass = class extends superClass {
    constructor() {
      super();
      Object.assign(this, props);
      if (styleNode) {
        const shadow = this.attachShadow({mode: 'open'});
        shadow.appendChild(styleNode.cloneNode(true));
        appendContentToElement(shadow, content);
      } else {
        appendContentToElement(this, content);
      }
      Object.keys(eventHandlers).forEach(eventType => {
        this.addEventListener(eventType, eventHandlers[eventType].bind(this));
      });
      if (ariaRole) this.setAttribute('aria-role', ariaRole);
      const attributeNames = Object.keys(attributes);
      if (eventHandlers.childListChange) {
        const observer = new MutationObserver(eventHandlers.childListChange.bind(this));
        observer.observe(this, {childList: true});
      }
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
        observer.observe(this, {attributes: true});
        attributeNames.forEach(attributeName => {
          Object.defineProperty(this, attributeName, {
            writeable: true,
            enumerable: false,
            get(){ 
              if(typeof attributes[attributeName] === 'boolean') {
                return this.hasAttribute(attributeName);
              } else {
                return this.hasAttribute(attributeName) ?
                       this.getAttribute(attributeName) :
                       attributeValues[attributeName] || attributes[attributeName];
              }
            },
            set(value){
              if(typeof attributes[attributeName] === 'boolean') {
                if (value !== this[attributeName]) {
                  if (value) {
                    this.setAttribute(attributeName, '');
                  } else {
                    this.removeAttribute(attributeName);
                  }
                  if (this.queueRender) this.queueRender(attributeName === 'value');
                }
              } else {
                if (typeof value === 'object' || `${value}` != `${this[attributeName]}`) {
                  if(value === null || value === undefined || typeof value === 'object') {
                    this.removeAttribute(attributeName); 
                  } else {
                    this.setAttribute(attributeName, value);
                  }
                  attributeValues[attributeName] = value;
                  if (this.queueRender) this.queueRender(attributeName === 'value');
                }
              }
            },
          });
        });
      }
      if (this.onMount) this.onMount();
      if (this.unMount) unmountWatchList.push(this);
      if (this.queueRender) this.queueRender();
    }
  };

  Object.keys(methods).forEach(methodName => {
    componentClass.prototype[methodName] = methods[methodName];
  });

  window.customElements.define(tagName, componentClass);

  return componentClass;
};

/**
# Components

    component(name, url);

Loads component from url registers it as "name". (Components are registered
separately from other objects.)

Returns a promise of the component once loaded.

    component('path/to/name');

If just a path is provided, the name of the component will be
inferred.

**Note**: the extension `.component.html` is appended to urls.

Instances of the component will automatically be inserted as expected once
loaded.

**Also note**: you can usually avoid the pattern:

    component(...).then(c => b8r.insertComponent(c, target))

By simply binding the component to the target and letting nature take its
course.

    b8r.insertComponent(component, element, data);

insert a component by name or by passing a component record (e.g. promised by
component() or produced by makeComponent)

If no element is provided, the component will be appended to `document.body`.

Data will be passed to the component's load method and registered as the
component's private instance data. (Usually data is passed automatically
from parent components or via binding, e.g. `data-path="path.to.data` binds that
data to the component).

    b8r.removeComponent(elt); // removes the component's class and instance and empties the element

If elt has a component in it (i.e. has the attribute data-component-id) removes the
element's contents, removes the component-id, and removes any class that ends with '-component'.
Note that `removeComponent` does not preserve children!

## Creating Components Programmatically

    makeComponent(name, source, url, preserve_source); // preserve_source are optional

Create a component with the specified name, source code, and url. Use preserve_source if
you want the component's source code kept for debugging purposes.

`makeComponent` is used internally by component to create components, and by the documentation
system to create components interactively. In general you won't need to use this method at all.

## Singleton Components

    b8r.componentOnce(url [,name]);

This loads the component (if necessary) and then if there is no instance of the component
in the DOM it creates one. It replaces the pattern:

    b8r.component(url).then(c => b8r.insertComponent(c));

And doesn't run the risk of leaking multiple instances of components into the DOM.

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

If a component has a property named `destroy` (and it's a method) it will
be called just before the instance is removed from the registry.
*/

const components = {};
const component_timeouts = [];
const component_promises = {};

const View = makeWebComponent('b8r-component', {
  attributes: {
    name: '',
  },
  methods: {
    render () {
      if (this.name) {
        b8r.insertComponent(this.name, this); 
      } else {
        b8r.removeComponent(this);
      }
    },
  }
});

const makeComponent = function(name, source, url, preserve_source) {
  let css = false, content, script = false, parts, remains;

  if (!url) url = uuid();

  // nothing <style> css </style> rest-of-component
  parts = source.split(/<style>|<\/style>/);
  if (parts.length === 3) {
    [, css, remains] = parts;
  } else {
    remains = source;
  }

  // content <script> script </script> nothing
  parts = remains.split(/<script>|<\/script>/);
  if (parts.length === 3) {
    [content, script] = parts;
  } else {
    content = remains;
  }

  const div$$1 = create('div');
  div$$1.innerHTML = content;
  /*jshint evil: true */
  let load = () => console.error('component', name, 'cannot load properly');
  if (script && script.match(/require\s*\(/) && ! script.match(/electron-require/)) {
    console.error(`in component "${name}" replace require with await import()`);
    script = false;
  }
  try {
    load = script ?
             new AsyncFunction(
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
              ) :
              false;
  } catch(e) {
    console.error('error creating load method for component', name, e, script);
    throw `component ${name} load method could not be created`;
  }
  /*jshint evil: false */
  const class_name = `${name}-component`;
  const style = css ? makeStyleSheet(css.replace(/_component_/g, class_name), class_name) : false;
  const update_classes = elt => elt.setAttribute('class', elt.getAttribute('class').replace(/_component_/g, class_name));
  findWithin(div$$1, '[class*="_component_"]').forEach(update_classes);
  const component = {
    name,
    style,
    view : div$$1,
    load,
    path : url.split('/').slice(0,-1).join('/'),
  };
  if (component.path === 'undefined') {
    debugger; // eslint-disable-line no-debugger
  }
  if (preserve_source) {
    component._source = source;
  }
  if (component_timeouts[name]) {
    clearInterval(component_timeouts[name]);
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
      async_update(false, element);
    }
  });
  return component;
};

// path/to/../foo -> path/foo
const collapse = path => {
  while (path.match(/([^/]+\/\.\.\/)/)) {
    path = path.replace(/([^/]+\/\.\.\/)/g, '');
  }
  return path;
};

const component$1 = (name, url, preserve_source=false) => {
  if (url === undefined) {
    url = name;
    name = url.split('/').pop();
  }
  if (!component_promises[name] || preserve_source) {
    if (! url) throw `expected component ${name} to be defined`;
    url = collapse(url);
    component_promises[name] = new Promise(function(resolve, reject) {
      if (components[name] && !preserve_source) {
        resolve(components[name]);
      } else {
        ajax(`${url}.component.html`)
        .then(source => resolve(makeComponent(name, source, url, preserve_source)))
        .catch(err => {
          delete component_promises[name];
          console.error(err, `failed to load component ${url}`);
          reject(err);
        });
      }
    });
  }
  return component_promises[name];
};

/**
#bindinator
Copyright ©2016-2017 Tonio Loewald

Bindinator (b8r) binds data and methods to the DOM and lets you quickly turn chunks of
markup, style, and code into reusable components so you can concentrate on your project.

b8r leverages your understanding of the DOM and the browser rather than trying to
implement some kind of virtual machine to replace it.

## Core Functionality
- [The Registry](#source=source/b8r.registry.js)
- [Binding Data](#source=source/b8r.bindings.js)
  - [toTargets](#source=source/b8r.toTargets.js)
  - [fromTargets](#source=source/b8r.fromTargets.js)
- [Events](#source=source/b8r.events.js)
  - [keystroke](#source=source/b8r.keystroke.js)
- [Components](#source=source/b8r.component.js)

## Utilities
- [AJAX](#source=source/b8r.ajax.js)
- [DOM Utilities](#source=source/b8r.dom.js)
- [Functions](#source=source/b8r.functions.js)
- [Iterators](#source=source/b8r.iterators.js)
- [Showing and Hiding](#source=source/b8r.show.js)
- [Performance Logging](#source=source/b8r.perf.js)
*/

const b8r$1 = {};

Object.assign(b8r$1, _dom);
Object.assign(b8r$1, _perf);
Object.assign(b8r$1, _iterators);
Object.assign(b8r$1, { on, off, enable, disable, trigger, callMethod, implicitlyHandleEventsOfType });
Object.assign(b8r$1, {addDataBinding, removeDataBinding, getDataPath, getComponentId, getListInstancePath});
Object.assign(b8r$1, {onAny, offAny, anyListeners});
Object.assign(b8r$1, _registry);
b8r$1.observe(() => true, (path, source_element) => b8r$1.touchByPath(path, source_element));
b8r$1.keystroke = keystroke;
b8r$1.modifierKeys = modifierKeys;

Object.assign(b8r$1, _functions);

b8r$1.cleanupComponentInstances = b8r$1.debounce(() => {
  // garbage collect models
  b8r$1.forEachKey(_component_instances, (element, component_id) => {
    if (!b8r$1.isInBody(element) || element.dataset.componentId !== component_id) {
      delete _component_instances[component_id];
    }
  });
  b8r$1.models().forEach(model => {
    if (model.substr(0, 2) === 'c#' && !_component_instances[model]) {
      b8r$1.call_if(`${model}.destroy`);
      b8r$1.remove(model, false);
    }
  });
}, 100);
Object.assign(b8r$1, {async_update, after_update, touchElement, touchByPath});

b8r$1.force_update = () => {
  let update_list;

  while(update_list = get_update_list()) { // eslint-disable-line no-cond-assign
    const lists = b8r$1.find('[data-list]').
                      map(elt => { return {elt, list_binding: elt.dataset.list}; });
    let binds = false; // avoid collecting elements before big list updates

    while(update_list.length) {
      const {path, source} = update_list.shift();
      try {
        if (path) {
          lists.
            filter(bound => bound.elt !== source && bound.list_binding.includes(path)).
            forEach(({elt}) => bindList(elt));

          if (! binds) binds = b8r$1.find('[data-bind]').
                                   map(elt => { return {elt, data_binding: elt.dataset.bind}; });

          binds.
            filter(bound => bound.elt !== source && bound.data_binding.includes(path)).
            forEach(rec => rec.dirty = true);
        } else {
          b8r$1.bindAll(source);
        }
      } catch (e) {
        console.error('update error', e, {path, source});
      }
    }
    if (binds) binds.forEach(({elt, dirty}) => dirty && bind(elt));
  }

  b8r$1.cleanupComponentInstances();

  _after_update();
};

_set_force_update(b8r$1.force_update);

b8r$1.setByPath = function(...args) {
  let name, path, value, source_element;
  if (args.length === 2 && typeof args[1] === 'object' && !Array.isArray(args[1])) {
    [name, value] = args;
    b8r$1.forEachKey(value, (val, path) => b8r$1.setByPath(name, path, val));
    return;
  } else if (args.length === 2 || args[2] instanceof Element) {
    [path, value, source_element] = args;
    path = b8r$1.resolvePath(path, source_element);
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, source_element] = args;
  }
  if (b8r$1.registered(name)) {
    // const model = b8r.get(name);
    if (typeof path === 'object') {
      // Object.assign(model, path);
      // b8r.touchByPath(name, '/', source_element);
      b8r$1.set(name, path, source_element);
    } else {
      // setByPath(model, path, value);
      // b8r.touchByPath(name, path, source_element);
      b8r$1.set(
        path[0] === '[' || !path ?
        `${name}${path}` :
        `${name}.${path}`, value, source_element
      );
    }
  } else {
    console.error(`setByPath failed; ${name} is not a registered model`);
  }
};

b8r$1.pushByPath = function(...args) {
  let name, path, value, callback;
  if (args.length === 2 || typeof args[2] === 'function') {
    [path, value, callback] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, callback] = args;
  }
  if (b8r$1.registered(name)) {
    const list = b8r$1.get(path ? `${name}.${path}` : name);
    list.push(value);
    if (callback) {
      callback(list);
    }
    b8r$1.touchByPath(name, path);
  } else {
    console.error(`pushByPath failed; ${name} is not a registered model`);
  }
};

b8r$1.unshiftByPath = function(...args) {
  let name, path, value;
  if (args.length === 2) {
    [path, value] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value] = args;
  }
  if (b8r$1.registered(name)) {
    const list = getByPath(b8r$1.get(name), path);
    list.unshift(value);
    b8r$1.touchByPath(name, path);
  } else {
    console.error(`unshiftByPath failed; ${name} is not a registered model`);
  }
};

b8r$1.removeListInstance = function(elt) {
  elt = elt.closest('[data-list-instance]');
  if (elt) {
    const ref = elt.dataset.listInstance;
    try {
      const [, model, path, key] = ref.match(/^([^.]+)\.(.+)\[([^\]]+)\]$/);
      b8r$1.removeByPath(model, path, key);
    } catch (e) {
      console.error('cannot find list item for instance', ref);
    }
  } else {
    console.error('cannot remove list instance for', elt);
  }
};

function indexFromKey(list, key) {
  if (typeof key === 'number') {
    return key;
  }
  const [id_path, value] = key.split('=');
  return list.findIndex(elt => getByPath(elt, id_path) == value);
}

b8r$1.removeByPath = function(...args) {
  let name, path, key;
  if (args.length === 2) {
    [path, key] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, key] = args;
  }
  if (b8r$1.registered(name)) {
    const list = getByPath(b8r$1.get(name), path);
    const index = indexFromKey(list, key);
    if (Array.isArray(list) && index > -1) {
      list.splice(index, 1);
    } else {
      delete list[key];
    }
    b8r$1.touchByPath(name, path);
  }
};

b8r$1.listItems = element =>
  b8r$1.makeArray(element.children)
    .filter(elt => elt.matches('[data-list-instance]'));
b8r$1.listIndex = element =>
  b8r$1.listItems(element.parentElement).indexOf(element);

b8r$1.getComponentData = (elt, type) => {
  const id$$1 = getComponentId(elt, type);
  return id$$1 ? b8r$1.get(id$$1) : null;
};

b8r$1.setComponentData = (elt, path, value) => {
  const id$$1 = getComponentId(elt);
  b8r$1.setByPath(id$$1, path, value);
};

b8r$1.getData = elt => {
  const dataPath = b8r$1.getDataPath(elt);
  return dataPath ? b8r$1.get(dataPath, elt) : null;
};

b8r$1.getListInstance = elt => {
  const instancePath = b8r$1.getListInstancePath(elt);
  return instancePath ? b8r$1.get(instancePath, elt) : null;
};

if (document.body) {
  implicit_event_types.
  forEach(type => document.body.addEventListener(type, handle_event, true));
} else {
  document.addEventListener('DOMContentLoaded', () => {
    implicit_event_types.
    forEach(type => document.body.addEventListener(type, handle_event, true));
  });
}

const toTargets = _toTargets(b8r$1);

b8r$1.onAny(['change', 'input'], '_b8r_._update_');

b8r$1.interpolate = (template, elt) => {
  let formatted;
  if (template.match(/\$\{[^{]*?\}/)) {
    formatted = template;
    do {
      formatted = formatted.replace(/\$\{([^{]*?)\}/g, (_, path) => {
        const value = b8r$1.get(path, elt);
        return value !== null ? value : '';
      });
    } while (formatted.match(/\$\{[^{]*?\}/));
  } else {
    const paths = splitPaths(template);
    if (paths.indexOf('') > -1) {
      throw `empty path in binding ${template}`;
    }
    formatted = paths.map(path => b8r$1.get(path, elt));
    if (formatted.length === 1) {
      formatted = formatted[0];
    }
  }
  return formatted;
};

const _unequal = (a, b) => (a !== b) || (a && typeof a === 'object');

function bind(element) {
  if (element.closest('[data-component],[data-list]')) {
    return;
  }
  const bindings = getBindings(element);
  const boundValues = element._b8r_boundValues || (element._b8r_boundValues = {});
  const newValues = {};
  for (let i = 0; i < bindings.length; i++) {
    const { targets, path } = bindings[i];
    const value = b8r$1.interpolate(path, element);
    const existing = boundValues[path];
    if (_unequal(existing, value)) {
      newValues[path] = value;
      const _toTargets$$1 = targets.filter(t => toTargets[t.target]);
      if (_toTargets$$1.length) {
        _toTargets$$1.forEach(t => {
          toTargets[t.target](element, value, t.key);
        });
      } else {
        console.warn(`unrecognized toTarget in binding`, element, bindings[i]);
      }
    }
  }
  Object.assign(boundValues, newValues);
}
b8r$1.show = show;
b8r$1.hide = hide;

const forEachItemIn = (obj, id_path, func) => {
  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      const item = obj[i];
      func(item, id_path ? `${id_path}=${getByPath(item, id_path)}` : i);
    }
  } else if (obj.constructor === Object) {
    if (id_path) {
      throw `id-path is not supported for objects bound as lists`;
    }
    const keys = Object.keys(obj);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      func(obj[key], `=${key}`);
    }
  } else if (obj !== null) {
    throw 'can only bind Array and Object instances as lists';
  }
};

let id_count = 0; // used to assign unique ids as required
function bindList(list_template, data_path) {
  list_template.classList.add('-b8r-empty-list');
  if (
    ! list_template.parentElement ||                            // skip if disembodied
    list_template.parentElement.closest('[data-component]') ||  // or it's in an unloaded component
    list_template.parentElement.closest('[data-list]')          // or it's in a list template
  ) {
    return;
  }
  const [source_path, id_path] = list_template.dataset.list.split(':');
  let method_path, list_path, arg_paths;
  try {
    // parse computed list method if any
    [, , method_path, arg_paths] =
      source_path.match(/^(([^()]*)\()?([^()]*)(\))?$/);
    arg_paths = arg_paths.split(',');
    list_path = arg_paths[0];
  } catch (e) {
    console.error('bindList failed; bad source path', source_path);
  }
  if (data_path) {
    list_path = data_path + list_path;
  }
  const resolved_path = b8r$1.resolvePath(list_path, list_template);
  // rewrite the binding if necessary (otherwise nested list updates fail)
  if (resolved_path !== list_path) {
    let list_binding = list_path = resolved_path;
    if (method_path) {
      arg_paths[0] = list_path;
      list_binding = `${method_path}(${arg_paths.join(',')})`;
    }
    list_template.dataset.list = id_path ? `${list_binding}:${id_path}` : list_binding;
  }
  let list = b8r$1.get(list_path);
  if (!list) {
    return;
  }
  // assign unique ids if _auto_ id-path is specified
  if (id_path === '_auto_') {
    for(let i = 0; i < list.length; i++) {
      if (!list[i]._auto_) {
        list[i]._auto_ = ++id_count;
      }
    }
  }
  // compute list
  if (method_path) {
    if (!b8r$1.get(method_path)) {
      // method_path is not yet available; when it becomes available it will trigger
      // the binding so we can ignore it for now
      return;
    }
    (() => {
      try {
        const args = arg_paths.map(b8r$1.get);
        const filtered_list = b8r$1.callMethod(method_path, ...args, list_template);
        // debug warning for lists that get "filtered" into new objects
        if (
          Array.isArray(list) &&
          filtered_list.length &&
          list.indexOf(filtered_list[0]) === -1
        ) {
          console.warn(
            `list filter ${method_path} returned a new object` +
            ` (not from original list); this will break updates!`
          );
        }
        list = filtered_list;
      } catch (e) {
        console.error(`bindList failed, ${method_path} threw error`, e);
      }
    })();
    if (!list) {
      throw 'could not compute list; async filtered list methods not supported (yet)';
    }
  }

  b8r$1.show(list_template);
  // efficient list update:
  // if we have an id_path we grab existing instances, and re-use those with
  // matching ids
  const existing_list_instances = list_template._b8r_listInstances || {};
  const list_instances = list_template._b8r_listInstances = {};

  const template = list_template.cloneNode(true);
  template.classList.remove('-b8r-empty-list');
  delete template.dataset.list;

  /* Safari refuses to hide hidden options */
  if (list_template.tagName === 'OPTION') {
    list_template.setAttribute('disabled', '');
    list_template.textContent = '';
    template.removeAttribute('disabled');
  }

  let previous_instance = list_template;
  let instance;
  let list_content_changed = false;

  const ids = {};
  list_template.classList.toggle('-b8r-empty-list', ! list.length);
  forEachItemIn(list, id_path, (item, id$$1) => {
    if (ids[id$$1]) {
      console.warn(`${id$$1} not unique ${id_path} in ${list_template.dataset.list}`);
      return;
    }
    ids[id$$1] = true;
    const itemPath = `${list_path}[${id$$1}]`;
    instance = existing_list_instances[itemPath];
    if (instance === undefined) {
      list_content_changed = true;
      instance = template.cloneNode(true);
      instance.dataset.listInstance = itemPath;
      instance._b8r_listInstance = item;
      list_template.parentElement.insertBefore(instance, previous_instance);
      resolveListInstanceBindings(instance, itemPath);
      b8r$1.bindAll(instance);
    } else {
      delete existing_list_instances[itemPath];
      if (instance.nextSibling !== previous_instance) {
        list_template.parentElement.insertBefore(instance, previous_instance);
      }
    }
    list_instances[itemPath] = instance;
    previous_instance = instance;
  });
  b8r$1.forEachKey(existing_list_instances, elt => {
    list_content_changed = true;
    elt.remove();
  });
  // for <select> elements and components whose possible values may be dictated by their children
  // we trigger a 'change' event in the parent element.
  if (list_content_changed) b8r$1.trigger('change', list_template.parentElement);
  b8r$1.hide(list_template);
}

b8r$1.bindAll = (element, data_path) => {
  loadAvailableComponents(element, data_path);
  findBindables(element).forEach(elt => bind(elt));
  findLists(element).forEach(elt => bindList(elt, data_path));
};

_b8r_(b8r$1);

Object.assign(b8r$1, _ajax);
Object.assign(b8r$1, _sort);

const _path_relative_b8r = _path => {
  return !_path ? b8r$1 : Object.assign({}, b8r$1, {
    _path,
    component: (...args) => {
      const path_index = args[1] ? 1 : 0;
      let url = args[path_index];
      if (url.indexOf('://') === -1) {
        url = `${_path}/${url}`;
        args[path_index] = url;
      }
      return b8r$1.component(...args);
    }
  });
};
Object.assign(b8r$1, {component: component$1, makeComponent});

b8r$1.components = () => Object.keys(components);

function loadAvailableComponents(element, data_path) {
  b8r$1.findWithin(element || document.body, '[data-component]', true)
    .forEach(target => {
      if (!target.closest('[data-list]') &&
          !target.dataset.componentId) {
        const name = target.dataset.component;
        b8r$1.insertComponent(name, target, data_path);
      }
    });
}

b8r$1._DEPRECATED_COMPONENTS_PASS_DOWN_DATA = false;
const inheritData = element => {
  const reserved = ['destroy']; // reserved lifecycle methods
  const selector = b8r$1._DEPRECATED_COMPONENTS_PASS_DOWN_DATA ?
                   '[data-path],[data-list-instance],[data-component-id]' :
                   '[data-path],[data-list-instance]';
  const source = element.closest(selector);
  if (! source) {
    return null;
  } else {
    const data = b8r$1.get(source.dataset.componentId || b8r$1.getDataPath(source));
    return b8r$1.filterObject(
      data || {},
      (v, k) => (! reserved.includes(k)) || typeof v !== 'function'
    );
  }
};

let component_count = 0;
const _component_instances = {};
b8r$1.insertComponent = async function(component, element, data) {
  const data_path = typeof data === 'string' ? data : b8r$1.getDataPath(element);
  if (!element) {
    element = b8r$1.create('div');
  } else if (! b8r$1.isInBody(element)) {
    return;
  }
  if (typeof component === 'string') {
    if (!components[component]) {
      if (!component_timeouts[component]) {
        // if this doesn't happen for five seconds, we have a problem
        component_timeouts[component] = setTimeout(
          () => console.error('component timed out: ', component), 5000);
      }
      if (data) {
        saveDataForElement(element, data);
      }
      element.dataset.component = component;
      return;
    }
    component = components[component];
  }
  if (element.dataset.component) {
    delete element.dataset.component;
  }
  if (!data || data_path) {
    data = dataForElement(element) || inheritData(element) || {};
  }
  if (element.parentElement === null) {
    document.body.appendChild(element);
  }
  const children = b8r$1.fragment();
  /*
    * if you're replacing a component, it should get the replaced component's children.
    * we probably want to be able to remove a component (i.e. pull out an instance's
      children and then delete element's contents, replace the children, and remove
      its id)
    * note that components with no DOM nodes present a problem since they may have
      passed-through child elements that aren't distinguishable from a component's
      original body
  */
  const component_id = 'c#' + component.name + '#' + (++component_count);
  if (component.view.children.length) {
    if (element.dataset.componentId) {
      if (element.querySelector('[data-children]')) {
        b8r$1.moveChildren(element.querySelector('[data-children]'), children);
      } else {
        b8r$1.empty(element);
      }
    } else {
      b8r$1.moveChildren(element, children);
    }
    const source = component.view.querySelector('[data-parent]') || component.view;
    b8r$1.copyChildren(source, element);
    replaceInBindings(element, '_component_', component_id);
    if (data_path) {
      replaceInBindings(element, '_data_', data_path);
    }
    const children_dest = b8r$1.findOneWithin(element, '[data-children]');
    if (children.firstChild && children_dest) {
      b8r$1.empty(children_dest);
      b8r$1.moveChildren(children, children_dest);
    }
  }
  element.dataset.componentId = component_id;
  _component_instances[component_id] = element;
  b8r$1.makeArray(element.classList).forEach(c => {
    if (c.substr(-10) === '-component') {
      element.classList.remove(c);
    }
  });
  element.classList.add(component.name + '-component');
  if (data_path) {
    element.dataset.path = data_path;
  }
  const register$$1 = component_data => b8r$1.register(component_id, component_data);
  data = Object.assign({}, data, {data_path, component_id});
  if (component.load) {
    const get$$1 = path => b8r$1.getByPath(component_id, path);
    const set$$1 = (...args) => {
      b8r$1.setByPath(component_id, ...args);
      // updates value bindings
      if (args[0] === 'value' || args[0].hasOwnProperty('value')) {
        b8r$1.trigger('change', element);
      }
    };
    const on$$1 = (...args) => b8r$1.on(element, ...args);
    const touch$$1 = path => b8r$1.touchByPath(component_id, path);
    b8r$1.register(component_id, data, true);
    try {
      await component.load(
        element, _path_relative_b8r(component.path), selector => b8r$1.findWithin(element, selector),
        selector => b8r$1.findOneWithin(element, selector), data, register$$1,
        get$$1, set$$1, on$$1, touch$$1, component
      );
    } catch(e) {
      debugger; // eslint-disable-line no-debugger
      console.error('component', component.name, 'failed to load', e);
    }
  } else {
    b8r$1.register(component_id, data, true);
  }
  b8r$1.bindAll(element);
};

b8r$1.wrapWithComponent = (component, element, data, attributes) => {
  const wrapper = b8r$1.create('div');
  if (attributes) {
    b8r$1.forEachKey(attributes, (val, prop) => wrapper.setAttribute(prop, val));
  }
  b8r$1.wrap(element, wrapper);
  b8r$1.insertComponent(component, wrapper, data);
  return wrapper;
};

b8r$1.removeComponent = elt => {
  if (elt.dataset.componentId) {
    delete elt.dataset.componentId;
    b8r$1.makeArray(elt.classList).forEach(c => {
      if (/-component$/.test(c)) {
        elt.classList.remove(c);
        b8r$1.empty(elt);
      }
    });
    b8r$1.cleanupComponentInstances();
  }
};

b8r$1.componentOnce = function(...args) {
  // may be switched out for relative version
  this.component(...args).then(c => {
    if (!b8r$1.findOne(`[data-component-id*="${c.name}"]`)) {
      b8r$1.insertComponent(c);
    }
  });
};

var b8r$2 = /*#__PURE__*/Object.freeze({
  default: b8r$1
});

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

var dateFormat = function () {
  var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
    timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
    timezoneClip = /[^-+\dA-Z]/g,
    pad = function (val, len) {
      val = String(val);
      len = len || 2;
      while (val.length < len) val = "0" + val;
      return val;
    };

  // Regexes and supporting functions are cached through closure
  return function (date, mask, utc) {
    var dF = dateFormat;

    // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
    if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
      mask = date;
      date = undefined;
    }

    // Passing date through Date applies Date.parse, if necessary
    date = date ? new Date(date) : new Date;
    if (isNaN(date)) throw SyntaxError("invalid date");

    mask = String(dF.masks[mask] || mask || dF.masks["default"]);

    // Allow setting the utc argument via the mask
    if (mask.slice(0, 4) == "UTC:") {
      mask = mask.slice(4);
      utc = true;
    }

    var _ = utc ? "getUTC" : "get",
      d = date[_ + "Date"](),
      D = date[_ + "Day"](),
      m = date[_ + "Month"](),
      y = date[_ + "FullYear"](),
      H = date[_ + "Hours"](),
      M = date[_ + "Minutes"](),
      s = date[_ + "Seconds"](),
      L = date[_ + "Milliseconds"](),
      o = utc ? 0 : date.getTimezoneOffset(),
      flags = {
        d:    d,
        dd:   pad(d),
        ddd:  dF.i18n.dayNames[D],
        dddd: dF.i18n.dayNames[D + 7],
        m:    m + 1,
        mm:   pad(m + 1),
        mmm:  dF.i18n.monthNames[m],
        mmmm: dF.i18n.monthNames[m + 12],
        yy:   String(y).slice(2),
        yyyy: y,
        h:    H % 12 || 12,
        hh:   pad(H % 12 || 12),
        H:    H,
        HH:   pad(H),
        M:    M,
        MM:   pad(M),
        s:    s,
        ss:   pad(s),
        l:    pad(L, 3),
        L:    pad(L > 99 ? Math.round(L / 10) : L),
        t:    H < 12 ? "a"  : "p",
        tt:   H < 12 ? "am" : "pm",
        T:    H < 12 ? "A"  : "P",
        TT:   H < 12 ? "AM" : "PM",
        Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
        o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
        S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
      };

    return mask.replace(token, function ($0) {
      return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
    });
  };
}();

// Some common format strings
dateFormat.masks = {
  "default":      "ddd mmm dd yyyy HH:MM:ss",
  shortDate:      "m/d/yy",
  mediumDate:     "mmm d, yyyy",
  longDate:       "mmmm d, yyyy",
  fullDate:       "dddd, mmmm d, yyyy",
  shortTime:      "h:MM TT",
  mediumTime:     "h:MM:ss TT",
  longTime:       "h:MM:ss TT Z",
  isoDate:        "yyyy-mm-dd",
  isoTime:        "HH:MM:ss",
  isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
  isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
  dayNames: [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ],
  monthNames: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
  return dateFormat(this, mask, utc);
};

var date_format = /*#__PURE__*/Object.freeze({

});

export default b8r$1;
