<div style="text-align: center">
  <img
    alt="bindinator b∞r logo"
    style="width: 300px; height: 300px; padding: 5vh 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));"
    src="images/bindinator-logo.svg"
  >
</div>

[bindinator.com](http://bindinator.com/) |
[Demo (github pages)](https://tonioloewald.github.io/bindinator.js/) |
[github](https://github.com/tonioloewald/bindinator.js)

## The lazy JavaScript framework.

*Laziness drives every design decision in b8r*. 

- Get more done with less code.
- Don't wait for "compiles"
- Don't learn new mini-languages.
- Don't learn a templating language.
- Don't use a special debugger. 
- Write less boilerplate.
- Don't tell the left hand what the right hand is doing.

And `b8r` is lazy too.

- Don't do things for the browser that the browser knows how to do (like
parse HTML).
- Don't implement a new templating language.
- Don't implement special debugging tools. 
- Don't add zillions of runtime dependencies.

### Bind Data to the DOM with `data-bind`

A web application comprises DOM elements styled with CSS (*views*), and wired up to *behaviors*
implemented in Javascript (or, moving forward, Webassembly), and using *data* obtained from services.

With `b8r`, you **bind paths to DOM elements** using the `data-bind` attribute, and 
you bind **javascript objects to paths** using `b8r.set`, and `b8r` does the rest.

This is all asynchronous. Do it in whatever order makes sense.

<div data-component="fiddle" data-path="drumpf"></div>

In this example `text` is the **target**, `example.name` is the **data-path**. The root **name**
(`example`) is bound to the path via `b8r.register`.

Note the use of an ES6-*like* interpolated string (it doesn't do `eval`, it just looks up paths).
If a binding does not include `${...}` it is assumed to be a data-path. You can try to change the
binding to `data-bind="text=example.name"` or `data-bind="text=${example.name} says “hi”"`.

You can update data using `b8r.set`, e.g.

```
b8r.set('example.name', 'Trump')
```

Try it in the **console**!

> Unlike typical "fiddles" `b8r`'s inline examples are not isolated in their own
> `<iframe>`s -- it's all happily running in the same `body`. Normally, the only
> global you see is `b8r`'s `require` but I've exposed `b8r` to let you play around. If it
> weren't exposed you could simply write `b8r = require('path/to/b8r.js')` in the console.

### Bind arrays to the DOM with `data-list`

Binding **arrays** is just as simple, using the `data-list` attribute:

<div data-component="fiddle" data-path="list"></div>

Within a list binding, paths beginning with a period are relative to the list instance. (Look at
the `<li>` tags in the preceding example.)

A few of things to try in the console:

```
b8r.set('example2.list[id=2].name', 'Veejer')
b8r.push('example2.list', {id: 4, name: 'Clear Air Turbulence'})
b8r.remove('example2.list[id=3]')
```

Finally note that a path comprising just a period binds to the entire list item, so if you
bind to a list of bare strings then `data-bind="text=."` will get the string,

### Bindings work both ways

Most **updates** are handled automatically:

<div data-component="fiddle" data-path="update"></div>

### Bind events to methods with `data-event`

<div data-component="fiddle" data-path="events"></div>

Events are bound via data-paths as just like data. In this example `click` is the event type and
`example4.click` is the path to the event.

Try this in the console (and then click the button again):

```
b8r.set('example4.click', () => alert('I changed the event handler'))
```

Any of these snippets can be converted into reusable components by saving them as (say)
`example.component.html`. (Each of these snippets is in fact a complete component.)

You can load a component using `b8r.component('path/to/example')`. Once
loaded, it will automatically be inserted where-ever you use `data-component="example"`.
Components can be nested exactly as you would expect.

### Add components with `data-component`

A **stateful component** looks like this:

<div data-component="fiddle" data-path="clock"></div>

And to use the preceding component, you'd write something like this:

```
<div data-component="time"></div>
...
b8r.component('path/to/time');
```

You can build a **To Do List** app like this:

<div data-component="fiddle" data-path="todo"></div>

> **Note**: the to-do list component in the preceding example is bound to a global path,
> as is the one below. So the two share data automatically. This is *not* an accident.
> If you want a component to have its own unique data, you can bind to `_component_`.

### Composing Components

You can create _composable_ components by using `data-children` inside a component. The element
inside a component with the `data-children` attribute (if any) will receive the children
of the element bound to the component.

E.g. in the snippet below:

```
<div data-component="parent">
  <div data-component="child"></div>
</div>
```

If the `parent` component has an element with the `data-children` attribute, when it loads, the 
child will be moved into it. In the example below, the `tab-selector` component creates one
tab for each child.

<div data-component="fiddle" data-path="compose-example"></div>

### `require` just works

You can use third-party libraries easily as well (this example uses `showdown.js` via
the [text-render.js](#source=lib/text-render.js) library to render markdown.)

<div data-component="fiddle" data-path="markdown-editor"></div>

### Dog Food!

This site is built using `b8r` (along with numerous third-party libraries, none of which are
global dependencies). The inline [fiddle component](#source=fiddle.component.html) used
to display interactive examples is 272 lines including comments, styles, markup, and code.
`b8r` isolates component internals so cleanly from the rest of the page that the fiddle doesn't
need to use an iframe.

## In a Nut

- bind paths to DOM elements using `data-bind`.
- bind paths to objects using `b8r.set()` (or `b8r.register`).
- access and modify values bound to paths using `b8r.get()` and `b8r.set()`.
- bind arrays to the DOM using `data-list`.
- bind events to event handlers using `data-event`.
- bind components to the DOM using `data-component`.

We can register data (*models* and *controllers*) and load components (*views*) asynchronously.
If the user clicks the button before the controller is registered, the controller method will be
called when it becomes available.

Copyright ©2016-2018 Tonio Loewald
