# b8r overview

## paths

The key idea in `b8r` is of binding **things** (dom elements, events, data) to **paths**. A path looks like `path.to.value` where `path` is the **root** name.

## register, set, and get — binding data to names

You bind data to names by **registering** objects to root **names**.

```
b8r.register('root', { test: 17 });
```

You can now access the value 17 by using its **path** which is `root.test`.

```
b8r.get('root.test') // 17
```

You can update the value at the path:

```
b8r.set('root.test', Math.PI)
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

## binding data to DOM elements with data-bind

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

## binding methods to events with data-event

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

Again, it's not important if the event is triggered (slightly) before the handler has been bound to the path. You can bind a path to an event and then bind the method later (e.g. when the code for it becomes available). In fact, if the user clicks the button before the method has been bound to the path, it will call the method when it becomes available.

## binding lists with data-list

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

## components

Components are self-contained reusable software blobs. Typically a component is a single `.component.html` file, of the form:

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

This would be saved as, for example, `example.component.html`.

### loading components with <b8r-component>

The easiest way to insert a `b8r` component is to use a `<b8r-component>` custom element.

You can use a component by `path` (which automatically loads the component if necessary) or
by `name` if a component is already (or will be) loaded (e.g. via `b8r.component`, as per below, 
or by another `<b8r-component>`)

E.g.

```
<b8r-component path="path/to/some-component"></b8r-component>
```

Or

```
<b8r-component name="some-component"></b8r-component>
...
b8r.component('path/to/some-component')
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

### A few more things about components

- when a component instance is loaded, it will be given a unique `componentId` (found in `data.componentId`).
  - its data will be **registered** with this id as its root path.
- `_component_`
  - will be changed to the component's instance path in bindings.
  - will be changed into the component's name inside `<style>` rules and classes in the markup.
- the `script` tag becomes the component's `load(require, component, b8r, find, findOne, get, set, on, touch)` method.
  - `component` is a reference to the element the component was loaded into
  - `data` is the component's instance data
  - `register` lets you completely replace the component's instance data
  - `set`, `get`, and `touch` affect paths within the component's instance data.
  - `find` and `findOne` are `querySelectorAll` and `querySelector` scoped to `component` (`find` returns proper arrays)
- if the component sets a `destroy` method it will be called when the component is removed or replaced.
