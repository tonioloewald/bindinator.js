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
    b8r.set('path.to.array[id=17].foo', 'bar')

### How it's going

    b8r.reg['my-object'] = {foo: 17, bar: {baz: 'lurman'}}
    const text = b8r.reg.path.to.text
    b8r.reg.path.to.text = 'new string'
    b8r.reg.path.to.array.push({id: 17, name: 'new item'})   // also sort, find, forEach, etc.
    const itemByIdPath = b8r.reg.path.to.array['id=17']      // works!
    b8r.reg['path.to.array[id=17].foo'] = 'bar'              // works!!

Thanks to the magic of ES6 Proxy, `b8r` can finally have the syntax I
always wanted. Thank you to [Steven Williams](https://www.linkedin.com/in/steven-williams-2ba1124b/)
for the suggestion.

`b8r.reg` is a proxy for its `registry`, providing syntax-sugar for `get` and `set` via
an ES6 Proxy. The way the proxy works is that it gives you proxies for its object properties,
and so on (recursively), each proxy knowing the path of the value it wraps.

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
}, 'putting reg proxies into the registry via path is blocked').shouldThrow()
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
      throw new Error(
        'expect listener test to be a string, RegExp, or test function'
      )
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
      console.debug('b8r-error',
        `relative data-path ${path} used without list instance`,
        element
      )
    }
    return elt
      ? getByPath(registry, `${elt.dataset.listInstance}${path}`)
      : undefined
  } else {
    path = resolvePath(path, element)
    if (debugPaths && !isValidPath(path)) {
      console.debug('b8r-error', `getting invalid path ${path}`)
    } else {
      return getByPath(registry, path)
    }
  }
}

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
  listeners
    .filter(listener => {
      let heard
      try {
        heard = listener.test(path)
      } catch (e) {
        console.debug('b8r-error', listener, 'test threw exception', e)
      }
      if (heard === observerShouldBeRemoved) {
        unobserve(listener)
        return false
      }
      return !!heard
    })
    .forEach(listener => {
      try {
        if (
          listener.callback(path, sourceElement) === observerShouldBeRemoved
        ) {
          unobserve(listener)
        }
      } catch (e) {
        console.debug('b8r-error', listener, 'callback threw exception', e)
      }
    })
}

const _defaultTypeErrorHandler = (errors, action) => {
  console.debug('b8r-error', `registry type check(s) failed after ${action}`, errors)
}
let typeErrorHandlers = [_defaultTypeErrorHandler]
export const onTypeError = callback => {
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
  const referenceType = name.startsWith('c#')
    ? componentTypes[name.split('#')[1]]
    : registeredTypes[name]
  if (!referenceType || !registry[name]) return
  const errors = matchType(referenceType, registry[name], [], name, true)
  if (errors.length) {
    typeErrorHandlers.forEach(f => f(errors, action))
  }
}

