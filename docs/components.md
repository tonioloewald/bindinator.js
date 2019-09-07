# components

## Structure

### Javascript

You can implement a component in javascript as well. 

Moving forward, this is the preferred method for implementing 
components.

Using makeComponentNoEval allows you to define and register controllers
before a single instance of the component is inserted in the DOM, 
and leverage all the  javascript-centric tooling (linters, 
transpilers, etc.). You can also easily define multiple components 
in a single file.

```
/**
# component-name

documentation in markdown
*/
const componentName = makeComponentNoEval('component-name', {
  css: `
    ._component_ > div { color: yellow }
  `,
  html: `
    <div>
      this text will be yellow
    </div>
  `,
  load: async ({
    component, // this is the element that the component is inserted into
    b8r,       // it's b8r!
    find,      // b8r.findWithin(component, ...)
    findOne,   // b8r.findOneWithin(component, ...)
    data,      // the component's private data object
    register,  // replace the component's private data object
    get,       // get (within the component's private data)
    set,       // set (within the component's private data)
    on,        // b8r.on(component, ...)
    touch      // refresh the component
  }) => {
    // your javascript goes here
  },
})
```

### HTML
A component is, in essence, a reusable self-contained snippet of HTML. It comprises
documentation, CSS (in a `<style>` tag), markup, and the body of the
component's async `load()` method (inside a `<script>` tag).

```
<!--
# component-name

documentation in markdown
-->
<style>
  /* style rules */
</style>
<...
  markup
</...>
<script>
  // javascript executed as a function after a component instance is inserted into DOM
</script>
```

*Each of the four parts is optional*. E.g. a component could just be 
a stylesheet or just some code (although in the latter case, why not 
write a javascript module?).

A component is saved as a single text file using the naming convention 
`component-name.component.html`.

## Life Cycle

You load a component *asynchronously* using `b8r.component('path/to/name-of-component')`. This returns a
*promise* of the component. Once the component is loaded, `b8r` will automatically
insert an instance of the component into every element that has been given the attribute
`data-component="name-of-component"`.

Components are used by specifying a component to be inserted in an element (e.g. a `<div>`)
using the `data-component` attribute.

### Birth

When a component instance is inserted into the DOM:

1. The `data-component` attribute (if any) will be removed and replaced with a unique `data-component-id`.
2. Component data will be registered with the component's id.
3. The element will also be given the class `name-component` (and any previous `...-component` class will be stripped).
4. `_component_` will be replaced in data-bindings with the component's id
4. Any already available sub-components will be inserted.
6. The component's contents (including the containing element) will be bound to data as appropriate.

And finally, the component's `<script>` will be run as the body of a function that is passed several useful parameters:

* `require` -- a local instance of require scoped to the local path
* `component` -- the element into which the component was loaded
* `b8r` -- a reference to b8r
* `find` -- find(selector) => b8r.findWithin(component, selector)
* `findOne` -- findOne(selector) => b8r.findOneWithin(component, selector)
* `data` -- the component's private data object, i.e. the output of b8r.get(componentId)
* `register` -- replace the component's private data, i.e. register(obj) => b8r.set(componentId, obj)
* `get` -- gets paths within the component object; get(path) => b8r.getByPath(componentId, path)
* `set` -- sets paths within the component object; set(path, val) => b8r.setByPath(componentId, path, val)
* `on` -- adds event listeners to the component element; on(type, path) => b8r.on(component, type, path)
* `touch` -- touches paths within the component object; touch(...args) => b8r.touchByPath(componentId, ...args)

> ### Components with special needs… (`load` race condition)
>
> One annoying detail that has emerged as b8r has been used for more complex projects is 
> that sometimes you want a component to have a private event handler that will be 
> triggered before the load script executes, and the load script is where that private 
> event handler is created.
>
> #### Define your component in Javascript
>
> The best way to avoid this issue is to define the component as a Javascript module instead
> of an HTML file. (See [Making a Component with Javascript](source=source/b8r.component.js).)
> This allows you to define methods, register controllers, etc. before the component itself
> is defined.
>
> #### Workarounds for HTML components
>
> For HTML components are two workarounds. One is to insert the event-bindings in the 
> load script and the other is to register a controller object (by convention named 
> *component-name*-controller) before loading the component and bind to that.
>
> Another option, which makes sense for very simple components or components where each 
> private handler is likely to have very specific behavior (i.e. unique to the component 
> instance) is to add the event handler in the load script (i.e. add the attribute and 
> explicitly construct the paths using the `componentId`).

### Death

When a component is removed from the DOM it will quickly be "garbage collected". Its private data will be
removed, and if that data includes a `destroy` method, that method will be called.

## Composing Components: `data-children`

It is possible to *compose* components with normal html, e.g.

```
<b8r-component path="path/to/foo">
  <h2>Look I'm inside foo!</h2>
  <b8r-component="path/to/bar">
    And I'm inside bar, inside foo
  </b8r-component>
</b8r-component>
```

To tell a component where to put its children, simply give the element that is to receive them
the attribute `data-children`, e.g. if `foo.component.html` were `<blockquote data-children></blockquote>` and 
`bar.component.html` were `<p data-children></p>` then the result of loading the two would be:

```
<b8r-component class="foo-component" data-component-id="c#foo..." data-component="foo">
  <blockquote data-children>
    <h2>Look I'm inside foo!</h2>
    <b8r-component class="bar-component" data-component-id="c#bar..." data-component="bar">
      <p data-children>
        And I'm inside bar, inside foo
      </p>
    </b8r-component>
  </blockquote>
</b8r-component>
```

## Binding within Components

A component instance automatically has private data that is registered against its `componentId`. 

In the component's script you can work with this private data by using paths relative to `componentId` 
in your scripts, or just use the convenience methods `register` to completely overwrite this data, and 
`get` and `set` to access and modify paths inside id.

In bindings you can use `_component_` to refer to the `componentId` so if you want a component to
have have a private value for some specific state or to use a private method to handle an event,
you could do something like this:

```
<p>
  Hello <span data-bind="text=_component_.who"></span>
</p>
<button data-event="click:_component_.click">Click Me</button>
<script>
  set({
    'who': 'world',
    'click': () => alert('hello ' + get('who')),
  });
</script>
```

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

Programmatically finding and communicating with components is straightforward. Every component will
have a `class` dictated by the component's name, and a `data-component-id` attribute identifying
it uniquely.

`b8r` provides convenience methods such as `getComponentData(element)`.

## Event & Data Flow

By default, components inherit data from their parents and events flow from children to parents.

So, in the above example, `_component_.who` and `_component_.click` could be inherited from the
component's parent if the component itself did not have the data.

The data inheritance is static (the data is shallow-cloned onto the child). This behavior is
deprecated, and eventually data inheritance will be entirely manual (the child can already easily find data
in ancestor components, but it will be made even easier).

The event flow is dynamic (the event handler is looked for when the event occurs).

## A few more things about components

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
