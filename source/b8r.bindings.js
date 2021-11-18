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
/* global console */

import { findWithin, succeeding } from './b8r.dom.js'
import { touchElement } from './b8r.update.js'

export const UNLOADED_COMPONENT_SELECTOR =
  '[data-component],[data-initializing],b8r-component:not([data-component-id])'
export const UNREADY_SELECTOR = `[data-list],${UNLOADED_COMPONENT_SELECTOR}`

const addDataBinding = (element, toTarget, path) => {
  path = path.replace(/\b_component_\b/g, getComponentId(element))
  const binding = `${toTarget}=${path}`
  const existing = (element.dataset.bind || '')
    .split(';').map(s => s.trim()).filter(s => !!s)
  if (existing.indexOf(binding) === -1) {
    existing.push(binding)
    element.dataset.bind = existing.join(';')
    delete element._b8rBoundValues
    touchElement(element)
  }
}

const removeDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`
  var existing =
      (element.dataset.bind || '').split(';').map(s => s.trim())
  if (existing.indexOf(binding) > -1) {
    existing = existing.filter(exists => exists !== binding)
    if (existing.length) {
      element.dataset.bind = existing.join(';')
    } else {
      if (element.dataset.bind) {
        delete element.dataset.bind
      }
    }
    delete element._b8rBoundValues
  }
}

const parseBinding = binding => {
  if (!binding.trim()) {
    throw new Error('empty binding')
  }
  if (binding.indexOf('=') === -1) {
    throw new Error(`binding "${binding}" is missing = sign; probably need a source or target`)
  }
  const [, targetsRaw, path] =
      binding.trim().match(/^([^=]*?)=([^;]*)$/m).map(s => s.trim())
  const targets = targetsRaw.split(',').map(target => {
    var parts = target.match(/([\w#\-.]+)(\(([^)]+)\))?/)
    if (!parts) {
      console.debug('b8r-error', 'bad target', target, 'in binding', binding)
      return
    }
    if (!parts) return null
    if (parts[1].includes('.')) return { target: 'method', key: parts[1] }
    return { target: parts[1], key: parts[3] }
  })
  if (!path) {
    console.debug('b8r-error', 'binding does not specify source', binding)
  }
  return { targets, path }
}

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

const splitPaths = paths => paths.match(/(([^,([]+\.?)|(\[[^\]]+\]\.?)|\([^)]+\))+/g)

const findBindables = element => findWithin(element, '[data-bind]', true)

const findLists = element => findWithin(element, '[data-list]', true)

const getBindings = element => {
  try {
    return element.dataset.bind
      // separate bindings with ';' for consistency
      .replace(/\n\s*([\w#\-.,]+)(\([^)]*\))?=/g, ';$1$2=')
      .split(';')
      .filter(s => !!s.trim())
      .map(parseBinding)
  } catch (e) {
    console.debug('b8r-error', element, e)
    return []
  }
}

const getDataPath = element => {
  const dataParent = element ? element.closest('[data-path],[data-list-instance]') : false
  const path = dataParent ? (dataParent.dataset.path || dataParent.dataset.listInstance) : ''
  return ['.', '['].indexOf(path[0]) === -1 ? path : getDataPath(dataParent.parentElement) + path
}

const getListPath = element => {
  const listInstanceElement = element.closest('[data-list-instance]')
  const listTemplate = listInstanceElement && succeeding(listInstanceElement, '[data-list]')
  return listTemplate && listTemplate.dataset.list.split(':')[0]
}

const getListInstancePath = element => {
  const component = element.closest('[data-list-instance]')
  return component ? component.dataset.listInstance : null
}

const getComponentId = (element, type) => {
  if (type) {
    element = element.closest(`.${type}-component`)
  }
  const component = element.closest('[data-component-id]')
  return component ? component.dataset.componentId : null
}

const replaceInBindings = (element, needle, replacement) => {
  const needleRegexp = new RegExp(`\\b${needle}\\b`, 'g')
  findWithin(element, `[data-bind*="${needle}"],[data-list*="${needle}"],[data-path*="${needle}"]`)
    .forEach(elt => {
      const unreadyParent = elt.closest(UNREADY_SELECTOR)
      if (unreadyParent && unreadyParent !== element) {
        return
      }
      ['data-bind', 'data-list', 'data-path'].forEach(attr => {
        const val = elt.getAttribute(attr)
        if (val) {
          elt.setAttribute(attr, val.replace(needleRegexp, replacement))
        }
      })
    })
}

const resolveListInstanceBindings = (instanceElt, instancePath) => {
  findWithin(instanceElt, '[data-bind]', true)
    .filter(elt => !elt.closest('[data-list]'))
    .forEach(elt => {
      const bindingSource = elt.dataset.bind
      if (bindingSource.indexOf('=.') > -1) {
        elt.dataset.bind = bindingSource
          .replace(/=\.([^;\s]+)/g, `=${instancePath}.$1`)
          .replace(/=\./g, `=${instancePath}`)
      }
      if (bindingSource.indexOf('${.') > -1) {
        elt.dataset.bind = bindingSource
          .replace(/\$\{(\.[^}]+)\}/g, '${' + instancePath + '$1}')
      }
    })
}

export {
  addDataBinding,
  removeDataBinding,
  getDataPath,
  getListPath,
  getListInstancePath,
  getComponentId,
  parseBinding,
  findLists,
  findBindables,
  getBindings,
  replaceInBindings,
  resolveListInstanceBindings,
  splitPaths
}
