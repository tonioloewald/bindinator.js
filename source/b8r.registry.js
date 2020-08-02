/**
# The Registry

Bindinator is built around the idea of registering objects under unique names
and binding events and element properties to paths based on those names.

`b8r`'s **registry** is an **observable** object store that b8r uses to keep
track of objects. Once an object is registered, its properties will
automatically be bound to events and DOM properties by path. The goal is
for your registry to be your **model** and the **single source of truth**
for the state of your application.

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
~~~~

You can set the registry's properties by path. Root level properties must
themselves be objects.

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
      set('foo', {
        bar: [{id: 17, baz: 'hello world'}]
      })
    </script>
```

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
/* global console */

import { getByPath, setByPath, deleteByPath } from './b8r.byPath.js'
import { getDataPath, getComponentId, splitPaths } from './b8r.bindings.js'
import { matchType } from './b8r.byExample.js'
import { componentTypes } from './b8r.component.js'
import { _b8r_ } from './b8r._b8r_.js'
import { observerShouldBeRemoved } from './b8r.constants.js'

const registry = { _b8r_ }
const registeredTypes = {}
const listeners = [] // { path_string_or_test, callback }
const debugPaths = true
const validPath = /^\.?([^.[\](),])+(\.[^.[\](),]+|\[\d+\]|\[[^=[\](),]*=[^[\]()]+\])*$/

const isValidPath = path => validPath.test(path)

class Listener {
  constructor (test, callback) {
    this._orig_test = test // keep it around for unobserve
    if (typeof test === 'string') {
      this.test = t => typeof t === 'string' && t.startsWith(test)
    } else if (test instanceof RegExp) {
      this.test = test.test.bind(test)
    } else if (test instanceof Function) {
      this.test = test
    } else {
      throw new Error('expect listener test to be a string, RegExp, or test function')
    }
    if (typeof callback === 'string') {
      this.callback = (...args) => {
        if (get(callback)) {
          call(callback, ...args)
        } else {
          unobserve(this)
        }
      }
    } else if (typeof callback === 'function') {
      this.callback = callback
    } else {
      throw new Error('expect callback to be a path or function')
    }
    listeners.push(this)
  }
}

const resolvePath = (path, element) => {
  if (path[0] === '.') {
    if (!element) {
      throw new Error('cannot evaluate relative path without element')
    }
    path = getDataPath(element) + path
  } else if (path.substr(0, 6) === '_data_') {
    if (!element) {
      throw new Error('cannot evaluate _data_ path without element')
    }
    path = getDataPath(element) + path.substr(6)
  } else if (path.substr(0, 11) === '_component_') {
    if (!element) {
      throw new Error('cannot evaluate _component_ path without element')
    }
    path = getComponentId(element) + path.substr(11)
  }
  return path
}

const _compute = (expressionPath, element) => {
  const [, methodPath, valuePaths] = expressionPath.match(/([^(]+)\(([^)]+)\)/)
  return valuePaths.indexOf(',') === -1
    ? call(methodPath, get(valuePaths, element))
    : call(methodPath, ...get(valuePaths, element))
}

const _get = (path, element) => {
  if (path.substr(-1) === ')') {
    return _compute(path, element)
  } else if (path.startsWith('.')) {
    const elt = element && element.closest('[data-list-instance]')
    if (!elt && element.closest('body')) {
      console.error(`relative data-path ${path} used without list instance`, element)
    }
    return elt ? getByPath(registry, `${elt.dataset.listInstance}${path}`) : undefined
  } else {
    path = resolvePath(path, element)
    if (debugPaths && !isValidPath(path)) {
      console.error(`getting invalid path ${path}`)
    } else {
      return getByPath(registry, path)
    }
  }
}

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
  const paths = splitPaths(path)
  return paths.length === 1
    ? _get(paths[0], element)
    : paths.map(path => _get(path, element))
}

const getJSON = (path, element, pretty) => {
  const obj = get(path, element)
  const objects = []
  const replacer = (key, value) => {
    if (!value || typeof value !== 'object') {
      return value
    } else if (typeof value === 'object') {
      if (value.constructor !== Object && value.constructor !== Array) {
        return `[${value.constructor.name}]`
      } else if (objects.indexOf(value) === -1) {
        objects.push(value)
        return value
      } else {
        return '[duplicate or circular reference]'
      }
    }
  }
  return JSON.stringify(obj, replacer, pretty ? 2 : 0)
}

const touch = (path, sourceElement) => {
  listeners.filter(listener => {
    let heard
    try {
      heard = listener.test(path)
    } catch (e) {
      console.error(listener, 'test threw exception', e)
    }
    if (heard === observerShouldBeRemoved) {
      unobserve(listener)
      return false
    }
    return !!heard
  })
    .forEach(listener => {
      try {
        if (listener.callback(path, sourceElement) === observerShouldBeRemoved) {
          unobserve(listener)
        }
      } catch (e) {
        console.error(listener, 'callback threw exception', e)
      }
    })
}

const _defaultTypeErrorHandler = (errors, action) => {
  console.error(`registry type check(s) failed after ${action}`, errors)
}
let typeErrorHandlers = [_defaultTypeErrorHandler]
export const onTypeError = (callback) => {
  offTypeError(_defaultTypeErrorHandler)
  if (typeErrorHandlers.indexOf(callback) === -1) {
    typeErrorHandlers.push(callback)
    return true
  }
  return false
}
export const offTypeError = (callback, restoreDefault = false) => {
  const handlerCount = typeErrorHandlers.length
  typeErrorHandlers = typeErrorHandlers.filter(f => f !== callback)
  if (restoreDefault) onTypeError(_defaultTypeErrorHandler)
  return typeErrorHandlers.length !== handlerCount - 1
}

