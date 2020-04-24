# b8r overview

<img src="./docs/images/binding.svg">

## paths

*The* key idea in `b8r` is of binding **things** (dom elements, events, values) to **paths**.

A **path** serves as the cut-out between concept and concrete values, allowing view elements and
the data you intend to populate them or the events you intend them to trigger to be decoupled cleanly.

## register, set, get, and replace — binding data to names

You bind values to names by **registering** objects to root **names**.

```
b8r.register('root', { test: 17 });
```

You can now *retrieve* the value 17 by using its **path** which is `root.test`.

```
b8r.get('root.test') // 17
```

You can *update* the value at the path:

```
b8r.set('root.test', Math.PI)
```

And you can *replace* an object inside the registry using `replace`:

```
b8r.set('root.infinity', Infinity)  // b8r.get('root.test') is still Math.PI
b8r.replace('root', {bar: 'baz'})   // b8r.get('root.test') and b8r.get('root.infinity') are gone
```

### register, set, and get — inside a component

Within a component's load method (its `<script>` if it's an HTML component) you have access to `register`, `get`, and `set`
which are local to the component.

```
<script> // assume this is inside a component's script tag
  b8r.set('someRoot.to.foo', 'hello') // sets the registry entry for "someRoot.to.foo" to "hello"
  set('to.foo', 'good-bye') // sets the registry entry for `\`${component.dataset.id}.to.foo\`` to "good-bye"
</script>
```

### touch

Sometimes you simply need to make changes directly. It might be for efficiency or convenience. Also, if
you change the order of elements in an array, there may be no other way around it.

In such cases you can simply tell `b8r` that you've changed something by calling `touch` on the path containing
the changes. E.g.

```
const bigArray = b8r.get('app.bigArray')
bigArray.sort(complexSortingFunction)
b8r.touch('app.bigArray')
```

### paths for array items

You can reference array items via **index**. This looks like an ordinary javascript array reference (e.g. `path.to.array[17]`):

```
b8r.set('root.list', [{name: 'Juanita'}, {name: 'Mahatma'}]);
b8r.get('root.list[0]') // {name: 'Juanita'}
b8r.get('root.list[1].name') // 'Mahatma'
```

You can also reference array item using an **id-path**, which compares a path within the item to a (stringified) value (e.g. `path.to.array[id=17]`:

```
b8r.set('root.list', [{id: 123, name: 'Juanita'}, {id: 456, name: 'Mahatma'}]);
b8r.get('root.list[id=123]') // {name: 'Juanita'}
b8r.get('root.list[id=456].name') // 'Mahatma'
b8r.get('root.list[name=Mahatma].id)') // 456
```

## binding data to DOM elements with `data-bind`

You bind data to the DOM by:

- Binding **data** to a **path**
- Binding the **path** to a DOM element **target** using the `data-bind` attribute.

The general form is `data-bind="target=path.to.data"`.

Note that it doesn't matter whether you insert DOM elements (presumably within
components) before you bind the data to the path or vice versa! 
b8r is designed for an async world!

```
<input data-bind="value=root.title">
...
<script>
  b8r.register('root', {title: 'Edit Me'}); // input will now contain 'Edit Me'
</script>
```

## binding methods to events with `data-event`

You bind an event to a method by:

- Binding a **method**  to a **path**.
- Binding the **path** to a DOM element **event** using the `data-event` attribute.

The general form is `data-event="event_type:path.to.method`.

When the event occurs the method is called and passed the event and the element.

```
<button data-event="click:root.action">Click Me!</button>
...
<script>
  b8r.register('root', {action: () => alert('I was clicked')});
</script>
```

<b8r-component name="fiddle">
const button = b8r.create('button')
button.dataset.event = 'click:event-binding-example.click'
button.textContent = 'click me!'
example.appendChild(button)
b8r.register('event-binding-example', {click: () => alert('it works!')})
</b8r-component>

Again, it's not important if the event is triggered (slightly) before the handler has been bound to the path. You can bind a path to an event and then bind the method later (e.g. when the code for it becomes available). In fact, if the user clicks the button before the method has been bound to the path, it will call the method when it becomes available.

