# components

## Javascript Components

You can implement components in javascript. Javascript components are
recommended over HTML because they are better for static analysis, allow
you to set up stuff (e.g. controllers) before the first component is 
instanced, and support type-checking.

Relative to the earlier HTML components, Javascript components have several
specific advantages:

- `initialValue` allows you to set up the component completely before it's inserted in the DOM
  (eliminating tricky setup to prevent a bound method from being fired before it's available)
- the signature of `initialValue` and `load` leverage linting tools.
- `javascript` components are pure standards-compliant javascript, whereas HTML components
  were slightly hacky HTML.
- eventually there will be better **automated testing tools** for javascript components.
- direct access to the component's `data` object was an anti-pattern and is blocked

Moving forward, **Javascript is the preferred method for implementing 
components**.

There are two ways to define a pure javascript component.

## Components as exported objects

You can create a Javascript module that exports as `default` a bare object:

```
export default {
  css: `
    ._component_ > div { color: yellow }
  `,
  view({div, span}) { // view is passed the elements object
    return [
      div('this text will be yellow'),
      span('this text will be the usual color')
    ]
  },
  initialValue: async ({
    // only destructure the items you need
    component,           // this is the element that the component is inserted into
    b8r,                 // it's b8r!
    find,                // b8r.findWithin(component, ...)
    findOne,             // b8r.findOneWithin(component, ...) 
    get,                 // get (within the component's private data)
    set,                 // set (within the component's private data)
    on,                  // b8r.on(component, ...)
    touch                // refresh the component
  }) => {
    // your setup code here
    return {
      ...                // initial properties of component (including methods)
    }
  },
  load: async ({
    // only destructure the items you need
    component,           // this is the element that the component is inserted into
    b8r,                 // it's b8r!
    find,                // b8r.findWithin(component, ...)
    findOne,             // b8r.findOneWithin(component, ...) 
    get,                 // get (within the component's private data)
    set,                 // set (within the component's private data)
    on,                  // b8r.on(component, ...)
    touch,               // refresh the component
    data,                // reg proxy for the components private data store
  }) => {
    // your javascript goes here
  },
  type: { ... },         // component type,
}
```

You can then load this component using `b8r.component('path/to/component.js')` or
load it directly via `<b8r-component path='path/to/component.js'>...</b8r-component>`.
As usual, you can rename the component by setting a name explicitly.

Each of the properties of the this object are optional.

## Directly building components in Javascript Modules

You can also define components inline using `b8r.makeComponent`.

Using `makeComponent` allows you to pull in dependencies or define multiple components in 
a single file, which can be useful for creating simple sub-components or families of 
related components.

```
/**
# component-name

documentation in markdown
*/

// setup code here (e.g. load dependencies, register controllers)

const componentName = b8r.makeComponent('component-name', {
  // object defined as above
})
```

You can load a module that defines a component inline (using either of the preceding
methods) and it will just work (and in fact, if the module defines multiple components
you can specify which component will be loaded using the `name` attribute).

## HTML Components

HTML components are, in essence, reusable self-contained snippets of HTML. Each comprises
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

## Inserting Components

You can insert components into the DOM by using the `<b8r-component>` custom
element. E.g. for a javascript component named 'thing' and defined in `thing.js`:

    <b8r-component path="path/to/thing.js"></b8r-component>

For a javascript component named 'foo' and defined in 'bar.js':

    <b8r-component name="foo" path="path/to/bar.js"></b8r-component>

For an html component defined in `thang.component.html`:

    <b8r-component path="path/to/thang"></b8r-component>

For a component named 'baz' defined or loaded elsewhere:

    <b8r-component name="baz"></b8r-component>

Note that `b8r` still supports the use of the `data-component="foobar"` attribute 
but it is *deprecated*. (It's equivalent to `<bar-component name="foobar">`)

> ### Relative Paths
> Note that when using *relative* paths, the path to a **javascript**
> component is relative to that of the script which is executing (so, `path/to/b8r.js` 
> by default), while the path to an **html** component is relative to the component
> in which it is embedded.

You can insert components programmatically using `b8r.insertComponent` and `b8r.componentOnce`.

## Life Cycle

You load a component *asynchronously* using `b8r.component('path/to/name-of-component')`. This returns a
*promise* of the component. Once the component is loaded, `b8r` will automatically
insert an instance of the component into every element that has been given the attribute
`data-component="name-of-component"` (and the promise will resolve).

To insert a component in the DOM you can use a `<b8r-component>` customElement specifying
the component `name` and/or `path` or you can directly insert the component using the
`insertComponent` method.

If you specify a `path` then the component will automatically be loaded from the path specified
and named based on the name of the file. (`path` can omit `.component.html` for older `html`
components.)

If you specify a `name` (only) then the component must be loaded elsewhere.

If you specify a `name` and a `path` then, if after importing a specified javascript
module, a component with that name has been defined, it will be inserted. If not, and
the module has a default export, that will be defined as the component and inserted.
For an `html` module, the component will be loaded and assigned that name and inserted.

**Deprecated** you can also use the `data-component` attribute to specify the `name` of
a component to be inserted in an element.

### The First Time…

The **first time** a given component is inserted into the DOM, its `<style>` sheet (if any) is
inserted into the document `head`. Inside that stylesheet, `_component_` will have been
replaced with `<name>-component` where `name` is the `name` of the component.

A component's `<style>` sheet will have its `id` set to the component's name, to make
debugging CSS issues easier.

**Note** that this takes place the first time a given component is instanced and inserted, not
when the component is imported or loaded. So if you grab a component but never use it, its
styles will never get inserted into the DOM.

### Construction (`initialValue`)

When a component instance created (i.e. `clone`d from its view template), it is assigned a 
unique `componentId` that looks like `c#<name>#<number>` where `<name>` is the name assigned to 
that component and `<number>` is a unique integer (assigned in order, so #14 is the 14th component
instance of any kind).

As soon as a component is instantiated (i.e. `clone`ed from its view template), and prior to
being inserted into the DOM, its `initialValue` is computed and registered as its `componentId`.

The `initialValue` object will be assigned the component's `componentId` and `dataPath` (if any).

### Birth (`load`)

1. If the target `element` has a `data-component` attribute, it is removed.
2. The target `element` is assigned a `data-component-id` equal to the component's unique `componentId`.
3. The `element` will also be given the class `<name>-component` (and any previous `...-component` class will be stripped).
4. `_component_` will be replaced in data-bindings with the `componentId`.
5. Any children of the target `element` will be removed; if the component has a `[data-children]` element, those children
   will be moved there. (Otherwise, they are gone.)
6. Any currently available sub-components will be inserted.
7. The component's contents (including the containing element) will be bound to data as appropriate.

And finally, the component's `<script>` (or Javascript components `load` method) will be run as the body of a 
function that is passed several useful parameters:

* `component` -- the element into which the component was loaded
* `b8r` -- a reference to b8r
* `find` -- find(selector) => b8r.findWithin(component, selector)
* `findOne` -- findOne(selector) => b8r.findOneWithin(component, selector)
* `register` -- replace the component's private data, i.e. register(obj) => b8r.set(componentId, obj)
* `get` -- gets paths within the component object; get(path) => b8r.getByPath(componentId, path)
* `set` -- sets paths within the component object; set(path, val) => b8r.setByPath(componentId, path, val)
* `on` -- adds event listeners to the component element; on(type, path) => b8r.on(component, type, path)
* `touch` -- touches paths within the component object; touch(...args) => b8r.touchByPath(componentId, ...args)

#### Deprecated

`html` components still receive the `data` parameter as one of the arguments to the `load` method.
It's better to use `get()`, which is your only option for Javascript components.

* `data` -- the component's private data object, i.e. the output of b8r.get(componentId)

> ### Components with special needs… (`load` race condition)
>
> One annoying detail that has emerged as `b8r` has been used for more complex projects is 
> that sometimes you want a component to have an event handler that will be 
> triggered *before the load script executes*, and the load `<script>` is where that private 
> event handler is created.
>
> Typically this problem manifests as console error spam rather than misbehavior.
>
> #### [Re]define your component in Javascript
>
> The best way to avoid this issue is to define the component as a Javascript module instead
> of an HTML file. (See [Making a Component with Javascript](source=source/b8r.component.js).)
> This allows you to define your component's `initialValue` before the component is inserted
> into the DOM.
>
> Because *a Javascript component is just a Javascript module*, you can also register a (global)
> controller object in the module that defines the component.
>
> #### Workarounds for HTML components
>
> For HTML components there are two workarounds we've used in production.

> One is to add the event-bindings in the load script (so that they won't fire until
> the relevant methods have been defined). 
>
> The second option is to register a controller object (by convention named *component-name*-controller) 
> before loading the component and bind to that.

### Death (`destroy`)

When a component is removed from the DOM it will quickly be "garbage collected". Its private data will be
removed, and if that data includes a `destroy` method, that method will be called.

## Composing Components: `data-children`

It is possible to *compose* components (including within a component) as though the components are ordinary tags, e.g.

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

## Binding and Composition

**Data-binding works outside-in**. Each component binds its constituent elements (whether
that are ordinary HTML elements, `b8r` components, or web-components) when it is initialized.

**Event-binding works inside-out**. An event passes through its parent, and so forth, until
it is handled. (Note, this is *not* how DOM events behave normally, where the behavior of events
is not consistent.) If a given event-handler does not return true, the event stops propagating.

This means that in this composition:

    <b8r-component name="outer">
      <b8r-component name="inner">
        <span data-bind="text=_component_.foo"></span>
        <button data-event="click:_component_.clickHandler"
      </b8r-component>
    </b8r-component>

- the `<span>` gets its data from the **outer** component.
- the `<button>` will look for `clickHandler` in the **inner** component first.

This behavior reflects what you will see in the DOM after the components have been
initialized. A data-binding is rewritten as a static binding to a specific object
as soon as that object becomes available and is rewritten accordingly.

An event-handler is (dynamically) bound to `_component_` and its behavior
may change if something happens above it in the DOM hierarchy.

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
- the `script` tag becomes the component's `load(component, b8r, find, findOne, get, set, on, touch)` method.
  - `component` is a reference to the element the component was loaded into
  - `data` is the component's instance data
  - `register` lets you completely replace the component's instance data
  - `set`, `get`, and `touch` affect paths within the component's instance data.
  - `find` and `findOne` are `querySelectorAll` and `querySelector` scoped to `component` (`find` returns proper arrays)
- if the component sets a `destroy` method it will be called when the component is removed or replaced.
