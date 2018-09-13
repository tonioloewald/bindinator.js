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
/* jshint latedef:false */
/* global module, require, console */
'use strict';

const {getByPath, setByPath, deleteByPath} = require('./b8r.byPath.js');
const {getDataPath, getComponentId, splitPaths} = require('./b8r.bindings.js');
const {logStart, logEnd} = require('./b8r.perf.js');
const registry = {};
const listeners = [];  // { path_string_or_test, callback }
const debug_paths = true;
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
    if (debug_paths && ! isValidPath(path)) {
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
    require.lazy('./b8r.events.js').then(({play_saved_messages}) => play_saved_messages(name));
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

module.exports = {
  get,
  getJSON,
  set,
  setJSON,
  increment, decrement, zero,
  push, unshift, sort,
  call, call_if,
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
