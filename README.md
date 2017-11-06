<div style="text-align: center">
  <img
    alt="bindinator b∞r logo"
    style="width: 600px; height: 600px; padding: 5% 0; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.75));"
    src="https://bindinator.com/images/bindinator-logo.svg"
  >
</div>

[bindinator.com](http://bindinator.com/) |
[Demo (github pages)](https://tonioloewald.github.io/bindinator.js/) |
[Demo (rawgit)](https://rawgit.com/tonioloewald/bindinator.js/master/) |
[github](https://github.com/tonioloewald/bindinator.js) |
[Trello](https://trello.com/b/0OBL4IjC/bindinator)

## A Virtuous Cycle

* To get views, write (reusable) HTML.
* To style views, write (reusable) CSS.
* To get behavior, write (reusable) code.
* Models and controllers are just *registered* (named) objects.
* Event and data bindings are just DOM attributes.
* No new languages, templating languages, javascript extensions.
* No compile step needed.
* No magic. No spooky action-at-a-distance.
* Debug the code you wrote with standard debugging tools.

And did I mention…

* Almost no boilerplate.
* No dependencies.

## In a Nut

A web application comprises DOM elements styled with CSS (*views*), and wired up to *behaviors* implemented in Javascript (or, moving forward, Webassembly), and using *data* obtained from services.

A **view** looks like this:

```
<input data-bind="my-model.foo.bar">
<button
  data-event="my-controller.action"
>
  Click Me
</button>
```

It can be converted into a self-contained, reusable **component** like this:

```
<input data-bind="_component_.value">
<button
  data-event="my-controller.action"
>
  Click Me
</button>
```

Or, if we want to get fancy, this:

```
<style>
  .my-component-component {
    background: #ff0;
  }
</style>
<input data-bind="_component_.value">
<button
  data-event="_component_.click"
>
  Click Me
</button>
<script>
  set ({
    // we could also b8r.call('my-controller.action')
    click: () => alert(get('value')),
  });
</script>
```

Suppose we save that as `my-component.component.html`, we can use a **component** like this:

```
<div
  data-component="my-component"
  data-bind="value=my-model.foo.bar"
></div>
```

You'll need to load it at some point:

```
// we're in Javascript now...
b8r.component('path/to/my-component');
```

A **model** looks like this:

```
b8r.register('my-model', {
  foo: { bar: 17 }
});
```

A **controller** looks like this:

```
b8r.register('my-controller', {
  action () {
    alert(`my-model.foo.bar == ${b8r.get('my-model.foo.bar')}`);
  }
});
```

We can register the model and the controller and load the component *in any order*. Asynchronously.
If the user clicks the button before the controller is registered, the controller well be called 
when it becomes available.

### Key Points

- components are just like little web pages (in a *single file*).
- data and event bindings are just *attributes* of DOM nodes
- if a DOM node is removed, it follows that its bindings are gone (that was easy!)
- It's easy to refactor monolithic views into reusable components
- Bindinator doesn't use a "virtual DOM". It uses the *actual DOM*.
- Bindinator doesn't build DOM nodes. It lets the browser parse HTML and clones the results as needed.

Bindinator lets you build *views* using any mechanics you like — plain HTML and CSS work fine — and attach data and behavior to those views using DOM attributes, implement the behavior using Javascript with exceptionally simple connections to data services.

## Core Concepts

**Objects are registered by name** and then can have their properties and events bound to DOM elements with attributes:

- **data-bind** lets you bind data inside registered objects to targets within a DOM node (targets include text, value, checked state, visibility, class, attributes, style settings, and so forth).
- **data-event** lets you bind events to event handlers inside registered objects.
- **data-component** lets you bind composable component instances to DOM elements by name.
- **data-list** lets you bind a list to cloned instances of the bound element.

**Data bindings** are simply DOM attributes:

```
<input data-bind="value=foo.bar">
```

The input field will receive the property "bar" of whatever object is registered as "foo" (when it is registered), like this:

```
b8r.register('foo', {bar: 'hello world'});
```

Registering an object with a name causes it to be treated like a model, and bound (both ways) automatically.

**Event bindings** are just as straightforward:

```
<button event-bind="click:some.action">Click</button>
```

When the button is clicked the "action" method of whatever object is registered as "some" will be called, like this:

```
b8r.register('some', {action: () => alert('hello world')});
```

Registering an object with a name causes it to be treated like a controller as well. If an event occurs before the
relevant controller is bound, the event will be replayed (in order) for the controller when it is registered.

**Multiple bindings** can be separated by semicolons, e.g.

```
<input data-bind="value=foo.bar;enabled_if(_true_)=privileges.edit">
<input type="range" data-event="input=slider.live_preview;change=slider.update">
```

**Multiple targets or event types** can be separated by commas, e.g.

```
<span data-bind="style(backgroundColor),text=settings.color">#000000</span>
<button data-event="mouseup,touchend:some.action">Click</button>
```

**Components** are just like web pages:

```
<style>
  /* style rules */
</style>
<button data-event="mouseup:_component_.count">Hello World</button>
<span></span>
<script>
  var times_clicked = 0;
  function count(){
    times_clicked += 1;
    findOne('span').textContent = times_clicked;
  }
  return {count};
</script>
```
Note that the "bindinator way" to put data in the span would be to use a binding, but this
is still just plain old javascript. (`findOne` is just `component.querySelector`,
and `component` is just the element the component was loaded into.

The component's script executes in a private scope, so each instance will count its own clicks.

**Components are embedded** using attributes (`data-component`) as well:

```
<div data-component="click-counter"></div>
```

When a component is loaded as "click-counter" it will automatically populate appropriately attributed divs.

Data can be bound to components:

```
<div
  data-component="click-counter"
  data-path="path.to.data"
></div>
```

Components can bind to their own private data objects by using "_component_" so a component with:

```
<p data-bind="text=_component_.message"></p>
<button
  data-event="click:_component_.doSomething"
>
  Click Me!
</button>
```

Can simply set its own properties and method:

```
set({
  message: 'hello',
  doSomething: () => {...}
});
```

(Or have them set by bound data, etc.)

Copyright ©2016-2017 Tonio Loewald