const checkType = (action, name) => {
  const referenceType = name.startsWith('c#') ? componentTypes[name.split('#')[1]] : registeredTypes[name]
  if (!referenceType || !registry[name]) return
  const errors = matchType(referenceType, registry[name], [], name, true)
  if (errors.length) {
    typeErrorHandlers.forEach(f => f(errors, action))
  }
}

const set = (path, value, sourceElement) => {
  if (debugPaths && !isValidPath(path)) {
    console.error(`setting invalid path ${path}`)
  }
  const pathParts = path.split(/\.|\[/)
  const [name] = pathParts
  const model = pathParts[0]
  const existing = getByPath(registry, path)
  if (pathParts.length > 1 && !registry[model]) {
    console.error(`cannot set ${path} to ${value}, ${model} does not exist`)
  } else if (pathParts.length === 1 && typeof value !== 'object') {
    throw new Error(`cannot set ${path}; you can only register objects at root-level`)
  } else if (value === existing) {
    // if it's an array then it might have gained or lost elements
    if (Array.isArray(value) || Array.isArray(existing)) {
      touch(path, sourceElement)
    }
  } else if (value && value.constructor) {
    if (pathParts.length === 1 && !registry[path]) {
      register(path, value)
    } else {
      // we only overlay vanilla objects, not custom classes or arrays
      if (value.constructor === Object && existing && existing.constructor === Object) {
        setByPath(registry, path, Object.assign(value, Object.assign(existing, value)))
      } else {
        setByPath(registry, path, value)
      }
      touch(path, sourceElement)
    }
  } else {
    setByPath(registry, path, value)
    touch(path, sourceElement)
  }
  checkType(`set('${path}',...)`, name)
  return value // convenient for push (see below) but maybe an anti-feature?!
}

const replace = (path, value) => {
  if (typeof value === 'object') setByPath(registry, path, null) // skip type checking
  set(path, value)
  return value
}

const types = () => JSON.parse(JSON.stringify({
  registeredTypes,
  componentTypes
}))

const registerType = (name, example) => {
  registeredTypes[name] = example
  checkType(`registerType('${name}')`, name)
}

const _register = (name, obj) => {
  registry[name] = obj
  checkType(`register('${name}')`, name)
}

const register = (name, obj, blockUpdates) => {
  if (name.match(/^_[^_]*_$/)) {
    throw new Error('cannot register object as ' + name +
      ', all names starting and ending with a single \'_\' are reserved.')
  }

  _register(name, obj)

  if (!blockUpdates) {
    touch(name)
  }
}

const setJSON = (path, value) => set(path, JSON.parse(value))

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
  const list = get(path) || set(path, [])
  if (Array.isArray(list)) {
    list.push(value)
    if (callback) {
      callback(list)
    }
    touch(path)
  }
}

const unshift = (path, value) => {
  const list = get(path) || set(path, [])
  if (Array.isArray(list)) {
    list.unshift(value)
    touch(path)
  }
}

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
</script>
```
*/

const sort = (path, comparison) => {
  const list = get(path) || set(path, [])
  if (Array.isArray(list)) {
    list.sort(comparison)
    touch(path)
  }
}

/**
    call('path.to.method', ...args);

Call a method by path with the arguments provided (and return result).
*/

const call = (path, ...args) => {
  const method = get(path)
  if (method instanceof Function) {
    return method(...args)
  } else {
    console.error(`cannot call ${path}; not a method`)
  }
}

/**
    callIf('path.to.method', ...args);

If a method is found at path, call it and return result, otherwise return null.
*/

const callIf = (path, ...args) => {
  const f = get(path)
  return f instanceof Function ? f(...args) : null
}

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
~~~~
*/

const observe = (test, callback) => {
  return new Listener(test, callback)
}

const unobserve = test => {
  let index
  let found = false
  if (test instanceof Listener) {
    index = listeners.indexOf(test)
    if (index > -1) {
      listeners.splice(index, 1)
    } else {
      console.error('unobserve failed, listener not found')
    }
  } else if (test) {
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i]._orig_test === test) {
        listeners.splice(i, 1)
        found = true
      }
    }
  }

  return found
}

/**
    registered('root-name'); // => true | false

You can get a list of root level objects:

    models();

You can obtain a value using a path.
*/

const models = () => Object.keys(registry)

const registered = path => !!registry[path.split('.')[0]]

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
const remove = (path, update = true) => {
  deleteByPath(registry, path)
  if (update) {
    touch(path);
    /* touch array containing the element if appropriate */
    [, path] = (path.match(/^(.+)\[[^\]]+\]$/) || [])
    if (path) { touch(path) }
  }
}

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

const zero = path => set(path, 0)

const increment = path => set(path, get(path) + 1)

const decrement = path => set(path, get(path) - 1)

const deregister = path => {
  console.warn('deregister is deprecated, use b8r.remove')
  remove(path)
}

const _getByPath = (model, path) =>
  get(path ? model + (path[0] === '[' ? path : '.' + path) : model)

export {
  get,
  getJSON,
  _getByPath as getByPath,
  set,
  replace,
  setJSON,
  increment, decrement, zero,
  push, unshift, sort,
  call, callIf,
  touch,
  observe,
  unobserve,
  models,
  _register,
  checkType,
  registerType,
  types,
  register,
  registered,
  remove,
  deregister,
  resolvePath,
  isValidPath
}
