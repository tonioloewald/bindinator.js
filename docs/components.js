/**
# Components in Depth

**Caution**: work in progress.

## Creating Components

There are two usual paths to creating a component. One is to design and build a component
from scratch, another is to take some piece of a view that has been implemented
conventionally, and convert it into a component.

In both cases, it's very similar to the way you might write a function or class
with a specific purpose in mind, while the other is to refactor a piece of code so
you can reuse it, or simplify or generalize bespoke code to make it "DRY"".

Imagine the case of a simple slider control with a bound numerical input:

    <label>
      <input type="range"><input type="number">
      <span>Volume</span>
    </label>

In a real application, it would probably come with extra attributes, such as
`id` or `class` to both provide hooks for styling and code, and then of course there
will be code somewhere to synchronize the two `<input>` elements with each other and
the data model, and presumably to do stuff when the values change.

[Here's what this looks like as a b8r component](#component=slider-numeric).

## Component Lifecycle

A component is loaded *asynchronously*. `b8r.component(...)` returns
a promise, which is passed the component once it's loaded.

Multiple attempts to load a component will return `the same promise`
(the exception being if loading fails). In general, you don't need
to worry about components being loaded more than once.

Once a component is loaded:

1. its stylesheet (if any) will be loaded into the document `<head>`
2. it will automatically be inserted in each appropriately marked DOM element (i.e. with the data-component attribute).

After a given element has a component inserted:

1. The `data-component` attribute (if any) will be removed and replaced with a unique `data-component-id`.
2. Component data will be registered with the component's id.
3. The element will also be given the class `name-component` (and any previous `...-component` class will be stripped).
4. `_component_` will be replaced in data-bindings with the component's id
4. Any already available sub-components will be inserted.
6. The component's contents (including the containing element) will be bound to data as appropriate.
7. And finally, the component's `<script>` will be run.

The script runs inside the body of a function whose parameters include:

* `require` -- a local instance of require scoped to the local path
* `component` -- the element into which the component was loaded
* `b8r` -- a reference to b8r
* `find` -- find(selector) => b8r.findWithin(component, selector)
* `findOne` -- findOne(selector) => b8r.findOneWithin(component, selector)
* `data` -- the component's private data object, i.e. the output of b8r.get(component_id)
* `register` -- replace the component's private data, i.e. register(obj) => b8r.set(component_id, obj)
* `get` -- gets paths within the component object; get(path) => b8r.getByPath(component_id, path)
* `set` -- sets paths within the component object; set(path, val) => b8r.setByPath(component_id, path, val)
* `on` -- adds event listeners to the component element; on(type, path) => b8r.on(component, type, path)
* `touch` -- touches paths within the component object; touch(...args) => b8r.touchByPath(component_id, ...args)

## Communicating with Components

The simplest way to communicate with components is by passing them *data*. And
the simplest way to pass them data is via *binding*.

E.g. in the following example we will use the same component twice, but bind it
to two different values:

```
<div data-component="switch" data-bind="value=_component_.top"></div><br>
<div data-component="switch" data-bind="value=_component_.bottom"></div>
<script>
  b8r.component('components/switch');
  set({top: false, bottom: true});
</script>
```
*/
