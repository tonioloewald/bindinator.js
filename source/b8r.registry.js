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
Test(() => b8r.isValidPath('foo')).shouldBe(true);
Test(() => b8r.isValidPath('foo.bar')).shouldBe(true);
Test(() => b8r.isValidPath('.')).shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[1234]')).shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[=abcd]')).shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[id=1234]')).shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[id=1234].')).shouldBe(true);
Test(() => b8r.isValidPath('airtime-rooms[id=1234')).shouldBe(false);
Test(() => b8r.isValidPath('airtime-rooms[id]')).shouldBe(false);
Test(() => b8r.isValidPath('airtime-rooms[id=1234]]')).shouldBe(false);
Test(() => b8r.isValidPath('airtime-rooms]')).shouldBe(false);
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
/* jshint latedef:false */
/* global module, require, console */
'use strict';

const {getByPath, setByPath, deleteByPath} = require('./b8r.byPath.js');
const {getDataPath, getComponentInstancePath} = require('./b8r.bindings.js');
const {logStart, logEnd} = require('./b8r.perf.js');
const registry = {};
const listeners = [];  // { path_string_or_test, callback }
const debug_paths = true;

const valid_path = /^(\.|[^.\[\]])+(\.[^.\[\]]+|\[\d+\]|\[[^=\[\]]*\=[^\[\]]+\])*(\.)?$/;

const isValidPath = path => valid_path.test(path);

class Listener {
  constructor(test, callback) {
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
  } else if (path.substr() === '_component_') {
    if (!element) {
      throw 'cannot evaluate _component_ path without element';
    }
    path = getComponentInstancePath(element) + path;
  }
  return path;
};

const get = (path, element) => {
  path = resolvePath(path, element);
  if (debug_paths && ! isValidPath(path)) {
    console.error(`getting invalid path ${path}`);
  } else {
    return getByPath(registry, path);
  }
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
  logStart('touch', path);
  listeners.filter(listener => listener.test(path))
           .forEach(listener => listener.callback(path, source_element));
  logEnd('touch', path);
};

const set = (path, value, source_element) => {
  if (debug_paths && ! isValidPath(path)) {
    console.error(`setting invalid path ${path}`);
  }
  const path_parts = path.split(/\.|\[/);
  const model = path_parts[0];
  const existing = getByPath(registry, path);
  if (path_parts.length > 1 && !registry[model]) {
    console.error(`cannot set ${path} to ${value}, ${model} does not exist`);
  } else if (path_parts.length === 1 && typeof value !== 'object') {
    throw 'cannot set ${path}; you can only register objects at root-level';
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
    require.lazy('./b8r.events.js').then(({play_saved_messages}) => play_saved_messages(name));
  }
};

const setJSON = (path, value) => set(path, JSON.parse(value));

/**
    push('path.to.array', item);

To add an item to an array (and trigger the expected UI updates) simply push the
item to the path.

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

const push = (path, value) => {
  const list = get(path) || set(path, []);
  if(Array.isArray(list)) {
    list.push(value);
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
  </thead>
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

Call a method by path with the arguments provided.
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
  } else {
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i].test === test) {
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
    remove('root');
    remove('path.to.property')

Will remove the specified property from the registry (including root-level objects). If the object
does not exist, has no effect. So:

~~~~
const {register, remove, get} = b8r;
register('foo', {bar: 17, baz: {lurman: true}});
Test(() => {remove('foo.bar'); return get('foo.bar');}).shouldBe(null);
Test(() => {remove('foo.boris.yeltsin'); return get('foo.boris')}).shouldBe(null);
Test(() => {remove('foo.baz.lurman'); return Object.keys(get('foo.baz')).length}).shouldBe(0);
~~~~
*/
const remove = path => {
  deleteByPath(registry, path);
  touch(path);
  /* touch array containing the element if appropriate */
  [,path] = (path.match(/^(.+)\[[^\]]+\]$/) || []);
  if (path) { touch(path); }
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

module.exports = {
  get,
  getJSON,
  set,
  setJSON,
  increment, decrement, zero,
  push, unshift, sort,
  call,
  touch,
  observe,
  unobserve,
  models,
  _register,
  register,
  registered,
  remove,
  deregister: path => {
    console.warn('deregister is deprecated, use b8r.remove');
    remove(path);
  },
  resolvePath,
  isValidPath,
};
