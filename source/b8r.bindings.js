/**
# Data Bindings

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

    <span data-bind="text=${_component_.firstName} ${_component_.lastName}">First Last</span>

```
<span data-bind="text=${_component_.firstName} ${_component_.lastName}">First Last</span>
<script>
  set({
    firstName: 'Juanita',
    lastName: 'Citizen',
  })
</script>
```

This only works in to-bindings (it won't parse DOM contents back into data
structures for you!).

## Lists

If you want to create one instance of an element for every member of a list
you can use a list binding. Again, this is just an attribute (`data-list`):

This example simply creates one instance of the `<img>` element for each
item in the registered list, which might look like: [{url: '...'}, ...].

Note the *relative* data binding.

    <img
      data-list="path.to.image_list"
      data-bind="imgSrc=.url"
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
            imgSrc=.image_url;
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

## Mystery Methods

Most of the other methods in this module are used internally. They're not
secret, private methods and their purposes should be self-explanatory.
*/
/* global module, require, console */
'use strict';

const {findWithin} = require('./b8r.dom.js');

const addDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  const existing =
      (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if (existing.indexOf(binding) === -1) {
    existing.push(binding);
    element.setAttribute('data-bind', existing.join(';'));
  }
};

const removeDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  var existing =
      (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if (existing.indexOf(binding) > -1) {
    existing = existing.filter(exists => exists !== binding);
    if (existing.length) {
      element.setAttribute('data-bind', existing.join(';'));
    } else {
      element.removeAttribute('data-bind');
    }
  }
};

const parseBinding = binding => {
  if (!binding.trim()) {
    throw 'empty binding';
  }
  if (binding.indexOf('=') === -1) {
    throw 'binding is missing = sign; probably need a source or target';
  }
  var [, targets, path] =
      binding.trim().match(/^([^=]*)=(.*)$/m).map(s => s.trim());
  targets = targets.split(',').map(function(target) {
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

const findBindables = element => {
  return findWithin(element, '[data-bind]', true).filter(elt => {
    var list = elt.closest('[data-list],[data-list-instance]');
    return !list || list === element || !element.contains(list);
  });
};

const findLists = element => {
  return findWithin(element, '[data-list]').filter(elt => {
    var list = elt.parentElement.closest('[data-list]');
    return !list || !element.contains(list);
  });
};

const getBindings = element => {
  return element.getAttribute('data-bind')
                .split(';')
                .filter(s => !!s.trim())
                .map(parseBinding);
};

const getDataPath = element => {
  const data_parent = element ? element.closest('[data-path],[data-list-instance]') : false;
  return data_parent ? (data_parent.getAttribute('data-path') || data_parent.getAttribute('data-list-instance')) : '';
};

const getListInstancePath = element => {
  const component = element.closest('[data-list-instance]');
  return component ? component.getAttribute('data-list-instance') : null;
};

const getComponentDataPath = element => {
  const component = element.closest('[data-component-id]');
  return component ? component.getAttribute('data-component-id') : null;
};

const replaceInBindings = (element, needle, replacement) => {
  const needle_regexp = new RegExp(needle, 'g');
  findWithin(element, `[data-bind*="${needle}"],[data-list*="${needle}"]`)
      .forEach(elt => {
        ['data-bind', 'data-list'].forEach(attr => {
          const val = elt.getAttribute(attr);
          if (val) {
            elt.setAttribute(attr, val.replace(needle_regexp, replacement));
          }
        });
      });
};

module.exports = {
  addDataBinding,
  removeDataBinding,
  getDataPath,
  getListInstancePath,
  getComponentDataPath,
  parseBinding,
  findLists,
  findBindables,
  getBindings,
  replaceInBindings,
};