const set = (path, value, sourceElement) => {
  if (value && value._b8r_sourcePath) {
    throw new Error('You cannot put reg proxies into the registry')
  }
  if (debugPaths && !isValidPath(path)) {
    console.debug('b8r-error', `setting invalid path ${path}`)
  }
  const pathParts = path.split(/\.|\[/)
  const [name] = pathParts
  const model = pathParts[0]
  const existing = getByPath(registry, path)
  if (pathParts.length > 1 && !registry[model]) {
    console.debug('b8r-error', `cannot set ${path} to ${value}, ${model} does not exist`)
  } else if (pathParts.length === 1 && typeof value !== 'object') {
    throw new Error(
      `cannot set ${path}; you can only register objects at root-level`
    )
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
      if (
        value.constructor === Object &&
        existing &&
        existing.constructor === Object
      ) {
        setByPath(
          registry,
          path,
          Object.assign(value, Object.assign(existing, value))
        )
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

const types = () =>
  JSON.parse(
    JSON.stringify({
      registeredTypes,
      componentTypes
    })
  )

const registerType = (name, example) => {
  registeredTypes[name] = example
  checkType(`registerType('${name}')`, name)
}

const _register = (name, obj) => {
  if (registry[name] && registry[name] !== obj) {
    console.debug('b8r-warn', `${name} already registered; if intended, remove() it first`)
    return
  }
  registry[name] = obj
  checkType(`register('${name}')`, name)
}

const register = (name, obj, blockUpdates) => {
  if (name.match(/^_[^_]*_$/)) {
    throw new Error(
      'cannot register object as ' +
        name +
        ", all names starting and ending with a single '_' are reserved."
    )
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
  const list = get(path) || []
  if (Array.isArray(list)) {
    list.push(value)
    if (callback) {
      callback(list)
    }
  }
  set(path, list)
}

const unshift = (path, value) => {
  const list = get(path) || []
  if (Array.isArray(list)) {
    list.unshift(value)
  }
  set(path, list)
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

  b8r.remove('test-people')
</script>
```
*/

const sort = (path, comparison) => {
  const list = get(path) || []
  if (Array.isArray(list)) {
    list.sort(comparison)
  }
  set(path, list)
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
    console.debug('b8r-error', `cannot call ${path}; not a method`)
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
}

const unobserve = test => {
  let index
  let found = false
  if (test instanceof Listener) {
    index = listeners.indexOf(test)
    if (index > -1) {
      listeners.splice(index, 1)
    } else {
      console.debug('b8r-error', 'unobserve failed, listener not found')
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
  const [, listPath] = path.match(/^(.*)\[[^[]*\]$/) || []
  if (listPath) {
    const list = getByPath(registry, listPath)
    const item = getByPath(registry, path)
    const index = list.indexOf(item)
    if (index !== -1) {
      list.splice(index, 1)
      if (update) touch(listPath)
    }
  } else {
    deleteByPath(registry, path)
    if (update) touch(path)
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

const zero = path => set(path, 0)

const increment = path => set(path, get(path) + 1)

const decrement = path => set(path, get(path) - 1)

const deregister = path => {
  console.debug('b8r-warn', 'deregister is deprecated, use b8r.remove')
  remove(path)
}

const _getByPath = (model, path) =>
  get(path ? model + (path[0] === '[' ? path : '.' + path) : model)

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
}

const regHandler = (path = '') => ({
  get (target, prop) {
    const compoundProp = typeof prop === 'symbol' 
                      ? prop.match(/^([^.[]+)\.(.+)$/) || // basePath.subPath (omit '.')
                        prop.match(/^([^\]]+)(\[.+)/) || // basePath[subPath
                        prop.match(/^(\[[^\]]+\])\.(.+)$/) || // [basePath].subPath (omit '.')
                        prop.match(/^(\[[^\]]+\])\[(.+)$/) // [basePath][subPath
                      : false
    if (compoundProp) {
      const [, basePath, subPath] = compoundProp
      const currentPath = extendPath(path, basePath)
      const value = getByPath(target, basePath)
      return value && typeof value === 'object' ? new Proxy(value, regHandler(currentPath))[subPath] : value
    }
    if (prop === '_b8r_sourcePath') {
      return path
    }
    if (prop === '_b8r_value') {
      return target
    }
    if (
      Object.prototype.hasOwnProperty.call(target, prop) ||
      (Array.isArray(target) && typeof prop === 'string' && prop.includes('='))
    ) {
      let value
      if (typeof prop === 'symbol') {
        value = target[prop]
      } if (prop.includes('=')) {
        const [idPath, needle] = prop.split('=')
        value = target.find(
          candidate => `${getByPath(candidate, idPath)}` === needle
        )
      } else {
        value = target[prop]
      }
      if (
        value &&
        typeof value === 'object' &&
        (value.constructor === Object || value.constructor === Array)
      ) {
        const currentPath = extendPath(path, prop)
        const proxy = new Proxy(value, regHandler(currentPath))
        return proxy
      } else if (typeof value === 'function') {
        return value.bind(target)
      } else {
        return value
      }
    } else if (Array.isArray(target)) {
      return typeof target[prop] === 'function'
        ? (...items) => {
          const result = Array.prototype[prop].apply(target, items)
          touch(path)
          return result
        }
        : target[prop]
    } else {
      return undefined
    }
  },
  set (target, prop, value) {
    if (value && value._b8r_sourcePath) {
      throw new Error('You cannot put reg proxies into the registry')
    }
    set(extendPath(path, prop), value)
    return true // success (throws error in strict mode otherwise)
  }
})

const reg = new Proxy(registry, regHandler())

export {
  get,
  getJSON,
  _getByPath as getByPath,
  set,
  replace,
  setJSON,
  increment,
  decrement,
  zero,
  push,
  unshift,
  sort,
  call,
  callIf,
  touch,
  observe,
  unobserve,
  models,
  _register,
  checkType,
  reg,
  registerType,
  types,
  register,
  registered,
  remove,
  deregister,
  resolvePath,
  isValidPath
}