## binding lists with `data-list`

Arrays are bound to the DOM by:

- Creating a **template** for the **array element** and binding it to a **path**
- Binding an **array** to the **path**

The general form is `data-list="path.to.array"` or, optionally `data-list="path.to.array:path.to.id"` (usually, the id-path is pretty simple, e.g. `id`). Using id-paths allows for more efficient list updates.

```
<ul>
  <li data-list="root.list" data-bind=".name"></list>
</ul>
...
<script>
  b8r.set('root.list', [{name: 'Juanita'}, {name: 'Mahatma'}]);
  // the list will have two (visible) items.
</script>
```

Within the list template, you can use **relative paths** (e.g. `.name`) which reference paths within the list element.
The relative path `.` is treated by `b8r` as referring to the entire list item, which is especially useful for
binding arrays of bare values (e.g. arrays of strings or numbers)

<b8r-component name="fiddle">
const div = b8r.create('div')
div.dataset.list = "simple-list-example.array"
div.dataset.bind = "text=."
example.append(div)
b8r.register('simple-list-example', {
  array: ['a', 'simple', 'array', 17, Math.PI]
})
</b8r-component>

## components

Components are self-contained reusable software blobs. 

A component can be defined using a single `.component.html` file, of the form:

```
<!--
# Example

Documentation in markdown format.
-->
<style>
  .example-component {
    ...
  }
</style>
<div data-bind="text=_component_.message"></div>
<script>
/* global require, component, b8r, find, findOne, get, set, on, touch */
'use strict';
  // code that executes when an instance of the component is inserted
  set('message', 'This is an example');
  // the div will be populated with the text above
</script>
```

or it can be defined in javascript using a different syntax:

```
const componentName = makeComponent('component-name', {
  css: '._component_ > div { color: yellow }',
  html: '<div>this text will be yellow</div>',
  load: async ({
    component, // this is the element that the component is inserted into
    b8r,       // it's b8r!
    find,      // b8r.findWithin(component, ...)
    findOne,   // b8r.findOneWithin(component, ...)
    register,  // replace the component's private data object
    get,       // get (within the component's private data)
    set,       // set (within the component's private data)
    on,        // b8r.on(component, ...)
    touch      // refresh the component
  }) => {
    // your javascript goes here
  },
  initialValue: {}, // initial value for each component instance,
  // type: { ... }, // component type (by example)
  // instanceType: { ... }, // instance type (by example)
})
```

This would be saved as, for example, `example.component.html`.

### loading components with `<b8r-component>`

The easiest way to insert a `b8r` component is to use a `<b8r-component>` custom element.

You can use a component by `path` (which automatically loads the component if necessary) or
by `name` if a component is already (or will be) loaded (e.g. via `b8r.component`, as per below, 
or by another `<b8r-component>`)

E.g. for the new version 2 "pure javascript" components:

```
<b8r-component path="path/to/some-v2-component.js"></b8r-component>
```

Here's the [color-picker](?source=components/color-picker.js) component loaded inline using the preceding method:

<b8r-component path="../components/color-picker.js"></b8r-component>

Or for the older `.component.html` components:

```
<b8r-component path="path/to/some-component"></b8r-component>
```

Or, if you want to insert a component by name (assuming you've loaded or defined it elsewhere,
e.g. via `b8r.component('path/to/some-component')`):

```
<b8r-component name="some-component"></b8r-component>
```

### loading components with b8r.component

Having created a component, you can load it using `b8r.component('path/to/component_name')` (omit the `.component.html`). This returns a `promise` of the component object itself (in case you want to write code that is contingent on a component having loaded).

### binding components with data-component (deprecated)

The simplest way to use components is to bind them to DOM elements using `data-component` using `data-component`.

The general form is `data-component="component_name"`. An instance of the component will be inserted into the element thus bound as soon as the component is loaded.

```
<div data-component="example"></div>
...
b8r.component('path/to/example');
  // component will be inserted in div once it loads
```

